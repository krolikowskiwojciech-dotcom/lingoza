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
