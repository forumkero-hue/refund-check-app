// Telegram Web App инициализация
const tg = window.Telegram.WebApp;

// Расширяем на весь экран
tg.expand();
tg.setHeaderColor('#667eea');
tg.setBackgroundColor('#667eea');

// Переменные состояния
let currentScreen = 'mainScreen';
let captchaCompleted = false;
let checkCount = 3004;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // Сразу показываем главный экран (без выбора языка)
    showScreen('mainScreen');
    
    // Инициализация загрузки файлов
    initFileUpload();
    
    // Инициализация капчи
    initCaptcha();
    
    // Обновляем статистику каждые 5 минут
    updateStats();
    setInterval(updateStats, 300000); // 5 минут
    
    // Добавляем прогресс бар в DOM
    addProgressBar();
});

// Добавить прогресс бар
function addProgressBar() {
    const uploadBox = document.getElementById('uploadBox');
    if (uploadBox) {
        uploadBox.insertAdjacentHTML('afterend', `
            <div class="progress-container" id="progressContainer">
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <div class="progress-text" id="progressText">0%</div>
            </div>
        `);
    }
}

// Показать экран
function showScreen(screenId) {
    // Скрываем все экраны
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Показываем нужный экран
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        currentScreen = screenId;
        
        // Прокручиваем вверх
        window.scrollTo(0, 0);
        
        // Если вернулись на главный экран, обновляем статистику
        if (screenId === 'mainScreen') {
            updateStats();
        }
    }
}

// Обновить статистику
function updateStats() {
    // Увеличиваем счетчик проверок на случайное число
    const randomIncrease = Math.floor(Math.random() * 10) + 1;
    checkCount += randomIncrease;
    
    // Обновляем отображение
    const statsElement = document.getElementById('todayChecks');
    if (statsElement) {
        // Форматируем число с пробелом
        statsElement.textContent = checkCount.toLocaleString('ru-RU');
    }
}

// ЗАГРУЗКА ФАЙЛОВ
function initFileUpload() {
    const uploadBox = document.getElementById('uploadBox');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadBox || !fileInput) return;
    
    // Клик по области загрузки
    uploadBox.addEventListener('click', function() {
        fileInput.click();
    });
    
    // Обработка выбора файла
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            processFile(file);
        }
    });
    
    // Drag & Drop
    uploadBox.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadBox.style.background = 'rgba(255, 255, 255, 0.25)';
        uploadBox.style.borderColor = '#5AC8FA';
        uploadBox.style.transform = 'translateY(-5px)';
    });
    
    uploadBox.addEventListener('dragleave', function() {
        uploadBox.style.background = '';
        uploadBox.style.borderColor = '#007AFF';
        uploadBox.style.transform = '';
    });
    
    uploadBox.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadBox.style.background = '';
        uploadBox.style.borderColor = '#007AFF';
        uploadBox.style.transform = '';
        
        if (e.dataTransfer.files.length) {
            const file = e.dataTransfer.files[0];
            processFile(file);
        }
    });
}

// Обработка файла
function processFile(file) {
    // Проверяем расширение
    const validExtensions = ['.json', '.html', '.txt'];
    const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExt)) {
        alert('❌ Пожалуйста, загрузите файл экспорта (.json, .html или .txt)');
        return;
    }
    
    // Показываем прогресс
    showProgressBar();
    
    // Симуляция обработки файла
    simulateFileProcessing(file);
}

// Показать прогресс бар
function showProgressBar() {
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const uploadBox = document.getElementById('uploadBox');
    
    if (progressContainer && progressFill && progressText && uploadBox) {
        // Скрываем кнопку загрузки
        uploadBox.style.display = 'none';
        
        // Показываем прогресс бар
        progressContainer.style.display = 'block';
        
        // Анимация прогресса
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            progressFill.style.width = progress + '%';
            progressText.textContent = progress + '%';
            
            if (progress >= 100) {
                clearInterval(interval);
                
                // Переходим к капче через 0.5 секунды
                setTimeout(() => {
                    showScreen('captchaScreen');
                    
                    // Восстанавливаем кнопку загрузки
                    setTimeout(() => {
                        uploadBox.style.display = 'block';
                        progressContainer.style.display = 'none';
                        progressFill.style.width = '0%';
                        progressText.textContent = '0%';
                    }, 1000);
                }, 500);
            }
        }, 100);
    }
}

// Симуляция обработки файла
function simulateFileProcessing(file) {
    console.log('📁 Обработка файла:', file.name);
    console.log('📊 Размер:', (file.size / 1024).toFixed(2), 'KB');
    
    // Здесь будет реальная обработка файла
    // Пока просто симуляция
}

