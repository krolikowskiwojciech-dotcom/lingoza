// Lingoza — ekrany aplikacji i nawigacja (adresy z #, np. #/pakiet/praca-wywiad).

import { h, $, wyczysc } from './dom.js';
import {
  rodzina, zapiszRodzine, profilInfo, aktualnyProfil, ustawProfil, wczytajStan, zapiszStan, urzadzenie, CELE, dzien, scal,
} from './store.js';
import { katalog, pakiet, artykul, widoczny, pozycjaWlasna } from './content.js';
import { uruchomLekcje } from './lekcja.js';
import { krokiGramatyki, krokGramatyki } from './cwiczenia.js';
import { naDzis } from './session.js';
import { seria, xpDzis, xpTygodnia, poczatekTygodnia, statystyki, ODZNAKI } from './game.js';
import { znane, opanowane, State } from './srs.js';
import { graj, ustawTempo, pobierzTempo } from './audio.js';
import { pokazArtykul } from './czytnik.js';
import { konfig, ustawKonfig, synchronizujProfil, synchronizujRodzine, pobierzInne, inneZPamieci, zapiszSubskrypcje, REPO_DANYCH } from './sync.js';
import { VAPID_PUBLICZNY } from './config.js';
import { AWATARY as AWATARY_OBRAZKI, awatar, linga, obrazOdznaki, potwierdz, glosnik, ik } from './grafiki.js';

const app = $('#app');
const S = { id: null, info: null, stan: null, zakladka: 'praca', synchro: 'off', synchroBlad: '' };

// ---------- profil ----------
function wybierzProfil(id) {
  ustawProfil(id);
  S.id = id; S.info = profilInfo(id); S.stan = wczytajStan(id);
  S.zakladka = S.info?.typ === 'dziecko' ? 'szkola' : 'praca';
}

async function startoweAktywne() {
  if (Object.keys(S.stan.aktywne).length) return;
  const k = await katalog();
  const t = Date.now();
  k.pakiety.filter((p) => p.start && widoczny(p, S.stan.ustawienia, S.info)).forEach((p, i) => { S.stan.aktywne[p.id] = t + i; });
  zapiszStan(S.stan);
}

// ---------- synchronizacja ----------
let synchroTrwa = null;
async function synchronizuj() {
  if (!konfig()?.token || !S.id) { S.synchro = 'off'; return; }
  if (synchroTrwa) return synchroTrwa;
  S.synchro = 'trwa';
  synchroTrwa = (async () => {
    try {
      await synchronizujRodzine();
      S.info = profilInfo(S.id);
      const wynik = await synchronizujProfil(wczytajStan(S.id));
      // ten sam obiekt zostaje w użyciu (np. w trwającej lekcji), tylko dostaje scalone dane
      Object.assign(S.stan, scal(S.stan, wynik)); zapiszStan(S.stan);
      await pobierzInne(rodzina().profile.map((p) => p.id).filter((x) => x !== S.id));
      S.synchro = 'ok'; S.synchroBlad = '';
    } catch (e) {
      S.synchro = 'blad'; S.synchroBlad = e.message;
    } finally { synchroTrwa = null; }
  })();
  return synchroTrwa;
}

// ---------- elementy wspólne ----------
// dla dzieci „Poza pracą” brzmi dziwnie — pokazujemy „Poza szkołą”
const nazwaKategorii = (kat) => (kat?.id === 'poza' && S.info?.typ === 'dziecko' ? 'Poza szkołą' : kat?.nazwa || '');

const KOLORY = ['lila', 'rozowy', 'zolty', 'mietowy', 'zielony', 'brzoskwinia', 'niebieski'];

function nawigacja(aktywna) {
  const poz = [['nauka', '#/', ik('dom'), 'Nauka'], ['czytaj', '#/czytaj', ik('ksiazka'), 'Czytaj'], ['liga', '#/liga', ik('puchar'), 'Liga'], ['profil', '#/profil', awatar(S.info?.avatar || '👤', 'nav-awatar'), 'Profil']];
  return h('nav', { class: 'nav' }, poz.map(([id, href, ik, t]) => h('a', { href, class: id === aktywna ? 'akt' : '' }, h('span', { class: 'nav-ik' }, ik), h('span', {}, t))));
}

function ekran(aktywna, ...tresc) {
  wyczysc(app).append(h('main', { class: 'ekran' }, ...tresc), nawigacja(aktywna));
  window.scrollTo(0, 0);
}

function pierscien(proc, srodek) {
  const r = 18; const obw = 2 * Math.PI * r;
  return h('span', { class: 'pierscien', html: `<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="${r}" class="pt"/><circle cx="22" cy="22" r="${r}" class="pp" stroke-dasharray="${obw}" stroke-dashoffset="${obw * (1 - Math.min(1, proc))}"/></svg>` }, h('span', { class: 'pierscien-s' }, srodek));
}

// ilustracja 3D (z arkuszy grafik), a gdy jej nie ma — emoji
const obrazek = (ikona, emoji) => (ikona ? h('img', { src: ikona, alt: '', loading: 'lazy', decoding: 'async' }) : emoji);

function gwiazdki(proc) {
  const n = Math.round(proc * 5);
  return h('span', { class: 'gwiazdki', 'aria-label': `${n} z 5` }, '★'.repeat(n), h('span', { class: 'gw-puste' }, '☆'.repeat(5 - n)));
}

function postepPakietu(pk) {
  const refs = pk.pozycje.map((p) => `${pk.id}/${p.id}`);
  const wpr = refs.filter((r) => S.stan.wprowadzone[r]).length;
  const zn = refs.filter((r) => znane(S.stan.karty[`${r}|p`])).length;
  return { razem: refs.length, wpr, zn, proc: refs.length ? zn / refs.length : 0 };
}

