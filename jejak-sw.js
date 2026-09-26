const CACHE = 'rcs-jejak-v22';
const SHELL = ['jejak.html?v=22', 'jejak.css?v=22', 'jejak.js?v=22', 'jejak.webmanifest?v=22', 'album.html?v=22', 'album.css?v=22', 'album.js?v=22', 'album-data.js?v=22', 'logo-transparent-256.png', 'logo-transparent-512.png', 'logo-album-transparent.png', 'memory-cover.jpg', 'jejak-universe.jpg', 'thumbnail-jejak.jpg'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('rcs-jejak-') && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const isDocument = event.request.mode === 'navigate' || event.request.destination === 'document';
  if (event.request.destination === 'audio') {
    event.respondWith(fetch(event.request));
    return;
  }
  if (isDocument) {
    event.respondWith(
      fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match(event.request).then(cached => cached || caches.match('jejak.html?v=22')))
    );
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  })));
});
