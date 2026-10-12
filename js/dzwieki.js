// Dźwięki interfejsu (Epidemic Sound, obrobione w Biologozie — spis i głośności jak w biologoza/DZWIEKI.md).
// Grają przez Web Audio, osobno od odtwarzacza lektora (js/audio.js), więc nie przerywają nagrań.
// Zasady, żeby się nie zagłuszały:
//  • dźwięk odpowiedzi (dobrze/zle/seria) „wstrzymuje” lektora na czas krótszy niż dźwięk — nagranie startuje zaraz po nim,
//  • gdy lektor właśnie mówi, dźwięki przycisków są ściszone, a „nowe pytanie” pomijane,
//  • podczas nagrywania mikrofonem (rozpoznawanie mowy) wszystko milczy.

import { LS } from './store.js';

const PRZYCISKI = 0.35, PYTANIA = 0.5, ODPOWIEDZI = 0.8, WYNIKI = 0.85;
const DZWIEKI = {
  przycisk: PRZYCISKI, wybor: PRZYCISKI, cofnij: PRZYCISKI, para: PRZYCISKI, przelacznik: PRZYCISKI,
  'start-bloku': PYTANIA, odslon: PYTANIA, podpowiedz: PYTANIA, okno: PYTANIA, 'nowe-pytanie': PRZYCISKI,
  dobrze: ODPOWIEDZI, 'seria-5': ODPOWIEDZI, 'seria-10': ODPOWIEDZI,
  zle: ODPOWIEDZI, 'jeszcze-nie': ODPOWIEDZI, 'powrot-pytania': PYTANIA,
  'blok-gotowy': WYNIKI, 'blok-idealny': WYNIKI, 'lekcja-gotowa': WYNIKI, 'bez-bledow': WYNIKI, wyslano: WYNIKI,
};
// dźwięki, po których lektor może zacząć mówić — na ile ms go wstrzymać (reszta: 0)
const WSTRZYMAJ_LEKTORA = { dobrze: 650, zle: 600, 'jeszcze-nie': 450, 'seria-5': 1100, 'seria-10': 1400, odslon: 300, podpowiedz: 250, 'powrot-pytania': 450 };

export const dzwiekiWlaczone = () => LS.get('lz.dzwieki', true) !== false;
export const ustawDzwieki = (wl) => LS.set('lz.dzwieki', !!wl);

let ctx = null; const bufory = {}; let wczytywanie = null;
let lektorDo = 0;        // do kiedy lektor ma czekać (ms, Date.now)
let lektorMowi = false;  // ustawia js/audio.js
let mikrofon = false;    // ustawia js/mowa.js

export const czasWstrzymaniaLektora = () => Math.max(0, lektorDo - Date.now());
export const ustawLektorMowi = (x) => { lektorMowi = x; };
export const ustawMikrofon = (x) => { mikrofon = x; };

function przygotuj() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  if (!wczytywanie) {
    wczytywanie = Promise.all(Object.keys(DZWIEKI).map(async (n) => {
      try {
        const r = await fetch(`dzwieki/${n}.mp3`);
        if (!r.ok) return;
        const ab = await r.arrayBuffer();
        bufory[n] = await new Promise((ok, zle) => { const pr = ctx.decodeAudioData(ab, ok, zle); if (pr?.then) pr.then(ok, zle); });
      } catch { /* brak pliku = cisza */ }
    }));
  }
}
// Web Audio na iPhonie startuje dopiero po dotknięciu
document.addEventListener('touchend', przygotuj, { passive: true });
document.addEventListener('click', przygotuj);

export function dzwiek(nazwa) {
  if (!dzwiekiWlaczone() || mikrofon || !(nazwa in DZWIEKI)) return;
  if (lektorMowi && nazwa === 'nowe-pytanie') return;
  const wst = WSTRZYMAJ_LEKTORA[nazwa];
  if (wst) lektorDo = Math.max(lektorDo, Date.now() + wst);
  przygotuj();
  const b = bufory[nazwa];
  if (!ctx || !b) return;
  try {
    const src = ctx.createBufferSource(); src.buffer = b;
    const g = ctx.createGain();
    g.gain.value = DZWIEKI[nazwa] * (lektorMowi && DZWIEKI[nazwa] <= PYTANIA ? 0.45 : 1);
    src.connect(g).connect(ctx.destination);
    src.start();
  } catch { /* nic */ }
}

// ---------- seria dobrych odpowiedzi (w obrębie jednej lekcji / quizu / kartkówki) ----------
let seria = 0;
export const zerujSerie = () => { seria = 0; };
export function odpowiedz(ok) {
  if (!ok) { seria = 0; dzwiek('zle'); return; }
  seria += 1;
  dzwiek(seria === 10 ? 'seria-10' : seria === 5 ? 'seria-5' : 'dobrze');
}
