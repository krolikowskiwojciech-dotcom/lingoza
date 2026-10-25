// Tabelki odmiany pokazywane po złej odpowiedzi w zadaniach gramatycznych.
// Na razie „to be”: liczba pojedyncza / mnoga, podświetlony wiersz z formą, która pasuje do zdania.

import { h } from './dom.js';

// osoby w kolejności tabeli; klucz osoby → [zaimek, liczba]
// he / she / it w jednym wierszu (ta sama forma)
const OSOBY = [
  ['I', 'poj'], ['you', 'poj'], ['he/she/it', 'poj'],
  ['we', 'mn'], ['you ', 'mn'], ['they', 'mn'],
];
const FORMA = { I: 'am', you: 'are', 'he/she/it': 'is', we: 'are', 'you ': 'are', they: 'are' };
// czasownik pogrubiony, zaimki cienką czcionką
const C = (t) => h('b', { class: 'odm-czas' }, t);
// wiersz z kilkoma zaimkami: forma przy każdym, rozdzielone ukośnikiem (he's / she's / it's)
const zaimki = (z) => z.trim().split('/');

// rodzaje zdań: twierdzenie, skrót, przeczenie, pytanie
const RODZAJE = {
  twierdzenie: { tytul: 'twierdzenie', wiersz: (z, f) => [zaimki(z).join(' / ') + ' ', C(f)] },
  skrot: { tytul: 'skrót', wiersz: (z, f) => zaimki(z).flatMap((x, i) => [i ? ' / ' : '', h('span', { class: 'nw' }, x, C({ am: "'m", is: "'s", are: "'re" }[f]))]) },
  przeczenie: { tytul: 'przeczenie', wiersz: (z, f) => (f === 'am' ? ['I', C("'m not")] : [zaimki(z).join(' / ') + ' ', C(f === 'is' ? "isn't" : "aren't")]) },
  pytanie: { tytul: 'pytanie', wiersz: (z, f) => [C(f[0].toUpperCase() + f.slice(1)), ` ${zaimki(z).join(' / ')}…?`] },
};

