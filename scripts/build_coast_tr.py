"""Türkiye çevresi için ayrıntılı kara poligonları (src/data/coast-tr.json).

Oyunun dünya haritası Natural Earth 1:50m kıyısını kullanır; Türkiye kıyılarında bu çizgi ayrıntılı kıyıdan ortanca ~2 km
sapar (Kırklareli Karadeniz kıyısında ~2,5 km), kıyıya yakın deniz sahaları haritada karada görünür. Bu betik Natural Earth
1:10m kara poligonlarını Türkiye kutusuna kırpar (Sutherland–Hodgman), sadeleştirir (Douglas–Peucker) ve oyunun kara/deniz
kararı ile kıyıya uzaklık hesabı için yazar (world.js).
Kaynak: Natural Earth (kamu malı), ne_10m_land.
Kullanım:  python3 scripts/build_coast_tr.py --src DIR   # ne_10m_land.geojson'un bulunduğu klasör
           python3 scripts/build_coast_tr.py             # indirir
"""
import argparse, json, math, os, urllib.request

BB = (25.0, 35.0, 45.5, 42.8)   # boylam/enlem kutusu: Türkiye ve komşu kıyılar (Ege adaları, Kıbrıs, Bulgaristan, Gürcistan)
TOL = 0.0004                    # sadeleştirme toleransı (derece, ~35–45 m)
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "data", "coast-tr.json")
URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson"

def clip(ring):
    """Halkayı kutuya kırp (Sutherland–Hodgman; kutu dışbükey, halka içbükey olabilir)."""
    x0, y0, x1, y1 = BB
    edges = [(lambda p: p[0] >= x0, lambda a, b: (x0, a[1] + (b[1]-a[1])*(x0-a[0])/(b[0]-a[0]))),
             (lambda p: p[0] <= x1, lambda a, b: (x1, a[1] + (b[1]-a[1])*(x1-a[0])/(b[0]-a[0]))),
             (lambda p: p[1] >= y0, lambda a, b: (a[0] + (b[0]-a[0])*(y0-a[1])/(b[1]-a[1]), y0)),
             (lambda p: p[1] <= y1, lambda a, b: (a[0] + (b[0]-a[0])*(y1-a[1])/(b[1]-a[1]), y1))]
    out = [tuple(p) for p in ring]
    for inside, cut in edges:
        if not out: break
        inp, out = out, []
        prev = inp[-1]
        for cur in inp:
            if inside(cur):
                if not inside(prev): out.append(cut(prev, cur))
                out.append(cur)
            elif inside(prev):
                out.append(cut(prev, cur))
            prev = cur
    return out

def dp(pts, tol):
    """Douglas–Peucker (yinelemeli yığınla)."""
    if len(pts) < 3: return pts
    keep = [False]*len(pts); keep[0] = keep[-1] = True; st = [(0, len(pts)-1)]
    while st:
        a, b = st.pop(); ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx-ax, by-ay; L = dx*dx+dy*dy; best, bi = 0, -1
        for i in range(a+1, b):
            px, py = pts[i]
            t = 0 if L == 0 else max(0, min(1, ((px-ax)*dx+(py-ay)*dy)/L))
            d = math.hypot(px-(ax+t*dx), py-(ay+t*dy))
            if d > best: best, bi = d, i
        if best > tol: keep[bi] = True; st += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--src"); a = ap.parse_args()
    if a.src: data = json.load(open(os.path.join(a.src, "ne_10m_land.geojson")))
    else: data = json.loads(urllib.request.urlopen(URL).read())
    rings = []
    for f in data["features"]:
        g = f["geometry"]; polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        for poly in polys:
            for ring in poly:
                xs = [p[0] for p in ring]; ys = [p[1] for p in ring]
                if max(xs) < BB[0] or min(xs) > BB[2] or max(ys) < BB[1] or min(ys) > BB[3]: continue
                c = clip(ring)
                if len(c) < 4: continue
                s = dp(c, TOL)
                if len(s) >= 4: rings.append([round(v, 4) for p in s for v in p])
    n = sum(len(r)//2 for r in rings)
    json.dump({"src": "Natural Earth ne_10m_land", "bb": BB, "rings": rings}, open(OUT, "w"), separators=(",", ":"))
    print(f"{len(rings)} halka, {n} nokta, {os.path.getsize(OUT)//1024} KB → {OUT}")

if __name__ == "__main__":
    main()
