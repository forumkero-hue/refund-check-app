document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.querySelector('.upload-area');
    
    // Загрузка файла
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.name.includes('.json') || file.name.includes('.html')) {
                uploadArea.innerHTML = `
                    <div style="color: #4CAF50;">✓</div>
                    <p>Файл загружен: ${file.name}</p>
                    <p>Обрабатываем...</p>
                `;
                
                // Имитация обработки
                setTimeout(() => {
                    alert('✅ Проверка завершена! Данные отправлены боту.');
                    if (window.Telegram && Telegram.WebApp) {
                        Telegram.WebApp.close();
                    }
                }, 2000);
            } else {
                alert('❌ Загрузите файл .json или .html');
            }
        }
    });
    
    // Drag & drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.background = '#f0f8ff';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.background = '';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.background = '';
        fileInput.files = e.dataTransfer.files;
        fileInput.dispatchEvent(new Event('change'));
    });
});
