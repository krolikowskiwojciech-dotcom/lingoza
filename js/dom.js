// Drobne pomocniki do budowania widoków bez frameworka.

// append/prepend z pustymi wartościami (null/undefined/false) — pomijamy je zamiast wypisywać „null”
for (const proto of [Element.prototype, DocumentFragment.prototype]) {
  for (const m of ['append', 'prepend']) {
    const org = proto[m];
    proto[m] = function (...x) { return org.apply(this, x.filter((v) => v != null && v !== false)); };
  }
}

export function h(tag, attrs = {}, ...dzieci) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const d of dzieci.flat(Infinity)) {
    if (d == null || d === false) continue;
    el.append(d instanceof Node ? d : document.createTextNode(String(d)));
  }
  return el;
}

export const $ = (s, el = document) => el.querySelector(s);

export function wyczysc(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

export const mieszaj = (a) => a.map((x) => [Math.random(), x]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);

// porównanie wpisanej odpowiedzi: bez wielkości liter, interpunkcji i podwójnych spacji
export const norm = (s) => s.toLowerCase().replace(/[’‘`]/g, "'").replace(/[.,!?;:"“”()]/g, ' ').replace(/\s+/g, ' ').trim();

export function lev(a, b) {
  const m = a.length; const n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

// 'ok' | 'literowka' | 'zle'
export function sprawdzWpis(wpis, wzorce) {
  const w = norm(wpis);
  if (!w) return 'zle';
  for (const x of wzorce) if (norm(x) === w) return 'ok';
  for (const x of wzorce) { const n = norm(x); if (n.length >= 5 && lev(n, w) <= (n.length >= 12 ? 2 : 1)) return 'literowka'; }
  return 'zle';
}

export function wibracja(ms = 30) { try { navigator.vibrate?.(ms); } catch { /* */ } }