function miejsceWLidze() {
  const inne = inneZPamieci();
  const lista = rodzina().profile.map((p) => ({ id: p.id, xp: p.id === S.id ? xpTygodnia(S.stan) : xpTygodnia(inne[p.id]) }));
  lista.sort((a, b) => b.xp - a.xp);
  return lista.findIndex((x) => x.id === S.id) + 1;
}

// ---------- ekran wyboru profilu ----------
function ekranProfili() {
  wyczysc(app).append(h('main', { class: 'ekran profile-wybor' },
    h('div', { class: 'logo serif' }, 'Lingoza'),
    linga('powitanie', 'linga-powitanie'),
    h('h1', { class: 'serif' }, 'Kto się ', h('em', {}, 'dziś'), ' uczy?'),
    h('div', { class: 'profile-siatka' }, rodzina().profile.map((p, i) => h('button', {
      class: 'profil-kafel kolor-' + KOLORY[i % KOLORY.length], type: 'button',
      onclick: async () => { wybierzProfil(p.id); await startoweAktywne(); location.hash = '#/'; render(); synchronizuj().then(render); },
    }, h('span', { class: 'profil-avatar' }, awatar(p.avatar)), h('b', {}, p.imie), h('small', {}, p.typ === 'dziecko' ? 'tryb dla dzieci' : `poziom ${p.poziom}`))))));
}

// ---------- ekran główny ----------
async function ekranNauka() {
  const k = await katalog();
  const s = seria(S.stan);
  const dzis = xpDzis(S.stan);
  const cel = S.stan.ustawienia.cel;
  const nd = await naDzis(S.stan, S.info);
  const dziecko = S.info?.typ === 'dziecko';
  // dorośli: Praca / Poza pracą / Gramatyka; dzieci: Lekcje (dział Szkoła) / Gramatyka / Poza szkołą
  const zakladki = dziecko
    ? [['szkola', 'Lekcje'], ['gramatyka', 'Gramatyka'], ['poza', 'Poza szkołą']]
    : [...(S.stan.ustawienia.pokazPrace ? [['praca', 'Praca']] : []), ['poza', 'Poza pracą'], ['gramatyka', 'Gramatyka']];
  if (!zakladki.some(([z]) => z === S.zakladka)) S.zakladka = zakladki[0][0];

  const opisCta = nd.powtorki || nd.nowe
    ? [nd.powtorki ? `${nd.powtorki} ${nd.powtorki === 1 ? 'powtórka' : nd.powtorki < 5 ? 'powtórki' : 'powtórek'}` : null, nd.nowe ? `${nd.nowe} nowych` : null].filter(Boolean).join(' · ')
    : 'Wszystko zrobione — możesz utrwalać';

  const lista = h('div', { class: 'stos' });
  const pokazZakladke = async () => {
    wyczysc(lista);
    if (S.zakladka === 'gramatyka') {
      const gram = k.pakiety.filter((p) => p.rodzaj === 'gramatyka' && widoczny(p, S.stan.ustawienia, S.info));
      for (const [i, meta] of gram.entries()) {
        const pk = await pakiet(meta.id);
        const pp = postepPakietu(pk);
        lista.append(kartaStosu({ kolor: meta.kolor || KOLORY[i % KOLORY.length], tytul: meta.tytul, opis: meta.opis, emoji: meta.emoji, ikona: meta.ikona, proc: pp.proc, href: `#/pakiet/${meta.id}`, i, pakiety: [meta.id] }));
      }
      return;
    }
    // Lekcje dzieci: każdy pakiet z działu Szkoła (rozdział podręcznika) to osobna karta talii
    if (S.zakladka === 'szkola') {
      const szk = k.pakiety.filter((p) => p.kategoria === 'poza' && p.dzial === 'szkola' && widoczny(p, S.stan.ustawienia, S.info));
      for (const [i, meta] of szk.entries()) {
        const pp = postepPakietu(await pakiet(meta.id));
        lista.append(kartaStosu({ kolor: meta.kolor || KOLORY[i % KOLORY.length], tytul: meta.tytul, opis: meta.opis, emoji: meta.emoji, ikona: meta.ikona, proc: pp.proc, href: `#/pakiet/${meta.id}`, i, pakiety: [meta.id], meta: `${pp.razem} słówek` }));
      }
      if (!szk.length) lista.append(h('p', { class: 'uwaga-box' }, 'Tu pojawią się lekcje z podręcznika.'));
      return;
    }
    const kat = k.kategorie.find((x) => x.id === S.zakladka);
    const dzialy = kat.dzialy.filter((d) => !(dziecko && d.id === 'szkola'));
    for (const [i, d] of dzialy.entries()) {
      const pak = k.pakiety.filter((p) => p.kategoria === kat.id && p.dzial === d.id && widoczny(p, S.stan.ustawienia, S.info));
      const art = k.artykuly.filter((a) => a.kategoria === kat.id && a.dzial === d.id && widoczny(a, S.stan.ustawienia, S.info));
      if (!pak.length && !art.length) continue;
      let razem = 0; let zn = 0;
      for (const m of pak) { const pp = postepPakietu(await pakiet(m.id)); razem += pp.razem; zn += pp.zn; }
      lista.append(kartaStosu({
        kolor: d.kolor, tytul: d.nazwa, opis: d.opis, emoji: d.emoji, ikona: d.ikona, proc: razem ? zn / razem : 0, i,
        meta: [pak.length ? `${pak.length} ${pak.length === 1 ? 'pakiet' : 'pakiety'}` : null, art.length ? `${art.length} ${art.length === 1 ? 'artykuł' : 'artykuły'}` : null].filter(Boolean).join(' · '),
        href: `#/dzial/${kat.id}/${d.id}`, pakiety: pak.map((p) => p.id),
      }));
    }
  };

  const tabs = h('div', { class: 'zakladki' }, zakladki.map(([id, t]) => h('button', {
    class: 'zakladka' + (S.zakladka === id ? ' akt' : ''), type: 'button',
    onclick: async (e) => { S.zakladka = id; tabs.querySelectorAll('.zakladka').forEach((b) => b.classList.remove('akt')); e.currentTarget.classList.add('akt'); await pokazZakladke(); dopasujStos(lista); },
  }, t)));

  ekran('nauka',
    h('div', { class: 'naglowek' },
      h('a', { class: 'avatar', href: '#/profil' }, awatar(S.info.avatar)),
      h('div', { class: 'naglowek-txt' }, h('small', {}, dziecko ? `Cześć, ${S.info.imie}!` : 'Twój poziom'), h('b', {}, dziecko ? 'Czas na angielski!' : `${S.info.poziom} · ${S.info.imie}`)),
      h('a', { class: 'ikona-btn', href: '#/profil', 'aria-label': 'Ustawienia' }, ik('zebatka'))),
    h('div', { class: 'tytul-wiersz' },
      h('h1', { class: 'tytul serif' }, 'Ucz się ', h('em', {}, 'angielskiego'), h('br'), 'codziennie'),
      linga(dzis >= cel ? 'puchar' : s.dzisZrobione ? 'plomien' : 'macha', 'linga-glowna')),
    h('div', { class: 'pasek-gry' },
      h('a', { class: 'gra-el' + (s.dzisZrobione ? ' plonie' : ''), href: '#/liga' }, h('span', { class: 'gra-ik' }, ik('plomien')), h('b', {}, s.dni), h('small', {}, s.dni === 1 ? 'dzień' : 'dni')),
      h('a', { class: 'gra-el', href: '#/profil' }, pierscien(dzis / cel, ik('blyskawica')), h('b', {}, `${dzis}/${cel}`), h('small', {}, 'XP dziś')),
      h('a', { class: 'gra-el', href: '#/liga' }, h('span', { class: 'gra-ik' }, ik('puchar_kolor')), h('b', {}, `${miejsceWLidze()}.`), h('small', {}, 'w lidze')),
      s.zamrozenia ? h('span', { class: 'gra-el', title: 'Zamrożenia serii' }, h('span', { class: 'gra-ik' }, ik('krysztal')), h('b', {}, s.zamrozenia), h('small', {}, 'zapas')) : null),
    h('button', { class: 'cta', type: 'button', onclick: () => start() },
      h('span', { class: 'cta-txt' }, h('b', {}, dzis >= cel ? 'Ćwicz dalej' : 'Zacznij lekcję'), h('small', {}, opisCta)),
      h('span', { class: 'cta-strzalka' }, '→')),
    tabs, lista);
  await pokazZakladke();
  dopasujStos(lista);
}

