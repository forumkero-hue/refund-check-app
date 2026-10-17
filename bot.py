import os, hmac, hashlib, json, base64, sqlite3, time, asyncio
from datetime import datetime, timezone
from urllib.parse import parse_qsl
from fastapi import FastAPI, Header, HTTPException, Body, Depends
from fastapi.staticfiles import StaticFiles
from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart, Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, BufferedInputFile
import uvicorn
try:
    from dotenv import load_dotenv
    load_dotenv()  # читает файл .env рядом с bot.py
except ImportError:
    pass

TOKEN = os.environ["BOT_TOKEN"]
URL = os.environ["WEBAPP_URL"]  # https://ваш-домен
ADMINS = {int(x) for x in os.environ.get("ADMIN_IDS", "").split(",") if x.strip()}
RATE = 1.357  # 1 GRAM в USDT

db = sqlite3.connect(os.getenv("DB_PATH", "data.db"), check_same_thread=False)
db.row_factory = sqlite3.Row
db.executescript("""
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,nick TEXT,wallet TEXT DEFAULT '',balance REAL DEFAULT 0,earned REAL DEFAULT 0,withdrawn REAL DEFAULT 0);
CREATE TABLE IF NOT EXISTS reqs(id INTEGER PRIMARY KEY AUTOINCREMENT,uid INT,ids TEXT,shots TEXT,links TEXT,comment TEXT,status TEXT DEFAULT 'p',amt REAL,pct INT,share REAL,note TEXT,ts INT);
CREATE TABLE IF NOT EXISTS wd(id INTEGER PRIMARY KEY AUTOINCREMENT,uid INT,amt REAL,status TEXT DEFAULT 'p',ts INT);
CREATE TABLE IF NOT EXISTS hist(id INTEGER PRIMARY KEY AUTOINCREMENT,uid INT,title TEXT,amt REAL,ts INT);
""")

def q(sql, *a): return [dict(r) for r in db.execute(sql, a).fetchall()]
def ex(sql, *a):
    c = db.execute(sql, a); db.commit(); return c.lastrowid
def jl(r):
    for k in ("ids", "shots", "links"): r[k] = json.loads(r[k])
    return r

bot = Bot(TOKEN); dp = Dispatcher(); app = FastAPI()

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
    ex("INSERT OR IGNORE INTO users(id,nick) VALUES(?,?)", u["id"], u.get("username") or u.get("first_name") or "user")
    return u

def user(x_init_data: str = Header("")): return auth(x_init_data)
def admin(u=Depends(user)):
    if u["id"] not in ADMINS: raise HTTPException(403)  # роль только по Telegram ID
    return u

def pct(uid):
    ms = int(datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).timestamp())
    m = q("SELECT COALESCE(SUM(share),0) s FROM reqs WHERE uid=? AND status='a' AND ts>=?", uid, ms)[0]["s"]
    d = m * RATE
    return (80 if d >= 150 else 75 if d >= 75 else 70), m

@app.get("/api/me")
def me(u=Depends(user)):
    p, m = pct(u["id"]); row = q("SELECT * FROM users WHERE id=?", u["id"])[0]
    return dict(user=dict(row, month=m, pct=p), admin=u["id"] in ADMINS,
        reqs=[jl(r) for r in q("SELECT * FROM reqs WHERE uid=? ORDER BY id", u["id"])],
        wd=q("SELECT * FROM wd WHERE uid=? ORDER BY id", u["id"]),
        hist=q("SELECT * FROM hist WHERE uid=? ORDER BY id", u["id"]),
        top=q("SELECT id,nick,earned FROM users WHERE earned>0 ORDER BY earned DESC LIMIT 20"))

@app.post("/api/requests")
async def new_req(b: dict = Body(...), u=Depends(user)):
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
def wallet(b: dict = Body(...), u=Depends(user)):
    w = str(b.get("wallet", "")).strip()[:100]
    if len(w) < 6: raise HTTPException(400)
    ex("UPDATE users SET wallet=? WHERE id=?", w, u["id"]); return {"ok": 1}

@app.post("/api/withdraw")
async def withdraw(b: dict = Body(...), u=Depends(user)):
    amt = round(float(b.get("amount", 0)), 2); row = q("SELECT * FROM users WHERE id=?", u["id"])[0]
    if amt <= 0 or amt > row["balance"] or not row["wallet"]: raise HTTPException(400)
    ex("UPDATE users SET balance=balance-? WHERE id=?", amt, u["id"])
    ex("INSERT INTO wd(uid,amt,ts) VALUES(?,?,?)", u["id"], amt, int(time.time()))
    ex("INSERT INTO hist(uid,title,amt,ts) VALUES(?,?,?,?)", u["id"], "Вывод", -amt, int(time.time()))
    for a in ADMINS: await tell(a, f"💸 Заявка на вывод: {amt} GRAM от {row['nick']}\n{row['wallet']}")
    return {"ok": 1}

@app.get("/api/admin")
def adm(a=Depends(admin)):
    rs = [jl(r) for r in q("SELECT r.*,u.nick FROM reqs r JOIN users u ON u.id=r.uid WHERE r.status='p' ORDER BY r.id")]
    for r in rs: r["pct"] = pct(r["uid"])[0]
    return dict(reqs=rs, wd=q("SELECT w.*,u.nick,u.wallet FROM wd w JOIN users u ON u.id=w.uid WHERE w.status='p' ORDER BY w.id"))

@app.post("/api/admin/approve")
async def approve(b: dict = Body(...), a=Depends(admin)):
    r = q("SELECT * FROM reqs WHERE id=? AND status='p'", b.get("id")); amt = float(b.get("amount", 0))
    if not r or amt <= 0: raise HTTPException(400)
    r = r[0]; p, _ = pct(r["uid"]); sh = round(amt * p / 100, 2)
    ex("UPDATE reqs SET status='a',amt=?,pct=?,share=? WHERE id=?", amt, p, sh, r["id"])
    ex("UPDATE users SET balance=balance+?,earned=earned+? WHERE id=?", sh, sh, r["uid"])
    ex("INSERT INTO hist(uid,title,amt,ts) VALUES(?,?,?,?)", r["uid"], f"Заявка #{r['id']}", sh, int(time.time()))
    await tell(r["uid"], f"✅ Заявка #{r['id']} принята: +{sh} GRAM ({p}% от {amt})")
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
    await tell(w[0]["uid"], f"💸 Вывод {w[0]['amt']} GRAM выплачен.")
    return {"ok": 1}

@dp.message(CommandStart())
async def start(m: types.Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="🚀 Открыть", web_app=WebAppInfo(url=URL))]])
    await m.answer("👋 Добро пожаловать! Нажмите кнопку ниже, чтобы открыть приложение.", reply_markup=kb)

@dp.message(Command("id"))
async def my_id(m: types.Message): await m.answer(f"Ваш Telegram ID: {m.from_user.id}")

@app.on_event("startup")
async def up(): asyncio.create_task(dp.start_polling(bot))

app.mount("/", StaticFiles(directory="webapp", html=True))  # мини-апп отдаётся отсюда

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))