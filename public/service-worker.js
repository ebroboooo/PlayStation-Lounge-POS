const CACHE_NAME = 'villa30-pos-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/logo.svg',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  
  // Avoid caching browser extension files or external dev server files
  const url = e.request.url;
  if (url.includes('chrome-extension') || url.includes('socket.io') || url.includes('@vite') || url.includes('node_modules')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached and update cache in background
        fetch(e.request)
          .then((response) => {
            if (response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(e.request, response));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(e.request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          if (e.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
    })
  );
});
