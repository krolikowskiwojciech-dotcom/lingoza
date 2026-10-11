# Tnie arkusz grafik z ChatGPT (przezroczyste tło, siatka kolumny×wiersze) na osobne, wykadrowane kwadratowe PNG 256 px.
# Wymaga Pillow, numpy i scipy (najprościej w venv w scratchpadzie sesji). Potem konwersja: cwebp -q 88 -alpha_q 100 x.png -o x.webp
# Użycie: python tnij_arkusz.py <arkusz.webp> <kolumny> <wiersze> <katalog_wyjsciowy> nazwa1,nazwa2,…  (pusta nazwa = pomiń komórkę)
import numpy as np
from PIL import Image
from scipy import ndimage

def tnij(sciezka, kolumny, wiersze, nazwy, katalog, rozmiar=256, margines=0.06):
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
            if rozm[j] < 0.04 * rozm.max(): continue
            yy, xx = np.where(lab == j + 1)
            cy, cx = yy.mean() / hh, xx.mean() / ww
            if rozm[j] < 0.5 * rozm.max() and not (0.18 < cy < 0.82 and 0.18 < cx < 0.82): continue
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


if __name__ == '__main__':
    import sys
    arkusz, kol, wie, kat, nazwy = sys.argv[1:6]
    tnij(arkusz, int(kol), int(wie), nazwy.split(','), kat)
