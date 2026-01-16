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
        
        console.log('📡 URL:', rawUrl);
        
        try {
            const response = await fetch(rawUrl);
            console.log('📊 Статус:', response.status);
            
            if (response.status === 404) {
                console.warn('⚠️ Файл не найден в GitHub');
                return this.getDefaultData();
            }
            
            if (!response.ok) {
                throw new Error(`Ошибка HTTP ${response.status}`);
            }
            
            const text = await response.text();
            console.log('✅ Данные получены, длина:', text.length, 'символов');
            
            // Проверяем валидность JSON
            let data;
            try {
                data = JSON.parse(text);
            } catch (jsonError) {
                console.error('❌ Ошибка парсинга JSON:', jsonError.message);
                console.log('Проблемный участок:', text.substring(jsonError.message.match(/position (\d+)/)?.[1] - 50 || 0, 100));
                
                // Пробуем починить JSON если есть очевидные ошибки
                const fixedText = this.tryFixJSON(text);
                try {
                    data = JSON.parse(fixedText);
                    console.log('✅ JSON исправлен автоматически');
                } catch (fixedError) {
                    console.error('❌ Не удалось исправить JSON');
                    return this.getDefaultData();
                }
            }
            
            console.log(`✅ Успешно! Загружено ${data.length} элементов`);
            return data;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки:', error.message);
            return this.getDefaultData();
        }
    }

    tryFixJSON(text) {
        let fixed = text
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']')
            .replace(/([^\\])"/g, '$1"')
            .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        return fixed;
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
        
        try {
            localStorage.setItem('treeData_backup', JSON.stringify(treeData, null, 2));
            console.log('✅ Локальная резервная копия создана');
        } catch (e) {
            console.warn('⚠️ Не удалось сохранить локально:', e.message);
        }
        
        if (!this.token) {
            console.warn('⚠️ Токен GitHub не указан. Для сохранения в GitHub создайте токен.');
            console.log('📝 Инструкция: GitHub → Settings → Developer settings → Personal access tokens → Generate (classic)');
            console.log('📝 Scope: repo');
            return false;
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
                    console.log('📝 Найден существующий файл, SHA:', sha);
                }
            } catch (e) {
                console.log('📝 Файл не существует, создаем новый');
            }
            
            const content = btoa(JSON.stringify(treeData, null, 2));
            const body = {
                message: `Обновление от ${new Date().toLocaleString('ru-RU')}`,
                content: content,
                branch: this.branch
            };
            
            if (sha) {
                body.sha = sha;
            }
            
            console.log('📤 Отправка в GitHub...');
            const response = await fetch(url, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Ошибка GitHub API:', response.status, errorText);
                return false;
            }
            
            console.log('✅ Успешно сохранено в GitHub!');
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error.message);
            return false;
        }
    }
}

if (typeof window !== 'undefined') {
    window.GitHubLoader = GitHubLoader;
}
