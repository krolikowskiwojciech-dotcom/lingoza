// Angielski (repo: lingoza) — ekrany aplikacji i nawigacja (adresy z #, np. #/pakiet/praca-wywiad).

import { h, $, wyczysc } from './dom.js';
import {
  rodzina, zapiszRodzine, profilInfo, aktualnyProfil, ustawProfil, wczytajStan, zapiszStan, urzadzenie, CELE, dzien, scal, stylProfilu, migrujRodzine, LS,
} from './store.js';
import { katalog, pakiet, artykul, widoczny, pozycjaWlasna, kartkowkiProfilu, odswiezTresci } from './content.js';
import { uruchomKartkowke, kolorBloku } from './kartkowka.js';
import { uruchomLekcje } from './lekcja.js';
import { uruchomSerie, dlugoscSerii } from './seria.js';
import { krokiGramatyki, krokGramatyki, doWymowy } from './cwiczenia.js';
import { odpowiedzNauczycielowi, probaGeneralna, pytanieZ } from './rozmowa.js';
import { dzwiek, dzwiekiWlaczone, ustawDzwieki } from './dzwieki.js';
import { naDzis } from './session.js';
import { seria, xpDzis, xpTygodnia, poczatekTygodnia, statystyki, ODZNAKI } from './game.js';
import { znane, opanowane, State } from './srs.js';
import { graj, ustawTempo, pobierzTempo } from './audio.js';
import { pokazArtykul } from './czytnik.js';
import './dopasuj.js';
import {
  pobierzKlucze, konfig, ustawKonfig, synchronizujProfil, synchronizujRodzine, pobierzInne, inneZPamieci, zapiszSubskrypcje, REPO_DANYCH,
  synchroDostepna, OGARNIJ, OGARNIJ_TEST, kimJestem, STRONA_GLOWNA, STRONA_KONTA,
} from './sync.js';
import { VAPID_PUBLICZNY } from './config.js';
import { inicjal, obrazOdznaki, potwierdz, glosnik, ik, wroc } from './grafiki.js';

const app = $('#app');
const S = { id: null, info: null, stan: null, zakladka: 'praca', synchro: 'off', synchroBlad: '' };

// ---------- profil ----------
function wybierzProfil(id) {
  if (!id) { delete document.body.dataset.styl; }
  ustawProfil(id);
  S.id = id; S.info = profilInfo(id); S.stan = wczytajStan(id);
  S.zakladka = S.info?.typ === 'dziecko' ? 'szkola' : 'praca';
  document.body.dataset.styl = stylProfilu(S.info);
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
  if (!synchroDostepna() || !S.id) { S.synchro = 'off'; return; }
  if (synchroTrwa) return synchroTrwa;
  S.synchro = 'trwa';
  synchroTrwa = (async () => {
    try {
      await synchronizujRodzine();
      await pobierzKlucze();
      { const r = rodzina(); if (migrujRodzine(r)) zapiszRodzine(r); }
      S.info = profilInfo(S.id);
      document.body.dataset.styl = stylProfilu(S.info);
      const wynik = await synchronizujProfil(wczytajStan(S.id));
      // ten sam obiekt zostaje w użyciu (np. w trwającej lekcji), tylko dostaje scalone dane
      Object.assign(S.stan, scal(S.stan, wynik)); zapiszStan(S.stan);
      await pobierzInne(rodzina().profile.map((p) => p.id).filter((x) => x !== S.id));
      S.synchro = 'ok'; S.synchroBlad = '';
      odswiezPush();
    } catch (e) {
      S.synchro = 'blad'; S.synchroBlad = e.message;
      // ogarnijmaterial.pl: sesja wygasła → strona logowania rodziny
      if (e.wylogowany && OGARNIJ) location.replace(STRONA_GLOWNA);
    } finally { synchroTrwa = null; }
  })();
  return synchroTrwa;
}

// ---------- elementy wspólne ----------
// dla dzieci „Poza pracą” brzmi dziwnie — pokazujemy „Poza szkołą”
const nazwaKategorii = (kat) => (kat?.id === 'poza' && S.info?.typ === 'dziecko' ? 'Poza szkołą' : kat?.nazwa || '');

const KOLORY = ['lila', 'rozowy', 'zolty', 'mietowy', 'zielony', 'brzoskwinia', 'niebieski'];

function nawigacja(aktywna) {
  const poz = [['nauka', '#/', ik('dom'), 'Nauka'], ['czytaj', '#/czytaj', ik('ksiazka'), 'Czytaj'], ['liga', '#/liga', ik('puchar'), 'Liga'], ['profil', '#/profil', inicjal(S.info, 'nav-inicjal'), 'Profil']];
  return h('nav', { class: 'nav' }, poz.map(([id, href, ik, t]) => h('a', { href, class: id === aktywna ? 'akt' : '' }, h('span', { class: 'nav-ik' }, ik), h('span', {}, t))));
}

// Zapamiętane miejsce na każdym ekranie (start — osobno dla każdej zakładki). Po powrocie z lekcji,
// „Wróć” albo odświeżeniu ekran wraca do tej samej karty, a nie na górę (Wojtek 2026-10-25: zawsze, we wszystkich lekcjach).
// Zapis w chwili wyjścia z ekranu (render) albo startu lekcji — nie z zdarzeń przewijania, które bywają wstrzymane.
const miejsca = new Map();
const kluczMiejsca = () => { const hs = location.hash || '#/'; return hs === '#/' || hs === '#' ? `#/|${S.zakladka}` : hs; };
let biezacyKlucz = null;
let miejsceZapisane = false; // start lekcji już zapisał miejsce — powrót z lekcji go nie nadpisuje
function zapamietajMiejsce() { if (biezacyKlucz) miejsca.set(biezacyKlucz, window.scrollY); }
function przywrocMiejsce() {
  biezacyKlucz = kluczMiejsca();
  const y = miejsca.get(biezacyKlucz) || 0;
  window.scrollTo(0, y);
  // talia i obrazki dopasowują się chwilę po wyrenderowaniu — poprawka po chwili
  if (y) { setTimeout(() => window.scrollTo(0, y), 60); setTimeout(() => window.scrollTo(0, y), 300); }
}

// doladuje: treść ekranu dochodzi później (talia na starcie) — miejsce przywraca wtedy sam ekran
function ekran(aktywna, ...tresc) {
  const doladuje = tresc[0] === DOLADUJE;
  if (doladuje) tresc.shift();
  wyczysc(app).append(h('main', { class: 'ekran' }, ...tresc), nawigacja(aktywna));
  if (!doladuje) przywrocMiejsce();
}
const DOLADUJE = Symbol('doladuje');

// pasek nad treścią ekranów z dolnej nawigacji: „Wróć” do startu (Nauka) w lewym górnym rogu
const gornyPasek = () => h('div', { class: 'gorny-pasek' }, wroc({ href: '#/' }));

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

// ---------- ekran wyboru profilu ----------
function ekranProfili() {
  wyczysc(app).append(h('main', { class: 'ekran profile-wybor' },
    h('div', { class: 'logo serif' }, 'Angielski'),
    h('h1', { class: 'serif' }, 'Kto się ', h('em', {}, 'dziś'), ' uczy?'),
    h('div', { class: 'profile-siatka' }, rodzina().profile.map((p, i) => h('button', {
      class: 'profil-kafel kolor-' + KOLORY[i % KOLORY.length], type: 'button',
      onclick: async () => { wybierzProfil(p.id); await startoweAktywne(); location.hash = '#/'; render(); synchronizuj().then(render); },
    }, inicjal(p, 'profil-avatar', { bialy: true }), h('b', {}, p.imie), h('small', {}, stylProfilu(p) === 'dziecko' ? 'tryb dla dzieci' : `poziom ${p.poziom}`))))));
}

