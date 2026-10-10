# Zasady nauki — na czym budujemy aplikację

Opracowanie badań nad skutecznym uczeniem się języków obcych i tego, co z nich wynika dla aplikacji.
Stan: 2026-10-11. Źródła na końcu.

---

## W skrócie

1. **Przypominanie zamiast czytania.** Aplikacja ciągle każe *wydobyć* odpowiedź z pamięci, zanim ją pokaże. To najsilniejszy pojedynczy czynnik.
2. **Powtórki rozłożone w czasie.** Algorytm (FSRS) sam decyduje, co powtórzyć dziś. Krótka sesja codziennie bije godzinę raz w tygodniu.
3. **Bloki językowe zamiast pojedynczych słówek.** Uczymy *„clip in”, „take a breather”, „I'll get back to you on that”*, a nie samo *„clip”*.
4. **Oba kierunki.** Rozpoznanie (EN→PL) przychodzi łatwo, produkcja (PL→EN) dużo trudniej, a to ona jest potrzebna do mówienia. Ćwiczymy obie.
5. **Dużo słuchania, wiele głosów.** To samo zdanie w 2–3 głosach i akcentach z ElevenLabs uczy rozumienia lepiej niż jeden głos.
6. **Mówienie na głos.** Powtarzanie za nagraniem (shadowing) i nagrywanie siebie, a nie tylko klikanie.
7. **Gramatyka: krótka reguła, potem dużo przykładów i ćwiczeń.** Wyjaśnienie wprost działa, ale dopiero w połączeniu z praktyką.
8. **Tematycznie tak, „szufladkami” nie.** Pakiet „kolarstwo” jest OK. Ale *lend/borrow*, *left/right*, *Monday/Tuesday* nie wchodzą jako nowe w tej samej sesji, bo się mieszają.
9. **Dzieci: obraz + dźwięk + ruch, historyjki, krótko.**
10. **Jak Duolingo: punkty, seria dni, cel dzienny, rodzinna liga, przypomnienia push.** Punkty dostaje się za prawdziwe przypomnienie, a nie za klikanie.

---

## Zasady szczegółowo

### 1. Przypominanie (retrieval practice)

