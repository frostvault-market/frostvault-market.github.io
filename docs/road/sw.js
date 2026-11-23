// offline cache: serve from cache, refresh in background
const CACHE = 'sekka-v3';
const FILES = ['./', './index.html', './style.css', './icon.svg', './manifest.webmanifest', "./js/art_bg.js","./js/art_obj.js","./js/audio.js","./js/car.js","./js/data.js","./js/fx.js","./js/game.js","./js/gicons_data.js","./js/icons.js","./js/items.js","./js/plat.js","./js/plat_art.js","./js/plat_data.js","./js/render.js","./js/ui.js","./js/ui_foot.js","./js/util.js","./js/world.js"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then(r => { if (r.ok && (r.type === 'basic' || r.type === 'cors')) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