// Pochylony w perspektywie stos jest wizualnie niższy niż w układzie strony — podciągamy go pod zakładki.
const OBROTY = [-2.4, 1.6, -1.2, 2.2, -2.8, 1.1, -1.8, 2.6, -0.8, 1.9, -2.2, 1.3];
function dopasujStos(lista) {
  // głębokość od karty z przodu: karty dalej są mniejsze, każda inaczej obrócona (wachlarz)
  const karty = [...lista.children];
  karty.forEach((k, i) => { k.style.setProperty('--d', karty.length - 1 - i); k.style.setProperty('--obrot', `${OBROTY[i % OBROTY.length]}deg`); });
  lista.style.marginTop = '0px';
  requestAnimationFrame(() => {
    const nad = lista.previousElementSibling?.getBoundingClientRect().bottom;
    const pierwsza = karty[0]?.getBoundingClientRect().top;
    if (nad == null || pierwsza == null) return;
    lista.style.marginTop = `${-(pierwsza - nad - 18)}px`;
  });
}

// Karta talii: dotknięcie = wysunięcie z talii i lekcja z tego działu; okrągła ikonka = lista pakietów i artykułów.
function kartaStosu({ kolor, tytul, opis, emoji, ikona, proc, href, meta, i, pakiety }) {
  const karta = h('div', { class: `karta-stos kolor-${kolor}`, role: 'button', tabindex: '0', 'aria-label': `${tytul} — zacznij lekcję`, style: { zIndex: i + 1 } },
    h('div', { class: 'ks-gora' }, h('div', { class: 'ks-tytul serif' }, tytul),
      h('a', { class: 'ks-emoji', href, 'aria-label': `${tytul}: pakiety i artykuły`, onclick: (e) => e.stopPropagation() }, obrazek(ikona, emoji || '📘'))),
    opis ? h('div', { class: 'ks-opis' }, opis) : null,
    h('div', { class: 'ks-dol' }, gwiazdki(proc), meta ? h('small', {}, meta) : null));
  const otworz = () => {
    if (!pakiety?.length) { location.hash = href; return; } // dział z samymi artykułami
    wysunKarte(karta, { kolor, tytul, zakres: { pakiety } });
  };
  karta.addEventListener('click', otworz);
  karta.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); otworz(); } });
  return karta;
}

