"""Düz harita için kabartmalı zemin görüntüsü üretir (Web Mercator).

Yükseklik: AWS Open Data "Terrain Tiles" (terrarium kodlaması; 3DEP, SRTM, GMTED, ETOPO1 türevi).
Kara/deniz ayrımı oyunun ülke sınırlarından (Natural Earth) yapılır; böylece kıyı çizgisi oyun mantığıyla aynıdır.
Renkler: denizde derinliğe göre lacivert tonları, karada yüksekliğe göre yeşil-zeytin tonları; çöller (oyunun arazi
bölgeleri) kum rengi, Grönland ve Antarktika buz rengi; üzerine kuzeybatıdan aydınlatılmış kabartma gölgesi.

Çıktılar:
  public/textures/relief-world.jpg  (z4, 4096x4096, enlem ±85.05)
  public/textures/relief-tr.webp    (z7, Türkiye ve çevresi; kenarları saydamlaşarak dünya görüntüsüne karışır)
  src/data/relief.json              (görüntülerin köşe koordinatları)

Kullanım: python3 scripts/build_relief.py [önbellek_klasörü]
"""
import io, json, math, os, sys, urllib.request, concurrent.futures as cf
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, ".relief-cache")
URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
os.makedirs(CACHE, exist_ok=True)


def tile(z, x, y):
    p = os.path.join(CACHE, f"{z}-{x}-{y}.png")
    if not os.path.exists(p):
        with urllib.request.urlopen(URL.format(z=z, x=x, y=y), timeout=60) as r:
            open(p, "wb").write(r.read())
    a = np.asarray(Image.open(p).convert("RGB"), dtype=np.float32)
    return a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768


def mosaic(z, x0, x1, y0, y1):
    jobs = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]
    with cf.ThreadPoolExecutor(8) as ex:
        res = dict(zip(jobs, ex.map(lambda t: tile(z, *t), jobs)))
    rows = [np.concatenate([res[(x, y)] for x in range(x0, x1 + 1)], axis=1) for y in range(y0, y1 + 1)]
    return np.concatenate(rows, axis=0)


def merc_xy(lon, lat, z):
    n = 256 * 2 ** z
    lat = max(-85.0511, min(85.0511, lat))
    s = math.sin(math.radians(lat))
    return (lon + 180) / 360 * n, (0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)) * n


def tile_lon(x, z): return x / 2 ** z * 360 - 180
def tile_lat(y, z): return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / 2 ** z))))


def rasterize(polys, z, ox, oy, w, h):
    """Çokgenleri (lon, lat halkaları) Mercator piksel ızgarasına çizer; delikler oyulur."""
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    for poly in polys:
        for k, ring in enumerate(poly):
            pts = [merc_xy(lon, lat, z) for lon, lat in ring]
            pts = [(px - ox, py - oy) for px, py in pts]
            if len(pts) >= 3:
                d.polygon(pts, fill=0 if k else 255)
    return np.asarray(m, dtype=np.float32) / 255


def ramp(v, stops):
    xs = np.array([s[0] for s in stops], dtype=np.float32)
    out = np.zeros(v.shape + (3,), dtype=np.float32)
    for c in range(3):
        out[..., c] = np.interp(v, xs, [s[1][c] for s in stops])
    return out


LAND = [(0, (64, 116, 84)), (400, (72, 120, 82)), (1200, (96, 122, 86)), (2500, (128, 132, 110)), (4500, (190, 192, 186))]
SEA = [(-7000, (8, 21, 64)), (-3500, (11, 29, 82)), (-1000, (16, 39, 100)), (-150, (22, 52, 122)), (0, (30, 64, 138))]
SAND, ICE = np.array([190, 174, 132], np.float32), np.array([222, 230, 238], np.float32)


