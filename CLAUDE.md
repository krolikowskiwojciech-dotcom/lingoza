# Lingoza — rodzinna aplikacja do nauki języków (PWA)

Użytkownik widzi nazwę **„Angielski”** (tytuł, manifest, ekran telefonu, powiadomienia — Wojtek 2026-10-24). „Lingoza” zostaje
tylko w nazwach repo, plików, kluczy localStorage, id i cache. Zawsze po polsku. Aplikacja webowa na iPhone'a (dodana do ekranu początkowego), w stylu Duolingo.

- **Adres:** https://krolikowskiwojciech-dotcom.github.io/lingoza/ (GitHub Pages z gałęzi `main`, repo publiczne)
  oraz https://angielski.ogarnijmaterial.pl (Cloudflare Pages, ten sam push).
- **Tryb ogarnijmaterial.pl** (`OGARNIJ` w `js/sync.js`): przy starcie `https://ogarnijmaterial.pl/api/ja` (ciasteczko sesji) —
  200 → profil o tym samym id, bez ekranu wyboru profilu; 401 → przekierowanie na https://ogarnijmaterial.pl/.
  Synchronizacja i push przez pośrednika `https://ogarnijmaterial.pl/api/gh/…` (`credentials: 'include'`, bez tokenu);
  pole tokenu ukryte. Na starcie „← Przedmioty” (strona główna) i inicjał w prawym rogu (→ `#konta`, „Zmień osobę”).
  Test lokalny: `http://127.0.0.1:<port>/?om=<id>` (albo `?om=401`) — tylko na 127.0.0.1/localhost, synchronizacja wyłączona.
- **Dane:** prywatne repo `krolikowskiwojciech-dotcom/lingoza-dane`: `rodzina.json`, `profile/<id>.json` (postępy),
  `push/*.json` (subskrypcje powiadomień) i zadanie `przypomnienia.yml` (GitHub Actions co godzinę, sekrety VAPID).
- **Profile:** Wojtek (B1, fizjoterapeuta, kolarz), Magda (żona, cele do ustalenia), Aniela i Julian (dzieci 10–12 l.:
  szkoła, gry, zwierzęta, YouTube). Profil dziecka nie widzi działu „Praca”.
- **Metodyka:** `ZASADY-NAUKI.md` (FSRS, przypominanie, bloki językowe, wiele głosów). Zmiany w ćwiczeniach sprawdzaj z tym plikiem.
- **Format treści:** `TRESCI.md`. Kategorie wyraźnie rozdzielone: **Praca** / **Poza pracą** (+ zakładka Gramatyka).

## Prośby o treści („wgraj mi słówka do pracy…”, „dodaj słownictwo o kolarstwie…”, „zrób artykuł o…”)

1. `git pull`.
2. Dopisz pakiet/artykuł według `TRESCI.md` do właściwego działu z `tresci/en/kategorie.json`
   (nowy dział dopisz do kategorii, gdy żaden nie pasuje). Nigdy nie zmieniaj `id` istniejących pozycji — od nich zależą postępy.
3. `node narzedzia/lingoza.mjs katalog` — musi przejść bez błędów; w artykułach nie może być słów bez tłumaczenia.
4. `node narzedzia/lingoza.mjs nagraj` — podaje liczbę znaków ElevenLabs. **Podaj Wojtkowi liczbę znaków i czekaj na zgodę**,
   chyba że wcześniej zatwierdził budżet. Potem `node narzedzia/lingoza.mjs nagraj --tak`.
   Klucz: `.env` na iCloud (`Audio - do nauki /lekcje-audio/.env`, ten sam co „Ucz się sprytniej”), nigdy nie wypisuj go.
   Model `eleven_v4`, głosy w `js/glosy.js` (Alice/George — brytyjskie, Sarah/Brian — amerykańskie).
