// Budowa lekcji: powtórki z FSRS + kilka nowych pozycji, przeplatane.
// Dobór ćwiczenia zależy od karty: im lepiej pamiętasz, tym trudniejsze ćwiczenie (drabinka z ZASADY-NAUKI.md).

import { katalog, pakiet, pozycja, widoczny, wszystkiePozycje } from './content.js';
import { dzien } from './store.js';

const MAX_POWTOREK = 12;
const MAX_CWICZEN = 32;

export const refKarty = (klucz) => klucz.slice(0, klucz.lastIndexOf('|'));
export const kierunek = (klucz) => klucz.slice(klucz.lastIndexOf('|') + 1);

export function wprowadzoneDzis(stan) {
  const d = dzien();
  return Object.values(stan.wprowadzone).filter((t) => dzien(new Date(t)) === d).length;
}

// pozycje, które jeszcze nie były wprowadzone, w kolejności: własne, potem aktywne pakiety
// zakres lekcji: { pakiet: id } albo { pakiety: [id…] } (np. cały dział z talii kart); null = wszystko aktywne
const pakietyZakresu = (zakres) => (zakres?.pakiety || (zakres?.pakiet ? [zakres.pakiet] : null));

async function kandydaciNowych(stan, info, zakres) {
  const out = [];
  const wybrane = pakietyZakresu(zakres);
  if (!wybrane) for (const id of Object.keys(stan.wlasne)) { const ref = `wlasne/${id}`; if (!stan.wprowadzone[ref]) out.push(ref); }
  const k = await katalog();
  const aktywne = wybrane || Object.entries(stan.aktywne).sort((a, b) => a[1] - b[1]).map(([id]) => id);
  // po kolei z każdego aktywnego pakietu, żeby lekcja mieszała tematy
  const listy = [];
  for (const id of aktywne) {
    const meta = k.pakiety.find((p) => p.id === id);
    if (!meta || !widoczny(meta, stan.ustawienia, info)) continue;
    const pk = await pakiet(id);
    listy.push(pk.pozycje.map((p) => `${pk.id}/${p.id}`).filter((ref) => !stan.wprowadzone[ref]));
  }
  for (let i = 0; listy.some((l) => l.length); i++) {
    const l = listy[i % listy.length];
    if (l.length) out.push(l.shift());
  }
  return out;
}

export async function budujLekcje(stan, info, zakres = null) {
  const teraz = Date.now();
  const dziecko = info?.typ === 'dziecko';
  const k = await katalog();
  const widocznePakiety = new Set(k.pakiety.filter((p) => widoczny(p, stan.ustawienia, info)).map((p) => p.id));
  widocznePakiety.add('wlasne');
  const pasuje = (klucz) => {
    const ref = refKarty(klucz);
    const pk = ref.split('/')[0];
    const wybrane = pakietyZakresu(zakres);
    if (wybrane) return wybrane.includes(pk);
    return widocznePakiety.has(pk);
  };

  const powtorki = Object.entries(stan.karty)
    .filter(([kl, c]) => c.due <= teraz && pasuje(kl))
    .sort((a, b) => a[1].due - b[1].due)
    .slice(0, MAX_POWTOREK)
    .map(([kl]) => ({ rodzaj: 'karta', klucz: kl }));

  const limitDnia = Math.max(0, stan.ustawienia.nowychDziennie - wprowadzoneDzis(stan));
  // wybrany wprost pakiet/dział: nowe pozycje także po wyczerpaniu dziennego limitu (to świadomy wybór)
  const ileNowych = pakietyZakresu(zakres) ? (dziecko ? 3 : 4) : Math.min(limitDnia || (powtorki.length ? 0 : 2), dziecko ? 3 : 4);
  const nowe = (await kandydaciNowych(stan, info, zakres)).slice(0, ileNowych);

  // przeplot: 2 powtórki, nowa, 2 powtórki, nowa…
  const kolejka = [];
  const pw = [...powtorki];
  for (const ref of nowe) {
    kolejka.push(...pw.splice(0, 2));
    kolejka.push({ rodzaj: 'nowa', ref });
  }
  kolejka.push(...pw);

  // nic do zrobienia → utrwalanie: karty, które wkrótce i tak wypadną
  if (!kolejka.length) {
    const nastepne = Object.entries(stan.karty).filter(([kl]) => pasuje(kl))
      .sort((a, b) => a[1].due - b[1].due).slice(0, 10)
      .map(([kl]) => ({ rodzaj: 'karta', klucz: kl }));
    return { kolejka: nastepne, utrwalanie: true, nowych: 0, powtorek: nastepne.length };
  }
  return { kolejka, utrwalanie: false, nowych: nowe.length, powtorek: powtorki.length };
}

