"""Natural Earth verisinden oyunun harita verisini üretir (src/data/*.json).

Kaynak: Natural Earth (kamu malı), https://www.naturalearthdata.com
Kullanım:  python3 scripts/build_geo.py            # indirir ve üretir
           python3 scripts/build_geo.py --src DIR  # önceden indirilmiş GeoJSON klasörü
"""
import argparse, json, math, os, urllib.request

NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/"
FILES = ["ne_50m_admin_0_countries", "ne_50m_populated_places", "ne_10m_populated_places", "ne_50m_geography_regions_polys", "ne_50m_coastline"]
DETAIL_COUNTRIES = {"TUR"}  # bu ülkelerde il merkezleri için 10m şehir katmanı eklenir
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "data")

# --- Ülke -> oyun piyasası (REG kodları, src/config.js) ---
def market(p):
    a3, cont, sub = p["ADM0_A3"], p["CONTINENT"], p["SUBREGION"]
    if a3 == "TUR": return "T"
    if a3 in ("ATA", "ATF", "HMD", "SGS"): return "X"
    if a3 == "GRL": return "G"
    if a3 in ("RUS",): return "A"          # eski haritada Rusya'nın büyük kısmı Asya piyasasındaydı
    if a3 in ("CYP",): return "E"
    if a3 in ("IRN",): return "M"
    if cont == "Europe": return "E"
    if cont == "North America": return "N"
    if cont == "South America": return "S"
    if cont == "Africa": return "F"
    if cont == "Oceania": return "O"
    if sub == "Western Asia": return "M"
    if cont == "Asia": return "A"
    lon = p["LABEL_X"]                     # açık okyanustaki ada devletleri
    return "A" if lon > 60 else "F"

# --- Arazi: Natural Earth bölge poligonları ---
MOUNTAIN_EXTRA = {"PLATEAU OF TIBET", "ALTIPLANO"}
FOREST = {"AMAZON BASIN", "CONGO BASIN", "GUIANA SHIELD", "WESTERN SIBERIAN PLAIN", "CENTRAL SIBERIAN PLATEAU", "LES LAURENTIDES"}
# Natural Earth 50m'de olmayan Türkiye dağları (elle, yaklaşık çizim; oyun dengesi için)
HAND_MOUNTAINS = {
    "Toros Dağları": [[29.3,36.4],[30.6,36.3],[31.8,36.7],[33.2,36.4],[34.6,36.9],[35.8,37.3],[37.2,37.6],[38.8,38.0],[40.2,38.2],[40.4,38.9],[38.9,38.8],[37.3,38.4],[35.7,38.0],[34.3,37.6],[32.9,37.3],[31.6,37.5],[30.4,37.3],[29.3,37.0],[29.3,36.4]],
    "Doğu Anadolu": [[38.6,38.6],[40.5,38.3],[42.4,38.2],[44.3,38.4],[44.6,39.4],[43.6,40.9],[42.0,41.1],[40.3,40.5],[38.6,39.7],[38.6,38.6]],
}

def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0]-a[0], b[1]-a[1]; L = math.hypot(dx, dy)
    best, idx = -1, 0
    for i in range(1, len(pts)-1):
        p = pts[i]
        d = abs(dy*(p[0]-a[0]) - dx*(p[1]-a[1]))/L if L else math.hypot(p[0]-a[0], p[1]-a[1])
        if d > best: best, idx = d, i
    if best <= eps: return [a, b]
    return rdp(pts[:idx+1], eps)[:-1] + rdp(pts[idx:], eps)

def ring(r, eps, nd):
    r = rdp(r, eps)
    out = []
    for x, y in r:
        q = [round(x, nd), round(y, nd)]
        if not out or out[-1] != q: out.append(q)
    return out if len(out) >= 4 else None

