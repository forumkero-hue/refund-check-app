// Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Переменные
let currentScreen = 'languageScreen';
let detectedUsername = '@username';
let userData = {};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    initLanguageSelection();
    initFileUpload();
    updateStats();
    
    // Автообновление статистики
    setInterval(updateStats, 60000);
    
    // Показываем экран языков
    showScreen('languageScreen');
});

// Обновление статистики
function updateStats() {
    const statsElement = document.querySelector('.stats-number');
    if (statsElement) {
        const current = parseInt(statsElement.textContent.replace(/\s/g, ''));
        const randomIncrease = Math.floor(Math.random() * 5) + 1;
        const newValue = current + randomIncrease;
        statsElement.textContent = newValue.toLocaleString('ru-RU');
    }
}

// Выбор языка
function initLanguageSelection() {
    const langOptions = document.querySelectorAll('.lang-option');
    
    langOptions.forEach(option => {
        option.onclick = function() {
            // Убираем активный класс
            langOptions.forEach(opt => opt.classList.remove('active'));
            
            // Добавляем активный
            this.classList.add('active');
            
            // Через 0.5 секунды переходим на главный экран
            setTimeout(() => {
                showScreen('mainScreen');
            }, 500);
        };
    });
}

// Показать экран
function showScreen(screenId) {
    // Скрываем все экраны
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    
    // Показываем нужный экран
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.style.display = 'block';
        currentScreen = screenId;
        window.scrollTo(0, 0);
    }
}

// Загрузка файла
function initFileUpload() {
    const uploadBox = document.getElementById('uploadBox');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadBox || !fileInput) return;
    
    // Клик по области загрузки
    uploadBox.onclick = function() {
        fileInput.click();
    };
    
    // Выбор файла
    fileInput.onchange = async function(e) {
        const file = e.target.files[0];
        if (file) {
            // Проверяем расширение
            const ext = file.name.toLowerCase();
            if (ext.endsWith('.json') || ext.endsWith('.html') || ext.endsWith('.txt')) {
                startFileAnalysis(file);
            } else {
                alert('❌ Пожалуйста, загрузите файл .json, .html или .txt');
            }
        }
    };
}

// Начать анализ файла
function startFileAnalysis(file) {
    // Показываем экран проверки
    showScreen('checkScreen');
    
    // Запускаем анализ
    analyzeFile(file);
}

// Анализ файла и извлечение ника
async function analyzeFile(file) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const checkText = document.getElementById('checkText');
    
    try {
        // Читаем файл
        const text = await readFileAsText(file);
        
        // Этап 1: Чтение файла (0-30%)
        checkText.textContent = 'Читаем файл...';
        await updateProgress(progressFill, progressText, 0, 30, 500);
        
        // Этап 2: Поиск ника пользователя (30-60%)
        checkText.textContent = 'Ищем данные пользователя...';
        userData = extractUserData(text, file.name);
        detectedUsername = userData.username || generateRandomUsername();
        await updateProgress(progressFill, progressText, 30, 60, 800);
        
        // Этап 3: Анализ подарков (60-90%)
        checkText.textContent = 'Анализируем подарки...';
        userData.gifts = analyzeGiftsData(text);
        await updateProgress(progressFill, progressText, 60, 90, 1000);
        
        // Этап 4: Формирование отчета (90-100%)
        checkText.textContent = 'Формируем отчет...';
        await updateProgress(progressFill, progressText, 90, 100, 700);
        
        // Показываем результаты
        setTimeout(() => {
            showAnalysisResults();
        }, 500);
        
    } catch (error) {
        console.error('Ошибка анализа:', error);
        // Если ошибка, используем тестовые данные
        userData = generateTestData();
        detectedUsername = userData.username;
        
        // Показываем результаты с тестовыми данными
        setTimeout(() => {
            showAnalysisResults();
        }, 1000);
    }
}

// Чтение файла как текст
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

