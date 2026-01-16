function waitForScripts() {
    return new Promise((resolve) => {
        const checkScripts = () => {
            if (typeof TreeManager !== 'undefined' && typeof NodeEffects !== 'undefined') {
                resolve();
            } else {
                setTimeout(checkScripts, 100);
            }
        };
        checkScripts();
    });
}
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM загружен, проверяем скрипты...');
    
    try {
        console.log('Ожидаем загрузку TreeManager и NodeEffects...');
        await waitForScripts();
        console.log('Все скрипты загружены!');
        
        window.nodeEffects = new NodeEffects();
        console.log('NodeEffects создан');
        
        window.treeManager = new TreeManager();
        console.log('TreeManager создан');
        
        console.log('Доступные методы TreeManager:');
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(window.treeManager));
        methods.forEach(method => {
            console.log(`  - ${method}`);
        });
        
        if (typeof window.treeManager.init === 'function') {
            console.log('Вызываю treeManager.init()');
            window.treeManager.init();
        } else if (typeof window.treeManager.initialize === 'function') {
            console.log('Вызываю treeManager.initialize()');
            window.treeManager.initialize();
        } else if (typeof window.treeManager.load === 'function') {
            console.log('Вызываю treeManager.load()');
            window.treeManager.load();
        } else {
            console.log('Прямая инициализация (метод init не найден)');
            // Если есть данные в localStorage, загружаем их
            const savedTree = localStorage.getItem('treeData');
            if (savedTree) {
                try {
                    const treeData = JSON.parse(savedTree);
                    if (typeof window.treeManager.loadTree === 'function') {
                        window.treeManager.loadTree(treeData);
                    }
                } catch (e) {
                    console.warn('Не удалось загрузить сохраненное дерево:', e);
                }
            }
        }
        
        setupIframeCommunication();
        setupGitHubLoader();
        
        // Тестируем GitHub API
        setTimeout(testGitHubAPI, 500);
        
        console.log('✅ Приложение успешно инициализировано');
        
    } catch (error) {
        console.error('❌ Критическая ошибка при инициализации:', error);
        alert('Ошибка загрузки приложения: ' + error.message);
    }
});

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
function setupGitHubLoader() {
    console.log('Настройка GitHub загрузчика...');
    
    const loadFromGitHubBtn = document.getElementById('loadFromGitHubBtn');
    const githubModalBackdrop = document.getElementById('githubModalBackdrop');
    const githubOwnerInput = document.getElementById('githubOwner');
    const githubRepoInput = document.getElementById('githubRepo');
    const githubTokenInput = document.getElementById('githubToken');
    const githubLoadBtn = document.getElementById('githubLoadBtn');
    const githubCancelBtn = document.getElementById('githubCancelBtn');
    
    if (!loadFromGitHubBtn) {
        console.error('Кнопка "Загрузить из GitHub" не найдена!');
        return;
    }
    
    console.log('Кнопка GitHub найдена, добавляем обработчик...');
    
    loadFromGitHubBtn.addEventListener('click', function() {
        console.log('✅ Кнопка "Загрузить из GitHub" НАЖАТА!');
        
        if (githubOwnerInput) githubOwnerInput.value = 'mark98molchanov-a11y';
        if (githubRepoInput) githubRepoInput.value = 'mark98molchanov-a11y.github.io';
        if (githubTokenInput) githubTokenInput.value = '';
        
        if (githubModalBackdrop) {
            githubModalBackdrop.style.display = 'flex';
            console.log('Модальное окно открыто');
        } else {
            console.error('Модальное окно не найдено!');
            alert('Ошибка: модальное окно не найдено');
        }
    });
    
    if (githubCancelBtn) {
        githubCancelBtn.addEventListener('click', () => {
            if (githubModalBackdrop) {
                githubModalBackdrop.style.display = 'none';
            }
        });
    }
    
    if (githubModalBackdrop) {
        githubModalBackdrop.addEventListener('click', (e) => {
            if (e.target === githubModalBackdrop) {
                githubModalBackdrop.style.display = 'none';
            }
        });
    }
    
    if (githubLoadBtn) {
        githubLoadBtn.addEventListener('click', async () => {
            console.log('Кнопка загрузки в модальном окне нажата');
            
            const owner = githubOwnerInput ? githubOwnerInput.value.trim() : '';
            const repo = githubRepoInput ? githubRepoInput.value.trim() : '';
            const token = githubTokenInput ? githubTokenInput.value.trim() : '';
            
            if (!owner) {
                alert('Введите имя владельца репозитория');
                return;
            }
            
            if (!repo) {
                alert('Введите название репозитория');
                return;
            }
            
            githubLoadBtn.textContent = 'Загрузка...';
            githubLoadBtn.disabled = true;
            
            try {
                console.log(`Загрузка из GitHub: ${owner}/${repo}`);
                const treeData = await loadTreeFromGitHub(owner, repo, token);
                
                if (treeData) {
                    await loadTreeIntoApp(treeData);
                    if (githubModalBackdrop) {
                        githubModalBackdrop.style.display = 'none';
                    }
                    alert('✅ Дерево успешно загружено из GitHub!');
                } else {
                    alert('⚠️ Не удалось найти данные дерева в репозитории');
                }
            } catch (error) {
                console.error('Ошибка загрузки из GitHub:', error);
                alert('❌ Ошибка загрузки: ' + error.message);
            } finally {
                githubLoadBtn.textContent = 'Загрузить';
                githubLoadBtn.disabled = false;
            }
        });
    }
    
    const inputs = [githubOwnerInput, githubRepoInput, githubTokenInput].filter(Boolean);
    inputs.forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && githubLoadBtn) {
                githubLoadBtn.click();
            }
        });
    });
    
    console.log('GitHub загрузчик настроен');
}
async function testGitHubConnection() {
    try {
        console.log('Тестируем соединение с GitHub...');
        const response = await fetch('https://api.github.com/repos/mark98molchanov-a11y/mark98molchanov-a11y.github.io');
        
        if (response.ok) {
            const data = await response.json();
            console.log('Репозиторий найден:', data.name);
            console.log('Файлы в репозитории:', data);
            return data;
        } else {
            throw new Error(`Ошибка ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Ошибка соединения с GitHub:', error);
        throw error;
    }
}
async function loadTreeFromGitHub(owner, repo, token) {
    console.log(`Загрузка из GitHub: ${owner}/${repo}`);
    
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Tree-App'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const sources = [
        { path: 'tree-data.json', description: 'Основной файл данных' },
        { path: 'tree_data.json', description: 'Альтернативное имя' },
        { path: 'data/tree-data.json', description: 'В папке data' },
        { path: 'data/tree.json', description: 'JSON в папке data' },
        { path: 'exported-tree.json', description: 'Экспортированный файл' },
        { path: 'tree.json', description: 'Корневой JSON' },
        { path: 'tree-data.js', description: 'JS файл с данными' },
        { path: 'data.json', description: 'Общий файл данных' }
    ];
    
    for (const source of sources) {
        try {
            console.log(`Пробуем загрузить: ${source.path}`);
            
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${source.path}`;
            console.log(`Запрос к: ${apiUrl}`);
            
            const response = await fetch(apiUrl, { headers });
            
            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`Файл ${source.path} не найден (404)`);
                } else {
                    console.log(`Ошибка ${response.status} для ${source.path}`);
                }
                continue;
            }
            
            const fileData = await response.json();
            
            if (!fileData.download_url) {
                console.log(`Нет download_url для ${source.path}`);
                continue;
            }
            
            console.log(`Найден файл ${source.path}, загружаем...`);
            const fileResponse = await fetch(fileData.download_url, { headers });
            
            if (!fileResponse.ok) {
                console.log(`Не удалось скачать ${source.path}`);
                continue;
            }
            
            const fileContent = await fileResponse.text();
            console.log(`Получено ${fileContent.length} байт из ${source.path}`);
            
            try {
                const treeData = JSON.parse(fileContent);
            
                if (Array.isArray(treeData) && treeData.length > 0) {
                    // Проверяем, есть ли у первого элемента id (базовая валидация)
                    if (treeData[0].id !== undefined) {
                        console.log(`✅ Успешно загружены данные из ${source.path}, элементов: ${treeData.length}`);
                        return treeData;
                    } else if (treeData[0].name !== undefined) {
                        console.log(`⚠️ Данные из ${source.path} не в ожидаемом формате, но это массив объектов`);
                        return treeData;
                    }
                }
                
                console.log(`Данные из ${source.path} не прошли валидацию`);
            } catch (parseError) {
                // Если это JS файл, пробуем извлечь данные
                if (source.path.endsWith('.js')) {
                    console.log('Пробуем извлечь данные из JS файла...');
                    const dataMatch = fileContent.match(/window\.treeData\s*=\s*(\[.*?\]);/s) ||
                                     fileContent.match(/export\s+default\s+(\[.*?\]);/s) ||
                                     fileContent.match(/const\s+treeData\s*=\s*(\[.*?\]);/s);
                    
                    if (dataMatch) {
                        try {
                            const treeData = JSON.parse(dataMatch[1]);
                            console.log(`✅ Данные извлечены из JS файла ${source.path}`);
                            return treeData;
                        } catch (e) {
                            console.log(`Не удалось распарсить данные из JS: ${e.message}`);
                        }
                    }
                }
                console.log(`Ошибка парсинга JSON из ${source.path}:`, parseError.message);
                continue;
            }
            
        } catch (error) {
            console.log(`Ошибка при обработке ${source.path}:`, error.message);
            continue;
        }
    }
    
    console.log('Прямые файлы не найдены, сканируем репозиторий...');
    
    try {
        const repoUrl = `https://api.github.com/repos/${owner}/${repo}/contents/`;
        const response = await fetch(repoUrl, { headers });
        
        if (response.ok) {
            const files = await response.json();
            console.log(`Найдено ${files.length} файлов в репозитории`);
            
            const jsonFiles = files.filter(file => 
                file.type === 'file' &&
                file.name.toLowerCase().endsWith('.json') &&
                !file.name.toLowerCase().includes('package') &&
                !file.name.toLowerCase().includes('config')
            );
            
            console.log(`Найдено JSON файлов: ${jsonFiles.length}`);
            
            for (const file of jsonFiles) {
                try {
                    console.log(`Проверяем файл: ${file.name} (${file.size} байт)`);
                    const fileResponse = await fetch(file.download_url, { headers });
                    const content = await fileResponse.text();
                    
                    try {
                        const data = JSON.parse(content);
                        
                        if (Array.isArray(data) && data.length > 0) {
                            const firstItem = data[0];
                            if (firstItem.id !== undefined || firstItem.name !== undefined) {
                                console.log(`✅ Найден подходящий файл: ${file.name}`);
                                return data;
                            }
                        }
                    } catch (e) {
                        continue;
                    }
                } catch (e) {
                    console.log(`Ошибка загрузки файла ${file.name}:`, e.message);
                    continue;
                }
            }
        } else {
            console.log(`Ошибка при получении списка файлов: ${response.status}`);
        }
    } catch (scanError) {
        console.log('Ошибка при сканировании репозитория:', scanError.message);
    }
    
    throw new Error('Не удалось найти данные дерева в репозитории. Убедитесь, что файл tree-data.json существует в корне репозитория.');
}

