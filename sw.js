const CACHE_NAME = 'fieldshore-v3.11.2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
];
// F-5B-14 (v3.10.0): precache SheetJS so air-gapped incident sites can still
// import/export inventory after first launch. Cross-origin URL is handled via
// Request with mode:'cors' so the SRI-pinned script tag in app.js can still
// validate the cached response.
const CROSS_ORIGIN_ASSETS = [
  'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all([
        ...ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('Failed to cache:', url, err))
        ),
        ...CROSS_ORIGIN_ASSETS.map(url => {
          const req = new Request(url, { mode: 'cors', credentials: 'omit' });
          return cache.add(req).catch(err => console.warn('Failed to cache cross-origin:', url, err));
        }),
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Firebase realtime URLs bypass the SW entirely — they're WebSocket-like
  // long-polls and caching breaks sync semantics.
  if (event.request.url.includes('firebasejs') || event.request.url.includes('firebaseio')) {
    return;
  }
  // F-5B-14: SheetJS is served cache-first so offline import/export keeps
  // working after the first install. Falls back to network on cache miss.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
