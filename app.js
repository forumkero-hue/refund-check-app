// Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor('#667eea');
tg.setBackgroundColor('#667eea');

// Variables
let currentScreen = 'languageScreen';
let selectedLanguage = 'ru';
let captchaCompleted = false;
let checkCount = 3004;
let particlesInterval;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initParticles();
    initLanguageSelection();
    initFileUpload();
    initCaptcha();
    updateStats();
    
    // Auto-update stats
    setInterval(updateStats, 60000); // 1 minute
});

// Particles Background
function initParticles() {
    const particlesContainer = document.getElementById('particles');
    const colors = [
        'rgba(0, 150, 255, 0.6)',
        'rgba(102, 126, 234, 0.6)',
        'rgba(52, 199, 255, 0.6)',
        'rgba(0, 200, 255, 0.6)',
        'rgba(255, 255, 255, 0.4)'
    ];
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random properties
        const size = Math.random() * 4 + 2;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        const duration = Math.random() * 20 + 10;
        const delay = Math.random() * 5;
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: ${color};
            border-radius: 50%;
            left: ${posX}%;
            top: ${posY}%;
            animation: float ${duration}s ease-in-out ${delay}s infinite;
            filter: blur(${size/2}px);
            box-shadow: 0 0 ${size*2}px ${size}px ${color};
        `;
        
        particlesContainer.appendChild(particle);
    }
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes float {
            0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
            25% { transform: translateY(-20px) translateX(10px); opacity: 0.6; }
            50% { transform: translateY(10px) translateX(-10px); opacity: 0.8; }
            75% { transform: translateY(-10px) translateX(-5px); opacity: 0.6; }
        }
    `;
    document.head.appendChild(style);
}

// Language Selection
function initLanguageSelection() {
    const languageItems = document.querySelectorAll('.language-item');
    
    languageItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active from all
            languageItems.forEach(i => i.classList.remove('active'));
            
            // Add active to clicked
            this.classList.add('active');
            
            // Set language
            const langCode = this.querySelector('.language-code').textContent;
            selectedLanguage = langCode.toLowerCase();
            
            // Update text based on language
            updateTextByLanguage();
        });
    });
}

function updateTextByLanguage() {
    const texts = {
        ru: {
            continue: 'Продолжить',
            greeting: 'Привет, клейм',
            upload: 'Загрузить файл',
            captcha: 'Подтвердите, что вы человек',
            slider: '>> Проведите вправо >>'
        },
        en: {
            continue: 'Continue',
            greeting: 'Hello, claim',
            upload: 'Upload file',
            captcha: 'Confirm you are human',
            slider: '>> Slide to the right >>'
        },
        ua: {
            continue: 'Продовжити',
            greeting: 'Привіт, клейм',
            upload: 'Завантажити файл',
            captcha: 'Підтвердіть, що ви людина',
            slider: '>> Проведіть праворуч >>'
        }
    };
    
    const langTexts = texts[selectedLanguage] || texts.ru;
    
    // Update all texts
    document.querySelectorAll('.action-btn').forEach(btn => {
        if (btn.textContent.includes('Продолжить') || 
            btn.textContent.includes('Continue') || 
            btn.textContent.includes('Продовжити')) {
            btn.innerHTML = `${langTexts.continue} <i class="fas fa-arrow-right"></i>`;
        }
    });
    
    const greeting = document.querySelector('.greeting');
    if (greeting) greeting.textContent = langTexts.greeting;
    
    const uploadText = document.querySelector('.upload-text');
    if (uploadText) uploadText.textContent = langTexts.upload;
    
    const captchaTitle = document.querySelector('.captcha-title');
    if (captchaTitle) captchaTitle.textContent = langTexts.captcha;
    
    const sliderText = document.querySelector('.slider-text');
    if (sliderText) sliderText.textContent = langTexts.slider;
}

// Continue to Main Screen
function continueToMain() {
    showScreen('mainScreen');
    document.getElementById('backBtn').style.display = 'block';
}

// Show Screen
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        currentScreen = screenId;
        window.scrollTo(0, 0);
        
        // Update back button visibility
        const backBtn = document.getElementById('backBtn');
        if (screenId === 'languageScreen') {
            backBtn.style.display = 'none';
        } else if (screenId === 'mainScreen') {
            backBtn.style.display = 'block';
            backBtn.onclick = () => showScreen('languageScreen');
        } else if (screenId === 'captchaScreen') {
            backBtn.style.display = 'block';
            backBtn.onclick = () => showScreen('mainScreen');
        }
    }
}

// Update Stats
function updateStats() {
    // Random increase
    const randomIncrease = Math.floor(Math.random() * 5) + 1;
    checkCount += randomIncrease;
    
    // Format number
    const formatted = checkCount.toLocaleString('ru-RU');
    
    // Update all stats elements
    document.querySelectorAll('.stats-number, #todayChecks, #totalChecks').forEach(el => {
        el.textContent = formatted;
    });
}

