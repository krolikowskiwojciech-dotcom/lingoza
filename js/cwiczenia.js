// Widoki ćwiczeń. Każde ćwiczenie zwraca Promise z wynikiem { ocena, poprawnie, xp }.
// ocena: 1 = nie pamiętam, 2 = trudne, 3 = dobrze, 4 = łatwe (skala FSRS).

import { h, wyczysc, mieszaj, sprawdzWpis, wibracja } from './dom.js';
import { graj, pobierzTempo, ustawTempo, stop } from './audio.js';
import { glosZdania, zdanieGram } from './glosy.js';
import { dystraktory } from './session.js';
import { podglad, odstepTekst } from './srs.js';
import { XP } from './game.js';
import { ikonaCwiczenia, glosnik, ikonaWolniej, ik } from './grafiki.js';
import { mozeRozpoznawac, Nagrywanie, rozpoznaj, porownaj } from './mowa.js';
import { dzwiek, odpowiedz, zerujSerie } from './dzwieki.js';

// słówka nagrane w 4 głosach (2 × UK, 2 × US) — ćwiczenia losują głos; przykłady w 2 głosach
const glosyHasla = (p) => (p.wlasna ? ['alice'] : ['alice', 'brian', 'george', 'sarah']);
const glosPrzykladu = (p, i = 0) => (p.wlasna ? 'alice' : glosZdania('en', `${p.pakiet}/${p.id}`, i + (Math.random() < 0.5 ? 0 : 2)));
const losowyGlos = (p) => { const g = glosyHasla(p); return g[Math.floor(Math.random() * g.length)]; };

const NOWE = { slowo: 'Nowe słowo', zwrot: 'Nowy zwrot', kolokacja: 'Nowa kolokacja', idiom: 'Nowy idiom', phrasal: 'Nowy phrasal verb', zdanie: 'Nowe zdanie' };

function przyciskAudio(tekst, glos, opis) {
  return h('button', { class: 'audio-btn', type: 'button', 'aria-label': `Odtwórz${opis ? ' ' + opis : ''}`, onclick: (e) => { e.stopPropagation(); graj(tekst, glos); } },
    glosnik(), opis ? h('span', { class: 'audio-opis' }, opis) : null);
}

function wolniej() {
  const b = h('button', { class: 'audio-btn maly' + (pobierzTempo() < 1 ? ' wl' : ''), type: 'button', 'aria-label': 'Wolniej' }, ikonaWolniej(), h('span', { class: 'audio-opis' }, '0,75×'));
  b.onclick = () => { ustawTempo(pobierzTempo() < 1 ? 1 : 0.75); b.classList.toggle('wl', pobierzTempo() < 1); };
  return b;
}

// „Posłuchaj podpowiedzi”: odtwarza angielską odpowiedź; użycie obniża ocenę (FSRS: trudne) i punkty
function przyciskPodpowiedzi(tekst, glos, onUzyj) {
  return h('button', { class: 'podpowiedz-audio', type: 'button', onclick: () => { onUzyj(); dzwiek('podpowiedz'); graj(tekst, glos); } }, glosnik(), ' Posłuchaj podpowiedzi');
}

function polecenie(tekst, typ) { return h('div', { class: 'cw-polecenie' }, ikonaCwiczenia(typ), h('span', {}, tekst)); }

// Po złej odpowiedzi przycisk „Dalej” może chwilę spać (kartkówki: rozpędzony palec przeskakiwał wyjaśnienie).
let blokadaPoBledzie = 0;
export const ustawBlokadePoBledzie = (ms) => { blokadaPoBledzie = ms; };

// dolny pasek: „Sprawdź”, potem informacja zwrotna i „Dalej”
function stopka(pole) {
  const el = h('div', { class: 'stopka' });
  pole.append(el);
  return {
    przycisk(tekst, onClick, wylaczony = false) {
      wyczysc(el).className = 'stopka';
      const b = h('button', { class: 'btn glowny szeroki', type: 'button', disabled: wylaczony, onclick: onClick && ((e) => { dzwiek('przycisk'); onClick(e); }) }, tekst);
      el.append(b);
      return b;
    },
    wynik(stan, tytul, tresc, dalej = 'Dalej') {
      wyczysc(el).className = 'stopka ' + stan;
      odpowiedz(stan !== 'zle');
      return new Promise((res) => {
        el.append(
          h('div', { class: 'stopka-info' },
            h('div', {}, h('div', { class: 'stopka-tytul' }, tytul), tresc)),
          h('button', { class: 'btn szeroki ' + (stan === 'zle' ? 'czerwony' : 'zielony'), type: 'button', onclick: () => { dzwiek('przycisk'); res(); } }, dalej),
        );
        const b = el.querySelector(':scope > .btn.szeroki');
        if (stan === 'zle' && blokadaPoBledzie) {
          b.disabled = true; b.textContent = 'Przeczytaj…';
          setTimeout(() => { b.disabled = false; b.textContent = dalej; b.focus(); }, blokadaPoBledzie);
        } else b.focus();
      });
    },
  };
}