// КАПЧА
function initCaptcha() {
    const sliderHandle = document.getElementById('sliderHandle');
    const captchaSlider = document.getElementById('captchaSlider');
    
    if (!sliderHandle || !captchaSlider) return;
    
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    let maxDistance = 0;
    
    // Получаем максимальное расстояние
    function updateMaxDistance() {
        maxDistance = captchaSlider.offsetWidth - sliderHandle.offsetWidth - 8;
    }
    
    // Обновляем размеры
    updateMaxDistance();
    window.addEventListener('resize', updateMaxDistance);
    
    // Начало перетаскивания
    sliderHandle.addEventListener('mousedown', function(e) {
        isDragging = true;
        startX = e.clientX - sliderHandle.offsetLeft;
        sliderHandle.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
    
    sliderHandle.addEventListener('touchstart', function(e) {
        isDragging = true;
        startX = e.touches[0].clientX - sliderHandle.offsetLeft;
        sliderHandle.style.cursor = 'grabbing';
        
        document.addEventListener('touchmove', onTouchMove);
        document.addEventListener('touchend', onTouchEnd);
    });
    
    // Движение мышью
    function onMouseMove(e) {
        if (!isDragging) return;
        
        currentX = e.clientX - startX;
        
        // Ограничиваем движение
        if (currentX < 4) currentX = 4;
        if (currentX > maxDistance) currentX = maxDistance;
        
        sliderHandle.style.left = currentX + 'px';
        
        // Если дошли до конца - завершаем
        if (currentX >= maxDistance - 2) {
            completeCaptcha();
        }
    }
    
    // Движение пальцем
    function onTouchMove(e) {
        if (!isDragging) return;
        
        currentX = e.touches[0].clientX - startX;
        
        // Ограничиваем движение
        if (currentX < 4) currentX = 4;
        if (currentX > maxDistance) currentX = maxDistance;
        
        sliderHandle.style.left = currentX + 'px';
        
        // Если дошли до конца - завершаем
        if (currentX >= maxDistance - 2) {
            completeCaptcha();
        }
    }
    
    // Отпускание мыши
    function onMouseUp() {
        if (!isDragging) return;
        isDragging = false;
        
        // Возвращаем в начало если не дошел
        if (currentX < maxDistance - 10) {
            sliderHandle.style.left = '4px';
        }
        
        sliderHandle.style.cursor = 'grab';
        document.body.style.userSelect = 'auto';
        
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
    
    // Отпускание пальца
    function onTouchEnd() {
        if (!isDragging) return;
        isDragging = false;
        
        // Возвращаем в начало если не дошел
        if (currentX < maxDistance - 10) {
            sliderHandle.style.left = '4px';
        }
        
        sliderHandle.style.cursor = 'grab';
        
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
    }
    
    // Завершение капчи
    function completeCaptcha() {
        if (captchaCompleted) return;
        
        isDragging = false;
        captchaCompleted = true;
        
        // Анимация успеха
        sliderHandle.style.background = 'linear-gradient(135deg, #34C759, #30D158)';
        sliderHandle.style.boxShadow = '0 4px 12px rgba(52, 199, 89, 0.6)';
        sliderHandle.innerHTML = '<div class="slider-arrow">✓</div>';
        sliderHandle.style.cursor = 'default';
        
        // Анимация текста
        const sliderText = document.querySelector('.slider-text');
        if (sliderText) {
            sliderText.style.color = '#34C759';
            sliderText.textContent = '✅ Проверка пройдена!';
        }
        
        // Отправляем данные в бота
        setTimeout(() => {
            if (tg && tg.sendData) {
                tg.sendData(JSON.stringify({
                    action: 'captcha_completed',
                    timestamp: new Date().toISOString(),
                    status: 'success',
                    message: 'Пользователь успешно прошел капчу'
                }));
            }
            
            // Показываем сообщение об успехе
            showSuccessMessage();
            
            // Закрываем мини-приложение через 3 секунды
            setTimeout(() => {
                tg.close();
            }, 3000);
        }, 800);
    }
}

// Показать сообщение об успехе
function showSuccessMessage() {
    // Создаем overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        animation: fadeIn 0.3s ease;
    `;
    
    // Создаем сообщение
    const message = document.createElement('div');
    message.style.cssText = `
        background: rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        padding: 30px;
        text-align: center;
        max-width: 300px;
        animation: slideIn 0.5s ease;
    `;
    
    message.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
        <div style="font-size: 22px; font-weight: 700; color: white; margin-bottom: 10px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
            Проверка завершена!
        </div>
        <div style="font-size: 16px; color: rgba(255, 255, 255, 0.85); margin-bottom: 20px; line-height: 1.4;">
            Ваши данные успешно проверены.<br>
            Результаты отправлены боту.
        </div>
        <div style="font-size: 14px; color: rgba(255, 255, 255, 0.7);">
            Закрытие через 2 секунды...
        </div>
    `;
    
    // Добавляем стили анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideIn {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    
    document.head.appendChild(style);
    overlay.appendChild(message);
    document.body.appendChild(overlay);
}

// Вспомогательные функции
function triggerFileInput() {
    document.getElementById('fileInput').click();
}

// Обработка кнопок футера
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('footer-btn')) {
        const text = e.target.textContent.trim();
        if (text === 'Инструкция') {
            showScreen('instructionScreen');
        } else if (text === 'FAQ') {
            showScreen('faqScreen');
        }
    }
});
