// Powtórki w odstępach: algorytm FSRS (biblioteka ts-fsrs, MIT).
// Każda pozycja ma dwie karty: „r” rozpoznanie (angielski → znaczenie, słuchanie)
// i „p” produkcja (polski → angielski, dyktando, luka, mówienie). Gramatyka ma tylko „p”.

import { fsrs, createEmptyCard, Rating, State } from './vendor/ts-fsrs.mjs';

export { Rating, State };

const f = fsrs({ request_retention: 0.9, maximum_interval: 365, enable_fuzz: true });

const naKarte = (k) => ({
  ...k,
  due: new Date(k.due),
  last_review: k.last_review ? new Date(k.last_review) : undefined,
});
const zKarty = (c) => ({
  due: +c.due, stability: c.stability, difficulty: c.difficulty, elapsed_days: c.elapsed_days,
  scheduled_days: c.scheduled_days, learning_steps: c.learning_steps, reps: c.reps, lapses: c.lapses,
  state: c.state, last_review: c.last_review ? +c.last_review : null,
});

export function nowaKarta(teraz = new Date()) {
  return { ...zKarty(createEmptyCard(teraz)), u: +teraz };
}

export function ocen(karta, ocena, teraz = new Date()) {
  const { card } = f.next(naKarte(karta), teraz, ocena);
  return { ...zKarty(card), u: +teraz };
}

// podgląd odstępu przy każdej ocenie — do podpisów pod przyciskami fiszki
export function podglad(karta, teraz = new Date()) {
  const p = f.repeat(naKarte(karta), teraz);
  const out = {};
  for (const r of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) out[r] = +p[r].card.due - +teraz;
  return out;
}

export const doPowtorki = (k, teraz = Date.now()) => k.due <= teraz;
export const znane = (k) => k && k.state === State.Review && k.stability >= 7;
export const opanowane = (k) => k && k.state === State.Review && k.stability >= 21;

export function odstepTekst(ms) {
  const min = ms / 60000;
  if (min < 60) return `${Math.max(1, Math.round(min))} min`;
  const h = min / 60;
  if (h < 24) return `${Math.round(h)} h`;
  const d = h / 24;
  if (d < 31) return `${Math.round(d)} d`;
  return `${Math.round(d / 30)} mies.`;
}
