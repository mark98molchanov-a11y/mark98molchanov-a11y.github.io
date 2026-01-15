
class TreeStorage {
  constructor() {
    this.githubUsername = 'mark98molchanov-a11y'; 
    this.repoName = 'mark98molchanov-a11y.github.io'; 
    this.githubFileURL = `https://raw.githubusercontent.com/${this.githubUsername}/${this.repoName}/main/tree-data.json`;

    this.githubApiURL = `https://api.github.com/repos/${this.githubUsername}/${this.repoName}/contents/tree-data.json`;
    this.githubToken = null;
  }
  async requestGitHubToken() {
    const token = prompt(
      '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'
    );
    
    if (token) {
      this.githubToken = token.trim();
      localStorage.setItem('githubToken', this.githubToken);
      return true;
    }
    return false;
  }
  getStoredToken() {
    this.githubToken = localStorage.getItem('githubToken');
    return this.githubToken;
  }
  async saveToGitHub(treeData) {
    try {
      if (!this.getStoredToken()) {
        const hasToken = await this.requestGitHubToken();
        if (!hasToken) {
          throw new Error('Токен не предоставлен. Используем локальное сохранение.');
        }
      }

      console.log('Сохранение в GitHub...');
      
      const content = btoa(unescape(encodeURIComponent(JSON.stringify(treeData, null, 2))));
      let sha = '';
      try {
        const response = await fetch(this.githubApiURL, {
          headers: {
            'Authorization': `token ${this.githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (response.ok) {
          const current = await response.json();
          sha = current.sha;
        }
      } catch (e) {
        console.log('Файл еще не существует, создаем новый');
      }
      const response = await fetch(this.githubApiURL, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${this.githubToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Обновление дерева от ${new Date().toLocaleString()}`,
          content: content,
          sha: sha || undefined
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`GitHub API error: ${error.message}`);
      }
      
      const result = await response.json();
      console.log('Успешно сохранено в GitHub!');
      const shareURL = this.githubFileURL + '?t=' + Date.now();
      this.showShareLink(shareURL, 'Ссылка на GitHub');
      
      return result;
      
    } catch (error) {
      console.error('Ошибка сохранения в GitHub:', error);
      this.saveLocally(treeData);
      throw error;
    }
  }

  // Загрузить дерево из GitHub
  async loadFromGitHub() {
    try {
      console.log('Загрузка из GitHub...');
      
      // Добавляем timestamp чтобы избежать кэширования
      const timestamp = Date.now();
      const response = await fetch(`${this.githubFileURL}?t=${timestamp}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('Файл tree-data.json еще не существует в репозитории');
          return null;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Успешно загружено из GitHub!');
      return data;
      
    } catch (error) {
      console.error('Ошибка загрузки из GitHub:', error.message);
      return null;
    }
  }
  saveLocally(treeData) {
    try {
      localStorage.setItem('treeData', JSON.stringify(treeData));
      localStorage.setItem('treeData_timestamp', Date.now().toString());
      console.log('Сохранено локально в localStorage');
      this.createShareableLink(treeData);
      
    } catch (e) {
      console.error('Ошибка локального сохранения:', e);
    }
  }
  loadLocally() {
    try {
      const data = localStorage.getItem('treeData');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Ошибка локальной загрузки:', e);
      return null;
    }
  }
  createShareableLink(treeData) {
    try {
      if (typeof LZString !== 'undefined') {
        const compressed = LZString.compressToEncodedURIComponent(
          JSON.stringify(treeData)
        );
        const shareURL = `${window.location.origin}${window.location.pathname}?tree=${compressed}`;
        
        this.showShareLink(shareURL, 'Сжатая ссылка с данными');
        return shareURL;
      } else {
        alert('Библиотека сжатия не загружена. Ссылка будет длинной.');
        const dataStr = encodeURIComponent(JSON.stringify(treeData));
        if (dataStr.length < 2000) {
          const shareURL = `${window.location.origin}${window.location.pathname}?data=${dataStr}`;
          this.showShareLink(shareURL, 'Прямая ссылка с данными');
          return shareURL;
        } else {
          alert('Данные слишком большие для URL. Используйте GitHub сохранение.');
          return null;
        }
      }
    } catch (e) {
      console.error('Ошибка создания ссылки:', e);
      return null;
    }
  }
  showShareLink(url, title = 'Ссылка для коллег') {
    const copyText = `🎯 ${title}:\n${url}\n\nСкопируйте и отправьте эту ссылку коллегам.`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        alert(`${title} скопирована в буфер обмена!\n\n${url}`);
      }).catch(() => {
        prompt(copyText, url);
      });
    } else {
      prompt(copyText, url);
    }
  }
  loadFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const treeParam = urlParams.get('tree');
    if (treeParam && typeof LZString !== 'undefined') {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(treeParam);
        if (decompressed) {
          const data = JSON.parse(decompressed);
          console.log('Загружено из URL параметра (сжатые данные)');
          return data;
        }
      } catch (e) {
        console.error('Ошибка декомпрессии URL параметра:', e);
      }
    }
    const dataParam = urlParams.get('data');
    if (dataParam) {
      try {
        const data = JSON.parse(decodeURIComponent(dataParam));
        console.log('Загружено из URL параметра (несжатые данные)');
        return data;
      } catch (e) {
        console.error('Ошибка парсинга URL параметра:', e);
      }
    }
    
    return null;
  }
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TreeStorage;
} else {
  window.TreeStorage = TreeStorage;
}
