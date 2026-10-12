// Treści: katalog działów, pakiety słówek/zwrotów, lekcje gramatyki i artykuły.
// Pliki leżą w tresci/<język>/, katalog.json buduje narzędzie narzedzia/lingoza.mjs.

const cache = new Map();

async function json(url) {
  if (cache.has(url)) return cache.get(url);
  const p = fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Nie udało się wczytać ${url}`);
    return r.json();
  });
  cache.set(url, p);
  p.catch(() => cache.delete(url));
  return p;
}

export const JEZYK = 'en';
const baza = () => `tresci/${JEZYK}/`;

export const katalog = () => json(baza() + 'katalog.json');
export const pakiet = (id) => katalog().then((k) => json(baza() + k.pakiety.find((p) => p.id === id).plik));
export const artykul = (id) => katalog().then((k) => json(baza() + k.artykuly.find((a) => a.id === id).plik));

// wszystkie pozycje ze wszystkich pakietów, pod kluczem „pakiet/pozycja”
let indeks = null;
export async function wszystkiePozycje() {
  if (indeks) return indeks;
  const k = await katalog();
  const pak = await Promise.all(k.pakiety.map((p) => pakiet(p.id)));
  const m = new Map();
  for (const pk of pak) {
    pk.pozycje.forEach((p, i) => m.set(`${pk.id}/${p.id}`, { ...p, pakiet: pk.id, kolejnosc: i, rodzaj: pk.rodzaj, dla: pk.dla }));
  }
  indeks = m;
  return m;
}

// pozycja własna (dodana z artykułu) wygląda jak zwykła pozycja pakietu „wlasne”
export function pozycjaWlasna(id, w) {
  return { id, pakiet: 'wlasne', typ: w.typ || 'zwrot', en: w.en, pl: w.pl, uwaga: w.uwaga, przyklady: w.przyklad ? [w.przyklad] : [], wlasna: true };
}

export async function pozycja(ref, stan) {
  if (ref.startsWith('wlasne/')) {
    const id = ref.slice(7);
    return stan.wlasne[id] ? pozycjaWlasna(id, stan.wlasne[id]) : null;
  }
  return (await wszystkiePozycje()).get(ref) || null;
}

// czy pakiet/artykuł jest widoczny dla profilu (dzieci nie widzą działu „Praca”)
export const widoczny = (el, ustawienia, info) => {
  if (el.rodzaj === 'kartkowka') return false; // kartkówki mają własną sekcję (kartkowkiProfilu)
  if (el.kategoria === 'praca' && !ustawienia.pokazPrace) return false;
  if (el.profile && info && !el.profile.includes(info.id)) return false; // treści przypisane do osoby (np. podręcznik Juliana)
  if (el.dla && info && !el.dla.includes(info.typ === 'dziecko' ? 'dzieci' : 'dorosli')) return false;
  return true;
};

// kartkówki przypisane do profilu (pole „profile” w pakiecie), od najnowszej
export const kartkowkiProfilu = (k, id) => k.pakiety.filter((p) => p.rodzaj === 'kartkowka' && (p.profile || []).includes(id))
  .sort((a, b) => String(b.termin || b.dodano).localeCompare(String(a.termin || a.dodano)));
