// Ilustracje 3D (arkusze z ChatGPT pocięte narzedzia/tnij_arkusz.py): awatary, maskotka Linga, ikony ćwiczeń.
// Awatar w danych profilu to nadal emoji — tu mapujemy go na obrazek, więc stare dane działają bez zmian.

import { h } from './dom.js';

export const AWATARY = {
  '🦊': 'lis', '🦋': 'motyl', '🐱': 'kot', '🐲': 'smok', '🐼': 'panda', '🦁': 'lew', '🐸': 'zaba', '🐧': 'pingwin',
  '🦄': 'jednorozec', '🐙': 'osmiornica', '🐝': 'pszczola', '🦉': 'sowa', '🐬': 'delfin', '🚴': 'kask', '⚽': 'pilka', '🎮': 'pad',
  '🐨': 'koala', '🐯': 'tygrys', '🐰': 'krolik', '🦔': 'jez', '🦈': 'rekin', '🦜': 'papuga', '🐢': 'zolw', '🐺': 'wilk',
  '🧑‍🚀': 'astronauta', '🤖': 'robot', '🌵': 'kaktus', '🍓': 'truskawka', '🎸': 'gitara', '🎨': 'paleta', '📷': 'aparat', '🍕': 'pizza',
};

// awatary dla dorosłych (d-…) i nastolatków (n-…): przedmioty bez twarzy, plik = identyfikator
export const AWATARY_DOROSLE = ['d-rower', 'd-espresso', 'd-gory', 'd-kompas', 'd-monstera', 'd-sluchawki', 'd-notes', 'd-aparat',
  'd-zaglowka', 'd-gitara', 'd-tenis', 'd-globus', 'd-but', 'd-czajnik', 'd-kettlebell', 'd-samolot'];
export const AWATARY_NASTOLATEK = ['n-pad', 'n-deskorolka', 'n-sneaker', 'n-kosz', 'n-pilka', 'n-headset', 'n-rakieta', 'n-gitara',
  'n-miecz', 'n-mtb', 'n-dron', 'n-vr', 'n-piorun', 'n-puchar', 'n-wilk', 'n-planeta'];
export const awataryDlaStylu = (styl) => (styl === 'dziecko' ? Object.keys(AWATARY)
  : styl === 'nastolatek' ? [...AWATARY_NASTOLATEK, ...AWATARY_DOROSLE] : [...AWATARY_DOROSLE, ...AWATARY_NASTOLATEK]);

export function awatar(emoji, klasa = '') {
  if (/^[dn]-[a-z]+$/.test(emoji || '')) return h('img', { class: `awatar-img ${klasa}`, src: `grafiki/awatary/${emoji}.webp`, alt: '', decoding: 'async' });
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

// Ikony interfejsu (SVG w kolorze tekstu) zamiast emoji 🔊 / 🐢, które wyglądają różnie na każdym urządzeniu.
const SVG_GLOSNIK = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
  + '<path d="M3.5 10v4a1.5 1.5 0 0 0 1.5 1.5h2.6l4.1 3.3c.6.5 1.5.1 1.5-.7V5.9c0-.8-.9-1.2-1.5-.7L7.6 8.5H5A1.5 1.5 0 0 0 3.5 10z" fill="currentColor" stroke="none"/>'
  + '<path d="M16.3 9.2a4 4 0 0 1 0 5.6"/><path d="M18.9 6.6a7.6 7.6 0 0 1 0 10.8"/></svg>';
const SVG_WOLNIEJ = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
  + '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2"/><path d="M10 2.5h4"/></svg>';

export const glosnik = (klasa = '') => h('span', { class: `ik ik-glosnik ${klasa}`, html: SVG_GLOSNIK });
export const ikonaWolniej = () => h('span', { class: 'ik ik-wolniej', html: SVG_WOLNIEJ });

// Zestaw ikon interfejsu (jedna kreska, zaokrąglone końce; gra: wypełnione kolorem).
const S = (w) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${w}</svg>`;
const IKONY = {
  dom: S('<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 0 1 4 19z"/>'),
  ksiazka: S('<path d="M12 6.5C10.3 5 7.6 4.5 4 4.8v13.4c3.6-.3 6.3.2 8 1.8 1.7-1.6 4.4-2.1 8-1.8V4.8c-3.6-.3-6.3.2-8 1.7z"/><path d="M12 6.5V20"/>'),
  puchar: S('<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.4M17 6h2.5a2.5 2.5 0 0 1-2.6 3.4"/><path d="M12 13v4M8.5 20h7M9.5 17h5"/>'),
  zebatka: S('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>'),
  kosz: S('<path d="M4 10h16l-1.6 8.3A2 2 0 0 1 16.4 20H7.6a2 2 0 0 1-2-1.7z"/><path d="M8 10l2.5-5M16 10l-2.5-5M9 14v3M12 14v3M15 14v3"/>'),
  ludzie: S('<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="16.5" cy="9.5" r="2.5"/><path d="M16 14.2a4.5 4.5 0 0 1 4.5 4.8"/>'),
  wstecz: S('<path d="M15 5l-7 7 7 7"/>'),
  zamknij: S('<path d="M6 6l12 12M18 6 6 18"/>'),
  graj: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.6v12.8c0 .8.9 1.3 1.6.8l9.4-6.4a1 1 0 0 0 0-1.6L9.6 4.8C8.9 4.3 8 4.8 8 5.6z" fill="currentColor"/></svg>',
  pauza: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.5" fill="currentColor"/></svg>',
  ptaszek: S('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  wyslij: S('<path d="M21 3 10 14"/><path d="M21 3l-7 18-4-7-7-4z"/>'),
  kartkowka: S('<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z"/><path d="M14 3.5V8h4M10 12.5h5M10 16h3"/>'),
  plomien: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.2 2.5c.5 3-1 4.6-2.6 6.3C8 10.5 6.5 12.3 6.5 15a5.5 5.5 0 0 0 11 0c0-2.6-1.3-4.4-2.3-5.6-.3 1.5-1 2.4-2 2.8.7-3.4-.2-7.2-1-9.7z" fill="#FF8A3D"/><path d="M12 13.2c-1.4 1.1-2.2 2.2-2.2 3.6a2.2 2.2 0 0 0 4.4 0c0-1.3-.8-2.4-2.2-3.6z" fill="#FFD25A"/></svg>',
  blyskawica: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 2.5 5 13.5h6l-1 8 8.5-11h-6z" fill="#F2B90C" stroke="#D99A00" stroke-width="1" stroke-linejoin="round"/></svg>',
  puchar_kolor: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v4a5 5 0 0 1-10 0z" fill="#F5C542"/><path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.4M17 6h2.5a2.5 2.5 0 0 1-2.6 3.4" fill="none" stroke="#D9A21B" stroke-width="2" stroke-linecap="round"/><path d="M10.5 13h3v4h-3z" fill="#D9A21B"/><rect x="8" y="17" width="8" height="3" rx="1.2" fill="#C98F12"/></svg>',
  krysztal: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l7 4v9l-7 4-7-4v-9z" fill="#BFE5FA" stroke="#6CB8E6" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 2.5v17M5 6.5l14 9M19 6.5l-14 9" stroke="#fff" stroke-width="1.2" opacity=".8"/></svg>',
};
export const ik = (nazwa, klasa = '') => h('span', { class: `ik ik-${nazwa} ${klasa}`, html: IKONY[nazwa] || '' });
