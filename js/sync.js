// Synchronizacja przez prywatne repozytorium GitHub (lingoza-dane).
// Każdy profil ma osobny plik profile/<id>.json, więc dwa urządzenia różnych osób sobie nie przeszkadzają.
// Dwa tryby połączenia:
// - github.io: bezpośrednio api.github.com z tokenem wklejonym w Profilu,
// - *.ogarnijmaterial.pl: przez pośrednika https://ogarnijmaterial.pl/api/gh/… z ciasteczkiem sesji (bez tokenu w aplikacji).

import { LS, scal, doRepo, rodzina, zapiszRodzine, RODZINA_DOMYSLNA } from './store.js';

const API = 'https://api.github.com';
export const REPO_DANYCH = 'krolikowskiwojciech-dotcom/lingoza-dane';

// ---------- tryb ogarnijmaterial.pl ----------
export const STRONA_GLOWNA = 'https://ogarnijmaterial.pl/';
export const STRONA_KONTA = 'https://ogarnijmaterial.pl/#konta';
const POSREDNIK = 'https://ogarnijmaterial.pl/api/gh';
// Test lokalny: ?om=<id profilu> (albo ?om=401) symuluje ogarnijmaterial.pl — działa TYLKO na 127.0.0.1/localhost
// i nigdy nie łączy się z prawdziwymi danymi (synchronizacja w tym trybie jest wyłączona).
const LOKALNY = ['127.0.0.1', 'localhost'].includes(location.hostname);
const TEST_OM = LOKALNY ? new URLSearchParams(location.search).get('om') : null;
export const OGARNIJ = location.hostname === 'ogarnijmaterial.pl' || location.hostname.endsWith('.ogarnijmaterial.pl') || !!TEST_OM;
export const OGARNIJ_TEST = !!TEST_OM;

// kto jest zalogowany na ogarnijmaterial.pl: { id, … } albo null (401); błąd sieci → wyjątek
export async function kimJestem() {
  if (TEST_OM) return TEST_OM === '401' ? null : { id: TEST_OM, test: true };
  const r = await fetch('https://ogarnijmaterial.pl/api/ja', { credentials: 'include', cache: 'no-store' });
  if (r.status === 401) return null;
  if (!r.ok) throw new Error(`ogarnijmaterial.pl: błąd ${r.status}`);
  return r.json();
}

export const konfig = () => LS.get('lz.sync');
export const ustawKonfig = (c) => (c ? LS.set('lz.sync', c) : LS.del('lz.sync'));

// sposób połączenia z repo danych albo null (synchronizacja wyłączona)
function polaczenie() {
  if (OGARNIJ) return OGARNIJ_TEST ? null : { baza: POSREDNIK, posrednik: true, repo: REPO_DANYCH };
  const c = konfig();
  return c?.token ? { baza: API, token: c.token, repo: c.repo || REPO_DANYCH } : null;
}
export const synchroDostepna = () => !!polaczenie();

