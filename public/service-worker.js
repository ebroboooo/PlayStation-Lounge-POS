const CACHE_NAME = 'loungelink-pos-v3';
const ASSETS = ['/', '/index.html', '/logo.svg', '/manifest.json'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key =>
    (key.startsWith('villa30-pos-') || key.startsWith('loungelink-pos-')) && key !== CACHE_NAME
  ).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin ||
      url.pathname.includes('@vite') || url.pathname.includes('node_modules') ||
      url.pathname.startsWith('/api/')) return;
  // Refresh the application shell when the local server is available.
  // Hashed build assets remain cache-first. Offline fallback is unchanged in intent.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (request.mode !== 'navigate') {
      const cached = await cache.match(request);
      if (cached) return cached;
    }
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
      if (request.mode === 'navigate' && response.ok && response.type === 'basic') await cache.put('/', response.clone());
      return response;
    } catch {
      const cached = await cache.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const shell = await cache.match('/');
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});
