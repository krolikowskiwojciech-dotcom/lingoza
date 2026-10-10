// Grywalizacja: punkty XP, seria dni z zamrożeniami, liga rodzinna i odznaki.

import { dzien, sumaDnia, urzadzenie } from './store.js';
import { znane, opanowane } from './srs.js';

export const XP = { wybor: 1, uloz: 2, fiszka: 2, mow: 2, wpisz: 3, lekcja: 5, bezbledna: 3, artykul: 5 };

export function dodajXP(stan, ile, d = dzien()) {
  const u = urzadzenie();
  stan.xp[d] = { ...(stan.xp[d] || {}) };
  stan.xp[d][u] = (stan.xp[d][u] || 0) + ile;
}

export function zaliczLekcje(stan, d = dzien()) {
  const u = urzadzenie();
  stan.lekcje[d] = { ...(stan.lekcje[d] || {}) };
  stan.lekcje[d][u] = (stan.lekcje[d][u] || 0) + 1;
}

export const xpDzis = (stan) => sumaDnia(stan.xp);
export const xpRazem = (stan) => Object.keys(stan.xp || {}).reduce((s, d) => s + sumaDnia(stan.xp, d), 0);

const dodajDni = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return dzien(x); };

// Seria: dzień się liczy, gdy była choć jedna ukończona lekcja.
// Co 7 dni serii zdobywa się zamrożenie (maks. 2); zamrożenie samo ratuje jeden opuszczony dzień.
export function seria(stan, dzis = dzien()) {
  const dni = Object.keys(stan.lekcje || {}).filter((d) => sumaDnia(stan.lekcje, d) > 0).sort();
  if (!dni.length) return { dni: 0, zamrozenia: 0, dzisZrobione: false, uratowane: [] };
  const zrobione = new Set(dni);
  let s = 0; let zam = 0; const uratowane = [];
  for (let d = dni[0]; d <= dzis; d = dodajDni(d, 1)) {
    if (zrobione.has(d)) {
      s += 1;
      if (s % 7 === 0) zam = Math.min(2, zam + 1);
    } else if (d !== dzis) {
      if (s > 0 && zam > 0) { zam -= 1; uratowane.push(d); } else s = 0;
    }
  }
  return { dni: s, zamrozenia: zam, dzisZrobione: zrobione.has(dzis), uratowane };
}

// tydzień ligi zaczyna się w poniedziałek
export function poczatekTygodnia(d = new Date()) {
  const x = new Date(d); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return dzien(x);
}
export function xpTygodnia(stan, start = poczatekTygodnia()) {
  let s = 0;
  for (let i = 0; i < 7; i++) s += sumaDnia(stan?.xp, dodajDni(start, i));
  return s;
}

export function statystyki(stan) {
  const karty = Object.entries(stan.karty || {});
  const p = karty.filter(([k]) => k.endsWith('|p')).map(([, v]) => v);
  return {
    wprowadzone: Object.keys(stan.wprowadzone || {}).length,
    znane: p.filter(znane).length,
    opanowane: p.filter(opanowane).length,
    xp: xpRazem(stan),
    seria: seria(stan).dni,
    lekcje: Object.keys(stan.lekcje || {}).reduce((s, d) => s + sumaDnia(stan.lekcje, d), 0),
    artykuly: Object.keys(stan.przeczytane || {}).length,
    wlasne: Object.keys(stan.wlasne || {}).length,
  };
}

export const ODZNAKI = [
  { id: 'start', emoji: '🌱', nazwa: 'Pierwszy krok', opis: 'Ukończ pierwszą lekcję', test: (s) => s.lekcje >= 1 },
  { id: 'seria3', emoji: '🔥', nazwa: 'Rozgrzewka', opis: 'Seria 3 dni', test: (s) => s.seria >= 3 },
  { id: 'seria7', emoji: '🔥', nazwa: 'Tydzień', opis: 'Seria 7 dni', test: (s) => s.seria >= 7 },
  { id: 'seria30', emoji: '🏔️', nazwa: 'Miesiąc', opis: 'Seria 30 dni', test: (s) => s.seria >= 30 },
  { id: 'seria100', emoji: '💎', nazwa: 'Setka', opis: 'Seria 100 dni', test: (s) => s.seria >= 100 },
  { id: 'znane25', emoji: '🧠', nazwa: 'Dobry początek', opis: '25 pozycji znanych na pamięć', test: (s) => s.znane >= 25 },
  { id: 'znane100', emoji: '📚', nazwa: 'Setka w głowie', opis: '100 pozycji znanych na pamięć', test: (s) => s.znane >= 100 },
  { id: 'znane500', emoji: '🎓', nazwa: 'Erudyta', opis: '500 pozycji znanych na pamięć', test: (s) => s.znane >= 500 },
  { id: 'xp500', emoji: '⚡', nazwa: 'Pół tysiąca', opis: '500 XP razem', test: (s) => s.xp >= 500 },
  { id: 'xp2000', emoji: '🚀', nazwa: 'Rakieta', opis: '2000 XP razem', test: (s) => s.xp >= 2000 },
  { id: 'czytelnik', emoji: '📰', nazwa: 'Czytelnik', opis: 'Przeczytaj pierwszy artykuł', test: (s) => s.artykuly >= 1 },
  { id: 'kolekcjoner', emoji: '🧺', nazwa: 'Kolekcjoner', opis: 'Dodaj 10 własnych słówek z artykułów', test: (s) => s.wlasne >= 10 },
  { id: 'bezbledna', emoji: '🎯', nazwa: 'Snajper', opis: 'Lekcja bez jednego błędu', test: (s, e) => e?.bezbledna },
];

// przyznaje nowe odznaki; zwraca listę świeżo zdobytych
export function sprawdzOdznaki(stan, zdarzenie) {
  const s = statystyki(stan);
  const nowe = [];
  for (const o of ODZNAKI) {
    if (!stan.odznaki[o.id] && o.test(s, zdarzenie)) { stan.odznaki[o.id] = Date.now(); nowe.push(o); }
  }
  return nowe;
}
