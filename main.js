document.addEventListener('DOMContentLoaded', () => {
    window.nodeEffects = new NodeEffects();
    window.treeManager = new TreeManager();
    window.treeManager.init();
    setupIframeCommunication();
    setupGitHubLoader(); 
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
    const loadFromGitHubBtn = document.getElementById('loadFromGitHubBtn');
    const githubModalBackdrop = document.getElementById('githubModalBackdrop');
    const githubOwnerInput = document.getElementById('githubOwner');
    const githubRepoInput = document.getElementById('githubRepo');
    const githubTokenInput = document.getElementById('githubToken');
    const githubLoadBtn = document.getElementById('githubLoadBtn');
    const githubCancelBtn = document.getElementById('githubCancelBtn');
    
    if (!loadFromGitHubBtn) return;
    
    loadFromGitHubBtn.addEventListener('click', () => {
        githubOwnerInput.value = 'mark98molchanov-a11y';
        githubRepoInput.value = 'mark98molchanov-a11y.github.io';
        githubTokenInput.value = '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';
        
        githubModalBackdrop.style.display = 'flex';
        githubOwnerInput.focus();
    });
    
    githubCancelBtn.addEventListener('click', () => {
        githubModalBackdrop.style.display = 'none';
        githubOwnerInput.value = '';
        githubRepoInput.value = '';
        githubTokenInput.value = '';
    });
    
    githubLoadBtn.addEventListener('click', async () => {
        const owner = githubOwnerInput.value.trim();
        const repo = githubRepoInput.value.trim();
        const token = githubTokenInput.value.trim();
        
        if (!owner || !repo) {
            alert('Введите владельца и название репозитория');
            return;
        }
        
        githubLoadBtn.textContent = 'Загрузка...';
        githubLoadBtn.disabled = true;
        
        try {
            const treeData = await loadTreeFromGitHub(owner, repo, token);
            
            if (treeData) {
                loadTreeIntoApp(treeData);
                githubModalBackdrop.style.display = 'none';
                alert('Дерево успешно загружено из GitHub!');
            } else {
                alert('Не удалось найти данные дерева в репозитории');
            }
        } catch (error) {
            console.error('Ошибка загрузки из GitHub:', error);
            alert('Ошибка загрузки: ' + error.message);
        } finally {
            githubLoadBtn.textContent = 'Загрузить';
            githubLoadBtn.disabled = false;
        }
    });
}

async function loadTreeFromGitHub(owner, repo, token) {
    const headers = {
        'Accept': 'application/vnd.github.v3+json'
    };
    
    if (token) {
        headers['Authorization'] = `token ${token}`;
    }
    
    const sources = [
        { path: 'tree-data.json', type: 'json' },
        { path: 'tree_data.json', type: 'json' },
        { path: 'data/tree.json', type: 'json' },
        { path: 'exported-tree.json', type: 'json' },
        { path: 'main.js', type: 'js' },
        { path: 'tree-manager-core.js', type: 'js' }
    ];
    
    for (const source of sources) {
        try {
            console.log(`Пробуем загрузить: ${source.path}`);
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${source.path}`, { headers });
            
            if (response.ok) {
                const fileData = await response.json();
                const downloadUrl = fileData.download_url;
                
                const fileResponse = await fetch(downloadUrl, { headers });
                const fileContent = await fileResponse.text();
                
                if (source.type === 'json') {
                    const treeData = JSON.parse(fileContent);
                    return treeData;
                } else if (source.type === 'js') {
                    const treeDataMatch = fileContent.match(/window\.treeData\s*=\s*(\[.*?\]);/s);
                    if (treeDataMatch) {
                        return JSON.parse(treeDataMatch[1]);
                    }
                    
                    const exportMatch = fileContent.match(/exportToJSON\(\)\s*{\s*return\s*(\[.*?\]);/s);
                    if (exportMatch) {
                        return JSON.parse(exportMatch[1]);
                    }
                    
                    const treeManagerMatch = fileContent.match(/this\.treeData\s*=\s*(\[.*?\]);/s);
                    if (treeManagerMatch) {
                        return JSON.parse(treeManagerMatch[1]);
                    }
                }
            }
        } catch (error) {
            console.log(`Файл ${source.path} не найден или невалиден:`, error.message);
            continue;
        }
    }
    
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/`, { headers });
        if (response.ok) {
            const files = await response.json();
            
            const dataFiles = files.filter(file => 
                file.name.includes('tree') || 
                file.name.includes('data') || 
                file.name.endsWith('.json')
            );
            
            for (const file of dataFiles) {
                try {
                    const fileResponse = await fetch(file.download_url, { headers });
                    const content = await fileResponse.text();
                    
                    try {
                        const data = JSON.parse(content);
                        if (Array.isArray(data) && data.length > 0 && data[0].id) {
                            return data;
                        }
                    } catch (e) {
                        // Не JSON, пропускаем
                    }
                } catch (e) {
                    continue;
                }
            }
        }
    } catch (error) {
        console.log('Не удалось просканировать репозиторий:', error.message);
    }
    
    throw new Error('Данные дерева не найдены в репозитории');
}

function loadTreeIntoApp(treeData) {
    if (!treeData || !Array.isArray(treeData)) {
        throw new Error('Некорректные данные дерева');
    }
    
    if (window.treeManager && typeof window.treeManager.loadTree === 'function') {
        window.treeManager.loadTree(treeData);
    } else if (window.treeManager && typeof window.treeManager.importFromJSON === 'function') {
        window.treeManager.importFromJSON(treeData);
    } else {
        console.log('Загружаем дерево через прямой доступ');
        
        const treeContainer = document.getElementById('tree');
        if (treeContainer) {
            treeContainer.innerHTML = '';
        }
        
        window.treeManager.treeData = treeData;
        window.treeManager.currentNodeId = treeData[0]?.id || 1;
        
        if (typeof window.treeManager.renderTree === 'function') {
            window.treeManager.renderTree();
        }
        
        localStorage.setItem('github_loaded_tree', JSON.stringify(treeData));
        localStorage.setItem('tree_source', 'github');
    }
    
    if (typeof updateTreeView === 'function') {
        updateTreeView();
    }
}

function exportTreeToGitHubFormat() {
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
}

.modal {
    background: var(--controls-bg);
    border-radius: 12px;
    padding: 20px;
    min-width: 400px;
    max-width: 500px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    color: var(--text-color);
}

.github-modal h3 {
    margin-top: 0;
    color: var(--accent-color);
}

.modal-content {
    margin: 15px 0;
}
`;
document.head.appendChild(style);
