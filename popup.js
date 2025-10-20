// Popup UI kontrolü
let isRunning = false;
let hasToken = false;

// DOM elemanları
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDiv = document.getElementById('status');
const delayInput = document.getElementById('delay');
const limitInput = document.getElementById('limit');
const totalLikesSpan = document.getElementById('totalLikes');
const errorsSpan = document.getElementById('errors');
const logDiv = document.getElementById('log');
const tokenInput = document.getElementById('tokenInput');
const saveTokenBtn = document.getElementById('saveTokenBtn');
const autoTokenBtn = document.getElementById('autoTokenBtn');
const tokenIndicator = document.getElementById('tokenIndicator');
const helpLink = document.getElementById('helpLink');
const resetStatsBtn = document.getElementById('resetStatsBtn');
const languageSelect = document.getElementById('languageSelect');

// i18n fonksiyonları
function updateTexts() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = i18n.t(key);
  });
  
  // Placeholder güncelle
  tokenInput.placeholder = i18n.t('tokenPlaceholder');
}

// Dil değiştir
languageSelect.addEventListener('change', () => {
  const lang = languageSelect.value;
  i18n.setLanguage(lang);
  updateTexts();
  addLog(i18n.t('ready'), 'info');
});

// Storage'dan durumu yükle
chrome.storage.local.get(['isRunning', 'totalLikes', 'errors', 'delay', 'limit', 'bearerToken', 'language'], (data) => {
  isRunning = data.isRunning || false;
  totalLikesSpan.textContent = data.totalLikes || 0;
  errorsSpan.textContent = data.errors || 0;
  
  if (data.delay) delayInput.value = data.delay;
  if (data.limit) limitInput.value = data.limit;
  
  // Dil ayarla
  if (data.language) {
    i18n.currentLang = data.language;
    languageSelect.value = data.language;
    updateTexts();
  }
  
  // Token varsa göster
  if (data.bearerToken) {
    hasToken = true;
    tokenInput.value = data.bearerToken;
    tokenIndicator.classList.add('active');
    addLog(i18n.t('tokenSaved'), 'success');
  } else {
    addLog(i18n.t('ready'), 'info');
  }
  
  updateUI();
});

// Mesaj dinleyici
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'statusUpdate') {
    isRunning = message.isRunning;
    updateUI();
  }
  
  if (message.type === 'statsUpdate') {
    totalLikesSpan.textContent = message.totalLikes;
    errorsSpan.textContent = message.errors;
  }
  
  if (message.type === 'log') {
    addLog(message.text, message.level);
  }
});

// Token kaydet
saveTokenBtn.addEventListener('click', () => {
  const token = tokenInput.value.trim();
  
  if (!token) {
    addLog(i18n.t('enterToken'), 'error');
    return;
  }
  
  const cleanToken = token.replace(/^Bearer\s+/i, '');
  
  chrome.storage.local.set({ bearerToken: cleanToken }, () => {
    hasToken = true;
    tokenIndicator.classList.add('active');
    addLog(i18n.t('tokenSaved'), 'success');
    
    chrome.tabs.query({ url: 'https://sora.chatgpt.com/*' }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'setToken',
          token: cleanToken
        }).catch(() => {});
      }
    });
  });
});

// Otomatik token bul
autoTokenBtn.addEventListener('click', async () => {
  addLog('🔍 ' + i18n.t('tokenNotFound') + '...', 'info');
  
  const tabs = await chrome.tabs.query({ url: 'https://sora.chatgpt.com/*' });
  
  if (tabs.length === 0) {
    addLog('❌ Sora.chatgpt.com', 'error');
    return;
  }
  
  try {
    const response = await chrome.tabs.sendMessage(tabs[0].id, { type: 'getToken' });
    
    if (response && response.token) {
      tokenInput.value = response.token;
      chrome.storage.local.set({ bearerToken: response.token });
      hasToken = true;
      tokenIndicator.classList.add('active');
      addLog(i18n.t('tokenFound'), 'success');
    } else {
      addLog(i18n.t('tokenNotFound'), 'error');
    }
  } catch (error) {
    addLog(i18n.t('tokenNotFound'), 'error');
  }
});

// Yardım linki
helpLink.addEventListener('click', () => {
  addLog(i18n.t('helpGuide'), 'info');
  addLog(i18n.t('helpStep1'), 'info');
  addLog(i18n.t('helpStep2'), 'info');
  addLog(i18n.t('helpStep3'), 'info');
  addLog(i18n.t('helpStep4'), 'info');
  addLog(i18n.t('helpStep5'), 'info');
  addLog(i18n.t('helpStep6'), 'info');
});

// İstatistikleri sıfırla
resetStatsBtn.addEventListener('click', () => {
  if (confirm(i18n.t('statsReset') + '?')) {
    chrome.runtime.sendMessage({ type: 'resetStats' });
    totalLikesSpan.textContent = '0';
    errorsSpan.textContent = '0';
    addLog(i18n.t('statsReset'), 'success');
  }
});

// Start butonu
startBtn.addEventListener('click', () => {
  if (!hasToken) {
    addLog(i18n.t('enterToken'), 'error');
    return;
  }
  
  const delay = parseInt(delayInput.value);
  const limit = parseInt(limitInput.value);
  
  if (delay < 0 || limit < 1) {
    addLog(i18n.t('invalidSettings'), 'error');
    return;
  }
  
  chrome.storage.local.set({ delay, limit });
  
  chrome.runtime.sendMessage({
    type: 'start',
    delay: delay,
    limit: limit
  });
  
  isRunning = true;
  updateUI();
  addLog(i18n.t('startedUnlimited'), 'success');
  addLog(i18n.t('continuousChecking'), 'info');
});

// Stop butonu
stopBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'stop' });
  isRunning = false;
  updateUI();
  addLog(i18n.t('botStopped'), 'info');
});

// UI güncelle
function updateUI() {
  if (isRunning) {
    statusDiv.textContent = '🟢 ' + i18n.t('running');
    statusDiv.classList.add('active');
    startBtn.disabled = true;
    stopBtn.disabled = false;
    delayInput.disabled = true;
    limitInput.disabled = true;
    tokenInput.disabled = true;
    saveTokenBtn.disabled = true;
    autoTokenBtn.disabled = true;
    languageSelect.disabled = true;
  } else {
    statusDiv.textContent = '⏸️ ' + i18n.t('stopped');
    statusDiv.classList.remove('active');
    startBtn.disabled = false;
    stopBtn.disabled = true;
    delayInput.disabled = false;
    limitInput.disabled = false;
    tokenInput.disabled = false;
    saveTokenBtn.disabled = false;
    autoTokenBtn.disabled = false;
    languageSelect.disabled = false;
  }
}

// Log ekle
function addLog(text, level = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${level}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
  
  logDiv.insertBefore(entry, logDiv.firstChild);
  
  while (logDiv.children.length > 100) {
    logDiv.removeChild(logDiv.lastChild);
  }
}

// Ayarlar değiştiğinde kaydet
delayInput.addEventListener('change', () => {
  chrome.storage.local.set({ delay: parseInt(delayInput.value) });
});

limitInput.addEventListener('change', () => {
  chrome.storage.local.set({ limit: parseInt(limitInput.value) });
});