async function loadTreeIntoApp(treeData) {
    console.log('Загрузка данных в приложение...', treeData);
    
    if (!treeData || !Array.isArray(treeData)) {
        throw new Error('Некорректные данные дерева: ожидается массив');
    }
    
    try {
        localStorage.setItem('github_loaded_tree', JSON.stringify(treeData));
        localStorage.setItem('tree_source', 'github');
        localStorage.setItem('last_github_load', new Date().toISOString());
        console.log('Данные сохранены в localStorage');
    } catch (e) {
        console.warn('Не удалось сохранить в localStorage:', e.message);
    }
    
    if (window.treeManager) {
        console.log('treeManager доступен, пробуем методы:');
        
        const methods = ['loadTree', 'importFromJSON', 'loadData', 'setTreeData'];
        
        for (const method of methods) {
            if (typeof window.treeManager[method] === 'function') {
                console.log(`Пробуем метод: ${method}`);
                try {
                    window.treeManager[method](treeData);
                    console.log(`✅ Метод ${method} успешно выполнен`);
                    return true;
                } catch (methodError) {
                    console.log(`❌ Метод ${method} вызвал ошибку:`, methodError.message);
                }
            }
        }
        
        console.log('Использую прямое присвоение данных');
        window.treeManager.treeData = treeData;
        
        if (typeof window.treeManager.renderTree === 'function') {
            console.log('Вызываю renderTree()');
            window.treeManager.renderTree();
        } else if (typeof window.treeManager.updateTreeView === 'function') {
            console.log('Вызываю updateTreeView()');
            window.treeManager.updateTreeView();
        } else if (typeof window.treeManager.render === 'function') {
            console.log('Вызываю render()');
            window.treeManager.render();
        }
        
        setTimeout(() => {
            const treeContainer = document.getElementById('tree');
            if (treeContainer && treeContainer.children.length === 0) {
                console.log('Принудительно обновляю дерево');
                treeContainer.innerHTML = '<div class="tree-node">Дерево загружено. Нажмите F5 для обновления.</div>';
            }
        }, 500);
        
        return true;
    } else {
        console.error('treeManager не инициализирован');
        
        const treeContainer = document.getElementById('tree');
        if (treeContainer) {
            treeContainer.innerHTML = '<div class="tree-loading">Дерево загружено, но требуется перезагрузка страницы для полного отображения</div>';
            
            localStorage.setItem('pending_tree_data', JSON.stringify(treeData));
        }
        
        throw new Error('Менеджер дерева не готов. Попробуйте обновить страницу.');
    }
}

