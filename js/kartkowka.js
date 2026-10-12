// Kartkówka ze zdjęcia podręcznika: pakiet `rodzaj: "kartkowka"` podzielony na bloki (jeden typ zadań = jeden blok).
// Zasady jak w Matmozie: zła odpowiedź zatrzymuje ćwiczenie, pokazuje rozwiązanie i chwilę blokuje „Dalej”,
// błędne zadanie wraca w tym samym bloku, liczy się pierwsze podejście, na końcu podsumowanie i „Wyślij wynik”.

import { h, wyczysc, mieszaj } from './dom.js';
import { CWICZENIA, krokiGramatyki, krokGramatyki, ustawBlokadePoBledzie } from './cwiczenia.js';
import { pakiet, pozycja } from './content.js';
import { dodajXP, zaliczLekcje } from './game.js';
import { zapiszStan } from './store.js';
import { stop } from './audio.js';
import { dzwiek, zerujSerie } from './dzwieki.js';
import { linga, potwierdz, ik } from './grafiki.js';
import { przyciskWyslij, minuty, procent } from './wynik.js';

const BLOKADA_MS = 1200;
export const CWICZENIA_KARTKOWKI = ['plen', 'wpisz', 'enpl', 'enpl-wpisz', 'sluchaj', 'sluchaj-wpisz', 'obrazek', 'dyktando', 'uloz', 'luka', 'gram-wybor', 'gram-wpisz'];
const KOLORY = ['lila', 'mietowy', 'zolty', 'brzoskwinia', 'niebieski', 'rozowy'];

const odm = (n, a, b, c) => { const j = n % 10, d = n % 100; return n === 1 ? a : j >= 2 && j <= 4 && (d < 12 || d > 14) ? b : c; };
const gwiazdki = (dob, ile) => (!ile || !dob ? 0 : dob === ile ? 3 : dob / ile >= 0.8 ? 2 : 1);
const pokazGwiazdki = (n, klasa = '') => h('span', { class: 'gwiazdki-wynik ' + klasa, 'aria-label': `${n} z 3 gwiazdek` }, [1, 2, 3].map((i) => ik('gwiazda', i <= n ? 'pelna' : 'pusta')));
export const kolorBloku = (pk, i) => (i === 0 && pk.kolor ? pk.kolor : KOLORY[i % KOLORY.length]);

// które ćwiczenie dla pozycji w bloku: z listy bloku, a zdania gramatyczne zawsze ćwiczeniem gramatycznym
function cwiczenieDla(blok, p, nr) {
  const lista = (blok.cwiczenia || ['plen', 'wpisz']).filter((c) => CWICZENIA_KARTKOWKI.includes(c));
  const pasuje = lista.filter((c) => (p.typ === 'gramatyka') === c.startsWith('gram-'));
  const z = pasuje.length ? pasuje : p.typ === 'gramatyka' ? ['gram-wybor'] : ['plen'];
  return z[nr % z.length];
}

const opisZadania = (p) => (p.typ === 'gramatyka' ? p.en.replace(/_{2,}/, '___') : `${p.pl} → ${p.en}`);

/**
 * uruchomKartkowke({ stan, info, id, bloki?: [idBloku], tylkoPozycje?: { idBloku: [idPozycji] }, poKoncu })
 */
