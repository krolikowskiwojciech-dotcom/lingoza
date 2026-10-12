// Wspólne reguły nagrań: którym głosem czytamy który tekst i jak nazywa się plik.
// Używa go aplikacja (przeglądarka) i narzędzie narzedzia/lingoza.mjs (Node), więc obie strony
// liczą identyczne nazwy plików i aplikacja wie, gdzie szukać nagrania bez osobnej mapy.

export const MODEL = 'eleven_v4';

// głosy ElevenLabs (biblioteka premade, dostępne na każdym koncie)
export const GLOSY = {
  en: {
    alice: { id: 'Xb7hH8MSUJpSbSDYk0k2', opis: 'Alice, brytyjski, kobieta' },
    george: { id: 'JBFqnCBsd6RMkjVDRZzb', opis: 'George, brytyjski, mężczyzna' },
    sarah: { id: 'EXAVITQu4vr4xnSDxMaL', opis: 'Sarah, amerykański, kobieta' },
    brian: { id: 'nPczCjzI2devNBz1zQrb', opis: 'Brian, amerykański, mężczyzna' },
  },
};

// hasło (słowo/zwrot) zawsze w dwóch akcentach: brytyjskim i amerykańskim
const HASLO = { en: ['alice', 'brian', 'george', 'sarah'] };
const ROTACJA = { en: ['george', 'sarah', 'alice', 'brian'] };

function nr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export const glosZdania = (jezyk, klucz, i = 0) => {
  const r = ROTACJA[jezyk];
  return r[(nr(klucz) + i) % r.length];
};

// lista nagrań potrzebnych dla jednej pozycji pakietu: [{ tekst, glos, rola }]
export function nagraniaPozycji(jezyk, pakietId, p) {
  const out = [];
  if (p.typ === 'gramatyka') {
    out.push({ tekst: zdanieGram(p), glos: glosZdania(jezyk, `${pakietId}/${p.id}`), rola: 'zdanie' });
    return out;
  }
  for (const g of HASLO[jezyk]) out.push({ tekst: p.en, glos: g, rola: 'haslo' });
  // pytanie nauczyciela (ćwiczenie „Odpowiedz nauczycielowi”)
  if (/^Pytanie:/.test(p.uwaga || '')) out.push({ tekst: p.uwaga.replace(/^Pytanie:\s*/, '').trim(), glos: 'george', rola: 'pytanie' });
  // wszystkie przykłady z nagraniem (głos rotuje), bo głos systemowy na iPhonie bywa zablokowany
  // każdy przykład w dwóch głosach (różny akcent przy powtórkach)
  (p.przyklady || []).forEach((x, i) => {
    for (const k of [0, 2]) out.push({ tekst: x.en, glos: glosZdania(jezyk, `${pakietId}/${p.id}`, i + k), rola: 'przyklad' });
  });
  return out;
}

// zdanie gramatyczne z wstawioną poprawną odpowiedzią: "I ___ there." + "went" → "I went there."
export const zdanieGram = (p) => p.en.replace(/_{2,}/, p.odp);

export const glosArtykulu = (a) => a.glos || 'alice';

export function nagraniaArtykulu(a) {
  const out = [];
  const g = glosArtykulu(a);
  for (const ak of a.akapity) out.push({ tekst: ak, glos: g, rola: 'akapit' });
  for (const f of a.frazy || []) out.push({ tekst: f.en, glos: 'alice', rola: 'fraza' });
  for (const w of Object.keys(a.slowa || {})) out.push({ tekst: w, glos: 'alice', rola: 'slowo' });
  for (const q of a.pytania || []) out.push({ tekst: q.pytanie, glos: g, rola: 'pytanie' });
  return out;
}

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

// nazwa pliku: skrót SHA-1 z modelu, głosu i tekstu — to samo zdanie nie nagrywa się drugi raz
export async function nazwaPliku(jezyk, glos, tekst) {
  const dane = new TextEncoder().encode(`${MODEL}|${GLOSY[jezyk][glos].id}|${tekst.trim()}`);
  const subtle = globalThis.crypto?.subtle;
  if (subtle) return hex(await subtle.digest('SHA-1', dane)).slice(0, 16) + '.mp3';
  const { createHash } = await import('node:crypto');
  return createHash('sha1').update(dane).digest('hex').slice(0, 16) + '.mp3';
}
