document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM загружен, инициализируем...');
    
    // Ждем загрузки всех скриптов
    if (!window.TreeManager) {
        console.error('TreeManager не загружен!');
        // Пробуем загрузить снова
        await loadScript('tree-manager-core.js');
    }
    
    if (!window.NodeEffects) {
        await loadScript('node-effects.js');
    }
    
    try {
        window.nodeEffects = new NodeEffects();
        window.treeManager = new TreeManager();
        
        // Добавляем кнопку загрузки из GitHub в интерфейс
        addGitHubLoadButton();
        
        // Инициализация treeManager
        if (window.treeManager.init && typeof window.treeManager.init === 'function') {
            await window.treeManager.init();
        } else if (window.treeManager.initialize && typeof window.treeManager.initialize === 'function') {
            await window.treeManager.initialize();
        } else {
            console.log('TreeManager не имеет метода init/initialize, пропускаем');
        }
        
        setupIframeCommunication();
        
        // Автоматическая загрузка из GitHub при открытии в iframe
        if (window.IFRAME_MODE) {
            console.log('IFRAME режим, загружаем данные...');
            setTimeout(() => {
                loadDataFromGitHub();
            }, 1000);
        }
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showNotification('Ошибка загрузки приложения. Проверьте консоль.', 'error');
    }
});

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            console.log(`Скрипт ${src} загружен`);
            resolve();
        };
        script.onerror = () => {
            console.error(`Не удалось загрузить скрипт ${src}`);
            reject(new Error(`Failed to load script: ${src}`));
        };
        document.head.appendChild(script);
    });
}

function addGitHubLoadButton() {
    const controls = document.getElementById('controls');
    if (!controls) {
        console.warn('Элемент controls не найден');
        setTimeout(addGitHubLoadButton, 500);
        return;
    }
    
    // Проверяем, не добавлена ли уже кнопка
    if (document.getElementById('githubLoadBtn')) {
        return;
    }
    
    const githubBtn = document.createElement('button');
    githubBtn.type = 'button';
    githubBtn.id = 'githubLoadBtn';
    githubBtn.textContent = 'Загрузить из GitHub';
    githubBtn.style.cssText = `
        margin-left: 10px;
        background: linear-gradient(145deg, #24292e, #0366d6);
        color: white;
        padding: 8px 12px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
    `;
    
    githubBtn.addEventListener('mouseover', () => {
        githubBtn.style.transform = 'translateY(-2px)';
        githubBtn.style.boxShadow = '0 4px 8px rgba(3, 102, 214, 0.3)';
    });
    
    githubBtn.addEventListener('mouseout', () => {
        githubBtn.style.transform = 'translateY(0)';
        githubBtn.style.boxShadow = 'none';
    });
    
    const jsonImportBtn = document.getElementById('jsonImportBtn');
    if (jsonImportBtn) {
        jsonImportBtn.parentNode.insertBefore(githubBtn, jsonImportBtn.nextSibling);
    } else {
        controls.appendChild(githubBtn);
    }
    
    githubBtn.addEventListener('click', async () => {
        await loadDataFromGitHub();
    });
    
    console.log('Кнопка GitHub добавлена');
}

async function loadDataFromGitHub() {
    try {
        showLoadingIndicator('Загрузка данных из GitHub...');
        
        // Пробуем загрузить через RAW URL (публичный доступ)
        console.log('Загружаем из GitHub...');
        const data = await loadFromGitHub();
        
        if (!window.treeManager) {
            throw new Error('TreeManager не инициализирован');
        }
        
        // Загружаем данные в дерево
        if (window.treeManager.importData && typeof window.treeManager.importData === 'function') {
            window.treeManager.importData(data);
        } else if (window.treeManager.loadData && typeof window.treeManager.loadData === 'function') {
            window.treeManager.loadData(data);
        } else {
            // Используем fallback метод
            await loadTreeDataManually(data);
        }
        
        showNotification('✅ Данные успешно загружены из GitHub!');
        
    } catch (error) {
        console.error('Ошибка загрузки из GitHub:', error);
        showNotification(`❌ Ошибка: ${error.message}`, 'error');
    } finally {
        hideLoadingIndicator();
    }
}

