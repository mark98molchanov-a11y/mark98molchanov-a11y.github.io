
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
    
    async function testGitHubConnection() {
        console.log('🚀 Автоматический тест соединения с GitHub...');
        
        const testOwner = 'mark98molchanov-a11y';
        const testRepo = 'mark98molchanov-a11y.github.io';
        
        console.log(`Тестируем репозиторий: ${testOwner}/${testRepo}`);
        
        const testUrls = [
            { 
                url: `https://api.github.com/repos/${testOwner}/${testRepo}`,
                name: 'GitHub API - репозиторий'
            },
            { 
                url: `https://api.github.com/repos/${testOwner}/${testRepo}/contents/`,
                name: 'GitHub API - содержимое'
            },
            { 
                url: `https://api.github.com/repos/${testOwner}/${testRepo}/contents/tree-data.json`,
                name: 'GitHub API - tree-data.json'
            },
            { 
                url: `https://raw.githubusercontent.com/${testOwner}/${testRepo}/main/tree-data.json`,
                name: 'Raw GitHub - main branch'
            },
            { 
                url: `https://raw.githubusercontent.com/${testOwner}/${testRepo}/master/tree-data.json`,
                name: 'Raw GitHub - master branch'
            },
            { 
                url: `https://${testOwner}.github.io/tree-data.json`,
                name: 'GitHub Pages'
            },
            { 
                url: `https://${testOwner}.github.io/${testRepo}/tree-data.json`,
                name: 'GitHub Pages с репозиторием'
            }
        ];
        
        let anySuccess = false;
        
        for (const test of testUrls) {
            try {
                console.log(`Тестируем: ${test.name}`);
                console.log(`URL: ${test.url}`);
                
                const response = await fetch(test.url);
                console.log(`Статус: ${response.status} ${response.statusText}`);
                
                if (response.ok) {
                    anySuccess = true;

                    if (test.name.includes('API')) {
                        try {
                            const data = await response.json();
                            console.log('✅ Успешно! Данные получены');
                            
                            if (test.name.includes('tree-data.json')) {
                                console.log('🎯 Найден файл tree-data.json!');
                                console.log('Размер файла:', data.size, 'байт');
                                console.log('SHA:', data.sha.substring(0, 8) + '...');
                                
                                if (githubOwnerInput && githubRepoInput) {
                                    githubOwnerInput.value = testOwner;
                                    githubRepoInput.value = testRepo;
                                    console.log('Форма автозаполнена');
                                }
                            }
                        } catch (jsonError) {
                            console.log('✅ Успешно, но не JSON ответ');
                        }
                    } else {
                        try {
                            const content = await response.text();
                            console.log(`✅ Успешно! Получено ${content.length} байт`);
                            
                            if (content.length < 5000) {
                                console.log('Первые 200 символов:', content.substring(0, 200));
                            }
                            
                            try {
                                const jsonData = JSON.parse(content);
                                console.log('✅ Это валидный JSON!');
                                console.log('Тип данных:', Array.isArray(jsonData) ? 'Массив' : 'Объект');
                                if (Array.isArray(jsonData)) {
                                    console.log('Количество элементов:', jsonData.length);
                                }
                            } catch (parseError) {
                                console.log('⚠️ Это не валидный JSON');
                            }
                        } catch (textError) {
                            console.log('✅ Успешно, но не удалось прочитать содержимое');
                        }
                    }
                } else if (response.status === 404) {
                    console.log('❌ Не найдено (404)');
                } else if (response.status === 403) {
                    console.log('⚠️ Доступ запрещен (403) - возможно лимит API');
                } else {
                    console.log(`⚠️ Ошибка: ${response.status}`);
                }
            } catch (error) {
                console.log(`❌ Сетевая ошибка: ${error.message}`);
            }
            console.log('---');
        }
        
        if (anySuccess) {
            console.log('🎉 Некоторые URL работают! GitHub доступен.');
        } else {
            console.warn('⚠️ Все тесты не прошли. Проверьте:');
            console.warn('1. Существует ли репозиторий');
            console.warn('2. Есть ли файл tree-data.json');
            console.warn('3. Нет ли проблем с CORS или сетью');
        }
        
        return anySuccess;
    }
    
    setTimeout(() => {
        testGitHubConnection().then(success => {
            if (success) {
                console.log('✅ GitHub соединение проверено, форма готова к использованию');
            } else {
                console.warn('⚠️ GitHub недоступен, функция загрузки может не работать');
            }
        });
    }, 1000);
    
    loadFromGitHubBtn.addEventListener('click', function() {
        console.log('✅ Кнопка "Загрузить из GitHub" НАЖАТА!');
        
        if (githubOwnerInput) {
            githubOwnerInput.value = githubOwnerInput.value || 'mark98molchanov-a11y';
        }
        if (githubRepoInput) {
            const repoValue = githubRepoInput.value || 'mark98molchanov-a11y.github.io';
            githubRepoInput.value = repoValue.replace(/\/$/, '');
        }
        if (githubTokenInput) {
            githubTokenInput.value = githubTokenInput.value || '';
        }
        
        if (githubModalBackdrop) {
            githubModalBackdrop.style.display = 'flex';
            console.log('Модальное окно открыто');
            
            if (githubOwnerInput) {
                githubOwnerInput.focus();
                githubOwnerInput.select();
            }
        } else {
            console.error('Модальное окно не найдено!');
            alert('Ошибка: модальное окно не найдено');
        }
    });
    
    if (githubCancelBtn) {
        githubCancelBtn.addEventListener('click', () => {
            if (githubModalBackdrop) {
                githubModalBackdrop.style.display = 'none';
                console.log('Модальное окно закрыто');
            }
        });
    }

    if (githubModalBackdrop) {
        githubModalBackdrop.addEventListener('click', (e) => {
            if (e.target === githubModalBackdrop) {
                githubModalBackdrop.style.display = 'none';
                console.log('Модальное окно закрыто (клик по фону)');
            }
        });
    }
    
    if (githubLoadBtn) {
        githubLoadBtn.addEventListener('click', async () => {
            console.log('🔄 Кнопка загрузки в модальном окне нажата');
            
            const owner = githubOwnerInput ? githubOwnerInput.value.trim() : '';
            const repo = githubRepoInput ? githubRepoInput.value.trim() : '';
            const token = githubTokenInput ? githubTokenInput.value.trim() : '';
            
            const cleanRepo = repo.replace('.github.io', '').replace(/\/$/, '');
            
            console.log(`Параметры загрузки:`);
            console.log(`- Владелец: ${owner}`);
            console.log(`- Репозиторий: ${repo} (очищенный: ${cleanRepo})`);
            console.log(`- Токен: ${token ? 'есть' : 'нет'}`);
            
            if (!owner) {
                alert('Введите имя владельца репозитория (например: mark98molchanov-a11y)');
                if (githubOwnerInput) githubOwnerInput.focus();
                return;
            }
            
            if (!repo) {
                alert('Введите название репозитория (например: mark98molchanov-a11y.github.io)');
                if (githubRepoInput) githubRepoInput.focus();
                return;
            }
            
            const originalText = githubLoadBtn.textContent;
            const originalDisabled = githubLoadBtn.disabled;
            
            githubLoadBtn.textContent = 'Загрузка...';
            githubLoadBtn.disabled = true;
            
            try {
                console.log(`Начинаем загрузку из GitHub: ${owner}/${repo}`);
                
                const repoVariants = [
                    repo,
                    cleanRepo,
                    `${cleanRepo}.github.io`,
                    repo.includes('.github.io') ? repo : `${repo}.github.io`
                ];
                
                let treeData = null;
                let lastError = null;
                
                for (const repoVariant of repoVariants) {
                    if (repoVariant) {
                        console.log(`Пробуем вариант репозитория: ${repoVariant}`);
                        try {
                            treeData = await loadTreeFromGitHub(owner, repoVariant, token);
                            if (treeData) {
                                console.log(`✅ Успешно загружено с репозиторием: ${repoVariant}`);
                                break;
                            }
                        } catch (error) {
                            console.log(`❌ Ошибка для ${repoVariant}:`, error.message);
                            lastError = error;
                            continue;
                        }
                    }
                }
                
                if (treeData) {
                    console.log('Данные получены, загружаем в приложение...');
                    await loadTreeIntoApp(treeData);
                    
                    if (githubModalBackdrop) {
                        githubModalBackdrop.style.display = 'none';
                    }
                    
                    alert(`✅ Дерево успешно загружено из GitHub!\n\nЗагружено ${treeData.length} элементов`);
                    
                    // Сохраняем успешные параметры для будущего использования
                    localStorage.setItem('last_github_owner', owner);
                    localStorage.setItem('last_github_repo', repo);
                    
                } else {
                    console.error('Не удалось загрузить данные со всех вариантов');
                    alert(`⚠️ Не удалось найти данные дерева в репозитории.\n\nПроверьте:\n1. Существует ли репозиторий ${owner}/${repo}\n2. Есть ли файл tree-data.json в корне\n3. Репозиторий публичный\n\nПоследняя ошибка: ${lastError ? lastError.message : 'Неизвестно'}`);
                }
            } catch (error) {
                console.error('❌ Критическая ошибка загрузки из GitHub:', error);
                alert(`❌ Ошибка загрузки:\n\n${error.message}\n\nПроверьте консоль для деталей.`);
            } finally {
                // Восстанавливаем кнопку
                githubLoadBtn.textContent = originalText;
                githubLoadBtn.disabled = originalDisabled;
            }
        });
    }
    
    const inputs = [githubOwnerInput, githubRepoInput, githubTokenInput].filter(Boolean);
    inputs.forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && githubLoadBtn) {
                console.log('Enter нажат в поле ввода, запускаем загрузку...');
                githubLoadBtn.click();
            }
        });
    });
    
    try {
        const lastOwner = localStorage.getItem('last_github_owner');
        const lastRepo = localStorage.getItem('last_github_repo');
        
        if (lastOwner && githubOwnerInput) {
            githubOwnerInput.value = lastOwner;
        }
        if (lastRepo && githubRepoInput) {
            githubRepoInput.value = lastRepo;
        }
        
        if (lastOwner || lastRepo) {
            console.log('Восстановлены предыдущие значения из localStorage');
        }
    } catch (e) {
        console.log('Не удалось восстановить значения из localStorage:', e.message);
    }
    
    console.log('✅ GitHub загрузчик полностью настроен');
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
    
    const directUrls = [
        `https://${owner}.github.io/${repo.includes('.github.io') ? '' : repo + '/'}tree-data.json`,
        `https://raw.githubusercontent.com/${owner}/${repo}/main/tree-data.json`,
        `https://raw.githubusercontent.com/${owner}/${repo}/master/tree-data.json`,
        `https://${owner}.github.io/tree-data.json`,
        `https://${owner}.github.io/${repo}/tree-data.json`
    ];
    
    console.log('Пробуем прямые URL:');
    for (const url of directUrls) {
        try {
            console.log(`Пробуем: ${url}`);
            const response = await fetch(url, { headers });
            
            if (response.ok) {
                const fileContent = await response.text();
                console.log(`✅ Файл найден по прямому URL: ${url}`);
                
                try {
                    const treeData = JSON.parse(fileContent);
                    if (Array.isArray(treeData) && treeData.length > 0) {
                        console.log(`Успешно загружено ${treeData.length} элементов`);
                        return treeData;
                    }
                } catch (parseError) {
                    console.log('Ошибка парсинга:', parseError.message);
                }
            } else {
                console.log(`❌ Не найден (${response.status}): ${url}`);
            }
        } catch (error) {
            console.log(`Ошибка при загрузке ${url}:`, error.message);
        }
    }
    
    console.log('Прямые URL не сработали, пробуем через GitHub API...');
    
    const sources = [
        { path: 'tree-data.json', description: 'Основной файл данных' },
        { path: 'tree_data.json', description: 'Альтернативное имя' },
        { path: 'tree.json', description: 'Корневой JSON' },
        { path: 'data.json', description: 'Общий файл данных' },
        { path: 'data/tree-data.json', description: 'В папке data' },
        { path: 'app/tree-data.json', description: 'В папке app' },
        { path: 'js/tree-data.json', description: 'В папке js' }
    ];
    
    for (const source of sources) {
        try {
            console.log(`Пробуем через API: ${source.path}`);
            
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${source.path}`;
            console.log(`API запрос: ${apiUrl}`);
            
            const response = await fetch(apiUrl, { headers });
            
            if (response.ok) {
                const fileData = await response.json();
                console.log(`✅ Файл найден через API: ${source.path}`);
                
                if (!fileData.download_url) {
                    console.log('Нет download_url');
                    continue;
                }
                
                console.log(`Скачиваем из: ${fileData.download_url}`);
                const fileResponse = await fetch(fileData.download_url, { headers });
                
                if (!fileResponse.ok) {
                    console.log('Ошибка скачивания');
                    continue;
                }
                
                const fileContent = await fileResponse.text();
                console.log(`Получено ${fileContent.length} байт`);
                
                try {
                    const treeData = JSON.parse(fileContent);
                    
                    if (Array.isArray(treeData) && treeData.length > 0) {
                        console.log(`✅ Успешно загружены данные, элементов: ${treeData.length}`);
                        return treeData;
                    } else {
                        console.log('Данные не прошли валидацию (не массив или пустой)');
                    }
                } catch (parseError) {
                    console.log('Ошибка парсинга JSON:', parseError.message);
                }
            } else {
                console.log(`Файл не найден (${response.status}): ${source.path}`);
            }
        } catch (error) {
            console.log(`Ошибка при обработке ${source.path}:`, error.message);
        }
    }
    
    try {
        console.log('Пробуем получить список всех файлов в репозитории...');
        const repoUrl = `https://api.github.com/repos/${owner}/${repo}/contents/`;
        const response = await fetch(repoUrl, { headers });
        
        if (response.ok) {
            const files = await response.json();
            console.log(`Найдено ${files.length} файлов/папок в репозитории:`);
            
            files.forEach(file => {
                console.log(`  - ${file.name} (${file.type})`);
            });
            
            // Ищем JSON файлы
            const jsonFiles = files.filter(file => 
                file.type === 'file' && 
                file.name.toLowerCase().endsWith('.json')
            );
            
            console.log(`Найдено JSON файлов: ${jsonFiles.length}`);
            
            for (const file of jsonFiles) {
                try {
                    console.log(`Проверяем JSON файл: ${file.name}`);
                    const fileResponse = await fetch(file.download_url, { headers });
                    const content = await fileResponse.text();
                    
                    try {
                        const data = JSON.parse(content);
                        if (Array.isArray(data) && data.length > 0) {
                            console.log(`✅ Найден подходящий файл: ${file.name} с ${data.length} элементами`);
                            return data;
                        }
                    } catch (e) {
                        console.log(`Файл ${file.name} не валидный JSON`);
                    }
                } catch (e) {
                    console.log(`Ошибка загрузки файла ${file.name}:`, e.message);
                }
            }
        }
    } catch (scanError) {
        console.log('Ошибка при сканировании репозитория:', scanError.message);
    }
    
    console.error('ВСЕ ПОПЫТКИ НЕ УДАЛИСЬ!');
    console.log('Проверьте:');
    console.log('1. Существует ли репозиторий: https://github.com/' + owner + '/' + repo);
    console.log('2. Есть ли файл tree-data.json в корне репозитория');
    console.log('3. Репозиторий публичный (для приватных нужен токен)');
    
    throw new Error(`Не удалось найти данные дерева в репозитории ${owner}/${repo}. Убедитесь, что файл tree-data.json существует в корне репозитория.`);
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
