// Przebieg jednej lekcji: kolejka ćwiczeń, ocena kart w FSRS, punkty i ekran podsumowania.

import { h, wyczysc } from './dom.js';
import { budujLekcje, wybierzCwiczenie, refKarty, kierunek, pozycja, MAX_CWICZEN } from './session.js';
import { CWICZENIA, nowa, lekcjaGramatyki } from './cwiczenia.js';
import { nowaKarta, ocen, State } from './srs.js';
import { pakiet } from './content.js';
import { dodajXP, zaliczLekcje, XP, seria, xpDzis, sprawdzOdznaki } from './game.js';
import { zapiszStan } from './store.js';
import { stop } from './audio.js';
import { linga, obrazOdznaki, potwierdz } from './grafiki.js';

const ZA_CHWILE = 20 * 60 * 1000; // karta wraca jeszcze w tej lekcji, gdy FSRS chce ją pokazać w ciągu 20 min

export async function uruchomLekcje({ stan, info, zakres, poKoncu, kolor, tytul, przejscie }) {
  const plan = await budujLekcje(stan, info, zakres);
  // lekcja z karty działu przejmuje jej kolor (karta „staje się” ekranem lekcji)
  const ekran = h('div', { class: 'lekcja' + (kolor ? ` w-kolorze kolor-${kolor}` : '') + (przejscie ? ' z-karty' : '') });
  const pasek = h('div', { class: 'postep-wew' });
  const zamknij = h('button', { class: 'zamknij', type: 'button', 'aria-label': 'Zakończ lekcję' }, '✕');
  const pole = h('div', { class: 'cw-pole' });
  ekran.append(h('div', { class: 'lekcja-gora' }, zamknij, h('div', { class: 'postep' }, pasek)),
    tytul ? h('div', { class: 'lekcja-tytul serif' }, tytul) : null, pole);
  document.body.append(ekran);
  document.body.classList.add('w-lekcji');

  const kolejka = [...plan.kolejka];
  let zrobione = 0; let bledy = 0; let zdobyteXP = 0; let poprawne = 0; let ocenione = 0;
  let przerwano = false;
  let mowil = false;
  const pokazaneLekcjeGram = new Set();
  zamknij.onclick = async () => {
    if (zrobione > 0 && !(await potwierdz({
      tytul: 'Kończymy na dziś?', tekst: `Masz już ${zrobione} ${zrobione === 1 ? 'ćwiczenie' : zrobione < 5 ? 'ćwiczenia' : 'ćwiczeń'} — postęp zostanie zapisany.`,
      tak: 'Zakończ', nie: 'Ćwiczę dalej', poza: 'serce',
    }))) return;
    przerwano = true;
    zakoncz();
  };

  const odswiezPasek = () => {
    const razem = zrobione + kolejka.length;
    pasek.style.width = `${Math.round((zrobione / Math.max(1, razem)) * 100)}%`;
  };

  let rozwiaz;
  const koniec = new Promise((r) => { rozwiaz = r; });
  function zakoncz() {
    stop();
    ekran.remove();
    document.body.classList.remove('w-lekcji');
    rozwiaz();
  }

  if (!kolejka.length) {
    wyczysc(pole).append(h('div', { class: 'pusto' },
      linga('spi', 'linga-duza'),
      h('h2', { class: 'serif' }, 'Na dziś wszystko zrobione'),
      h('p', {}, 'Nie masz powtórek ani nowych pozycji. Wybierz pakiet i dodaj go do nauki.'),
      h('button', { class: 'btn glowny', type: 'button', onclick: zakoncz }, 'Wróć')));
    await koniec;
    return;
  }

  (async () => {
    while (kolejka.length && !przerwano && zrobione < MAX_CWICZEN) {
      odswiezPasek();
      const el = kolejka.shift();
      if (el.rodzaj === 'nowa') {
        const p = await pozycja(el.ref, stan);
        if (!p) continue;
        if (p.typ === 'gramatyka' && !pokazaneLekcjeGram.has(p.pakiet)) {
          const pk = await pakiet(p.pakiet);
          const pierwsza = !pk.pozycje.some((x) => stan.wprowadzone[`${pk.id}/${x.id}`]);
          if (pierwsza && pk.lekcja) { await lekcjaGramatyki(pole, pk); if (przerwano) break; }
          pokazaneLekcjeGram.add(p.pakiet);
        }
        if (p.typ !== 'gramatyka') { await nowa(pole, p); if (przerwano) break; }
        const teraz = Date.now();
        stan.wprowadzone[el.ref] = teraz;
        const kier = p.typ === 'gramatyka' ? ['p'] : ['r', 'p'];
        for (const k of kier) if (!stan.karty[`${el.ref}|${k}`]) stan.karty[`${el.ref}|${k}`] = nowaKarta(new Date(teraz));
        zapiszStan(stan);
        // od razu przypomnienie (rozpoznanie), produkcja kilka ćwiczeń później
        kolejka.unshift({ rodzaj: 'karta', klucz: `${el.ref}|${kier[0]}` });
        if (kier.length > 1) kolejka.splice(Math.min(kolejka.length, 4), 0, { rodzaj: 'karta', klucz: `${el.ref}|p` });
        continue;
      }
      const ref = refKarty(el.klucz);
      const p = await pozycja(ref, stan);
      if (!p) continue;
      const karta = stan.karty[el.klucz];
      const typ = wybierzCwiczenie(el.klucz, karta, p, info);
      if (typ === 'mow') mowil = true;
      const wynik = typ === 'fiszka' ? await CWICZENIA.fiszka(pole, p, karta, kierunek(el.klucz)) : await CWICZENIA[typ](pole, p);
      if (przerwano) break;
      zrobione += 1; ocenione += 1;
      if (wynik.poprawnie) poprawne += 1; else bledy += 1;
      zdobyteXP += wynik.xp;
      if (wynik.xp) dodajXP(stan, wynik.xp);
      if (wynik.ocena && karta) {
        const nowaK = ocen(karta, wynik.ocena);
        stan.karty[el.klucz] = nowaK;
        if (nowaK.due - Date.now() < ZA_CHWILE && nowaK.state !== State.Review) {
          kolejka.splice(Math.min(kolejka.length, 3 + Math.floor(Math.random() * 2)), 0, { rodzaj: 'karta', klucz: el.klucz });
        }
      }
      zapiszStan(stan);
    }
    if (przerwano) return;
    // podsumowanie
    if (ocenione > 0) {
      const bezbledna = bledy === 0 && ocenione >= 5;
      const bonus = XP.lekcja + (bezbledna ? XP.bezbledna : 0);
      zdobyteXP += bonus;
      dodajXP(stan, bonus);
      zaliczLekcje(stan);
      const nowe = sprawdzOdznaki(stan, { bezbledna, mowil, godzina: new Date().getHours() });
      zapiszStan(stan);
      pokazPodsumowanie(pole, { stan, zdobyteXP, poprawne, ocenione, bezbledna, nowe, zakoncz });
    } else zakoncz();
  })();

  await koniec;
  poKoncu?.();
}