def polys(geom, eps, nd):
    ps = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    res = []
    for p in ps:
        rings = [ring(r, eps, nd) for r in p]
        if rings[0]: res.append([r for r in rings if r])
    return res

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--src", default=None); a = ap.parse_args()
    def load(name):
        if a.src: return json.load(open(os.path.join(a.src, name + ".geojson"), encoding="utf-8"))
        with urllib.request.urlopen(NE + name + ".geojson") as r: return json.load(r)
    os.makedirs(OUT, exist_ok=True)

    cfc = load("ne_50m_admin_0_countries")
    countries, labels = [], []
    for f in cfc["features"]:
        p = f["properties"]; m = market(p)
        name = p.get("NAME_TR") or p["NAME"]
        ps = polys(f["geometry"], 0.02, 2)
        if not ps: continue
        countries.append({"type": "Feature", "properties": {"a3": p["ADM0_A3"], "n": name, "m": m},
                          "geometry": {"type": "MultiPolygon", "coordinates": ps}})
        labels.append({"type": "Feature", "properties": {"n": name, "mz": round(max(0, p["MIN_LABEL"] - 1.5), 1), "r": p["LABELRANK"]},
                       "geometry": {"type": "Point", "coordinates": [round(p["LABEL_X"], 2), round(p["LABEL_Y"], 2)]}})

    pfc = load("ne_50m_populated_places")
    cities = []
    for f in pfc["features"]:
        p = f["properties"]; lon, lat = f["geometry"]["coordinates"]
        cities.append([p.get("NAME_TR") or p["NAME"], p["ADM0_A3"], round(lat, 3), round(lon, 3), int(p["POP_MAX"] or 0),
                       round(max(0, p["MIN_ZOOM"] - 2), 1), 1 if p["FEATURECLA"].startswith("Admin-0 capital") else 0])
    have = {(c[1], c[0]) for c in cities}
    for f in load("ne_10m_populated_places")["features"]:
        p = f["properties"]; lon, lat = f["geometry"]["coordinates"]; n = p.get("NAME_TR") or p["NAME"]
        if p["ADM0_A3"] not in DETAIL_COUNTRIES or (p["ADM0_A3"], n) in have: continue
        have.add((p["ADM0_A3"], n))
        cities.append([n, p["ADM0_A3"], round(lat, 3), round(lon, 3), int(p["POP_MAX"] or 0), round(max(0, p["MIN_ZOOM"] - 2), 1), 0])
    cities.sort(key=lambda c: -c[4])

    gfc = load("ne_50m_geography_regions_polys")
    terrain = []
    for f in gfc["features"]:
        p = f["properties"]; n, c = p["NAME"], p["FEATURECLA"]
        t = "m" if (c == "Range/mtn" or n in MOUNTAIN_EXTRA) else "d" if (c == "Desert" and n != "PUNJAB") else "f" if n in FOREST else None
        if not t: continue
        ps = polys(f["geometry"], 0.05, 2)
        if ps: terrain.append({"t": t, "n": n, "p": ps})
    for n, r in HAND_MOUNTAINS.items(): terrain.append({"t": "m", "n": n, "p": [[r]]})

    coast = []
    for f in load("ne_50m_coastline")["features"]:
        g = f["geometry"]; ls = g["coordinates"] if g["type"] == "MultiLineString" else [g["coordinates"]]
        for l in ls:
            l = rdp(l, 0.05); l = [[round(x, 2), round(y, 2)] for x, y in l]
            if len(l) >= 2: coast.append(l)

    w = lambda name, obj: json.dump(obj, open(os.path.join(OUT, name), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    w("countries.json", {"type": "FeatureCollection", "features": countries})
    w("country-labels.json", {"type": "FeatureCollection", "features": labels})
    w("cities.json", cities)
    w("terrain.json", terrain)
    w("coast.json", coast)
    for n in ("countries", "country-labels", "cities", "terrain", "coast"):
        print(n, os.path.getsize(os.path.join(OUT, n + ".json")) // 1024, "KB")

if __name__ == "__main__": main()
