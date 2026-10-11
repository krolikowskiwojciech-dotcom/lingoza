// Ilustracje 3D (arkusze z ChatGPT pocięte narzedzia/tnij_arkusz.py): awatary, maskotka Linga, ikony ćwiczeń.
// Awatar w danych profilu to nadal emoji — tu mapujemy go na obrazek, więc stare dane działają bez zmian.

import { h } from './dom.js';

export const AWATARY = {
  '🦊': 'lis', '🦋': 'motyl', '🐱': 'kot', '🐲': 'smok', '🐼': 'panda', '🦁': 'lew', '🐸': 'zaba', '🐧': 'pingwin',
  '🦄': 'jednorozec', '🐙': 'osmiornica', '🐝': 'pszczola', '🦉': 'sowa', '🐬': 'delfin', '🚴': 'kask', '⚽': 'pilka', '🎮': 'pad',
  '🐨': 'koala', '🐯': 'tygrys', '🐰': 'krolik', '🦔': 'jez', '🦈': 'rekin', '🦜': 'papuga', '🐢': 'zolw', '🐺': 'wilk',
  '🧑‍🚀': 'astronauta', '🤖': 'robot', '🌵': 'kaktus', '🍓': 'truskawka', '🎸': 'gitara', '🎨': 'paleta', '📷': 'aparat', '🍕': 'pizza',
};

export function awatar(emoji, klasa = '') {
  const n = AWATARY[emoji];
  return n ? h('img', { class: `awatar-img ${klasa}`, src: `grafiki/awatary/${n}.webp`, alt: '', decoding: 'async' }) : emoji;
}

// Linga — maskotka (kameleon). Pozy: kciuk, czyta, mikrofon, mysli, walizka, rower, puchar, hamak, zaglada,
// maluje, zdziwiony, plecak, powitanie, przypomnienia, podium, odpoczynek, macha, konfetti, sluchawki, spi, plomien, serce.
export const linga = (poza, klasa = '') => h('img', { class: `linga ${klasa}`, src: `grafiki/linga/${poza}.webp`, alt: '', decoding: 'async' });

const IKONY_CWICZEN = {
  sluchaj: 'sluchanie', dyktando: 'sluchanie', obrazek: 'sluchanie', mow: 'mowienie',
  wpisz: 'pisanie', luka: 'pisanie', 'gram-wpisz': 'pisanie', uloz: 'ukladanie',
  fiszka: 'fiszka', enpl: 'fiszka', plen: 'fiszka', 'gram-wybor': 'gramatyka', nowa: 'powtorki', gramatyka: 'gramatyka', quiz: 'czytanie',
};
export const ikonaCwiczenia = (typ) => (IKONY_CWICZEN[typ]
  ? h('img', { class: 'ikona-cw', src: `grafiki/cwiczenia/${IKONY_CWICZEN[typ]}.webp`, alt: '' }) : null);

export const obrazOdznaki = (id) => h('img', { class: 'odznaka-img', src: `grafiki/odznaki/${id}.webp`, alt: '', loading: 'lazy' });

// Okienko potwierdzenia w stylu Lingozy (zamiast systemowego confirm): arkusz od dołu z Lingą.
// Zwraca Promise<boolean>.
export function potwierdz({ tytul, tekst = '', tak = 'Tak', nie = 'Anuluj', poza = 'mysli', niebezpieczne = false }) {
  return new Promise((res) => {
    const tlo = h('div', { class: 'okno-tlo' });
    const zamknij = (wynik) => {
      okno.classList.remove('wid'); tlo.classList.remove('wid');
      document.removeEventListener('keydown', klawisz);
      setTimeout(() => { okno.remove(); tlo.remove(); }, 220);
      res(wynik);
    };
    const klawisz = (e) => { if (e.key === 'Escape') zamknij(false); };
    const okno = h('div', { class: 'okno', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': tytul },
      linga(poza, 'okno-linga'),
      h('div', { class: 'okno-tytul serif' }, tytul),
      tekst ? h('p', { class: 'okno-tekst' }, tekst) : null,
      h('div', { class: 'okno-przyciski' },
        h('button', { class: 'btn jasny', type: 'button', onclick: () => zamknij(false) }, nie),
        h('button', { class: 'btn ' + (niebezpieczne ? 'czerwony' : 'glowny'), type: 'button', onclick: () => zamknij(true) }, tak)));
    tlo.addEventListener('click', () => zamknij(false));
    document.addEventListener('keydown', klawisz);
    document.body.append(tlo, okno);
    requestAnimationFrame(() => { tlo.classList.add('wid'); okno.classList.add('wid'); okno.querySelector('.btn.jasny').focus(); });
  });
}