// File Upload
function initFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadArea || !fileInput) return;
    
    // Click upload
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // File selection
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) processFile(file);
    });
    
    // Drag & drop
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.background = 'rgba(255, 255, 255, 0.12)';
        this.style.borderColor = 'rgba(0, 200, 255, 0.8)';
    });
    
    uploadArea.addEventListener('dragleave', function() {
        this.style.background = '';
        this.style.borderColor = '';
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.background = '';
        this.style.borderColor = '';
        
        if (e.dataTransfer.files.length) {
            const file = e.dataTransfer.files[0];
            processFile(file);
        }
    });
}

// Process File
function processFile(file) {
    const validExts = ['.json', '.html', '.txt'];
    const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExts.includes(fileExt)) {
        alert('❌ Пожалуйста, загрузите файл экспорта (.json, .html или .txt)');
        return;
    }
    
    // Show loading state
    const uploadArea = document.getElementById('uploadArea');
    const originalHTML = uploadArea.innerHTML;
    
    uploadArea.innerHTML = `
        <div class="upload-content">
            <div class="upload-icon">
                <i class="fas fa-spinner fa-spin"></i>
            </div>
            <div class="upload-text">Обработка...</div>
            <div class="upload-subtext">${file.name}</div>
        </div>
    `;
    uploadArea.style.cursor = 'default';
    
    // Simulate processing
    setTimeout(() => {
        // Show captcha
        showScreen('captchaScreen');
        
        // Restore upload area
        setTimeout(() => {
            uploadArea.innerHTML = originalHTML;
            uploadArea.style.cursor = 'pointer';
            initFileUpload(); // Re-init events
        }, 1000);
    }, 2000);
}

// CAPTCHA - КРАСИВАЯ КРУТИЛКА
function initCaptcha() {
    const sliderHandle = document.getElementById('sliderHandle');
    const captchaSlider = document.getElementById('captchaSlider');
    const sliderSuccess = document.getElementById('sliderSuccess');
    
    if (!sliderHandle || !captchaSlider) return;
    
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    let maxDistance = 0;
    
    // Update max distance
    function updateMaxDistance() {
        maxDistance = captchaSlider.offsetWidth - sliderHandle.offsetWidth - 12;
    }
    
    updateMaxDistance();
    window.addEventListener('resize', updateMaxDistance);
    
    // Mouse events
    sliderHandle.addEventListener('mousedown', startDrag);
    sliderHandle.addEventListener('touchstart', function(e) {
        startDrag(e.touches[0]);
    });
    
    function startDrag(e) {
        if (captchaCompleted) return;
        
        isDragging = true;
        startX = e.clientX - sliderHandle.offsetLeft;
        sliderHandle.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        
        // Add active class
        sliderHandle.classList.add('dragging');
        
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('touchmove', function(e) {
            onDrag(e.touches[0]);
        });
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
    }
    
    function onDrag(e) {
        if (!isDragging || captchaCompleted) return;
        
        currentX = e.clientX - startX;
        
        // Clamp position
        if (currentX < 6) currentX = 6;
        if (currentX > maxDistance) currentX = maxDistance;
        
        sliderHandle.style.left = currentX + 'px';
        
        // If reached end
        if (currentX >= maxDistance - 2) {
            completeCaptcha();
        }
    }
    
    function stopDrag() {
        if (!isDragging) return;
        
        isDragging = false;
        sliderHandle.style.cursor = 'grab';
        sliderHandle.classList.remove('dragging');
        document.body.style.userSelect = 'auto';
        
        // Reset if not completed
        if (!captchaCompleted && currentX < maxDistance - 10) {
            sliderHandle.style.left = '6px';
            
            // Add bounce effect
            sliderHandle.style.transition = 'left 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            setTimeout(() => {
                sliderHandle.style.transition = '';
            }, 500);
        }
        
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('touchend', stopDrag);
    }
    
    function completeCaptcha() {
        if (captchaCompleted) return;
        
        captchaCompleted = true;
        isDragging = false;
        
        // Snap to end
        sliderHandle.style.left = maxDistance + 'px';
        
        // Show success animation
        setTimeout(() => {
            sliderHandle.style.opacity = '0';
            sliderSuccess.classList.add('active');
            
            // Change slider background
            const sliderTrack = document.querySelector('.slider-track');
            sliderTrack.style.background = 'linear-gradient(135deg, rgba(52, 199, 89, 0.9), rgba(120, 220, 120, 0.9))';
            
            // Show success screen after delay
            setTimeout(() => {
                showScreen('successScreen');
                
                // Send data to bot
                if (tg.sendData) {
                    tg.sendData(JSON.stringify({
                        action: 'captcha_completed',
                        language: selectedLanguage,
                        timestamp: new Date().toISOString()
                    }));
                }
            }, 1500);
        }, 300);
    }
}

// Close App
function closeApp() {
    tg.close();
}

// Modal Functions
function showInstruction() {
    document.getElementById('instructionModal').style.display = 'flex';
}

function showFAQ() {
    alert('FAQ будет добавлен в следующем обновлении');
}

function closeModal() {
    document.getElementById('instructionModal').style.display = 'none';
}

// Back button functionality
document.getElementById('backBtn').addEventListener('click', function() {
    if (currentScreen === 'mainScreen') {
        showScreen('languageScreen');
    } else if (currentScreen === 'captchaScreen') {
        showScreen('mainScreen');
    }
});