// licznik na ekranie głównym
export async function naDzis(stan, info) {
  const teraz = Date.now();
  const k = await katalog();
  const widoczne = new Set(k.pakiety.filter((p) => widoczny(p, stan.ustawienia, info)).map((p) => p.id));
  widoczne.add('wlasne');
  const powtorki = Object.entries(stan.karty).filter(([kl, c]) => c.due <= teraz && widoczne.has(refKarty(kl).split('/')[0])).length;
  const limit = Math.max(0, stan.ustawienia.nowychDziennie - wprowadzoneDzis(stan));
  const nowe = limit ? Math.min(limit, (await kandydaciNowych(stan, info, null)).length) : 0;
  return { powtorki, nowe };
}

const losuj = (arr) => arr[Math.floor(Math.random() * arr.length)];
const slowa = (s) => s.trim().split(/\s+/).length;

// Drabinka ćwiczeń: pierwsze spotkanie — wybór/układanie (rozpoznanie), potem przede wszystkim WPISYWANIE
// (przypominanie z pamięci jest najskuteczniejsze — ZASADY-NAUKI.md), a przy dobrze znanych pozycjach luka i mówienie.
export function wybierzCwiczenie(klucz, karta, p, info) {
  const kier = kierunek(klucz);
  const dziecko = info?.typ === 'dziecko';
  const pierwszy = !karta || (karta.reps || 0) === 0;
  const st = karta?.stability || 0;
  const wielowyrazowe = slowa(p.en) >= 3;
  if (p.typ === 'gramatyka') return pierwszy ? 'gram-wybor' : (dziecko ? losuj(['gram-wybor', 'gram-wpisz']) : losuj(['gram-wpisz', 'gram-wpisz', 'gram-wybor']));
  if (kier === 'r') {
    // obrazki tylko dla pojedynczych słów (zwroty i czynności źle się „rysują” emoji)
    const obrazkowe = p.obraz && p.typ === 'slowo';
    if (pierwszy) return dziecko && obrazkowe ? 'obrazek' : losuj(['sluchaj', 'enpl']);
    if (dziecko) return losuj(['sluchaj', 'enpl-wpisz', 'sluchaj-wpisz', obrazkowe ? 'obrazek' : 'enpl']);
    return losuj(['enpl-wpisz', 'sluchaj-wpisz', 'sluchaj-wpisz', 'enpl']);
  }
  const maLuke = (p.przyklady || []).some((x) => x.luka || x.en.toLowerCase().includes(p.en.toLowerCase()));
  if (pierwszy) return wielowyrazowe ? 'uloz' : 'plen';
  if (dziecko) return losuj(['wpisz', 'dyktando', wielowyrazowe ? 'uloz' : 'plen', 'wpisz']);
  if (st < 7) return losuj(['wpisz', 'wpisz', 'dyktando', wielowyrazowe ? 'uloz' : 'luka'].map((t) => (t === 'luka' && !maLuke ? 'wpisz' : t)));
  return losuj(['wpisz', 'dyktando', 'mow', maLuke ? 'luka' : 'wpisz']);
}

// błędne odpowiedzi do wyboru: z tego samego pakietu, potem z innych
export async function dystraktory(p, pole, ile = 3) {
  const wszystkie = [...(await wszystkiePozycje()).values()].filter((x) => x.typ !== 'gramatyka');
  const zly = (x) => x[pole] && x[pole].toLowerCase() !== p[pole].toLowerCase() && !(p.myli || []).includes(x.en);
  const pierwsze = wszystkie.filter((x) => x.pakiet === p.pakiet && zly(x) && x.typ === p.typ);
  const reszta = wszystkie.filter((x) => zly(x) && !pierwsze.includes(x));
  const mieszaj = (a) => a.map((x) => [Math.random(), x]).sort((a1, b1) => a1[0] - b1[0]).map((x) => x[1]);
  const out = [];
  for (const x of [...mieszaj(pierwsze), ...mieszaj(reszta)]) {
    if (out.length >= ile) break;
    if (!out.some((o) => o[pole].toLowerCase() === x[pole].toLowerCase())) out.push(x);
  }
  return out;
}

export { pozycja, MAX_CWICZEN };
