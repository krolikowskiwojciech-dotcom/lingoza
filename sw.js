// Offline + powiadomienia push.
// Pliki aplikacji (HTML, JS, CSS, czcionki, ikony, grafiki): od razu z pamięci, odświeżane w tle (stale-while-revalidate)
// — aplikacja startuje natychmiast, a nowa wersja pojawia się przy następnym otwarciu. Podbicie CACHE przy zmianie kodu
// pobiera całą powłokę od nowa.
// Treści (tresci/*.json): najpierw sieć (nowe pakiety od razu), przy wolnej sieci lub bez niej — pamięć.
// Nagrania: mają w nazwie skrót treści, więc raz pobrane nigdy się nie zmieniają.
const CACHE = 'lingoza-v74';
const AUDIO = 'lingoza-audio-v1';
// treści w osobnej, niewersjonowanej pamięci: aktualizacja aplikacji jej nie kasuje, więc zapas zostaje
const TRESCI = 'lingoza-tresci-v1';
const SHELL = ['./', 'index.html', 'styles.css', 'manifest.webmanifest', 'js/app.js', 'js/dom.js', 'js/store.js', 'js/sync.js',
  'js/srs.js', 'js/vendor/ts-fsrs.mjs', 'js/content.js', 'js/audio.js', 'js/glosy.js', 'js/game.js', 'js/session.js',
  'js/cwiczenia.js', 'js/lekcja.js', 'js/kartkowka.js', 'js/seria.js', 'js/wynik.js', 'js/czytnik.js', 'js/config.js', 'js/grafiki.js', 'js/quiz.js', 'js/mowa.js', 'js/rozmowa.js', 'js/dzwieki.js', 'fonts/Jost.ttf', 'fonts/LibreBaskerville.ttf',
  'ikony/ikona-64.png', 'ikony/ikona-180.png', 'ikony/ikona-192.png', 'ikony/ikona-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  // przed skasowaniem starych wersji przenosimy z nich treści do pamięci TRESCI (gdyby jej jeszcze nie było)
  const przenies = async (stary) => {
    const [z, do_] = await Promise.all([caches.open(stary), caches.open(TRESCI)]);
    for (const req of await z.keys()) {
      if (!/\/tresci\//.test(new URL(req.url).pathname) || await do_.match(req, { ignoreSearch: true })) continue;
      const res = await z.match(req);
      if (res) await do_.put(req, res);
    }
  };
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== AUDIO && k !== TRESCI)
    .map((k) => przenies(k).catch(() => {}).then(() => caches.delete(k)))))
    .then(() => self.clients.claim()));
});

// pobranie z sieci z zapisem do pamięci (tylko poprawne odpowiedzi z własnego adresu)
// bez ciasteczek: pliki aplikacji ich nie potrzebują, a Cloudflare potrafi odrzucić (403) żądanie z ciasteczkiem sesji
// ogarnijmaterial.pl uznanym za podejrzane — wtedy znikały obrazki, a katalog dawał ekran „Ups”
const zSieci = (req, c) => fetch(req.url, { cache: 'no-cache', credentials: 'omit' }).then((res) => {
  if (res.ok && res.type === 'basic') c.put(req, res.clone()).catch(() => {});
  return res;
});
const zPamieci = (c, req) => c.match(req, { ignoreSearch: true, ignoreVary: true });
const zapas = async (c, req) => (await zPamieci(c, req)) || (req.mode === 'navigate' && await c.match('index.html')) || Response.error();

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (/\/audio\/[a-z]{2}\/[0-9a-f]{16}\.mp3$/.test(url.pathname)) {
    e.respondWith(caches.open(AUDIO).then((c) => c.match(req, { ignoreVary: true }).then((hit) => hit || fetch(req.url, { credentials: 'omit' }).then((res) => {
      if (res.status === 200) c.put(req, res.clone()).catch(() => {});
      return res;
    }))));
    return;
  }
  if (/\/tresci\//.test(url.pathname)) {
    // treści: sieć z limitem czasu, potem pamięć (odpowiedź z sieci i tak trafi do pamięci, gdy dojdzie)
    e.respondWith(caches.open(TRESCI).then((c) => {
      // błędna odpowiedź z sieci (np. w trakcie publikacji) → wersja z pamięci, jeśli jest
      const siec = zSieci(req, c).then(async (res) => (res.ok ? res : (await zPamieci(c, req)) || res));
      e.waitUntil(siec.catch(() => {}));
      const limit = new Promise((r) => setTimeout(r, 2500)).then(() => zPamieci(c, req)).then((hit) => hit || siec);
      return Promise.race([siec, limit]).catch(() => zapas(c, req));
    }));
    return;
  }
  // pliki aplikacji: stale-while-revalidate
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await zPamieci(c, req);
    const siec = zSieci(req, c);
    if (hit) { e.waitUntil(siec.catch(() => {})); return hit; }
    return siec.catch(() => zapas(c, req));
  }));
});

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data?.text() }; }
  // nazwa aplikacji dla użytkownika to „Angielski” (stara nazwa z serwera przypomnień jest podmieniana)
  const tytul = !d.title || /lingoz/i.test(d.title) ? 'Angielski' : d.title;
  e.waitUntil(self.registration.showNotification(tytul, {
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
