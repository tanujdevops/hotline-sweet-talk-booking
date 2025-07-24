// Service Worker for caching resources and improving performance
const CACHE_NAME = 'sweetyoncall-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Resources to cache immediately
const STATIC_RESOURCES = [
  '/',
  '/index.html',
  // Add other critical resources
];

// Resources to cache dynamically
const DYNAMIC_RESOURCES = [
  '/assets/',
  'https://fonts.googleapis.com/',
  'https://fonts.gstatic.com/',
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('SW: Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        console.log('SW: Static resources cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('SW: Failed to cache static resources', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('SW: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('SW: Old caches cleaned up');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external API calls (Supabase, etc.)
  if (url.hostname.includes('supabase') || url.hostname.includes('gpteng.co')) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('SW: Serving from cache', request.url);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Don't cache non-successful responses
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Determine which cache to use
            const shouldCacheDynamically = DYNAMIC_RESOURCES.some(resource => 
              request.url.includes(resource)
            );

            if (shouldCacheDynamically) {
              const responseToCache = networkResponse.clone();
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  console.log('SW: Caching dynamic resource', request.url);
                  cache.put(request, responseToCache);
                });
            }

            return networkResponse;
          })
          .catch(() => {
            // Network failed, try to serve offline fallback
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      console.log('SW: Background sync triggered')
    );
  }
});

// Push notification support (if needed later)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('SW: Push notification received', data);
  }
});