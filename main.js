// main.js
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌳 Инициализация дерева...');
    
    // Инициализация GitHub Loader
    window.githubLoader = new GitHubLoader({
        owner: 'mark98molchanov-a11y',
        repo: 'mark98molchanov-a11y.github.io',
        branch: 'main',
         token: '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'
    });
    
    if (!window.TreeManager) {
        console.error('❌ TreeManager не загружен!');
        return;
    }
    
    window.treeManager = new TreeManager();
    window.nodeEffects = new NodeEffects();
    
    try {
        console.log('🔍 Загрузка данных...');
        const treeData = await window.githubLoader.loadTreeData();
        
        if (treeData && treeData.length > 0) {
            console.log(`✅ Загружено ${treeData.length} элементов`);
            
            console.log('Доступные методы:', Object.keys(window.treeManager).filter(key => typeof window.treeManager[key] === 'function'));

            if (typeof window.treeManager.init === 'function') {
                window.treeManager.init(treeData);
            } else if (typeof window.treeManager.initialize === 'function') {
                window.treeManager.initialize(treeData);
            } else if (typeof window.treeManager.loadTree === 'function') {
                window.treeManager.loadTree(treeData);
            } else if (typeof window.treeManager.setData === 'function') {
                window.treeManager.setData(treeData);
            } else {
                console.error('❌ Нет подходящего метода инициализации');
                // Пробуем через export/import если есть
                if (typeof window.treeManager.importData === 'function') {
                    window.treeManager.importData(JSON.stringify(treeData));
                }
            }
        } else {
            console.log('📁 Использую локальные данные');
            if (typeof window.treeManager.init === 'function') {
                window.treeManager.init();
            }
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        // Инициализируем без данных при ошибке
        if (window.treeManager && typeof window.treeManager.init === 'function') {
            window.treeManager.init();
        }
    }
    
    setTimeout(() => setupGitHubControls(), 1000);
    
    setupIframeCommunication();
    
    console.log('✅ Приложение инициализировано');
});

function setupGitHubControls() {
    const controls = document.getElementById('controls');
    if (!controls) {
        console.warn('❌ Элемент controls не найден');
        return;
    }
    
    const loadBtn = document.getElementById('loadFromGitHub');
    const saveBtn = document.getElementById('saveToGitHub');
    const status = document.getElementById('githubStatus');
    
    if (!loadBtn || !saveBtn || !status) {
        console.warn('❌ Кнопки GitHub не найдены в DOM');
        return;
    }
    loadBtn.addEventListener('click', async () => {
        status.textContent = '⏳ Загрузка из GitHub...';
        status.style.color = '#007bff';
        
        try {
            const treeData = await window.githubLoader.loadTreeData();
            
            if (treeData && treeData.length > 0) {
                // Пробуем разные методы загрузки
                if (typeof window.treeManager.loadTree === 'function') {
                    window.treeManager.loadTree(treeData);
                } else if (typeof window.treeManager.setData === 'function') {
                    window.treeManager.setData(treeData);
                } else if (typeof window.treeManager.importData === 'function') {
                    window.treeManager.importData(JSON.stringify(treeData));
                } else {
                    console.warn('⚠️ Нет метода для загрузки данных');
                    status.textContent = '⚠️ Данные получены, но не отображены';
                    status.style.color = '#ffc107';
                    return;
                }
                
                status.textContent = `✅ Загружено ${treeData.length} элементов`;
                status.style.color = '#28a745';
                
                // Обновляем iframe если нужно
                if (window.IFRAME_MODE && window.parent !== window) {
                    window.parent.postMessage({
                        type: 'TREE_UPDATED'
                    }, '*');
                }
            } else {
                status.textContent = '⚠️ Нет данных в GitHub';
                status.style.color = '#ffc107';
            }
        } catch (error) {
            status.textContent = '❌ Ошибка: ' + error.message;
            status.style.color = '#dc3545';
            console.error('Ошибка загрузки:', error);
        }
        
        setTimeout(() => {
            if (status.textContent.includes('✅') || status.textContent.includes('❌') || status.textContent.includes('⚠️')) {
                status.textContent = '';
            }
        }, 3000);
    });
    saveBtn.addEventListener('click', async () => {
        status.textContent = '⏳ Сохранение...';
        status.style.color = '#007bff';
        
        try {
            let treeData = [];
            
            if (typeof window.treeManager.exportToJSON === 'function') {
                treeData = window.treeManager.exportToJSON();
            } else if (typeof window.treeManager.getTreeData === 'function') {
                treeData = window.treeManager.getTreeData();
            } else if (typeof window.treeManager.exportData === 'function') {
                const dataStr = window.treeManager.exportData();
                treeData = JSON.parse(dataStr);
            } else {
                status.textContent = '❌ Не могу получить данные для сохранения';
                status.style.color = '#dc3545';
                setTimeout(() => { status.textContent = ''; }, 3000);
                return;
            }
            
            if (!treeData || treeData.length === 0) {
                status.textContent = '⚠️ Нет данных для сохранения';
                status.style.color = '#ffc107';
                setTimeout(() => { status.textContent = ''; }, 3000);
                return;
            }
            
            console.log('💾 Сохраняю данные:', treeData.length, 'элементов');
            
            const success = await window.githubLoader.saveTreeData(treeData);
            
            if (success) {
                status.textContent = '✅ Сохранено в GitHub!';
                status.style.color = '#28a745';
            } else {
                status.textContent = '⚠️ Сохранено локально (для GitHub нужен токен)';
                status.style.color = '#ffc107';
            }
        } catch (error) {
            status.textContent = '❌ Ошибка: ' + error.message;
            status.style.color = '#dc3545';
            console.error('Ошибка сохранения:', error);
        }
        
        setTimeout(() => {
            if (status.textContent.includes('✅') || status.textContent.includes('❌') || status.textContent.includes('⚠️')) {
                status.textContent = '';
            }
        }, 3000);
    });
    
    console.log('✅ Кнопки GitHub настроены');
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
                    let data = [];
                    if (typeof window.treeManager.exportToJSON === 'function') {
                        data = window.treeManager.exportToJSON();
                    }
                    window.parent.postMessage({
                        type: 'TREE_DATA',
                        data: data
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

window.initializeTreeFromGitHub = async function() {
    console.log('🔧 Ручная инициализация из GitHub...');
    const loadBtn = document.getElementById('loadFromGitHub');
    if (loadBtn) loadBtn.click();
};
