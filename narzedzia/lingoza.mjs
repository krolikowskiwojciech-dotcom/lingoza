#!/usr/bin/env node
// Narzędzie do treści Lingozy.
//   node narzedzia/lingoza.mjs sprawdz            — poprawność pakietów i artykułów (braki w słowniczkach)
//   node narzedzia/lingoza.mjs katalog            — przebudowa tresci/en/katalog.json
//   node narzedzia/lingoza.mjs nagraj             — ile znaków kosztują brakujące nagrania (nic nie wysyła)
//   node narzedzia/lingoza.mjs nagraj --tak       — generuje brakujące nagrania w ElevenLabs
//   node narzedzia/lingoza.mjs nagraj --tak --limit 5000   — z limitem znaków
// Klucz ElevenLabs: zmienna ELEVENLABS_API_KEY albo plik .env Wojtka na iCloud (nigdy nie wypisywany).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { MODEL, GLOSY, nagraniaPozycji, nagraniaArtykulu, nazwaPliku } from '../js/glosy.js';

const KORZEN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JEZYK = 'en';
const TRESCI = path.join(KORZEN, 'tresci', JEZYK);
const AUDIO = path.join(KORZEN, 'audio', JEZYK);
const ENV = path.join(os.homedir(), 'Library/Mobile Documents/com~apple~CloudDocs/Audio - do nauki /lekcje-audio/.env');

const czytaj = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const pliki = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(dir, f)) : []);

function wczytajWszystko() {
  const kategorie = czytaj(path.join(TRESCI, 'kategorie.json'));
  const pakiety = pliki(path.join(TRESCI, 'pakiety')).map((p) => ({ plik: path.relative(TRESCI, p), ...czytaj(p) }));
  const artykuly = pliki(path.join(TRESCI, 'artykuly')).map((p) => ({ plik: path.relative(TRESCI, p), ...czytaj(p) }));
  return { kategorie, pakiety, artykuly };
}

const TYPY = new Set(['slowo', 'zwrot', 'kolokacja', 'idiom', 'phrasal', 'zdanie', 'gramatyka']);
const TYPY_FRAZ = new Set(['idiom', 'phrasal', 'kolokacja', 'konstrukcja', 'zwrot']);

