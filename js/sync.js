// Synchronizacja przez prywatne repozytorium GitHub (lingoza-dane), bez własnego serwera.
// Każdy profil ma osobny plik profile/<id>.json, więc dwa urządzenia różnych osób sobie nie przeszkadzają.

import { LS, scal, doRepo, rodzina, zapiszRodzine, RODZINA_DOMYSLNA } from './store.js';

const API = 'https://api.github.com';
export const REPO_DANYCH = 'krolikowskiwojciech-dotcom/lingoza-dane';

export const konfig = () => LS.get('lz.sync');
export const ustawKonfig = (c) => (c ? LS.set('lz.sync', c) : LS.del('lz.sync'));

const enc = (str) => {
  const bytes = new TextEncoder().encode(str);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
const dec = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

async function gh(token, path, opts = {}) {
  const r = await fetch(API + path, {
    cache: 'no-store',
    ...opts,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', ...(opts.headers || {}) },
  });
  if (r.status === 401) throw new Error('Nieprawidłowy albo wygasły token GitHub');
  return r;
}

export async function pobierz(repo, token, plik) {
  const r = await gh(token, `/repos/${repo}/contents/${plik}`);
  if (r.status === 404) {
    const rr = await gh(token, `/repos/${repo}`);
    if (!rr.ok) throw new Error(`Brak dostępu do repozytorium ${repo}`);
    return { sha: null, dane: null };
  }
  if (!r.ok) throw new Error(`GitHub: błąd ${r.status}`);
  const j = await r.json();
  return { sha: j.sha, dane: JSON.parse(dec(j.content || '') || 'null') };
}

export async function zapisz(repo, token, plik, dane, sha, opis) {
  const body = { message: opis, content: enc(JSON.stringify(dane) + '\n') };
  if (sha) body.sha = sha;
  const r = await gh(token, `/repos/${repo}/contents/${plik}`, { method: 'PUT', body: JSON.stringify(body) });
  if (r.status === 409 || r.status === 422) { const e = new Error('konflikt'); e.konflikt = true; throw e; }
  if (r.status === 403 || r.status === 404) throw new Error('Token nie ma prawa zapisu do repozytorium danych');
  if (!r.ok) throw new Error(`GitHub: błąd ${r.status} przy zapisie`);
  return (await r.json()).content?.sha;
}

const ostatnioWyslane = (id) => LS.get('lz.wyslane.' + id);

// scala stan profilu z repo i wysyła wynik; zwraca scalony stan
export async function synchronizujProfil(stan) {
  const c = konfig();
  if (!c?.token) return stan;
  const repo = c.repo || REPO_DANYCH;
  const plik = `profile/${stan.id}.json`;
  for (let proba = 0; proba < 3; proba++) {
    const { sha, dane } = await pobierz(repo, c.token, plik);
    const wynik = scal(stan, dane);
    const json = JSON.stringify(doRepo(wynik));
    if (json === JSON.stringify(dane ? doRepo(dane) : null) || json === ostatnioWyslane(stan.id)) return wynik;
    try {
      await zapisz(repo, c.token, plik, doRepo(wynik), sha, `Lingoza: postępy ${stan.id}`);
      LS.set('lz.wyslane.' + stan.id, json);
      return wynik;
    } catch (e) {
      if (!e.konflikt) throw e;
      stan = wynik;
    }
  }
  return stan;
}

// klucz ElevenLabs (rozpoznawanie mowy) z prywatnego repo — tylko do odczytu
export async function pobierzKlucze() {
  const c = konfig();
  if (!c?.token) return;
  try {
    const { dane } = await pobierz(c.repo || REPO_DANYCH, c.token, 'klucze.json');
    if (dane?.elevenlabsKey) LS.set('lz.elKey', dane.elevenlabsKey);
  } catch { /* brak pliku */ }
}

export async function synchronizujRodzine() {
  const c = konfig();
  if (!c?.token) return rodzina();
  const repo = c.repo || REPO_DANYCH;
  const { sha, dane } = await pobierz(repo, c.token, 'rodzina.json');
  const lok = rodzina();
  if (!dane || (lok.u || 0) > (dane.u || 0)) {
    const r = dane ? lok : { ...RODZINA_DOMYSLNA, ...lok };
    await zapisz(repo, c.token, 'rodzina.json', r, sha, 'Lingoza: rodzina');
    return r;
  }
  zapiszRodzine(dane);
  return dane;
}

// stany pozostałych profili (tylko do odczytu) — do ligi rodzinnej
export async function pobierzInne(ids) {
  const c = konfig();
  if (!c?.token) return {};
  const repo = c.repo || REPO_DANYCH;
  const out = {};
  await Promise.all(ids.map(async (id) => {
    try { out[id] = (await pobierz(repo, c.token, `profile/${id}.json`)).dane; } catch { /* brak pliku */ }
  }));
  LS.set('lz.inne', out);
  return out;
}

export const inneZPamieci = () => LS.get('lz.inne', {});

// subskrypcja powiadomień push danego urządzenia → push/<profil>-<urządzenie>.json
export async function zapiszSubskrypcje(profil, urz, sub, ustawienia) {
  const c = konfig();
  if (!c?.token) throw new Error('Najpierw włącz synchronizację (token GitHub)');
  const repo = c.repo || REPO_DANYCH;
  const plik = `push/${profil}-${urz}.json`;
  const { sha } = await pobierz(repo, c.token, plik);
  await zapisz(repo, c.token, plik, { profil, urzadzenie: urz, sub, ...ustawienia, strefa: Intl.DateTimeFormat().resolvedOptions().timeZone, u: Date.now() }, sha, `Lingoza: przypomnienia ${profil}`);
}
