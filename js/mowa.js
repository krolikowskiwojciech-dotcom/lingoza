// Rozpoznawanie mowy: nagranie z mikrofonu → ElevenLabs Scribe (speech-to-text) → porównanie słowo po słowie ze wzorem.
// Klucz ElevenLabs przychodzi z prywatnego repo danych (klucze.json) razem z synchronizacją; bez klucza ćwiczenie
// wraca do samooceny.

import { LS } from './store.js';

export const kluczEL = () => LS.get('lz.elKey');
export const ustawKluczEL = (k) => LS.set('lz.elKey', k);
export const mozeRozpoznawac = () => !!kluczEL() && !!window.MediaRecorder && !!navigator.mediaDevices?.getUserMedia;

export class Nagrywanie {
  async start() {
    this.strumien = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    this.kawalki = [];
    this.rec = new MediaRecorder(this.strumien);
    this.rec.ondataavailable = (e) => { if (e.data.size) this.kawalki.push(e.data); };
    this.koniec = new Promise((r) => { this.rec.onstop = () => { this.strumien.getTracks().forEach((t) => t.stop()); r(new Blob(this.kawalki, { type: this.rec.mimeType || 'audio/mp4' })); }; });
    this.rec.start();
  }
  stop() { if (this.rec?.state === 'recording') this.rec.stop(); return this.koniec; }
  get trwa() { return this.rec?.state === 'recording'; }
}

export async function rozpoznaj(blob, jezyk = 'en') {
  const f = new FormData();
  f.append('model_id', 'scribe_v2');
  f.append('language_code', jezyk);
  f.append('tag_audio_events', 'false');
  f.append('file', blob, blob.type.includes('webm') ? 'mowa.webm' : 'mowa.m4a');
  const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': kluczEL() }, body: f });
  if (!r.ok) throw new Error(r.status === 401 ? 'Klucz ElevenLabs nie działa' : `Rozpoznawanie: błąd ${r.status}`);
  return ((await r.json()).text || '').trim();
}

// ---------- porównanie ----------
const SKROTY = {
  "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are', "he's": 'he is', "she's": 'she is', "it's": 'it is',
  "that's": 'that is', "there's": 'there is', "what's": 'what is', "i've": 'i have', "we've": 'we have', "they've": 'they have',
  "i'll": 'i will', "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "isn't": 'is not', "aren't": 'are not',
  "can't": 'can not', 'cannot': 'can not', "won't": 'will not', "haven't": 'have not', "hasn't": 'has not', "i'd": 'i would', "let's": 'let us',
};
const LICZBY = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 12: 'twelve', 13: 'thirteen' };

export function slowa(t) {
  return t.toLowerCase().replace(/[’‘`]/g, "'").replace(/[^a-z0-9']+/g, ' ').split(/\s+/).filter(Boolean)
    .flatMap((w) => (SKROTY[w] || LICZBY[w] || w.replace(/^'+|'+$/g, '')).split(' ')).filter(Boolean);
}

function podobne(a, b) {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  // literówka rozpoznawania / akcent: odległość edycyjna ≤ 1
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0; while (i < a.length && a[i] === b[i]) i++;
  return a.slice(i + 1) === b.slice(i + 1) || a.slice(i + 1) === b.slice(i) || a.slice(i) === b.slice(i + 1);
}

// LCS na słowach → które słowa wzoru padły; wynik 0–1
export function porownaj(wzor, powiedziane) {
  const W = wzor.split(/\s+/).filter(Boolean);                 // słowa do wyświetlenia
  const Wn = W.map((w) => slowa(w));                            // każde może dać 1–2 słowa po rozwinięciu skrótu
  const cel = Wn.flat();
  const mow = slowa(powiedziane);
  const n = cel.length; const m = mow.length;
  const d = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) d[i][j] = podobne(cel[i], mow[j]) ? d[i + 1][j + 1] + 1 : Math.max(d[i + 1][j], d[i][j + 1]);
  const trafione = new Set();
  for (let i = 0, j = 0; i < n && j < m;) {
    if (podobne(cel[i], mow[j])) { trafione.add(i); i++; j++; } else if (d[i + 1][j] >= d[i][j + 1]) i++; else j++;
  }
  let k = 0;
  const wyswietl = W.map((w, idx) => { const ile = Wn[idx].length; let ok = ile > 0; for (let x = 0; x < ile; x++) ok = ok && trafione.has(k + x); k += ile; return { w, ok: ile === 0 || ok }; });
  return { wynik: n ? trafione.size / n : 0, slowa: wyswietl };
}
