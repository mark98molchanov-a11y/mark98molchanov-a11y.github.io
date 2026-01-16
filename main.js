document.addEventListener('DOMContentLoaded', async () => {
    window.nodeEffects = new NodeEffects();
    window.treeManager = new TreeManager();
    
    addGitHubLoadButton();
    
    await window.treeManager.init();
    
    setupIframeCommunication();
});

function addGitHubLoadButton() {
    const controls = document.getElementById('controls');
    if (!controls) return;
    
    const githubBtn = document.createElement('button');
    githubBtn.type = 'button';
    githubBtn.id = 'githubLoadBtn';
    githubBtn.textContent = 'Загрузить из GitHub';
    githubBtn.style.marginLeft = '10px';
    githubBtn.style.background = 'linear-gradient(145deg, #24292e, #0366d6)';
    githubBtn.style.color = 'white';
    
    const jsonImportBtn = document.getElementById('jsonImportBtn');
    if (jsonImportBtn) {
        jsonImportBtn.parentNode.insertBefore(githubBtn, jsonImportBtn.nextSibling);
    } else {
        controls.appendChild(githubBtn);
    }
    
    githubBtn.addEventListener('click', async () => {
        await loadDataFromGitHub();
    });
}

async function loadDataFromGitHub() {
    try {
        showLoadingIndicator('Загрузка данных из GitHub...');
        
        // Ваш репозиторий и токен
        const owner = 'mark98molchanov-a11y';
        const repo = 'mark98molchanov-a11y.github.io';
        const token = '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'; // ⚠️ Лучше вынести в настройки
        const path = 'tree-data.json';
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка GitHub API: ${response.status}`);
        }
        
        const data = await response.json();
        
        const content = atob(data.content);
        const jsonData = JSON.parse(content);
    
        if (window.treeManager && window.treeManager.importData) {
            window.treeManager.importData(jsonData);
            showNotification('✅ Данные успешно загружены из GitHub!');
        } else {
            await loadTreeDataFromJSON(jsonData);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки из GitHub:', error);
        showNotification(`❌ Ошибка: ${error.message}`, 'error');
        
        try {
            showNotification('Пробуем загрузить через публичную ссылку...');
            await loadFromRawGitHub();
        } catch (rawError) {
            console.error('Ошибка RAW загрузки:', rawError);
        }
    } finally {
        hideLoadingIndicator();
    }
}

async function loadFromRawGitHub() {
    const rawUrl = 'https://raw.githubusercontent.com/mark98molchanov-a11y/mark98molchanov-a11y.github.io/main/tree-data.json';
    
    const response = await fetch(rawUrl);
    if (!response.ok) {
        throw new Error(`RAW загрузка не удалась: ${response.status}`);
    }
    
    const jsonData = await response.json();
    
    if (window.treeManager && window.treeManager.importData) {
        window.treeManager.importData(jsonData);
        showNotification('✅ Данные загружены через публичную ссылку GitHub!');
    }
}

async function loadTreeDataFromJSON(data) {
    if (data.version && data.version !== '1.0') {
        const confirmed = confirm(
            'Этот файл создан в другой версии приложения.\n' +
            'Возможны ошибки в работе. Продолжить загрузку?'
        );
        if (!confirmed) return;
    }
    
    if (window.treeManager) {
        window.treeManager.imagesData = data.images || {};
        window.treeManager.nodeCounter = data.counter || 1;
        window.treeManager.treeData = window.treeManager.restoreTree(data.tree);
        window.treeManager.filesData = data.filesData || {};
        
        if (data.version >= '2.7') {
            window.treeManager.clusters = new Map(data.clusters || []);
            window.treeManager.availableClusters = new Set(data.availableClusters || []);
            window.treeManager.activeCluster = data.settings?.activeCluster || null;
        }
        
        window.treeManager.darkMode = data.theme === 'dark';
        document.documentElement.classList.toggle('dark', window.treeManager.darkMode);
        
        window.treeManager.updateTree();
        window.treeManager.saveData();
        
        showNotification('✅ Данные успешно загружены!');
    }
}

function showLoadingIndicator(message) {
    const oldIndicator = document.getElementById('github-loading-indicator');
    if (oldIndicator) oldIndicator.remove();
    
    const indicator = document.createElement('div');
    indicator.id = 'github-loading-indicator';
    indicator.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--controls-bg);
        padding: 20px 30px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 15px;
        border: 2px solid var(--primary-color);
    `;
    
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        width: 30px;
        height: 30px;
        border: 3px solid var(--secondary-color);
        border-top: 3px solid var(--primary-color);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    `;
    
    const text = document.createElement('span');
    text.textContent = message;
    text.style.color = 'var(--text-color)';
    
    if (!document.getElementById('github-spinner-styles')) {
        const style = document.createElement('style');
        style.id = 'github-spinner-styles';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    indicator.appendChild(spinner);
    indicator.appendChild(text);
    document.body.appendChild(indicator);
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
        padding: 12px 20px;
        background: ${type === 'error' ? 'linear-gradient(145deg, #ff4444, #d32f2f)' : 'linear-gradient(145deg, #4CAF50, #2E7D32)'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        font-weight: 500;
    `;
    
    if (!document.getElementById('github-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'github-notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 3000);
}

function setupIframeCommunication() {
    if (window.IFRAME_MODE) {
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'TREE_LOADED',
                height: document.body.scrollHeight
            }, '*');
            window.addEventListener('message', function(event) {
                if (event.data.type === 'GET_TREE_DATA') {
                    window.parent.postMessage({
                        type: 'TREE_DATA',
                        data: window.treeManager.exportToJSON()
                    }, '*');
                }
                
                if (event.data.type === 'SET_THEME') {
                    if (event.data.theme === 'dark') {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
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

window.mouseX = 0;
window.mouseY = 0;

document.addEventListener('mousemove', (e) => {
    window.mouseX = e.clientX;
    window.mouseY = e.clientY;
});
