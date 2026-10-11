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
  fiszka: 'fiszka', enpl: 'fiszka', plen: 'fiszka', 'gram-wybor': 'gramatyka', nowa: 'powtorki', gramatyka: 'gramatyka',
};
export const ikonaCwiczenia = (typ) => (IKONY_CWICZEN[typ]
  ? h('img', { class: 'ikona-cw', src: `grafiki/cwiczenia/${IKONY_CWICZEN[typ]}.webp`, alt: '' }) : null);

export const obrazOdznaki = (id) => h('img', { class: 'odznaka-img', src: `grafiki/odznaki/${id}.webp`, alt: '', loading: 'lazy' });
