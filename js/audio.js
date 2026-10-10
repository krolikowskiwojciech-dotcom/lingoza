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
// iPhone pozwala grać bez dotknięcia dopiero po tym, jak element raz zagrał w reakcji na dotyk:
// przy pierwszym dotknięciu odtwarzamy ciszę.
const CISZA = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
let odblokowane = false;
function odblokuj() {
  if (odblokowane) return;
  odblokowane = true;
  if (!el.src) { el.src = CISZA; el.play().then(() => el.pause()).catch(() => { odblokowane = false; }); }
  try { if ('speechSynthesis' in window) speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch { /* */ }
}
document.addEventListener('touchend', odblokuj, { passive: true });
document.addEventListener('click', odblokuj);

let tempo = 1;
export const ustawTempo = (t) => { tempo = t; };
export const pobierzTempo = () => tempo;

export function stop() {
  numer += 1;
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

// Plik pobieramy w całości i gramy z bloba: tak zapisuje się w pamięci offline (Service Worker),
// a iPhone bez internetu i tak odtworzy nagranie. Zwykłe <audio src> pobiera fragmentami (206), których nie da się zapisać.
const bloby = new Map();
async function urlNagrania(plik) {
  if (bloby.has(plik)) return bloby.get(plik);
  const r = await fetch(`audio/${JEZYK}/${plik}`);
  if (!r.ok) throw new Error('brak nagrania');
  const url = URL.createObjectURL(await r.blob());
  bloby.set(plik, url);
  if (bloby.size > 200) { const [k, v] = bloby.entries().next().value; URL.revokeObjectURL(v); bloby.delete(k); }
  return url;
}

let numer = 0;
// odtwarza tekst danym głosem; zwraca Promise kończący się po zakończeniu odtwarzania
export async function graj(tekst, glos = 'alice') {
  stop();
  if (!tekst) return;
  const moj = ++numer;
  const plik = await nazwaPliku(JEZYK, glos, tekst);
  if (!(await indeks()).has(plik)) return systemowy(tekst, glos);
  let src;
  try { src = await urlNagrania(plik); } catch { return systemowy(tekst, glos); }
  if (moj !== numer) return; // w międzyczasie kliknięto inne nagranie
  return new Promise((res) => {
    el.src = src;
    el.playbackRate = tempo;
    el.onended = () => res(true);
    el.onerror = () => systemowy(tekst, glos).then(res);
    el.play().catch(() => systemowy(tekst, glos).then(res));
  });
}
