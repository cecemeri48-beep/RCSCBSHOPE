// v107: never cache backend/auth/private data. The old v28 worker cached
// every GET, including Supabase responses, causing stale admin rows.
const CACHE = 'rcs-jejak-v107';
const SHELL = ['jejak.html?v=28', 'jejak.css?v=28', 'jejak.js?v=28', 'jejak.webmanifest?v=28', 'album.html?v=28', 'album.css?v=28', 'album.js?v=28', 'album-data.js?v=28', 'logo-transparent-256.png', 'logo-transparent-512.png', 'logo-album-transparent.png', 'memory-cover.jpg', 'jejak-universe.jpg', 'thumbnail-jejak.jpg'];
const SHELL_URLS = new Set(SHELL.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('rcs-jejak-') && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));
self.addEventListener('fetch', event => {
  const request=event.request;
  const url=new URL(request.url);
  // Bypass all Supabase/CDN/cross-origin requests, API routes and no-store
  // requests. Do not put authenticated responses in CacheStorage at all.
  if(request.method!=='GET' || url.origin!==self.location.origin || request.cache==='no-store'
    || /\/(?:api|rest|auth|storage)\//.test(url.pathname)) return;
  const isDocument=request.mode==='navigate' || request.destination==='document';
  if(isDocument) {
    // Only the public Jejak/Album pages have an offline fallback. The main
    // registration/admin document always comes from the network.
    const page=url.pathname.split('/').pop();
    if(!['jejak.html','album.html'].includes(page)) return;
    event.respondWith(fetch(request).then(response=>{
      if(response.ok) {
        const copy=response.clone();
        event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)));
      }
      return response;
    }).catch(async()=>{
      const cached=await caches.match(request) || await caches.match(`${page}?v=28`);
      return cached || Response.error();
    }));
    return;
  }
  // Strict public-shell allowlist. Main application scripts and arbitrary
  // requests are not cached, even if their file extension looks static.
  if(!SHELL_URLS.has(url.href)) return;
  if(['script','style'].includes(request.destination)) {
    event.respondWith(fetch(request).then(response=>{
      if(response.ok) { const copy=response.clone(); event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy))); }
      return response;
    }).catch(async()=>await caches.match(request) || Response.error()));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>cached || fetch(request).then(response=>{
    if(response.ok) { const copy=response.clone(); event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy))); }
    return response;
  })));
});
