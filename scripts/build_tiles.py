"""Eşdikdörtgen (equirectangular) uydu mozaiğinden Web Mercator XYZ karoları üretir.

Varsayılan kaynak: NASA Blue Marble (kamu malı), three-globe npm paketindeki
example/img/earth-blue-marble.jpg (4096x2048) kopyası.
Kullanım: python3 scripts/build_tiles.py KAYNAK.jpg public/tiles --maxzoom 4
Gerekli: pip install pillow numpy
"""
import argparse, math, os
import numpy as np
from PIL import Image

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("src"); ap.add_argument("out")
    ap.add_argument("--maxzoom", type=int, default=4); ap.add_argument("--quality", type=int, default=80)
    a = ap.parse_args()
    img = np.asarray(Image.open(a.src).convert("RGB")).astype(np.float32); H, W, _ = img.shape
    def sample(lon, lat):  # çift doğrusal örnekleme
        x = (lon + 180) / 360 * W - 0.5; y = (90 - lat) / 180 * H - 0.5
        x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); fx = (x - x0)[..., None]; fy = (y - y0)[..., None]
        x0m, x1m = x0 % W, (x0 + 1) % W; y0c, y1c = np.clip(y0, 0, H - 1), np.clip(y0 + 1, 0, H - 1)
        top = img[y0c, x0m] * (1 - fx) + img[y0c, x1m] * fx; bot = img[y1c, x0m] * (1 - fx) + img[y1c, x1m] * fx
        return top * (1 - fy) + bot * fy
    total = 0
    for z in range(a.maxzoom + 1):
        n = 2 ** z
        for tx in range(n):
            for ty in range(n):
                px = (np.arange(256) + 0.5) / 256
                X, Y = np.meshgrid((tx + px) / n, (ty + px) / n)
                lon = X * 360 - 180; lat = np.degrees(np.arctan(np.sinh(math.pi * (1 - 2 * Y))))
                tile = Image.fromarray(np.clip(sample(lon, lat), 0, 255).astype(np.uint8))
                d = os.path.join(a.out, str(z), str(tx)); os.makedirs(d, exist_ok=True)
                f = os.path.join(d, f"{ty}.jpg"); tile.save(f, quality=a.quality, optimize=True, progressive=True); total += os.path.getsize(f)
    print("karo boyutu toplam", total // 1024, "KB")

if __name__ == "__main__": main()
