// github-loader.js
class GitHubLoader {
    constructor(options = {}) {
        this.owner = options.owner || 'mark98molchanov-a11y';
        this.repo = options.repo || 'mark98molchanov-a11y.github.io';
        this.branch = options.branch || 'main';
        this.token = options.token || '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';
        this.dataFile = 'tree-data.json';
    }

    async loadTreeData() {
        console.log('🚀 Загрузка данных из GitHub...');
        
        const rawUrl = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${this.dataFile}`;
        
        console.log('📡 Запрашиваю URL:', rawUrl);
        
        try {
            const response = await fetch(rawUrl);
            console.log('📊 Статус ответа:', response.status, response.statusText);
            
            if (response.status === 404) {
                console.warn('⚠️ Файл не найден в GitHub. Нужно создать tree-data.json');
                return this.getDefaultData();
            }
            
            if (!response.ok) {
                throw new Error(`Ошибка HTTP ${response.status}`);
            }
            
            const text = await response.text();
            console.log('✅ Данные получены, длина:', text.length, 'символов');
            
            const data = JSON.parse(text);
            console.log(`✅ Успешно! Загружено ${data.length} элементов`);
            
            return data;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки из GitHub:', error.message);
            console.log('🔄 Использую локальные данные...');
            return this.getDefaultData();
        }
    }

    getDefaultData() {
        return [
            {
                "id": "root",
                "name": "Департамент имущественных отношений",
                "title": "Ямало-Ненецкого автономного округа",
                "children": [
                    {
                        "id": "head",
                        "name": "Голова Ирина Витальевна",
                        "title": "Руководитель департамента",
                        "children": []
                    }
                ]
            }
        ];
    }

    async saveTreeData(treeData) {
        console.log('💾 Сохранение в GitHub...');
        
        if (!this.token) {
            console.warn('⚠️ Токен GitHub не указан. Сохранение невозможно.');
            console.log('📝 Сохраняю локально в localStorage...');
            
            try {
                localStorage.setItem('treeData_backup', JSON.stringify(treeData));
                console.log('✅ Данные сохранены локально (резервная копия)');
                return true;
            } catch (error) {
                console.error('❌ Ошибка локального сохранения:', error);
                return false;
            }
        }
        
        try {
            const url = `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${this.dataFile}`;
            
            const headers = {
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            };
            
            let sha = null;
            try {
                const getResponse = await fetch(`${url}?ref=${this.branch}`, { headers });
                if (getResponse.ok) {
                    const data = await getResponse.json();
                    sha = data.sha;
                }
            } catch (e) {
                console.log('Файл не существует, создаем новый');
            }
            
            const content = btoa(JSON.stringify(treeData, null, 2));
            const body = {
                message: `Обновление дерева от ${new Date().toLocaleString('ru-RU')}`,
                content: content,
                branch: this.branch
            };
            
            if (sha) {
                body.sha = sha;
            }
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                throw new Error(`Ошибка GitHub API: ${response.status}`);
            }
            
            console.log('✅ Успешно сохранено в GitHub!');
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка сохранения в GitHub:', error);
            return false;
        }
    }
}

if (typeof window !== 'undefined') {
    window.GitHubLoader = GitHubLoader;
}