// ---------- ekran główny ----------
async function ekranNauka() {
  const k = await katalog();
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

  // wymowa na wierzchu (Wojtek 2026-10-25: „bardzo je ukrywasz”): słówka z rozdziałów, które dziecko już zaczęło
  let wymowaStart = null;
  const unityW = unityKursu(k);
  if (unityW.length) {
    const zaczete = [];
    for (const u of unityW) if ((await postepUnitu(u)).some((x) => x.proc > 0)) zaczete.push(u);
    const pakietyW = (zaczete.length ? zaczete : unityW.slice(0, 1)).flatMap((u) => u.kroki.filter((e) => e.typ === 'slowka').map((e) => e.id));
    if (pakietyW.length) {
      wymowaStart = h('button', { class: 'cta cta-wymowa', type: 'button', onclick: () => { dzwiek('przycisk'); startSerii({ pakiety: pakietyW, wyjasnij: false, tryb: 'wymowa', kolor: 'lila', tytul: 'Ćwicz wymowę' }); } },
        h('span', { class: 'cta-ikona' }, ik('mikrofon')),
        h('span', { class: 'cta-txt' }, h('b', {}, 'Ćwicz wymowę'), h('small', {}, 'Mówisz do mikrofonu, aplikacja sprawdza słowo po słowie')),
        h('span', { class: 'cta-strzalka' }, '→'));
    }
  }
  const kartkowki = kartkowkiProfilu(k, S.id).filter((m) => !m.termin || dniDo(m.termin) >= -7);
  const lista = h('div', { class: 'stos' });
  // buduje zawartość zakładki w osobnym kontenerze (patrz pokazZakladke)
  const zbuduj = async (lista) => {
    wyczysc(lista);
    if (S.zakladka === 'gramatyka') {
      lista.className = 'stos';
      // gramatyka z kursu (z numerem unitu) i pozostała
      // po lekcjach każdego unitu karta „Ćwicz wszystko z Unitu N” (zdania ze wszystkich jego lekcji, wymieszane)
      const kursowa = unityKursu(k).flatMap((u) => {
        const lekcje = u.kroki.filter((e) => e.typ === 'gramatyka').map((e) => ({ ...e, etykieta: `Unit ${u.unit}` }));
        return lekcje.length > 1 ? [{ wszystko: true, unit: u, pakiety: lekcje.map((e) => e.id), etykieta: `Unit ${u.unit}` }, ...lekcje] : lekcje;
      });
      // talia: pozostała gramatyka z tyłu, kursowa od najpóźniejszej do najwcześniejszej — Unit 0 z przodu
      const inna = k.pakiety.filter((p) => p.rodzaj === 'gramatyka' && !p.kurs && widoczny(p, S.stan.ustawienia, S.info));
      // od góry: przypięte (to, czego dziecko ma się teraz uczyć), potem z kursu od Unit 0, na końcu pozostała
      const gram = [...inna.filter((p) => p.przypiety), ...kursowa, ...inna.filter((p) => !p.przypiety)];
      for (const [i, meta] of gram.entries()) {
        if (meta.wszystko) {
          const pks = await Promise.all(meta.pakiety.map((id) => pakiet(id)));
          const pp = pks.map(postepPakietu).reduce((a, b) => ({ razem: a.razem + b.razem, zn: a.zn + b.zn }), { razem: 0, zn: 0 });
          lista.append(kartaStosu({ kolor: kolorUnitu(meta.unit.unit), tytul: `Ćwicz wszystko z Unitu ${meta.unit.unit}`, etykieta: meta.etykieta, i,
            opis: `${dlugoscSerii(pp.razem, true)} zdań ze wszystkich lekcji gramatyki (${meta.pakiety.length}), wymieszane.`,
            ikona: 'grafiki/cwiczenia/cwicz-wszystko.webp', proc: pp.razem ? pp.zn / pp.razem : 0, href: `#/unit/${meta.unit.kurs}/${meta.unit.unit}`,
            pakiety: meta.pakiety, seria: { pakiety: meta.pakiety, wyjasnij: false, zdan: dlugoscSerii(pp.razem, true) } }));
          continue;
        }
        const pk = await pakiet(meta.id);
        const pp = postepPakietu(pk);
        lista.append(kartaStosu({ kolor: meta.kolor || KOLORY[i % KOLORY.length], tytul: meta.tytul, opis: meta.opis, emoji: meta.emoji, ikona: meta.ikona, proc: pp.proc, href: `#/pakiet/${meta.id}`, i, pakiety: [meta.id], etykieta: meta.etykieta, seria: { pakiety: [meta.id], zdan: dlugoscSerii(pp.razem) } }));
      }
      return;
    }
    // Lekcje dzieci: każdy pakiet z działu Szkoła (rozdział podręcznika) to osobna karta talii
    if (S.zakladka === 'szkola') {
      lista.className = 'stos';
      // kurs z podręcznika (ścieżka kroków) — gdy profil ma przypisany kurs
      // kurs z podręcznika: każdy rozdział (Unit) to karta talii, dotknięcie otwiera jego ścieżkę kroków
      const unity = unityKursu(k);
      if (unity.length) {
        // talia od góry: przypięta lekcja (największa), potem Unit 0, 1, 2…, na końcu słówka spoza kursu
        const reszta = k.pakiety.filter((p) => p.dzial === 'szkola' && !p.kurs && !p.przypiety && p.rodzaj !== 'kartkowka' && widoczny(p, S.stan.ustawienia, S.info));
        const przypiete = k.pakiety.filter((p) => p.przypiety && !p.kurs && widoczny(p, S.stan.ustawienia, S.info));
        let i = 0;
        for (const meta of przypiete) {
          const pp = postepPakietu(await pakiet(meta.id));
          lista.append(kartaStosu({ kolor: meta.kolor || 'zolty', tytul: meta.tytul, opis: meta.opis, emoji: meta.emoji, ikona: meta.ikona, proc: pp.proc, href: `#/pakiet/${meta.id}`, i: i++, pakiety: [meta.id], etykieta: 'Teraz ćwiczymy', meta: `${pp.razem} zdań` }));
        }
        for (const u of unity) {
          const stany = await postepUnitu(u);
          const gotowe = stany.filter((x) => x.gotowy).length;
          lista.append(kartaStosu({
            kolor: kolorUnitu(u.unit), tytul: u.tytul, etykieta: `Unit ${u.unit}`, i: i++, pakiety: [],
            opis: u.kroki.filter((e) => e.typ !== 'gramatyka').map((e) => e.tytul.replace(/^Unit \d+:\s*/, '')).slice(0, 4).join(' · '),
            ikona: u.kroki.find((e) => e.wlasnaIkona)?.wlasnaIkona || 'grafiki/dzialy/szkola.webp', proc: u.kroki.length ? gotowe / u.kroki.length : 0,
            meta: `${gotowe}/${u.kroki.length} kroków`, href: `#/unit/${u.kurs}/${u.unit}`,
          }));
        }
        for (const [j, meta] of reszta.entries()) {
          const pp = postepPakietu(await pakiet(meta.id));
          lista.append(kartaStosu({ kolor: meta.kolor || KOLORY[j % KOLORY.length], tytul: meta.tytul, opis: meta.opis, emoji: meta.emoji, ikona: meta.ikona, proc: pp.proc, href: `#/pakiet/${meta.id}`, i: i++, pakiety: [meta.id], meta: `${pp.razem} słówek` }));
        }
        return;
      }
      const szk = k.pakiety.filter((p) => p.kategoria === 'poza' && p.dzial === 'szkola' && widoczny(p, S.stan.ustawienia, S.info));
      for (const [i, meta] of szk.entries()) {
        const pp = postepPakietu(await pakiet(meta.id));
        lista.append(kartaStosu({ kolor: meta.kolor || KOLORY[i % KOLORY.length], tytul: meta.tytul, opis: meta.opis, emoji: meta.emoji, ikona: meta.ikona, proc: pp.proc, href: `#/pakiet/${meta.id}`, i, pakiety: [meta.id], meta: `${pp.razem} słówek` }));
      }
      if (!szk.length) lista.append(h('p', { class: 'uwaga-box' }, 'Tu pojawią się lekcje z podręcznika.'));
      return;
    }
    lista.className = 'stos';
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

  // Budowanie zakładki trwa (wczytywanie pakietów). Gdy w tym czasie dotknięto innej zakładki, starszy wynik
  // jest odrzucany — inaczej karty dwóch zakładek mieszały się w jednej talii.
  let budowa = 0;
  const pokazZakladke = async () => {
    const nr = ++budowa;
    const nowa = h('div', { class: 'stos' });
    await zbuduj(nowa);
    if (nr !== budowa) return false;
    lista.className = nowa.className;
    lista.replaceChildren(...nowa.childNodes);
    return true;
  };
  const tabs = h('div', { class: 'zakladki' }, zakladki.map(([id, t]) => h('button', {
    class: 'zakladka' + (S.zakladka === id ? ' akt' : ''), type: 'button',
    onclick: async (e) => { zapamietajMiejsce(); S.zakladka = id; biezacyKlucz = kluczMiejsca(); tabs.querySelectorAll('.zakladka').forEach((b) => b.classList.remove('akt')); e.currentTarget.classList.add('akt'); if (await pokazZakladke()) dopasujStos(lista); },
  }, t)));

  ekran('nauka', DOLADUJE,
    OGARNIJ
      // ogarnijmaterial.pl: z lewej powrót do listy przedmiotów, z prawej inicjał → wybór osoby
      ? [h('div', { class: 'naglowek gorny-pasek' },
        wroc({ href: STRONA_GLOWNA, tekst: 'Przedmioty' }),
        h('a', { class: 'avatar', href: STRONA_KONTA, 'aria-label': 'Zmień osobę' }, inicjal(S.info))),
      h('div', { class: 'naglowek-txt powitanie' }, h('small', {}, dziecko ? `Cześć, ${S.info.imie}!` : 'Twój poziom'), h('b', {}, dziecko ? 'Czas na angielski!' : `${S.info.poziom} · ${S.info.imie}`))]
      : h('div', { class: 'naglowek' },
        h('a', { class: 'avatar', href: '#/profil', 'aria-label': 'Profil' }, inicjal(S.info)),
        h('div', { class: 'naglowek-txt' }, h('small', {}, dziecko ? `Cześć, ${S.info.imie}!` : 'Twój poziom'), h('b', {}, dziecko ? 'Czas na angielski!' : `${S.info.poziom} · ${S.info.imie}`)),
        h('a', { class: 'ikona-btn', href: '#/profil', 'aria-label': 'Ustawienia' }, ik('zebatka'))),
    h('div', { class: 'tytul-wiersz' },
      h('h1', { class: 'tytul serif' }, 'Ucz się ', h('em', {}, 'angielskiego'), h('br'), 'codziennie')),
    h('button', { class: 'cta', type: 'button', onclick: () => { dzwiek('przycisk'); start(); } },
      h('span', { class: 'cta-txt' }, h('b', {}, dzis >= cel ? 'Ćwicz dalej' : 'Zacznij lekcję'), h('small', {}, opisCta)),
      h('span', { class: 'cta-strzalka' }, '→')),
    wymowaStart,
    kartkowki.length ? [h('h2', { class: 'sekcja' }, 'Przed kartkówką'), h('div', { class: 'lista-pakietow kartkowki' }, kartkowki.map(kartaKartkowki))] : null,
    tabs, lista);
  await pokazZakladke();
  dopasujStos(lista);
  przywrocMiejsce();
}

// Pochylony w perspektywie stos jest wizualnie niższy niż w układzie strony — podciągamy go pod zakładki.
const OBROTY = [-1, 0.8, -0.6, 1, -0.9, 0.6, -0.8, 1, -0.5, 0.8, -1, 0.6];
function dopasujStos(lista) {
  if (!lista.classList.contains('stos')) { lista.style.marginTop = ''; lista.style.marginBottom = ''; return; }
  // pierwsza karta (najważniejsza) największa na górze, każda kolejna w dół mniejsza, inaczej obrócona (wachlarz)
  const karty = [...lista.children];
  karty.forEach((k, i) => { k.style.setProperty('--d', i); k.style.setProperty('--obrot', `${OBROTY[i % OBROTY.length]}deg`); });
  lista.style.marginTop = '0px'; lista.style.marginBottom = '0px';
  requestAnimationFrame(() => {
    const nad = lista.previousElementSibling?.getBoundingClientRect().bottom;
    const pierwsza = karty[0]?.getBoundingClientRect().top;
    if (nad == null || pierwsza == null) return;
    lista.style.marginTop = `${-(pierwsza - nad - 18)}px`;
    // karty w dół są mniejsze, więc pod talią zostaje puste miejsce z układu — dociągamy to, co jest niżej
    requestAnimationFrame(() => {
      const r = lista.getBoundingClientRect();
      const ostatnia = karty[karty.length - 1].getBoundingClientRect().bottom;
      const luz = r.top + lista.offsetHeight - ostatnia - 24;
      if (luz > 0) lista.style.marginBottom = `${-luz}px`;
    });
  });
}

// ---------- kurs z podręcznika: ścieżka kroków (Unit → kroki) ----------
const IKONA_KROKU = { slowka: 'fiszka', gramatyka: 'gramatyka', artykul: 'czytanie', mowienie: 'mowienie', powtorka: 'powtorki' };

function stanKroku(el, pk) {
  if (el.typ === 'artykul') {
    const q = S.stan.quizy?.[el.id];
    return { gotowy: q != null || !!S.stan.przeczytane[el.id], proc: q != null && el.pytan ? q / el.pytan : S.stan.przeczytane[el.id] ? 0.6 : 0,
      opis: q != null ? `quiz ${q}/${el.pytan}` : S.stan.przeczytane[el.id] ? 'przeczytany' : `czytanka${el.pytan ? ' + quiz' : ''}` };
  }
  const pp = postepPakietu(pk);
  return { gotowy: pp.razem > 0 && pp.wpr === pp.razem, proc: pp.proc,
    opis: pp.wpr === 0 ? `${pp.razem} ${el.typ === 'gramatyka' ? 'zdań' : 'pozycji'}` : pp.wpr < pp.razem ? `poznane ${pp.wpr}/${pp.razem}` : `znasz ${pp.zn}/${pp.razem}` };
}

// rozdziały kursu z podręcznika widoczne dla profilu, w kolejności podręcznika (Unit 0 na górze)
function unityKursu(k) {
  const wid = (x) => x.kurs && widoczny(x, S.stan.ustawienia, S.info);
  const elementy = [
    ...k.pakiety.filter(wid).map((p) => ({ ...p, typ: p.rodzaj === 'gramatyka' ? 'gramatyka' : /mowienie/.test(p.id) ? 'mowienie' : 'slowka' })),
    ...k.artykuly.filter(wid).map((a) => ({ ...a, typ: 'artykul' })),
  ];
  const unity = new Map();
  for (const e of elementy) {
    const u = e.kurs.unit;
    if (!unity.has(u)) unity.set(u, { unit: u, tytul: e.kurs.unit_tytul, kroki: [] });
    unity.get(u).kroki.push(e);
  }
  return [...unity.values()].sort((a, b) => a.unit - b.unit).map((u) => ({ ...u, kurs: u.kroki[0].kurs.id, kroki: u.kroki.sort((x, y) => x.kurs.krok - y.kurs.krok) }));
}

const kolorUnitu = (n) => ['brzoskwinia', 'mietowy', 'lila', 'zolty', 'niebieski'][n % 5];

async function postepUnitu(u) {
  const stany = [];
  for (const e of u.kroki) stany.push(stanKroku(e, e.typ === 'artykul' ? null : await pakiet(e.id)));
  return stany;
}

// ścieżka kroków jednego rozdziału (ekran #/unit/<kurs>/<nr>)
async function sciezkaUnitu(lista, u) {
  const stany = await postepUnitu(u);
  const gotowe = stany.filter((x) => x.gotowy).length;
  const nastepny = stany.findIndex((x) => !x.gotowy);
  const pakietyUnitu = u.kroki.filter((e) => e.typ !== 'artykul').map((e) => e.id);
  const kolor = kolorUnitu(u.unit);
  const sekcja = h('section', { class: 'unit' },
    h('div', { class: `unit-naglowek kolor-${kolor}` },
      wroc({ href: '#/', onclick: () => { S.zakladka = 'szkola'; } }),
      h('small', { class: 'unit-znak' }, `Unit ${u.unit}`),
      h('h2', { class: 'serif' }, u.tytul),
      h('div', { class: 'unit-postep' }, h('div', { class: 'kp-pasek' }, h('span', { class: 'zn', style: { width: `${Math.round((gotowe / u.kroki.length) * 100)}%` } })),
        h('small', {}, `${gotowe}/${u.kroki.length} kroków`))));
  const slowkaU = u.kroki.filter((e) => e.typ === 'slowka').map((e) => e.id);
  if (slowkaU.length) {
    sekcja.append(h('button', { class: 'cta cta-wymowa unit-wymowa', type: 'button', onclick: () => { dzwiek('przycisk'); startSerii({ pakiety: slowkaU, wyjasnij: false, tryb: 'wymowa', kolor, tytul: `Wymowa: Unit ${u.unit}` }); } },
      h('span', { class: 'cta-ikona' }, ik('mikrofon')),
      h('span', { class: 'cta-txt' }, h('b', {}, `Ćwicz wymowę z Unitu ${u.unit}`), h('small', {}, 'Mówisz do mikrofonu, aplikacja sprawdza słowo po słowie')),
      h('span', { class: 'cta-strzalka' }, '→')));
  }
  const droga = h('ol', { class: 'droga' });
  u.kroki.forEach((e, i) => {
    const st = stany[i];
    const akt = i === nastepny;
    // kroki idą po kolei: otwierają się tylko ukończone i bieżący, dalsze są zablokowane
    const zablokowany = !st.gotowy && !akt;
    const tytulKroku = (x) => x.tytul.replace(/^Unit \d+:\s*/, '');
    const otworz = (ev) => {
      if (!zablokowany) { otworzKrok(e, ev.currentTarget.closest('.krok').querySelector('.krok-kolko')); return; }
      dzwiek('jeszcze-nie');
      const li = ev.currentTarget.closest('.krok');
      li.classList.remove('potrzasnij'); void li.offsetWidth; li.classList.add('potrzasnij');
      const info = li.querySelector('.krok-info');
      if (info) info.textContent = `Najpierw: ${tytulKroku(u.kroki[nastepny])}`;
    };
    const wezel = h('li', { class: 'krok' + (st.gotowy ? ' gotowy' : '') + (akt ? ' aktualny' : '') + (zablokowany ? ' zablokowany' : ''), style: { '--x': `${[0, 38, 58, 38, 0, -38, -58, -38][i % 8]}px` },
      // cały kafel kroku otwiera lekcję (nie tylko kółko)
      onclick: (ev) => { if (!ev.target.closest('button')) otworz(ev); } },
      h('button', { class: `krok-kolko kolor-${e.kolor || kolor}`, type: 'button', 'aria-label': zablokowany ? `${e.tytul} (zablokowane)` : e.tytul, onclick: otworz },
        // ilustracja kroku (z pakietu albo zdjęcie czytanki), inaczej ikonka rodzaju kroku
        e.wlasnaIkona || e.obraz ? h('img', { class: 'krok-foto', src: e.wlasnaIkona || e.obraz, alt: '' }) : h('img', { src: `grafiki/cwiczenia/${IKONA_KROKU[e.typ]}.webp`, alt: '' }),
        st.gotowy ? h('span', { class: 'krok-ptaszek' }, ik('ptaszek')) : null,
        zablokowany ? h('span', { class: 'krok-klodka' }, ik('klodka')) : null),
      h('div', { class: 'krok-opis' },
        /mowienie|moje-zycie|rodzina-dom/.test(e.id) ? h('span', { class: 'termin pilne' }, 'na ocenę') : null,
        h('b', {}, tytulKroku(e)), h('small', { class: zablokowany ? 'krok-info' : null }, st.opis),
        akt ? h('button', { class: 'btn glowny krok-start', type: 'button', onclick: (ev) => otworzKrok(e, ev.currentTarget.closest('.krok').querySelector('.krok-kolko')) }, st.proc > 0 ? 'Kontynuuj' : 'Start') : null));
    droga.append(wezel);
  });
  // ćwiczenia ustne z rozpoznawaniem mowy (gdy rozdział ma pakiet „mówienie” z pytaniami)
  const mowPak = u.kroki.find((e) => e.typ === 'mowienie');
  if (mowPak) {
    const pkM = await pakiet(mowPak.id);
    const wszystkie = (await Promise.all(pakietyUnitu.map((id) => pakiet(id)))).flatMap((x) => x.pozycje);
    const poKoncu = () => render();
    const dodatki = [
      { tytul: 'Odpowiedz nauczycielowi', opis: S.stan.mowienie?.pytania ? `ostatnio ${S.stan.mowienie.pytania.odpowiedzi} odpowiedzi` : 'pytania głosem, mówisz swoimi słowami', ikona: 'mowienie',
        start: () => odpowiedzNauczycielowi({ pozycje: pkM.pozycje.filter((x) => pytanieZ(x)), wszystkie, stan: S.stan, kolor, poKoncu }) },
      { tytul: `Próba generalna: ${u.tytul}`, opis: S.stan.mowienie?.proba ? `najlepszy wynik ${S.stan.mowienie.proba.najlepszy}%` : 'opowiedz wszystko — do 2 minut, raport', ikona: 'powtorki',
        start: () => probaGeneralna({ wszystkie, stan: S.stan, kolor, tytul: u.tytul, poKoncu }) },
    ];
    for (const d of dodatki) {
      droga.append(h('li', { class: 'krok mow-dodatek', style: { '--x': '0px' } },
        h('button', { class: `krok-kolko kolor-${kolor}`, type: 'button', 'aria-label': d.tytul, onclick: d.start }, h('img', { src: `grafiki/cwiczenia/${d.ikona}.webp`, alt: '' })),
        h('div', { class: 'krok-opis' }, h('span', { class: 'termin pilne' }, 'na ocenę'), h('b', {}, d.tytul), h('small', {}, d.opis))));
    }
  }
  // seria ze wszystkich lekcji gramatyki rozdziału — zawsze otwarta
  const gramUnitu = u.kroki.filter((e) => e.typ === 'gramatyka').map((e) => e.id);
  if (gramUnitu.length > 1) {
    const cwicz = (ev) => wysunKarte(ev.currentTarget.closest('.krok').querySelector('.krok-kolko'), { kolor, tytul: `Ćwicz wszystko z Unitu ${u.unit}`, seria: { pakiety: gramUnitu, wyjasnij: false } });
    droga.append(h('li', { class: 'krok powtorka', style: { '--x': '0px' }, onclick: (ev) => { if (!ev.target.closest('button')) cwicz(ev); } },
      h('button', { class: `krok-kolko kolor-${kolor}`, type: 'button', 'aria-label': `Ćwicz gramatykę z Unitu ${u.unit}`, onclick: cwicz },
        h('img', { src: 'grafiki/cwiczenia/cwicz-wszystko.webp', alt: '' })),
      h('div', { class: 'krok-opis' }, h('b', {}, `Ćwicz wszystko z Unitu ${u.unit}`), h('small', {}, `${dlugoscSerii(0, true)} zdań z gramatyki rozdziału, wymieszane`))));
  }
  // wymowa: słowa i frazy (do 4 wyrazów) ze wszystkich pakietów słówek rozdziału — zawsze otwarta
  const slowkaUnitu = u.kroki.filter((e) => e.typ === 'slowka').map((e) => e.id);
  if (slowkaUnitu.length) {
    const wymow = (ev) => wysunKarte(ev.currentTarget.closest('.krok').querySelector('.krok-kolko'), { kolor, tytul: `Wymowa: Unit ${u.unit}`, seria: { pakiety: slowkaUnitu, wyjasnij: false, tryb: 'wymowa' } });
    droga.append(h('li', { class: 'krok powtorka', style: { '--x': '0px' }, onclick: (ev) => { if (!ev.target.closest('button')) wymow(ev); } },
      h('button', { class: `krok-kolko kolor-${kolor}`, type: 'button', 'aria-label': `Ćwicz wymowę z Unitu ${u.unit}`, onclick: wymow },
        h('img', { src: 'grafiki/cwiczenia/mowienie.webp', alt: '' })),
      h('div', { class: 'krok-opis' }, h('b', {}, `Ćwicz wymowę z Unitu ${u.unit}`), h('small', {}, 'Powtarzaj za lektorem słowa i krótkie frazy'))));
  }
  // powtórka całego rozdziału
  // powtórka otwiera się, gdy w rozdziale jest już coś ukończone
  const bezPowtorki = gotowe === 0;
  const powtorz = (ev) => {
    const li = ev.currentTarget.closest('.krok');
    if (bezPowtorki) { dzwiek('jeszcze-nie'); li.classList.remove('potrzasnij'); void li.offsetWidth; li.classList.add('potrzasnij'); return; }
    wysunKarte(li.querySelector('.krok-kolko'), { kolor, tytul: `Powtórka: Unit ${u.unit}`, zakres: { pakiety: pakietyUnitu } });
  };
  droga.append(h('li', { class: 'krok powtorka' + (bezPowtorki ? ' zablokowany' : ''), style: { '--x': '0px' }, onclick: (ev) => { if (!ev.target.closest('button')) powtorz(ev); } },
    h('button', { class: `krok-kolko kolor-${kolor}`, type: 'button', 'aria-label': 'Powtórka rozdziału', onclick: powtorz },
      h('img', { src: 'grafiki/cwiczenia/powtorki.webp', alt: '' }), bezPowtorki ? h('span', { class: 'krok-klodka' }, ik('klodka')) : null),
    h('div', { class: 'krok-opis' }, h('b', {}, `Powtórka: Unit ${u.unit}`), h('small', {}, bezPowtorki ? 'otworzy się po pierwszym kroku' : 'wszystko z rozdziału, wymieszane'))));
  sekcja.append(droga);
  lista.append(sekcja);
}

async function ekranUnit(kursId, nr) {
  const u = unityKursu(await katalog()).find((x) => x.kurs === kursId && String(x.unit) === nr);
  if (!u) { location.hash = '#/'; return; }
  const lista = h('div', { class: 'sciezka-wrap' });
  await sciezkaUnitu(lista, u);
  ekran('nauka', lista);
}

function otworzKrok(e, el) {
  if (e.typ === 'artykul') { location.hash = `#/artykul/${e.id}`; return; }
  if (e.typ === 'gramatyka') { wysunKarte(el, { kolor: e.kolor || 'lila', tytul: e.tytul, seria: { pakiety: [e.id] } }); return; }
  const zakres = { pakiety: [e.id], ...(e.typ === 'mowienie' ? { tryb: 'mowienie' } : {}) };
  wysunKarte(el, { kolor: e.kolor || 'lila', tytul: e.tytul, zakres });
}

// Karta talii: dotknięcie = wysunięcie z talii i lekcja z tego działu; okrągła ikonka = lista pakietów i artykułów.
function kartaStosu({ kolor, tytul, opis, emoji, ikona, proc, href, meta, i, pakiety, etykieta, seria }) {
  const karta = h('div', { class: `karta-stos kolor-${kolor}` + (etykieta ? ' z-etykieta' : ''), role: 'button', tabindex: '0', 'aria-label': etykieta ? `${etykieta}: ${tytul}` : `${tytul} — zacznij lekcję`, style: { zIndex: i + 1 } },
    h('div', { class: 'ks-gora' }, h('div', { class: 'ks-tytul serif' }, etykieta ? h('span', { class: 'ks-etykieta' }, etykieta) : null, tytul),
      h('a', { class: 'ks-emoji', href, 'aria-label': `${tytul}: pakiety i artykuły`, onclick: (e) => e.stopPropagation() }, obrazek(ikona, emoji || '📘'))),
    opis ? h('div', { class: 'ks-opis' }, opis) : null,
    h('div', { class: 'ks-dol' }, gwiazdki(proc), meta ? h('small', {}, meta) : null),
    // gramatyka: widoczny przycisk serii (cała karta i tak ją uruchamia)
    seria ? h('span', { class: 'ks-cwicz' }, ik('graj'), ` Ćwicz · ${seria.zdan} zdań`) : null);
  const otworz = () => {
    if (!pakiety?.length) { location.hash = href; return; } // dział z samymi artykułami
    wysunKarte(karta, { kolor, tytul, zakres: { pakiety }, seria });
  };
  karta.addEventListener('click', otworz);
  karta.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); otworz(); } });
  return karta;
}