const enc = (str) => {
  const bytes = new TextEncoder().encode(str);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const dec = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

async function gh(p, path, opts = {}) {
  const r = await fetch(p.baza + path, {
    cache: 'no-store',
    ...opts,
    credentials: p.posrednik ? 'include' : 'omit',
    headers: { Accept: 'application/vnd.github+json', ...(p.token ? { Authorization: `Bearer ${p.token}` } : {}), ...(opts.headers || {}) },
  });
  if (r.status === 401) {
    const e = new Error(p.posrednik ? 'Sesja na ogarnijmaterial.pl wygasła — zaloguj się ponownie' : 'Nieprawidłowy albo wygasły token GitHub');
    e.wylogowany = !!p.posrednik;
    throw e;
  }
  return r;
}

export async function pobierz(p, plik) {
  const repo = p.repo;
  const r = await gh(p, `/repos/${repo}/contents/${plik}`);
  if (r.status === 404) {
    const rr = await gh(p, `/repos/${repo}`);
    if (!rr.ok) throw new Error(`Brak dostępu do repozytorium ${repo}`);
    return { sha: null, dane: null };
  }
  if (!r.ok) throw new Error(`GitHub: błąd ${r.status}`);
  const j = await r.json();
  return { sha: j.sha, dane: JSON.parse(dec(j.content || '') || 'null') };
}

export async function zapisz(p, plik, dane, sha, opis) {
  const body = { message: opis, content: enc(JSON.stringify(dane) + '\n') };
  if (sha) body.sha = sha;
  const r = await gh(p, `/repos/${p.repo}/contents/${plik}`, { method: 'PUT', body: JSON.stringify(body) });
  if (r.status === 409 || r.status === 422) { const e = new Error('konflikt'); e.konflikt = true; throw e; }
  if (r.status === 403 || r.status === 404) throw new Error(p.posrednik ? 'Brak prawa zapisu do danych rodziny' : 'Token nie ma prawa zapisu do repozytorium danych');
  if (!r.ok) throw new Error(`GitHub: błąd ${r.status} przy zapisie`);
  return (await r.json()).content?.sha;
}

const ostatnioWyslane = (id) => LS.get('lz.wyslane.' + id);

// scala stan profilu z repo i wysyła wynik; zwraca scalony stan
export async function synchronizujProfil(stan) {
  const p = polaczenie();
  if (!p) return stan;
  const plik = `profile/${stan.id}.json`;
  for (let proba = 0; proba < 3; proba++) {
    const { sha, dane } = await pobierz(p, plik);
    const wynik = scal(stan, dane);
    const json = JSON.stringify(doRepo(wynik));
    if (json === JSON.stringify(dane ? doRepo(dane) : null) || json === ostatnioWyslane(stan.id)) return wynik;
    try {
      await zapisz(p, plik, doRepo(wynik), sha, `Lingoza: postępy ${stan.id}`);
      LS.set('lz.wyslane.' + stan.id, json);
      return wynik;
    } catch (e) {
      if (!e.konflikt) throw e;
      stan = wynik;
    }
  }
  return stan;
}

// klucz ElevenLabs (rozpoznawanie mowy) i publiczny klucz VAPID (przypomnienia) z prywatnego repo — tylko do odczytu
export async function pobierzKlucze() {
  const p = polaczenie();
  if (!p) return;
  try {
    const { dane } = await pobierz(p, 'klucze.json');
    if (dane?.elevenlabsKey) LS.set('lz.elKey', dane.elevenlabsKey);
    if (dane?.vapidPublic) LS.set('lz.vapid', dane.vapidPublic);
  } catch { /* brak pliku */ }
}

export async function synchronizujRodzine() {
  const p = polaczenie();
  if (!p) return rodzina();
  const { sha, dane } = await pobierz(p, 'rodzina.json');
  const lok = rodzina();
  if (!dane || (lok.u || 0) > (dane.u || 0)) {
    const r = dane ? lok : { ...RODZINA_DOMYSLNA, ...lok };
    await zapisz(p, 'rodzina.json', r, sha, 'Lingoza: rodzina');
    return r;
  }
  zapiszRodzine(dane);
  return dane;
}

// stany pozostałych profili (tylko do odczytu) — do ligi rodzinnej
export async function pobierzInne(ids) {
  const p = polaczenie();
  if (!p) return {};
  const out = {};
  await Promise.all(ids.map(async (id) => {
    try { out[id] = (await pobierz(p, `profile/${id}.json`)).dane; } catch { /* brak pliku */ }
  }));
  LS.set('lz.inne', out);
  return out;
}

export const inneZPamieci = () => LS.get('lz.inne', {});

// subskrypcja powiadomień push danego urządzenia → push/<profil>-<urządzenie>.json
export async function zapiszSubskrypcje(profil, urz, sub, ustawienia) {
  const p = polaczenie();
  if (!p) throw new Error(OGARNIJ ? 'Przypomnienia nie działają w trybie testowym' : 'Najpierw włącz synchronizację (token GitHub)');
  const plik = `push/${profil}-${urz}.json`;
  const { sha } = await pobierz(p, plik);
  await zapisz(p, plik, { profil, urzadzenie: urz, sub, ...ustawienia, strefa: Intl.DateTimeFormat().resolvedOptions().timeZone, u: Date.now() }, sha, `Lingoza: przypomnienia ${profil}`);
}
