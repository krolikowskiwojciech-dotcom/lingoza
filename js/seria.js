// Seria ćwiczeń gramatyki („Ćwicz”): od razu zdania, bez kroków wyjaśnień — 20–30 wymieszanych, na zmianę wybór
// i wpisywanie. Po błędzie wyjaśnienie, a zdanie wraca kilka zadań później. Karty FSRS („p”) oceniane jak w lekcji.

import { h, wyczysc, mieszaj } from './dom.js';
import { CWICZENIA, lekcjaGramatyki, doWymowy } from './cwiczenia.js';
import { pakiet, pozycja } from './content.js';
import { nowaKarta, ocen } from './srs.js';
import { dodajXP, zaliczLekcje, XP, seria, xpDzis, sprawdzOdznaki } from './game.js';
import { zapiszStan } from './store.js';
import { stop } from './audio.js';
import { dzwiek, zerujSerie } from './dzwieki.js';
import { obrazOdznaki, potwierdz, ik } from './grafiki.js';
import { przyciskWyslij, minuty, procent } from './wynik.js';
import { gwiazdki, pokazGwiazdki } from './kartkowka.js';

const MIN = 20;
const MAX = 30;
const MAX_POWROTOW = 1; // po błędzie zdanie wraca raz (resztę łapie „Powtórz pomyłki”)
const FORMY = ['gram-wybor', 'gram-wpisz'];
const MAX_WYMOWY = 15; // seria wymowy: tyle słów i fraz naraz

// wymowa: od pojedynczych słów do fraz 4-wyrazowych, w każdej grupie losowo
function planWymowy(pozycje, cel) {
  const dl = (p) => p.en.trim().split(/\s+/).length;
  return mieszaj([...pozycje]).slice(0, cel).sort((a, b) => dl(a) - dl(b)).map((p) => ({ p, cw: 'wymowa' }));
}

// ile zdań w serii: z jednej lekcji wszystkie (20–30), z całego unitu 30
export const dlugoscSerii = (ile, unit = false) => (unit ? MAX : Math.min(MAX, Math.max(MIN, ile)));

// Kolejka: zdania wymieszane, formy na przemian; gdy zdań jest mniej niż trzeba — kolejna runda tymi samymi
// zdaniami, każde inną formą niż poprzednio (i nie to samo zdanie dwa razy pod rząd).
function planSerii(zdania, cel) {
  const out = [];
  const ostatniaForma = new Map();
  let start = Math.random() < 0.5 ? 0 : 1;
  while (out.length < cel) {
    const runda = mieszaj([...zdania]);
    if (out.length && runda.length > 1 && runda[0] === out[out.length - 1].p) runda.push(runda.shift());
    for (const p of runda) {
      if (out.length >= cel) break;
      const poprz = ostatniaForma.get(p);
      const cw = poprz ? FORMY[1 - FORMY.indexOf(poprz)] : FORMY[(start + out.length) % 2];
      ostatniaForma.set(p, cw);
      out.push({ p, cw });
    }
    start = 1 - start;
  }
  return out;
}