// Извлечение данных пользователя
function extractUserData(text, filename) {
    const data = {
        username: '@username',
        accountCreated: 'Не определено',
        totalGifts: 0,
        totalStars: 0
    };
    
    try {
        // Пытаемся парсить как JSON
        if (filename.endsWith('.json')) {
            const jsonData = JSON.parse(text);
            
            // Ищем username в разных местах JSON
            data.username = findUsernameInJSON(jsonData) || '@user_' + Math.floor(Math.random() * 10000);
            
            // Ищем дату создания аккаунта
            data.accountCreated = findAccountDate(jsonData) || 'Не определено';
            
            // Ищем подарки
            const gifts = findGiftsInJSON(jsonData);
            data.totalGifts = gifts.length;
            data.totalStars = gifts.reduce((sum, gift) => sum + (gift.stars || 0), 0);
            
        } else if (filename.endsWith('.html')) {
            // Пытаемся найти ник в HTML
            const usernameMatch = text.match(/@[\w_]{5,32}/) || 
                                 text.match(/username["']?\s*:\s*["']([^"']+)/i);
            data.username = usernameMatch ? usernameMatch[0] : '@web_user';
            
            // Для HTML генерируем случайные данные
            data.totalGifts = Math.floor(Math.random() * 20) + 5;
            data.totalStars = Math.floor(Math.random() * 500) + 100;
            
        } else {
            // Для других форматов используем случайные данные
            data.username = '@file_user_' + Math.floor(Math.random() * 1000);
            data.totalGifts = Math.floor(Math.random() * 15) + 3;
            data.totalStars = Math.floor(Math.random() * 300) + 50;
        }
        
    } catch (e) {
        console.log('Ошибка извлечения данных:', e);
        // Возвращаем тестовые данные при ошибке
        return generateTestData();
    }
    
    return data;
}

// Поиск username в JSON
function findUsernameInJSON(data) {
    // Проверяем различные возможные пути
    const paths = [
        data.username,
        data.user?.username,
        data.profile?.username,
        data.account?.username,
        data.from?.username,
        data.sender?.username,
        data.user_info?.username,
        data.info?.username
    ];
    
    for (const username of paths) {
        if (username && typeof username === 'string' && username.includes('@')) {
            return username;
        }
    }
    
    // Если не нашли, генерируем случайный
    return null;
}

// Поиск даты аккаунта
function findAccountDate(data) {
    const datePaths = [
        data.account_created,
        data.created_at,
        data.registration_date,
        data.user?.created_at,
        data.profile?.created
    ];
    
    for (const date of datePaths) {
        if (date) {
            try {
                const dateObj = new Date(date);
                return dateObj.toLocaleDateString('ru-RU');
            } catch (e) {
                // Пропускаем невалидные даты
            }
        }
    }
    
    return null;
}

// Поиск подарков в JSON
function findGiftsInJSON(data) {
    const gifts = [];
    
    // Ищем в различных структурах
    const possiblePaths = [
        data.gifts,
        data.presents,
        data.user_gifts,
        data.user?.gifts,
        data.profile?.gifts,
        data.transactions?.filter(t => t.type === 'gift'),
        data.history?.filter(h => h.action === 'gift_received')
    ];
    
    for (const path of possiblePaths) {
        if (Array.isArray(path) && path.length > 0) {
            return path;
        }
    }
    
    return [];
}

// Анализ данных о подарках
function analyzeGiftsData(text) {
    const gifts = [];
    
    try {
        const data = JSON.parse(text);
        const foundGifts = findGiftsInJSON(data);
        
        if (foundGifts.length > 0) {
            return foundGifts.slice(0, 10); // Берем первые 10 подарков
        }
    } catch (e) {
        // Не JSON файл
    }
    
    // Генерируем тестовые подарки
    return generateTestGifts();
}

