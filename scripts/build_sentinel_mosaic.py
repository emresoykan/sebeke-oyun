"""Türkiye ve çevresi için Sentinel-2 L2A bulutsuz mozaiği üretir (public/textures/tr-*.jpg).

Kaynak: Copernicus Sentinel-2 L2A, AWS Open Data "sentinel-cogs" (Element 84). Copernicus verisi
kaynak gösterilerek ticari dahil serbestçe kullanılabilir: "Contains modified Copernicus Sentinel data <yıl>".

Yöntem:
  1. Kapsam kutusundaki her MGRS karosu (110 km) için seçilen aylardaki sahnelerin bulut ve
     boş piksel oranları okunur; karo başına en iyi birkaç sahne seçilir.
  2. Her sahnenin renkli görüntüsü (TCI) küçültülmüş katmanından okunur; SCL sınıflandırmasıyla
     bulut, bulut gölgesi ve boş pikseller ayıklanır.
  3. Sahneler en iyiden kötüye coğrafi (lon/lat) tuvale yansıtılır; her piksel ilk geçerli değeri alır.
     Her sahnenin geniş ölçekli (~8 km) rengi Blue Marble'a eşlenir; karo sınırlarındaki ton farkı kaybolur,
     ince ayrıntı Sentinel'den gelir. Tabana göre çok koyu pikseller (sahne kenarı kamaları) atılır.
  4. Kalan boşluklar NASA Blue Marble ile doldurulur, geçişler ve tuval kenarı yumuşatılır; tuval iki parçaya bölünür
     (mobil GPU doku sınırı için her parça 4096 pikselden dar).

Kullanım: pip install rasterio mgrs pillow numpy
          python3 scripts/build_sentinel_mosaic.py --bluemarble public/textures/earth-day.jpg
"""
import argparse, json, os, re, ssl, urllib.request
from concurrent.futures import ThreadPoolExecutor

import mgrs
import numpy as np
import rasterio
from PIL import Image, ImageFilter
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject

BUCKET = "https://sentinel-cogs.s3.us-west-2.amazonaws.com/"
ROOT = "sentinel-s2-l2a-cogs/"
BAD_SCL = {0, 1, 3, 8, 9, 10}  # boş, doygun, bulut gölgesi, orta/yüksek bulut, ince sirrus

