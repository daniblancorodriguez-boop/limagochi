/* ==========================================================================
   LIMAGOCHI · service worker
   · Offline: precarga todos los archivos y los sirve de la caché (stale-while-revalidate).
   · Web Push: muestra el aviso salvo que la app esté a la vista.
   · Al tocar un aviso enfoca (o abre) la app.
   ========================================================================== */
const VERSION = 'limagochi-v3.31.0';
const FILES = [
  './', 'index.html', 'style.css', 'manifest.json',
  'sprites.js', 'items.js', 'config.js', 'audio.js', 'world.js', 'notify.js', 'bugs.js', 'forms2.js', 'progress.js', 'guide.js', 'backup.js', 'lib/qrcode.js', 'mail.js', 'visit.js', 'minigames.js', 'games2.js', 'studio.js', 'kitchen.js', 'school.js', 'voice.js', 'first.js', 'glyphs_map.js', 'glyphs.js', 'game.js',
  'bg/salon.png', 'bg/cuarto.png', 'bg/estudio.png', 'bg/cocina.png', 'bg/jardin.png', 'bg/jardin_k.png', 'bg/playa.png', 'bg/playa_k.png',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
  'ico/g1.png', 'ico/g2.png', 'ico/g3.png', 'ico/g4.png', 'ico/g5.png', 'ico/g6.png', 'ico/g7.png', 'ico/g8.png', 'ico/g9.png', 'ico/g10.png', 'ico/album.png', 'ico/bugs.png', 'ico/clean.png', 'ico/clean2.png', 'ico/disc.png', 'ico/egg.png', 'ico/energy.png', 'ico/feed.png', 'ico/guide.png', 'ico/happy.png', 'ico/heal.png', 'ico/history.png', 'ico/work.png', 'ico/school.png', 'ico/hunger.png', 'ico/light.png', 'ico/logros.png', 'ico/mail.png', 'ico/play.png', 'ico/scold.png', 'ico/settings.png', 'ico/shop.png', 'ico/shower.png', 'ico/status.png', 'ico/teach.png', 'ico/visit.png', 'ico/voice.png'
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

  // red primero (con 4 s de margen) y caché si no hay conexión: así HTML, CSS y JS siempre son de la misma versión
  e.respondWith(
    caches.open(VERSION).then(async cache => {
      const timeout = new Promise(r => setTimeout(() => r(null), 4000));
      const network = fetch(req, { cache: 'no-cache' }).then(res => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      const res = await Promise.race([network, timeout]);
      if (res) return res;
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) { e.waitUntil(network); return cached; }
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
