# Format treści Lingozy

Wszystkie treści leżą w `tresci/<język>/` (na razie `en`). Po każdej zmianie:

```bash
node narzedzia/lingoza.mjs katalog        # sprawdza i przebudowuje katalog.json
node narzedzia/lingoza.mjs nagraj         # pokazuje, ile znaków ElevenLabs kosztują brakujące nagrania
node narzedzia/lingoza.mjs nagraj --tak   # generuje je (po zgodzie Wojtka na liczbę znaków)
```

## Kategorie

`tresci/en/kategorie.json` — dwa wyraźnie oddzielone światy: **`praca`** (fizjoterapia, bike fitting, kontakt z klientem)
i **`poza`** (podróże, sport, codzienność, szkoła, gry, zwierzęta, media). Każdy pakiet i artykuł należy do jednego działu.
Gramatyka to osobna zakładka (`rodzaj: "gramatyka"`, bez kategorii).

## Pakiet słówek/zwrotów — `tresci/en/pakiety/<id>.json`

```json
{
  "id": "praca-wywiad",
  "kategoria": "praca",
  "dzial": "gabinet",
  "tytul": "Wywiad z pacjentem",
  "opis": "Pytania na pierwszej wizycie",
  "emoji": "🩺",
  "kolor": "lila",
  "poziom": "B1",
  "dla": ["dorosli"],
  "start": true,
  "pozycje": [
    {
      "id": "gdzie-boli",
      "typ": "zwrot",
      "en": "Where does it hurt?",
      "pl": "Gdzie boli?",
      "alt": ["Where is the pain?"],
      "przyklady": [
        { "en": "Can you point to where it hurts the most?", "pl": "Może Pan/Pani pokazać, gdzie boli najbardziej?", "luka": "hurts the most" },
        { "en": "Where does it hurt when you lift your arm?", "pl": "Gdzie boli, kiedy unosi Pan/Pani rękę?" }
      ],
      "uwaga": "Krótka wskazówka po polsku: niuans, wymowa, różnica BrE/AmE, częsty błąd Polaków.",
      "myli": ["ache"],
      "obraz": "🤕"
    }
  ]
}
```

- `typ`: `slowo` | `zwrot` | `kolokacja` | `idiom` | `phrasal` | `zdanie`.
- `id` pozycji: krótki, ASCII, z myślnikami, unikalny w pakiecie, **nigdy nie zmieniany** (od niego zależą postępy).
- `en`: to, czego się uczymy, w naturalnej formie (dla zwrotu z interpunkcją, dla słowa bez). Rzeczowniki z przedimkiem tylko gdy naturalnie (np. „a sprain”).
- `pl`: naturalne polskie tłumaczenie (może być kilka znaczeń po przecinku, ale krótko).
- `alt`: inne poprawne odpowiedzi przy wpisywaniu (opcjonalnie).
- `przyklady`: 2 zdania dla dorosłych, 1–2 dla dzieci. **Pierwszy przykład ma nagranie**, więc musi być najlepszy. `luka` = dokładny fragment pierwszego przykładu do zakrycia w ćwiczeniu „uzupełnij lukę”, gdy hasło występuje w odmienionej formie; jeśli hasło występuje dosłownie, `luka` można pominąć.
- `uwaga`: opcjonalna, po polsku, 1 zdanie.
- `myli`: angielskie hasła łatwe do pomylenia z tym (nie trafiają jako błędne odpowiedzi w tej samej lekcji).
- `obraz`: emoji — obowiązkowe w pakietach dla dzieci, gdy da się dobrać jednoznaczne.
- `dla`: `["dorosli"]`, `["dzieci"]` albo oba. `start: true` = pakiet włączany automatycznie do codziennej nauki nowego profilu.
- `kolor`: `lila` | `rozowy` | `zolty` | `mietowy` | `zielony` | `brzoskwinia` | `niebieski`.

Zasady doboru (z `ZASADY-NAUKI.md`): przewaga zwrotów i kolokacji nad pojedynczymi słowami, najpierw to, co najczęstsze,
nie wrzucaj do jednego pakietu par łatwych do pomylenia bez oznaczenia `myli`, przykłady w różnych kontekstach.

