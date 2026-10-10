# Lingoza — rodzinna aplikacja do nauki języków (PWA)

Zawsze po polsku. Aplikacja webowa na iPhone'a (dodana do ekranu początkowego), w stylu Duolingo.

- **Adres:** https://krolikowskiwojciech-dotcom.github.io/lingoza/ (GitHub Pages z gałęzi `main`, repo publiczne).
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

Zdjęcie strony z podręcznika dzieci → pakiet `dzieci-<temat>.json` w dziale `szkola`, `"dla": ["dzieci"]`, z `obraz` (emoji).

## Kod

- `index.html`, `styles.css` (wygląd: kremowe tło, pastelowe karty 3D, Libre Baskerville + Jost, bez kursywy),
- `js/app.js` (ekrany, nawigacja `#/…`), `js/lekcja.js` (przebieg lekcji), `js/cwiczenia.js` (typy ćwiczeń),
  `js/session.js` (dobór powtórek/nowych i drabinka ćwiczeń), `js/srs.js` (FSRS, `js/vendor/ts-fsrs.mjs`, MIT),
  `js/game.js` (XP, seria, liga, odznaki), `js/czytnik.js` (artykuły z klikalnymi słowami), `js/sync.js` (GitHub API),
  `js/store.js` (stan i scalanie), `js/glosy.js` (reguły nagrań, wspólne z narzędziem), `sw.js` (offline + push).
- Nagrania: `audio/en/<sha1>.mp3` + `audio/en/indeks.json`. Nazwa = skrót z modelu, głosu i tekstu, więc tego samego
  tekstu nie nagrywamy drugi raz. Brak nagrania → głos systemowy urządzenia.
- Podgląd lokalny: serwer statyczny na **http://127.0.0.1:<port>** (osobny origin = bez tokenu, bez synchronizacji
  z prawdziwymi danymi). Nie testuj z tokenem — testy zapisywałyby się w postępach rodziny.
- Po każdej zmianie kodu podbij `CACHE` w `sw.js`, potem commit + push.
- Zakładanie repo i zmiany uprawnień tylko za zgodą Wojtka.