function pokazPodsumowanie(pole, { stan, zdobyteXP, poprawne, ocenione, bezbledna, nowe, zakoncz }) {
  wyczysc(pole);
  const s = seria(stan);
  const cel = stan.ustawienia.cel;
  const dzis = xpDzis(stan);
  pole.append(h('div', { class: 'podsum' },
    linga(bezbledna ? 'puchar' : 'konfetti', 'linga-duza'),
    h('h2', { class: 'serif' }, bezbledna ? 'Bez jednego błędu!' : 'Lekcja ukończona!'),
    h('div', { class: 'podsum-kafle' },
      h('div', { class: 'kafel zolty' }, h('small', {}, 'Zdobyte XP'), h('b', {}, `+${zdobyteXP}`)),
      h('div', { class: 'kafel mietowy' }, h('small', {}, 'Trafność'), h('b', {}, `${Math.round((poprawne / Math.max(1, ocenione)) * 100)}%`)),
      h('div', { class: 'kafel rozowy' }, h('small', {}, 'Seria'), h('b', {}, `🔥 ${s.dni}`))),
    h('div', { class: 'podsum-cel' }, dzis >= cel ? `Cel dzienny zrobiony: ${dzis}/${cel} XP 💪` : `Do celu dziennego brakuje ${cel - dzis} XP`),
    nowe.length ? h('div', { class: 'podsum-odznaki' }, h('div', { class: 'maly' }, 'Nowa odznaka!'),
      nowe.map((o) => h('div', { class: 'odznaka zdobyta' }, h('span', { class: 'odznaka-emoji' }, obrazOdznaki(o.id)), h('b', {}, o.nazwa), h('small', {}, o.opis)))) : null,
    h('button', { class: 'btn glowny szeroki', type: 'button', onclick: zakoncz }, 'Dalej')));
}
