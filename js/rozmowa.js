// Ćwiczenia ustne z rozpoznawaniem mowy (do odpowiedzi na ocenę):
//  • „Odpowiedz nauczycielowi” — pytanie głosem, swobodna odpowiedź, informacja zwrotna i wzorcowa odpowiedź,
//  • „Próba generalna” — wypowiedź ciągła do 2 minut, raport: tematy, słownictwo rozdziału, łączniki, czasy.

import { h, wyczysc, mieszaj } from './dom.js';
import { graj, stop } from './audio.js';
import { linga, potwierdz, ik } from './grafiki.js';
import { mozeRozpoznawac, Nagrywanie, rozpoznaj, slowa } from './mowa.js';
import { dodajXP, zaliczLekcje, sprawdzOdznaki } from './game.js';
import { zapiszStan } from './store.js';

export const pytanieZ = (p) => (p.uwaga || '').replace(/^Pytanie:\s*/, '').trim();

const LACZNIKI = ['and', 'but', 'because', 'so'];
const CZESTOSC = ['always', 'usually', 'often', 'sometimes', 'never'];
const TEMATY = [
  { id: 'ja', nazwa: 'O mnie', slowa: ['name', 'years', 'old', 'live', 'poland', 'school', 'year'] },
  { id: 'rodzina', nazwa: 'Rodzina', slowa: ['family', 'mum', 'dad', 'mother', 'father', 'sister', 'brother', 'parents', 'grandma', 'grandpa', 'gran', 'cousin'] },
  { id: 'dom', nazwa: 'Dom', slowa: ['flat', 'house', 'room', 'kitchen', 'bedroom', 'bathroom', 'living', 'garden', 'balcony', 'home'] },
  { id: 'obowiazki', nazwa: 'Obowiązki', slowa: ['bed', 'rubbish', 'dishwasher', 'table', 'vacuum', 'vacuuming', 'plants', 'washing', 'clothes', 'iron', 'dishes', 'tidy', 'chores', 'feed', 'cook', 'help'] },
  { id: 'weekend', nazwa: 'Weekend i czas wolny', slowa: ['weekend', 'saturday', 'sunday', 'friends', 'play', 'playing', 'games', 'free', 'cycling', 'football'] },
  { id: 'opinia', nazwa: 'Opinia (lubię / nie lubię, bo…)', slowa: ['like', 'love', 'hate', 'favourite', 'boring', 'fun', 'easy', 'difficult', 'smelly'] },
];

// słowa „znaczące” rozdziału (bez krótkich słów funkcyjnych) — do podświetlania w odpowiedzi
const FUNKCYJNE = new Set('i a an the to of in on at is am are my your he she it we they you and but so because do does not with for'.split(' '));
export function slownikRozdzialu(pozycje) {
  const s = new Set();
  for (const p of pozycje) for (const w of slowa(p.en || '')) if (w.length > 2 && !FUNKCYJNE.has(w)) s.add(w);
  return s;
}

function podswietlone(tekst, slownik) {
  return tekst.split(/(\s+)/).map((t) => {
    const w = slowa(t)[0];
    if (!w) return t;
    if (LACZNIKI.includes(w)) return h('mark', { class: 'm-lacznik' }, t);
    if (CZESTOSC.includes(w)) return h('mark', { class: 'm-czestosc' }, t);
    if (slownik.has(w)) return h('mark', { class: 'm-slowko' }, t);
    return t;
  });
}

function ekranCw(tytul, kolor) {
  const ekran = h('div', { class: `lekcja w-kolorze kolor-${kolor}` });
  const pasek = h('div', { class: 'postep-wew' });
  const zamknij = h('button', { class: 'zamknij', type: 'button', 'aria-label': 'Zakończ' }, ik('zamknij'));
  const pole = h('div', { class: 'cw-pole' });
  ekran.append(h('div', { class: 'lekcja-gora' }, zamknij, h('div', { class: 'postep' }, pasek)), h('div', { class: 'lekcja-tytul serif' }, tytul), pole);
  document.body.append(ekran); document.body.classList.add('w-lekcji');
  const zakoncz = () => { stop(); ekran.remove(); document.body.classList.remove('w-lekcji'); };
  return { ekran, pasek, zamknij, pole, zakoncz };
}

