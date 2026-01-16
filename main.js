// main.js - обновленная версия с ожиданием загрузки TreeManager
async function initializeApp() {
    console.log('🌳 Инициализация дерева...');

    let maxAttempts = 10;
    let attempt = 0;
    
    while (!window.TreeManager && attempt < maxAttempts) {
        console.log(`Ожидаю TreeManager... (попытка ${attempt + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 300));
        attempt++;
    }
    
    if (!window.TreeManager) {
        console.error('❌ TreeManager не загружен даже после ожидания!');
        console.log('Проверьте порядок скриптов в index.html');
        console.log('TreeManager должен загружаться ПЕРЕД main.js');
        return;
    }
    
    console.log('✅ TreeManager загружен');
    window.githubLoader = new GitHubLoader({
        owner: 'mark98molchanov-a11y',
        repo: 'mark98molchanov-a11y.github.io',
        branch: 'main',
        token: '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'
    });
    
    window.treeManager = new TreeManager();
    if (window.NodeEffects) {
        window.nodeEffects = new NodeEffects();
    }
    try {
        console.log('🔍 Загрузка данных...');
        const treeData = await window.githubLoader.loadTreeData();
        
        if (treeData && treeData.length > 0) {
            console.log(`✅ Загружено ${treeData.length} элементов`);

            console.log('TreeManager prototype методы:', 
                Object.getOwnPropertyNames(TreeManager.prototype)
                    .filter(name => typeof TreeManager.prototype[name] === 'function')
            );

            initializeTree(treeData);
        } else {
            console.log('📁 Нет данных, создаю пустое дерево');
            initializeTree([]);
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        initializeTree([]);
    }
    
    setTimeout(() => setupGitHubControls(), 500);
    
    setupIframeCommunication();
    
    console.log('✅ Приложение инициализировано');
}

function initializeTree(treeData) {
    if (!window.treeManager) {
        console.error('❌ treeManager не создан');
        return;
    }
    
    const methods = ['init', 'initialize', 'loadTree', 'setData', 'loadData', 'setTreeData'];
    
    for (const method of methods) {
        if (typeof window.treeManager[method] === 'function') {
            console.log(`✅ Использую метод: ${method}`);
            try {
                window.treeManager[method](treeData);
                return; // Успешно
            } catch (methodError) {
                console.warn(`Метод ${method} вызвал ошибку:`, methodError);
            }
        }
    }
    
    console.log('⚠️ Прямые методы не работают, пробую альтернативы...');
    
    if (typeof window.treeManager.importData === 'function') {
        console.log('✅ Использую importData');
        window.treeManager.importData(JSON.stringify(treeData));
        return;
    }
  
    if (typeof window.treeManager.render === 'function') {
        console.log('✅ Использую render');
        window.treeManager.treeData = treeData; // Устанавливаем данные напрямую
        window.treeManager.render();
        return;
    }
    
    console.log('⚠️ Сохраняю данные в localStorage для ручной загрузки');
    localStorage.setItem('treeData_from_github', JSON.stringify(treeData));
    
    if (typeof window.treeManager.update === 'function') {
        window.treeManager.treeData = treeData;
        window.treeManager.update();
    }
    
    console.error('❌ Не удалось инициализировать дерево');
}

function setupGitHubControls() {
    const controls = document.getElementById('controls');
    if (!controls) {
        console.log('🔄 controls не найден, создаю...');
        createGitHubControls();
        return;
    }
    
    let loadBtn = document.getElementById('loadFromGitHub');
    let saveBtn = document.getElementById('saveToGitHub');
    let status = document.getElementById('githubStatus');
    
    if (!loadBtn || !saveBtn) {
        createGitHubControls();
        loadBtn = document.getElementById('loadFromGitHub');
        saveBtn = document.getElementById('saveToGitHub');
        status = document.getElementById('githubStatus');
    }
    
    if (!loadBtn || !saveBtn || !status) {
        console.error('❌ Не удалось создать кнопки GitHub');
        return;
    }
    
    loadBtn.addEventListener('click', async () => {
        status.textContent = '⏳ Загрузка из GitHub...';
        status.style.color = '#007bff';
        
        try {
            const treeData = await window.githubLoader.loadTreeData();
            
            if (treeData && treeData.length > 0) {
                initializeTree(treeData);
                status.textContent = `✅ Загружено ${treeData.length} элементов`;
                status.style.color = '#28a745';
                
                if (window.IFRAME_MODE && window.parent !== window) {
                    window.parent.postMessage({ type: 'TREE_UPDATED' }, '*');
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
    
    // Обработчик сохранения
    saveBtn.addEventListener('click', async () => {
        status.textContent = '⏳ Сохранение...';
        status.style.color = '#007bff';
        
        try {
            let treeData = [];
            
            if (window.treeManager) {
                const methods = ['exportToJSON', 'getTreeData', 'getData', 'exportData'];
                
                for (const method of methods) {
                    if (typeof window.treeManager[method] === 'function') {
                        try {
                            const result = window.treeManager[method]();
                            if (Array.isArray(result)) {
                                treeData = result;
                                break;
                            } else if (typeof result === 'string') {
                                treeData = JSON.parse(result);
                                break;
                            }
                        } catch (e) {
                            console.warn(`Метод ${method} не сработал:`, e);
                        }
                    }
                }
            }

            if (treeData.length === 0 && window.treeManager && window.treeManager.treeData) {
                treeData = window.treeManager.treeData;
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
                status.textContent = '⚠️ Не удалось сохранить';
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

function createGitHubControls() {
    const controls = document.getElementById('controls');
    if (!controls) return;
    
    const githubHTML = `
        <div class="github-buttons" style="display: flex; gap: 5px; align-items: center; margin: 5px 0; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 8px;">
            <button id="loadFromGitHub" style="padding: 8px 12px; background: #2ea44f; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">↻ Загрузить из GitHub</button>
            <button id="saveToGitHub" style="padding: 8px 12px; background: #0366d6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">💾 Сохранить в GitHub</button>
            <div id="githubStatus" style="font-size: 11px; color: #666; margin-left: 10px; min-width: 200px;"></div>
        </div>
    `;
    
    controls.insertAdjacentHTML('afterbegin', githubHTML);
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
                    if (window.treeManager) {
                        if (typeof window.treeManager.exportToJSON === 'function') {
                            data = window.treeManager.exportToJSON();
                        } else if (window.treeManager.treeData) {
                            data = window.treeManager.treeData;
                        }
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

document.addEventListener('DOMContentLoaded', initializeApp);
