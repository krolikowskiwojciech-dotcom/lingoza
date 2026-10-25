// Komputer: ćwiczenie ma się mieścić w oknie bez przewijania (Wojtek 2026-10-25).
// 1) Dwie kolumny: po lewej zadanie i odpowiedź po błędzie, po prawej opcje / pole wpisu / przyciski.
//    Ćwiczenia budują pole po swojemu (polecenie, treść, reszta, stopka) — tu tylko przekładamy gotowe elementy.
// 2) Powiększenie treści (--skala, od 1.18 w dół), aż nic nie wystaje pod pasek „Dalej”.
// Na telefonie nic się nie zmienia.

const KOMPUTER = matchMedia('(min-width: 1000px) and (pointer: fine)');
const MAKS = 1.18;
const MIN = 0.8;

function rozloz(pole) {
  const kol = pole.querySelector(':scope > .kolumny');
  if (!KOMPUTER.matches) {
    if (kol) kol.replaceWith(...kol.querySelectorAll(':scope > .kol > *'));
    return;
  }
  const pol = pole.querySelector(':scope > .cw-polecenie');
  if (!pol) return;
  const stopka = pole.querySelector(':scope > .stopka');
  const luzem = [...pole.children].filter((x) => x !== pol && x !== stopka && x !== kol);
  if (!luzem.length) return;
  let lewa; let prawa;
  if (kol) [lewa, prawa] = kol.children;
  else {
    lewa = document.createElement('div'); lewa.className = 'kol kol-lewa';
    prawa = document.createElement('div'); prawa.className = 'kol kol-prawa';
    const k = document.createElement('div'); k.className = 'kolumny';
    k.append(lewa, prawa);
    pol.after(k);
  }
  for (const x of luzem) if (!x.classList.contains('wynik-blok')) (lewa.childElementCount ? prawa : lewa).append(x);
  // odpowiedź po błędzie: pod zadaniem, a gdy po prawej nic nie ma — po prawej (żeby lewa nie urosła ponad ekran)
  for (const w of luzem.filter((x) => x.classList.contains('wynik-blok'))) (prawa.childElementCount ? lewa : prawa).append(w);
  // tabelka przy odpowiedzi idzie do drugiej kolumny (pod opcje albo pod zadanie), żeby żadna nie urosła ponad ekran
  const dod = pole.querySelector('.kolumny > .kol > .wynik-blok > .wynik-dodatek');
  if (dod) (dod.closest('.kol') === lewa ? prawa : lewa).append(dod);
}

function dopasuj(pole) {
  if (!KOMPUTER.matches) { pole.style.removeProperty('--skala'); pole.style.removeProperty('padding-bottom'); return; }
  const stopka = pole.querySelector(':scope > .stopka');
  pole.style.paddingBottom = `${(stopka?.offsetHeight || 100) + 16}px`;
  const tresc = [...pole.children].filter((x) => x !== stopka);
  if (!tresc.length) return;
  const zakres = () => {
    const gora = Math.min(...tresc.map((x) => x.getBoundingClientRect().top));
    const dol = Math.max(...tresc.map((x) => x.getBoundingClientRect().bottom));
    const granica = (stopka ? stopka.getBoundingClientRect().top : pole.getBoundingClientRect().bottom) - 12;
    return { wys: dol - gora, miejsce: granica - gora };
  };
  const y = pole.scrollTop;
  pole.scrollTop = 0;
  let s = MAKS;
  pole.style.setProperty('--skala', s);
  // kilka przybliżeń: po zmniejszeniu tekst łamie się inaczej, więc wysokość nie maleje dokładnie proporcjonalnie
  for (let i = 0; i < 4; i++) {
    const { wys, miejsce } = zakres();
    if (wys <= miejsce + 1 || s <= MIN) break;
    s = Math.max(MIN, Math.floor(s * (miejsce / wys) * 100) / 100);
    pole.style.setProperty('--skala', s);
  }
  // tekst łamie się inaczej w każdej skali — próbujemy jeszcze urosnąć, póki się mieści
  for (let i = 0; i < 12 && s < MAKS; i++) {
    const t = Math.min(MAKS, Math.round((s + 0.02) * 100) / 100);
    pole.style.setProperty('--skala', t);
    const { wys, miejsce } = zakres();
    if (wys > miejsce + 1) { pole.style.setProperty('--skala', s); break; }
    s = t;
  }
  if (s <= MIN) pole.scrollTop = y; // i tak się nie mieści — zostaw przewijanie tam, gdzie było
}

function wszystkie() {
  document.querySelectorAll('.cw-pole').forEach((pole) => {
    rozloz(pole);
    const intro = pole.querySelector(':scope > .intro'); // nowe słowo: wszystko w jednym bloku — karta po lewej, reszta po prawej
    if (intro) rozloz(intro);
    dopasuj(pole);
  });
}

// w obserwatorze, nie w setTimeout: przełożenie elementów dzieje się przed narysowaniem klatki (bez mignięcia)
new MutationObserver(wszystkie).observe(document.body, { childList: true, subtree: true, characterData: true });
addEventListener('resize', wszystkie);
KOMPUTER.addEventListener('change', wszystkie);
// obrazki i czcionki doczytują się później i zmieniają wysokość
document.addEventListener('load', (e) => { if (e.target.tagName === 'IMG') wszystkie(); }, true);
document.fonts?.ready.then(wszystkie);
// pomiar w trakcie animacji wjazdu (przesunięcie) zawyża wysokość — po jej końcu liczymy jeszcze raz
document.addEventListener('animationend', (e) => { if (e.target.closest?.('.cw-pole')) wszystkie(); }, true);