ctx = ssl.create_default_context(cafile=os.environ.get("CURL_CA_BUNDLE") or None)
def get(url): return urllib.request.urlopen(url, context=ctx, timeout=60).read()
def prefixes(p):
    return re.findall(r"<Prefix>([^<]*)</Prefix>", get(f"{BUCKET}?list-type=2&prefix={p}&delimiter=/").decode())[1:]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bbox", default="25.6,35.7,45.0,42.3", help="batı,güney,doğu,kuzey (derece)")
    ap.add_argument("--res", type=float, default=0.0035, help="derece/piksel (~0,0035 ≈ 300-390 m)")
    ap.add_argument("--months", default="2025-6,2025-7,2024-6,2024-7")
    ap.add_argument("--zones", default="35,36,37,38")
    ap.add_argument("--bands", default="S,T")
    ap.add_argument("--per-tile", type=int, default=3)
    ap.add_argument("--bluemarble", required=True)
    ap.add_argument("--out", default="public/textures")
    ap.add_argument("--parts", type=int, default=2)
    ap.add_argument("--meta", default="src/data/tr-mosaic.json")
    ap.add_argument("--cache", default=None, help="seçilen sahne listesini bu dosyada sakla/yeniden kullan")
    ap.add_argument("--stash", default=None, help="yansıtılmış ara sonucu (.npz) sakla/yeniden kullan; birleştirme ayarı denerken indirmeyi atlar")
    a = ap.parse_args()
    W_, S_, E_, N_ = map(float, a.bbox.split(","))
    months = [tuple(map(int, m.split("-"))) for m in a.months.split(",")]
    conv = mgrs.MGRS()

    # 1) kapsamdaki MGRS karoları
    tiles = []
    for z in a.zones.split(","):
        for b in a.bands.split(","):
            for p in prefixes(f"{ROOT}{z}/{b}/"):
                sq = p.rstrip("/").split("/")[-1]
                lat, lon = conv.toLatLon(f"{z}{b}{sq}5000050000")
                if W_ - 0.7 <= lon <= E_ + 0.7 and S_ - 0.7 <= lat <= N_ + 0.7: tiles.append(p)
    print("karo:", len(tiles))

    # 2) sahne metadata'sı ve seçim
    def scenes(tp):
        out = []
        for y, m in months:
            try: ss = prefixes(f"{tp}{y}/{m}/")
            except Exception: continue
            for s in ss:
                name = s.rstrip("/").split("/")[-1]
                try:
                    pr = json.loads(get(f"{BUCKET}{s}{name}.json"))["properties"]
                    out.append((pr.get("eo:cloud_cover", 100) + pr.get("s2:nodata_pixel_percentage", 100) / 8 + months.index((y, m)) * 0.6, s, name))
                except Exception: pass
        out.sort(); return out[:a.per_tile]
    if a.cache and os.path.exists(a.cache): picked = [tuple(x) for x in json.load(open(a.cache))]
    else:
        with ThreadPoolExecutor(16) as ex: picked = [s for lst in ex.map(scenes, tiles) for s in lst]
        picked.sort()
        if a.cache: json.dump(picked, open(a.cache, "w"))
    print("sahne:", len(picked))

    def read(item):
        _, s, name = item; n = 343  # 10980/32 ≈ 320 m piksel
        with rasterio.open(f"/vsicurl/{BUCKET}{s}TCI.tif") as src:
            tci = src.read(out_shape=(3, n, n), resampling=Resampling.average)
            tr = src.transform * src.transform.scale(src.width / n, src.height / n); crs = src.crs
        with rasterio.open(f"/vsicurl/{BUCKET}{s}SCL.tif") as src:
            scl = src.read(1, out_shape=(n, n), resampling=Resampling.nearest)
        ok = (tci.min(0) > 2) & ~np.isin(scl, list(BAD_SCL))
        for _ in range(2):  # sahne kenarındaki boş piksellerle karışmış koyu kenarları at
            ok[1:] &= ok[:-1]; ok[:-1] &= ok[1:]; ok[:, 1:] &= ok[:, :-1]; ok[:, :-1] &= ok[:, 1:]
        cls = np.where(ok, np.where(scl == 6, 2, 1), 0).astype(np.uint8)  # 0 geçersiz, 1 kara, 2 su
        return tci, cls, tr, crs

    # 3) Blue Marble taban: boşlukları doldurur ve her sahnenin parlaklığını dengelemek için tutarlı bir referans verir
    Wpx, Hpx = int(round((E_ - W_) / a.res)), int(round((N_ - S_) / a.res))
    dst_tr = from_origin(W_, N_, a.res, a.res)
    bm = Image.open(a.bluemarble).convert("RGB"); bw, bh = bm.size
    box = ((W_ + 180) / 360 * bw, (90 - N_) / 180 * bh, (E_ + 180) / 360 * bw, (90 - S_) / 180 * bh)
    base = np.asarray(bm.resize((Wpx, Hpx), Image.BICUBIC, box=box), np.float32)

    lum = lambda x: x[..., 0] * 0.3 + x[..., 1] * 0.59 + x[..., 2] * 0.11
    # Blue Marble'da su gibi görünen pikseller (kıyıda kara/deniz karışımı) renk eşlemesinde kullanılmaz
    bmland = ~(base[..., 2] > base[..., 0] + 8)
    K = 24  # ~8 km blok: sahnenin geniş ölçekli rengi Blue Marble'a eşlenir, ince ayrıntı Sentinel'de kalır
    Hb, Wb = -(-Hpx // K), -(-Wpx // K)
    def blocks(x):  # (H,W[,C]) -> blok toplamları
        pad = [(0, Hb * K - Hpx), (0, Wb * K - Wpx)] + [(0, 0)] * (x.ndim - 2)
        x = np.pad(x, pad); return x.reshape(Hb, K, Wb, K, *x.shape[2:]).sum((1, 3))
    def up(x):  # blok ızgarasını tuval boyutuna yumuşak büyüt
        return np.asarray(Image.fromarray(x.astype(np.float32), "F").resize((Wb * K, Hb * K), Image.BILINEAR))[:Hpx, :Wpx]
    def lowmatch(im, put):
        m = (put & bmland).astype(np.float32); n = blocks(m)
        if n.sum() < 50: m = put.astype(np.float32); n = blocks(m)
        gb = np.clip(base[put].mean(0) / np.maximum(1, im[put].mean(0)), 0.8, 2.6)
        r = np.empty((Hb, Wb, 3), np.float32)
        for c in range(3):
            num, den = blocks(base[..., c] * m), blocks(im[..., c] * m)
            r[..., c] = np.where(n > K * K / 6, np.clip(num / np.maximum(1, den), 0.6, 2.6), gb[c])
        r **= 0.8
        return np.stack([up(r[..., c]) for c in range(3)], -1)[put]

    # 4) sahneleri en iyiden kötüye tuvale yansıt; kara pikselleri Sentinel'den, su pikselleri tek tip denizden
    land = np.zeros((Hpx, Wpx, 3), np.float32); filled = np.zeros((Hpx, Wpx), bool); water = np.zeros((Hpx, Wpx), bool)
    if a.stash and os.path.exists(a.stash):
        z = np.load(a.stash); land, filled, water = z['land'], z['filled'], z['water']
    else:
        with ThreadPoolExecutor(8) as ex:
            for i, (tci, cls, tr, crs) in enumerate(ex.map(read, picked)):
                img = np.zeros((3, Hpx, Wpx), np.uint8); m = np.zeros((Hpx, Wpx), np.uint8)
                reproject(tci, img, src_transform=tr, src_crs=crs, dst_transform=dst_tr, dst_crs="EPSG:4326", resampling=Resampling.bilinear)
                reproject(cls, m, src_transform=tr, src_crs=crs, dst_transform=dst_tr, dst_crs="EPSG:4326", resampling=Resampling.nearest)
                put = (m == 1) & ~filled & ~water; wput = (m == 2) & ~filled & ~water
                if put.sum() > 200:
                    im = np.moveaxis(img, 0, 2).astype(np.float32)
                    g0 = np.clip(base[put].mean(0) / np.maximum(1, im[put].mean(0)), 0.8, 2.6) ** 0.85
                    # sahne kenarındaki koyu kamalar ve kalan gölgeler: tabana göre çok koyu pikselleri at
                    put &= ~((lum(im * g0) < 0.35 * lum(base)) & (lum(base) > 25))
                    put &= ~(~bmland & (lum(im) < 25))  # Blue Marble'da su olan yerde "kara" sayılan koyu kenar pikselleri
                    land[put] = np.clip(im[put] * lowmatch(im, put), 0, 255)
                filled |= put; water |= wput
                if i % 50 == 0: print(f"  {i+1}/{len(picked)} kara %{100*filled.mean():.1f} su %{100*water.mean():.1f}")
        if a.stash: np.savez(a.stash, land=land, filled=filled, water=water)

    # 5) birleştir: kara Sentinel, su derin deniz rengi (Blue Marble'ın derinlik tonuyla), kalan boşluk Blue Marble
    # sahne aralarında kalan su boşlukları; Blue Marble'da göller (ör. Van) neredeyse siyah olduğu için koyuluk da su sayılır
    water |= ~filled & (~bmland | (lum(base) < 20))
    sea = np.median(base[water], axis=0) if water.any() else np.array([12, 34, 70], np.float32)
    seaimg = 0.6 * sea + 0.4 * base
    land = np.clip(255 * (land / 255) ** 0.92, 0, 255)
    mk = lambda b, r: (np.asarray(Image.fromarray((b * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(r)), np.float32) / 255)[..., None]
    ml, mw = mk(filled, 2), mk(water, 3)
    # tuval kenarında Blue Marble'a yumuşak geçiş (sert çizgi olmasın)
    yy, xx = np.mgrid[0:Hpx, 0:Wpx]
    edge = np.clip(np.minimum.reduce([xx, Wpx - 1 - xx, yy, Hpx - 1 - yy]) / 140, 0, 1)[..., None] ** 1.5
    ml, mw = ml * edge, mw * edge
    out = base * (1 - mw) + seaimg * mw
    out = (out * (1 - ml) + land * ml).astype(np.uint8)
    os.makedirs(a.out, exist_ok=True)
    edges = np.linspace(0, Wpx, a.parts + 1).round().astype(int); meta = []
    for k in range(a.parts):
        x0, x1 = edges[k], edges[k + 1]; f = os.path.join(a.out, f"tr-{k}.jpg")
        Image.fromarray(out[:, x0:x1]).save(f, quality=86, optimize=True, progressive=True)
        meta.append({"file": f"tr-{k}.jpg", "west": W_ + x0 * a.res, "east": W_ + x1 * a.res, "south": S_, "north": N_})
        print(f, os.path.getsize(f) // 1024, "KB", x1 - x0, "x", Hpx)
    json.dump({"source": "Contains modified Copernicus Sentinel data", "years": sorted({m[0] for m in months}), "parts": meta},
              open(a.meta, "w"), indent=1)

if __name__ == "__main__": main()