function rozwiazanie(p, extra) {
  const pr = (p.przyklady || [])[0];
  return h('div', { class: 'rozw' },
    h('div', { class: 'rozw-en klik', onclick: () => graj(p.en, glosyHasla(p)[0]) }, p.en, ' ', przyciskAudio(p.en, glosyHasla(p)[0])),
    h('div', { class: 'rozw-pl' }, p.pl),
    extra || null,
    p.uwaga ? h('div', { class: 'rozw-uwaga' }, p.uwaga) : null,
    pr && !extra ? h('div', { class: 'rozw-przyklad' }, pr.en) : null);
}

// ---------------- prezentacja nowej pozycji ----------------
export function nowa(pole, p) {
  wyczysc(pole);
  const pr = p.przyklady || [];
  const karta = h('div', { class: 'intro' },
    polecenie(NOWE[p.typ] || 'Nowe słowo', 'nowa'),
    // hasło na jednej wyraźnej karcie: obrazek, słowo, tłumaczenie — pod spodem duże przyciski odsłuchu
    h('div', { class: 'intro-karta klik', onclick: () => graj(p.en, glosyHasla(p)[0]) },
      p.ilustracja ? h('img', { class: 'intro-ilustracja', src: p.ilustracja, alt: '' }) : p.obraz ? h('div', { class: 'intro-obraz' }, p.obraz) : null,
      h('div', { class: 'intro-en' }, p.en),
      h('div', { class: 'intro-pl' }, p.pl)),
    h('div', { class: 'intro-audio' }, ...glosyHasla(p).slice(0, 2).map((g) => przyciskAudio(p.en, g, g === 'brian' || g === 'sarah' ? 'US' : 'UK')), wolniej()),
    p.uwaga ? h('div', { class: 'intro-uwaga' }, p.uwaga) : null,
    pr.length ? h('div', { class: 'intro-przyklady' }, pr.map((x, i) => h('div', { class: 'przyklad klik', onclick: () => graj(x.en, glosPrzykladu(p, i)) },
      h('div', { class: 'przyklad-en' }, x.en, ' ', przyciskAudio(x.en, glosPrzykladu(p, i))),
      h('div', { class: 'przyklad-pl' }, x.pl)))) : null);
  pole.append(karta);
  setTimeout(() => graj(p.en, glosyHasla(p)[0]), 250);
  const st = stopka(pole);
  return new Promise((res) => st.przycisk('Rozumiem, dalej', () => { stop(); res({ ocena: null, poprawnie: true, xp: 0 }); }));
}

// Kroki lekcji gramatyki: jedna zasada na ekran, duży znacznik, krótki tekst i przykład z podświetleniem.
// Dane: lekcja.kroki [{ klucz, tekst, podswietl[], przyklady[] }]; starsze lekcje — kroki składane z lekcja.zasady.
export function krokiGramatyki(l) {
  if (l.kroki?.length) return l.kroki;
  return (l.zasady || []).map((z, i) => {
    const m = z.match(/^\s*<b>(.*?)<\/b>\s*[—–-]?\s*/);
    return { klucz: m ? m[1] : '', tekst: m ? z.slice(m[0].length) : z, podswietl: m ? [m[1]] : [], przyklady: l.przyklady?.[i] ? [l.przyklady[i]] : [] };
  });
}

const escHtml = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function podswietl(zdanie, slowa = []) {
  let html = escHtml(zdanie);
  for (const w of [...slowa].sort((x, y) => y.length - x.length)) {
    const re = new RegExp(`(?<![\\w'’])(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\w'’])`, 'g');
    html = html.replace(re, '<mark>$1</mark>');
  }
  return html;
}

const KOLORY_KROKOW = ['lila', 'rozowy', 'mietowy', 'zolty', 'niebieski', 'brzoskwinia'];

