// Offline + powiadomienia push.
// Pliki aplikacji: najpierw sieć (aktualizacje od razu), bez sieci — pamięć podręczna.
// Nagrania i treści: nagrania mają w nazwie skrót treści, więc raz pobrane nigdy się nie zmieniają.
const CACHE = 'lingoza-v23';
const AUDIO = 'lingoza-audio-v1';
const SHELL = ['./', 'index.html', 'styles.css', 'manifest.webmanifest', 'js/app.js', 'js/dom.js', 'js/store.js', 'js/sync.js',
  'js/srs.js', 'js/vendor/ts-fsrs.mjs', 'js/content.js', 'js/audio.js', 'js/glosy.js', 'js/game.js', 'js/session.js',
  'js/cwiczenia.js', 'js/lekcja.js', 'js/czytnik.js', 'js/config.js', 'js/grafiki.js', 'js/quiz.js', 'fonts/Jost.ttf', 'fonts/LibreBaskerville.ttf',
  'ikony/ikona-180.png', 'ikony/ikona-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== AUDIO).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (/\/audio\/[a-z]{2}\/[0-9a-f]{16}\.mp3$/.test(url.pathname)) {
    e.respondWith(caches.open(AUDIO).then((c) => c.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.status === 200) c.put(req, res.clone()).catch(() => {});
      return res;
    }))));
    return;
  }
  e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data?.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Lingoza', {
    body: d.body || 'Czas na krótką lekcję angielskiego!',
    icon: 'ikony/ikona-180.png', badge: 'ikony/ikona-180.png', tag: 'lingoza-przypomnienie', data: { url: d.url || './' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((okna) => {
    const o = okna.find((w) => 'focus' in w);
    return o ? o.focus() : self.clients.openWindow(e.notification.data?.url || './');
  }));
});