// Animacja: karta wysuwa się z talii, prostuje i rozrasta na cały ekran, który staje się ekranem lekcji.
let wLocie = false;
async function wysunKarte(karta, { kolor, tytul, zakres }) {
  if (wLocie || document.body.classList.contains('w-lekcji')) return;
  wLocie = true;
  const kolorLekcji = kolor === 'zielony' ? 'mietowy' : kolor; // na ciemnej zieleni ćwiczenia byłyby nieczytelne
  const r = karta.getBoundingClientRect();
  const tlo = getComputedStyle(karta).backgroundColor;
  const klon = karta.cloneNode(true);
  klon.classList.add('karta-lot');
  Object.assign(klon.style, { position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, margin: '0', zIndex: '45', transform: 'none' });
  document.body.append(klon);
  karta.style.visibility = 'hidden';
  const ruch = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    if (ruch) {
      await klon.animate([{ transform: `rotate(${getComputedStyle(karta).getPropertyValue('--obrot') || '0deg'})` }, { transform: 'translateY(-34px) scale(1.04) rotate(0deg)' }],
        { duration: 230, easing: 'cubic-bezier(.2,.9,.3,1.1)', fill: 'forwards' }).finished;
      klon.querySelectorAll(':scope > *').forEach((x) => x.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }));
      const docelowe = getComputedStyle(document.documentElement).getPropertyValue(`--${kolorLekcji}`).trim() || tlo;
      await klon.animate([
        { left: `${r.left}px`, top: `${r.top - 34}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: '22px', backgroundColor: tlo, transform: 'scale(1.04)' },
        { left: '0px', top: '0px', width: `${innerWidth}px`, height: `${innerHeight}px`, borderRadius: '0px', backgroundColor: docelowe, transform: 'scale(1)' },
      ], { duration: 420, easing: 'cubic-bezier(.65,0,.2,1)', fill: 'forwards' }).finished;
    }
    start(zakres, { kolor: kolorLekcji, tytul, przejscie: true });
    setTimeout(() => { klon.remove(); karta.style.visibility = ''; }, 450);
  } finally { wLocie = false; }
}

function start(zakres = null, wyglad = {}) {
  uruchomLekcje({ stan: S.stan, info: S.info, zakres, ...wyglad, poKoncu: () => { render(); synchronizuj().then(() => { if (location.hash === '#/' || !location.hash) render(); }); } });
}

// ---------- dział ----------
async function ekranDzial(katId, dzId) {
  const k = await katalog();
  const kat = k.kategorie.find((x) => x.id === katId);
  const d = kat?.dzialy.find((x) => x.id === dzId);
  if (!d) { location.hash = '#/'; return; }
  const pak = k.pakiety.filter((p) => p.kategoria === katId && p.dzial === dzId && widoczny(p, S.stan.ustawienia, S.info));
  const art = k.artykuly.filter((a) => a.kategoria === katId && a.dzial === dzId && widoczny(a, S.stan.ustawienia, S.info));
  const karty = [];
  for (const meta of pak) karty.push(await kartaPakietu(meta));
  ekran('nauka',
    h('div', { class: `naglowek-dzialu kolor-${d.kolor}` },
      h('a', { class: 'wstecz', href: '#/', 'aria-label': 'Wróć', onclick: () => { if (S.info?.typ === 'dziecko') S.zakladka = dzId === 'szkola' ? 'szkola' : 'poza'; else S.zakladka = katId; } }, ik('wstecz')),
      h('small', { class: 'kat-etykieta' }, nazwaKategorii(kat)),
      d.ikona ? h('img', { class: 'nagl-ikona', src: d.ikona, alt: '' }) : null,
      h('h1', { class: 'serif' }, d.nazwa, d.ikona ? null : ` ${d.emoji}`),
      d.opis ? h('p', {}, d.opis) : null),
    pak.length ? h('h2', { class: 'sekcja' }, 'Słówka i zwroty') : null,
    h('div', { class: 'lista-pakietow' }, karty),
    art.length ? h('h2', { class: 'sekcja' }, 'Do czytania') : null,
    h('div', { class: 'lista-art' }, art.map(kartaArtykulu)));
}

async function kartaPakietu(meta) {
  const pk = await pakiet(meta.id);
  const pp = postepPakietu(pk);
  const aktywny = !!S.stan.aktywne[meta.id];
  return h('a', { class: `karta-pakietu kolor-${meta.kolor}`, href: `#/pakiet/${meta.id}` },
    h('div', { class: 'kp-gora' }, h('span', { class: 'kp-emoji' }, obrazek(meta.ikona, meta.emoji)), h('div', {},
      h('div', { class: 'kp-tytul serif' }, meta.tytul), h('small', {}, `${meta.poziom || ''} · ${pp.razem} pozycji`))),
    meta.opis ? h('div', { class: 'kp-opis' }, meta.opis) : null,
    h('div', { class: 'kp-postep' }, h('div', { class: 'kp-pasek' }, h('span', { style: { width: `${Math.round(pp.wpr / Math.max(1, pp.razem) * 100)}%` } }), h('span', { class: 'zn', style: { width: `${Math.round(pp.proc * 100)}%` } })),
      h('small', {}, aktywny ? `w nauce · znasz ${pp.zn}/${pp.razem}` : 'nierozpoczęty')));
}

function kartaArtykulu(a) {
  const czyt = !!S.stan.przeczytane[a.id];
  return h('a', { class: `karta-art kolor-${a.kolor || 'krem'}`, href: `#/artykul/${a.id}` },
    a.obraz ? h('img', { class: 'ka-obraz', src: a.obraz, alt: '', loading: 'lazy' }) : h('span', { class: 'ka-emoji' }, a.emoji || '📰'),
    h('div', { class: 'ka-txt' }, h('div', { class: 'ka-tytul serif' }, a.tytul), h('small', {}, `${a.tytul_pl || ''}`), h('small', { class: 'ka-meta' }, `${a.poziom} · ${a.slow} słów${czyt ? ' · ✓ przeczytany' : ''}`)));
}

// ---------- pakiet ----------
async function ekranPakiet(id) {
  const k = await katalog();
  const meta = k.pakiety.find((p) => p.id === id);
  if (!meta) { location.hash = '#/'; return; }
  const pk = await pakiet(id);
  const pp = postepPakietu(pk);
  const aktywny = !!S.stan.aktywne[id];
  const kat = k.kategorie.find((x) => x.id === meta.kategoria);
  const lekcjaSzkolna = meta.dzial === 'szkola' && S.info?.typ === 'dziecko';
  const wstecz = meta.rodzaj === 'gramatyka' || lekcjaSzkolna ? '#/' : `#/dzial/${meta.kategoria}/${meta.dzial}`;
  if (meta.rodzaj === 'gramatyka') S.zakladka = 'gramatyka';
  if (lekcjaSzkolna) S.zakladka = 'szkola';

  const status = (ref) => {
    const c = S.stan.karty[`${ref}|p`];
    if (!S.stan.wprowadzone[ref]) return ['nowe', 'nowe'];
    if (opanowane(c)) return ['opan', 'opanowane'];
    if (znane(c)) return ['zna', 'znane'];
    return ['uczy', 'w nauce'];
  };

  const przelacz = h('button', { class: 'btn ' + (aktywny ? 'jasny' : 'ciemny'), type: 'button' }, ...(aktywny ? [ik('ptaszek'), ' W codziennej nauce'] : [ik('plus'), ' Dodaj do codziennej nauki']));
  przelacz.onclick = () => {
    if (S.stan.aktywne[id]) delete S.stan.aktywne[id]; else S.stan.aktywne[id] = Date.now();
    zapiszStan(S.stan); render();
  };

  ekran('nauka',
    h('div', { class: `naglowek-dzialu kolor-${meta.kolor}` },
      h('a', { class: 'wstecz', href: wstecz, 'aria-label': 'Wróć' }, ik('wstecz')),
      h('small', { class: 'kat-etykieta' }, meta.rodzaj === 'gramatyka' ? 'Gramatyka' : `${nazwaKategorii(kat)} · ${kat?.dzialy.find((d) => d.id === meta.dzial)?.nazwa || ''}`),
      meta.ikona ? h('img', { class: 'nagl-ikona', src: meta.ikona, alt: '' }) : null,
      h('h1', { class: 'serif' }, meta.tytul, meta.ikona ? null : ` ${meta.emoji}`),
      meta.opis ? h('p', {}, meta.opis) : null,
      h('div', { class: 'np-staty' },
        h('span', {}, h('b', {}, pp.razem), ' pozycji'), h('span', {}, h('b', {}, pp.wpr), ' poznanych'), h('span', {}, h('b', {}, pp.zn), ' znanych'))),
    h('div', { class: 'przyciski' },
      h('button', { class: 'btn glowny', type: 'button', onclick: () => start({ pakiet: id }) }, pp.wpr < pp.razem ? 'Ucz się tego pakietu' : 'Powtórz ten pakiet'),
      przelacz),
    pk.lekcja ? h('div', { class: 'gram-kroki-lista' }, krokiGramatyki(pk.lekcja).map((k, i) => krokGramatyki(k, i))) : null,
    h('h2', { class: 'sekcja' }, meta.rodzaj === 'gramatyka' ? 'Zdania do ćwiczeń' : 'Zawartość'),
    h('ul', { class: 'lista-pozycji' }, pk.pozycje.map((p) => {
      const ref = `${id}/${p.id}`;
      const [kl, t] = status(ref);
      const en = p.typ === 'gramatyka' ? p.en.replace(/_{2,}/, `[${p.odp}]`) : p.en;
      return h('li', { class: 'pozycja' + (p.typ !== 'gramatyka' ? ' klik' : ''), onclick: p.typ !== 'gramatyka' ? () => graj(p.en, 'alice') : null },
        p.obraz ? h('span', { class: 'poz-obraz' }, p.obraz) : null,
        h('div', { class: 'poz-txt' }, h('b', {}, en), h('small', {}, p.pl)),
        h('span', { class: `poz-status ${kl}` }, t),
        p.typ !== 'gramatyka' ? h('button', { class: 'audio-btn maly', type: 'button', onclick: (e) => { e.stopPropagation(); graj(p.en, 'alice'); }, 'aria-label': 'Wymowa' }, glosnik()) : null);
    })));
}

// ---------- czytanie ----------
async function ekranCzytaj() {
  const k = await katalog();
  const art = k.artykuly.filter((a) => widoczny(a, S.stan.ustawienia, S.info));
  const grupy = k.kategorie.map((kat) => ({ kat, lista: art.filter((a) => a.kategoria === kat.id) })).filter((g) => g.lista.length);
  ekran('czytaj',
    h('div', { class: 'tytul-wiersz' }, h('h1', { class: 'tytul serif' }, 'Czytaj ', h('em', {}, 'i słuchaj')), linga('czyta', 'linga-glowna')),
    h('p', { class: 'podtytul' }, 'Dotknij słowa albo wyrażenia, żeby zobaczyć tłumaczenie, usłyszeć wymowę i dodać je do nauki.'),
    grupy.map((g) => [h('h2', { class: 'sekcja' }, nazwaKategorii(g.kat)), h('div', { class: 'lista-art' }, g.lista.map(kartaArtykulu))]),
    Object.keys(S.stan.wlasne).length ? h('a', { class: 'btn jasny szeroki', href: '#/moje' }, ik('kosz'), ` Moje słówka z artykułów (${Object.keys(S.stan.wlasne).length})`) : null);
}

async function ekranArtykul(id) {
  const a = await artykul(id);
  wyczysc(app);
  const m = h('main', { class: 'ekran ekran-art' });
  app.append(m);
  const meta = (await katalog()).artykuly.find((x) => x.id === id);
  pokazArtykul(m, { ...a, obraz: meta?.obraz }, { stan: S.stan, wroc: () => history.back() });
  window.scrollTo(0, 0);
}

function ekranMoje() {
  const lista = Object.entries(S.stan.wlasne).sort((a, b) => b[1].u - a[1].u);
  ekran('czytaj',
    h('div', { class: 'naglowek-dzialu kolor-brzoskwinia' },
      h('a', { class: 'wstecz', href: '#/czytaj', 'aria-label': 'Wróć' }, ik('wstecz')),
      h('h1', { class: 'serif' }, 'Moje słówka'),
      h('p', {}, 'Wyrażenia dodane z artykułów. Wchodzą do lekcji jako pierwsze nowe pozycje.')),
    h('ul', { class: 'lista-pozycji' }, lista.map(([id, w]) => {
      const p = pozycjaWlasna(id, w);
      return h('li', { class: 'pozycja klik', onclick: () => graj(p.en, 'alice') },
        h('div', { class: 'poz-txt' }, h('b', {}, p.en), h('small', {}, p.pl)),
        h('button', { class: 'audio-btn maly', type: 'button', onclick: (e) => { e.stopPropagation(); graj(p.en, 'alice'); }, 'aria-label': 'Wymowa' }, glosnik()),
        h('button', { class: 'ikona-btn maly', type: 'button', 'aria-label': 'Usuń', onclick: (e) => {
          e.stopPropagation();
          potwierdz({ tytul: `Usunąć „${p.en}”?`, tekst: 'Zniknie z Twoich słówek i powtórek.', tak: 'Usuń', niebezpieczne: true, poza: 'zdziwiony' }).then((ok) => {
          if (!ok) return;
          delete S.stan.wlasne[id]; delete S.stan.wprowadzone[`wlasne/${id}`];
          delete S.stan.karty[`wlasne/${id}|r`]; delete S.stan.karty[`wlasne/${id}|p`];
          zapiszStan(S.stan); render();
          });
        }, 'aria-label': 'Usuń' }, ik('zamknij')));
    })));
}

// ---------- liga i odznaki ----------
function ekranLiga() {
  const inne = inneZPamieci();
  const lista = rodzina().profile.map((p) => {
    const st = p.id === S.id ? S.stan : inne[p.id];
    return { ...p, xp: xpTygodnia(st), seria: st ? seria(st).dni : 0 };
  }).sort((a, b) => b.xp - a.xp);
  const start = poczatekTygodnia();
  const dni = [...Array(7)].map((_, i) => { const d = new Date(start + 'T12:00:00'); d.setDate(d.getDate() + i); return dzien(d); });
  const xpD = dni.map((d) => Object.values(S.stan.xp[d] || {}).reduce((a, b) => a + b, 0));
  const max = Math.max(S.stan.ustawienia.cel, ...xpD);
  const st = statystyki(S.stan);
  const doKonca = Math.ceil((new Date(start + 'T00:00:00').getTime() + 7 * 864e5 - Date.now()) / 864e5);
  ekran('liga',
    h('div', { class: 'tytul-wiersz' }, h('h1', { class: 'tytul serif' }, 'Liga ', h('em', {}, 'rodzinna')), linga('podium', 'linga-glowna szeroka')),
    h('p', { class: 'podtytul' }, `XP z tego tygodnia · koniec za ${doKonca} ${doKonca === 1 ? 'dzień' : 'dni'}`),
    !konfig()?.token ? h('p', { class: 'uwaga-box' }, 'Włącz synchronizację w Profilu, żeby widzieć punkty pozostałych osób.') : null,
    h('ol', { class: 'liga' }, lista.map((p, i) => h('li', { class: 'liga-wiersz' + (p.id === S.id ? ' ja' : '') },
      h('span', { class: 'liga-miejsce' }, (p.xp > 0 && ['🥇', '🥈', '🥉'][i]) || `${i + 1}.`),
      h('span', { class: 'liga-avatar' }, awatar(p.avatar)),
      h('span', { class: 'liga-imie' }, p.imie, p.seria ? h('small', { class: 'liga-seria' }, ik('plomien'), p.seria) : null),
      h('b', { class: 'liga-xp' }, `${p.xp} XP`)))),
    h('h2', { class: 'sekcja' }, 'Twój tydzień'),
    h('div', { class: 'wykres' }, dni.map((d, i) => h('div', { class: 'wykres-kol' + (d === dzien() ? ' dzis' : '') },
      h('span', { class: 'wykres-wart' }, xpD[i] || ''),
      h('div', { class: 'wykres-slup' + (xpD[i] >= S.stan.ustawienia.cel ? ' cel' : ''), style: { height: `${Math.round((xpD[i] / max) * 100)}%` } }),
      h('small', {}, ['pn', 'wt', 'śr', 'cz', 'pt', 'sb', 'nd'][i])))),
    h('div', { class: 'staty' },
      h('div', { class: 'kafel lila' }, h('small', {}, 'Znasz na pamięć'), h('b', {}, st.znane)),
      h('div', { class: 'kafel mietowy' }, h('small', {}, 'Opanowane'), h('b', {}, st.opanowane)),
      h('div', { class: 'kafel zolty' }, h('small', {}, 'XP razem'), h('b', {}, st.xp)),
      h('div', { class: 'kafel rozowy' }, h('small', {}, 'Lekcje'), h('b', {}, st.lekcje))),
    h('h2', { class: 'sekcja' }, 'Odznaki'),
    h('div', { class: 'odznaki' }, ODZNAKI.filter((o) => !o.dla || o.dla === (S.info?.typ === 'dziecko' ? 'dzieci' : 'dorosli') || S.stan.odznaki[o.id]).map((o) => h('div', { class: 'odznaka' + (S.stan.odznaki[o.id] ? ' zdobyta' : '') },
      h('span', { class: 'odznaka-emoji' }, obrazOdznaki(o.id)), h('b', {}, o.nazwa), h('small', {}, o.opis)))));
}

// ---------- profil i ustawienia ----------
const AVATARY = Object.keys(AWATARY_OBRAZKI);
const GODZINY = [7, 8, 12, 15, 16, 17, 18, 19, 20, 21];

function ekranProfil() {
  const u = S.stan.ustawienia;
  const zmienUst = (f) => { f(u); u.u = Date.now(); zapiszStan(S.stan); };
  const info = S.info;
  const zmienInfo = (f) => {
    const r = rodzina();
    const p = r.profile.find((x) => x.id === S.id); f(p); r.u = Date.now(); zapiszRodzine(r); S.info = p;
  };
  const c = konfig();
  const statusSync = { off: 'wyłączona', trwa: 'synchronizuję…', ok: 'działa ✓', blad: `błąd: ${S.synchroBlad}` }[S.synchro];
  const tokenInput = h('input', { class: 'pole', type: 'password', placeholder: c?.token ? '•••••••• (zapisany)' : 'github_pat_…', autocomplete: 'off' });

  const pushStatus = h('small', { class: 'maly' }, '');
  const pushToggle = h('input', { type: 'checkbox', checked: u.przypomnienia.wl });
  pushToggle.onchange = async () => {
    if (pushToggle.checked) {
      try { await wlaczPush(); pushStatus.textContent = 'Przypomnienia włączone na tym urządzeniu.'; } catch (e) { pushToggle.checked = false; pushStatus.textContent = e.message; return; }
    }
    zmienUst((x) => { x.przypomnienia.wl = pushToggle.checked; });
    synchronizuj();
  };

  ekran('profil',
    h('div', { class: 'profil-gora' },
      h('span', { class: 'profil-duzy-avatar' }, awatar(info.avatar)),
      h('div', {}, h('h1', { class: 'serif' }, info.imie), h('small', {}, info.typ === 'dziecko' ? 'profil dziecka' : `poziom ${info.poziom}`))),
    h('section', { class: 'ust' },
      h('h2', { class: 'sekcja' }, 'Cel dzienny'),
      h('div', { class: 'wybor-cel' }, CELE.map((cl) => h('button', {
        class: 'cel-btn' + (u.cel === cl.xp ? ' akt' : ''), type: 'button', onclick: () => { zmienUst((x) => { x.cel = cl.xp; }); render(); },
      }, h('b', {}, cl.opis), h('small', {}, `${cl.xp} XP · ${cl.czas}`)))),
      h('label', { class: 'wiersz' }, h('span', {}, 'Nowych pozycji dziennie'), h('span', { class: 'liczba' },
        h('button', { class: 'ikona-btn maly', type: 'button', onclick: () => { zmienUst((x) => { x.nowychDziennie = Math.max(2, x.nowychDziennie - 2); }); render(); } }, '−'),
        h('b', {}, u.nowychDziennie),
        h('button', { class: 'ikona-btn maly', type: 'button', onclick: () => { zmienUst((x) => { x.nowychDziennie = Math.min(30, x.nowychDziennie + 2); }); render(); } }, '+'))),
      h('label', { class: 'wiersz' }, h('span', {}, 'Pokazuj dział „Praca”'), h('input', { type: 'checkbox', checked: u.pokazPrace, onchange: (e) => { zmienUst((x) => { x.pokazPrace = e.target.checked; }); } })),
      h('label', { class: 'wiersz' }, h('span', {}, 'Wolniejsze nagrania'), h('input', { type: 'checkbox', checked: pobierzTempo() < 1, onchange: (e) => { ustawTempo(e.target.checked ? 0.75 : 1); localStorage.setItem('lz.tempo', e.target.checked ? '0.75' : '1'); } }))),
    h('section', { class: 'ust' },
      h('div', { class: 'sekcja-z-linga' }, h('h2', { class: 'sekcja' }, 'Przypomnienia'), linga('przypomnienia', 'linga-mala')),
      h('label', { class: 'wiersz' }, h('span', {}, 'Powiadomienia na tym urządzeniu'), pushToggle),
      h('div', { class: 'maly' }, 'O których godzinach przypominać:'),
      h('div', { class: 'chipy' }, GODZINY.map((g) => h('button', {
        class: 'chip' + (u.przypomnienia.godziny.includes(g) ? ' akt' : ''), type: 'button',
        onclick: (e) => {
          zmienUst((x) => { const gs = new Set(x.przypomnienia.godziny); if (gs.has(g)) gs.delete(g); else gs.add(g); x.przypomnienia.godziny = [...gs].sort((a, b) => a - b); });
          e.currentTarget.classList.toggle('akt'); synchronizuj();
        },
      }, `${g}:00`))),
      h('label', { class: 'wiersz' }, h('span', {}, 'Tylko gdy cel dnia nie jest zrobiony'), h('input', { type: 'checkbox', checked: u.przypomnienia.tylkoGdyBrak, onchange: (e) => { zmienUst((x) => { x.przypomnienia.tylkoGdyBrak = e.target.checked; }); synchronizuj(); } })),
      pushStatus,
      h('p', { class: 'maly' }, 'Na iPhonie powiadomienia działają, gdy Lingoza jest dodana do ekranu początkowego (Udostępnij → Do ekranu początkowego).')),
    h('section', { class: 'ust' },
      h('h2', { class: 'sekcja' }, 'Wygląd profilu'),
      h('label', { class: 'wiersz' }, h('span', {}, 'Imię'), h('input', { class: 'pole krotkie', value: info.imie, onchange: (e) => { zmienInfo((p) => { p.imie = e.target.value.trim() || p.imie; }); synchronizuj(); } })),
      info.typ !== 'dziecko' ? h('label', { class: 'wiersz' }, h('span', {}, 'Poziom'), h('select', { class: 'pole krotkie', onchange: (e) => { zmienInfo((p) => { p.poziom = e.target.value; }); synchronizuj(); } },
        ['A1', 'A2', 'B1', 'B2', 'C1'].map((l) => h('option', { value: l, selected: l === info.poziom }, l)))) : null,
      h('div', { class: 'chipy' }, AVATARY.map((a) => h('button', { class: 'chip duzy' + (a === info.avatar ? ' akt' : ''), type: 'button', onclick: () => { zmienInfo((p) => { p.avatar = a; }); render(); synchronizuj(); } }, awatar(a))))),
    h('section', { class: 'ust' },
      h('h2', { class: 'sekcja' }, 'Synchronizacja'),
      h('p', { class: 'maly' }, `Postępy i liga przez prywatne repozytorium ${REPO_DANYCH}. Status: ${statusSync}`),
      tokenInput,
      h('div', { class: 'przyciski' },
        h('button', { class: 'btn ciemny', type: 'button', onclick: async () => {
          const t = tokenInput.value.trim() || c?.token;
          if (!t) return;
          ustawKonfig({ token: t, repo: REPO_DANYCH });
          await synchronizuj(); render();
        } }, c?.token ? 'Synchronizuj teraz' : 'Włącz'),
        c?.token ? h('button', { class: 'btn jasny', type: 'button', onclick: async () => { if (await potwierdz({ tytul: 'Wyłączyć synchronizację?', tekst: 'Postępy zostaną na tym urządzeniu i w repozytorium, ale przestaną się wymieniać.', tak: 'Wyłącz', niebezpieczne: true })) { ustawKonfig(null); S.synchro = 'off'; render(); } } }, 'Wyłącz') : null)),
    h('section', { class: 'ust' },
      h('a', { class: 'btn jasny szeroki', href: '#/moje' }, ik('kosz'), ` Moje słówka (${Object.keys(S.stan.wlasne).length})`),
      h('button', { class: 'btn jasny szeroki', type: 'button', onclick: () => { ustawProfil(null); S.id = null; render(); } }, ik('ludzie'), ' Zmień profil')),
    h('p', { class: 'stopka-app maly' }, `Lingoza · urządzenie ${urzadzenie()}`));
}

const b64uNaBajty = (b64) => {
  const p = '='.repeat((4 - (b64.length % 4)) % 4);
  return Uint8Array.from(atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
};

async function wlaczPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('To urządzenie nie obsługuje powiadomień. Na iPhonie dodaj Lingozę do ekranu początkowego i otwórz ją stamtąd.');
  }
  const zgoda = await Notification.requestPermission();
  if (zgoda !== 'granted') throw new Error('Brak zgody na powiadomienia.');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uNaBajty(VAPID_PUBLICZNY) });
  await zapiszSubskrypcje(S.id, urzadzenie(), sub.toJSON(), {});
}

