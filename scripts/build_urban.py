#!/usr/bin/env python3
"""Yerleşim alanları: Natural Earth 1:10m Urban Areas poligonlarından public/data/urban.bin üretir.

Kaynak: Natural Earth (kamu malı), ne_10m_urban_areas — MODIS uydu verisinden türetilmiş kentsel alan sınırları
(Schneider vd., ~2002 dönemi; yaklaşık 500 m–1 km çözünürlük). Sonradan büyüyen yerleşimler veride görünmeyebilir.

Poligonlar Douglas-Peucker ile ~0,002° (~200 m) toleransla sadeleştirilir ve ikili biçimde yazılır (küçük uçlu):
  'URB1' | uint32 poligon sayısı | her poligon: uint16 halka sayısı | her halka: uint16 nokta sayısı,
  int32 ilk boylam, int32 ilk enlem (1e-4 derece), sonraki noktalar int16 fark (1e-4 derece).
  İlk halka dış sınır, diğerleri delik. Oyun bu dosyayı src/urban.js ile okur.
Kullanım: python3 scripts/build_urban.py
"""
import json, math, os, struct, urllib.request

URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_urban_areas.geojson"
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "data", "urban.bin")
EPS, Q = 0.002, 1e4


def dp(pts, eps):
    """Douglas-Peucker (yinelemeli)."""
    if len(pts) < 4:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i0, i1 = stack.pop()
        a, b = pts[i0], pts[i1]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy)
        dmax, imax = -1.0, -1
        for i in range(i0 + 1, i1):
            p = pts[i]
            d = abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / L if L > 1e-12 else math.hypot(p[0] - a[0], p[1] - a[1])
            if d > dmax:
                dmax, imax = d, i
        if imax > 0 and dmax > eps:
            keep[imax] = True
            stack += [(i0, imax), (imax, i1)]
    return [p for p, k in zip(pts, keep) if k]


def ring_bytes(ring):
    q = [(round(x * Q), round(y * Q)) for x, y in ring]
    # int16 farka sığmayan uzun kenarlar ara noktalarla bölünür
    out = [q[0]]
    for x, y in q[1:]:
        px, py = out[-1]
        n = max(1, math.ceil(max(abs(x - px), abs(y - py)) / 32000))
        for k in range(1, n + 1):
            out.append((px + round((x - px) * k / n), py + round((y - py) * k / n)))
    b = struct.pack("<Hii", len(out), out[0][0], out[0][1])
    for (x0, y0), (x1, y1) in zip(out, out[1:]):
        b += struct.pack("<hh", x1 - x0, y1 - y0)
    return b


def main():
    with urllib.request.urlopen(URL, timeout=120) as r:
        feats = json.load(r)["features"]
    polys = []
    for f in feats:
        g = f["geometry"]
        for poly in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]):
            rings = [dp(r, EPS) for r in poly]
            rings = [r for r in rings if len(r) >= 4]
            if rings and len(rings) < 65536:
                polys.append(rings)
    body = b"".join(struct.pack("<H", len(p)) + b"".join(ring_bytes(r) for r in p) for p in polys)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "wb") as f:
        f.write(b"URB1" + struct.pack("<I", len(polys)) + body)
    print(f"yazıldı: {OUT} ({len(polys)} poligon, {os.path.getsize(OUT) // 1024} KB)")


if __name__ == "__main__":
    main()