## Lekcja gramatyki — `tresci/en/pakiety/gram-<id>.json`

```json
{
  "id": "gram-present-perfect",
  "rodzaj": "gramatyka",
  "tytul": "Present Perfect czy Past Simple?",
  "opis": "…", "emoji": "⏳", "kolor": "lila", "poziom": "B1", "dla": ["dorosli", "dzieci"],
  "lekcja": {
    "tytul": "Present Perfect czy Past Simple?",
    "zasady": ["Max 3 krótkie akapity po polsku, wolno użyć <b>pogrubienia</b>."],
    "przyklady": [{ "en": "I have lost my keys.", "pl": "Zgubiłem klucze (i nadal ich nie mam)." }]
  },
  "pozycje": [
    { "id": "pp-01", "typ": "gramatyka", "en": "I ___ to Rome last summer.", "odp": "went", "opcje": ["went", "have gone"],
      "pl": "Byłem w Rzymie zeszłego lata.", "wyjasnienie": "„last summer” = zakończony czas w przeszłości → Past Simple.", "podpowiedz": "go" }
  ]
}
```

## Artykuł — `tresci/en/artykuly/<id>.json`

```json
{
  "id": "praca-bol-krzyza",
  "kategoria": "praca", "dzial": "cialo",
  "tytul": "Why does my lower back hurt?", "tytul_pl": "Dlaczego boli mnie dół pleców?",
  "emoji": "🧍", "kolor": "rozowy", "poziom": "B1", "dla": ["dorosli"], "glos": "alice",
  "akapity": ["Akapit 1…", "Akapit 2…"],
  "akapity_pl": ["Tłumaczenie akapitu 1…", "…"],
  "frazy": [
    { "en": "take it easy", "formy": ["taking it easy", "took it easy"], "typ": "idiom", "pl": "oszczędzać się",
      "wyjasnienie": "Zasada / skąd znaczenie, po polsku.", "przyklad": "Inne zdanie z tym wyrażeniem." }
  ],
  "slowa": {
    "back": { "pl": "plecy" },
    "hurts": { "pl": "boli", "baza": "hurt", "uwaga": "hurt – hurt – hurt (nieregularny)" }
  }
}
```

- `frazy.typ`: `idiom` | `phrasal` | `kolokacja` | `konstrukcja` (gramatyka, np. „used to”, „have been -ing”) | `zwrot`.
- `formy`: dokładne odmiany, w jakich fraza występuje w tekście.
- `slowa`: słowniczek **każdego** słowa z tekstu, klucz małymi literami w formie z tekstu (albo forma podstawowa,
  bo czytnik sam obcina końcówki -s/-ed/-ing). `narzedzia/lingoza.mjs sprawdz` wypisuje brakujące słowa.
- Każde słowo w słowniczku i każda fraza dostają nagranie (głos Alice), akapity — głosem `glos`.

### Pytania sprawdzające do artykułu — pole `pytania`

Po przeczytaniu artykułu użytkownik robi krótki quiz (5 pytań). Dodaj do pliku artykułu:

```json
"pytania": [
  { "typ": "wybor", "pytanie": "Why is lying in bed for days not a good idea?", "pytanie_pl": "Dlaczego leżenie w łóżku przez kilka dni to zły pomysł?",
    "opcje": ["It makes the back stiffer", "It is boring", "Doctors don't allow it"], "odp": "It makes the back stiffer",
    "wyjasnienie": "Akapit 3: odpoczynek w łóżku usztywnia plecy i spowalnia powrót do formy.", "akapit": 3 },
  { "typ": "prawda", "pytanie": "Most back pain is serious.", "pytanie_pl": "Większość bólu pleców jest groźna.",
    "odp": false, "wyjasnienie": "Akapit 1: zwykle nie jest groźny.", "akapit": 1 }
]
```

- Dokładnie 5 pytań: 3 × `wybor` o treść (kolejność jak w tekście), 1 × `wybor` o znaczenie słowa/wyrażenia z tekstu
  („What does … mean in the text?”, opcje po polsku), 1 × `prawda` (`odp`: `true`/`false`).
