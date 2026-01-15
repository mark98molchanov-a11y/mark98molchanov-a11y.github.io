
let treeStorage = null;
let isCloudInitialized = false;
function initCloudStorage() {
  try {
    if (!window.TreeStorage) {
      console.error('TreeStorage не загружен. Проверьте tree-storage.js');
      showNotification('❌ Облачное хранилище недоступно', 'error');
      return;
    }
    
    treeStorage = new TreeStorage();
    console.log('✅ Облачное хранилище инициализировано');
    isCloudInitialized = true;
    if (treeStorage.getStoredToken()) {
      console.log('GitHub токен найден');
    }
    
    setTimeout(() => {
      autoLoadTreeOnStart();
    }, 500);
    
  } catch (error) {
    console.error('Ошибка инициализации облачного хранилища:', error);
    showNotification('⚠️ Облачное хранилище недоступно', 'warning');
  }
}
async function autoLoadTreeOnStart() {
  if (!isCloudInitialized || !treeStorage) {
    console.log('Облачное хранилище не инициализировано, пропускаем автозагрузку');
    return;
  }
  
  console.log('🔍 Проверяем источники данных...');
  const urlData = treeStorage.loadFromURL();
  if (urlData) {
    console.log('📥 Найдены данные в URL параметре');
    try {
      if (window.treeApp && typeof window.treeApp.loadTree === 'function') {
        window.treeApp.loadTree(urlData);
        showNotification('✅ Загружено из ссылки коллеги', 'success');
      } else if (typeof loadTree === 'function') {
        loadTree(urlData);
        showNotification('✅ Загружено из ссылки коллеги', 'success');
      } else {
        console.error('Функция loadTree не найдена в приложении');
        setTimeout(() => {
          if (window.treeManager && window.treeManager.loadTreeData) {
            window.treeManager.loadTreeData(urlData);
            showNotification('✅ Загружено из ссылки коллеги', 'success');
          }
        }, 1000);
      }
      return;
    } catch (error) {
      console.error('Ошибка загрузки из URL:', error);
    }
  }
  try {
    const githubData = await treeStorage.loadFromGitHub();
    if (githubData) {
      console.log('🌐 Найдены данные в GitHub');
      setTimeout(() => {
        if (window.treeApp && typeof window.treeApp.loadTree === 'function') {
          window.treeApp.loadTree(githubData);
          showNotification('✅ Загружено из общего хранилища', 'success');
        } else if (typeof loadTree === 'function') {
          loadTree(githubData);
          showNotification('✅ Загружено из общего хранилища', 'success');
        }
      }, 300);
      return;
    }
  } catch (e) {
    console.log('Не удалось загрузить из GitHub:', e.message);
  }
  const localData = treeStorage.loadLocally();
  if (localData) {
    console.log('💾 Найдены локальные данные');
    setTimeout(() => {
      if (window.treeApp && typeof window.treeApp.loadTree === 'function') {
        window.treeApp.loadTree(localData);
      } else if (typeof loadTree === 'function') {
        loadTree(localData);
      }
    }, 300);
    return;
  }
  
  console.log('📭 Данные не найдены, используется дерево по умолчанию');
}
function showNotification(message, type = 'info') {
  if (localStorage.getItem('disableCloudNotifications') === 'true') {
    console.log(`[Notification skipped]: ${message}`);
    return;
  }
  
  const colors = {
    success: '#4caf50',
    error: '#f44336',
    info: '#2196f3',
    warning: '#ff9800'
  };
  let notificationContainer = document.getElementById('cloud-notifications');
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'cloud-notifications';
    notificationContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10001;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 350px;
    `;
    document.body.appendChild(notificationContainer);
  }
  
  const notification = document.createElement('div');
  notification.className = 'cloud-notification';
  notification.style.cssText = `
    background: ${colors[type] || colors.info};
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: cloudNotificationSlideIn 0.3s ease-out;
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;
  notification.appendChild(messageSpan);
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    background: transparent;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    margin-left: 10px;
    padding: 0 5px;
    line-height: 1;
  `;
  closeBtn.onclick = () => {
    notification.style.animation = 'cloudNotificationSlideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  };
  notification.appendChild(closeBtn);
  
  notificationContainer.appendChild(notification);
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'cloudNotificationSlideOut 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}
function addNotificationStyles() {
  if (!document.getElementById('cloud-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'cloud-notification-styles';
    style.textContent = `
      @keyframes cloudNotificationSlideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes cloudNotificationSlideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
      .cloud-notification {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
      }
    `;
    document.head.appendChild(style);
  }
}
function getTreeDataFromApp() {
  if (window.treeApp && typeof window.treeApp.getTreeData === 'function') {
    return window.treeApp.getTreeData();
  }
  
  if (window.treeManager && typeof window.treeManager.getTreeData === 'function') {
    return window.treeManager.getTreeData();
  }
  
  if (typeof getCurrentTreeData === 'function') {
    return getCurrentTreeData();
  }
  if (window.currentTreeData) {
    return window.currentTreeData;
  }
  const treeElement = document.getElementById('tree');
  if (treeElement && treeElement.dataset.tree) {
    try {
      return JSON.parse(treeElement.dataset.tree);
    } catch (e) {
      console.error('Ошибка парсинга дерева из DOM:', e);
    }
  }
  
  throw new Error('Не удалось получить данные дерева');
}
async function saveTreeToCloud(event) {
  if (!isCloudInitialized || !treeStorage) {
    showNotification('❌ Облачное хранилище не инициализировано', 'error');
    return;
  }
  
  try {
    let treeData;
    try {
      treeData = getTreeDataFromApp();
    } catch (error) {
      console.error('Ошибка получения данных дерева:', error);
      showNotification('❌ Не могу получить данные дерева', 'error');
      return;
    }
    
    if (!treeData || (!treeData.children && !treeData.nodes && Object.keys(treeData).length === 0)) {
      showNotification('⚠️ Дерево пустое или нет данных', 'warning');
      return;
    }
    treeData._cloudMeta = {
      savedAt: new Date().toISOString(),
      savedBy: navigator.userAgent,
      version: '1.0'
    };
    const saveBtn = event?.target || document.getElementById('saveCloudBtn');
    const originalText = saveBtn?.textContent;
    const originalHTML = saveBtn?.innerHTML;
    
    if (saveBtn) {
      saveBtn.innerHTML = '⌛ Сохранение...';
      saveBtn.disabled = true;
    }
    try {
      const result = await treeStorage.saveToGitHub(treeData);
      console.log('Результат сохранения в GitHub:', result);
      
      showNotification('✅ Успешно сохранено в общее хранилище!', 'success');
      
      setTimeout(() => {
        const infoText = `Файл: tree-data.json\n` +
                        `Репо: ${treeStorage.githubUsername}/${treeStorage.repoName}\n` +
                        `Коллеги загрузят через кнопку "Загрузить из облака"`;
        console.info(infoText);
      }, 500);
      
    } catch (githubError) {
      console.warn('GitHub сохранение не удалось:', githubError.message);
      const shareURL = treeStorage.saveLocally(treeData);
      
      if (shareURL) {
        showNotification('📎 Создана ссылка для коллег. Скопируйте её.', 'info');
      } else {
        showNotification('⚠️ Сохранено локально, но не удалось создать ссылку', 'warning');
      }
    }
    
  } catch (error) {
    console.error('Общая ошибка сохранения:', error);
    showNotification('❌ Ошибка сохранения: ' + error.message, 'error');
  } finally {
    const saveBtn = event?.target || document.getElementById('saveCloudBtn');
    if (saveBtn) {
      if (originalHTML) {
        saveBtn.innerHTML = originalHTML;
      } else if (originalText) {
        saveBtn.textContent = originalText;
      } else {
        saveBtn.textContent = '💾 Сохранить в облако';
      }
      saveBtn.disabled = false;
    }
  }
}
async function loadTreeFromCloud(event) {
  if (!isCloudInitialized || !treeStorage) {
    showNotification('❌ Облачное хранилище не инициализировано', 'error');
    return;
  }
  
  try {
    const loadBtn = event?.target || document.getElementById('loadCloudBtn');
    const originalText = loadBtn?.textContent;
    const originalHTML = loadBtn?.innerHTML;
    
    if (loadBtn) {
      loadBtn.innerHTML = '⌛ Загрузка...';
      loadBtn.disabled = true;
    }
    const source = confirm(
      'Откуда загрузить дерево?\n\n' +
      'OK - Из общего хранилища (GitHub)\n' +
      'Отмена - Из локального хранилища'
    ) ? 'github' : 'local';
    
    let treeData = null;
    let sourceName = '';
    
    if (source === 'github') {
      treeData = await treeStorage.loadFromGitHub();
      sourceName = 'общего хранилища (GitHub)';
    } else {
      treeData = treeStorage.loadLocally();
      sourceName = 'локального хранилища';
    }
    
    if (treeData) {
      if (treeData._cloudMeta) {
        delete treeData._cloudMeta;
      }
      if (window.treeApp && typeof window.treeApp.loadTree === 'function') {
        window.treeApp.loadTree(treeData);
        showNotification(`✅ Загружено из ${sourceName}!`, 'success');
      } else if (typeof loadTree === 'function') {
        loadTree(treeData);
        showNotification(`✅ Загружено из ${sourceName}!`, 'success');
      } else if (window.treeManager && window.treeManager.loadTreeData) {
        window.treeManager.loadTreeData(treeData);
        showNotification(`✅ Загружено из ${sourceName}!`, 'success');
      } else {
        // Сохраняем в глобальную переменную и обновляем страницу
        window.currentTreeData = treeData;
        localStorage.setItem('treeData', JSON.stringify(treeData));
        showNotification(`✅ Данные загружены из ${sourceName}. Обновите страницу.`, 'success');
      }
    } else {
      showNotification(`📭 Нет данных в ${sourceName}`, 'info');
    }
    
  } catch (error) {
    console.error('Ошибка загрузки:', error);
    showNotification('❌ Ошибка загрузки: ' + error.message, 'error');
  } finally {
    const loadBtn = event?.target || document.getElementById('loadCloudBtn');
    if (loadBtn) {
      if (originalHTML) {
        loadBtn.innerHTML = originalHTML;
      } else if (originalText) {
        loadBtn.textContent = originalText;
      } else {
        loadBtn.textContent = '☁️ Загрузить из облака';
      }
      loadBtn.disabled = false;
    }
  }
}
function shareTreeLink(event) {
  try {
    let treeData;
    try {
      treeData = getTreeDataFromApp();
    } catch (error) {
      showNotification('❌ Не могу получить данные дерева', 'error');
      return;
    }
    
    if (!treeData || (!treeData.children && !treeData.nodes && Object.keys(treeData).length === 0)) {
      showNotification('⚠️ Дерево пустое или нет данных', 'warning');
      return;
    }
    const useCompression = confirm(
      'Как создать ссылку?\n\n' +
      'OK - Сжатая ссылка (короче, требует LZString)\n' +
      'Отмена - Прямая ссылка (длиннее, проще)'
    );
    if (useCompression) {
      const shareURL = treeStorage.createShareableLink(treeData);
      if (shareURL) {
        showNotification('📎 Сжатая ссылка создана!', 'success');
      }
    } else {
      localStorage.setItem('treeData', JSON.stringify(treeData));
      localStorage.setItem('treeData_timestamp', Date.now().toString());
      
      const dataStr = encodeURIComponent(JSON.stringify(treeData));
      if (dataStr.length < 2000) {
        const shareURL = `${window.location.origin}${window.location.pathname}?data=${dataStr}`;
        treeStorage.showShareLink(shareURL, 'Прямая ссылка с данными');
      } else {
        showNotification('❌ Данные слишком большие для прямой ссылки', 'error');
      }
    }
    
  } catch (error) {
    console.error('Ошибка создания ссылки:', error);
    showNotification('❌ Ошибка создания ссылки', 'error');
  }
}
function openCloudSettings() {
  const settings = `
    <div style="padding: 20px; font-family: sans-serif;">
      <h3>Настройки облачного хранилища</h3>
      <div style="margin: 10px 0;">
        <label>
          <input type="checkbox" id="disableNotifications" ${localStorage.getItem('disableCloudNotifications') === 'true' ? 'checked' : ''}>
          Отключить уведомления
        </label>
      </div>
      <div style="margin: 10px 0;">
        <button onclick="localStorage.removeItem('githubToken'); alert('Токен удалён');">
          Удалить сохранённый GitHub токен
        </button>
      </div>
      <div style="margin: 10px 0;">
        <button onclick="localStorage.removeItem('treeData'); alert('Локальные данные удалены');">
          Очистить локальное хранилище
        </button>
      </div>
      <div style="margin-top: 20px; color: #666; font-size: 12px;">
        Текущий репозиторий: ${treeStorage ? `${treeStorage.githubUsername}/${treeStorage.repoName}` : 'не инициализирован'}
      </div>
    </div>
  `;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border-radius: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    z-index: 10002;
    min-width: 300px;
  `;
  dialog.innerHTML = settings;
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Закрыть';
  closeBtn.style.cssText = `
    margin: 20px;
    padding: 10px 20px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    display: block;
    margin-left: auto;
    margin-right: auto;
  `;
  closeBtn.onclick = () => dialog.remove();
  
  dialog.appendChild(closeBtn);
  document.body.appendChild(dialog);
}
function addSettingsButton() {
  if (!document.getElementById('cloudSettingsBtn')) {
    const settingsBtn = document.createElement('button');
    settingsBtn.id = 'cloudSettingsBtn';
    settingsBtn.innerHTML = '⚙️';
    settingsBtn.title = 'Настройки облачного хранилища';
    settingsBtn.style.cssText = `
      padding: 8px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      background: var(--controls-bg);
      color: var(--text-color);
      cursor: pointer;
      font-size: 16px;
      margin-left: 5px;
    `;
    settingsBtn.onclick = openCloudSettings;
    const controls = document.querySelector('.controls');
    if (controls) {
      controls.appendChild(settingsBtn);
    }
  }
}
document.addEventListener('DOMContentLoaded', function() {
  addNotificationStyles();
  setTimeout(() => {
    initCloudStorage();
    addSettingsButton();
  }, 1000);
  window.debugCloud = function() {
    console.log('=== Облачное хранилище ===');
    console.log('Инициализировано:', isCloudInitialized);
    console.log('treeStorage:', treeStorage);
    console.log('LZString доступен:', typeof LZString !== 'undefined');
    console.log('GitHub токен:', treeStorage ? (treeStorage.getStoredToken() ? 'есть' : 'нет') : 'N/A');
    try {
      const treeData = getTreeDataFromApp();
      console.log('Данные дерева получены:', treeData ? 'да' : 'нет');
      if (treeData) {
        console.log('Размер данных:', JSON.stringify(treeData).length, 'символов');
      }
    } catch (e) {
      console.log('Ошибка получения данных дерева:', e.message);
    }
  };
});
window.initCloudStorage = initCloudStorage;
window.autoLoadTreeOnStart = autoLoadTreeOnStart;
window.saveTreeToCloud = saveTreeToCloud;
window.loadTreeFromCloud = loadTreeFromCloud;
window.shareTreeLink = shareTreeLink;
window.openCloudSettings = openCloudSettings;
window.debugCloud = window.debugCloud;
