import os, hmac, hashlib, json, base64, sqlite3, time, asyncio
from datetime import datetime, timezone
from urllib.parse import parse_qsl
from fastapi import FastAPI, Header, HTTPException, Body, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import CommandStart, Command
from aiogram.types import FSInputFile, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, BufferedInputFile
import uvicorn
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

TOKEN = os.environ["BOT_TOKEN"]
URL = os.environ.get("WEBAPP_URL") or ("https://" + os.environ.get("RAILWAY_PUBLIC_DOMAIN", "localhost"))
ADMINS = {int(x) for x in os.environ.get("ADMIN_IDS", "").split(",") if x.strip()}
RATE = 1.357

# Чаты и темы для логов
LOG_CHAT_ID = int(os.environ.get("LOG_CHAT_ID", "0"))            # ID группы
LOG_THREAD_ID = 48                                               # <--- ID темы для профитов (захардкожено)
PAYOUT_CHAT_ID = int(os.environ.get("PAYOUT_CHAT_ID", "0"))      # ID группы для выплат (если та же, что и профит, оставь 0)
PAYOUT_THREAD_ID = 47                                            # <--- ID темы для выплат (захардкожено)

db = sqlite3.connect(os.getenv("DB_PATH", "data.db"), check_same_thread=False)
db.row_factory = sqlite3.Row
db.executescript("""
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,nick TEXT,wallet TEXT DEFAULT '',balance REAL DEFAULT 0,earned REAL DEFAULT 0,withdrawn REAL DEFAULT 0,login TEXT,pass TEXT);
CREATE TABLE IF NOT EXISTS reqs(id INTEGER PRIMARY KEY AUTOINCREMENT,uid INT,ids TEXT,shots TEXT,links TEXT,comment TEXT,status TEXT DEFAULT 'p',amt REAL,pct INT,share REAL,note TEXT,ts INT);
CREATE TABLE IF NOT EXISTS wd(id INTEGER PRIMARY KEY AUTOINCREMENT,uid INT,amt REAL,status TEXT DEFAULT 'p',ts INT);
CREATE TABLE IF NOT EXISTS links(tg INTEGER PRIMARY KEY,acc INTEGER);
CREATE TABLE IF NOT EXISTS hist(id INTEGER PRIMARY KEY AUTOINCREMENT,uid INT,title TEXT,amt REAL,ts INT);
""")
for _c in ("login", "pass"):
    try: db.execute(f"ALTER TABLE users ADD COLUMN {_c} TEXT")
    except sqlite3.OperationalError: pass

def q(sql, *a): return [dict(r) for r in db.execute(sql, a).fetchall()]
def ex(sql, *a):
    c = db.execute(sql, a); db.commit(); return c.lastrowid
def jl(r):
    for k in ("ids", "shots", "links"): r[k] = json.loads(r[k])
    return r

bot = Bot(TOKEN); dp = Dispatcher(); app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

async def tell(uid, text):
    try: await bot.send_message(uid, text)
    except Exception: pass

def auth(init: str) -> dict:
    d = dict(parse_qsl(init)); h = d.pop("hash", "")
    chk = "\n".join(f"{k}={v}" for k, v in sorted(d.items()))
    sec = hmac.new(b"WebAppData", TOKEN.encode(), hashlib.sha256).digest()
    ok = hmac.compare_digest(hmac.new(sec, chk.encode(), hashlib.sha256).hexdigest(), h)
    if not ok or time.time() - int(d.get("auth_date", 0)) > 86400 or "user" not in d:
        raise HTTPException(401, "bad initData")
    u = json.loads(d["user"])
    tg = u["id"]
    l = q("SELECT acc FROM links WHERE tg=?", tg)
    acc = l[0]["acc"] if l else tg
    ex("INSERT OR IGNORE INTO users(id,nick) VALUES(?,?)", acc, u.get("username") or u.get("first_name") or "user")
    u["tg"] = tg; u["id"] = acc
    return u

def user(x_init_data: str = Header("")): return auth(x_init_data)
def admin(u=Depends(user)):
    if u["tg"] not in ADMINS: raise HTTPException(403)
    return u

def pct(uid):
    ms = int(datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).timestamp())
    m = q("SELECT COALESCE(SUM(share),0) s FROM reqs WHERE uid=? AND status='a' AND ts>=?", uid, ms)[0]["s"]
    d = m * RATE
    return (80 if d >= 150 else 75 if d >= 75 else 70), m

import re, secrets, tempfile

def reg(u=Depends(user)):
    if not q("SELECT 1 FROM users WHERE id=? AND login IS NOT NULL", u["id"]): raise HTTPException(403, "register first")
    return u