export function krokGramatyki(k, i, glos = 'alice') {
  return h('div', { class: `gram-krok kolor-${KOLORY_KROKOW[i % KOLORY_KROKOW.length]}` },
    k.klucz ? h('div', { class: 'gram-klucz serif' + (k.klucz.length > 6 ? ' dlugi' : '') }, k.klucz) : null,
    h('p', { class: 'gram-tekst', html: k.tekst }),
    (k.przyklady || []).map((x) => h('div', { class: 'gram-przyklad klik', onclick: () => graj(x.en, glos) },
      h('span', { class: 'gp-glosnik', 'aria-hidden': 'true' }, glosnik()),
      h('div', {}, h('div', { class: 'gp-en', html: podswietl(x.en, k.podswietl) }), h('div', { class: 'gp-pl' }, x.pl)))));
}

export function lekcjaGramatyki(pole, pk) {
  const kroki = krokiGramatyki(pk.lekcja);
  let i = 0;
  return new Promise((res) => {
    const pokaz = () => {
      wyczysc(pole);
      const k = kroki[i];
      pole.append(h('div', { class: 'gram-lekcja' },
        h('div', { class: 'gram-gora' },
          h('div', { class: 'gram-kropki' }, kroki.map((_, j) => h('span', { class: j === i ? 'akt' : j < i ? 'byla' : '' })))),
        krokGramatyki(k, i)));
      if (k.przyklady?.[0]) setTimeout(() => graj(k.przyklady[0].en, 'alice'), 350);
      const st = stopka(pole);
      const ostatni = i === kroki.length - 1;
      st.przycisk(ostatni ? 'Ćwiczymy!' : 'Dalej', () => {
        stop();
        if (ostatni) res({ ocena: null, poprawnie: true, xp: 0 }); else { i += 1; pokaz(); }
      });
    };
    pokaz();
  });
}

// ---------------- wybór z 4 odpowiedzi ----------------
export async function wybor(pole, { naglowek, tresc, opcje, poprawna, poWyborze, xp = XP.wybor, rozw, typ, siatka = false }) {
  wyczysc(pole);
  pole.append(polecenie(naglowek, typ), tresc);
  const lista = h('div', { class: 'opcje' + (siatka ? ' siatka-obrazkow' : '') });
  pole.append(lista);
  const st = stopka(pole);
  let wybrana = null;
  const btns = opcje.map((o, i) => {
    const b = h('button', { class: 'opcja', type: 'button' }, h('span', { class: 'opcja-nr' }, i + 1), h('span', { class: 'opcja-txt' }, o));
    b.onclick = () => { dzwiek('wybor'); btns.forEach((x) => x.classList.remove('wyb')); b.classList.add('wyb'); wybrana = o; spr.disabled = false; };
    lista.append(b);
    return b;
  });
  const spr = st.przycisk('Sprawdź', null, true);
  return new Promise((res) => {
    spr.onclick = async () => {
      const ok = wybrana === poprawna;
      btns.forEach((b) => { b.disabled = true; const t = b.querySelector('.opcja-txt').textContent; if (t === poprawna) b.classList.add('ok'); else if (t === wybrana) b.classList.add('zle'); });
      if (!ok) wibracja(60);
      poWyborze?.();
      await st.wynik(ok ? 'ok' : 'zle', ok ? 'Świetnie!' : 'Poprawnie:', rozw);
      res({ ocena: ok ? 3 : 1, poprawnie: ok, xp: ok ? xp : 0 });
    };
  });
}

export async function sluchaj(pole, p) {
  const g = losowyGlos(p);
  const opcje = mieszaj([p.pl, ...(await dystraktory(p, 'pl')).map((x) => x.pl)]);
  const tresc = h('div', { class: 'cw-sluchaj' }, h('button', { class: 'duzy-glosnik', type: 'button', 'aria-label': 'Odtwórz', onclick: () => graj(p.en, g) }, glosnik()), wolniej());
  setTimeout(() => graj(p.en, g), 300);
  return wybor(pole, { naglowek: 'Posłuchaj i wybierz znaczenie', tresc, opcje, poprawna: p.pl, rozw: rozwiazanie(p), typ: 'sluchaj' });
}

export async function enpl(pole, p) {
  const opcje = mieszaj([p.pl, ...(await dystraktory(p, 'pl')).map((x) => x.pl)]);
  const tresc = h('div', { class: 'cw-tekst' }, h('div', { class: 'cw-en' }, p.en), przyciskAudio(p.en, losowyGlos(p)));
  return wybor(pole, { naglowek: 'Co to znaczy?', tresc, opcje, poprawna: p.pl, rozw: rozwiazanie(p), typ: 'enpl' });
}

