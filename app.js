// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;

// Расширяем на весь экран
tg.expand();

// Текущий язык (по умолчанию русский)
let currentLanguage = 'ru';

// Элементы DOM
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const sliderHandle = document.getElementById('sliderHandle');
const sliderContainer = document.getElementById('sliderContainer');

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    // Начинаем с экрана выбора языка
    showScreen('language');
    
    // Настройка drag & drop
    setupDragAndDrop();
    
    // Настройка слайдера капчи
    setupCaptchaSlider();
    
    // Настройка FAQ аккордеона
    setupFAQAccordion();
});

// Показать определенный экран
function showScreen(screenName) {
    // Скрываем все экраны
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    
    // Показываем нужный экран
    switch(screenName) {
        case 'language':
            document.getElementById('screen1').style.display = 'block';
            break;
        case 'main':
            document.getElementById('screen2').style.display = 'block';
            break;
        case 'captcha':
            document.getElementById('screen3').style.display = 'block';
            break;
        case 'instruction':
            document.getElementById('screen4').style.display = 'block';
            break;
        case 'faq':
            document.getElementById('screen5').style.display = 'block';
            break;
    }
    
    // Обновляем текст согласно выбранному языку
    updateTextByLanguage();
}

// Выбор языка
function selectLanguage(lang) {
    currentLanguage = lang;
    
    // Убираем активный класс у всех
    document.querySelectorAll('.language-option').forEach(option => {
        option.classList.remove('active');
    });
    
    // Добавляем активный класс выбранному
    event.currentTarget.classList.add('active');
    
    // Переходим на главный экран через 0.5 секунды
    setTimeout(() => {
        showScreen('main');
    }, 500);
}

// Обновление текста по языку
function updateTextByLanguage() {
    // В будущем можно добавить мультиязычность
    // Сейчас просто русский текст
}

// Настройка drag & drop
function setupDragAndDrop() {
    if (!uploadArea) return;
    
    // Клик по области загрузки
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });
    
    // Обработка выбора файла
    fileInput.addEventListener('change', handleFileUpload);
    
    // Drag & drop события
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.style.background = 'rgba(52, 199, 89, 0.1)';
        uploadArea.style.borderColor = '#30D158';
    });
    
    uploadArea.addEventListener('dragleave', function() {
        uploadArea.style.background = '';
        uploadArea.style.borderColor = '#34C759';
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.style.background = '';
        uploadArea.style.borderColor = '#34C759';
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            fileInput.dispatchEvent(new Event('change'));
        }
    });
}

// Обработка загрузки файла
async function handleFileUpload(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    // Проверяем тип файла
    const validExtensions = ['.json', '.html', '.txt'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
        alert('Пожалуйста, загрузите файл экспорта (.json, .html или .txt)');
        return;
    }
    
    // Обновляем интерфейс загрузки
    uploadArea.innerHTML = `
        <div class="upload-icon">
            <i class="fas fa-spinner fa-spin"></i>
        </div>
        <p class="upload-text">Обработка файла...</p>
        <p class="upload-subtext">${file.name}</p>
    `;
    
    // Симулируем обработку файла (2 секунды)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Переходим к капче
    showScreen('captcha');
}

// Настройка слайдера капчи
function setupCaptchaSlider() {
    if (!sliderHandle || !sliderContainer) return;
    
    let isDragging = false;
    let startX = 0;
    let sliderWidth = 0;
    let handleWidth = 0;
    
    // Получаем размеры при загрузке
    function updateSizes() {
        if (sliderContainer) {
            sliderWidth = sliderContainer.offsetWidth - 8; // минус padding
            handleWidth = sliderHandle.offsetWidth;
        }
    }
    
    // Обновляем размеры при загрузке и ресайзе
    updateSizes();
    window.addEventListener('resize', updateSizes);
    
    // Начало перетаскивания
    sliderHandle.addEventListener('mousedown', startDrag);
    sliderHandle.addEventListener('touchstart', function(e) {
        e.preventDefault();
        startDrag(e.touches[0]);
    });
    
    function startDrag(e) {
        isDragging = true;
        startX = e.clientX - sliderHandle.offsetLeft;
        
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('touchmove', function(e) {
            onDrag(e.touches[0]);
        });
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
        
        // Меняем курсор
        sliderHandle.style.cursor = 'grabbing';
    }
    
    function onDrag(e) {
        if (!isDragging) return;
        
        let newLeft = e.clientX - startX;
        
        // Ограничиваем движение в пределах трека
        newLeft = Math.max(4, Math.min(newLeft, sliderWidth - handleWidth - 4));
        
        sliderHandle.style.left = newLeft + 'px';
        
        // Проверяем, достиг ли слайдер конца
        if (newLeft >= sliderWidth - handleWidth - 8) {
            verifyCaptcha();
            stopDrag();
        }
    }
    
    function stopDrag() {
        if (!isDragging) return;
        
        isDragging = false;
        
        // Возвращаем слайдер в начало, если не дошел до конца
        if (parseInt(sliderHandle.style.left || '4') < sliderWidth - handleWidth - 20) {
            sliderHandle.style.left = '4px';
        }
        
        // Убираем обработчики
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchend', stopDrag);
        
        // Возвращаем курсор
        sliderHandle.style.cursor = 'grab';
    }
}

// Проверка капчи
function verifyCaptcha() {
    // Анимация успеха
    sliderHandle.style.background = '#30D158';
    sliderHandle.innerHTML = '<i class="fas fa-check"></i>';
    
    // Сообщение об успехе
    setTimeout(() => {
        alert('✅ Капча пройдена! Файл успешно проверен.');
        
        // Отправляем данные в бота через Telegram Web App
        if (tg && tg.sendData) {
            tg.sendData(JSON.stringify({
                type: 'file_checked',
                status: 'success',
                timestamp: new Date().toISOString(),
                message: 'Проверка завершена успешно'
            }));
        }
        
        // Закрываем мини-приложение через 2 секунды
        setTimeout(() => {
            tg.close();
        }, 2000);
    }, 500);
}

// Настройка FAQ аккордеона
function setupFAQAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', function() {
            // Закрываем все другие вопросы
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
            
            // Открываем/закрываем текущий вопрос
            item.classList.toggle('active');
        });
    });
}

// Назад (кнопка)
function goBack() {
    const currentScreen = getCurrentScreen();
    
    switch(currentScreen) {
        case 'main':
            showScreen('language');
            break;
        case 'captcha':
            showScreen('main');
            break;
        case 'instruction':
        case 'faq':
            showScreen('main');
            break;
        default:
            showScreen('language');
    }
}

// Получить текущий экран
function getCurrentScreen() {
    const screens = document.querySelectorAll('.screen');
    
    for (let screen of screens) {
        if (screen.style.display === 'block' || screen.style.display === '') {
            return screen.id.replace('screen', '');
        }
    }
    
    return '1'; // По умолчанию первый экран
}

// Управление прогресс баром (дополнительно)
function showProgress(percentage) {
    const progressContainer = document.querySelector('.progress-container');
    const progressFill = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    
    if (progressContainer && progressFill && progressText) {
        progressContainer.style.display = 'block';
        progressFill.style.width = percentage + '%';
        progressText.textContent = percentage + '%';
    }
}

// Симуляция проверки файла
function simulateFileCheck() {
    showProgress(0);
    
    const interval = setInterval(() => {
        const current = parseInt(document.querySelector('.progress-fill').style.width) || 0;
        
        if (current < 100) {
            showProgress(current + 10);
        } else {
            clearInterval(interval);
            showScreen('captcha');
        }
    }, 300);
}
