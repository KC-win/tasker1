const CACHE = 'tasker-v1';
const ASSETS = [
  '/tasker/',
  '/tasker/index.html',
  '/tasker/manifest.json',
  '/tasker/icon-192.png',
  '/tasker/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

// Install — cache core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      // Cache what we can, ignore failures (CDN may block)
      return Promise.allSettled(ASSETS.map(url => cache.add(url).catch(() => {})));
    }).then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', e => {
  // Skip non-GET and Supabase API calls (always need fresh data)
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase.co')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache successful responses
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      })
      .catch(() => {
        // Offline fallback — serve from cache
        return caches.match(e.request).then(cached => {
          if (cached) return cached;
          // Fallback to index for navigation
          if (e.request.mode === 'navigate') {
            return caches.match('/tasker/index.html');
          }
        });
      })
  );
});

// Push notifications (future use)
self.addEventListener('push', e => {
  if (!e.data) return;
  const data = e.data.json();
  self.registration.showNotification(data.title || 'Tasker', {
    body: data.body || '',
    icon: '/tasker/icon-192.png',
    badge: '/tasker/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/tasker/' }
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/tasker/'));
});
