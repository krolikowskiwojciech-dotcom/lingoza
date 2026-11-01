// Rozpoznawanie mowy: nagranie z mikrofonu → ElevenLabs Scribe (speech-to-text) → porównanie słowo po słowie ze wzorem.
// Klucz ElevenLabs przychodzi z prywatnego repo danych (klucze.json) razem z synchronizacją; bez klucza ćwiczenie
// wraca do samooceny.

import { LS } from './store.js';
import { ustawMikrofon } from './dzwieki.js';

export const kluczEL = () => LS.get('lz.elKey');
export const ustawKluczEL = (k) => LS.set('lz.elKey', k);
export const mozeRozpoznawac = () => !!kluczEL() && !!window.MediaRecorder && !!navigator.mediaDevices?.getUserMedia;

// iPhone: aplikacja trzyma sesję audio „playback” (lektor gra przy wyciszonym telefonie), a ta sesja nie pozwala nagrywać —
// na czas nagrania przełączamy ją na „play-and-record”, potem wracamy.
export const sesja = (typ) => { try { if (navigator.audioSession) navigator.audioSession.type = typ; } catch { /* starsze iOS */ } };

// komunikat zamiast ogólnego „brak dostępu”: z nazwą błędu, żeby było wiadomo, co poprawić
export function opisBleduMikrofonu(e) {
  const n = e?.name || '';
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'Przeglądarka nie ma zgody na mikrofon. Na iPhonie: Ustawienia → ta przeglądarka (Safari, Chrome…) → Mikrofon, a w samej stronie „aA” → Ustawienia witryny → Mikrofon: Zezwalaj. Potem odśwież stronę.';
  if (n === 'NotFoundError') return 'Nie znaleziono mikrofonu.';
  if (n === 'NotReadableError' || n === 'AbortError') return 'Mikrofon jest zajęty przez inną aplikację (rozmowa, nagrywanie). Zamknij ją i spróbuj jeszcze raz.';
  return `Nie udało się włączyć mikrofonu (${n || e?.message || 'błąd'}). Odśwież stronę i spróbuj jeszcze raz.`;
}

export class Nagrywanie {
  async start() {
    sesja('play-and-record');
    try {
      this.strumien = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (e) { sesja('playback'); throw e; }
    this.kawalki = [];
    this.rec = new MediaRecorder(this.strumien);
    this.rec.ondataavailable = (e) => { if (e.data.size) this.kawalki.push(e.data); };
    this.koniec = new Promise((r) => { this.rec.onstop = () => { this.strumien.getTracks().forEach((t) => t.stop()); sesja('playback'); r(new Blob(this.kawalki, { type: this.rec.mimeType || 'audio/mp4' })); }; });
    this.rec.start();
    ustawMikrofon(true);
  }
  stop() { ustawMikrofon(false); if (this.rec?.state === 'recording') this.rec.stop(); return this.koniec; }
  get trwa() { return this.rec?.state === 'recording'; }
}

// Jeden format wejściowy dla Safari/iPhone i Chrome: mono PCM WAV.
// Nie wysyłamy kontenera wybranego automatycznie przez MediaRecorder.
export function wavMono(bufor) {
  const liczba = bufor.length;
  const dane = new ArrayBuffer(44 + liczba * 2);
  const v = new DataView(dane);
  const napis = (offset, s) => { for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i)); };
  napis(0, 'RIFF'); v.setUint32(4, 36 + liczba * 2, true); napis(8, 'WAVE');
  napis(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, bufor.sampleRate, true); v.setUint32(28, bufor.sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true); napis(36, 'data'); v.setUint32(40, liczba * 2, true);
  const kanaly = Array.from({ length: bufor.numberOfChannels }, (_, i) => bufor.getChannelData(i));
  for (let i = 0; i < liczba; i++) {
    const x = Math.max(-1, Math.min(1, kanaly.reduce((s, k) => s + k[i], 0) / kanaly.length));
    v.setInt16(44 + i * 2, Math.round(x * (x < 0 ? 32768 : 32767)), true);
  }
  return new Blob([dane], { type: 'audio/wav' });
}

export async function przygotujNagranie(blob) {
  if (!blob?.size) throw new Error('Nagranie jest puste. Naciśnij mikrofon i powiedz słowo.');
  const Kontekst = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!Kontekst) throw new Error('Ta przeglądarka nie obsługuje sprawdzania nagrań. Użyj aktualnego Safari lub Chrome.');
  let bufor;
  try { bufor = await new Kontekst(1, 1, 44100).decodeAudioData(await blob.arrayBuffer()); }
  catch { throw new Error('Nie udało się odczytać nagrania. Nagraj słowo ponownie.'); }
  if (bufor.duration < 0.2) throw new Error('Nagranie jest za krótkie. Powiedz całe słowo przed zatrzymaniem.');
  return wavMono(bufor);
}

export async function rozpoznaj(blob, jezyk = 'en') {
  const nagranie = await przygotujNagranie(blob);
  const f = new FormData();
  f.append('model_id', 'scribe_v2');
  f.append('language_code', jezyk);
  f.append('tag_audio_events', 'false');
  f.append('file', nagranie, 'mowa.wav');
  const r = await fetch('https://api.elevenlabs.io/v1/speech-to-text', { method: 'POST', headers: { 'xi-api-key': kluczEL() }, body: f });
  const dane = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 || r.status === 403) throw new Error('Usługa nie przyjęła klucza do rozpoznawania mowy.');
    const powod = typeof dane.detail === 'string' ? dane.detail : dane.detail?.message;
    throw new Error(powod ? `Nie udało się sprawdzić nagrania: ${powod.slice(0, 220)}` : `Nie udało się sprawdzić nagrania (${r.status}). Spróbuj ponownie.`);
  }
  return (dane.text || '').trim();
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