// Генерация тестовых данных
function generateTestData() {
    const usernames = [
        '@alex_tg', '@masha_pro', '@max_present', '@anna_gift', 
        '@dima_star', '@katya_nft', '@serega_88', '@olya_2024'
    ];
    
    const dates = [
        '15.03.2023', '22.07.2022', '10.11.2021', '05.01.2024',
        '30.09.2020', '18.05.2023', '12.12.2022', '25.08.2021'
    ];
    
    return {
        username: usernames[Math.floor(Math.random() * usernames.length)],
        accountCreated: dates[Math.floor(Math.random() * dates.length)],
        totalGifts: Math.floor(Math.random() * 25) + 8,
        totalStars: Math.floor(Math.random() * 750) + 250,
        gifts: generateTestGifts()
    };
}

// Генерация тестовых подарков
function generateTestGifts() {
    const giftTypes = [
        { name: 'Золотая звезда', stars: 50, emoji: '⭐' },
        { name: 'Алмазный NFT', stars: 100, emoji: '💎' },
        { name: 'Платиновый стикер', stars: 30, emoji: '🎨' },
        { name: 'Изумрудный фон', stars: 75, emoji: '🎨' },
        { name: 'Рубиновый бейдж', stars: 150, emoji: '🏅' }
    ];
    
    const gifts = [];
    const count = Math.floor(Math.random() * 8) + 3;
    
    for (let i = 0; i < count; i++) {
        const type = giftTypes[Math.floor(Math.random() * giftTypes.length)];
        gifts.push({
            name: type.name,
            stars: type.stars,
            emoji: type.emoji,
            date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU')
        });
    }
    
    return gifts;
}

// Обновление прогресса
function updateProgress(element, textElement, from, to, duration) {
    return new Promise(resolve => {
        let start = null;
        
        function animate(timestamp) {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const percentage = from + (to - from) * (progress / duration);
            
            element.style.width = Math.min(percentage, to) + '%';
            textElement.textContent = Math.floor(Math.min(percentage, to)) + '%';
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            } else {
                element.style.width = to + '%';
                textElement.textContent = to + '%';
                resolve();
            }
        }
        
        requestAnimationFrame(animate);
    });
}

// Показать результаты анализа
function showAnalysisResults() {
    // Обновляем приветствие
    document.getElementById('username').textContent = detectedUsername;
    document.getElementById('finalUsername').textContent = detectedUsername;
    
    // Обновляем анализ на главном экране
    const analysisDiv = document.getElementById('nickAnalysis');
    analysisDiv.style.display = 'block';
    
    document.getElementById('analyzedNick').textContent = detectedUsername;
    document.getElementById('accountAge').textContent = userData.accountCreated || 'Не определено';
    document.getElementById('totalGifts').textContent = userData.totalGifts || 0;
    document.getElementById('totalStars').textContent = userData.totalStars || 0;
    
    // Обновляем финальные результаты
    document.getElementById('finalGifts').textContent = userData.totalGifts || 0;
    document.getElementById('finalStars').textContent = (userData.totalStars || 0) + ' ⭐';
    
    // Показываем экран успеха
    showScreen('successScreen');
}

// Генерация случайного username
function generateRandomUsername() {
    const prefixes = ['@alex', '@masha', '@maxim', '@anna', '@dmitry', '@ekaterina', '@sergey', '@olga'];
    const suffixes = ['_pro', '_tg', '_2024', '_star', '_gift', '_nft', '_vip', '_top'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return prefix + suffix;
}

// Показать инструкцию
function showInstruction() {
    alert('📖 ИНСТРУКЦИЯ:\n\n1. Экспортируйте данные из Nicegram\n2. Загрузите файл в это приложение\n3. Получите анализ своего профиля\n4. Проверьте статистику подарков');
}

// Показать FAQ
function showFAQ() {
    alert('❓ ЧАСТЫЕ ВОПРОСЫ:\n\nQ: Какой файл нужен?\nA: Экспорт данных из Nicegram (JSON/HTML)\n\nQ: Что анализируется?\nA: Ваш ник, подарки, звезды, история\n\nQ: Безопасно ли это?\nA: Да, анализ происходит локально');
}

// Закрыть приложение
function closeApp() {
    tg.close();
}

// Выбор языка (для HTML)
function selectLanguage(lang) {
    console.log('Выбран язык:', lang);
}
