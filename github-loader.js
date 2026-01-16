// github-loader.js
class GitHubLoader {
    constructor(options = {}) {
        this.owner = options.owner || 'mark98molchanov-a11y';
        this.repo = options.repo || 'mark98molchanov-a11y.github.io';
        this.branch = options.branch || 'main';
        this.token = options.token || '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';
        this.dataFile = 'tree-data.json';
        this.rawBase = 'https://raw.githubusercontent.com';
        this.apiBase = 'https://api.github.com';
    }

    async loadTreeData() {
        console.log('🚀 Загрузка из GitHub...');
        
        const rawUrl = `${this.rawBase}/${this.owner}/${this.repo}/${this.branch}/${this.dataFile}`;
        
        try {
            console.log('📡 Пробую:', rawUrl);
            const response = await fetch(rawUrl, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            
            console.log('📊 Статус:', response.status, response.statusText);
            
            if (response.status === 404) {
                console.warn('⚠️ Файл не найден. Нужно создать tree-data.json в GitHub');
                return this.createDefaultData();
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const text = await response.text();
            console.log('✅ Получено:', text.length, 'символов');
            
            try {
                const data = JSON.parse(text);
                console.log(`✅ JSON валиден, ${data.length} элементов`);
                return data;
            } catch (jsonError) {
                console.error('❌ Ошибка JSON:', jsonError.message);
                // Пробуем починить
                const fixed = this.tryFixJSON(text);
                return JSON.parse(fixed);
            }
            
        } catch (error) {
            console.error('❌ Raw GitHub ошибка:', error.message);
            return this.createDefaultData();
        }
    }

    tryFixJSON(text) {
        console.log('🔧 Пытаюсь исправить JSON...');
        return text
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
            .replace(/[\x00-\x1F\x7F]/g, '');
    }

    createDefaultData() {
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
            console.warn('⚠️ Токен GitHub не указан. Не могу сохранить.');
            return false;
        }
        
        try {
            const url = `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.dataFile}`;
            
            // Получаем текущий SHA
            let sha = null;
            const headers = {
                'Authorization': `Bearer ${this.token}`,
                'Accept': 'application/vnd.github.v3+json'
            };
            
            try {
                const getResponse = await fetch(`${url}?ref=${this.branch}`, { headers });
                if (getResponse.ok) {
                    const data = await getResponse.json();
                    sha = data.sha;
                }
            } catch (e) {
                console.log('📝 Файл не существует, создаем новый');
            }
            
            // Подготавливаем данные
            const content = btoa(JSON.stringify(treeData, null, 2));
            const body = {
                message: `Обновление от ${new Date().toISOString()}`,
                content: content,
                branch: this.branch
            };
            
            if (sha) body.sha = sha;
            
            headers['Content-Type'] = 'application/json';
            
            console.log('📤 Отправка...');
            const response = await fetch(url, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ GitHub API ошибка:', response.status, errorText);
                return false;
            }
            
            console.log('✅ Успешно сохранено в GitHub!');
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
            return false;
        }
    }
}

if (typeof window !== 'undefined') {
    window.GitHubLoader = GitHubLoader;
}
