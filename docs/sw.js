/* ==========================================================================
   LIMAGOCHI · service worker
   · Offline: precarga todos los archivos y los sirve de la caché (stale-while-revalidate).
   · Web Push: muestra el aviso salvo que la app esté a la vista.
   · Al tocar un aviso enfoca (o abre) la app.
   ========================================================================== */
const VERSION = 'limagochi-v3.5.2';
const FILES = [
  './', 'index.html', 'style.css', 'manifest.json',
  'sprites.js', 'items.js', 'audio.js', 'world.js', 'notify.js', 'progress.js', 'guide.js', 'backup.js', 'lib/qrcode.js', 'mail.js', 'visit.js', 'minigames.js', 'voice.js', 'game.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('limagochi-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

  e.respondWith(
    caches.open(VERSION).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req).then(res => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      if (cached) { e.waitUntil(network); return cached; }                  // rápido: caché y actualiza detrás
      return (await network) || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
    })
  );
});

self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { body: e.data && e.data.text() }; }
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.some(c => c.visibilityState === 'visible')) return;          // ya la está viendo
      return self.registration.showNotification(data.title || 'Limagochi te necesita', {
        body: data.body || '', tag: data.tag || 'limagochi', icon: 'icons/icon-192.png', badge: 'icons/favicon-32.png',
        vibrate: [120, 60, 120], data: { url: './' }
      });
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});