5. Podbij `CACHE` w `sw.js` tylko przy zmianach kodu (nagrania i treści nie wymagają).
6. Commit + `git push` — Pages publikuje w 1–2 min, aplikacja pokaże nowy pakiet sama.

## Lekcje z podręcznika dzieci (zrzuty od Wojtka)

U dzieci zakładka **Lekcje** pokazuje pakiety z działu `szkola` — **jeden rozdział podręcznika = jeden pakiet** = jedna karta talii.
- Plik `tresci/en/pakiety/szkola-<nr>-<temat>.json`, `"kategoria": "poza"`, `"dzial": "szkola"`, `"dla": ["dzieci"]`, `"start": true`,
  `"tytul"` jak w podręczniku (np. „Unit 3: My house”), `"opis"` po polsku, czego dotyczy rozdział.
- Słówka i zwroty dokładnie z podręcznika (pisownia podręcznika), każde z `obraz` (emoji) tam, gdzie się da, i 1–2 prostymi przykładami.
- Gramatyka z rozdziału → osobna lekcja `gram-…` z `lekcja.kroki` (TRESCI.md), też `"dla"` z dziećmi.
- Krótki tekst/czytanka z podręcznika → artykuł w dziale `szkola` z pytaniami (`pytania`).
- Zdjęcie strony nie trafia do repo (prawa autorskie wydawnictwa) — tylko opracowane słówka.

## Kartkówka ze zdjęcia („Julek ma kartkówkę z angielskiego, zrób mu ćwiczenia z tego zdjęcia”)

Jak w Matmozie: rozpoznaj na zdjęciu (podręcznik, karta pracy, notatka z zeszytu) **typy zadań** — każdy typ = osobny blok —
i zrób plik `tresci/en/pakiety/kartkowka-<data>-<profil>-<temat>.json` według sekcji „Kartkówka” w `TRESCI.md`
(`profile`: `julian` albo `aniela`, `termin` = dzień kartkówki). Poziom i słówka dokładnie jak na zdjęciu, nie trudniej.
Potem `katalog` → `nagraj` (liczba znaków do zgody Wojtka) → commit + push. Zdjęcie nie trafia do repo.
Wyniki dzieci: `stan.kartkowki` w `lingoza-dane/profile/<id>.json` — sprawdź je przed kolejnym zestawem i dołóż ćwiczeń z pomyłek.

## Zasady wyglądu (ustalone z Wojtkiem — obowiązują każdą sesję)

Przy zmianach interfejsu trzymaj się tych reguł; nowe ekrany mają wyglądać jak istniejące, a nie wprowadzać własny styl.
- **Kroje:** nagłówki Libre Baskerville (`.serif`), tekst Jost. **Zero kursywy** (także w wyróżnieniach).
- **Bez emoji w interfejsie** (przyciski, menu, nagłówki, gwiazdki, statusy): ikony SVG z `js/grafiki.js` — `ik('nazwa')`, `glosnik()`;
  brakującą ikonę dopisz do zestawu `IKONY` w tym samym stylu (kreska 2.1, zaokrąglone końce). Emoji zostają tylko jako `obraz`
  słówek dla dzieci i jako zapas, gdy brak ilustracji.
- **Ilustracje 3D** (styl clay, pastele) tylko do treści: działy, pakiety, artykuły, odznaki — przedmioty, nigdy postacie z dużymi
  oczami ani maskotki (dzieci mają 11 i 13 lat). Z arkuszy ChatGPT (`narzedzia/tnij_arkusz.py`).
- **Maskotka Linga i awatary-zwierzątka/awatary 3D usunięte — Wojtek 2026-10-24.** Nie przywracać, nie zastępować inną maskotką.
  Osobę pokazuje inicjał w kółku (`inicjal()` w `js/grafiki.js`, Libre Baskerville, kolor profilu; białe kółko na kolorowym kafelku).
  Pole `avatar` w danych zostaje, ale nie jest pokazywane.
