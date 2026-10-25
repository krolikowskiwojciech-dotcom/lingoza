// Odtwarzanie nagrań ElevenLabs. Gdy nagrania jeszcze nie ma, czyta głos systemowy urządzenia.

import { nazwaPliku } from './glosy.js';
import { JEZYK } from './content.js';
import { czasWstrzymaniaLektora, ustawLektorMowi } from './dzwieki.js';

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
el.setAttribute('playsinline', '');

// iOS 16.4+: sesja „odtwarzanie” — dźwięk gra także przy wyciszonym iPhonie (jak w aplikacjach z muzyką)
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* starsze iOS */ }

// iPhone pozwala grać bez dotknięcia dopiero po tym, jak element raz zagrał w reakcji na dotyk:
// przy dotknięciu odtwarzamy krótką prawdziwą ciszę (0,1 s), aż się uda.
function wavCiszy() {
  const n = 800; const b = new Uint8Array(44 + n); const v = new DataView(b.buffer);
  const t = (o, x) => [...x].forEach((c, i) => b[o + i] = c.charCodeAt(0));
  t(0, 'RIFF'); v.setUint32(4, 36 + n, true); t(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); t(36, 'data'); v.setUint32(40, n, true);
  b.fill(128, 44);
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}
const CISZA = wavCiszy();
let odblokowane = false; let probuje = false;
function odblokuj() {
  if (odblokowane || probuje) return;
  probuje = true;
  const gra = !el.paused && el.src && el.src !== CISZA;
  if (gra) { odblokowane = true; probuje = false; return; }
  el.src = CISZA;
  el.play().then(() => { if (el.src === CISZA) el.pause(); odblokowane = true; }).catch(() => {}).finally(() => { probuje = false; });
  try { if ('speechSynthesis' in window) speechSynthesis.speak(new SpeechSynthesisUtterance(' ')); } catch { /* */ }
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
// ostatnio włączony lektor: ćwiczenie czeka, aż skończy czytać zdanie z poprawną odpowiedzią, zanim pozwoli przejść dalej
let ostatni = Promise.resolve();
let trwa = false;
export const lektorTrwa = () => trwa;
export const poLektorze = (maks = 15000) => Promise.race([ostatni, new Promise((r) => setTimeout(r, maks))]);

export function graj(tekst, glos = 'alice') {
  const p = grajNagranie(tekst, glos);
  trwa = !!tekst;
  const ten = p.finally(() => { if (ostatni === ten) trwa = false; });
  ostatni = ten;
  return p;
}

async function grajNagranie(tekst, glos) {
  stop();
  if (!tekst) return;
  const moj = ++numer;
  const plik = await nazwaPliku(JEZYK, glos, tekst);
  if (!(await indeks()).has(plik)) return systemowy(tekst, glos);
  let src;
  try { src = await urlNagrania(plik); } catch { return systemowy(tekst, glos); }
  if (moj !== numer) return; // w międzyczasie kliknięto inne nagranie
  // dźwięk odpowiedzi (dobrze/źle) ma pierwszeństwo — lektor zaczyna zaraz po nim
  const czekaj = czasWstrzymaniaLektora();
  if (czekaj) { await new Promise((r) => setTimeout(r, czekaj)); if (moj !== numer) return; }
  return new Promise((res) => {
    el.src = src;
    el.playbackRate = tempo;
    ustawLektorMowi(true);
    el.onended = () => { ustawLektorMowi(false); res(true); };
    el.onpause = () => { ustawLektorMowi(false); res(false); }; // zatrzymany (np. kliknięto inne nagranie) też kończy czekanie
    el.onerror = () => systemowy(tekst, glos).then(res);
    el.play().catch(() => systemowy(tekst, glos).then(res));
  });
}