def pw_hash(p):
    salt = secrets.token_hex(8)
    return salt + "$" + hashlib.pbkdf2_hmac("sha256", p.encode(), salt.encode(), 100000).hex()

@app.post("/api/register")
def register(b: dict = Body(...), u=Depends(user)):
    login = str(b.get("login", "")).strip().lower(); pw = str(b.get("password", ""))
    nick = str(b.get("nick", "")).strip()[:32] or login
    if not re.fullmatch(r"[a-z0-9.\-]{3,32}", login) or len(pw) < 8: raise HTTPException(400, "bad data")
    if q("SELECT 1 FROM users WHERE id=? AND login IS NOT NULL", u["id"]): raise HTTPException(400, "already registered")
    if q("SELECT 1 FROM users WHERE login=?", login): raise HTTPException(409, "login taken")
    ex("UPDATE users SET login=?,pass=?,nick=? WHERE id=?", login, pw_hash(pw), nick, u["id"])
    schedule_backup()
    return {"ok": 1}

fails = {}

@app.post("/api/login")
def login(b: dict = Body(...), u=Depends(user)):
    if q("SELECT 1 FROM users WHERE id=? AND login IS NOT NULL", u["id"]): raise HTTPException(400, "already registered")
    now = time.time(); f = [t for t in fails.get(u["tg"], []) if now - t < 600]
    if len(f) >= 8: raise HTTPException(429, "too many attempts")
    lg = str(b.get("login", "")).strip().lower(); pw = str(b.get("password", ""))
    row = q("SELECT id,pass FROM users WHERE login=?", lg)
    ok = False
    if row and row[0]["pass"]:
        salt, h = row[0]["pass"].split("$", 1)
        ok = hmac.compare_digest(hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 100000).hex(), h)
    if not ok:
        f.append(now); fails[u["tg"]] = f
        raise HTTPException(401, "bad login")
    ex("DELETE FROM users WHERE id=? AND login IS NULL AND balance=0 AND earned=0", u["id"])
    ex("INSERT OR REPLACE INTO links(tg,acc) VALUES(?,?)", u["tg"], row[0]["id"])
    schedule_backup()
    return {"ok": 1}

@app.get("/api/me")
def me(u=Depends(user)):
    p, m = pct(u["id"]); row = q("SELECT * FROM users WHERE id=?", u["id"])[0]
    return dict(user={k: v for k, v in row.items() if k != "pass"} | dict(month=m, pct=p), registered=bool(row["login"]), admin=u["tg"] in ADMINS,
        reqs=[jl(r) for r in q("SELECT * FROM reqs WHERE uid=? ORDER BY id", u["id"])],
        wd=q("SELECT * FROM wd WHERE uid=? ORDER BY id", u["id"]),
        hist=q("SELECT * FROM hist WHERE uid=? ORDER BY id", u["id"]),
        top=q("SELECT id,nick,earned FROM users WHERE earned>0 ORDER BY earned DESC LIMIT 20"))

@app.post("/api/requests")
async def new_req(b: dict = Body(...), u=Depends(reg)):
    ids = [str(x)[:40] for x in b.get("ids", [])][:50]
    links = [str(x)[:200] for x in b.get("links", [])][:20]
    shots = [s for s in b.get("shots", []) if str(s).startswith("data:image/")][:8]
    com = str(b.get("comment", ""))[:500]
    if not (ids and links and shots): raise HTTPException(400)
    rid = ex("INSERT INTO reqs(uid,ids,shots,links,comment,ts) VALUES(?,?,?,?,?,?)",
             u["id"], json.dumps(ids), json.dumps(shots), json.dumps(links), com, int(time.time()))
    who = "@" + u["username"] if u.get("username") else u.get("first_name", "")
    txt = f"🔔 Новая заявка #{rid}\n👤 {who}\n🆔 Работ: {len(ids)} ({', '.join(ids[:10])})\n🎁 " + "\n".join(links[:5]) + (f"\n💬 {com}" if com else "")
    kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="🛡 Открыть и проверить", web_app=WebAppInfo(url=URL))]])
    img = base64.b64decode(shots[0].split(",", 1)[1])
    for a in ADMINS:
        try: await bot.send_photo(a, BufferedInputFile(img, "shot.jpg"), caption=txt[:1000], reply_markup=kb)
        except Exception as e: print("notify fail", a, e)
    return {"id": rid}