// „Dotknij obrazka”: obrazek zawsze z polskim podpisem — samo emoji bywa niejednoznaczne.
// Sprawdzamy, czy dziecko zrozumiało angielskie słowo ze słuchu.
export async function obrazek(pole, p) {
  const podpis = (x) => `${x.obraz}\n${x.pl.split(/[,;]/)[0].trim()}`;
  const inne = (await dystraktory(p, 'pl', 8)).filter((x) => x.obraz && x.obraz !== p.obraz && x.typ === 'slowo').slice(0, 3);
  if (inne.length < 2) return sluchaj(pole, p);
  const opcje = mieszaj([podpis(p), ...inne.map(podpis)]);
  const g = losowyGlos(p);
  const tresc = h('div', { class: 'cw-sluchaj' }, h('button', { class: 'duzy-glosnik', type: 'button', 'aria-label': 'Odtwórz', onclick: () => graj(p.en, g) }, glosnik()), wolniej());
  setTimeout(() => graj(p.en, g), 300);
  return wybor(pole, { naglowek: 'Posłuchaj i dotknij właściwego obrazka', tresc, opcje, poprawna: podpis(p), rozw: rozwiazanie(p), typ: 'obrazek', siatka: true });
}

export async function plen(pole, p) {
  const opcje = mieszaj([p.en, ...(await dystraktory(p, 'en')).map((x) => x.en)]);
  const tresc = h('div', { class: 'cw-tekst' }, h('div', { class: 'cw-pl' }, p.pl));
  return wybor(pole, { naglowek: 'Jak to powiedzieć po angielsku?', tresc, opcje, poprawna: p.en, poWyborze: () => graj(p.en, losowyGlos(p)), rozw: rozwiazanie(p), typ: 'plen' });
}

export async function gramWybor(pole, p) {
  const [przed, po] = p.en.split(/_{2,}/);
  const tresc = h('div', { class: 'cw-tekst' },
    h('div', { class: 'cw-en zdanie' }, przed, h('span', { class: 'luka' }, '____'), po),
    h('div', { class: 'cw-pl maly' }, p.pl));
  const pelne = zdanieGram(p);
  return wybor(pole, {
    naglowek: 'Wybierz poprawną formę', tresc, opcje: mieszaj([...p.opcje]), poprawna: p.odp, xp: XP.uloz, typ: 'gram-wybor',
    poWyborze: () => graj(pelne, glosPrzykladu(p)),
    rozw: h('div', { class: 'rozw' }, h('div', { class: 'rozw-en klik', onclick: () => graj(pelne, glosPrzykladu(p)) }, pelne, ' ', przyciskAudio(pelne, glosPrzykladu(p))), p.wyjasnienie ? h('div', { class: 'rozw-uwaga' }, p.wyjasnienie) : null),
  });
}

// ---------------- układanie z kafelków ----------------
export async function uloz(pole, p) {
  wyczysc(pole);
  const cel = p.en.replace(/[.!?]$/, '').split(/\s+/);
  const dodatkowe = (await dystraktory(p, 'en', 4)).flatMap((x) => x.en.replace(/[.!?]$/, '').split(/\s+/)).filter((w) => !cel.includes(w));
  const kafelki = mieszaj([...cel, ...mieszaj(dodatkowe).slice(0, Math.min(3, Math.max(1, Math.floor(cel.length / 2))))]);
  const odp = h('div', { class: 'kafelki odp' });
  const bank = h('div', { class: 'kafelki bank' });
  let zPodpowiedzia = false;
  pole.append(polecenie('Ułóż po angielsku', 'uloz'), h('div', { class: 'cw-tekst' }, h('div', { class: 'cw-pl' }, p.pl)), odp, bank,
    przyciskPodpowiedzi(p.en, losowyGlos(p), () => { zPodpowiedzia = true; }));
  const st = stopka(pole);
  const spr = st.przycisk('Sprawdź', null, true);
  const ulozone = [];
  kafelki.forEach((w) => {
    const k = h('button', { class: 'kafelek', type: 'button' }, w);
    k.onclick = () => {
      if (k.parentNode === bank) { dzwiek('wybor'); odp.append(k); ulozone.push(k); } else { dzwiek('cofnij'); bank.append(k); ulozone.splice(ulozone.indexOf(k), 1); }
      spr.disabled = !ulozone.length;
    };
    bank.append(k);
  });
  return new Promise((res) => {
    spr.onclick = async () => {
      const wynik = ulozone.map((k) => k.textContent).join(' ');
      const ok = sprawdzWpis(wynik, [p.en, ...(p.alt || [])]) === 'ok';
      [...odp.children, ...bank.children].forEach((k) => { k.disabled = true; });
      graj(p.en, losowyGlos(p));
      if (!ok) wibracja(60);
      await st.wynik(ok ? 'ok' : 'zle', ok ? (zPodpowiedzia ? 'Dobrze, z podpowiedzią' : 'Dokładnie tak!') : 'Poprawnie:', rozwiazanie(p));
      res({ ocena: ok ? (zPodpowiedzia ? 2 : 3) : 1, poprawnie: ok, xp: ok ? (zPodpowiedzia ? 1 : XP.uloz) : 0 });
    };
  });
}

