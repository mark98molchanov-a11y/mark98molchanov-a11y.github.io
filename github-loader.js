
class GitHubLoader {
    constructor(options = {}) {
        this.owner = options.owner || 'mark98molchanov-a11y';
        this.repo = options.repo || 'mark98molchanov-a11y.github.io';
        this.branch = options.branch || 'main';
        this.token = options.token || ''; 
        this.dataFile = options.dataFile || 'tree-data.json';
        this.apiBase = 'https://api.github.com';
    }

    async loadTreeData() {
        try {
            console.log(`Loading tree data from GitHub: ${this.owner}/${this.repo}/${this.dataFile}`);
            
            const url = `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.dataFile}?ref=${this.branch}`;
            
            const headers = {
                'Accept': 'application/vnd.github.v3+json'
            };
            
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }
            
            console.log('Fetching from:', url);
            const response = await fetch(url, { headers });
            
            if (response.status === 404) {
                console.log('File not found in GitHub, returning empty array');
                return [];
            }
            
            if (!response.ok) {
                console.error('GitHub API error:', response.status, response.statusText);
                return null;
            }

            const data = await response.json();
            
            if (!data.content) {
                console.error('No content in GitHub response');
                return null;
            }
            
            try {
                // GitHub API возвращает контент в base64
                const content = atob(data.content.replace(/\n/g, ''));
                const treeData = JSON.parse(content);
                
                console.log(`Successfully loaded ${treeData.length} nodes from GitHub`);
                return treeData;
                
            } catch (parseError) {
                console.error('Error parsing GitHub content:', parseError);
                return null;
            }
            
        } catch (error) {
            console.error('Error loading data from GitHub:', error);
            
            try {
                console.log('Trying alternative loading method...');
                return await this.loadTreeDataAlternative();
            } catch (altError) {
                console.error('Alternative method also failed:', altError);
                return null;
            }
        }
    }

    async loadTreeDataAlternative() {
        const rawUrl = `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${this.dataFile}`;
        
        const response = await fetch(rawUrl);
        
        if (!response.ok) {
            throw new Error(`Alternative loading failed: ${response.status}`);
        }
        
        const content = await response.text();
        return JSON.parse(content);
    }

    async saveTreeData(treeData) {
        try {
            console.log(`Saving tree data to GitHub: ${this.owner}/${this.repo}/${this.dataFile}`);
            
            if (!Array.isArray(treeData)) {
                console.error('Tree data must be an array');
                return false;
            }
            
            const getUrl = `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.dataFile}?ref=${this.branch}`;
            
            const headers = {
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            };
            
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            } else {
                console.warn('No GitHub token provided. This will only work for public repos with write access.');
            }
            
            let currentSha = null;
            
            try {
                const getResponse = await fetch(getUrl, { headers });
                if (getResponse.ok) {
                    const data = await getResponse.json();
                    currentSha = data.sha;
                    console.log('Found existing file, SHA:', currentSha);
                }
            } catch (e) {
                console.log('File does not exist or cannot be accessed, will create new');
            }
            
            const content = btoa(JSON.stringify(treeData, null, 2));
            const putUrl = `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.dataFile}`;
            
            const body = {
                message: `Update tree data via web interface - ${new Date().toLocaleString()}`,
                content: content,
                branch: this.branch
            };
            
            if (currentSha) {
                body.sha = currentSha;
            }
            
            console.log('Saving to GitHub...');
            const response = await fetch(putUrl, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(body)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('GitHub save error:', response.status, errorData);
                
                if (response.status === 409 || response.status === 422) {
                    console.log('Trying to create new file...');
                    return await this.createNewFile(treeData);
                }
                
                return false;
            }
            
            console.log('Successfully saved to GitHub');
            return true;
            
        } catch (error) {
            console.error('Error saving data to GitHub:', error);
            return false;
        }
    }

    async createNewFile(treeData) {
        try {
            const content = btoa(JSON.stringify(treeData, null, 2));
            const url = `${this.apiBase}/repos/${this.owner}/${this.repo}/contents/${this.dataFile}`;
            
            const headers = {
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            };
            
            if (this.token) {
                headers['Authorization'] = `Bearer ${this.token}`;
            }
            
            const body = {
                message: `Create new tree data file - ${new Date().toLocaleString()}`,
                content: content,
                branch: this.branch
            };
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: headers,
                body: JSON.stringify(body)
            });
            
            return response.ok;
            
        } catch (error) {
            console.error('Error creating new file:', error);
            return false;
        }
    }

    getRawFileUrl() {
        return `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${this.dataFile}`;
    }

    getGitHubFileUrl() {
        return `https://github.com/${this.owner}/${this.repo}/blob/${this.branch}/${this.dataFile}`;
    }
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GitHubLoader;
}