- Pytania po angielsku na poziomie artykułu (A2 — bardzo proste), zawsze z `pytanie_pl`. `wyjasnienie` po polsku, 1 zdanie, z numerem akapitu.
- `wybor`: 3 opcje (dla A2) albo 4 (B1), `odp` dokładnie jedną z nich, błędne opcje wiarygodne, ale jednoznacznie złe w świetle tekstu.


## Kartkówka ze zdjęcia podręcznika — `tresci/en/pakiety/kartkowka-<rrrr-mm-dd>-<profil>-<temat>.json`

Zestaw przed kartkówką dla konkretnego dziecka. Pokazuje się tylko jemu, w sekcji „Przed kartkówką” na ekranie głównym
(do 7 dni po terminie), nigdy w zwykłych listach pakietów ani w codziennej nauce. **Jeden typ zadań ze zdjęcia = jeden blok.**
Przebieg jak w Matmozie: zła odpowiedź pokazuje rozwiązanie i na 1,2 s blokuje „Dalej”, błędne zadanie wraca w tym samym bloku
innym ćwiczeniem, liczy się pierwsze podejście, na końcu podsumowanie, „Powtórz pomyłki” i „Wyślij wynik” (SMS/Mail).
Próby zapisują się w `stan.kartkowki[id]` (synchronizowane do `lingoza-dane`).

```json
{
  "id": "kartkowka-2026-10-14-julian-unit3",
  "rodzaj": "kartkowka",
  "kategoria": "poza", "dzial": "szkola",
  "tytul": "Kartkówka: Unit 3", "opis": "Słówka o domu i Present Simple.",
  "emoji": "📝", "kolor": "zolty", "poziom": "A2", "dla": ["dzieci"],
  "profile": ["julian"],                 // aniela | julian (wojtek, magda) — dla kogo
  "termin": "2026-10-14", "dodano": "2026-10-12",
  "bloki": [
    { "id": "slowka", "tytul": "Słówka: mój dom", "polecenie": "Napisz po angielsku.",
      "cwiczenia": ["plen", "wpisz"], "pozycje": ["kitchen", "bedroom"], "ile": 8 },
    { "id": "ps", "tytul": "Present Simple: -s", "polecenie": "Wybierz poprawną formę.", "cwiczenia": ["gram-wybor", "gram-wpisz"],
      "lekcja": { "zasady": ["Po <b>he, she, it</b> dodajemy <b>-s</b>."], "przyklady": [{ "en": "She plays football.", "pl": "Ona gra w piłkę." }] },
      "pozycje": ["ps1", "ps2"] }
  ],
  "pozycje": [ /* zwykłe pozycje jak w pakiecie i w lekcji gramatyki (typ "gramatyka" z ___, odp, opcje, wyjasnienie) */ ]
}
```

- `cwiczenia` bloku (pozycja dostaje kolejne z listy, a po błędzie wraca następnym): `plen` (wybór EN), `wpisz` (napisz po angielsku),
  `enpl` / `enpl-wpisz` (znaczenie), `sluchaj` / `sluchaj-wpisz`, `obrazek` (wymaga `obraz`), `dyktando`, `uloz` (zdania), `luka`,
  `gram-wybor`, `gram-wpisz` (tylko dla `typ: "gramatyka"` — a zdania gramatyczne tylko nimi). Kartkówki sprawdzają pisownię,
  więc w blokach słówek dawaj `wpisz` (zwykle po `plen` na rozgrzewkę).
- `ile` (opcjonalnie): ile pozycji bloku losować na rundę; domyślnie wszystkie.
- `lekcja` (opcjonalnie): krótka reguła pokazywana przed blokiem (format jak `lekcja` w gramatyce: `zasady`, `przyklady` albo `kroki`).
- W kartkówce każde zdanie gramatyczne **musi** mieć `wyjasnienie` (pokazywane po błędzie).
- Słówka i zwroty dokładnie z podręcznika (pisownia podręcznika), zdania przykładów własnymi słowami.