// ---------------- wpisywanie ----------------
async function wpis(pole, { naglowek, tresc, wzorce, p, rozw, xp = XP.wpisz, poSprawdzeniu, typ = 'wpisz', jezyk = 'en', podpowiedz }) {
  wyczysc(pole);
  const input = h('input', { class: 'wpis', type: 'text', autocomplete: 'off', autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false', lang: jezyk, placeholder: jezyk === 'pl' ? 'Wpisz po polsku…' : 'Wpisz po angielsku…', enterkeyhint: 'done' });
  let zPodpowiedzia = false;
  pole.append(polecenie(naglowek, typ), tresc, input,
    podpowiedz ? przyciskPodpowiedzi(podpowiedz.tekst, podpowiedz.glos, () => { zPodpowiedzia = true; input.focus(); }) : null);
  const st = stopka(pole);
  const spr = st.przycisk('Sprawdź', null, true);
  input.oninput = () => { spr.disabled = !input.value.trim(); };
  setTimeout(() => input.focus(), 350);
  return new Promise((res) => {
    let gotowe = false;
    const sprawdz = async () => {
      if (gotowe || !input.value.trim()) return;
      gotowe = true;
      input.blur(); input.disabled = true;
      // po polsku: bez ogonków i bez zaimków dzierżawczych (twoją/swoją/moją — „your” zwykle pomijamy)
      const plN = (t) => bezOgonkow(t).toLowerCase().replace(/\b(twoj|swoj|moj)\w*\s*/g, '').trim();
      const w = jezyk === 'pl' ? sprawdzWpis(plN(input.value), wzorce.map(plN)) : sprawdzWpis(input.value, wzorce);
      input.classList.add(w === 'zle' ? 'zle' : 'ok');
      poSprawdzeniu?.();
      if (w === 'zle') wibracja(60);
      const tytul = w === 'zle' ? 'Poprawnie:' : zPodpowiedzia ? 'Dobrze, z podpowiedzią' : w === 'ok' ? 'Świetnie!' : 'Prawie — literówka';
      await st.wynik(w === 'zle' ? 'zle' : 'ok', tytul, rozw || rozwiazanie(p));
      const ocena = w === 'zle' ? 1 : zPodpowiedzia || w === 'literowka' ? 2 : 3;
      res({ ocena, poprawnie: w !== 'zle', xp: w === 'zle' ? 0 : zPodpowiedzia ? 1 : xp });
    };
    spr.onclick = sprawdz;
    input.onkeydown = (e) => { if (e.key === 'Enter') sprawdz(); };
  });
}

// po polsku nie wymagamy ogonków (telefon może nie mieć polskiej klawiatury); akceptujemy każde ze znaczeń
const bezOgonkow = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l').replace(/Ł/g, 'L');
const wariantyPl = (pl) => [pl, ...pl.replace(/\([^)]*\)/g, '').split(/[,;/]| lub | albo /).map((x) => x.trim()).filter((x) => x.length > 1)];

export function wpiszZnaczenie(pole, p, { sluch = false } = {}) {
  const g = losowyGlos(p);
  const tresc = sluch
    ? h('div', { class: 'cw-sluchaj' }, h('button', { class: 'duzy-glosnik', type: 'button', 'aria-label': 'Odtwórz', onclick: () => graj(p.en, g) }, glosnik()), wolniej())
    : h('div', { class: 'cw-tekst' }, h('div', { class: 'cw-en' }, p.en), przyciskAudio(p.en, g));
  setTimeout(() => graj(p.en, g), 300);
  return wpis(pole, { naglowek: sluch ? 'Posłuchaj i wpisz znaczenie po polsku' : 'Wpisz znaczenie po polsku', tresc, wzorce: wariantyPl(p.pl), p, typ: sluch ? 'sluchaj' : 'enpl', jezyk: 'pl' });
}

export function wpiszPlEn(pole, p) {
  const g = losowyGlos(p);
  return wpis(pole, { naglowek: 'Napisz po angielsku', tresc: h('div', { class: 'cw-tekst' }, h('div', { class: 'cw-pl' }, p.pl)), wzorce: [p.en, ...(p.alt || [])], p, poSprawdzeniu: () => graj(p.en, g), podpowiedz: { tekst: p.en, glos: g } });
}

export function dyktando(pole, p) {
  const g = losowyGlos(p);
  setTimeout(() => graj(p.en, g), 300);
  const tresc = h('div', { class: 'cw-sluchaj' }, h('button', { class: 'duzy-glosnik', type: 'button', 'aria-label': 'Odtwórz', onclick: () => graj(p.en, g) }, glosnik()), wolniej());
  return wpis(pole, { naglowek: 'Napisz, co słyszysz', tresc, wzorce: [p.en, ...(p.alt || [])], p, typ: 'dyktando' });
}

export function luka(pole, p) {
  const pr = (p.przyklady || []).find((x) => x.luka || x.en.toLowerCase().includes(p.en.toLowerCase()));
  if (!pr) return wpiszPlEn(pole, p);
  const szukane = pr.luka || p.en;
  const i = pr.en.toLowerCase().indexOf(szukane.toLowerCase());
  const odp = pr.en.slice(i, i + szukane.length);
  const tresc = h('div', { class: 'cw-tekst' },
    h('div', { class: 'cw-en zdanie' }, pr.en.slice(0, i), h('span', { class: 'luka' }, '____'), pr.en.slice(i + szukane.length)),
    h('div', { class: 'cw-pl maly' }, pr.pl),
    h('div', { class: 'podpowiedz' }, 'Podpowiedź: ', p.pl));
  const gl = glosPrzykladu(p, p.przyklady.indexOf(pr));
  return wpis(pole, {
    naglowek: 'Uzupełnij zdanie', tresc, wzorce: [odp], p, poSprawdzeniu: () => graj(pr.en, gl), typ: 'luka',
    rozw: h('div', { class: 'rozw' }, h('div', { class: 'rozw-en klik', onclick: () => graj(pr.en, gl) }, pr.en, ' ', przyciskAudio(pr.en, gl)), h('div', { class: 'rozw-pl' }, `${odp} — ${p.pl}`)),
  });
}

export function gramWpisz(pole, p) {
  const [przed, po] = p.en.split(/_{2,}/);
  const pelne = zdanieGram(p);
  const tresc = h('div', { class: 'cw-tekst' },
    h('div', { class: 'cw-en zdanie' }, przed, h('span', { class: 'luka' }, '____'), po),
    h('div', { class: 'cw-pl maly' }, p.pl),
    p.podpowiedz ? h('div', { class: 'podpowiedz' }, p.podpowiedz) : null);
  return wpis(pole, {
    naglowek: 'Wpisz brakujące słowo', tresc, wzorce: [p.odp, ...(p.alt || [])], p, poSprawdzeniu: () => graj(pelne, glosPrzykladu(p)),
    rozw: h('div', { class: 'rozw' }, h('div', { class: 'rozw-en klik', onclick: () => graj(pelne, glosPrzykladu(p)) }, pelne, ' ', przyciskAudio(pelne, glosPrzykladu(p))), p.wyjasnienie ? h('div', { class: 'rozw-uwaga' }, p.wyjasnienie) : null),
  });
}

// ---------------- fiszka z samooceną ----------------
export function fiszka(pole, p, karta, kier) {
  wyczysc(pole);
  const prod = kier === 'p';
  const g = losowyGlos(p);
  const pytanie = prod ? h('div', { class: 'cw-pl duze' }, p.pl) : h('div', { class: 'cw-en duze' }, p.en, ' ', przyciskAudio(p.en, g));
  if (!prod) setTimeout(() => graj(p.en, g), 300);
  const odp = h('div', { class: 'fiszka-odp ukryta' }, rozwiazanie(p));
  pole.append(polecenie(prod ? 'Powiedz w myślach po angielsku, potem odkryj' : 'Przypomnij sobie znaczenie, potem odkryj', 'fiszka'), h('div', { class: 'fiszka' }, pytanie, odp));
  const st = stopka(pole);
  return new Promise((res) => {
    st.przycisk('Pokaż odpowiedź', () => {
      dzwiek('odslon');
      odp.classList.remove('ukryta');
      if (prod) graj(p.en, g);
      const odst = karta ? podglad(karta) : {};
      const el = pole.querySelector('.stopka');
      wyczysc(el).className = 'stopka oceny';
      const oc = [[1, 'Nie pamiętam', 'czerwony'], [2, 'Trudne', 'pomar'], [3, 'Dobrze', 'zielony'], [4, 'Łatwe', 'niebieski']];
      for (const [o, t, kl] of oc) {
        el.append(h('button', { class: 'btn ocena ' + kl, type: 'button', onclick: () => { if (o > 1) odpowiedz(true); else { zerujSerie(); dzwiek('jeszcze-nie'); } res({ ocena: o, poprawnie: o > 1, xp: o > 1 ? XP.fiszka : 0 }); } },
          h('span', {}, t), odst[o] ? h('small', {}, odstepTekst(odst[o])) : null));
      }
    });
  });
}

// ---------------- mówienie ----------------
// „Powiedz na głos”: z kluczem ElevenLabs — rozpoznanie mowy i ocena słowo po słowie; bez klucza — samoocena.
export function mow(pole, p) {
  if (!mozeRozpoznawac()) return mowSamoocena(pole, p);
  wyczysc(pole);
  const g = losowyGlos(p);
  let proby = 0; let najlepszy = 0; let zPodpowiedzia = false; let ostatniUrl = null;
  const wynikEl = h('div', { class: 'mowa-wynik' });
  const status = h('div', { class: 'mowa-status' }, 'Dotknij mikrofonu i powiedz to zdanie po angielsku');
  const mik = h('button', { class: 'mowa-mik', type: 'button', 'aria-label': 'Nagrywaj' }, ik('mikrofon'));
  const odsluch = h('button', { class: 'chip', type: 'button', disabled: true }, ik('graj'), ' Odsłuchaj siebie');
  odsluch.onclick = () => { if (ostatniUrl) new Audio(ostatniUrl).play(); };
  pole.append(polecenie('Powiedz na głos po angielsku', 'mow'),
    h('div', { class: 'cw-tekst' }, h('div', { class: 'cw-pl duze' }, p.pl)),
    h('div', { class: 'mowa' }, mik, status, wynikEl, h('div', { class: 'mowa-narz' }, odsluch,
      przyciskPodpowiedzi(p.en, g, () => { zPodpowiedzia = true; }))));
  const st = stopka(pole);
  return new Promise((res) => {
    const zakoncz = async (ok) => {
      graj(p.en, g);
      const tytul = !ok ? 'Poprawnie:' : zPodpowiedzia ? 'Dobrze, z podpowiedzią' : najlepszy >= 0.95 ? 'Świetna wymowa!' : 'Dobrze!';
      await st.wynik(ok ? 'ok' : 'zle', tytul, rozwiazanie(p));
      const ocena = !ok ? 1 : zPodpowiedzia || najlepszy < 0.85 || proby > 2 ? 2 : 3;
      res({ ocena, poprawnie: ok, xp: ok ? (zPodpowiedzia ? 1 : XP.mow + 1) : 0 });
    };
    const pominBtn = st.przycisk('Nie umiem — pokaż', () => zakoncz(false));
    pominBtn.classList.replace('glowny', 'jasny');
    let nagr = null; let licznik = null;
    mik.onclick = async () => {
      if (nagr?.trwa) { clearTimeout(licznik); mik.disabled = true; return przetworz(await nagr.stop()); }
      try {
        nagr = new Nagrywanie(); await nagr.start();
        mik.classList.add('rec'); status.textContent = 'Mów… dotknij jeszcze raz, gdy skończysz';
        licznik = setTimeout(() => mik.click(), Math.min(15000, 4000 + p.en.split(' ').length * 700));
      } catch { status.textContent = 'Brak dostępu do mikrofonu — pozwól na mikrofon w ustawieniach przeglądarki'; }
    };
    async function przetworz(blob) {
      mik.classList.remove('rec'); status.textContent = 'Sprawdzam…';
      if (ostatniUrl) URL.revokeObjectURL(ostatniUrl);
      ostatniUrl = URL.createObjectURL(blob); odsluch.disabled = false;
      try {
        const tekst = await rozpoznaj(blob);
        proby += 1;
        const { wynik, slowa } = porownaj(p.en, tekst);
        najlepszy = Math.max(najlepszy, wynik);
        wyczysc(wynikEl).append(
          h('div', { class: 'mowa-zdanie' }, slowa.map((x) => h('span', { class: x.ok ? 'tak' : 'nie' }, x.w + ' '))),
          h('div', { class: 'mowa-uslyszane' }, 'Rozpoznany tekst: ', h('i', {}, tekst || '(cisza)')));
        if (wynik >= 0.8) { status.textContent = `${Math.round(wynik * 100)}% słów — brawo!`; return zakoncz(true); }
        status.textContent = `${Math.round(wynik * 100)}% słów. Posłuchaj i spróbuj jeszcze raz`;
        graj(p.en, g);
        if (proby >= 3) { pominBtn.textContent = 'Dalej'; pominBtn.onclick = () => zakoncz(najlepszy >= 0.6); }
      } catch (e) {
        status.textContent = e.message + ' — oceń się sam(a)';
        return res(await mowSamoocena(pole, p));
      } finally { mik.disabled = false; }
    }
  });
}
function mowSamoocena(pole, p) {
  wyczysc(pole);
  const g = losowyGlos(p);
  const wzor = h('div', { class: 'fiszka-odp ukryta' }, rozwiazanie(p));
  const nagr = h('div', { class: 'nagrywanie' });
  pole.append(polecenie('Powiedz na głos po angielsku', 'mow'), h('div', { class: 'fiszka' }, h('div', { class: 'cw-pl duze' }, p.pl), wzor), nagr);

  // opcjonalne nagranie siebie i odsłuch obok wzoru
  if (window.MediaRecorder && navigator.mediaDevices?.getUserMedia) {
    let rec = null; let url = null;
    const b = h('button', { class: 'btn mikrofon', type: 'button' }, '🎙️ Nagraj się');
    const odsluch = h('button', { class: 'btn jasny', type: 'button', disabled: true }, ik('graj'), ' Odsłuchaj siebie');
    b.onclick = async () => {
      if (rec?.state === 'recording') { rec.stop(); return; }
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        const kawalki = [];
        rec = new MediaRecorder(s);
        rec.ondataavailable = (e) => kawalki.push(e.data);
        rec.onstop = () => {
          s.getTracks().forEach((t) => t.stop());
          if (url) URL.revokeObjectURL(url);
          url = URL.createObjectURL(new Blob(kawalki, { type: rec.mimeType }));
          odsluch.disabled = false; b.textContent = '🎙️ Nagraj ponownie'; b.classList.remove('rec');
        };
        rec.start(); b.textContent = '⏹ Zatrzymaj'; b.classList.add('rec');
      } catch { b.textContent = 'Brak dostępu do mikrofonu'; b.disabled = true; }
    };
    odsluch.onclick = () => { if (url) new Audio(url).play(); };
    nagr.append(b, odsluch);
  }
  const st = stopka(pole);
  return new Promise((res) => {
    st.przycisk('Posłuchaj wzoru', () => {
      dzwiek('odslon');
      wzor.classList.remove('ukryta');
      graj(p.en, g);
      const el = pole.querySelector('.stopka');
      wyczysc(el).className = 'stopka oceny';
      for (const [o, t, kl] of [[1, 'Nie wyszło', 'czerwony'], [2, 'Z trudem', 'pomar'], [3, 'Udało się', 'zielony']]) {
        el.append(h('button', { class: 'btn ocena ' + kl, type: 'button', onclick: () => { if (o > 1) odpowiedz(true); else { zerujSerie(); dzwiek('jeszcze-nie'); } res({ ocena: o, poprawnie: o > 1, xp: o > 1 ? XP.mow : 0 }); } }, t));
      }
    });
  });
}

export const CWICZENIA = {
  sluchaj, enpl, obrazek, plen, uloz, wpisz: wpiszPlEn, dyktando, luka, fiszka, mow, 'gram-wybor': gramWybor, 'gram-wpisz': gramWpisz,
  'enpl-wpisz': (pole, p) => wpiszZnaczenie(pole, p), 'sluchaj-wpisz': (pole, p) => wpiszZnaczenie(pole, p, { sluch: true }),
};