// przycisk mikrofonu z automatycznym limitem czasu; zwraca { blob, sekundy } albo null
function mikrofon(status, limitS, napisStart) {
  const mik = h('button', { class: 'mowa-mik', type: 'button', 'aria-label': 'Nagrywaj' }, ik('mikrofon'));
  const czas = h('div', { class: 'mowa-czas' }, '');
  let nagr = null; let t0 = 0; let tick = null; let rozwiaz;
  const wynik = new Promise((r) => { rozwiaz = r; });
  const koniec = async () => {
    clearInterval(tick); mik.disabled = true; mik.classList.remove('rec');
    const blob = await nagr.stop();
    rozwiaz({ blob, sekundy: (Date.now() - t0) / 1000 });
  };
  mik.onclick = async () => {
    if (nagr?.trwa) return koniec();
    try {
      stop();
      nagr = new Nagrywanie(); await nagr.start(); t0 = Date.now();
      mik.classList.add('rec'); status.textContent = 'Mów… dotknij jeszcze raz, gdy skończysz';
      tick = setInterval(() => {
        const s = Math.floor((Date.now() - t0) / 1000);
        czas.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} / ${Math.floor(limitS / 60)}:${String(limitS % 60).padStart(2, '0')}`;
        if (s >= limitS) koniec();
      }, 250);
    } catch { status.textContent = 'Brak dostępu do mikrofonu — pozwól na mikrofon w ustawieniach'; }
  };
  status.textContent = napisStart;
  return { mik, czas, wynik };
}

// ---------------- „Odpowiedz nauczycielowi” ----------------
export async function odpowiedzNauczycielowi({ pozycje, wszystkie, stan, kolor = 'mietowy', poKoncu }) {
  const pytania = mieszaj(pozycje.filter((p) => pytanieZ(p))).slice(0, 6);
  const slownik = slownikRozdzialu(wszystkie);
  const { pasek, zamknij, pole, zakoncz } = ekranCw('Odpowiedz nauczycielowi', kolor);
  let przerwano = false; let xp = 0; const wyniki = [];
  zamknij.onclick = async () => { if (wyniki.length && !(await potwierdz({ tytul: 'Kończymy?', tekst: 'Zdobyte punkty zostaną zapisane.', tak: 'Zakończ', nie: 'Odpowiadam dalej' }))) return; przerwano = true; zakoncz(); poKoncu?.(); };
  if (!mozeRozpoznawac()) {
    pole.append(h('div', { class: 'pusto' }, h('h2', { class: 'serif' }, 'Potrzebna synchronizacja'), h('p', {}, 'Rozpoznawanie mowy włącza się po podaniu tokenu w Profilu → Synchronizacja.'),
      h('button', { class: 'btn glowny', type: 'button', onclick: () => { zakoncz(); poKoncu?.(); } }, 'Wróć')));
    return;
  }
  for (let i = 0; i < pytania.length && !przerwano; i++) {
    pasek.style.width = `${Math.round((i / pytania.length) * 100)}%`;
    const p = pytania[i];
    const q = pytanieZ(p);
    wyczysc(pole);
    const status = h('div', { class: 'mowa-status' });
    const wynikEl = h('div', { class: 'mowa-wynik' });
    const { mik, czas, wynik } = mikrofon(status, 30, 'Dotknij mikrofonu i odpowiedz pełnym zdaniem');
    pole.append(
      h('div', { class: 'cw-polecenie' }, h('span', {}, `Pytanie ${i + 1} z ${pytania.length}`)),
      h('div', { class: 'nauczyciel' }, linga('mikrofon', 'linga-mala'),
        h('div', { class: 'dymek klik', onclick: () => graj(q, 'george') }, h('b', {}, q), h('small', {}, 'dotknij, aby posłuchać ponownie'))),
      h('div', { class: 'mowa' }, mik, czas, status, wynikEl));
    setTimeout(() => graj(q, 'george'), 300);
    const nagranie = await wynik;
    if (przerwano) return;
    status.textContent = 'Sprawdzam…';
    let tekst = '';
    try { tekst = await rozpoznaj(nagranie.blob); } catch (e) { status.textContent = e.message; }
    const w = slowa(tekst);
    const uzyte = [...new Set(w.filter((x) => slownik.has(x)))];
    const pelne = w.length >= 4;
    const pkt = !w.length ? 0 : (pelne ? 3 : 1) + Math.min(2, uzyte.length);
    xp += pkt; wyniki.push({ q, tekst, slow: w.length });
    status.textContent = !w.length ? 'Nic nie słychać — spróbuj głośniej przy następnym pytaniu'
      : pelne ? `Świetnie! ${w.length} słów${uzyte.length ? `, słówka z rozdziału: ${uzyte.length}` : ''}` : 'Spróbuj odpowiadać pełnym zdaniem (min. 4 słowa)';
    wyczysc(wynikEl).append(
      tekst ? h('div', { class: 'mowa-zdanie' }, podswietlone(tekst, slownik)) : null,
      h('div', { class: 'wzor' }, h('small', {}, 'Przykładowa odpowiedź:'),
        h('div', { class: 'klik', onclick: () => graj(p.en, 'alice') }, ik('graj'), ' ', p.en), h('small', {}, p.pl)));
    graj(p.en, 'alice');
    await new Promise((r) => {
      const st = h('div', { class: 'stopka' }, h('button', { class: 'btn glowny szeroki', type: 'button', onclick: () => { st.remove(); r(); } }, i < pytania.length - 1 ? 'Następne pytanie' : 'Zakończ'));
      pole.append(st);
    });
  }
  if (przerwano) return;
  if (xp) dodajXP(stan, xp);
  zaliczLekcje(stan);
  sprawdzOdznaki(stan, { mowil: true, godzina: new Date().getHours() });
  stan.mowienie = { ...(stan.mowienie || {}), pytania: { data: Date.now(), odpowiedzi: wyniki.length, slow: wyniki.reduce((a, x) => a + x.slow, 0) } };
  zapiszStan(stan);
  pasek.style.width = '100%';
  wyczysc(pole).append(h('div', { class: 'podsum' }, linga('konfetti', 'linga-duza'), h('h2', { class: 'serif' }, 'Dobra robota!'),
    h('div', { class: 'podsum-kafle' },
      h('div', { class: 'kafel mietowy' }, h('small', {}, 'Odpowiedzi'), h('b', {}, wyniki.length)),
      h('div', { class: 'kafel zolty' }, h('small', {}, 'Zdobyte XP'), h('b', {}, `+${xp}`)),
      h('div', { class: 'kafel rozowy' }, h('small', {}, 'Słów razem'), h('b', {}, wyniki.reduce((a, x) => a + x.slow, 0)))),
    h('button', { class: 'btn glowny szeroki', type: 'button', onclick: () => { zakoncz(); poKoncu?.(); } }, 'Dalej')));
}

// ---------------- „Próba generalna” ----------------
export async function probaGeneralna({ wszystkie, stan, kolor = 'brzoskwinia', tytul = 'Life at home', poKoncu }) {
  const slownik = slownikRozdzialu(wszystkie);
  const { pasek, zamknij, pole, zakoncz } = ekranCw(`Próba generalna: ${tytul}`, kolor);
  zamknij.onclick = () => { zakoncz(); poKoncu?.(); };
  if (!mozeRozpoznawac()) {
    pole.append(h('div', { class: 'pusto' }, h('h2', { class: 'serif' }, 'Potrzebna synchronizacja'), h('p', {}, 'Rozpoznawanie mowy włącza się po podaniu tokenu w Profilu → Synchronizacja.'),
      h('button', { class: 'btn glowny', type: 'button', onclick: () => { zakoncz(); poKoncu?.(); } }, 'Wróć')));
    return;
  }
  const poprzedni = stan.mowienie?.proba;
  const start = () => {
    wyczysc(pole);
    pasek.style.width = '0%';
    const status = h('div', { class: 'mowa-status' });
    const { mik, czas, wynik } = mikrofon(status, 120, 'Dotknij mikrofonu i opowiedz o sobie, rodzinie i domu');
    pole.append(
      h('div', { class: 'cw-polecenie' }, h('span', {}, 'Opowiedz po angielsku — do 2 minut')),
      h('p', { class: 'proba-opis' }, 'Postaraj się poruszyć wszystkie tematy:'),
      h('ul', { class: 'proba-tematy' }, TEMATY.map((t) => h('li', {}, t.nazwa))),
      h('p', { class: 'proba-opis maly' }, 'Użyj łączników and, but, because, so, słówek always / usually / never i choć raz formy „I’m …ing”.'),
      h('div', { class: 'mowa' }, mik, czas, status));
    wynik.then(async ({ blob, sekundy }) => {
      status.textContent = 'Sprawdzam całą wypowiedź…';
      pasek.style.width = '60%';
      let tekst = '';
      try { tekst = await rozpoznaj(blob); } catch (e) { status.textContent = e.message; return; }
      raport(tekst, sekundy, URL.createObjectURL(blob));
    });
  };
  const raport = (tekst, sekundy, url) => {
    pasek.style.width = '100%';
    const w = slowa(tekst);
    const zbior = new Set(w);
    const tematy = TEMATY.map((t) => ({ ...t, ok: t.slowa.some((x) => zbior.has(x)) }));
    const lacz = LACZNIKI.filter((x) => zbior.has(x));
    const czest = CZESTOSC.filter((x) => zbior.has(x));
    const PRZYM_ING = /^(boring|interesting|amazing|exciting|tiring|annoying|relaxing|surprising|morning|evening|nothing|something|everything)$/i;
    const ing = (tekst.match(/\b(am|is|are|'m|'re|'s)\s+\w+ing\b/gi) || []).filter((x) => !PRZYM_ING.test(x.split(/\s+/).pop())).length;
    const slowka = [...new Set(w.filter((x) => slownik.has(x)))];
    const wpm = sekundy > 5 ? Math.round(w.length / (sekundy / 60)) : 0;
    const punkty = tematy.filter((t) => t.ok).length * 2 + lacz.length + czest.length + (ing ? 2 : 0) + Math.min(6, Math.floor(slowka.length / 3));
    const max = TEMATY.length * 2 + 4 + 5 + 2 + 6;
    const proc = Math.round((punkty / max) * 100);
    const xp = Math.max(5, Math.round(proc / 5));
    dodajXP(stan, xp); zaliczLekcje(stan);
    sprawdzOdznaki(stan, { mowil: true, godzina: new Date().getHours() });
    const najlepszy = Math.max(proc, poprzedni?.najlepszy || 0);
    stan.mowienie = { ...(stan.mowienie || {}), proba: { data: Date.now(), proc, najlepszy, slow: w.length, sekundy: Math.round(sekundy) } };
    zapiszStan(stan);
    const brak = [
      ...tematy.filter((t) => !t.ok).map((t) => `Dopowiedz coś o temacie: ${t.nazwa.toLowerCase()}.`),
      lacz.length < 3 ? `Łącz zdania: ${LACZNIKI.filter((x) => !lacz.includes(x)).join(', ')}.` : null,
      czest.length < 2 ? 'Dodaj, jak często coś robisz: always, usually, sometimes, never.' : null,
      !ing ? 'Powiedz, co ktoś robi teraz: „Right now my dad is working”.' : null,
      sekundy < 45 ? 'Mów dłużej — celuj w ok. 1 minutę.' : null,
    ].filter(Boolean);
    wyczysc(pole).append(h('div', { class: 'podsum proba-raport' },
      linga(proc >= 75 ? 'puchar' : proc >= 50 ? 'kciuk' : 'serce', 'linga-duza'),
      h('h2', { class: 'serif' }, proc >= 75 ? 'Gotowy na ocenę!' : proc >= 50 ? 'Dobrze, jeszcze trochę' : 'Dobry początek'),
      h('div', { class: 'podsum-kafle' },
        h('div', { class: 'kafel mietowy' }, h('small', {}, 'Wynik'), h('b', {}, `${proc}%`)),
        h('div', { class: 'kafel zolty' }, h('small', {}, 'Czas'), h('b', {}, `${Math.floor(sekundy / 60)}:${String(Math.round(sekundy % 60)).padStart(2, '0')}`)),
        h('div', { class: 'kafel rozowy' }, h('small', {}, 'Słów'), h('b', {}, w.length))),
      h('p', { class: 'maly' }, `${wpm ? `Tempo: ${wpm} słów/min · ` : ''}najlepszy wynik: ${najlepszy}% · +${xp} XP`),
      h('h3', { class: 'sekcja' }, 'Tematy'),
      h('ul', { class: 'proba-tematy wynik' }, tematy.map((t) => h('li', { class: t.ok ? 'tak' : 'nie' }, ik(t.ok ? 'ptaszek' : 'zamknij'), ' ', t.nazwa))),
      h('h3', { class: 'sekcja' }, 'Język'),
      h('ul', { class: 'proba-jezyk' },
        h('li', {}, `Łączniki: ${lacz.length ? lacz.join(', ') : '—'}`),
        h('li', {}, `Jak często: ${czest.length ? czest.join(', ') : '—'}`),
        h('li', {}, `Formy „…ing” (teraz): ${ing}`),
        h('li', {}, `Słówka z rozdziału: ${slowka.length}`)),
      brak.length ? [h('h3', { class: 'sekcja' }, 'Następnym razem'), h('ul', { class: 'proba-rady' }, brak.map((b) => h('li', {}, b)))] : null,
      h('h3', { class: 'sekcja' }, 'Twoja wypowiedź'),
      h('div', { class: 'mowa-zdanie' }, podswietlone(tekst || '(nic nie rozpoznano)', slownik)),
      h('div', { class: 'przyciski kolumna' },
        h('button', { class: 'btn jasny szeroki', type: 'button', onclick: () => new Audio(url).play() }, ik('graj'), ' Odsłuchaj siebie'),
        h('button', { class: 'btn jasny szeroki', type: 'button', onclick: start }, ik('mikrofon'), ' Spróbuj jeszcze raz'),
        h('button', { class: 'btn glowny szeroki', type: 'button', onclick: () => { zakoncz(); poKoncu?.(); } }, 'Zakończ'))));
  };
  start();
}
