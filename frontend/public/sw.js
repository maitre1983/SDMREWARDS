// SDM Rewards Service Worker v3
// Ultra-fast, offline-first PWA with aggressive caching

const CACHE_VERSION = 'sdm-v3';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Cache TTL for API responses (5 minutes)
const API_CACHE_TTL = 5 * 60 * 1000;

// Core app shell - always cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints that can be cached briefly for faster navigation
const CACHEABLE_API_PATTERNS = [
  '/api/merchants/me',
  '/api/merchants/dashboard',
  '/api/clients/me',
  '/api/public/merchants',
  '/api/verify/banks'
];

// Install: Pre-cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing SDM Rewards PWA...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Pre-caching app shell');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating SDM Rewards PWA v3...');
  
  const keepCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE, API_CACHE];
  
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key.startsWith('sdm-') && !keepCaches.includes(key))
            .map(key => {
              console.log('[SW] Removing old cache:', key);
              return caches.delete(key);
            })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Smart caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip Chrome extensions and external URLs
  if (!url.origin.includes(self.location.origin)) return;
  
  // API calls: Stale-while-revalidate for dashboard data, network-first for others
  if (url.pathname.startsWith('/api/')) {
    const isCacheable = CACHEABLE_API_PATTERNS.some(pattern => url.pathname.includes(pattern));
    
    if (isCacheable && request.method === 'GET') {
      // Stale-while-revalidate for dashboard APIs
      event.respondWith(
        caches.open(API_CACHE).then(cache => {
          return cache.match(request).then(cached => {
            const fetchPromise = fetch(request)
              .then(response => {
                if (response.ok) {
                  // Cache with timestamp
                  const clonedResponse = response.clone();
                  cache.put(request, clonedResponse);
                }
                return response;
              })
              .catch(() => {
                // Return cached on network failure
                if (cached) return cached;
                return new Response(
                  JSON.stringify({ error: 'Offline', message: 'Please check your connection' }),
                  { status: 503, headers: { 'Content-Type': 'application/json' } }
                );
              });
            
            // Return cached immediately, revalidate in background
            return cached || fetchPromise;
          });
        })
      );
      return;
    }
    
    // Network-first for non-cacheable APIs
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response(
            JSON.stringify({ error: 'Offline', message: 'Please check your connection' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }
  
  // Images: Cache first, then network
  if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(request).then(cached => {
          const fetchPromise = fetch(request).then(response => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => cached);
          
          return cached || fetchPromise;
        });
      })
    );
    return;
  }
  
  // Static assets: Cache first
  if (request.destination === 'style' || request.destination === 'script' || url.pathname.match(/\.(css|js|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        
        return fetch(request).then(response => {
          if (response.ok) {
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }
  
  // HTML/Navigation: Network first, fall back to cache
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful navigation responses
          if (response.ok) {
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then(cached => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }
  
  // Default: Stale-while-revalidate
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(response => {
        if (response.ok) {
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(request, response.clone()));
        }
        return response;
      });
      
      return cached || fetchPromise;
    })
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = { title: 'SDM Rewards', body: 'You have a new notification', url: '/' };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: { url: data.url },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Dismiss' }
    ],
    requireInteraction: false,
    tag: 'sdm-notification'
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
  
  if (event.action === 'close') return;
  
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Focus existing window
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);
  
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
});

async function syncTransactions() {
  // Sync any pending offline transactions
  console.log('[SW] Syncing offline transactions...');
}

// Message handler for cache control
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  
  if (event.data === 'clearApiCache') {
    caches.delete(API_CACHE).then(() => {
      console.log('[SW] API cache cleared');
    });
  }
  
  // Prefetch specific routes
  if (event.data?.type === 'prefetch') {
    const urls = event.data.urls || [];
    caches.open(DYNAMIC_CACHE).then(cache => {
      urls.forEach(url => {
        fetch(url)
          .then(response => {
            if (response.ok) cache.put(url, response);
          })
          .catch(() => {});
      });
    });
  }
});

console.log('[SW] SDM Rewards Service Worker v3 loaded');