@app.post("/api/wallet")
def wallet(b: dict = Body(...), u=Depends(reg)):
    w = str(b.get("wallet", "")).strip()[:100]
    if len(w) < 6: raise HTTPException(400)
    ex("UPDATE users SET wallet=? WHERE id=?", w, u["id"]); return {"ok": 1}

@app.post("/api/withdraw")
async def withdraw(b: dict = Body(...), u=Depends(reg)):
    amt = round(float(b.get("amount", 0)), 2); row = q("SELECT * FROM users WHERE id=?", u["id"])[0]
    if amt <= 0 or amt > row["balance"] or not row["wallet"]: raise HTTPException(400)
    ex("UPDATE users SET balance=balance-? WHERE id=?", amt, u["id"])
    ex("INSERT INTO wd(uid,amt,ts) VALUES(?,?,?)", u["id"], amt, int(time.time()))
    ex("INSERT INTO hist(uid,title,amt,ts) VALUES(?,?,?,?)", u["id"], "Вывод", -amt, int(time.time()))
    for a in ADMINS: await tell(a, f"Заявка на вывод: {amt} GRAM от {row['nick']}\n{row['wallet']}")
    return {"ok": 1}

@app.get("/api/admin")
def adm(a=Depends(admin)):
    rs = [jl(r) for r in q("SELECT r.*,u.nick FROM reqs r JOIN users u ON u.id=r.uid WHERE r.status='p' ORDER BY r.id")]
    for r in rs: r["pct"] = pct(r["uid"])[0]
    return dict(reqs=rs, wd=q("SELECT w.*,u.nick,u.wallet FROM wd w JOIN users u ON u.id=w.uid WHERE w.status='p' ORDER BY w.id"))

@app.get("/api/cashbox")
def cashbox(a=Depends(admin)):
    total_profit = q("SELECT COALESCE(SUM(amt),0) s FROM reqs WHERE status='a'")[0]["s"]
    worker_share = q("SELECT COALESCE(SUM(share),0) s FROM reqs WHERE status='a'")[0]["s"]
    total_withdrawn = q("SELECT COALESCE(SUM(amt),0) s FROM wd WHERE status='d'")[0]["s"]
    my_share = total_profit - worker_share
    
    return {
        "total_profit": round(total_profit, 2),
        "worker_share": round(worker_share, 2),
        "my_share": round(my_share, 2),
        "total_withdrawn": round(total_withdrawn, 2)
    }

@app.post("/api/admin/reset_cashbox")
def reset_cashbox(a=Depends(admin)):
    ex("DELETE FROM reqs WHERE status='a'")
    ex("DELETE FROM wd WHERE status='d'")
    return {"ok": 1}

@app.post("/api/admin/approve")
async def approve(b: dict = Body(...), a=Depends(admin)):
    r = q("SELECT * FROM reqs WHERE id=? AND status='p'", b.get("id")); amt = float(b.get("amount", 0))
    if not r or amt <= 0: raise HTTPException(400)
    r = r[0]; p, _ = pct(r["uid"]); sh = round(amt * p / 100, 2)
    ex("UPDATE reqs SET status='a',amt=?,pct=?,share=? WHERE id=?", amt, p, sh, r["id"])
    ex("UPDATE users SET balance=balance+?,earned=earned+? WHERE id=?", sh, sh, r["uid"])
    ex("INSERT INTO hist(uid,title,amt,ts) VALUES(?,?,?,?)", r["uid"], f"Заявка #{r['id']}", sh, int(time.time()))
    
    await tell(r["uid"], f"✅ Заявка #{r['id']} принята: +{sh} GRAM ({p}% от {amt})")

    if LOG_CHAT_ID:
        user_nick = q("SELECT nick FROM users WHERE id=?", r["uid"])[0]["nick"]
        log_text = (
            f"<b>Профит {amt:.2f} GRAM</b>\n"
            f"{user_nick} · LVL {1 if p==70 else 2 if p==75 else 3}, {p}%\n"
            f"На баланс: {sh:.2f} GRAM"
        )
        try:
            payload = {"chat_id": LOG_CHAT_ID, "text": log_text, "parse_mode": "HTML"}
            if LOG_THREAD_ID:
                payload["message_thread_id"] = LOG_THREAD_ID
            await bot.send_message(**payload)
        except Exception as e:
            print(f"Ошибка отправки лога в чат {LOG_CHAT_ID}:", e)
    return {"ok": 1}

@app.post("/api/admin/reject")
async def reject(b: dict = Body(...), a=Depends(admin)):
    r = q("SELECT * FROM reqs WHERE id=? AND status='p'", b.get("id"))
    if not r: raise HTTPException(400)
    ex("UPDATE reqs SET status='r',note=? WHERE id=?", str(b.get("note", ""))[:300], r[0]["id"])
    await tell(r[0]["uid"], f"❌ Заявка #{r[0]['id']} отклонена." + (f"\nПричина: {b['note']}" if b.get("note") else ""))
    return {"ok": 1}