// Animacja: karta wysuwa się z talii, prostuje i rozrasta na cały ekran, który staje się ekranem lekcji.
let wLocie = false;
async function wysunKarte(karta, { kolor, tytul, zakres, seria }) {
  if (wLocie || document.body.classList.contains('w-lekcji')) return;
  wLocie = true;
  zapamietajMiejsce(); miejsceZapisane = true;
  dzwiek('przycisk');
  const kolorLekcji = kolor === 'zielony' ? 'mietowy' : kolor; // na ciemnej zieleni ćwiczenia byłyby nieczytelne
  const r = karta.getBoundingClientRect();
  const tlo = getComputedStyle(karta).backgroundColor;
  const klon = karta.cloneNode(true);
  klon.classList.add('karta-lot');
  Object.assign(klon.style, { position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, margin: '0', zIndex: '45', transform: 'none' });
  document.body.append(klon);
  karta.style.visibility = 'hidden';
  const ruch = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  // animacja może się nie skończyć (karta w tle, oszczędzanie energii) — lekcja i tak startuje po czasie
  const zCzasem = (anim, ms) => Promise.race([anim.finished.catch(() => {}), new Promise((r) => setTimeout(r, ms))]);
  try {
    if (ruch && document.visibilityState === 'visible') {
      await zCzasem(klon.animate([{ transform: `rotate(${getComputedStyle(karta).getPropertyValue('--obrot') || '0deg'})` }, { transform: 'translateY(-34px) scale(1.04) rotate(0deg)' }],
        { duration: 230, easing: 'cubic-bezier(.2,.9,.3,1.1)', fill: 'forwards' }), 400);
      klon.querySelectorAll(':scope > *').forEach((x) => x.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }));
      const docelowe = getComputedStyle(document.documentElement).getPropertyValue(`--${kolorLekcji}`).trim() || tlo;
      await zCzasem(klon.animate([
        { left: `${r.left}px`, top: `${r.top - 34}px`, width: `${r.width}px`, height: `${r.height}px`, borderRadius: '22px', backgroundColor: tlo, transform: 'scale(1.04)' },
        { left: '0px', top: '0px', width: `${innerWidth}px`, height: `${innerHeight}px`, borderRadius: '0px', backgroundColor: docelowe, transform: 'scale(1)' },
      ], { duration: 420, easing: 'cubic-bezier(.65,0,.2,1)', fill: 'forwards' }), 600);
    }
    if (seria) startSerii({ ...seria, kolor: kolorLekcji, tytul, przejscie: true }); else start(zakres, { kolor: kolorLekcji, tytul, przejscie: true });
    setTimeout(() => { klon.remove(); karta.style.visibility = ''; }, 450);
  } finally { wLocie = false; }
}

