/* MINDWORK service worker: cache the whole app on install, serve cache-first, never touch the network for core use. */
const CACHE = 'mindwork-17f0a7b9e6';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  // first install activates immediately; updates wait until the user chooses to reload
  if (!self.registration.active) self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('mindwork-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin || /\/api\/|ai-status\.json/.test(new URL(req.url).pathname)) return; // AI status and replies are never cached
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : null) || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })));
});
self.addEventListener('message', e => { if (e.data === 'skip-waiting') self.skipWaiting(); });
