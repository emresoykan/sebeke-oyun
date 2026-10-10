"""Türkiye için ayrıntılı kabartma karoları (çevrimdışı ve önizleme derlemesi için).

Canlı site yakınlaşınca yükseklik verisini doğrudan AWS Terrain Tiles'tan çeker. Dış sunucuya erişemeyen ortamlarda
(ör. önizleme) yakın planda yalnızca gömülü z7 görüntüsü kalır ve bulanık görünür. Bu betik Türkiye ve çevresi için
z10 çözünürlüğünde (~120 m/piksel) aynı renk skalasıyla kabartma üretir ve 512 piksellik karolara (z5–z9) böler.

Karolar az sayıda paket dosyasında toplanır (paket başına çok sayıda karo; sunucuda dosya sayısı sınırlı olabilir):
  public/relief-hd/lo.json            z5–z7 karoları
  public/relief-hd/{z}-{X6}-{Y6}.json  z8–z9 karoları, z6 hücresine göre
Biçim: {"z/x/y": "<base64 webp>", ...}. Bu klasör depoya eklenmez (.gitignore); `npm run build:preview` öncesi üretilir.

Kullanım: python3 scripts/build_relief_hd.py [önbellek_klasörü]
"""
import base64, io, json, os, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_relief import ROOT, mosaic, ramp, tile_lat, LAND, SEA, shade_fn  # noqa: E402

OUT = os.path.join(ROOT, "public/relief-hd")
DZ = 10                      # yükseklik verisinin yakınlığı (256 piksellik karo)
TZ = DZ - 1                  # en ayrıntılı çıktı karosu (512 piksel)
X0, X1, Y0, Y1 = 583, 640, 378, 404   # veri alınan alan (z10 karo indisleri): ~25,0–45,4 D, ~35,5–42,5 K
AX0, AY0 = 576, 368                   # çıktı ızgarasının z6 hücresine hizalı başlangıcı
AX1, AY1 = 640, 416
FEATHER = 384                         # kenarda yumuşak geçiş (piksel)


def box(a, r):
    """(2r+1)² pencerede ortalama (birikimli toplamla)."""
    c = np.pad(a, r + 1, mode="edge").cumsum(0).cumsum(1)
    n = 2 * r + 1
    return (c[n:, n:] - c[:-n, n:] - c[n:, :-n] + c[:-n, :-n])[:a.shape[0], :a.shape[1]] / n / n


def lakes(elev):
    """Göller: yükseklik verisinde su yüzeyi tamamen düzdür (eğim 0). 7x7 pencerenin çoğu düzse göl sayılır;
    kenarlar bir kez genişletilip yumuşatılır."""
    gy, gx = np.gradient(elev)
    flat = ((gx == 0) & (gy == 0) & (elev > 0)).astype(np.float32)
    core = (box(flat, 3) > 0.8).astype(np.float32)
    return np.clip(box(core, 2) * 2.5, 0, 1) * flat.clip(0.6, 1)


def render():
    elev = mosaic(DZ, X0, X1, Y0, Y1)
    h, w = elev.shape
    lat = np.array([tile_lat(Y0 + (r + 0.5) / 256, DZ) for r in range(h)], np.float32)
    mpp = (40075016 * np.cos(np.radians(lat)) / (256 * 2 ** DZ))[:, None].astype(np.float32)
    shade = shade_fn(elev, mpp)
    land = np.clip(elev / 2 + 0.5, 0, 1)   # kıyı çizgisi yükseklik verisinden
    land = (land * (1 - lakes(elev)))[..., None]
    lc = ramp(np.maximum(elev, 0), LAND).astype(np.float32)
    lc *= (0.62 + 0.55 * shade(2.2))[..., None]
    sc = ramp(np.minimum(elev, 0), SEA).astype(np.float32) * (0.8 + 0.3 * shade(1.5))[..., None]
    rgb = np.clip(lc * land + sc * (1 - land), 0, 255).astype(np.uint8)
    ax = np.minimum(np.arange(w), np.arange(w)[::-1]) / FEATHER
    ay = np.minimum(np.arange(h), np.arange(h)[::-1]) / FEATHER
    a = np.clip(np.minimum(ay[:, None], ax[None, :]), 0, 1); a = a * a * (3 - 2 * a)
    img = Image.fromarray(np.dstack([rgb, (a * 255).astype(np.uint8)]), "RGBA")
    canvas = Image.new("RGBA", ((AX1 - AX0) * 256, (AY1 - AY0) * 256), (0, 0, 0, 0))
    canvas.paste(img, ((X0 - AX0) * 256, (Y0 - AY0) * 256))
    return canvas


def main():
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        os.remove(os.path.join(OUT, f))
    canvas = render()
    packs, n, size = {}, 0, 0
    for z in range(TZ, 4, -1):
        if z < TZ:
            canvas = canvas.resize((canvas.width // 2, canvas.height // 2), Image.LANCZOS)
        k = 2 ** (TZ - z)
        tx0, ty0 = AX0 // 2 // k, AY0 // 2 // k
        for ty in range(canvas.height // 512):
            for tx in range(canvas.width // 512):
                t = canvas.crop((tx * 512, ty * 512, tx * 512 + 512, ty * 512 + 512))
                al = np.asarray(t)[..., 3]
                if al.max() == 0:
                    continue
                if al.min() == 255:
                    t = t.convert("RGB")
                b = io.BytesIO(); t.save(b, "WEBP", quality=74, method=6); b = b.getvalue()
                X, Y = tx0 + tx, ty0 + ty
                key = "lo" if z <= 7 else f"{z}-{X >> (z - 6)}-{Y >> (z - 6)}"
                packs.setdefault(key, {})[f"{z}/{X}/{Y}"] = base64.b64encode(b).decode()
                n += 1; size += len(b)
    for key, tiles in packs.items():
        json.dump(tiles, open(os.path.join(OUT, key + ".json"), "w"), separators=(",", ":"))
    bounds = [X0 / 2 ** DZ * 360 - 180, tile_lat(Y1 + 1, DZ), (X1 + 1) / 2 ** DZ * 360 - 180, tile_lat(Y0, DZ)]
    json.dump({"bounds": bounds, "minzoom": 5, "maxzoom": TZ, "packs": sorted(packs)}, open(os.path.join(OUT, "index.json"), "w"))
    print(f"{n} karo, {len(packs)} paket, {size / 1e6:.1f} MB webp, sınır {bounds}")


if __name__ == "__main__":
    main()