@app.post("/api/admin/paid")
async def paid(b: dict = Body(...), a=Depends(admin)):
    w = q("SELECT * FROM wd WHERE id=? AND status='p'", b.get("id"))
    if not w: raise HTTPException(400)
    ex("UPDATE wd SET status='d' WHERE id=?", w[0]["id"])
    ex("UPDATE users SET withdrawn=withdrawn+? WHERE id=?", w[0]["amt"], w[0]["uid"])
    
    await tell(w[0]["uid"], f"Вывод {w[0]['amt']} GRAM выплачен.")

    if PAYOUT_CHAT_ID:
        user_info = q("SELECT nick, wallet FROM users WHERE id=?", w[0]["uid"])[0]
        amt = w[0]["amt"]
        log_text = (
            f"Выплата {amt:.2f} GRAM\n"
            f"Получатель: {user_info['nick']}\n"
            f"Кошелёк: <code>{user_info['wallet']}</code>"
        )
        try:
            payload = {"chat_id": PAYOUT_CHAT_ID, "text": log_text, "parse_mode": "HTML"}
            if PAYOUT_THREAD_ID:
                payload["message_thread_id"] = PAYOUT_THREAD_ID
            await bot.send_message(**payload)
        except Exception as e:
            print(f"Ошибка отправки лога в чат {PAYOUT_CHAT_ID}:", e)
    return {"ok": 1}

def make_backup():
    path = os.path.join(tempfile.gettempdir(), "backup.db")
    dst = sqlite3.connect(path); db.backup(dst); dst.close()
    return path

async def send_backup(chat, note=""):
    try:
        await bot.send_document(chat, FSInputFile(make_backup(), filename="data.db"),
            caption=f"Резервная копия базы {note}\nЧтобы восстановить — отправьте этот файл боту.")
    except Exception as e: print("backup fail", chat, e)

LOOP = None; bk_task = None

async def debounce_backup():
    await asyncio.sleep(60)
    for a in ADMINS: await send_backup(a, "(новый пользователь)")

def _start_bk():
    global bk_task
    if bk_task is None or bk_task.done(): bk_task = asyncio.ensure_future(debounce_backup())

def schedule_backup():
    if LOOP: LOOP.call_soon_threadsafe(_start_bk)

async def backup_loop():
    while True:
        await asyncio.sleep(6 * 3600)
        for a in ADMINS: await send_backup(a, "(авто)")

@dp.message(Command("backup"))
async def cmd_backup(m: types.Message):
    if m.from_user.id in ADMINS: await send_backup(m.chat.id)

@dp.message(F.document)
async def restore(m: types.Message):
    if m.from_user.id not in ADMINS or not (m.document.file_name or "").endswith(".db"): return
    path = os.path.join(tempfile.gettempdir(), "restore.db")
    await bot.download(m.document, destination=path)
    try:
        src = sqlite3.connect(path); src.execute("SELECT COUNT(*) FROM users").fetchone()
        src.backup(db); src.close()
        ex("CREATE TABLE IF NOT EXISTS links(tg INTEGER PRIMARY KEY,acc INTEGER)")
    except Exception as e:
        return await m.answer(f"Не удалось восстановить: {e}")
    await m.answer("База восстановлена. Пользователей: " + str(q("SELECT COUNT(*) c FROM users")[0]["c"]))

@dp.message(CommandStart())
async def start(m: types.Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="🚀 Открыть", web_app=WebAppInfo(url=URL))]])
    await m.answer("Добро пожаловать! Нажмите кнопку ниже, чтобы открыть приложение.", reply_markup=kb)

@dp.message(Command("id"))
async def my_id(m: types.Message): await m.answer(f"Ваш Telegram ID: {m.from_user.id}")

@app.on_event("startup")
async def up():
    global LOOP; LOOP = asyncio.get_running_loop()
    asyncio.create_task(dp.start_polling(bot)); asyncio.create_task(backup_loop())
    n = q("SELECT COUNT(*) c FROM users")[0]["c"]
    for a in ADMINS:
        await tell(a, f"Бот запущен. Пользователей в базе: {n}" + ("\nБаза пустая. Если пользователи были раньше — отправьте мне последний файл data.db, я всё восстановлю." if n == 0 else ""))

if os.path.isdir("webapp"):
    app.mount("/", StaticFiles(directory="webapp", html=True))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
