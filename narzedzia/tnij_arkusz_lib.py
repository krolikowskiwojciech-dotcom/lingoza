# Tnie arkusz z przezroczystym tłem (siatka kolumny×wiersze) na osobne, wykadrowane kwadratowe PNG.
import numpy as np
from PIL import Image
from scipy import ndimage

def tnij(sciezka, kolumny, wiersze, nazwy, katalog, rozmiar=256, margines=0.06, krawedz=0.18, min_udzial=0.04):
    img = Image.open(sciezka).convert('RGBA')
    W, H = img.size
    for i, nazwa in enumerate(nazwy):
        if not nazwa: continue
        c, r = i % kolumny, i // kolumny
        k = img.crop((int(c * W / kolumny), int(r * H / wiersze), int((c + 1) * W / kolumny), int((r + 1) * H / wiersze)))
        al = np.asarray(k)[..., 3]
        # największe skupisko (obiekt) + to, co blisko niego; pomija okruchy z sąsiednich komórek
        maska = al > 110  # bez półprzezroczystych cieni, które łączą okruchy z obiektem
        # skupiska blisko siebie łączymy, potem odrzucamy małe okruchy i te przy krawędzi komórki (sąsiedzi)
        lab, n = ndimage.label(ndimage.binary_dilation(maska, iterations=6))
        if n == 0: continue
        rozm = ndimage.sum(maska, lab, range(1, n + 1))
        hh, ww = al.shape
        glowny = np.zeros_like(maska)
        for j in range(n):
            if rozm[j] < min_udzial * rozm.max(): continue
            yy, xx = np.where(lab == j + 1)
            cy, cx = yy.mean() / hh, xx.mean() / ww
            if rozm[j] < 0.5 * rozm.max() and not (krawedz < cy < 1 - krawedz and krawedz < cx < 1 - krawedz): continue
            glowny |= lab == j + 1
        ys, xs = np.where(glowny & maska)
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        # cień pod obiektem zostaje, ale tylko w ramce obiektu (+ trochę w dół)
        dx, dy = int(0.04 * (x1 - x0)), int(0.07 * (y1 - y0))
        x0, x1, y0, y1 = max(0, x0 - dx), min(ww - 1, x1 + dx), max(0, y0 - 2), min(hh - 1, y1 + dy)
        tab = np.asarray(k).copy()
        poza = np.ones(al.shape, bool); poza[y0:y1 + 1, x0:x1 + 1] = False
        okruchy = (al > 110) & ~glowny
        tab[poza | okruchy] = 0
        k = Image.fromarray(tab, 'RGBA').crop((x0, y0, x1 + 1, y1 + 1))
        s = int(max(k.width, k.height) * (1 + 2 * margines))
        kw = Image.new('RGBA', (s, s), (0, 0, 0, 0)); kw.paste(k, ((s - k.width) // 2, (s - k.height) // 2))
        kw.resize((rozmiar, rozmiar), Image.LANCZOS).save(f'{katalog}/{nazwa}.png', optimize=True)
        print(nazwa, k.size)


def tnij_ksztalty(sciezka, nazwy, katalog, rozmiar=256, margines=0.03, prog=110, min_udzial=0.01):
    # Dla arkuszy, gdzie elementy stoją ciasno (koła odznak, awatary): każdy element = osobny spójny kształt.
    # Kolejność: wierszami (od góry), w wierszu od lewej.
    img = Image.open(sciezka).convert('RGBA')
    tab = np.asarray(img)
    al = tab[..., 3]
    maska = ndimage.binary_opening(al > prog, iterations=2)
    lab, n = ndimage.label(maska)
    rozm = ndimage.sum(maska, lab, range(1, n + 1))
    elementy = []
    obiekty = ndimage.find_objects(lab)
    for j in range(n):
        if rozm[j] < min_udzial * maska.size: continue
        elementy.append((obiekty[j], j + 1))
    # grupowanie w wiersze po środku y
    elementy.sort(key=lambda e: (e[0][0].start + e[0][0].stop) / 2)
    wiersze, akt = [], []
    for e in elementy:
        cy = (e[0][0].start + e[0][0].stop) / 2
        if akt and cy - (akt[-1][0][0].start + akt[-1][0][0].stop) / 2 > 0.5 * (e[0][0].stop - e[0][0].start):
            wiersze.append(akt); akt = []
        akt.append(e)
    if akt: wiersze.append(akt)
    kolejne = [e for w in wiersze for e in sorted(w, key=lambda e: e[0][1].start)]
    for nazwa, (sl, nr) in zip(nazwy, kolejne):
        if not nazwa: continue
        ys, xs = sl
        h, w = ys.stop - ys.start, xs.stop - xs.start
        dy, dx = int(0.06 * h), int(0.03 * w)
        y0, y1 = max(0, ys.start - dx), min(al.shape[0], ys.stop + dy)
        x0, x1 = max(0, xs.start - dx), min(al.shape[1], xs.stop + dx)
        wyc = tab[y0:y1, x0:x1].copy()
        inne = (lab[y0:y1, x0:x1] > 0) & (lab[y0:y1, x0:x1] != nr)
        inne = ndimage.binary_dilation(inne, iterations=3)
        wyc[inne] = 0
        k = Image.fromarray(wyc, 'RGBA')
        s = int(max(k.width, k.height) * (1 + 2 * margines))
        kw = Image.new('RGBA', (s, s), (0, 0, 0, 0)); kw.paste(k, ((s - k.width) // 2, (s - k.height) // 2))
        kw.resize((rozmiar, rozmiar), Image.LANCZOS).save(f'{katalog}/{nazwa}.png', optimize=True)
    print(sciezka.split('/')[-1], 'elementów:', len(kolejne), 'nazw:', len([x for x in nazwy if x]))
