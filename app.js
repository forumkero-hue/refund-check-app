// Telegram Web App инициализация
const tg = window.Telegram.WebApp;

// Расширяем на весь экран
tg.expand();
tg.setHeaderColor('#000000');
tg.setBackgroundColor('#000000');

// Текущий экран
let currentScreen = 'languageScreen';

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // Показываем экран выбора языка
    showScreen('languageScreen');
    
    // Инициализация загрузки файлов
    initFileUpload();
    
    // Инициализация капчи
    initCaptcha();
    
    // Настройка выбора языка
    initLanguageSelection();
});

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
    }
}

// ВЫБОР ЯЗЫКА
function initLanguageSelection() {
    const languageItems = document.querySelectorAll('.language-item');
    
    languageItems.forEach(item => {
        item.addEventListener('click', function() {
            // Убираем выделение у всех
            languageItems.forEach(i => i.classList.remove('selected'));
            
            // Выделяем выбранный
            this.classList.add('selected');
            
            // Переходим на главный экран через 0.5 секунды
            setTimeout(() => {
                showScreen('mainScreen');
            }, 500);
        });
    });
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
        uploadBox.style.background = 'rgba(52, 199, 89, 0.1)';
        uploadBox.style.borderColor = '#30d158';
    });
    
    uploadBox.addEventListener('dragleave', function() {
        uploadBox.style.background = '';
        uploadBox.style.borderColor = '#34c759';
    });
    
    uploadBox.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadBox.style.background = '';
        uploadBox.style.borderColor = '#34c759';
        
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
    
    // Показываем сообщение о загрузке
    const uploadBox = document.getElementById('uploadBox');
    uploadBox.innerHTML = `
        <div class="upload-icon">⏳</div>
        <div class="upload-text">Обработка...</div>
        <div class="upload-hint">${file.name}</div>
    `;
    uploadBox.style.pointerEvents = 'none';
    
    // Симуляция обработки (2 секунды)
    setTimeout(() => {
        // Переходим к капче
        showScreen('captchaScreen');
        
        // Восстанавливаем кнопку загрузки
        setTimeout(() => {
            uploadBox.innerHTML = `
                <div class="upload-icon">📁</div>
                <div class="upload-text">Загрузить файл</div>
                <div class="upload-hint">Перетащите файл или нажмите для выбора</div>
            `;
            uploadBox.style.pointerEvents = 'auto';
        }, 1000);
    }, 2000);
}

// КАПЧА (ТОЧНАЯ КОПИЯ С ФОТО)
function initCaptcha() {
    const sliderHandle = document.getElementById('sliderHandle');
    const captchaSlider = document.getElementById('captchaSlider');
    
    if (!sliderHandle || !captchaSlider) return;
    
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    let maxDistance = 0;
    
    // Получаем максимальное расстояние для слайдера
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
        isDragging = false;
        
        // Анимация успеха
        sliderHandle.style.background = '#30d158';
        sliderHandle.innerHTML = '<div class="slider-arrow">✓</div>';
        
        // Отправляем данные в бота
        setTimeout(() => {
            if (tg && tg.sendData) {
                tg.sendData(JSON.stringify({
                    action: 'captcha_completed',
                    timestamp: new Date().toISOString(),
                    status: 'success'
                }));
            }
            
            // Закрываем мини-приложение
            setTimeout(() => {
                tg.close();
            }, 1500);
        }, 500);
    }
}

// Вспомогательные функции
function triggerFileInput() {
    document.getElementById('fileInput').click();
}

function selectLanguage(lang) {
    console.log('Выбран язык:', lang);
    // Здесь можно добавить смену языка
}

// Обработка кнопок футера
document.querySelectorAll('.footer-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const text = this.textContent.trim();
        if (text === 'Инструкция') {
            showScreen('instructionScreen');
        } else if (text === 'FAQ') {
            showScreen('faqScreen');
        }
    });
});