// ---------- nawigacja ----------
let renderNr = 0;
async function render() {
  const nr = ++renderNr;
  if (!S.id) { ekranProfili(); return; }
  const [, ekr, a, b] = (location.hash || '#/').split('/');
  try {
    if (!ekr) await ekranNauka();
    else if (ekr === 'dzial') await ekranDzial(a, b);
    else if (ekr === 'pakiet') await ekranPakiet(a);
    else if (ekr === 'czytaj') await ekranCzytaj();
    else if (ekr === 'artykul') await ekranArtykul(a);
    else if (ekr === 'moje') ekranMoje();
    else if (ekr === 'liga') ekranLiga();
    else if (ekr === 'profil') ekranProfil();
    else await ekranNauka();
  } catch (e) {
    if (nr !== renderNr) return;
    wyczysc(app).append(h('main', { class: 'ekran' }, h('h1', { class: 'serif' }, 'Ups'), h('p', {}, e.message), h('a', { class: 'btn glowny', href: '#/' }, 'Na start')));
    console.error(e);
  }
}

window.addEventListener('hashchange', () => { if (!document.body.classList.contains('w-lekcji')) render(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.id) synchronizuj().then(() => { if (!document.body.classList.contains('w-lekcji') && !location.hash.startsWith('#/artykul')) render(); });
});

// start
ustawTempo(Number(localStorage.getItem('lz.tempo') || 1));
const zapisany = aktualnyProfil();
if (zapisany && profilInfo(zapisany)) { wybierzProfil(zapisany); await startoweAktywne(); }
render();
if (S.id) synchronizuj().then(() => { if (!document.body.classList.contains('w-lekcji') && !location.hash.startsWith('#/artykul')) render(); });
setInterval(() => { if (document.visibilityState === 'visible' && S.id && !document.body.classList.contains('w-lekcji')) synchronizuj(); }, 120000);

if ('serviceWorker' in navigator && location.hostname !== '127.0.0.1') navigator.serviceWorker.register('sw.js');

// do testów w konsoli
window.lz = { S, render };
void State;
