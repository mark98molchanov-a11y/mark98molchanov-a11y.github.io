
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌳 Инициализация дерева...');
    
    window.githubLoader = new GitHubLoader({
        owner: 'mark98molchanov-a11y',
        repo: 'mark98molchanov-a11y.github.io',
        branch: 'main'
         token: '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'
    });
    
    window.nodeEffects = new NodeEffects();
    window.treeManager = new TreeManager();
    

    try {
        console.log('🔍 Загрузка данных...');
        const treeData = await window.githubLoader.loadTreeData();
        
        if (treeData && treeData.length > 0) {
            console.log(`✅ Загружено ${treeData.length} элементов`);
            window.treeManager.init(treeData);
        } else {
            console.log('📁 Использую локальные данные');
            window.treeManager.init();
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        window.treeManager.init();
    }
    
    setTimeout(() => setupGitHubControls(), 500);
    
    setupIframeCommunication();
    
    console.log('✅ Приложение инициализировано');
});

function setupGitHubControls() {
    const controls = document.getElementById('controls');
    if (!controls) return;
    
    if (document.getElementById('loadFromGitHub')) return;
    
    document.getElementById('loadFromGitHub')?.addEventListener('click', async () => {
        const status = document.getElementById('githubStatus');
        status.textContent = '⏳ Загрузка из GitHub...';
        status.style.color = '#007bff';
        
        try {
            const treeData = await window.githubLoader.loadTreeData();
            
            if (window.treeManager && window.treeManager.loadTree) {
                window.treeManager.loadTree(treeData);
                status.textContent = '✅ Данные загружены!';
                status.style.color = '#28a745';
            } else {
                status.textContent = '⚠️ Загружено, но нет функции отображения';
                status.style.color = '#ffc107';
            }
        } catch (error) {
            status.textContent = '❌ Ошибка: ' + error.message;
            status.style.color = '#dc3545';
        }
        
        setTimeout(() => {
            status.textContent = '';
        }, 3000);
    });
    
    document.getElementById('saveToGitHub')?.addEventListener('click', async () => {
        const status = document.getElementById('githubStatus');
        status.textContent = '⏳ Сохранение в GitHub...';
        status.style.color = '#007bff';
        
        try {
            let treeData = [];
            
            if (window.treeManager && window.treeManager.exportToJSON) {
                treeData = window.treeManager.exportToJSON();
            } else if (window.treeManager && window.treeManager.getTreeData) {
                treeData = window.treeManager.getTreeData();
            }
            
            if (!treeData || treeData.length === 0) {
                status.textContent = '❌ Нет данных для сохранения';
                status.style.color = '#dc3545';
                return;
            }
            
            const success = await window.githubLoader.saveTreeData(treeData);
            
            if (success) {
                status.textContent = '✅ Успешно сохранено!';
                status.style.color = '#28a745';
            } else {
                status.textContent = '⚠️ Сохранено локально (нужен токен GitHub)';
                status.style.color = '#ffc107';
            }
        } catch (error) {
            status.textContent = '❌ Ошибка: ' + error.message;
            status.style.color = '#dc3545';
        }
        
        setTimeout(() => {
            status.textContent = '';
        }, 3000);
    });
    
    console.log('✅ GitHub кнопки настроены');
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
                    const data = window.treeManager?.exportToJSON?.() || [];
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