async function loadFromGitHub() {
    // ПРАВИЛЬНЫЙ URL (исправлена опечатка)
    const rawUrl = 'https://raw.githubusercontent.com/mark98molchanov-a11y/mark98molchanov-a11y.github.io/main/tree-data.json';
    console.log('Загружаем из URL:', rawUrl);
    
    try {
        const response = await fetch(rawUrl, {
            mode: 'cors',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ошибка: ${response.status} ${response.statusText}`);
        }
        
        const text = await response.text();
        console.log('Получены данные длиной:', text.length);
        
        // Пробуем распарсить JSON
        try {
            const jsonData = JSON.parse(text);
            console.log('JSON успешно распарсен, версия:', jsonData.version || 'нет');
            return jsonData;
        } catch (parseError) {
            console.error('Ошибка парсинга JSON:', parseError);
            throw new Error('Некорректный JSON формат');
        }
        
    } catch (fetchError) {
        console.error('Ошибка fetch:', fetchError);
        
        // Альтернативный URL (если первый не работает)
        const altUrl = 'https://raw.githubusercontent.com/mark98molchanov-a11y/mark98molchanov-a11y.github.io/refs/heads/main/tree-data.json';
        console.log('Пробуем альтернативный URL:', altUrl);
        
        const altResponse = await fetch(altUrl);
        if (!altResponse.ok) {
            throw new Error(`Альтернативный URL тоже не работает: ${altResponse.status}`);
        }
        
        return await altResponse.json();
    }
}

async function loadTreeDataManually(data) {
    console.log('Ручная загрузка данных в дерево');
    
    if (!data || !data.tree) {
        throw new Error('Нет данных дерева в загруженном файле');
    }
    
    // Очищаем текущее дерево
    const treeElement = document.getElementById('tree');
    if (treeElement) {
        treeElement.innerHTML = '';
    }
    
    // Создаем простую функцию для отображения дерева
    function renderNode(node, parentElement) {
        const nodeElement = document.createElement('div');
        nodeElement.className = 'node';
        nodeElement.dataset.nodeId = node.id;
        
        const contentElement = document.createElement('div');
        contentElement.className = 'node-content';
        
        // Добавляем заголовок
        const titleElement = document.createElement('span');
        titleElement.className = 'node-title';
        titleElement.textContent = node.content?.title || `Узел ${node.id}`;
        
        contentElement.appendChild(titleElement);
        nodeElement.appendChild(contentElement);
        
        // Добавляем дочерние узлы
        if (node.children && node.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'node-children';
            
            node.children.forEach(child => {
                renderNode(child, childrenContainer);
            });
            
            nodeElement.appendChild(childrenContainer);
        }
        
        parentElement.appendChild(nodeElement);
    }
    
    // Рендерим корневой узел
    const treeContainer = document.getElementById('tree');
    if (treeContainer && data.tree) {
        renderNode(data.tree, treeContainer);
    }
    
    // Сохраняем данные в localStorage
    try {
        localStorage.setItem('treeData', JSON.stringify(data));
        console.log('Данные сохранены в localStorage');
    } catch (storageError) {
        console.warn('Не удалось сохранить в localStorage:', storageError);
    }
}

function showLoadingIndicator(message) {
    hideLoadingIndicator();
    
    const indicator = document.createElement('div');
    indicator.id = 'github-loading-indicator';
    indicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.85);
        padding: 25px 35px;
        border-radius: 15px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 20px;
        border: 2px solid #0366d6;
        color: white;
        font-size: 16px;
        backdrop-filter: blur(10px);
    `;
    
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        width: 40px;
        height: 40px;
        border: 4px solid rgba(255,255,255,0.3);
        border-top: 4px solid #0366d6;
        border-radius: 50%;
        animation: githubSpin 1s linear infinite;
    `;
    
    const text = document.createElement('span');
    text.textContent = message;
    text.style.color = 'white';
    text.style.fontWeight = '500';
    
    indicator.appendChild(spinner);
    indicator.appendChild(text);
    document.body.appendChild(indicator);
    
    // Добавляем стили для анимации
    if (!document.querySelector('#github-animations')) {
        const style = document.createElement('style');
        style.id = 'github-animations';
        style.textContent = `
            @keyframes githubSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @keyframes githubSlideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes githubSlideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

function hideLoadingIndicator() {
    const indicator = document.getElementById('github-loading-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function showNotification(text, type = 'success') {
    const oldNotifications = document.querySelectorAll('.github-notification');
    oldNotifications.forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `github-notification ${type}`;
    notification.textContent = text;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'error' ? 'linear-gradient(145deg, #ff4444, #d32f2f)' : 'linear-gradient(145deg, #4CAF50, #2E7D32)'};
        color: white;
        border-radius: 10px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.25);
        z-index: 10000;
        animation: githubSlideIn 0.3s ease-out;
        font-weight: 500;
        font-size: 14px;
        max-width: 450px;
        word-wrap: break-word;
    `;
    
    // Кнопка закрытия
    const closeBtn = document.createElement('span');
    closeBtn.textContent = ' ×';
    closeBtn.style.cssText = `
        margin-left: 15px;
        cursor: pointer;
        font-weight: bold;
        font-size: 18px;
        display: inline-block;
    `;
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
    
    notification.appendChild(closeBtn);
    document.body.appendChild(notification);
    
    // Автоматическое скрытие
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'githubSlideOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

function setupIframeCommunication() {
    if (window.IFRAME_MODE) {
        console.log('Настройка iframe коммуникации');
        
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'TREE_LOADED',
                height: document.body.scrollHeight
            }, '*');
            
            window.addEventListener('message', function(event) {
                console.log('Получено сообщение:', event.data);
                
                if (event.data.type === 'GET_TREE_DATA') {
                    window.parent.postMessage({
                        type: 'TREE_DATA',
                        data: window.treeManager ? window.treeManager.exportToJSON?.() : null
                    }, '*');
                }
                
                if (event.data.type === 'SET_THEME') {
                    if (event.data.theme === 'dark') {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                }
                
                if (event.data.type === 'LOAD_FROM_GITHUB') {
                    loadDataFromGitHub();
                }
            });
        }
        
        function resizeForIframe() {
            const container = document.querySelector('.tree-container');
            if (container) {
                container.style.height = window.innerHeight - 60 + 'px';
            }
        }
        
        window.addEventListener('resize', resizeForIframe);
        resizeForIframe();
    }
}

// Глобальные переменные для мыши
window.mouseX = 0;
window.mouseY = 0;

document.addEventListener('mousemove', (e) => {
    window.mouseX = e.clientX;
    window.mouseY = e.clientY;
});

// Проверяем доступность GitHub при загрузке
window.addEventListener('load', () => {
    console.log('Проверяем доступность GitHub...');
    
    fetch('https://raw.githubusercontent.com/mark98molchanov-a11y/mark98molchanov-a11y.github.io/main/tree-data.json', {
        mode: 'no-cors'
    }).then(() => {
        console.log('GitHub доступен');
    }).catch(() => {
        console.warn('GitHub недоступен через fetch, но это нормально из-за CORS');
    });
});
