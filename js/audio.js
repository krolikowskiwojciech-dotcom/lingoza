// Odtwarzanie nagrań ElevenLabs. Gdy nagrania jeszcze nie ma, czyta głos systemowy urządzenia.

import { nazwaPliku } from './glosy.js';
import { JEZYK } from './content.js';

let dostepne = null;
async function indeks() {
  if (dostepne) return dostepne;
  try {
    const r = await fetch(`audio/${JEZYK}/indeks.json`);
    dostepne = new Set(r.ok ? await r.json() : []);
  } catch { dostepne = new Set(); }
  return dostepne;
}

const el = new Audio();
el.preload = 'auto';
let tempo = 1;
export const ustawTempo = (t) => { tempo = t; };
export const pobierzTempo = () => tempo;

export function stop() {
  el.pause();
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

const AKCENT = { alice: 'en-GB', george: 'en-GB', sarah: 'en-US', brian: 'en-US' };

function systemowy(tekst, glos) {
  return new Promise((res) => {
    if (!('speechSynthesis' in window)) return res(false);
    const u = new SpeechSynthesisUtterance(tekst);
    u.lang = AKCENT[glos] || 'en-GB';
    const v = speechSynthesis.getVoices().find((x) => x.lang === u.lang) || speechSynthesis.getVoices().find((x) => x.lang.startsWith('en'));
    if (v) u.voice = v;
    u.rate = 0.95 * tempo;
    u.onend = () => res(true);
    u.onerror = () => res(false);
    speechSynthesis.speak(u);
  });
}

export async function jestNagranie(tekst, glos) {
  return (await indeks()).has(await nazwaPliku(JEZYK, glos, tekst));
}

// odtwarza tekst danym głosem; zwraca Promise kończący się po zakończeniu odtwarzania
export async function graj(tekst, glos = 'alice') {
  stop();
  if (!tekst) return;
  const plik = await nazwaPliku(JEZYK, glos, tekst);
  if (!(await indeks()).has(plik)) return systemowy(tekst, glos);
  return new Promise((res) => {
    el.src = `audio/${JEZYK}/${plik}`;
    el.playbackRate = tempo;
    el.onended = () => res(true);
    el.onerror = () => systemowy(tekst, glos).then(res);
    el.play().catch(() => systemowy(tekst, glos).then(res));
  });
}
