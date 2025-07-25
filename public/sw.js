// Optimized Service Worker for SweetyOnCall performance
const CACHE_NAME = 'sweetyoncall-perf-v2';
const FONT_CACHE = 'sweetyoncall-fonts-v1';
const STATIC_CACHE = 'static-v2';

// Critical resources for immediate caching
const STATIC_RESOURCES = [
  '/',
  '/index.html',
];

// Font resources for aggressive caching
const FONT_RESOURCES = [
  'https://fonts.gstatic.com/s/cormorantgaramond/v16/co3bmX5slCNuHLi8bLeY9MK7whWMhyjQrWem.woff2',
  'https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2',
];

// Resources to cache dynamically
const DYNAMIC_RESOURCES = [
  '/assets/',
  'https://fonts.googleapis.com/',
  'https://images.unsplash.com/',
];

// Install event - cache critical resources aggressively
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache static resources
      caches.open(STATIC_CACHE).then(cache => {
        console.log('SW: Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      }),
      // Cache fonts immediately for LCP optimization
      caches.open(FONT_CACHE).then(cache => {
        console.log('SW: Caching critical fonts');
        return cache.addAll(FONT_RESOURCES);
      })
    ]).then(() => {
      console.log('SW: All critical resources cached');
      return self.skipWaiting();
    }).catch((error) => {
      console.error('SW: Failed to cache resources', error);
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
            if (cacheName !== STATIC_CACHE && cacheName !== FONT_CACHE && cacheName !== CACHE_NAME) {
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

// Fetch event - optimized caching strategy for performance
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

  // Font caching strategy - cache first for performance
  if (url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache => {
        return cache.match(request).then(response => {
          if (response) {
            return response;
          }
          return fetch(request).then(fetchResponse => {
            if (fetchResponse.ok) {
              cache.put(request, fetchResponse.clone());
            }
            return fetchResponse;
          });
        });
      })
    );
    return;
  }

  // Google Fonts CSS - network first with cache fallback
  if (url.hostname === 'fonts.googleapis.com') {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(FONT_CACHE).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        return caches.match(request);
      })
    );
    return;
  }

  // Default strategy for other resources
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200) {
              return networkResponse;
            }

            const shouldCacheDynamically = DYNAMIC_RESOURCES.some(resource => 
              request.url.includes(resource)
            );

            if (shouldCacheDynamically) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }

            return networkResponse;
          })
          .catch(() => {
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