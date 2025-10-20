// Content Script - AGRESIF MOD
console.log('🎯 Sora Auto Liker - AGRESIF MOD yüklendi');

// Token'ı sakla
let cachedToken = null;

// Request queue için
let isProcessing = false;
const requestQueue = [];

// Storage'dan token'ı yükle
chrome.storage.local.get(['bearerToken'], (data) => {
  if (data.bearerToken) {
    cachedToken = data.bearerToken;
    console.log('✅ Token storage\'dan yüklendi');
  }
});

// Sayfadaki fetch'i intercept et ve token'ı yakala
const originalFetch = window.fetch;
window.fetch = function(...args) {
  // İsteği gözlemle
  if (args[1] && args[1].headers) {
    const headers = args[1].headers;
    
    // Authorization header'ını yakala
    if (headers.Authorization || headers.authorization) {
      const authHeader = headers.Authorization || headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        if (!cachedToken || cachedToken !== token) {
          cachedToken = token;
          chrome.storage.local.set({ bearerToken: token });
          console.log('✅ Bearer token yakalandı');
        }
      }
    }
  }
  
  // Normal fetch'i çağır
  return originalFetch.apply(this, args);
};

// Background'dan mesaj dinle
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  // Token'ı manuel olarak ayarla
  if (message.type === 'setToken') {
    cachedToken = message.token;
    console.log('✅ Token manuel olarak ayarlandı');
    sendResponse({ success: true });
    return true;
  }
  
  // Token'ı al
  if (message.type === 'getToken') {
    sendResponse({ token: cachedToken });
    return true;
  }
  
  // Postları çek
  if (message.type === 'getPosts') {
    getPosts(message.limit)
      .then(posts => {
        sendResponse({ success: true, posts: posts });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  // Posta like at - AGRESIF (rate limit yok)
  if (message.type === 'likePost') {
    likePostAggressive(message.postId)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  // TOPLU LIKE AT - Yeni özellik
  if (message.type === 'likeBatch') {
    likeBatch(message.postIds)
      .then(results => {
        sendResponse({ success: true, results: results });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
});

// API'den postları çek - AGRESIF (daha fazla post)
async function getPosts(limit = 20) {
  try {
    if (!cachedToken) {
      throw new Error('Token bulunamadı!');
    }
    
    // Daha fazla post çek (max 20)
    const actualLimit = Math.min(limit, 20);
    
    const response = await fetch(
      `https://sora.chatgpt.com/backend/project_y/feed?limit=${actualLimit}&cut=nf2_latest`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': '*/*',
          'Accept-Language': 'tr-TR,tr;q=0.9',
          'Authorization': `Bearer ${cachedToken}`,
          'Referer': 'https://sora.chatgpt.com/explore',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin'
        }
      }
    );
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token geçersiz!');
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const items = data.items || [];
    
    const posts = items.map(item => ({
      id: item.post.id,
      username: item.profile.username || 'Unknown',
      userLiked: item.post.user_liked || false
    }));
    
    // Beğenilmemiş postları döndür
    return posts.filter(post => !post.userLiked);
    
  } catch (error) {
    console.error('Post çekme hatası:', error);
    throw error;
  }
}

// AGRESIF LIKE - Rate limit yok, hızlı
async function likePostAggressive(postId) {
  try {
    if (!cachedToken) {
      throw new Error('Token bulunamadı!');
    }
    
    // Rate limit yok - direkt istek at
    const response = await fetch(
      `https://sora.chatgpt.com/backend/project_y/post/${postId}/like`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': '*/*',
          'Authorization': `Bearer ${cachedToken}`,
          'Content-Type': 'application/json',
          'Referer': 'https://sora.chatgpt.com/explore',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin'
        },
        body: JSON.stringify({ kind: 'like' })
      }
    );
    
    if (response.status === 200) {
      return { success: true };
    } else if (response.status === 409) {
      return { success: false, alreadyLiked: true };
    } else if (response.status === 401) {
      throw new Error('Token geçersiz!');
    } else if (response.status === 429) {
      // Rate limit - yine de devam et
      return { success: false, rateLimited: true };
    } else {
      return { success: false };
    }
    
  } catch (error) {
    console.error('Like hatası:', error);
    throw error;
  }
}

// TOPLU LIKE AT - Tüm postlara aynı anda
async function likeBatch(postIds) {
  if (!cachedToken) {
    throw new Error('Token bulunamadı!');
  }
  
  // Tüm istekleri paralel olarak at
  const promises = postIds.map(postId => 
    likePostAggressive(postId).catch(err => ({ success: false, error: err.message }))
  );
  
  const results = await Promise.all(promises);
  return results;
}

console.log('✅ Sora Auto Liker - AGRESIF MOD hazır');
console.log('⚡ Zero rate limit - Maximum speed');
console.log('🔥 Multi-threaded requests enabled');
