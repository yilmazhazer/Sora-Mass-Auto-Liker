// Background service worker - AGRESIF MOD
let isRunning = false;
let mainLoopInterval = null;
let stats = {
  totalLikes: 0,
  errors: 0,
  postsProcessed: 0
};

// Storage'dan istatistikleri yükle
chrome.storage.local.get(['totalLikes', 'errors'], (data) => {
  stats.totalLikes = data.totalLikes || 0;
  stats.errors = data.errors || 0;
});

// Mesaj dinleyici
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'start') {
    startBot(message.delay, message.limit);
    sendResponse({ success: true });
  } else if (message.type === 'stop') {
    stopBot();
    sendResponse({ success: true });
  }
});

// Bot'u başlat - AGRESIF MOD
async function startBot(delay, limit) {
  if (isRunning) {
    console.log('Bot zaten çalışıyor');
    return;
  }
  
  isRunning = true;
  notifyPopup({ type: 'statusUpdate', isRunning: true });
  logToPopup('🔥 AGRESIF MOD başlatıldı!', 'success');
  logToPopup('⚡ Multi-thread, anında like sistemi aktif', 'success');
  logToPopup('🚀 Maksimum hız modunda çalışıyor...', 'info');
  
  // SÜREKLI DÖNGÜ - HİÇ DURMADAN
  runAggressiveMode(delay, limit);
}

// Bot'u durdur
function stopBot() {
  isRunning = false;
  if (mainLoopInterval) {
    clearInterval(mainLoopInterval);
    mainLoopInterval = null;
  }
  notifyPopup({ type: 'statusUpdate', isRunning: false });
  logToPopup('⏹️ Bot durduruldu', 'info');
  logToPopup(`📊 Toplam ${stats.totalLikes} like atıldı`, 'success');
  logToPopup(`📊 ${stats.postsProcessed} post işlendi`, 'info');
}

// AGRESIF MOD - Sürekli, hızlı, multi-threaded
async function runAggressiveMode(delay, limit) {
  
  // Ana döngü fonksiyonu
  const mainLoop = async () => {
    if (!isRunning) return;
    
    try {
      // Sora sayfasını bul
      const tabs = await chrome.tabs.query({ url: 'https://sora.chatgpt.com/*' });
      
      if (tabs.length === 0) {
        // Sayfa yoksa 5 saniye bekle ve tekrar dene
        setTimeout(mainLoop, 5000);
        return;
      }
      
      const tab = tabs[0];
      
      // Postları çek
      let response;
      try {
        response = await chrome.tabs.sendMessage(tab.id, {
          type: 'getPosts',
          limit: limit
        });
      } catch (error) {
        // Hata varsa kısa bekle ve devam et
        setTimeout(mainLoop, 2000);
        return;
      }
      
      if (!response || !response.success || !response.posts || response.posts.length === 0) {
        // Post yoksa HEMEN tekrar dene
        setTimeout(mainLoop, 1000);
        return;
      }
      
      const posts = response.posts;
      stats.postsProcessed += posts.length;
      
      logToPopup(`⚡ ${posts.length} post bulundu - İşleniyor...`, 'info');
      
      // MULTI-THREADED - Tüm postlara AYNI ANDA like at
      const likePromises = posts.map(async (post, index) => {
        if (!isRunning) return;
        
        // Minimum delay (rate limiting için)
        await sleep(delay * 1000 * index);
        
        try {
          const likeResponse = await chrome.tabs.sendMessage(tab.id, {
            type: 'likePost',
            postId: post.id
          });
          
          if (likeResponse && likeResponse.success) {
            stats.totalLikes++;
            logToPopup(`✓ @${post.username}`, 'success');
            updateStats();
            return true;
          } else if (likeResponse && likeResponse.alreadyLiked) {
            return false;
          } else {
            stats.errors++;
            updateStats();
            return false;
          }
        } catch (err) {
          stats.errors++;
          updateStats();
          return false;
        }
      });
      
      // Tüm like işlemlerini paralel olarak çalıştır
      await Promise.allSettled(likePromises);
      
      // Hemen bir sonraki döngüye geç (AGRESIF)
      if (isRunning) {
        logToPopup(`🔥 ${stats.totalLikes} toplam - Devam ediyor...`, 'success');
        // SIFIR BEKLEME - Hemen devam
        setTimeout(mainLoop, 100); // Sadece 100ms (rate limit için minimum)
      }
      
    } catch (error) {
      stats.errors++;
      logToPopup(`❌ ${error.message}`, 'error');
      updateStats();
      // Hata olsa bile devam et
      if (isRunning) {
        setTimeout(mainLoop, 1000);
      }
    }
  };
  
  // İlk döngüyü başlat
  mainLoop();
}

// İstatistikleri güncelle ve kaydet
function updateStats() {
  chrome.storage.local.set({
    totalLikes: stats.totalLikes,
    errors: stats.errors
  });
  
  notifyPopup({
    type: 'statsUpdate',
    totalLikes: stats.totalLikes,
    errors: stats.errors
  });
}

// Popup'a bildirim gönder
function notifyPopup(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Popup kapalıysa hata görmezden gel
  });
}

// Log gönder
function logToPopup(text, level = 'info') {
  console.log(`[${level.toUpperCase()}] ${text}`);
  notifyPopup({
    type: 'log',
    text: text,
    level: level
  });
}

// Bekleme fonksiyonu
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// İstatistikleri sıfırla
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'resetStats') {
    stats.totalLikes = 0;
    stats.errors = 0;
    stats.postsProcessed = 0;
    updateStats();
    logToPopup('🔄 İstatistikler sıfırlandı', 'info');
    sendResponse({ success: true });
  }
});

console.log('🚀 Sora Auto Liker - AGRESIF MOD');
console.log('⚡ Multi-threaded, maximum speed mode');
console.log('🔥 Zero delay - continuous operation');