function exportTreeToGitHubFormat() {
    if (!window.treeManager || typeof window.treeManager.exportToJSON !== 'function') {
        alert('Ошибка: treeManager не готов к экспорту');
        return;
    }
    
    const treeData = window.treeManager.exportToJSON();
    const jsonString = JSON.stringify(treeData, null, 2);
    
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tree-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('Файл tree-data.json создан. Загрузите его в корень вашего GitHub репозитория.');
}

window.mouseX = 0;
window.mouseY = 0;

document.addEventListener('mousemove', (e) => {
    window.mouseX = e.clientX;
    window.mouseY = e.clientY;
});

window.addEventListener('error', function(e) {
    console.error('Глобальная ошибка:', {
        message: e.message,
        error: e.error,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno
    });
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Необработанное обещание (promise):', e.reason);
});

async function testGitHubAPI() {
    try {
        console.log('Проверка доступности GitHub API...');
        const response = await fetch('https://api.github.com/rate_limit', {
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            console.warn('GitHub API недоступен, статус:', response.status);
            return false;
        }
        
        const data = await response.json();
        console.log('GitHub API лимиты:', {
            осталось: data.rate.remaining,
            лимит: data.rate.limit,
            сброс: new Date(data.rate.reset * 1000).toLocaleTimeString()
        });
        
        if (data.rate.remaining === 0) {
            console.warn('Лимит GitHub API исчерпан!');
            return false;
        }
        
        console.log('GitHub API доступен');
        return true;
    } catch (error) {
        console.warn('GitHub API недоступен:', error.message);
        return false;
    }
}

const style = document.createElement('style');
style.textContent = `
.modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
}

.modal {
    background: var(--controls-bg);
    border-radius: 12px;
    padding: 25px;
    min-width: 400px;
    max-width: 500px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    color: var(--text-color);
    border: 1px solid var(--primary-color);
    animation: modalFadeIn 0.3s ease-out;
}

@keyframes modalFadeIn {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.github-modal h3 {
    margin-top: 0;
    color: var(--accent-color);
    margin-bottom: 20px;
    text-align: center;
}

.modal-content {
    margin: 15px 0;
}

.modal-content input {
    width: 100%;
    padding: 10px;
    margin: 8px 0 15px 0;
    border-radius: 8px;
    border: 1px solid var(--primary-color);
    background: var(--controls-bg);
    color: var(--text-color);
    font-size: 14px;
    transition: border-color 0.3s;
}

.modal-content input:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px rgba(var(--accent-color-rgb), 0.2);
}

.modal-content p {
    font-size: 0.9em;
    color: var(--text-color-secondary);
    margin-bottom: 10px;
}

.tree-loading {
    padding: 20px;
    text-align: center;
    color: var(--accent-color);
    font-weight: bold;
    background: var(--node-bg);
    border-radius: 8px;
    margin: 20px;
    border: 1px solid var(--primary-color);
}
`;
document.head.appendChild(style);

console.log('=== ДЕБАГ ИНФОРМАЦИЯ ===');
console.log('Загруженные скрипты:');
document.querySelectorAll('script').forEach(script => {
    console.log('  -', script.src || 'inline');
});

console.log('Глобальные переменные:');
console.log('  - window.treeManager:', typeof window.treeManager);
console.log('  - window.nodeEffects:', typeof window.nodeEffects);
console.log('  - TreeManager class:', typeof TreeManager);
console.log('  - NodeEffects class:', typeof NodeEffects);

console.log('Элементы управления:');
const controlIds = [
    'loadFromGitHubBtn',
    'githubModalBackdrop',
    'githubOwner',
    'githubRepo',
    'githubLoadBtn',
    'githubCancelBtn'
];

controlIds.forEach(id => {
    const element = document.getElementById(id);
    console.log(`  - ${id}:`, element ? 'НАЙДЕН' : 'НЕ НАЙДЕН');
});

console.log('=== КОНЕЦ ДЕБАГ ИНФОРМАЦИИ ===');
