// Artykuły z klikalnymi słowami i wyrażeniami: tłumaczenie, wymowa, wyjaśnienie zasady, „dodaj do nauki”.

import { h, wyczysc } from './dom.js';
import { graj, stop } from './audio.js';
import { glosArtykulu } from './glosy.js';
import { zapiszStan } from './store.js';
import { dodajXP, XP, sprawdzOdznaki } from './game.js';

const TYP_FRAZY = { idiom: 'idiom', phrasal: 'phrasal verb', kolokacja: 'kolokacja', konstrukcja: 'konstrukcja gramatyczna', zwrot: 'zwrot' };

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// znajduje wystąpienia fraz w akapicie (najdłuższe pierwsze, bez nakładania się)
function znajdzFrazy(tekst, frazy) {
  const trafienia = [];
  const formy = frazy.flatMap((f, i) => [f.en, ...(f.formy || [])].map((x) => ({ x, i }))).sort((a, b) => b.x.length - a.x.length);
  for (const { x, i } of formy) {
    const re = new RegExp(`(?<![\\w'])${esc(x)}(?![\\w'])`, 'gi');
    let m;
    while ((m = re.exec(tekst))) {
      const od = m.index; const doo = od + m[0].length;
      if (!trafienia.some((t) => od < t.doo && doo > t.od)) trafienia.push({ od, doo, i });
    }
  }
  return trafienia.sort((a, b) => a.od - b.od);
}