const norm = (t) => String(t).toLowerCase().replace(/[’`]/g, "'").trim();

// jaka forma „to be” jest odpowiedzią i jakiego rodzaju zdania dotyczy; null = to nie jest „to be”
function rozpoznaj(odp) {
  const o = norm(odp);
  const skr = o.match(/^(i|you|he|she|it|we|they)('m|'s|'re)$/);
  if (skr) return { rodzaj: 'skrot', forma: { "'m": 'am', "'s": 'is', "'re": 'are' }[skr[2]], zaimek: skr[1] };
  if (/^(am not|'m not|not)$/.test(o)) return { rodzaj: 'przeczenie', forma: 'am' };
  if (/^(isn't|is not)$/.test(o)) return { rodzaj: 'przeczenie', forma: 'is' };
  if (/^(aren't|are not)$/.test(o)) return { rodzaj: 'przeczenie', forma: 'are' };
  if (/^(am|is|are)$/.test(o)) return { rodzaj: /^[A-Z]/.test(String(odp).trim()) ? 'pytanie' : 'twierdzenie', forma: o };
  return null;
}

// kto jest w zdaniu: zaimek wprost (I, she…), inaczej z formy (is → he/she/it, are → we/you/they)
function ktoWZdaniu(zdanie, forma, zaimek) {
  const wiersz = (w) => (['he', 'she', 'it'].includes(w) ? 'he/she/it' : w);
  if (zaimek) return [zaimek === 'i' ? 'I' : wiersz(zaimek)];
  const slowa = norm(zdanie).replace(/[.,!?…–-]/g, ' ').split(/\s+/);
  const z = slowa.find((w) => ['i', 'he', 'she', 'it', 'we', 'they', 'you'].includes(w));
  if (z === 'i') return ['I'];
  if (z === 'you') return ['you', 'you '];
  if (z) return [wiersz(z)];
  return OSOBY.map(([k]) => k).filter((k) => FORMA[k] === forma);
}

// tabelka dla pozycji gramatycznej (p.en z „___”, p.odp) albo null, gdy nie dotyczy „to be”;
// podswietl: false — bez zaznaczania (ściąga przed ćwiczeniem nie zdradza odpowiedzi)
export function tabelaToBe(p, { podswietl = true } = {}) {
  const r = rozpoznaj(p.odp);
  if (!r) return null;
  const pelne = p.en.replace(/_{2,}/, p.odp);
  const swieci = new Set(podswietl ? ktoWZdaniu(pelne, r.forma, r.zaimek) : []);
  const wiersz = RODZAJE[r.rodzaj].wiersz;
  const kolumna = (liczba, tytul) => h('div', { class: 'odm-kol' },
    h('div', { class: 'odm-naglowek' }, tytul),
    OSOBY.filter(([, l]) => l === liczba).map(([k]) => h('div', { class: 'odm-wiersz' + (swieci.has(k) ? ' swieci' : '') },
      h('span', { class: 'odm-forma' }, wiersz(k, FORMA[k])), k.startsWith('you') ? h('span', { class: 'odm-kto' }, k === 'you' ? 'ty' : 'wy') : null)));
  return h('div', { class: 'odmiana' },
    h('div', { class: 'odm-tytul' }, `To be — ${RODZAJE[r.rodzaj].tytul}`),
    h('div', { class: 'odm-kolumny' }, kolumna('poj', 'liczba pojedyncza'), kolumna('mn', 'liczba mnoga')));
}

// ---------- przymiotniki dzierżawcze: my, your, his, her, its, our, their ----------
// he / she / it w jednym wierszu (jak w tabelce „to be”), każdy z własną formą
const DZIERZ = [
  [[['I', 'my']], 'poj'], [[['you', 'your']], 'poj', 'ty'], [[['he', 'his'], ['she', 'her'], ['it', 'its']], 'poj'],
  [[['we', 'our']], 'mn'], [[['you', 'your']], 'mn', 'wy'], [[['they', 'their']], 'mn'],
];
const PL_DZIERZ = { my: 'mój', your: 'twój / wasz', his: 'jego', her: 'jej', its: 'jego', our: 'nasz', their: 'ich' };
const FORMY_DZIERZ = new Set(DZIERZ.flatMap(([pary]) => pary.map(([, d]) => d)));

export function tabelaDzierzawcze(p, { podswietl = true } = {}) {
  const o = norm(p.odp);
  if (!FORMY_DZIERZ.has(o)) return null;
  const plTy = (d, dop) => (dop ? PL_DZIERZ[d].split(' / ')[dop === 'ty' ? 0 : 1] : PL_DZIERZ[d]);
  const kolumna = (liczba, tytul) => h('div', { class: 'odm-kol' },
    h('div', { class: 'odm-naglowek' }, tytul),
    DZIERZ.filter(([, l]) => l === liczba).map(([pary, , dop]) => {
      const swieci = podswietl && pary.some(([, d]) => d === o);
      return h('div', { class: 'odm-wiersz' + (swieci ? ' swieci' : '') + (pary.length > 1 ? ' wiele' : '') },
        h('span', { class: 'odm-forma' }, pary.flatMap(([z, d], i) => [i ? ' / ' : '',
          h('span', { class: 'nw' + (swieci && pary.length > 1 && d === o ? ' ta' : '') }, `${z} → `, h('b', { class: 'odm-czas' }, d)),
          pary.length > 1 ? null : h('span', { class: 'odm-kto' }, ' ' + plTy(d, dop))])));
    }));
  return h('div', { class: 'odmiana' },
    h('div', { class: 'odm-tytul' }, 'Czyje? my, your, his, her…'),
    h('div', { class: 'odm-kolumny jedna' }, kolumna('poj', 'liczba pojedyncza'), kolumna('mn', 'liczba mnoga')));
}

// tabelka pasująca do zadania (to be albo dzierżawcze) albo null
export const tabelaDla = (p, opcje) => tabelaToBe(p, opcje) || tabelaDzierzawcze(p, opcje);

// ściąga na początek lekcji: po jednej tabelce każdego rodzaju, który występuje w zadaniach (bez podświetlenia)
export function tabeleLekcji(pozycje = []) {
  const byly = new Set(); const out = [];
  for (const p of pozycje) {
    if (p.typ !== 'gramatyka' || !p.odp) continue;
    const r = rozpoznaj(p.odp);
    const klucz = r ? 'tobe-' + r.rodzaj : FORMY_DZIERZ.has(norm(p.odp)) ? 'dzierz' : null;
    if (!klucz || byly.has(klucz)) continue;
    byly.add(klucz);
    out.push(tabelaDla(p, { podswietl: false }));
  }
  const kolej = ['tobe-twierdzenie', 'tobe-skrot', 'tobe-przeczenie', 'tobe-pytanie', 'dzierz'];
  return out.map((t, i) => [kolej.indexOf([...byly][i]), t]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
}
