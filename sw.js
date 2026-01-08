const CACHE_NAME = 'dsa-mastery-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/graph.html',
  '/periodic-table.html',
  '/resources.html',
  '/topic.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/periodic-table.js',
  '/data/graph_data.js',
  '/data/periodic-table-config.js',
  '/data/resources_data.js',
  '/manifest.json'
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => {
              console.log('[SW] Removing old cache:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        // Return cached version or fetch from network
        const fetchPromise = fetch(event.request)
          .then((response) => {
            // Don't cache bad responses
            if (!response || response.status !== 200) {
              return response;
            }

            // Clone and cache the response
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });

            return response;
          })
          .catch(() => {
            // If both cache and network fail, show offline page
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });

        return cached || fetchPromise;
      })
  );
});
