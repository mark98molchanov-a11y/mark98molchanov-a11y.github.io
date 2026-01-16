
class GitHubLoader {
    constructor(options = {}) {
        this.owner = options.owner || 'mark98molchanov-a11y';
        this.repo = options.repo || 'mark98molchanov-a11y.github.io';
        this.branch = options.branch || 'main';
        this.token = options.token || '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'; 
        this.dataFile = options.dataFile || 'tree-data.json';
    }

    async loadTreeData() {
        try {
            const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.dataFile}?ref=${this.branch}`;
            
            const headers = {};
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }

            const response = await fetch(url, { headers });
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const data = await response.json();
            
            const content = atob(data.content);
            return JSON.parse(content);
            
        } catch (error) {
            console.error('Error loading data from GitHub:', error);
            return null;
        }
    }

    async saveTreeData(treeData) {
        try {
            const getUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.dataFile}?ref=${this.branch}`;
            
            let currentSha = null;
            try {
                const getResponse = await fetch(getUrl, {
                    headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {}
                });
                if (getResponse.ok) {
                    const data = await getResponse.json();
                    currentSha = data.sha;
                }
            } catch (e) {
                console.log('File may not exist, will create new');
            }

            const content = btoa(JSON.stringify(treeData, null, 2));
            
            const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.dataFile}`;
            
            const body = {
                message: 'Update tree data via web interface',
                content: content,
                branch: this.branch
            };
            
            if (currentSha) {
                body.sha = currentSha;
            }

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {})
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API error: ${errorData.message || response.status}`);
            }

            return true;
            
        } catch (error) {
            console.error('Error saving data to GitHub:', error);
            return false;
        }
    }
}
window.githubLoader = new GitHubLoader({
    owner: 'mark98molchanov-a11y',
    repo: 'mark98molchanov-a11y.github.io',
    branch: 'main'
     token: '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'
});

document.addEventListener('DOMContentLoaded', async () => {
    window.nodeEffects = new NodeEffects();
    window.treeManager = new TreeManager();
    
    try {
        console.log('Loading data from GitHub...');
        const treeData = await window.githubLoader.loadTreeData();
        
        if (treeData && Array.isArray(treeData)) {
            console.log('Data loaded from GitHub successfully', treeData.length, 'nodes');
            // Инициализируем treeManager с данными из GitHub
            window.treeManager.init(treeData);
        } else {
            console.log('No data from GitHub, loading from local or creating new');
            // Если нет данных в GitHub, создаем пустую структуру
            window.treeManager.init();
        }
    } catch (error) {
        console.error('Failed to load from GitHub, using local:', error);
        window.treeManager.init();
    }
    setTimeout(() => {
        setupGitHubControls();
    }, 100);
    
    setupIframeCommunication();
});

function setupGitHubControls() {
    const githubControls = document.createElement('div');
    githubControls.className = 'github-controls';
    githubControls.style.cssText = `
        margin: 10px; 
        padding: 10px; 
        background: var(--controls-bg, #f5f5f5); 
        border-radius: 5px; 
        border: 1px solid var(--primary-color, #ccc);
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    `;
    
    githubControls.innerHTML = `
        <h3 style="margin: 0; font-size: 14px;">GitHub Синхронизация</h3>
        <button id="loadFromGitHub" style="margin: 0; padding: 8px 15px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">↻ Загрузить из GitHub</button>
        <button id="saveToGitHub" style="margin: 0; padding: 8px 15px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">💾 Сохранить в GitHub</button>
        <div id="githubStatus" style="margin: 0; font-size: 12px; color: #666;"></div>
    `;
    
    const controls = document.getElementById('controls');
    if (controls) {
        controls.appendChild(githubControls);
    } else {
        document.body.appendChild(githubControls);
    }
    
    document.getElementById('loadFromGitHub').addEventListener('click', async function() {
        const statusDiv = document.getElementById('githubStatus');
        statusDiv.textContent = 'Загрузка данных из GitHub...';
        statusDiv.style.color = 'blue';
        
        const treeData = await window.githubLoader.loadTreeData();
        
        if (treeData && Array.isArray(treeData)) {
            if (window.treeManager && window.treeManager.loadTree) {
                window.treeManager.loadTree(treeData);
                statusDiv.textContent = '✅ Данные успешно загружены из GitHub';
                statusDiv.style.color = 'green';
                
                if (window.IFRAME_MODE && window.parent !== window) {
                    window.parent.postMessage({
                        type: 'TREE_LOADED',
                        height: document.body.scrollHeight
                    }, '*');
                }
            } else {
                console.log('Loaded data from GitHub:', treeData);
                statusDiv.textContent = '✅ Данные загружены (нет функции отображения)';
                statusDiv.style.color = 'orange';
            }
        } else {
            statusDiv.textContent = '❌ Ошибка загрузки данных из GitHub';
            statusDiv.style.color = 'red';
        }
        
        setTimeout(() => {
            statusDiv.textContent = '';
        }, 3000);
    });
    
    document.getElementById('saveToGitHub').addEventListener('click', async function() {
        const statusDiv = document.getElementById('githubStatus');
        statusDiv.textContent = 'Сохранение данных в GitHub...';
        statusDiv.style.color = 'blue';
        
        let treeData = [];
        if (window.treeManager && window.treeManager.exportToJSON) {
            treeData = window.treeManager.exportToJSON();
        } else if (window.treeManager && window.treeManager.getTreeData) {
            treeData = window.treeManager.getTreeData();
        } else {
            // Попробуем получить из localStorage
            treeData = JSON.parse(localStorage.getItem('treeData') || '[]');
        }
        
        if (!treeData || treeData.length === 0) {
            statusDiv.textContent = '❌ Нет данных для сохранения';
            statusDiv.style.color = 'red';
            setTimeout(() => {
                statusDiv.textContent = '';
            }, 3000);
            return;
        }
        
        const success = await window.githubLoader.saveTreeData(treeData);
        
        if (success) {
            statusDiv.textContent = '✅ Данные успешно сохранены в GitHub';
            statusDiv.style.color = 'green';
        } else {
            statusDiv.textContent = '❌ Ошибка сохранения данных в GitHub';
            statusDiv.style.color = 'red';
        }
        
        setTimeout(() => {
            statusDiv.textContent = '';
        }, 3000);
    });
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