function tokeny(tekst) { return tekst.match(/[A-Za-z]+(?:['’][A-Za-z]+)*/g) || []; }

function znajdzSlowo(slowa, token) {
  const t = token.toLowerCase().replace(/[’]/g, "'");
  if (slowa[t]) return t;
  const proby = [t.replace(/'s$/, ''), t.replace(/s$/, ''), t.replace(/es$/, ''), t.replace(/ed$/, ''), t.replace(/d$/, ''), t.replace(/ing$/, ''), t.replace(/ing$/, 'e'), t.replace(/ies$/, 'y'), t.replace(/ied$/, 'y')];
  return proby.find((p) => slowa[p]) || null;
}

function sprawdz({ kategorie, pakiety, artykuly }) {
  const bledy = []; const uwagi = [];
  const dzialy = new Map(kategorie.flatMap((k) => k.dzialy.map((d) => [`${k.id}/${d.id}`, d])));
  const ids = new Set();
  for (const pk of pakiety) {
    if (ids.has(pk.id)) bledy.push(`powtórzony id pakietu ${pk.id}`);
    ids.add(pk.id);
    if (pk.rodzaj !== 'gramatyka' && !dzialy.has(`${pk.kategoria}/${pk.dzial}`)) bledy.push(`${pk.id}: nieznany dział ${pk.kategoria}/${pk.dzial}`);
    for (const k of ['id', 'tytul', 'emoji', 'kolor', 'pozycje']) if (!pk[k]) bledy.push(`${pk.id}: brak pola ${k}`);
    const pid = new Set(); const en = new Set();
    for (const p of pk.pozycje || []) {
      const gdzie = `${pk.id}/${p.id}`;
      if (pid.has(p.id)) bledy.push(`${gdzie}: powtórzony id`);
      pid.add(p.id);
      if (!TYPY.has(p.typ)) bledy.push(`${gdzie}: nieznany typ ${p.typ}`);
      if (!p.en || !p.pl) bledy.push(`${gdzie}: brak en/pl`);
      if (en.has(p.en?.toLowerCase())) uwagi.push(`${gdzie}: powtórzone „${p.en}”`);
      en.add(p.en?.toLowerCase());
      if (p.typ === 'gramatyka') {
        if (!/_{2,}/.test(p.en)) bledy.push(`${gdzie}: zdanie gramatyczne bez ___`);
        if (!p.opcje?.includes(p.odp)) bledy.push(`${gdzie}: odp nie ma w opcjach`);
      } else if (!(p.przyklady || []).length) uwagi.push(`${gdzie}: brak przykładu`);
      for (const x of p.przyklady || []) if (x.luka && !x.en.includes(x.luka)) bledy.push(`${gdzie}: luka „${x.luka}” nie występuje w przykładzie`);
    }
  }
  for (const a of artykuly) {
    if (!dzialy.has(`${a.kategoria}/${a.dzial}`)) bledy.push(`${a.id}: nieznany dział ${a.kategoria}/${a.dzial}`);
    if (a.akapity_pl && a.akapity_pl.length !== a.akapity.length) bledy.push(`${a.id}: liczba akapitów PL ≠ EN`);
    const tekst = a.akapity.join(' ');
    for (const f of a.frazy || []) {
      if (!TYPY_FRAZ.has(f.typ)) bledy.push(`${a.id}: fraza „${f.en}” ma nieznany typ ${f.typ}`);
      const formy = [f.en, ...(f.formy || [])];
      if (!formy.some((x) => tekst.toLowerCase().includes(x.toLowerCase()))) bledy.push(`${a.id}: fraza „${f.en}” nie występuje w tekście`);
    }
    const brak = new Set();
    for (const t of tokeny(tekst)) if (!znajdzSlowo(a.slowa || {}, t)) brak.add(t.toLowerCase());
    if (brak.size) uwagi.push(`${a.id}: słowa bez tłumaczenia (${brak.size}): ${[...brak].join(', ')}`);
  }
  return { bledy, uwagi };
}

function katalog(dane) {
  const k = {
    jezyk: JEZYK,
    kategorie: dane.kategorie,
    pakiety: dane.pakiety.map((p) => ({
      id: p.id, plik: p.plik, rodzaj: p.rodzaj || 'slowka', kategoria: p.kategoria || 'gramatyka', dzial: p.dzial || null,
      tytul: p.tytul, opis: p.opis, emoji: p.emoji, kolor: p.kolor, poziom: p.poziom, dla: p.dla || ['dorosli', 'dzieci'],
      start: !!p.start, liczba: p.pozycje.length,
    })),
    artykuly: dane.artykuly.map((a) => ({
      id: a.id, plik: a.plik, kategoria: a.kategoria, dzial: a.dzial, tytul: a.tytul, tytul_pl: a.tytul_pl, emoji: a.emoji,
      kolor: a.kolor, poziom: a.poziom, dla: a.dla || ['dorosli', 'dzieci'], slow: tokeny(a.akapity.join(' ')).length,
    })),
  };
  fs.writeFileSync(path.join(TRESCI, 'katalog.json'), JSON.stringify(k, null, 1) + '\n');
  return k;
}

async function potrzebneNagrania(dane) {
  const lista = [];
  for (const pk of dane.pakiety) for (const p of pk.pozycje) lista.push(...nagraniaPozycji(JEZYK, pk.id, p));
  for (const a of dane.artykuly) lista.push(...nagraniaArtykulu(a));
  for (const pk of dane.pakiety) for (const x of pk.lekcja?.przyklady || []) lista.push({ tekst: x.en, glos: 'alice', rola: 'gram-przyklad' });
  const unik = new Map();
  for (const n of lista) {
    const plik = await nazwaPliku(JEZYK, n.glos, n.tekst);
    if (!unik.has(plik)) unik.set(plik, { ...n, plik });
  }
  return [...unik.values()];
}

function kluczEL() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  if (fs.existsSync(ENV)) {
    const m = fs.readFileSync(ENV, 'utf8').match(/^ELEVENLABS_API_KEY=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('Brak klucza ElevenLabs (ELEVENLABS_API_KEY albo .env na iCloud)');
}

async function tts(klucz, glos, tekst) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${GLOSY[JEZYK][glos].id}?output_format=mp3_44100_64`;
  const body = { text: tekst, model_id: MODEL, language_code: JEZYK };
  for (let proba = 0; proba < 4; proba++) {
    const r = await fetch(url, { method: 'POST', headers: { 'xi-api-key': klucz, 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify(body) });
    if (r.ok) return Buffer.from(await r.arrayBuffer());
    const txt = await r.text();
    if (r.status === 400 && /language/i.test(txt) && body.language_code) { delete body.language_code; continue; }
    if (r.status === 429 || r.status >= 500) { await new Promise((s) => setTimeout(s, 2000 * (proba + 1))); continue; }
    throw new Error(`ElevenLabs ${r.status}: ${txt.slice(0, 200)}`);
  }
  throw new Error('ElevenLabs: zbyt wiele nieudanych prób');
}

function zapiszIndeks() {
  const lista = fs.readdirSync(AUDIO).filter((f) => /^[0-9a-f]{16}\.mp3$/.test(f)).sort();
  fs.writeFileSync(path.join(AUDIO, 'indeks.json'), JSON.stringify(lista) + '\n');
  return lista.length;
}

async function nagraj(dane, { tak, limit }) {
  fs.mkdirSync(AUDIO, { recursive: true });
  const wszystkie = await potrzebneNagrania(dane);
  const brak = wszystkie.filter((n) => !fs.existsSync(path.join(AUDIO, n.plik)));
  const znaki = brak.reduce((s, n) => s + n.tekst.length, 0);
  console.log(`Nagrań potrzebnych: ${wszystkie.length}, brakuje: ${brak.length}, znaków do wygenerowania: ${znaki}`);
  if (!tak) { console.log('Nic nie wysłano. Dodaj --tak, żeby wygenerować.'); return; }
  const klucz = kluczEL();
  let wydane = 0; let zrobione = 0; let i = 0;
  const kolejka = brak.filter((n) => { if (limit && wydane + n.tekst.length > limit) return false; wydane += n.tekst.length; return true; });
  const pracownik = async () => {
    while (i < kolejka.length) {
      const n = kolejka[i++];
      const dane2 = await tts(klucz, n.glos, n.tekst);
      fs.writeFileSync(path.join(AUDIO, n.plik), dane2);
      zrobione += 1;
      if (zrobione % 20 === 0) { console.log(`  ${zrobione}/${kolejka.length}`); zapiszIndeks(); }
    }
  };
  try { await Promise.all([pracownik(), pracownik(), pracownik()]); } finally { console.log(`Wygenerowano ${zrobione} nagrań, indeks: ${zapiszIndeks()} plików.`); }
}

const [, , cmd, ...arg] = process.argv;
const dane = wczytajWszystko();
if (cmd === 'sprawdz' || cmd === 'katalog' || cmd === 'wszystko') {
  const { bledy, uwagi } = sprawdz(dane);
  uwagi.forEach((u) => console.log('uwaga: ' + u));
  bledy.forEach((b) => console.log('BŁĄD: ' + b));
  if (bledy.length) process.exit(1);
  if (cmd !== 'sprawdz') {
    const k = katalog(dane);
    console.log(`katalog.json: ${k.pakiety.length} pakietów (${k.pakiety.reduce((s, p) => s + p.liczba, 0)} pozycji), ${k.artykuly.length} artykułów`);
  } else console.log('OK');
} else if (cmd === 'nagraj') {
  const li = arg.indexOf('--limit');
  await nagraj(dane, { tak: arg.includes('--tak'), limit: li >= 0 ? Number(arg[li + 1]) : 0 });
} else {
  console.log('Użycie: node narzedzia/lingoza.mjs sprawdz | katalog | nagraj [--tak] [--limit N]');
}
