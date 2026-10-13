#!/usr/bin/env python3
"""Güneş ve rüzgâr kaynak ızgarası: NASA POWER uzun dönem ortalamalarından src/data/resource.js üretir.

Kaynak: NASA POWER Projesi, Analysis Ready Data (AWS Open Data, s3://nasa-power, us-west-2), lisans CC BY 4.0.
  - Güneş: ALLSKY_SFC_SW_DWN (yatay düzleme gelen toplam ışınım, W/m²), CERES SYN1deg, 1°×1°, yıllık ortalama
  - Rüzgâr: WS50M (50 m'de rüzgâr hızı, m/s), MERRA-2, 0,5°×0,625°, yıllık ortalama
İklim ortalamasının 13. zaman adımı (yıllık) alınır; ızgara 60°G–75°K arasına kırpılır ve bayta indirgenir:
  güneş 1,5 W/m², rüzgâr 0,06 m/s adımla. Oyun bu değerleri world.js'te çift doğrusal (bilinear) aradeğerleme ile okur.

Gerekli paket: numcodecs, numpy (Blosc/zstd sıkıştırmasını çözmek için).
Kullanım: python3 scripts/build_resource.py
"""
import base64, json, os, urllib.request
import numpy as np
import numcodecs

BASE = "https://nasa-power.s3.us-west-2.amazonaws.com"
SOLAR = "syn1deg/spatial/power_syn1deg_climatology_spatial_utc.zarr"
WIND = "merra2/spatial/power_merra2_climatology_spatial_utc.zarr"
LAT0, LAT1 = -60.0, 75.0
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "data", "resource.js")


def get(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()


def array(store, var, idx=None):
    meta = json.loads(get(f"{BASE}/{store}/.zmetadata"))["metadata"]
    za = meta[f"{var}/.zarray"]
    sep = za.get("dimension_separator", ".")
    key = "0" if idx is None else sep.join(str(i) for i in idx)
    raw = numcodecs.blosc.decompress(get(f"{BASE}/{store}/{var}/{key}"))
    a = np.frombuffer(raw, dtype=za["dtype"]).astype(np.float64)
    for f in reversed(za.get("filters") or []):  # kayıt: x' = (x - offset) * scale → çözüm: x = x'/scale + offset
        if f["id"] == "fixedscaleoffset":
            a = a / f["scale"] + f["offset"]
    return a, za


def grid(store, var, step):
    t, _ = array(store, "time")
    ti = int(np.where(t == 13)[0][0])  # 13 = yıllık ortalama
    lat, _ = array(store, "lat")
    lon, _ = array(store, "lon")
    v, za = array(store, var, (ti, 0, 0))
    v = v.reshape(za["shape"][1], za["shape"][2])
    rows = (lat >= LAT0 - 1e-6) & (lat <= LAT1 + 1e-6)
    v, lat = v[rows], lat[rows]
    q = np.clip(np.round(np.nan_to_num(v, nan=0) / step), 0, 255).astype(np.uint8)
    return {"lat0": float(lat[0]), "dlat": float(lat[1] - lat[0]), "lon0": float(lon[0]), "dlon": float(lon[1] - lon[0]),
            "rows": int(q.shape[0]), "cols": int(q.shape[1]), "step": step, "b64": base64.b64encode(q.tobytes()).decode()}


def main():
    s = grid(SOLAR, "ALLSKY_SFC_SW_DWN", 1.5)
    w = grid(WIND, "WS50M", 0.06)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("// Üretildi: scripts/build_resource.py — elle düzenlemeyin.\n")
        f.write("// Kaynak: NASA POWER Projesi (power.larc.nasa.gov), uzun dönem yıllık ortalamalar, CC BY 4.0.\n")
        f.write("// GHI: CERES SYN1deg 1°×1° (W/m², 1,5 adım); WS50M: MERRA-2 0,5°×0,625° (m/s, 0,06 adım). Satır 0 = en güney enlem.\n")
        for name, g in (("GHI", s), ("WS50", w)):
            f.write(f"export const {name}={json.dumps(g, separators=(',', ':'))};\n")
    print(f"yazıldı: {OUT} ({os.path.getsize(OUT) // 1024} KB)")


if __name__ == "__main__":
    main()
