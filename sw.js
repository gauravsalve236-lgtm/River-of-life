// Service Worker for River of Life Bible App
const CACHE_NAME = 'river-of-life-cache-v24';

// Static App Shell assets to cache immediately
const STATIC_ASSETS = [
  './',
  './index.html',
  './index.css?v=24',
  './app.js?v=24',
  './manifest.json',
  './assets/bible/books.json',
  './assets/bible/books_mr.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/images/forest.png',
  './assets/images/mountains.png',
  './assets/images/sunrise.png',
  './assets/images/ocean.png',
  './assets/images/stars.png',
  './assets/images/mist.png',
  './assets/images/path.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Outfit:wght@500;600;700&display=swap'
];

// Install Event - Pre-cache Static Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline app shell');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache storage:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Cache-First for books, Network-First for other shell assets
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Bypass service worker for cross-origin audio files or any wordproaudio.net request
  if (requestUrl.hostname.includes('wordproaudio.net') || requestUrl.pathname.endsWith('.mp3')) {
    return; // Let browser handle it directly!
  }

  // Cache Strategy: Cache-First for local Bible book JSON data
  if (requestUrl.pathname.includes('/assets/bible/books/') || requestUrl.pathname.includes('/assets/bible/books_mr/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Fetch from network and store in cache dynamically
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        }).catch(() => {
          return new Response(JSON.stringify({ error: "Offline data not available" }), {
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
    );
  } else {
    // Network-First, fallback to Cache for other shell assets
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
});
