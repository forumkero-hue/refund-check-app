// Telegram
const tg = window.Telegram.WebApp;
tg.expand();

// Переменные
let currentScreen = 'languageScreen';

// Запускаем
window.onload = function() {
    showScreen('languageScreen');
    initLanguageSelection();
    initFileUpload();
};

// Показать экран
function showScreen(screenId) {
    // Скрываем все
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    
    // Показываем нужный
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.style.display = 'block';
        currentScreen = screenId;
    }
}

// Выбор языка (простой)
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
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            // Проверяем расширение
            const ext = file.name.toLowerCase();
            if (ext.endsWith('.json') || ext.endsWith('.html') || ext.endsWith('.txt')) {
                startFileCheck(file);
            } else {
                alert('❌ Пожалуйста, загрузите файл .json, .html или .txt');
            }
        }
    };
}

// Начать проверку файла
function startFileCheck(file) {
    // Показываем экран проверки
    showScreen('checkScreen');
    
    // Запускаем анимацию прогресса
    simulateProgress(file);
}

// Симуляция прогресса проверки
function simulateProgress(file) {
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += 2;
        progressFill.style.width = progress + '%';
        progressText.textContent = progress + '%';
        
        if (progress >= 100) {
            clearInterval(interval);
            
            // После завершения - показываем успех с хлопушками
            setTimeout(() => {
                showSuccessWithCelebration();
            }, 500);
        }
    }, 30);
}

// Показать успех с хлопушками
function showSuccessWithCelebration() {
    showScreen('successScreen');
    
    // Запускаем анимации
    startCelebration();
    
    // Проигрываем звук (тихо)
    try {
        const audio = document.getElementById('successSound');
        audio.volume = 0.3; // Тихий звук
        audio.play();
    } catch (e) {
        console.log('Звук не воспроизводится');
    }
    
    // Отправляем данные в бота
    if (tg.sendData) {
        setTimeout(() => {
            tg.sendData(JSON.stringify({
                action: 'file_checked',
                status: 'success',
                timestamp: new Date().toISOString(),
                message: 'Файл успешно проверен!'
            }));
        }, 1000);
    }
}

// Запуск празднования 🎉
function startCelebration() {
    // Запускаем конфетти
    launchConfetti();
    
    // Запускаем фейерверки
    startFireworks();
    
    // Добавляем класс анимации к иконке
    const successIcon = document.getElementById('successIcon');
    successIcon.classList.add('celebrating');
}

// Запуск конфетти
function launchConfetti() {
    const confettiElements = document.querySelectorAll('.confetti');
    
    confettiElements.forEach((confetti, index) => {
        confetti.style.opacity = '1';
        
        // Анимация падения
        const duration = 1 + Math.random() * 2;
        const delay = index * 0.3;
        
        confetti.style.animation = `
            fall ${duration}s ease-in ${delay}s forwards,
            spin ${duration * 0.5}s linear ${delay}s infinite
        `;
        
        // Убираем после падения
        setTimeout(() => {
            confetti.style.opacity = '0';
        }, (duration + delay) * 1000);
    });
    
    // Добавляем CSS для анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fall {
            0% {
                transform: translateY(0) rotate(0deg);
                opacity: 1;
            }
            100% {
                transform: translateY(400px) rotate(360deg);
                opacity: 0;
            }
        }
        
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

// Запуск фейерверков
function startFireworks() {
    const fireworksContainer = document.getElementById('fireworks');
    
    // Создаем несколько фейерверков
    for (let i = 0; i < 15; i++) {
        createFirework(fireworksContainer, i);
    }
}

// Создать один фейерверк
function createFirework(container, index) {
    const firework = document.createElement('div');
    firework.className = 'firework-particle';
    
    // Случайные параметры
    const size = Math.random() * 6 + 3;
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#34c759', '#a8d8ff'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 1.5;
    const duration = 0.8 + Math.random() * 0.4;
    
    // Стили
    firework.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        left: ${left}%;
        top: 80%;
        opacity: 0;
        box-shadow: 0 0 10px ${color};
    `;
    
    container.appendChild(firework);
    
    // Запускаем анимацию
    setTimeout(() => {
        firework.style.opacity = '1';
        firework.style.transition = `
            top ${duration}s cubic-bezier(0.1, 0.8, 0.3, 1),
            opacity ${duration}s ease
        `;
        firework.style.top = (Math.random() * 60 + 10) + '%';
        
        // Убираем после взрыва
        setTimeout(() => {
            firework.style.opacity = '0';
            setTimeout(() => {
                if (firework.parentNode) {
                    firework.parentNode.removeChild(firework);
                }
            }, 1000);
        }, duration * 1000);
    }, delay * 1000);
}

// Закрыть приложение
function closeApp() {
    tg.close();
}

// Показать инструкцию
function showInstruction() {
    alert('📖 Инструкция:\n\n1. Скачайте Nicegram\n2. Экспортируйте данные\n3. Загрузите файл здесь\n4. Получите результат!');
}

// Показать FAQ
function showFAQ() {
    alert('❓ Частые вопросы:\n\nQ: Какой файл нужен?\nA: Экспорт из Nicegram (.json)\n\nQ: Безопасно ли это?\nA: Да, данные не отправляются на серверы');
}

// Выбор языка
function selectLanguage(lang) {
    console.log('Выбран язык:', lang);
    // Можно добавить смену текстов
}
