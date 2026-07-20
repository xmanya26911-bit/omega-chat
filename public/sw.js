const CACHE_NAME = 'omega-v1';
const STATIC_ASSETS = [
  '/',
  '/chatinterface',
  '/manifest.json',
];

// Install: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first, cache fallback
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline: serve from cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // If HTML request and not cached, show offline page
          if (event.request.headers.get('Accept')?.includes('text/html')) {
            return caches.match('/chatinterface') || new Response(
              '<html><body style="background:#0a0a0f;color:#e0e0e0;display:flex;align-items:center;justify-content:center;font-family:system-ui;"><h1>Ω Offline</h1><p>Connect to the internet to use Omega</p></body></html>',
              { headers: { 'Content-Type': 'text/html;charset=UTF-8' } }
            );
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