// słowo z tekstu → wpis słowniczka (dokładna forma, potem proste formy podstawowe)
export function znajdzSlowo(slowa, token) {
  const t = token.toLowerCase().replace(/[’]/g, "'");
  if (slowa[t]) return [t, slowa[t]];
  const proby = [t.replace(/'s$/, ''), t.replace(/s$/, ''), t.replace(/es$/, ''), t.replace(/ed$/, ''), t.replace(/d$/, ''), t.replace(/ing$/, ''), t.replace(/ing$/, 'e'), t.replace(/ies$/, 'y'), t.replace(/ied$/, 'y')];
  for (const p of proby) if (slowa[p]) return [p, slowa[p]];
  return [t, null];
}

function tokeny(tekst) {
  return tekst.match(/[A-Za-z]+(?:['’][A-Za-z]+)*|[^A-Za-z]+/g) || [];
}

function zdanieZ(tekst, poz) {
  const przed = tekst.lastIndexOf('. ', poz);
  const po = tekst.indexOf('. ', poz);
  return tekst.slice(przed < 0 ? 0 : przed + 2, po < 0 ? tekst.length : po + 1).trim();
}

export function pokazArtykul(kontener, a, { stan, wroc }) {
  wyczysc(kontener);
  const glos = glosArtykulu(a);
  const arkusz = h('div', { class: 'arkusz', role: 'dialog', 'aria-modal': 'true' });
  const tlo = h('div', { class: 'arkusz-tlo', onclick: () => zamknijArkusz() });
  const zamknijArkusz = () => { arkusz.classList.remove('wid'); tlo.classList.remove('wid'); document.querySelectorAll('.zazn').forEach((x) => x.classList.remove('zazn')); };

  function otworzArkusz(tresc) {
    wyczysc(arkusz).append(h('div', { class: 'arkusz-uchwyt' }), tresc);
    arkusz.classList.add('wid'); tlo.classList.add('wid');
  }

  function przyciskDodaj(wpis) {
    const id = 'a-' + wpis.en.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    const jest = !!stan.wlasne[id];
    const b = h('button', { class: 'btn ' + (jest ? 'jasny' : 'glowny'), type: 'button', disabled: jest }, jest ? '✓ W nauce' : '+ Dodaj do nauki');
    b.onclick = () => {
      stan.wlasne[id] = { ...wpis, zrodlo: a.id, u: Date.now() };
      sprawdzOdznaki(stan);
      zapiszStan(stan);
      b.textContent = '✓ Dodane'; b.disabled = true; b.className = 'btn jasny';
    };
    return b;
  }

  function arkuszSlowa(token, zdanie, el) {
    const [klucz, w] = znajdzSlowo(a.slowa || {}, token);
    const glosSlowa = 'alice';
    graj(w ? klucz : token, glosSlowa);
    otworzArkusz(h('div', { class: 'ark' },
      h('div', { class: 'ark-gora' }, h('div', { class: 'ark-en serif' }, token), h('button', { class: 'audio-btn', type: 'button', onclick: () => graj(w ? klucz : token, glosSlowa) }, '🔊')),
      w?.baza && w.baza !== klucz ? h('div', { class: 'ark-baza' }, `forma podstawowa: ${w.baza}`) : null,
      h('div', { class: 'ark-pl' }, w ? w.pl : 'Brak w słowniczku tego artykułu'),
      w?.uwaga ? h('div', { class: 'ark-uwaga' }, w.uwaga) : null,
      h('div', { class: 'ark-zdanie' }, zdanie),
      w ? przyciskDodaj({ typ: 'slowo', en: w.baza || klucz, pl: w.pl, uwaga: w.uwaga, przyklad: { en: zdanie, pl: '' } }) : null));
    el.classList.add('zazn');
  }

  function arkuszFrazy(f, zdanie, el) {
    graj(f.en, 'alice');
    otworzArkusz(h('div', { class: 'ark' },
      h('div', { class: 'ark-typ' }, TYP_FRAZY[f.typ] || 'wyrażenie'),
      h('div', { class: 'ark-gora' }, h('div', { class: 'ark-en serif' }, f.en), h('button', { class: 'audio-btn', type: 'button', onclick: () => graj(f.en, 'alice') }, '🔊')),
      h('div', { class: 'ark-pl' }, f.pl),
      f.wyjasnienie ? h('div', { class: 'ark-zasada' }, h('b', {}, 'Zasada: '), f.wyjasnienie) : null,
      f.przyklad ? h('div', { class: 'ark-zdanie' }, f.przyklad) : null,
      h('div', { class: 'ark-zdanie' }, zdanie),
      przyciskDodaj({ typ: f.typ === 'idiom' ? 'idiom' : 'zwrot', en: f.en, pl: f.pl, uwaga: f.wyjasnienie, przyklad: { en: zdanie, pl: '' } })));
    el.classList.add('zazn');
  }

  const tekst = h('div', { class: 'art-tekst' });
  a.akapity.forEach((ak, nr) => {
    const p = h('p', { class: 'akapit' });
    const traf = znajdzFrazy(ak, a.frazy || []);
    let poz = 0;
    const dodajSlowa = (fragment, start) => {
      let off = start;
      for (const t of tokeny(fragment)) {
        if (/^[A-Za-z]/.test(t)) {
          const poczatek = off;
          const s = h('span', { class: 'sl' }, t);
          s.onclick = () => arkuszSlowa(t, zdanieZ(ak, poczatek), s);
          p.append(s);
        } else p.append(t);
        off += t.length;
      }
    };
    for (const t of traf) {
      dodajSlowa(ak.slice(poz, t.od), poz);
      const f = a.frazy[t.i];
      const s = h('span', { class: 'fr fr-' + (f.typ || 'zwrot') }, ak.slice(t.od, t.doo));
      s.onclick = () => arkuszFrazy(f, zdanieZ(ak, t.od), s);
      p.append(s);
      poz = t.doo;
    }
    dodajSlowa(ak.slice(poz), poz);
    const pl = a.akapity_pl?.[nr] ? h('p', { class: 'akapit-pl ukryta' }, a.akapity_pl[nr]) : null;
    const nar = h('div', { class: 'akapit-narz' },
      h('button', { class: 'chip', type: 'button', onclick: () => graj(ak, glos) }, '▶ Posłuchaj'),
      pl ? h('button', { class: 'chip', type: 'button', onclick: () => pl.classList.toggle('ukryta') }, 'PL') : null);
    tekst.append(h('div', { class: 'akapit-blok' }, p, pl, nar));
  });

  let czyta = false;
  const czytajWszystko = h('button', { class: 'btn jasny', type: 'button' }, '▶ Czytaj cały tekst');
  czytajWszystko.onclick = async () => {
    if (czyta) { czyta = false; stop(); czytajWszystko.textContent = '▶ Czytaj cały tekst'; return; }
    czyta = true; czytajWszystko.textContent = '⏸ Zatrzymaj';
    const bloki = [...tekst.querySelectorAll('.akapit-blok')];
    for (let i = 0; i < a.akapity.length && czyta; i++) {
      bloki.forEach((b, j) => b.classList.toggle('czytany', j === i));
      await graj(a.akapity[i], glos);
    }
    bloki.forEach((b) => b.classList.remove('czytany'));
    czyta = false; czytajWszystko.textContent = '▶ Czytaj cały tekst';
  };

  const przeczytane = !!stan.przeczytane[a.id];
  const koniec = h('button', { class: 'btn glowny szeroki', type: 'button', disabled: przeczytane }, przeczytane ? '✓ Przeczytane' : `Przeczytane (+${XP.artykul} XP)`);
  koniec.onclick = () => {
    stan.przeczytane[a.id] = Date.now();
    dodajXP(stan, XP.artykul);
    sprawdzOdznaki(stan);
    zapiszStan(stan);
    koniec.textContent = '✓ Przeczytane'; koniec.disabled = true;
  };

  kontener.append(
    h('div', { class: 'art kolor-' + (a.kolor || 'krem') },
      h('div', { class: 'art-gora' },
        h('button', { class: 'wstecz', type: 'button', onclick: () => { stop(); wroc(); }, 'aria-label': 'Wróć' }, '←'),
        h('span', { class: 'art-meta' }, `${a.poziom || ''} · ${a.akapity.join(' ').split(/\s+/).length} słów`)),
      a.obraz ? h('img', { class: 'art-obraz', src: a.obraz, alt: '' }) : h('div', { class: 'art-emoji' }, a.emoji || '📰'),
      h('h1', { class: 'art-tytul serif' }, a.tytul),
      a.tytul_pl ? h('div', { class: 'art-tytul-pl' }, a.tytul_pl) : null,
      h('div', { class: 'art-legenda' },
        h('span', { class: 'fr fr-idiom' }, 'idiom'), ' ', h('span', { class: 'fr fr-phrasal' }, 'phrasal verb'), ' ',
        h('span', { class: 'fr fr-kolokacja' }, 'kolokacja'), ' ', h('span', { class: 'fr fr-konstrukcja' }, 'gramatyka'),
        h('div', { class: 'maly' }, 'Dotknij dowolnego słowa albo podkreślonego wyrażenia.')),
      czytajWszystko),
    tekst,
    h('div', { class: 'art-koniec' }, koniec),
    tlo, arkusz);
}