const poLekcji = () => { render(); synchronizuj().then(() => { if (location.hash === '#/' || !location.hash) render(); }); };

function start(zakres = null, wyglad = {}) {
  uruchomLekcje({ stan: S.stan, info: S.info, zakres, ...wyglad, poKoncu: poLekcji });
}

// „Ćwicz”: seria zdań z lekcji gramatyki; przy pierwszym podejściu do lekcji najpierw jej wyjaśnienie
async function startSerii({ pakiety, wyjasnij, zdan, ...wyglad }) {
  if (wyjasnij == null) {
    const pk = await pakiet(pakiety[0]);
    wyjasnij = pakiety.length === 1 && !!pk.lekcja && !pk.pozycje.some((x) => S.stan.wprowadzone[`${pk.id}/${x.id}`]);
  }
  if (document.body.classList.contains('w-lekcji')) return;
  if (wyglad.kolor === 'zielony') wyglad.kolor = 'mietowy'; // na ciemnej zieleni ćwiczenia byłyby nieczytelne
  uruchomSerie({ stan: S.stan, info: S.info, pakiety, wyjasnij, ...wyglad, poKoncu: poLekcji });
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
      wroc({ href: '#/', onclick: () => { if (S.info?.typ === 'dziecko') S.zakladka = dzId === 'szkola' ? 'szkola' : 'poza'; else S.zakladka = katId; } }),
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

// ---------- kartkówki (zestawy ze zdjęć podręcznika) ----------
const dataPL = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' });
const dniDo = (iso) => Math.round((new Date(iso + 'T12:00:00') - new Date(new Date().toDateString() + ' 12:00')) / 864e5);
const kiedyKartkowka = (iso) => { const d = dniDo(iso); return d === 0 ? 'kartkówka dziś!' : d === 1 ? 'kartkówka jutro' : d < 0 ? `kartkówka była ${dataPL(iso)}` : `kartkówka ${dataPL(iso)}`; };
const odmZadan = (n) => (n === 1 ? 'zadanie' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'zadania' : 'zadań');
const ostatniaProba = (id) => (S.stan.kartkowki?.[id] || []).filter((p) => !p.tylko).pop() || null;

function kartaKartkowki(meta) {
  const ost = ostatniaProba(meta.id);
  return h('a', { class: `karta-pakietu kolor-${meta.kolor}`, href: `#/kartkowka/${meta.id}` },
    h('div', { class: 'kp-gora' }, h('span', { class: 'kp-emoji' }, obrazek(meta.ikona || 'grafiki/cwiczenia/pisanie.webp', meta.emoji)), h('div', {},
      meta.termin ? h('span', { class: 'termin' + (dniDo(meta.termin) <= 1 && dniDo(meta.termin) >= 0 ? ' pilne' : '') }, kiedyKartkowka(meta.termin)) : null,
      h('div', { class: 'kp-tytul serif' }, meta.tytul),
      h('small', {}, `${meta.bloki} ${meta.bloki === 1 ? 'blok' : meta.bloki < 5 ? 'bloki' : 'bloków'} · ${meta.zadan} ${odmZadan(meta.zadan)}`))),
    meta.opis ? h('div', { class: 'kp-opis' }, meta.opis) : null,
    ost ? h('div', { class: 'kp-postep' }, h('small', {}, `ostatnio ${ost.dobrze}/${ost.ile} dobrze`)) : null);
}

function startKartkowki(id, opcje = {}) {
  uruchomKartkowke({ stan: S.stan, info: S.info, id, ...opcje, poKoncu: () => { render(); synchronizuj().then(() => { if (!document.body.classList.contains('w-lekcji')) render(); }); } });
}

async function ekranKartkowka(id) {
  const k = await katalog();
  const meta = k.pakiety.find((p) => p.id === id && p.rodzaj === 'kartkowka');
  if (!meta) { location.hash = '#/'; return; }
  const pk = await pakiet(id);
  const proby = S.stan.kartkowki?.[id] || [];
  const ost = ostatniaProba(id);
  ekran('nauka',
    h('div', { class: `naglowek-dzialu kolor-${meta.kolor}` },
      wroc({ href: '#/' }),
      h('small', { class: 'kat-etykieta' }, meta.termin ? kiedyKartkowka(meta.termin) : 'Kartkówka'),
      h('img', { class: 'nagl-ikona', src: meta.ikona || 'grafiki/cwiczenia/pisanie.webp', alt: '' }),
      h('h1', { class: 'serif' }, meta.tytul),
      meta.opis ? h('p', {}, meta.opis) : null,
      h('div', { class: 'np-staty' },
        h('span', {}, h('b', {}, meta.bloki), ' bloki'), h('span', {}, h('b', {}, meta.zadan), ` ${odmZadan(meta.zadan)}`),
        ost ? h('span', {}, 'ostatnio ', h('b', {}, `${ost.dobrze}/${ost.ile}`)) : null,
        proby.length > 1 ? h('span', {}, h('b', {}, proby.length), ' prób') : null)),
    h('button', { class: 'cta', type: 'button', onclick: () => startKartkowki(id) },
      h('span', { class: 'cta-txt' }, h('b', {}, 'Zaczynam całą kartkówkę'), h('small', {}, 'blok po bloku, z wyjaśnieniami')),
      h('span', { class: 'cta-strzalka' }, '→')),
    h('h2', { class: 'sekcja' }, 'Bloki — możesz przećwiczyć jeden'),
    h('ul', { class: 'lista-pozycji' }, pk.bloki.map((b, i) => {
      const n = b.ile || b.pozycje.length;
      return h('li', { class: 'pozycja klik', onclick: () => startKartkowki(id, { bloki: [b.id] }) },
        h('span', { class: `blok-nr serif kolor-${kolorBloku(pk, i)}` }, i + 1),
        h('div', { class: 'poz-txt' }, h('b', {}, b.tytul), h('small', {}, `${n} ${odmZadan(n)}`)),
        h('span', { class: 'poz-status' }, 'ćwicz'));
    })));
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

  const ileWymowy = pk.pozycje.filter(doWymowy).length;
  const przelacz = h('button', { class: 'btn ' + (aktywny ? 'jasny' : 'ciemny'), type: 'button' }, ...(aktywny ? [ik('ptaszek'), ' W codziennej nauce'] : [ik('plus'), ' Dodaj do codziennej nauki']));
  przelacz.onclick = () => {
    if (S.stan.aktywne[id]) delete S.stan.aktywne[id]; else S.stan.aktywne[id] = Date.now();
    zapiszStan(S.stan); render();
  };

  ekran('nauka',
    h('div', { class: `naglowek-dzialu kolor-${meta.kolor}` },
      wroc({ href: wstecz }),
      h('small', { class: 'kat-etykieta' }, meta.rodzaj === 'gramatyka' ? 'Gramatyka' : `${nazwaKategorii(kat)} · ${kat?.dzialy.find((d) => d.id === meta.dzial)?.nazwa || ''}`),
      meta.ikona ? h('img', { class: 'nagl-ikona', src: meta.ikona, alt: '' }) : null,
      h('h1', { class: 'serif' }, meta.tytul, meta.ikona ? null : ` ${meta.emoji}`),
      meta.opis ? h('p', {}, meta.opis) : null,
      h('div', { class: 'np-staty' },
        h('span', {}, h('b', {}, pp.razem), ' pozycji'), h('span', {}, h('b', {}, pp.wpr), ' poznanych'), h('span', {}, h('b', {}, pp.zn), ' znanych'))),
    meta.rodzaj === 'gramatyka'
      // gramatyka: od razu seria zdań; wyjaśnienie reguły osobno (po nim też seria)
      ? h('div', { class: 'przyciski', style: { flexDirection: 'column' } },
        h('button', { class: 'btn glowny', type: 'button', onclick: () => startSerii({ pakiety: [id], wyjasnij: false, kolor: meta.kolor, tytul: meta.tytul }) },
          ik('graj'), ` Ćwicz · ${dlugoscSerii(pp.razem)} zdań`),
        pk.lekcja ? h('button', { class: 'btn jasny', type: 'button', onclick: () => startSerii({ pakiety: [id], wyjasnij: true, kolor: meta.kolor, tytul: meta.tytul }) }, ik('ksiazka'), ' Wytłumacz') : null,
        przelacz)
      : h('div', { class: 'przyciski' },
        h('button', { class: 'btn glowny', type: 'button', onclick: () => start({ pakiet: id }) }, pp.wpr < pp.razem ? 'Ucz się tego pakietu' : 'Powtórz ten pakiet'),
        ileWymowy ? h('button', { class: 'btn jasny', type: 'button', onclick: () => startSerii({ pakiety: [id], wyjasnij: false, tryb: 'wymowa', kolor: meta.kolor, tytul: `${meta.tytul.replace(/^Unit \d+:\s*/, '')}: wymowa` }) },
          ik('mikrofon'), ` Ćwicz wymowę · ${Math.min(15, ileWymowy)}`) : null,
        przelacz),
    pk.lekcja ? h('div', { class: 'gram-kroki-lista' }, krokiGramatyki(pk.lekcja).map((k, i) => krokGramatyki(k, i))) : null,
    h('h2', { class: 'sekcja' }, meta.rodzaj === 'gramatyka' ? 'Zdania do ćwiczeń' : 'Zawartość'),
    h('ul', { class: 'lista-pozycji' }, pk.pozycje.map((p) => {
      const ref = `${id}/${p.id}`;
      const [kl, t] = status(ref);
      const en = p.typ === 'gramatyka' ? p.en.replace(/_{2,}/, `[${p.odp}]`) : p.en;
      return h('li', { class: 'pozycja' + (p.typ !== 'gramatyka' ? ' klik' : ''), onclick: p.typ !== 'gramatyka' ? () => graj(p.en, 'alice') : null },
        p.ilustracja ? h('img', { class: 'poz-ilustracja', src: p.ilustracja, alt: '', loading: 'lazy' }) : p.obraz ? h('span', { class: 'poz-obraz' }, p.obraz) : null,
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
    gornyPasek(),
    h('div', { class: 'tytul-wiersz' }, h('h1', { class: 'tytul serif' }, 'Czytaj ', h('em', {}, 'i słuchaj'))),
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
      wroc({ href: '#/czytaj' }),
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
    gornyPasek(),
    h('div', { class: 'tytul-wiersz' }, h('h1', { class: 'tytul serif' }, 'Liga ', h('em', {}, 'rodzinna'))),
    h('p', { class: 'podtytul' }, `XP z tego tygodnia · koniec za ${doKonca} ${doKonca === 1 ? 'dzień' : 'dni'}`),
    !synchroDostepna() ? h('p', { class: 'uwaga-box' }, OGARNIJ_TEST ? 'Tryb testowy — bez synchronizacji, widać tylko Twoje punkty.' : 'Włącz synchronizację w Profilu, żeby widzieć punkty pozostałych osób.') : null,
    h('ol', { class: 'liga' }, lista.map((p, i) => h('li', { class: 'liga-wiersz' + (p.id === S.id ? ' ja' : '') },
      h('span', { class: 'liga-miejsce serif' + (p.xp > 0 && i < 3 ? ` podium m${i + 1}` : '') }, `${i + 1}`),
      inicjal(p, 'liga-avatar'),
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
    gornyPasek(),
    h('div', { class: 'profil-gora' },
      inicjal(info, 'profil-duzy-avatar'),
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
      h('label', { class: 'wiersz' }, h('span', {}, 'Dźwięki', h('small', { class: 'pod' }, 'odpowiedzi, przyciski, wyniki (nagrania lektora grają zawsze)')),
        h('input', { type: 'checkbox', checked: dzwiekiWlaczone(), onchange: (e) => { ustawDzwieki(e.target.checked); dzwiek('przelacznik'); } })),
      h('label', { class: 'wiersz' }, h('span', {}, 'Wolniejsze nagrania'), h('input', { type: 'checkbox', checked: pobierzTempo() < 1, onchange: (e) => { ustawTempo(e.target.checked ? 0.75 : 1); localStorage.setItem('lz.tempo', e.target.checked ? '0.75' : '1'); } }))),
    h('section', { class: 'ust' },
      h('h2', { class: 'sekcja' }, 'Przypomnienia'),
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
      h('p', { class: 'maly' }, 'Na iPhonie powiadomienia działają, gdy aplikacja Angielski jest dodana do ekranu początkowego (Udostępnij → Do ekranu początkowego).')),
    h('section', { class: 'ust' },
      h('h2', { class: 'sekcja' }, 'Profil'),
      h('label', { class: 'wiersz' }, h('span', {}, 'Imię'), h('input', { class: 'pole krotkie', value: info.imie, onchange: (e) => { zmienInfo((p) => { p.imie = e.target.value.trim() || p.imie; }); synchronizuj(); } })),
      h('label', { class: 'wiersz' }, h('span', {}, 'Wygląd'), h('select', { class: 'pole krotkie', onchange: (e) => { zmienInfo((p) => { p.styl = e.target.value; }); document.body.dataset.styl = e.target.value; render(); synchronizuj(); } },
        [['dorosly', 'dorosły'], ['nastolatek', 'młodzieżowy'], ['dziecko', 'dziecięcy']].map(([v, t]) => h('option', { value: v, selected: v === stylProfilu(info) }, t)))),
      info.typ !== 'dziecko' ? h('label', { class: 'wiersz' }, h('span', {}, 'Poziom'), h('select', { class: 'pole krotkie', onchange: (e) => { zmienInfo((p) => { p.poziom = e.target.value; }); synchronizuj(); } },
        ['A1', 'A2', 'B1', 'B2', 'C1'].map((l) => h('option', { value: l, selected: l === info.poziom }, l)))) : null),
    OGARNIJ ? h('section', { class: 'ust' },
      h('h2', { class: 'sekcja' }, 'Synchronizacja'),
      h('p', { class: 'maly' }, OGARNIJ_TEST ? 'Tryb testowy (127.0.0.1) — synchronizacja wyłączona, nic nie trafia do prawdziwych danych.'
        : `Postępy zapisują się na koncie rodziny ogarnijmaterial.pl. Status: ${statusSync}`),
      !OGARNIJ_TEST ? h('div', { class: 'przyciski' }, h('button', { class: 'btn ciemny', type: 'button', onclick: async () => { await synchronizuj(); render(); } }, 'Synchronizuj teraz')) : null)
    : h('section', { class: 'ust' },
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
      OGARNIJ ? h('a', { class: 'btn jasny szeroki', href: STRONA_KONTA }, ik('ludzie'), ' Zmień osobę')
        : h('button', { class: 'btn jasny szeroki', type: 'button', onclick: () => { ustawProfil(null); S.id = null; delete document.body.dataset.styl; render(); } }, ik('ludzie'), ' Zmień profil')),
    h('p', { class: 'stopka-app maly' }, `Angielski · urządzenie ${urzadzenie()}`));
}

const b64uNaBajty = (b64) => {
  const p = '='.repeat((4 - (b64.length % 4)) % 4);
  return Uint8Array.from(atob((b64 + p).replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
};

async function wlaczPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('To urządzenie nie obsługuje powiadomień. Na iPhonie dodaj aplikację Angielski do ekranu początkowego i otwórz ją stamtąd.');
  }
  const zgoda = await Notification.requestPermission();
  if (zgoda !== 'granted') throw new Error('Brak zgody na powiadomienia.');
  const { sub } = await subskrypcjaPush(await navigator.serviceWorker.ready);
  await zapiszSubskrypcje(S.id, urzadzenie(), sub.toJSON(), {});
}

// subskrypcja z aktualnym kluczem VAPID; subskrypcję ze starym kluczem (np. po wymianie kluczy) zastępuje nową
async function subskrypcjaPush(reg) {
  const klucz = b64uNaBajty(LS.get('lz.vapid') || VAPID_PUBLICZNY);
  let sub = await reg.pushManager.getSubscription();
  const obecny = sub?.options?.applicationServerKey ? new Uint8Array(sub.options.applicationServerKey) : null;
  if (sub && obecny && (obecny.length !== klucz.length || obecny.some((b, i) => b !== klucz[i]))) { await sub.unsubscribe().catch(() => {}); sub = null; }
  if (sub) return { sub, nowa: false };
  return { sub: await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: klucz }), nowa: true };
}

// po synchronizacji: przypomnienia włączone i zgoda jest, a subskrypcji brak albo ma stary klucz → po cichu nowa
async function odswiezPush() {
  if (!S.stan?.ustawienia?.przypomnienia?.wl || !('serviceWorker' in navigator) || !('PushManager' in window) || Notification.permission !== 'granted') return;
  try {
    const { sub, nowa } = await subskrypcjaPush(await navigator.serviceWorker.ready);
    if (nowa) await zapiszSubskrypcje(S.id, urzadzenie(), sub.toJSON(), {});
  } catch { /* spróbujemy przy następnej synchronizacji */ }
}

// ---------- nawigacja ----------
let renderNr = 0;
async function render() {
  const nr = ++renderNr;
  if (miejsceZapisane) miejsceZapisane = false; else zapamietajMiejsce();
  if (!S.id) {
    // na ogarnijmaterial.pl osobę wybiera strona główna — nigdy własny ekran wyboru
    if (OGARNIJ) { if (!OGARNIJ_TEST) location.replace(STRONA_GLOWNA); else ekranBrakOsoby(); return; }
    ekranProfili(); return;
  }
  const [, ekr, a, b] = (location.hash || '#/').split('/');
  try {
    if (!ekr) await ekranNauka();
    else if (ekr === 'dzial') await ekranDzial(a, b);
    else if (ekr === 'unit') await ekranUnit(a, b);
    else if (ekr === 'pakiet') await ekranPakiet(a);
    else if (ekr === 'kartkowka') await ekranKartkowka(a);
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
document.addEventListener('visibilitychange', async () => {
  // ogarnijmaterial.pl: w międzyczasie mogła się zmienić osoba (#konta) albo skończyć sesja
  if (document.visibilityState === 'visible' && !document.body.classList.contains('w-lekcji')) odswiezTresci();
  if (document.visibilityState === 'visible' && OGARNIJ) { const id = await osobaZOgarnij(); if (id) await ustawOsobe(id); }
  if (document.visibilityState === 'visible' && S.id) synchronizuj().then(() => { if (!document.body.classList.contains('w-lekcji') && !location.hash.startsWith('#/artykul')) render(); });
});

function ekranBrakOsoby(tekst = 'Wybierz osobę na stronie ogarnijmaterial.pl.') {
  wyczysc(app).append(h('main', { class: 'ekran' },
    h('div', { class: 'gorny-pasek' }, wroc({ href: STRONA_GLOWNA, tekst: 'Przedmioty' })),
    h('h1', { class: 'serif' }, 'Kto się dziś uczy?'), h('p', {}, tekst),
    h('a', { class: 'btn glowny', href: STRONA_KONTA }, 'Wybierz osobę')));
}

const poRenderzeSynchro = () => synchronizuj().then(() => { if (!document.body.classList.contains('w-lekcji') && !location.hash.startsWith('#/artykul')) render(); });

// ogarnijmaterial.pl: osoba z sesji strony głównej (id 1:1 z profilami). null = niezalogowany → strona główna.
async function osobaZOgarnij() {
  let ja;
  try { ja = await kimJestem(); } catch { return undefined; } // bez sieci — zostaje ostatnio używany profil
  if (ja === null) { location.replace(STRONA_GLOWNA); return null; }
  return ja?.id || undefined;
}

async function ustawOsobe(id) {
  if (!id || id === S.id) return;
  if (!profilInfo(id)) { S.id = null; ekranBrakOsoby(`Nie znam osoby „${id}” w aplikacji Angielski.`); return; }
  wybierzProfil(id); await startoweAktywne();
  if (!document.body.classList.contains('w-lekcji')) render();
}

// start
ustawTempo(Number(localStorage.getItem('lz.tempo') || 1));
{ const r = rodzina(); if (migrujRodzine(r)) zapiszRodzine(r); }
if (OGARNIJ) {
  // czekamy na odpowiedź strony głównej krótko; gdy sieć jest wolna, startujemy z ostatnim profilem i poprawiamy po odpowiedzi
  const pytanie = osobaZOgarnij();
  const id = await Promise.race([pytanie, new Promise((r) => setTimeout(() => r('czas'), 1800))]);
  if (id !== null) {
    if (id === 'czas' || id === undefined) {
      const zapisany = aktualnyProfil();
      if (zapisany && profilInfo(zapisany)) { wybierzProfil(zapisany); await startoweAktywne(); render(); } else ekranBrakOsoby('Łączę się z ogarnijmaterial.pl…');
      if (id === 'czas') pytanie.then(async (x) => { if (x) await ustawOsobe(x); if (S.id) poRenderzeSynchro(); });
      else if (S.id) poRenderzeSynchro();
    } else {
      if (id !== aktualnyProfil() || !S.id) await ustawOsobe(id); else render();
      if (S.id) poRenderzeSynchro();
    }
  }
} else {
  const zapisany = aktualnyProfil();
  if (zapisany && profilInfo(zapisany)) { wybierzProfil(zapisany); await startoweAktywne(); }
  render();
  if (S.id) poRenderzeSynchro();
}
setInterval(() => { if (document.visibilityState === 'visible' && S.id && !document.body.classList.contains('w-lekcji')) synchronizuj(); }, 120000);

if ('serviceWorker' in navigator && location.hostname !== '127.0.0.1') {
  // nowa wersja aplikacji: po przejęciu strony przez nowy service worker przeładowujemy od razu (poza lekcją),
  // inaczej zmiany pokazywały się dopiero przy którymś kolejnym otwarciu
  const mialKontroler = !!navigator.serviceWorker.controller;
  let przeladowano = false;
  const przeladuj = () => {
    if (przeladowano || !mialKontroler) return;
    if (document.body.classList.contains('w-lekcji')) { document.addEventListener('visibilitychange', przeladuj, { once: true }); return; }
    przeladowano = true; location.reload();
  };
  navigator.serviceWorker.addEventListener('controllerchange', przeladuj);
  navigator.serviceWorker.register('sw.js').then((reg) => {
    // przy każdym powrocie do aplikacji sprawdzamy, czy jest nowsza wersja
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  });
}

// do testów w konsoli
window.lz = { S, render };
void State;