- **Powrót zawsze w lewym górnym rogu:** pigułka „← Wróć” (`wroc()` z `js/grafiki.js`, tło karty, obramowanie, cień 3px) na każdym
  ekranie poza startem, także w lekcji/quizie/kartkówce (wyjście z postępem → `potwierdz()`). Na starcie pod ogarnijmaterial.pl „← Przedmioty”.
- **Ikona na ekran telefonu:** kwadrat #C9C5F7 z liniowym znakiem dwóch dymków #1D1C22 (`ikony/ikona-*.png`).
- **Karty 3D** (`.karta-stos`, `.karta-pakietu`, `.karta-art`): grubość krawędzi `--brzeg`, połysk, talia: największa karta (najważniejsza, najwcześniejsza) na górze, kolejne w dół coraz mniejsze (Wojtek 2026-10-15). Lekcje dzieci: przypięta lekcja „Teraz ćwiczymy”, potem Unit 0, 1, 2…
- **Gwiazdki postępu** na kartach są stonowane (kolor tekstu); kolorowe gwiazdki tylko w wynikach (`.gwiazdki-wynik`).
- **Styl profilu** (`styl`: dorosly / nastolatek / dziecko): różni się tylko wielkością elementów (dziecko — większe przyciski i tekst).
- **Żadnych `confirm()`/`alert()`** — tylko `potwierdz()` (arkusz od dołu w stylu aplikacji).
- **Audio:** dotknięcie kafelka/słowa/zdania odtwarza nagranie; w ćwiczeniach z produkcją po angielsku — „Posłuchaj podpowiedzi” (obniża ocenę).
- **Dźwięki interfejsu** (`dzwieki/*.mp3`, `js/dzwieki.js`, te same co w Biologozie — spis w `~/Projekty/biologoza/DZWIEKI.md`):
  grają przez Web Audio, lektor czeka na dźwięk odpowiedzi, przy mówiącym lektorze kliknięcia ściszone, przy mikrofonie cisza.
  Nowy ekran → użyj `dzwiek('…')` / `odpowiedz(ok)` zamiast własnych dźwięków.
- Zmiany wizualne sprawdzaj renderem (Chrome headless na 127.0.0.1) przed pushem.

## Kod

- `index.html`, `styles.css` (wygląd: kremowe tło, pastelowe karty 3D, Libre Baskerville + Jost, bez kursywy),
- `js/app.js` (ekrany, nawigacja `#/…`), `js/lekcja.js` (przebieg lekcji), `js/cwiczenia.js` (typy ćwiczeń),
  `js/session.js` (dobór powtórek/nowych i drabinka ćwiczeń), `js/srs.js` (FSRS, `js/vendor/ts-fsrs.mjs`, MIT),
  `js/game.js` (XP, seria, liga, odznaki), `js/czytnik.js` (artykuły z klikalnymi słowami), `js/sync.js` (GitHub API),
  `js/kartkowka.js` (kartkówki z blokami), `js/wynik.js` („Wyślij wynik” — systemowe udostępnianie),
  `js/store.js` (stan i scalanie), `js/glosy.js` (reguły nagrań, wspólne z narzędziem),
  `sw.js` (offline + push; pliki aplikacji stale-while-revalidate, `tresci/` najpierw sieć z limitem 2,5 s, nagrania na stałe).
- Nagrania: `audio/en/<sha1>.mp3` + `audio/en/indeks.json`. Nazwa = skrót z modelu, głosu i tekstu, więc tego samego
  tekstu nie nagrywamy drugi raz. Brak nagrania → głos systemowy urządzenia.
- Podgląd lokalny: serwer statyczny na **http://127.0.0.1:<port>** (osobny origin = bez tokenu, bez synchronizacji
  z prawdziwymi danymi). Nie testuj z tokenem — testy zapisywałyby się w postępach rodziny.
- Po każdej zmianie kodu podbij `CACHE` w `sw.js`, potem commit + push.
- Zakładanie repo i zmiany uprawnień tylko za zgodą Wojtka.
