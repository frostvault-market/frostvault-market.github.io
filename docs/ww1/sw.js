// يخلّي اللعبة تشتغل من غير نت (التدريب والحملة) ويحمّلها بسرعة
const V = 'ww1-v4';
const FILES = ['./', 'index.html', 'style.css', 'cards.js', 'rtcards.js', 'maps.js', 'campaign.js', 'sim.js', 'rtai.js', 'sound.js', 'render.js', 'game.js', 'battle.js', 'peerjs.min.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x.startsWith('ww1-') && x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
// الشبكة الأول (عشان التحديثات توصل)، ولو مفيش نت نستخدم النسخة المحفوظة
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});
