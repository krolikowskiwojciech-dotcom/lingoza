// Stan aplikacji w localStorage: rodzina, wybrany profil i pełny stan nauki każdego profilu.
// Stan profilu jest tak zbudowany, żeby dało się go scalić z kopią z innego urządzenia bez utraty danych.

const LS = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* pełna pamięć albo tryb prywatny */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* */ } },
};
export { LS };

export const RODZINA_DOMYSLNA = {
  profile: [
    { id: 'wojtek', imie: 'Wojtek', avatar: '🦊', typ: 'dorosly', poziom: 'B1' },
    { id: 'magda', imie: 'Magda', avatar: '🦋', typ: 'dorosly', poziom: 'B1', praca: false },
    { id: 'aniela', imie: 'Aniela', avatar: '🐱', typ: 'dziecko', poziom: 'A2' },
    { id: 'julian', imie: 'Julian', avatar: '🐲', typ: 'dziecko', poziom: 'A2' },
  ],
  u: 0,
};

export const CELE = [
  { xp: 15, opis: 'Luźno', czas: 'ok. 5 min' },
  { xp: 30, opis: 'Regularnie', czas: '10–15 min' },
  { xp: 60, opis: 'Ambitnie', czas: '20–30 min' },
];

export function urzadzenie() {
  let id = LS.get('lz.urzadzenie');
  if (!id) { id = Math.random().toString(36).slice(2, 10); LS.set('lz.urzadzenie', id); }
  return id;
}

export const rodzina = () => LS.get('lz.rodzina', RODZINA_DOMYSLNA);
export const zapiszRodzine = (r) => LS.set('lz.rodzina', r);
export const profilInfo = (id) => rodzina().profile.find((p) => p.id === id);

export const aktualnyProfil = () => LS.get('lz.profil');
export const ustawProfil = (id) => LS.set('lz.profil', id);

export function nowyStan(id) {
  const info = profilInfo(id);
  const dziecko = info?.typ === 'dziecko';
  return {
    id, v: 1,
    ustawienia: {
      cel: 30, nowychDziennie: dziecko ? 6 : 8, pokazPrace: !dziecko && info?.praca !== false,
      przypomnienia: { wl: false, godziny: [dziecko ? 16 : 19], tylkoGdyBrak: true }, u: 0,
    },
    karty: {}, wprowadzone: {}, xp: {}, lekcje: {}, odznaki: {}, wlasne: {}, przeczytane: {}, aktywne: {}, quizy: {},
    zmieniono: 0,
  };
}

export function wczytajStan(id) {
  const s = LS.get('lz.p.' + id);
  if (!s) return nowyStan(id);
  const n = nowyStan(id);
  return { ...n, ...s, ustawienia: { ...n.ustawienia, ...s.ustawienia, przypomnienia: { ...n.ustawienia.przypomnienia, ...(s.ustawienia?.przypomnienia || {}) } } };
}

export function zapiszStan(s) {
  s.zmieniono = Date.now();
  LS.set('lz.p.' + s.id, s);
}

// ---------- scalanie dwóch kopii stanu tego samego profilu ----------
const nowszy = (a, b) => (!a ? b : !b ? a : (b.u || 0) > (a.u || 0) ? b : a);
const wczesniejszy = (a, b) => (a == null ? b : b == null ? a : Math.min(a, b));

function scalMape(a = {}, b = {}, f) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in out ? f(out[k], v) : v;
  return out;
}

// { dzień: { urządzenie: liczba } } → maksimum per urządzenie (każde urządzenie liczy tylko swoje)
const scalDni = (a, b) => scalMape(a, b, (x, y) => scalMape(x, y, Math.max));

export function scal(lok, zdal) {
  if (!zdal) return lok;
  return {
    ...lok,
    ustawienia: nowszy(lok.ustawienia, zdal.ustawienia),
    karty: scalMape(lok.karty, zdal.karty, nowszy),
    wprowadzone: scalMape(lok.wprowadzone, zdal.wprowadzone, wczesniejszy),
    xp: scalDni(lok.xp, zdal.xp),
    lekcje: scalDni(lok.lekcje, zdal.lekcje),
    odznaki: scalMape(lok.odznaki, zdal.odznaki, wczesniejszy),
    wlasne: scalMape(lok.wlasne, zdal.wlasne, nowszy),
    przeczytane: scalMape(lok.przeczytane, zdal.przeczytane, wczesniejszy),
    quizy: scalMape(lok.quizy, zdal.quizy, Math.max), // najlepszy wynik quizu artykułu
    aktywne: scalMape(lok.aktywne, zdal.aktywne, wczesniejszy),
  };
}

// do repo trafia stan bez pól czysto lokalnych
export const doRepo = ({ zmieniono, ...s }) => s;

// ---------- daty (strefa czasowa urządzenia) ----------
export function dzien(d = new Date()) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
export const sumaDnia = (mapa, d = dzien()) => Object.values(mapa?.[d] || {}).reduce((a, b) => a + b, 0);