export async function uruchomKartkowke({ stan, info, id, bloki: wybraneBloki, tylkoPozycje, poKoncu }) {
  const pk = await pakiet(id);
  const start = Date.now();
  const bloki = [];
  for (const [nr, b] of pk.bloki.entries()) {
    if (wybraneBloki && !wybraneBloki.includes(b.id)) continue;
    const ids = tylkoPozycje ? tylkoPozycje[b.id] || [] : mieszaj(b.pozycje).slice(0, b.ile || b.pozycje.length);
    if (!ids.length) continue;
    const kolejka = [];
    for (const [i, pid] of ids.entries()) {
      const p = await pozycja(`${pk.id}/${pid}`, stan);
      if (p) kolejka.push({ p, cw: cwiczenieDla(b, p, i), powtorka: false });
    }
    bloki.push({ blok: b, nr, kolejka, wyniki: [] });
  }

  const ekran = h('div', { class: 'lekcja w-kolorze kartkowka' });
  const pasek = h('div', { class: 'postep-wew' });
  const tytulEl = h('div', { class: 'lekcja-tytul serif' });
  const pole = h('div', { class: 'cw-pole' });
  const zamknij = h('button', { class: 'zamknij', type: 'button', 'aria-label': 'Przerwij kartkówkę' }, ik('zamknij'));
  ekran.append(h('div', { class: 'lekcja-gora' }, zamknij, h('div', { class: 'postep' }, pasek)), tytulEl, pole);
  document.body.append(ekran);
  document.body.classList.add('w-lekcji');
  ustawBlokadePoBledzie(BLOKADA_MS);

  let przerwano = false;
  let rozwiaz;
  const koniec = new Promise((r) => { rozwiaz = r; });
  const zakoncz = () => { stop(); ustawBlokadePoBledzie(0); ekran.remove(); document.body.classList.remove('w-lekcji'); rozwiaz(); };
  const ustawKolor = (b) => { ekran.className = `lekcja w-kolorze kartkowka kolor-${kolorBloku(pk, b.nr)}`; };
  const odswiezPasek = (nrB, poz) => {
    const razem = bloki.reduce((n, b) => n + b.kolejka.length, 0);
    const zrob = bloki.slice(0, nrB).reduce((n, b) => n + b.kolejka.length, 0) + poz;
    pasek.style.width = `${procent(zrob, razem)}%`;
  };

  zamknij.onclick = async () => {
    if (!(await potwierdz({ tytul: 'Przerwać kartkówkę?', tekst: 'Wynik zapisze się jako przerwany. Możesz go i tak wysłać.', tak: 'Przerwij', nie: 'Ćwiczę dalej', poza: 'serce' }))) return;
    przerwano = true;
    podsumowanie(true);
  };

  function wstep(b, nrB) {
    ustawKolor(b);
    tytulEl.textContent = '';
    wyczysc(pole);
    const ile = b.kolejka.length;
    const kroki = b.blok.lekcja ? krokiGramatyki(b.blok.lekcja) : [];
    zerujSerie(); dzwiek('start-bloku');
    pole.append(h('div', { class: 'gram-lekcja' },
      h('div', { class: 'kat-etykieta' }, `Blok ${nrB + 1} z ${bloki.length} · ${ile} ${odm(ile, 'zadanie', 'zadania', 'zadań')}`),
      h('h2', { class: 'serif kartkowka-tytul' }, b.blok.tytul),
      b.blok.polecenie ? h('p', { class: 'kartkowka-polecenie' }, b.blok.polecenie) : null,
      kroki.length ? h('div', { class: 'gram-kroki-lista' }, kroki.map((k, i) => krokGramatyki(k, i))) : null));
    const st = h('div', { class: 'stopka' });
    pole.append(st);
    return new Promise((res) => {
      const btn = h('button', { class: 'btn glowny szeroki', type: 'button', onclick: () => res() }, 'Zaczynam');
      st.append(btn);
      btn.focus();
    });
  }

  function koniecBloku(b, nrB) {
    const dob = b.wyniki.filter((x) => x.dobrze).length;
    stop(); dzwiek(dob === b.wyniki.length ? 'blok-idealny' : 'blok-gotowy');
    const g = gwiazdki(dob, b.wyniki.length);
    wyczysc(pole);
    tytulEl.textContent = '';
    pole.append(h('div', { class: 'podsum' },
      linga(g === 3 ? 'puchar' : 'kciuk', 'linga-duza'),
      h('div', { class: 'kat-etykieta' }, `Blok ${nrB + 1} z ${bloki.length} gotowy`),
      h('h2', { class: 'serif' }, b.blok.tytul),
      pokazGwiazdki(g, 'duze'),
      h('div', { class: 'wynik-duzy serif' }, `${dob}/${b.wyniki.length}`),
      h('p', { class: 'maly' }, 'dobrze za pierwszym razem')));
    const st = h('div', { class: 'stopka' });
    pole.append(st);
    return new Promise((res) => {
      const btn = h('button', { class: 'btn glowny szeroki', type: 'button', onclick: () => res() }, `Dalej: ${bloki[nrB + 1].blok.tytul}`);
      st.append(btn);
      btn.focus();
    });
  }

  function podsumowanie(przerwane) {
    const wszystkie = bloki.flatMap((b) => b.wyniki);
    const dob = wszystkie.filter((x) => x.dobrze).length;
    const proba = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), d: start, czas: Math.round((Date.now() - start) / 1000),
      ile: wszystkie.length, dobrze: dob, przerwane: przerwane || undefined,
      tylko: wybraneBloki || tylkoPozycje ? true : undefined, powtorka: tylkoPozycje ? true : undefined,
      bloki: bloki.filter((b) => b.wyniki.length).map((b) => ({ id: b.blok.id, tytul: b.blok.tytul, ile: b.wyniki.length, dobrze: b.wyniki.filter((x) => x.dobrze).length })),
      bledy: wszystkie.filter((x) => !x.dobrze).map(({ blok, pid, opis }) => ({ blok, pid, opis })),
    };
    if (proba.ile) {
      stan.kartkowki = stan.kartkowki || {};
      stan.kartkowki[pk.id] = [...(stan.kartkowki[pk.id] || []), proba].slice(-100);
      if (!przerwane) zaliczLekcje(stan);
      zapiszStan(stan);
    }
    const g = gwiazdki(dob, proba.ile);
    if (!przerwane) { stop(); dzwiek(dob === proba.ile ? 'bez-bledow' : 'lekcja-gotowa'); }
    const doPowtorki = {};
    for (const x of proba.bledy) (doPowtorki[x.blok] = doPowtorki[x.blok] || []).push(x.pid);
    const tekst = [
      `Lingoza · ${info?.imie || ''}`,
      `${pk.tytul}${przerwane ? ' (przerwane)' : ''}${proba.powtorka ? ' (powtórka pomyłek)' : ''}`,
      `Dobrze za pierwszym razem: ${dob} z ${proba.ile} (${procent(dob, proba.ile)}%) · błędów: ${proba.ile - dob}`,
      ...proba.bloki.map((b) => `• ${b.tytul}: ${b.dobrze}/${b.ile}`),
      proba.bledy.length ? 'Do powtórki: ' + proba.bledy.slice(0, 10).map((x) => x.opis).join('; ') : 'Bez błędów!',
      `Czas: ${minuty(proba.czas * 1000)} min`,
    ].join('\n');

    wyczysc(pole);
    tytulEl.textContent = '';
    pasek.style.width = '100%';
    pole.append(h('div', { class: 'podsum' },
      linga(g === 3 ? 'puchar' : g ? 'konfetti' : 'serce', 'linga-duza'),
      h('div', { class: 'kat-etykieta' }, przerwane ? 'Przerwane' : 'Kartkówka zrobiona'),
      h('h2', { class: 'serif' }, pk.tytul),
      pokazGwiazdki(g, 'duze'),
      h('div', { class: 'podsum-kafle' },
        h('div', { class: 'kafel bialy' }, h('small', {}, 'Dobrze za 1. razem'), h('b', {}, `${dob}/${proba.ile}`)),
        h('div', { class: 'kafel rozowy' }, h('small', {}, odm(proba.ile - dob, 'Błąd', 'Błędy', 'Błędów')), h('b', {}, proba.ile - dob)),
        h('div', { class: 'kafel zolty' }, h('small', {}, 'Czas'), h('b', {}, `${minuty(proba.czas * 1000)} min`))),
      przyciskWyslij(tekst),
      h('div', { class: 'sekcja' }, 'Bloki'),
      h('ul', { class: 'lista-pozycji' }, proba.bloki.map((b) => h('li', { class: 'pozycja' },
        h('div', { class: 'poz-txt' }, h('b', {}, b.tytul)), pokazGwiazdki(gwiazdki(b.dobrze, b.ile)),
        h('span', { class: 'poz-status ' + (b.dobrze === b.ile ? 'opan' : 'uczy') }, `${b.dobrze}/${b.ile}`)))),
      proba.bledy.length ? [h('div', { class: 'sekcja' }, 'Do powtórki'),
        h('ul', { class: 'lista-pozycji' }, proba.bledy.map((x) => h('li', { class: 'pozycja blad' }, h('div', { class: 'poz-txt' }, h('b', {}, x.opis)))))]
        : h('p', { class: 'podsum-cel' }, 'Bez błędów — tak trzymaj!'),
      h('div', { class: 'przyciski kolumna' },
        proba.bledy.length ? h('button', { class: 'btn glowny', type: 'button', onclick: () => { zakoncz(); uruchomKartkowke({ stan, info, id, tylkoPozycje: doPowtorki, poKoncu }); } }, 'Powtórz pomyłki') : null,
        h('button', { class: 'btn jasny', type: 'button', onclick: () => { zakoncz(); uruchomKartkowke({ stan, info, id, bloki: wybraneBloki, poKoncu }); } }, 'Jeszcze raz'),
        h('button', { class: 'btn jasny', type: 'button', onclick: () => { zakoncz(); poKoncu?.(); } }, 'Zakończ'))));
    pole.scrollTop = 0;
  }

  (async () => {
    for (const [nrB, b] of bloki.entries()) {
      await wstep(b, nrB);
      if (przerwano) return;
      ustawKolor(b);
      for (let poz = 0; poz < b.kolejka.length; poz++) {
        odswiezPasek(nrB, poz);
        tytulEl.textContent = b.blok.tytul;
        const el = b.kolejka[poz];
        const wynik = await CWICZENIA[el.cw](pole, el.p);
        if (przerwano) return;
        if (!el.powtorka) b.wyniki.push({ dobrze: wynik.poprawnie, blok: b.blok.id, pid: el.p.id, opis: opisZadania(el.p) });
        if (wynik.xp) dodajXP(stan, wynik.xp);
        if (!wynik.poprawnie) {
          // wraca w tym bloku za 2–4 zadania (albo na końcu), innym ćwiczeniem z listy bloku
          const gdzie = Math.min(b.kolejka.length, poz + 3 + Math.floor(Math.random() * 3));
          b.kolejka.splice(gdzie, 0, { p: el.p, cw: cwiczenieDla(b.blok, el.p, poz + 1), powtorka: true });
        }
        zapiszStan(stan);
      }
      if (nrB + 1 < bloki.length) { await koniecBloku(b, nrB); if (przerwano) return; }
    }
    podsumowanie(false);
  })();

  await koniec;
}