**Co mówią badania:** wydobywanie słowa z pamięci (test, fiszka z zakrytą odpowiedzią) daje trwalszą wiedzę niż ponowne przeczytanie czy samo powtarzanie za lektorem (Kang, Gollan, Pashler 2013: *„Don't just repeat after me”*). Połączenie przypominania z rozłożeniem w czasie i informacją zwrotną daje wyraźnie lepsze wyniki niż typowe „przeczytaj i wkuj” (badanie wielodomenowe, *Language Teaching Research* 2021).

**W aplikacji:**
- Każda karta najpierw pyta, a dopiero potem pokazuje odpowiedź.
- Pierwsze spotkanie z nowym słowem to krótka prezentacja: słowo, nagranie, zdanie i tłumaczenie. Już w tej samej sesji pada pierwsze pytanie.
- Samoocena po odpowiedzi w czterech stopniach: *Nie pamiętam / Trudne / Dobrze / Łatwe*, czyli dane wejściowe dla algorytmu.

### 2. Powtórki w odstępach (spacing) + algorytm FSRS

**Co mówią badania:** metaanaliza Kim i Webba (2022) pokazuje średni do dużego efekt rozłożenia nauki w czasie. Dłuższe odstępy przegrywają w teście „od razu”, ale wygrywają w pamięci długoterminowej. Odstępy równe i rosnące wypadają statystycznie podobnie. Metaanaliza Webba, Yanagisawy i Uchihary (2020) jest otrzeźwiająca: zaraz po nauce pamiętamy ok. 60% słów, a po 1–2 tygodniach już tylko **39% znaczeń** i **25% form** (gdy trzeba samemu podać angielskie słowo). Bez powtórek większość ucieka.

**FSRS** to nowoczesny algorytm powtórek, dziś domyślny w Anki. Według otwartego benchmarku przewiduje zapominanie dokładniej niż klasyczne SM-2. Symulacje pokazują ok. 20–30% mniej powtórek przy tej samej trwałości. Ma gotową bibliotekę w JavaScripcie (`ts-fsrs`).

**W aplikacji:**
- FSRS z docelową trwałością 90%.
- Ekran główny pokazuje „Na dziś: 23 powtórki + 8 nowych”. Powtórki mają pierwszeństwo przed nowościami.
- Limit nowych pozycji dziennie (domyślnie 8–10), żeby po tygodniu nie zalała nas lawina powtórek.
- Każdy kierunek (EN→PL, PL→EN, słuch→znaczenie) ma osobny stan pamięci, bo to różne umiejętności.

### 3. Rodzaj ćwiczenia ma znaczenie

**Co mówią badania** (Webb i in. 2020): w porównaniu ćwiczeń słówkowych **fiszki** i listy dają największe przyrosty, a zdania z luką i pisanie dają mniej, zwłaszcza na starcie. Uzupełnianie luk zyskuje za to przy powtórkach rozłożonych w czasie (Kim, Webb). Informacja zwrotna ma umiarkowanie duży wpływ (Wisniewski, Zierer, Hattie 2020: d = 0,48), większy przy umiejętnościach niż przy motywacji.

**W aplikacji, czyli drabinka trudności dla każdej pozycji:**
1. **Posłuchaj i wybierz znaczenie** (rozpoznanie, łatwe)
2. **Fiszka EN→PL** (przypomnienie znaczenia)
3. **Fiszka PL→EN** (przypomnienie formy, trudne i najcenniejsze)
4. **Wpisz, co słyszysz** (dyktando: forma + pisownia)
5. **Uzupełnij lukę w nowym zdaniu** (użycie w kontekście, przy późniejszych powtórkach)
6. **Ułóż zdanie z rozsypanych słów / przetłumacz zdanie** (składnia)
7. **Powiedz na głos** (produkcja mowy)

Aplikacja przesuwa pozycję w górę drabinki, gdy łatwiejsze ćwiczenie idzie dobrze. Po każdej odpowiedzi od razu pokazuje poprawną formę z nagraniem.

### 4. Bloki językowe (chunks), kolokacje, gotowe frazy

**Co mówią badania:** znaczną część naturalnej mowy tworzą gotowe zbitki wyrazowe. Uczniowie uczeni zauważania i zapamiętywania takich zbitek byli oceniani jako płynniej mówiący (Boers i in. 2006). Zbitki odciążają pamięć roboczą przy mówieniu.

**W aplikacji:**
- Typy pozycji: `słowo`, `kolokacja` (*„make an appointment”*), `zwrot` (*„Could you walk me through…”*), `idiom`, `zdanie`.
- Każde słowo ma **2–3 zdania przykładowe w różnych kontekstach**. Różnorodny kontekst utrwala znaczenie, a przy powtórkach aplikacja pokazuje inne zdanie niż ostatnio.
- W pakietach zawodowych przewaga zwrotów nad pojedynczymi słowami, bo tego potrzeba w rozmowie z pacjentem czy w mailu.

### 5. Najpierw to, co najczęstsze i najbardziej potrzebne

**Co mówią badania** (Nation 2006 i replikacje): żeby swobodnie rozumieć mowę, trzeba znać ok. 98% słów w wypowiedzi. To ok. **6–7 tys. rodzin wyrazowych** dla mowy i 8–9 tys. dla tekstu pisanego. Do 95% pokrycia mowy wystarcza ok. 3 tys. najczęstszych rodzin. Słownictwo specjalistyczne jest osobną warstwą.

**W aplikacji:**
- Każda pozycja ma poziom (A1–C1) i znacznik częstości.
- Pakiety tematyczne (praca, podróże, kolarstwo) budowane według zasady: najpierw to, co padnie w 80% rozmów, potem niuanse.
- Później dojdzie test poziomu słownictwa, żeby nie marnować czasu na rzeczy już znane.

### 6. Tematycznie — tak. Grupy znaczeniowe — ostrożnie

**Co mówią badania:** słowa bardzo podobne znaczeniowo (kolory, dni tygodnia, przeciwieństwa, synonimy) uczone razem jako nowe **przeszkadzają sobie nawzajem** (Tinkham 1993, 1997; Nakata i Suzuki 2019 — wyniki mieszane, ale ryzyko realne). Grupowanie tematyczne (*wakacje: wyspa, słonecznie, pływać, hotel*) takiego problemu nie powoduje.

**W aplikacji:**
- Pakiety tematyczne: tak.
- Pary łatwe do pomylenia (*lend/borrow, rent/hire, injury/wound*) mają znacznik `myli-sie-z`. Algorytm nie wprowadza ich jako nowe w tej samej sesji. Gdy obie są już znane, aplikacja daje ćwiczenie „rozróżnij”.

### 7. Słuchanie — wiele głosów i akcentów

**Co mówią badania:** trening percepcji z wieloma mówcami (HVPT) wyraźnie poprawia rozróżnianie dźwięków obcego języka (metaanaliza w *Studies in Second Language Acquisition*). Zmienność głosu pomaga też w zapamiętywaniu nowych słów (Barcroft i Sommers 2005).

**W aplikacji:**
- Zdania nagrywane w **2–3 głosach ElevenLabs** (kobiecy/męski, brytyjski/amerykański). Przy powtórkach głos się zmienia. Słówka nagrywamy w 1–2 głosach, żeby oszczędzać miejsce.
- Przycisk „wolniej” zmienia tempo odtwarzania w przeglądarce, bez generowania nowych plików.
- Krótkie dialogi i historyjki z nagraniem na poziomie ucznia (czyli zrozumiały materiał do słuchania), np. „rozmowa z pacjentem przed badaniem”, „zgubiony bagaż na lotnisku”.

### 8. Mówienie i wymowa

**Co mówią badania:** nauczanie wymowy działa, a efekt jest duży (Lee, Jang, Plonsky 2015: d = 0,89). Zastrzeżenie: większość badań mierzy akcent, a nie zrozumiałość. Przegląd systematyczny shadowingu (2025) wskazuje poprawę zrozumiałości, czytelności mowy i akcentu.

**W aplikacji:**
- **Shadowing:** nagranie → pauza → mówisz na głos → (opcjonalnie) nagrywasz siebie i porównujesz.
- **Sprawdzenie mowy:** ElevenLabs Scribe (już używany w prompterze) zamienia Twoją wypowiedź na tekst, a aplikacja porównuje go z oczekiwanym zdaniem. Celem jest zrozumiałość, a nie brytyjski akcent.
- **Ćwiczenie płynności:** szybkie odpowiadanie na głos na znane już frazy na czas. To budowanie automatyzmu, nie nauka nowego.

### 9. Gramatyka

**Co mówią badania:** jawne wyjaśnienie zasady daje większe efekty niż sama ekspozycja (Norris i Ortega 2000; Spada i Tomita 2010), zarówno dla prostych, jak i złożonych struktur. Zastrzeżenie: testy częściej mierzą wiedzę świadomą niż spontaniczne użycie. Dlatego reguła to akcelerator, a silnikiem jest praktyka. Gramatyka też korzysta z odstępów w czasie (Kim, Webb 2022).

**W aplikacji:**
- Mini-lekcja: **1 reguła, max 3 zdania wyjaśnienia po polsku, 3–5 przykładów z nagraniem**.
- Od razu ćwiczenia: wybór formy → uzupełnienie → przekształcenie zdania → przetłumaczenie z polskiego.
- Zdania gramatyczne trafiają do tych samych powtórek co słówka.
- Najpierw tematy, gdzie Polacy robią najwięcej błędów: przedimki *a/the*, czasy *Present Perfect vs Past Simple*, szyk pytań, *for/since*, przyimki.

### 10. Cztery filary nauki (Nation)

Paul Nation zaleca mniej więcej równy podział czasu na cztery rodzaje nauki:

| Filar | Co to jest | W aplikacji |
|---|---|---|
| Zrozumiały materiał | słuchanie/czytanie treści, które w ~98% rozumiesz | dialogi i historyjki z nagraniem |
| Mówienie i pisanie | samodzielne wypowiedzi | „powiedz na głos”, tłumaczenie zdań, własne zdanie ze słowem |
| Nauka form | słówka, gramatyka, wymowa | fiszki, drabinka ćwiczeń, mini-lekcje |
| Płynność | szybkie użycie tego, co już znasz | ćwiczenia na czas, shadowing |

Typowe aplikacje robią prawie wyłącznie „naukę form”. My celowo dokładamy pozostałe trzy.

### 11. Dzieci

**Co mówią badania:** u ośmiolatków słówka uczone z **obrazkami lub gestami** zostały w pamięci lepiej niż bez nich, nawet po kilku miesiącach (Andrä i in. 2020). U przedszkolaków słuchanie **historyjek** dało lepsze wyniki niż piosenki (Albaladejo i in. 2018). Łączenie obrazu i słowa wspiera pamięć (teoria podwójnego kodowania, Paivio).

**W aplikacji (profil dziecka):**
- Słowa z obrazkiem i nagraniem. Dla młodszych dzieci bez czytania: „dotknij obrazka, który słyszysz”.
- Gra w pary (obrazek ↔ nagranie), krótkie historyjki z obrazkami.
- Sesje 5–10 minut, duże przyciski, natychmiastowa pozytywna informacja zwrotna, bez karania za błędy.
- Prośba o gest („pokaż ręką *jump*”) jako element zabawy.

### 12. Nawyk, motywacja i grywalizacja (w stylu Duolingo)

**Co mówią badania:** grywalizacja w edukacji ma umiarkowany pozytywny wpływ na wyniki nauki, motywację i zaangażowanie (Sailer i Homner 2020, metaanaliza: g ≈ 0,49 dla wyników poznawczych). Działa wtedy, gdy nagradza rzeczywistą naukę, a nie samo klikanie. Codzienny nawyk wynika też wprost z efektu odstępów: 10–15 minut dziennie bije godzinę raz w tygodniu.

**W aplikacji:**
- **Punkty (XP):** za poprawne przypomnienie, więcej za trudniejsze ćwiczenia z drabinki (PL→EN, dyktando, mówienie) i za dokończone powtórki dnia. Nie za szybkość klikania ani za powtarzanie w kółko łatwych kart, żeby punkty nie dało się „nabić”.
- **Seria dni (streak)** z ogniem na ekranie głównym i **„zamrożeniem serii”** do zdobycia za XP. Jeden gorszy dzień nie kasuje miesięcy pracy.
- **Cel dzienny** do wyboru (np. 20 / 50 / 100 XP) i pasek postępu dnia.
- **Rodzinna liga tygodniowa:** ranking Ty kontra dzieci, z punktami ważonymi poziomem trudności, żeby młodsze dzieci miały szansę.
- **Odznaki i poziomy:** „100 zwrotów zawodowych”, „7 dni z rzędu”, „pierwsza rozmowa z pacjentem bez błędu”, pakiet ukończony w 100%.
- **Przypomnienia push** na iPhonie (działają w aplikacjach dodanych do ekranu początkowego od iOS 16.4): „Masz 18 powtórek, seria 12 dni 🔥”. Godzinę ustawia każdy profil osobno. Wysyłkę obsłuży zaplanowane zadanie w prywatnym repo (GitHub Actions), więc nie trzeba własnego serwera.
- **Postęp liczony w tym, co ważne:** „znasz 340 zwrotów zawodowych”, „rozumiesz 85% słów z pakietu Podróże”.
- **Bez zawstydzania:** komunikaty zachęcają, a nie straszą.
- Treści bliskie własnemu życiu (fizjoterapia, kolarstwo, Wasze wyjazdy) zapamiętuje się łatwiej, bo mają osobiste znaczenie.

---

## Czego unikamy

- **„Style uczenia się”** (wzrokowiec/słuchowiec): brak dowodów, nie projektujemy pod nie.
- **Wkuwanie wszystkiego naraz** przed wyjazdem: działa na chwilę, potem znika.
- **Samo czytanie list** bez przypominania.
- **Tylko rozpoznawanie** (EN→PL i wybór z listy): daje złudzenie, że umiesz, a w rozmowie słowo nie przychodzi.
- **Nagradzanie szybkości klikania** zamiast poprawnego przypomnienia.
- **Pojedyncze słowa bez kontekstu i nagrania.**

---

## Jak to przekłada się na budowę aplikacji

**Pozycja w pakiecie** (JSON):
`id`, `typ` (słowo/kolokacja/zwrot/idiom/zdanie/gramatyka), `en`, `pl`, `przyklady[]` (zdanie EN + PL, 2–3 szt.), `audio` (pliki w 1–3 głosach), `poziom`, `czestosc`, `tagi`, `myli_sie_z[]`, `obrazek` (dla dzieci), `notatka` (np. wymowa, różnica BrE/AmE).

**Sesja dnia:**
1. Powtórki z FSRS (wymieszane tematy i typy ćwiczeń).
2. Nowe pozycje (limit dzienny): prezentacja → od razu pierwsze przypomnienie.
3. Jeden dialog lub historyjka do słuchania.
4. Mówienie: shadowing albo „powiedz to po angielsku”.

**Stan nauki** każdej pozycji i kierunku jest osobny dla każdego profilu (Ty, dzieci) i synchronizowany do prywatnego repo.

---

## Źródła

- Kim, S. K., & Webb, S. (2022). The effects of spaced practice on second language learning: A meta-analysis. *Language Learning, 72*(1), 269–319. https://doi.org/10.1111/lang.12479
- Webb, S., Yanagisawa, A., & Uchihara, T. (2020). How effective are intentional vocabulary-learning activities? A meta-analysis. *The Modern Language Journal, 104*(4), 715–738. https://doi.org/10.1111/modl.12671
- Kang, S. H. K., Gollan, T. H., & Pashler, H. (2013). Don't just repeat after me: Retrieval practice is better than imitation for foreign vocabulary learning. *Psychonomic Bulletin & Review.*
- Improving second language vocabulary learning and retention by combining retrieval practice and spacing (2021). *Language Teaching Research.* https://journals.sagepub.com/doi/full/10.1177/13621688211053525
- Nakata, T., & Suzuki, Y. (2019). Effects of massing and spacing on the learning of semantically related and unrelated words. *Studies in Second Language Acquisition, 41*(2), 287–311.
- Tinkham, T. (1993). The effect of semantic clustering on the learning of second language vocabulary. *System, 21*(3), 371–380.
- Nation, I. S. P. (2006). How large a vocabulary is needed for reading and listening? *Canadian Modern Language Review, 63*(1). https://www.lextutor.ca/cover/papers/nation_2006.pdf
- Nation, I. S. P. (2007). The four strands. *Innovation in Language Learning and Teaching, 1*(1).
- Boers, F., Eyckmans, J., Kappel, J., Stengers, H., & Demecheleer, M. (2006). Formulaic sequences and perceived oral proficiency: Putting a Lexical Approach to the test. *Language Teaching Research, 10*(3).
- Lee, J., Jang, J., & Plonsky, L. (2015). The effectiveness of second language pronunciation instruction: A meta-analysis. *Applied Linguistics, 36*(3), 345–366.
- High variability phonetic training (HVPT): A meta-analysis of L2 perceptual training studies. *Studies in Second Language Acquisition.* https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/high-variability-phonetic-training-hvpt-a-metaanalysis-of-l2-perceptual-training-studies/6ABB8C1F32D88D53EA8D05A4565E76F6
- Barcroft, J., & Sommers, M. S. (2005). Effects of acoustic variability on second language vocabulary learning. *Studies in Second Language Acquisition, 27*(3).
- A systematic review of research on the use of shadowing for second language speech (2025). https://www.tandfonline.com/doi/full/10.1080/29984475.2025.2546827
- Norris, J. M., & Ortega, L. (2000). Effectiveness of L2 instruction: A research synthesis and quantitative meta-analysis. *Language Learning, 50*, 417–528.
- Spada, N., & Tomita, Y. (2010). Interactions between type of instruction and type of language feature: A meta-analysis. *Language Learning, 60*(2).
- Wisniewski, B., Zierer, K., & Hattie, J. (2020). The power of feedback revisited: A meta-analysis of educational feedback research. *Frontiers in Psychology, 10.*
- Andrä, C., Mathias, B., Schwager, A., Macedonia, M., & von Kriegstein, K. (2020). Learning foreign language vocabulary with gestures and pictures enhances vocabulary memory for several months post-learning in eight-year-old school children. *Educational Psychology Review, 32*. https://doi.org/10.1007/s10648-020-09527-z
- Sailer, M., & Homner, L. (2020). The gamification of learning: A meta-analysis. *Educational Psychology Review, 32*, 77–112. https://doi.org/10.1007/s10648-019-09498-w
- Albaladejo, S. A., Coyle, Y., & de Larios, J. R. (2018). Songs, stories, and vocabulary acquisition in preschool learners of English as a foreign language. *System, 76*, 116–128.
- Open Spaced Repetition — benchmark algorytmów powtórek (FSRS vs SM-2): https://expertium.github.io/Benchmark.html
