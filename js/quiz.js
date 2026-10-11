// Quiz po artykule: 5 pytań sprawdzających rozumienie (wybór albo prawda/fałsz) z wyjaśnieniem po odpowiedzi.

import { h, wyczysc, mieszaj } from './dom.js';
import { wybor } from './cwiczenia.js';
import { linga, potwierdz, ik } from './grafiki.js';
import { graj, stop } from './audio.js';
import { dodajXP, XP, sprawdzOdznaki } from './game.js';
import { zapiszStan, profilInfo } from './store.js';
import { przyciskWyslij } from './wynik.js';

const PRAWDA = 'Prawda ✓';
const FALSZ = 'Fałsz ✗';

export function uruchomQuiz({ a, stan, poKoncu }) {
  const pytania = a.pytania || [];
  const kolor = a.kolor === 'zielony' ? 'mietowy' : (a.kolor || 'krem');
  const ekran = h('div', { class: `lekcja w-kolorze kolor-${kolor} z-karty` });
  const pasek = h('div', { class: 'postep-wew' });
  const zamknij = h('button', { class: 'zamknij', type: 'button', 'aria-label': 'Zakończ quiz' }, ik('zamknij'));
  const pole = h('div', { class: 'cw-pole' });
  ekran.append(h('div', { class: 'lekcja-gora' }, zamknij, h('div', { class: 'postep' }, pasek)), h('div', { class: 'lekcja-tytul serif' }, a.tytul), pole);
  document.body.append(ekran);
  document.body.classList.add('w-lekcji');

  let przerwano = false; let dobre = 0; let i = 0;
  const koniec = () => { stop(); ekran.remove(); document.body.classList.remove('w-lekcji'); poKoncu?.(); };
  zamknij.onclick = async () => {
    if (i > 0 && !(await potwierdz({ tytul: 'Przerwać quiz?', tekst: 'Wynik nie zostanie zapisany.', tak: 'Przerwij', nie: 'Odpowiadam dalej', poza: 'mysli' }))) return;
    przerwano = true; koniec();
  };

  (async () => {
    for (; i < pytania.length && !przerwano; i++) {
      pasek.style.width = `${Math.round((i / pytania.length) * 100)}%`;
      const q = pytania[i];
      const tresc = h('div', { class: 'cw-tekst quiz-pytanie' },
        h('div', { class: 'cw-en zdanie klik', onclick: () => graj(q.pytanie, a.glos || 'alice') }, q.pytanie),
        q.pytanie_pl ? h('div', { class: 'cw-pl maly' }, q.pytanie_pl) : null);
      const prawda = q.typ === 'prawda';
      const wynik = await wybor(pole, {
        naglowek: `Pytanie ${i + 1} z ${pytania.length}${prawda ? ' · prawda czy fałsz?' : ''}`, typ: 'quiz', tresc,
        opcje: prawda ? [PRAWDA, FALSZ] : mieszaj([...q.opcje]), poprawna: prawda ? (q.odp ? PRAWDA : FALSZ) : q.odp, xp: 0,
        rozw: h('div', { class: 'rozw' }, prawda ? null : h('div', { class: 'rozw-en' }, q.odp), q.wyjasnienie ? h('div', { class: 'rozw-uwaga' }, q.wyjasnienie) : null),
      });
      if (przerwano) return;
      if (wynik.poprawnie) dobre += 1;
    }
    if (przerwano) return;
    pasek.style.width = '100%';
    // XP: pełne za pierwsze podejście, potem tylko za poprawę najlepszego wyniku
    const poprzedni = stan.quizy?.[a.id] ?? -1;
    const xp = poprzedni < 0 ? XP.artykul + dobre * 2 : Math.max(0, dobre - poprzedni) * 2;
    stan.quizy = { ...(stan.quizy || {}), [a.id]: Math.max(poprzedni, dobre) };
    if (!stan.przeczytane[a.id]) stan.przeczytane[a.id] = Date.now();
    if (xp) dodajXP(stan, xp);
    const nowe = sprawdzOdznaki(stan);
    zapiszStan(stan);
    const wszystko = dobre === pytania.length;
    wyczysc(pole).append(h('div', { class: 'podsum' },
      linga(wszystko ? 'puchar' : dobre >= pytania.length - 1 ? 'konfetti' : 'czyta', 'linga-duza'),
      h('h2', { class: 'serif' }, wszystko ? 'Wszystko zrozumiałe!' : dobre >= 3 ? 'Dobrze rozumiesz tekst!' : 'Warto przeczytać jeszcze raz'),
      h('div', { class: 'podsum-kafle' },
        h('div', { class: 'kafel mietowy' }, h('small', {}, 'Wynik'), h('b', {}, `${dobre}/${pytania.length}`)),
        h('div', { class: 'kafel zolty' }, h('small', {}, 'Zdobyte XP'), h('b', {}, `+${xp}`)),
        h('div', { class: 'kafel rozowy' }, h('small', {}, 'Najlepszy'), h('b', {}, `${stan.quizy[a.id]}/${pytania.length}`))),
      nowe.length ? h('p', {}, `Nowa odznaka: ${nowe.map((o) => o.nazwa).join(', ')}`) : null,
      przyciskWyslij([`Lingoza · ${profilInfo(stan.id)?.imie || ''}`, `Quiz po tekście: ${a.tytul}`,
        `Dobrze: ${dobre} z ${pytania.length} · najlepszy wynik ${stan.quizy[a.id]}/${pytania.length} · +${xp} XP`].join('\n'), 'btn jasny szeroki'),
      h('button', { class: 'btn glowny szeroki', type: 'button', onclick: koniec }, 'Wróć do tekstu')));
  })();
}