def render(z, x0, x1, y0, y1, countries, deserts, ice):
    elev = mosaic(z, x0, x1, y0, y1)
    h, w = elev.shape
    ox, oy = x0 * 256, y0 * 256
    land = rasterize(countries, z, ox, oy, w, h)
    land = np.asarray(Image.fromarray((land * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)), np.float32) / 255
    blur = 10 * 2 ** (z - 4)  # çöl sınırları kaba çizildiği için geniş yumuşatılır
    des = np.asarray(Image.fromarray((rasterize(deserts, z, ox, oy, w, h) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(blur)), np.float32) / 255
    icem = rasterize(ice, z, ox, oy, w, h)
    # piksel başına yer mesafesi (m): Mercator ölçeği enlemle değişir
    lat = np.array([tile_lat(y0 + (r + 0.5) / 256, z) for r in range(h)], np.float32)
    mpp = (40075016 * np.cos(np.radians(lat)) / (256 * 2 ** z))[:, None]
    gy, gx = np.gradient(elev)
    def shade(ex):
        dx, dy = gx * ex / mpp, gy * ex / mpp
        # standart kabartma gölgesi (ESRI): ışık kuzeybatıdan (315°), 45° yükseklikten; görüntüde satırlar güneye artar
        slope = np.arctan(np.hypot(dx, dy)); asp = np.arctan2(-dy, -dx)
        zen, az = math.radians(45), math.radians((360 - 315 + 90) % 360)
        s = math.cos(zen) * np.cos(slope) + math.sin(zen) * np.sin(slope) * np.cos(az - asp)
        return np.clip(s, 0, 1)
    exl, exs = (14, 6) if z <= 4 else (5, 3)
    sl, ss = shade(exl), shade(exs)
    lc = ramp(np.maximum(elev, 0), LAND)
    lc = lc * (1 - des[..., None] * 0.6) + SAND * des[..., None] * 0.6
    lc = lc * (1 - icem[..., None]) + ICE * icem[..., None]
    lc *= (0.62 + 0.55 * sl)[..., None]
    sc = ramp(np.minimum(elev, 0), SEA) * (0.8 + 0.3 * ss)[..., None]
    img = lc * land[..., None] + sc * (1 - land[..., None])
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)), [tile_lon(x0, z), tile_lat(y1 + 1, z), tile_lon(x1 + 1, z), tile_lat(y0, z)]


def main():
    cj = json.load(open(os.path.join(ROOT, "src/data/countries.json")))
    countries = [f["geometry"]["coordinates"] for f in cj["features"]]
    countries = [p for polys in countries for p in polys]
    ice = [p for f in cj["features"] if f["properties"]["a3"] in ("GRL", "ATA") for p in f["geometry"]["coordinates"]]
    terrain = json.load(open(os.path.join(ROOT, "src/data/terrain.json")))
    deserts = [p for t in terrain if t["t"] == "d" for p in t["p"]]
    meta = {}
    img, b = render(4, 0, 15, 0, 15, countries, deserts, ice)
    img.save(os.path.join(ROOT, "public/textures/relief-world.jpg"), quality=84, optimize=True, progressive=True)
    meta["world"] = b
    img, b = render(7, 72, 80, 46, 51, countries, deserts, ice)
    # kenarlarda 160 piksellik yumuşak geçiş (alfa), böylece dünya görüntüsüyle sınır görünmez
    w, h = img.size; f = 160
    ax = np.minimum(np.arange(w), np.arange(w)[::-1]) / f; ay = np.minimum(np.arange(h), np.arange(h)[::-1]) / f
    a = np.clip(np.minimum(ay[:, None], ax[None, :]), 0, 1); a = a * a * (3 - 2 * a)
    img.putalpha(Image.fromarray((a * 255).astype(np.uint8)))
    img.save(os.path.join(ROOT, "public/textures/relief-tr.webp"), quality=82, method=6)
    meta["tr"] = b
    meta["source"] = "AWS Open Data Terrain Tiles (terrarium), Natural Earth"
    json.dump(meta, open(os.path.join(ROOT, "src/data/relief.json"), "w"), indent=1)
    print(meta)


if __name__ == "__main__":
    main()