// pakiety: lekcje gramatyki; tylko: wybrane zdania („pakiet/pozycja”, np. pomyłki); wyjasnij: najpierw kroki reguły
export async function uruchomSerie({ stan, info, pakiety, tylko = null, ile = null, tytul = '', kolor, przejscie = false, wyjasnij = false, poKoncu, tryb = 'gramatyka' }) {
  const wym = tryb === 'wymowa';
  const zdania = [];
  const lekcje = [];
  for (const id of pakiety) {
    const pk = await pakiet(id);
    lekcje.push(pk);
    for (const x of pk.pozycje) {
      const ref = `${pk.id}/${x.id}`;
      if ((wym ? !doWymowy(x) : x.typ !== 'gramatyka') || (tylko && !tylko.includes(ref))) continue;
      const p = await pozycja(ref, stan);
      if (p) zdania.push(p);
    }
  }
  const cel = ile || (wym ? Math.min(MAX_WYMOWY, zdania.length) : dlugoscSerii(zdania.length, pakiety.length > 1));

  const ekran = h('div', { class: 'lekcja' + (kolor ? ` w-kolorze kolor-${kolor}` : '') + (przejscie ? ' z-karty' : '') });
  const pasek = h('div', { class: 'postep-wew' });
  const zamknij = h('button', { class: 'zamknij wstecz', type: 'button', 'aria-label': 'Zakończ ćwiczenia' }, ik('strzalka'), h('span', { class: 'wstecz-txt' }, 'Wróć'));
  const pole = h('div', { class: 'cw-pole' });
  ekran.append(h('div', { class: 'lekcja-gora' }, zamknij, h('div', { class: 'postep' }, pasek)),
    ...(tytul ? [h('div', { class: 'lekcja-tytul serif' }, tytul)] : []), pole);
  document.body.append(ekran);
  document.body.classList.add('w-lekcji');

  let rozwiaz;
  const koniec = new Promise((r) => { rozwiaz = r; });
  let przerwano = false;
  const zakoncz = () => { stop(); ekran.remove(); document.body.classList.remove('w-lekcji'); rozwiaz(); };
  const wyjdz = () => { zakoncz(); poKoncu?.(); };

  let zrobione = 0; let ocenione = 0; let poprawne = 0; let zdobyteXP = 0;
  const bledne = []; // zdania z błędem za pierwszym razem (do „Powtórz pomyłki”)
  zamknij.onclick = async () => {
    if (zrobione > 0 && !(await potwierdz({
      tytul: 'Kończymy na dziś?', tekst: `Masz już ${zrobione} ${zrobione === 1 ? 'zdanie' : zrobione < 5 ? 'zdania' : 'zdań'} — postęp zostanie zapisany.`,
      tak: 'Zakończ', nie: 'Ćwiczę dalej',
    }))) return;
    przerwano = true;
    wyjdz();
  };

  if (!zdania.length) {
    wyczysc(pole).append(h('div', { class: 'pusto' },
      h('h2', { class: 'serif' }, 'Brak zdań do ćwiczeń'),
      h('button', { class: 'btn glowny', type: 'button', onclick: wyjdz }, 'Wróć')));
    await koniec;
    return;
  }

  const kolejka = wym ? planWymowy(zdania, cel) : planSerii(zdania, cel);
  const odswiezPasek = () => { pasek.style.width = `${Math.round((zrobione / Math.max(1, zrobione + kolejka.length)) * 100)}%`; };
  const startSerii = Date.now();

  (async () => {
    if (wyjasnij) for (const pk of lekcje) if (pk.lekcja) { await lekcjaGramatyki(pole, pk); if (przerwano) return; }
    zerujSerie();
    dzwiek('start-bloku');
    while (kolejka.length && !przerwano) {
      odswiezPasek();
      const el = kolejka.shift();
      if (el.powrot === 1) dzwiek('powrot-pytania');
      const ref = `${el.p.pakiet}/${el.p.id}`;
      const klucz = `${ref}|p`;
      const wynik = await CWICZENIA[el.cw](pole, el.p);
      if (przerwano) return;
      zrobione += 1;
      if (!el.powrot) {
        ocenione += 1;
        if (wynik.poprawnie) poprawne += 1; else if (!bledne.includes(el.p)) bledne.push(el.p);
      }
      zdobyteXP += wynik.xp;
      if (wynik.xp) dodajXP(stan, wynik.xp);
      // zdanie z serii wchodzi do nauki (karta FSRS) tak jak w zwykłej lekcji; wymowa nie zmienia kart
      if (!wym && !stan.karty[klucz]) {
        const teraz = Date.now();
        stan.wprowadzone[ref] = stan.wprowadzone[ref] || teraz;
        stan.karty[klucz] = nowaKarta(new Date(teraz));
      }
      if (!wym && wynik.ocena) stan.karty[klucz] = ocen(stan.karty[klucz], wynik.ocena);
      if (!wynik.poprawnie && (el.powrot || 0) < MAX_POWROTOW) {
        kolejka.splice(Math.min(kolejka.length, 3 + Math.floor(Math.random() * 3)), 0, { p: el.p, cw: el.cw, powrot: (el.powrot || 0) + 1 });
      }
      zapiszStan(stan);
    }
    if (przerwano) return;
    pasek.style.width = '100%';
    const bezbledna = bledne.length === 0 && ocenione >= 5;
    const bonus = XP.lekcja + (bezbledna ? XP.bezbledna : 0);
    zdobyteXP += bonus;
    dodajXP(stan, bonus);
    zaliczLekcje(stan);
    const nowe = sprawdzOdznaki(stan, { bezbledna, godzina: new Date().getHours() });
    zapiszStan(stan);
    podsumowanie(nowe, Date.now() - startSerii);
  })();

  function podsumowanie(nowe, czas) {
    stop();
    dzwiek(bledne.length ? 'lekcja-gotowa' : 'bez-bledow');
    const s = seria(stan);
    const cel = stan.ustawienia.cel;
    const dzis = xpDzis(stan);
    const pomylki = bledne.map((p) => `${p.pakiet}/${p.id}`);
    const pelne = (p) => p.en.replace(/_{2,}/, p.odp);
    const tekst = [`Angielski · ${info?.imie || ''}`, `Ćwiczenia: ${tytul}`,
      `Dobrze za pierwszym razem: ${poprawne} z ${ocenione} (${procent(poprawne, ocenione)}%) · +${zdobyteXP} XP`,
      bledne.length ? 'Do powtórki: ' + bledne.slice(0, 10).map(pelne).join('; ') : 'Bez błędów!',
      `Seria: ${s.dni} ${s.dni === 1 ? 'dzień' : 'dni'} · dziś ${dzis}/${cel} XP · czas ${minuty(czas)} min`].join('\n');
    const znowu = (opcje) => { zakoncz(); uruchomSerie({ stan, info, pakiety, tytul, kolor, poKoncu, tryb, ...opcje }); };
    wyczysc(pole).append(h('div', { class: 'podsum' },
      h('div', { class: 'kat-etykieta' }, wym ? 'Wymowa zrobiona' : 'Ćwiczenia zrobione'),
      h('h2', { class: 'serif' }, tytul || 'Gramatyka'),
      pokazGwiazdki(gwiazdki(poprawne, ocenione), 'duze'),
      h('div', { class: 'podsum-kafle' },
        h('div', { class: 'kafel zolty' }, h('small', {}, 'Zdobyte XP'), h('b', {}, `+${zdobyteXP}`)),
        h('div', { class: 'kafel mietowy' }, h('small', {}, 'Dobrze za 1. razem'), h('b', {}, `${poprawne}/${ocenione}`)),
        h('div', { class: 'kafel rozowy' }, h('small', {}, 'Seria'), h('b', { class: 'z-ikona' }, ik('plomien'), s.dni))),
      h('div', { class: 'podsum-cel' }, dzis >= cel ? `Cel dzienny zrobiony: ${dzis}/${cel} XP` : `Do celu dziennego brakuje ${cel - dzis} XP`),
      nowe.length ? h('div', { class: 'podsum-odznaki' }, h('div', { class: 'maly' }, 'Nowa odznaka!'),
        nowe.map((o) => h('div', { class: 'odznaka zdobyta' }, h('span', { class: 'odznaka-emoji' }, obrazOdznaki(o.id)), h('b', {}, o.nazwa), h('small', {}, o.opis)))) : null,
      przyciskWyslij(tekst, 'btn jasny szeroki'),
      bledne.length ? [h('div', { class: 'sekcja' }, 'Do powtórki'),
        h('ul', { class: 'lista-pozycji' }, bledne.map((p) => h('li', { class: 'pozycja blad' },
          h('div', { class: 'poz-txt' }, h('b', {}, pelne(p)), p.wyjasnienie ? h('small', {}, p.wyjasnienie) : null))))] : null,
      h('div', { class: 'przyciski kolumna' },
        // każde pomylone zdanie dwa razy: raz wybór, raz wpisywanie
        bledne.length ? h('button', { class: 'btn glowny', type: 'button', onclick: () => znowu({ tylko: pomylki, ile: Math.min(MAX, pomylki.length * (wym ? 1 : 2)) }) }, 'Powtórz pomyłki') : null,
        h('button', { class: 'btn ' + (bledne.length ? 'jasny' : 'glowny'), type: 'button', onclick: () => znowu({}) }, 'Jeszcze raz'),
        h('button', { class: 'btn jasny', type: 'button', onclick: wyjdz }, 'Zakończ'))));
    pole.scrollTop = 0;
  }

  await koniec;
}
