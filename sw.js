const CACHE = 'stage-crono-gravity-v14';
const ASSETS = [
  './',
  './index.html',
  './crono.html',
  './resultados.html',
  './manifest.json',
  './assets/js/config.js',
  './assets/js/events.js',
  './assets/js/session.js',
  './assets/js/utils.js',
  './assets/js/gps.js',
  './assets/js/wakelock.js',
  './assets/js/audio.js',
  './assets/js/supabase.js',
  './assets/js/crono-app.js',
  './assets/events/las_varas/seg01.js',
  './assets/events/las_varas/seg02.js',
  './assets/events/puchuncavi/seg01.js',
  './assets/stage-crono-logo.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting(); // activa inmediatamente
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim(); // toma control de todas las tabs abiertas
});

self.addEventListener('fetch', e => {
  // Network first — si falla, caché
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
