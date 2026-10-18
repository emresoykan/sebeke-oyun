#!/usr/bin/env python3
"""Türkiye'deki elektrik santralleri — OpenStreetMap (Overpass API) → public/data/plants-tr.json

Veri: OpenStreetMap katkıcıları, ODbL 1.0 (https://www.openstreetmap.org/copyright). Oyunun "Gerçek santraller" katmanı
için. GitHub Actions'ta çalışır (.github/workflows/osm-plants.yml); bu oturumun ağından Overpass'a erişilemiyor.

1. power=plant olan tüm nesneler (nokta, alan, ilişki; alanlar için merkez): ad, kaynak (plant:source), güç
   (plant:output:electricity).
2. Rüzgâr türbinleri (power=generator + generator:source=wind): Türkiye'de birçok rüzgâr santrali OSM'de santral olarak
   değil yalnızca türbinleriyle işli. Türbinler 2 km'lik komşulukla kümelenir; kümenin merkezi bir rüzgâr santraline
   3 km'den yakınsa o santrale bağlanır (gücü yoksa türbin güçleri toplanır), değilse ayrı bir santral olarak eklenir.
3. Çıktı: {"meta": {...}, "p": [[enlem, boylam, kaynak, MW ya da null, ad, türbin sayısı ya da 0], ...]}
   kaynak: w rüzgâr, s güneş, h hidro, g doğalgaz, c kömür, o petrol, j jeotermal, b biyokütle/atık, n nükleer, x diğer

Kullanım: python3 scripts/build_osm_plants.py public/data/plants-tr.json
"""
import json, math, re, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone

ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter",
             "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]
AREA = 'area["ISO3166-1"="TR"][admin_level=2]->.a;'
Q_PLANTS = f'[out:json][timeout:600];{AREA}nwr["power"="plant"](area.a);out tags center;'
Q_WIND = f'[out:json][timeout:600];{AREA}nwr["power"="generator"]["generator:source"="wind"](area.a);out tags center;'

SRC = {"wind": "w", "solar": "s", "hydro": "h", "gas": "g", "coal": "c", "lignite": "c", "oil": "o", "diesel": "o",
       "geothermal": "j", "biomass": "b", "biogas": "b", "biofuel": "b", "waste": "b", "nuclear": "n"}

def overpass(q):
    last = None
    for attempt in range(3):
        for url in ENDPOINTS:
            try:
                req = urllib.request.Request(url, data=urllib.parse.urlencode({"data": q}).encode(),
                                             headers={"User-Agent": "wattlas-osm-plants/1.0 (github.com/emresoykan/sebeke-oyun)"})
                with urllib.request.urlopen(req, timeout=900) as r:
                    return json.load(r)["elements"]
            except Exception as e:  # sırayla diğer sunucuyu dene
                last = e; print(f"  {url}: {e}", file=sys.stderr)
        time.sleep(30 * (attempt + 1))
    raise SystemExit(f"Overpass'a ulaşılamadı: {last}")

def mw(v):
    """'50 MW', '50MW', '1,5 GW', '500 kW', '50' → MW; 'yes' ya da anlaşılmayan → None"""
    if not v: return None
    v = v.strip().replace(",", ".").lower()
    m = re.match(r"^([0-9]*\.?[0-9]+)\s*(gw|mw|kw|w)?", v)
    if not m: return None
    x, u = float(m.group(1)), m.group(2) or "mw"
    x = x * {"gw": 1000, "mw": 1, "kw": 0.001, "w": 1e-6}[u]
    return round(x, 3) if 0 < x < 20000 else None

def src(tags, key):
    s = (tags.get(key) or "").split(";")[0].strip().lower()
    return SRC.get(s, "x")

def pos(e):
    if "lat" in e: return e["lat"], e["lon"]
    c = e.get("center"); return (c["lat"], c["lon"]) if c else (None, None)

def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))

def clusters(pts, link=2.0):
    """basit tek bağlantılı kümeleme (komşuluk ≤ link km); ızgara ile hızlandırılır"""
    cell = link / 111.0; grid = {}
    for i, p in enumerate(pts): grid.setdefault((int(p[0] // cell), int(p[1] // cell)), []).append(i)
    seen, out = set(), []
    for i in range(len(pts)):
        if i in seen: continue
        stack, grp = [i], []; seen.add(i)
        while stack:
            j = stack.pop(); grp.append(j); p = pts[j]; gx, gy = int(p[0] // cell), int(p[1] // cell)
            for dx in (-1, 0, 1):
                for dy in (-2, -1, 0, 1, 2):
                    for k in grid.get((gx + dx, gy + dy), []):
                        if k not in seen and km(p, pts[k]) <= link: seen.add(k); stack.append(k)
        out.append(grp)
    return out

def main(out_path):
    print("Santraller sorgulanıyor…")
    plants = []
    for e in overpass(Q_PLANTS):
        lat, lon = pos(e); t = e.get("tags", {})
        if lat is None: continue
        plants.append({"lat": lat, "lon": lon, "s": src(t, "plant:source"), "mw": mw(t.get("plant:output:electricity")),
                       "n": (t.get("name:tr") or t.get("name") or "").strip()[:80], "t": 0})
    print(f"  {len(plants)} santral")
    print("Rüzgâr türbinleri sorgulanıyor…")
    tur = []
    for e in overpass(Q_WIND):
        lat, lon = pos(e)
        if lat is not None: tur.append((lat, lon, mw(e.get("tags", {}).get("generator:output:electricity"))))
    print(f"  {len(tur)} türbin")
    wind = [p for p in plants if p["s"] == "w"]; added = linked = 0
    for grp in clusters(tur):
        la = sum(tur[i][0] for i in grp) / len(grp); lo = sum(tur[i][1] for i in grp) / len(grp)
        caps = [tur[i][2] for i in grp if tur[i][2]]; cap = round(sum(caps), 3) if len(caps) == len(grp) else None
        near = min(wind, key=lambda p: km((la, lo), (p["lat"], p["lon"])), default=None)
        if near and km((la, lo), (near["lat"], near["lon"])) <= 3:
            near["t"] += len(grp); linked += 1
            if near["mw"] is None and cap: near["mw"] = cap
        else:
            plants.append({"lat": la, "lon": lo, "s": "w", "mw": cap, "n": "", "t": len(grp)}); added += 1
    print(f"  türbin kümeleri: {linked} mevcut santrale bağlandı, {added} yeni rüzgâr santrali eklendi")
    counts, mws, known = {}, {}, {}
    for p in plants:
        counts[p["s"]] = counts.get(p["s"], 0) + 1
        if p["mw"]: mws[p["s"]] = round(mws.get(p["s"], 0) + p["mw"], 1); known[p["s"]] = known.get(p["s"], 0) + 1
    meta = {"source": "OpenStreetMap katkıcıları", "license": "ODbL 1.0", "fetched": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "counts": counts, "mw": mws, "withCapacity": known}
    rows = [[round(p["lat"], 4), round(p["lon"], 4), p["s"], p["mw"], p["n"], p["t"]] for p in plants]
    rows.sort(key=lambda r: -(r[3] or 0))
    with open(out_path, "w", encoding="utf-8") as f: json.dump({"meta": meta, "p": rows}, f, ensure_ascii=False, separators=(",", ":"))
    print("Özet (santral sayısı / gücü bilinen / toplam MW):")
    for k in sorted(counts, key=lambda k: -mws.get(k, 0)): print(f"  {k}: {counts[k]} / {known.get(k, 0)} / {mws.get(k, 0)}")
    print(f"Yazıldı: {out_path} ({len(rows)} satır)")

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "public/data/plants-tr.json")
