#!/usr/bin/env python3
"""Dünyadaki elektrik santralleri — OpenStreetMap → public/data/plants/

Kaynak iki yoldan okunabilir: Geofabrik kıta çıkarımı (osmium tags-filter ile süzülmüş PBF, --pbf; GitHub Actions'ta
kullanılan yol) ya da Overpass API (karo karo sorgu; küçük alanlar için). Aşağıdaki 1. adım Overpass yolunu anlatır; PBF
yolunda aynı nesneler (power=plant, rüzgâr türbinleri) dosyadan okunur ve 2–5. adımlar aynıdır.


Veri: OpenStreetMap katkıcıları, ODbL 1.0 (https://www.openstreetmap.org/copyright). Oyunun "Gerçek santraller" katmanı
için. GitHub Actions'ta çalışır (.github/workflows/osm-plants.yml); bu oturumun ağından Overpass'a erişilemiyor.

1. Dünya 10°×10° karolara bölünür (enlem −60…80). Her karoda power=plant olan tüm nesneler (nokta, alan, ilişki) ve rüzgâr
   türbinleri (power=generator + generator:source=wind) sorgulanır. Sunucu zaman aşımına düşerse karo dörde bölünür
   (en küçük 1,25°). Karo sınırına taşan alanlar iki kez gelir; kimlikle tekilleştirilir. Ülke sınırına göre değil
   karoyla sorgulandığı için kara sularının dışındaki deniz rüzgâr santralleri de gelir.
2. Rüzgâr türbinleri 2 km'lik komşulukla kümelenir; kümenin merkezi bir rüzgâr santraline 3 km'den yakınsa o santrale
   bağlanır (gücü yoksa türbin güçleri toplanır), değilse ayrı bir santral olur (en az 2 türbin ya da 1 MW).
3. Boyut için küçük tesisler atlanır: gücü 1 MW'tan küçük olanlar; gücü yazılmamış, adı olmayan ve alanı 2 hektardan
   küçük (ya da yalnızca nokta olarak işli) güneş santralleri (çoğu çatı ya da tarla üstü küçük kurulum).
4. Her santral, src/data/countries.json'daki (Natural Earth) ülke sınırına göre bir ülkeye atanır; kıyı ve deniz
   santralleri en yakın ülkeye (en çok ~300 km).
5. Çıktı (public/data/plants/):
   - {ISO3}.json: {"a3", "meta": {...}, "p": [[enlem, boylam, kaynak, MW ya da null, ad, türbin sayısı ya da 0], ...]}
   - world.json: dünya görünümü için 100 MW ve üstü santraller (satır sonunda ISO3)
   - index.json: ülke başına santral sayısı, kaynak bazında MW, sınır kutusu; başarısız karolar
   kaynak: w rüzgâr, s güneş, h hidro, g doğalgaz, c kömür, o petrol, j jeotermal, b biyokütle/atık, n nükleer,
   e batarya depolama, x diğer

Kullanım: python3 scripts/build_osm_plants.py public/data/plants [--bbox güney,batı,kuzey,doğu]
  bölge işi:  python3 scripts/build_osm_plants.py --bbox -60,10,80,40 --raw raw-3.json.gz --harvest-only --budget 300
  kıta (PBF): osmium tags-filter europe-latest.osm.pbf nwr/power=plant n/generator:source=wind -o plants.osm.pbf
              python3 scripts/build_osm_plants.py --pbf plants.osm.pbf --raw raw-europe.json.gz --harvest-only
  birleştir:  python3 scripts/build_osm_plants.py public/data/plants --merge raw-*.json.gz
Gerekenler: shapely (birleştirme), osmium (PBF okuma) (pip install shapely osmium)
"""
import argparse, gzip, json, math, os, re, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone

ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter",
             "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]
UA = {"User-Agent": "wattlas-osm-plants/2.0 (github.com/emresoykan/sebeke-oyun)"}
TILE, MIN_TILE, LAT0, LAT1 = 10.0, 1.25, -60, 80
WORLD_MW, MIN_MW, MIN_SOLAR_M2 = 100, 1.0, 20000

SRC = {"wind": "w", "solar": "s", "hydro": "h", "gas": "g", "coal": "c", "lignite": "c", "oil": "o", "diesel": "o",
       "geothermal": "j", "biomass": "b", "biogas": "b", "biofuel": "b", "waste": "b", "nuclear": "n", "battery": "e"}

def query(s, w, n, e):
    b = f"({s},{w},{n},{e})"
    # alanlar için merkez ve sınır kutusu ayrı çıktılar (alan büyüklüğü güneş eleğinde kullanılır)
    return (f'[out:json][timeout:240];nwr["power"="plant"]{b}->.p;'
            f'node.p;out tags center;(way.p;rel.p;)->.a;.a out tags center;.a out ids bb;'
            f'nwr["power"="generator"]["generator:source"="wind"]{b};out tags center;')

def fetch(q):
    """Overpass yanıtı; zaman aşımı ya da sunucu hatasında None"""
    for url in ENDPOINTS:
        for attempt in range(2):
            try:
                req = urllib.request.Request(url, data=urllib.parse.urlencode({"data": q}).encode(), headers=UA)
                with urllib.request.urlopen(req, timeout=300) as r: d = json.load(r)
                rem = d.get("remark", "")
                if "error" in rem.lower(): print(f"    {url}: {rem[:120]}", file=sys.stderr); return None  # bölünmeli
                return d["elements"]
            except urllib.error.HTTPError as e:
                print(f"    {url}: HTTP {e.code}", file=sys.stderr)
                if e.code == 429: time.sleep(60); continue
                if e.code == 400:  # sözdizimi hatası: sunucunun açıklamasını yaz
                    print(re.sub(r"<[^>]+>", " ", e.read().decode("utf-8", "replace"))[:800], file=sys.stderr); raise
                if e.code == 504: return None
                time.sleep(15)
            except Exception as e:
                print(f"    {url}: {e}", file=sys.stderr); time.sleep(15)
    return None

def tiles(s, w, n, e, step):
    y = s
    while y < n:
        x = w
        while x < e: yield (y, x, min(n, y + step), min(e, x + step)); x += step
        y += step

KEEP = {"power", "plant:source", "plant:output:electricity", "generator:source", "generator:output:electricity", "name", "name:tr", "name:en"}

def harvest(bbox, budget=None):
    """karoları sırayla sorgular; başarısız karoyu dörde böler. Süre bütçesi (dk) dolarsa kalan karolar başarısız sayılır
    (o ana kadar toplanan veri korunur). (öğeler sözlüğü, başarısız karolar)"""
    els, failed, stack = {}, [], list(tiles(*bbox, TILE))[::-1]
    i, t0 = 0, time.time()
    while stack:
        if budget and time.time() - t0 > budget * 60:
            failed += [list(t) for t in stack]; print(f"  süre bütçesi doldu: {len(stack)} karo kaldı"); break
        s, w, n, e = stack.pop(); i += 1
        r = fetch(query(s, w, n, e)); time.sleep(1.5)
        if r is None:
            if n - s > MIN_TILE:
                h = (n - s) / 2; stack += [(s, w, s + h, w + h), (s, w + h, s + h, e), (s + h, w, n, w + h), (s + h, w + h, n, e)][::-1]
                print(f"  [{i}] {s},{w},{n},{e}: bölünüyor"); continue
            failed.append([s, w, n, e]); print(f"  [{i}] {s},{w},{n},{e}: BAŞARISIZ"); continue
        for el in r:
            if "tags" in el: el["tags"] = {kk: v for kk, v in el["tags"].items() if kk in KEEP}  # yalnızca gereken etiketler
            k = (el["type"], el["id"]); o = els.get(k)
            if o: o.update({kk: v for kk, v in el.items() if kk not in o})  # merkez ve sınır kutusu birleşir
            else: els[k] = el
        if r: print(f"  [{i}] {s},{w},{n},{e}: {len(r)} öğe (toplam {len(els)})")
    return els, failed

def mw(v):
    """'50 MW', '50MW', '1,5 GW', '500 kW', '50' → MW; 'yes' ya da anlaşılmayan → None"""
    if not v: return None
    v = v.strip().replace(",", ".").lower()
    m = re.match(r"^([0-9]*\.?[0-9]+)\s*(gw|mw|kw|w)?", v)
    if not m: return None
    x, u = float(m.group(1)), m.group(2) or "mw"
    x = x * {"gw": 1000, "mw": 1, "kw": 0.001, "w": 1e-6}[u]
    return round(x, 3) if 0 < x < 25000 else None

def src(tags, key):
    s = (tags.get(key) or "").split(";")[0].strip().lower()
    return SRC.get(s, "x")

def pos(e):
    if "lat" in e: return e["lat"], e["lon"]
    c = e.get("center")
    if c: return c["lat"], c["lon"]
    b = e.get("bounds")
    if b: return (b["minlat"] + b["maxlat"]) / 2, (b["minlon"] + b["maxlon"]) / 2
    return None, None

def area_m2(e):
    b = e.get("bounds")
    if not b: return None
    la = math.radians((b["minlat"] + b["maxlat"]) / 2)
    return (b["maxlat"] - b["minlat"]) * 110574 * (b["maxlon"] - b["minlon"]) * 111320 * math.cos(la)

def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 12742 * math.asin(math.sqrt(min(1, h)))

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
            ry = max(1, min(60, int(math.ceil(1 / max(0.02, math.cos(math.radians(p[0])))))))  # yüksek enlemde boylam hücresi daralır
            for dx in (-1, 0, 1):
                for dy in range(-ry, ry + 1):
                    for k in grid.get((gx + dx, gy + dy), []):
                        if k not in seen and km(p, pts[k]) <= link: seen.add(k); stack.append(k)
        out.append(grp)
    return out

def process(els):
    """Overpass öğeleri → santral listesi (ülke atanmamış) ve özet sayılar"""
    plants, tur, st = [], [], {"plants_raw": 0, "small": 0, "solar_small": 0, "turbines": 0, "areas_with_bounds": 0}
    for e in els.values():
        t = e.get("tags", {}); lat, lon = pos(e)
        if lat is None: continue
        if t.get("power") == "generator":
            tur.append((lat, lon, mw(t.get("generator:output:electricity")))); continue
        if t.get("power") != "plant": continue
        st["plants_raw"] += 1
        if "bounds" in e: st["areas_with_bounds"] += 1
        k, cap = src(t, "plant:source"), mw(t.get("plant:output:electricity"))
        name = (t.get("name:tr") or t.get("name") or t.get("name:en") or "").strip()[:80]
        if cap is not None and cap < MIN_MW: st["small"] += 1; continue
        if k == "s" and cap is None and not name:
            # nokta olarak işli ya da alanı küçük; alanın sınır kutusu gelmediyse (sunucu desteklemiyor) elenmez
            a = area_m2(e)
            if (e["type"] == "node" or (a is not None and a < MIN_SOLAR_M2)): st["solar_small"] += 1; continue
        plants.append({"lat": lat, "lon": lon, "s": k, "mw": cap, "n": name, "t": 0})
    st["turbines"] = len(tur)
    # rüzgâr türbini kümeleri: en yakın rüzgâr santraline (≤ 3 km) bağla, ızgara ile ara
    G = 0.05; wg = {}
    for p in plants:
        if p["s"] == "w": wg.setdefault((int(p["lat"] // G), int(p["lon"] // G)), []).append(p)
    added = linked = 0
    for grp in clusters(tur):
        la = sum(tur[i][0] for i in grp) / len(grp); lo = sum(tur[i][1] for i in grp) / len(grp)
        caps = [tur[i][2] for i in grp if tur[i][2]]; cap = round(sum(caps), 3) if len(caps) == len(grp) else None
        gx, gy = int(la // G), int(lo // G); near, nd = None, 3.0
        for dx in (-1, 0, 1):
            for dy in (-2, -1, 0, 1, 2):
                for p in wg.get((gx + dx, gy + dy), []):
                    d = km((la, lo), (p["lat"], p["lon"]))
                    if d <= nd: near, nd = p, d
        if near:
            near["t"] += len(grp); linked += 1
            if near["mw"] is None and cap: near["mw"] = cap
        elif len(grp) >= 2 or (cap or 0) >= MIN_MW:
            plants.append({"lat": la, "lon": lo, "s": "w", "mw": cap, "n": "", "t": len(grp)}); added += 1
    st.update(linked=linked, wind_added=added)
    return plants, st

def assign(plants, countries_path):
    """Natural Earth ülke sınırlarıyla ülke ataması; dışarıda kalanlar en yakın ülkeye (≤ ~3°)"""
    from shapely.geometry import shape, Point
    from shapely.strtree import STRtree
    from shapely import prepared
    fs = json.load(open(countries_path, encoding="utf-8"))["features"]
    geoms = [shape(f["geometry"]) for f in fs]; a3s = [f["properties"]["a3"] for f in fs]
    tree, prep = STRtree(geoms), [prepared.prep(g) for g in geoms]; lost = 0
    for p in plants:
        pt = Point(p["lon"], p["lat"]); hit = None
        for i in tree.query(pt):
            if prep[i].contains(pt): hit = i; break
        if hit is None:
            i = tree.nearest(pt)
            if i is not None and geoms[i].distance(pt) <= 3: hit = i
        p["a3"] = a3s[hit] if hit is not None else None
        if hit is None: lost += 1
    return lost

def from_pbf(path):
    """Geofabrik çıkarımından süzülmüş PBF (osmium tags-filter) → Overpass biçiminde öğeler. Noktalar konumla; alanlar
    (kapalı yol ya da çokgen ilişki) dış halkalarının ortalama noktası ve sınır kutusuyla; açık yollar düğümlerinin
    ortalamasıyla. pyosmium gerekir (pip install osmium)."""
    import osmium
    els = {}
    def tg(o): return {t.k: t.v for t in o.tags if t.k in KEEP}
    def put(typ, oid, tags, pts):
        if not pts: return
        la = [p[0] for p in pts]; lo = [p[1] for p in pts]
        els[(typ, oid)] = {"type": typ, "id": oid, "tags": tags, "center": {"lat": sum(la) / len(la), "lon": sum(lo) / len(lo)},
                           "bounds": {"minlat": min(la), "maxlat": max(la), "minlon": min(lo), "maxlon": max(lo)}}
    loc, wpts = {}, {}  # süzülmüş dosyadaki tüm düğüm konumları ve yol noktaları: site ilişkileri üyelerinden konum alır
    class H(osmium.SimpleHandler):
        def node(self, n):
            if not n.location.valid(): return
            loc[n.id] = (n.location.lat, n.location.lon); t = n.tags
            if t.get("power") == "plant" or (t.get("power") == "generator" and t.get("generator:source") == "wind"):
                els[("node", n.id)] = {"type": "node", "id": n.id, "lat": n.location.lat, "lon": n.location.lon, "tags": tg(n)}
        def way(self, w):
            pts = [(x.location.lat, x.location.lon) for x in w.nodes if x.location.valid()]
            if pts: wpts[w.id] = pts
            if w.tags.get("power") != "plant" or w.is_closed(): return  # kapalı yollar alan olarak gelir
            put("way", w.id, tg(w), pts)
        def relation(self, r):
            # çokgen ilişkiler alan olarak gelir; diğerleri (çoğunlukla type=site: türbinleri ya da bölümleri bir arada
            # tutan santral kaydı) üyelerinin noktalarından konumlanır
            if r.tags.get("power") != "plant" or r.tags.get("type") == "multipolygon": return
            pts = []
            for m in r.members:
                if m.type == "n" and m.ref in loc: pts.append(loc[m.ref])
                elif m.type == "w" and m.ref in wpts: pts += wpts[m.ref]
            put("relation", r.id, tg(r), pts)
        def area(self, a):
            if a.tags.get("power") != "plant": return
            pts = [(x.location.lat, x.location.lon) for ring in a.outer_rings() for x in ring if x.location.valid()]
            put("way" if a.from_way() else "relation", a.orig_id(), tg(a), pts)
    H().apply_file(path, locations=True)
    return els

def opn(path, mode):
    return gzip.open(path, mode + "t", encoding="utf-8") if path.endswith(".gz") else open(path, mode, encoding="utf-8")

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("out", nargs="?", default="public/data/plants")
    ap.add_argument("--bbox", help="güney,batı,kuzey,doğu (bölge ya da deneme)"); ap.add_argument("--raw", help="ham öğeleri bu dosyaya yaz / oradan oku (.gz olabilir)")
    ap.add_argument("--harvest-only", action="store_true", help="yalnızca sorgula ve --raw dosyasına yaz (bölge işi)")
    ap.add_argument("--merge", nargs="+", help="bölge işlerinin ham dosyalarını birleştirip işle")
    ap.add_argument("--budget", type=float, help="sorgu süre bütçesi (dk)")
    ap.add_argument("--pbf", help="Overpass yerine süzülmüş PBF dosyasından oku (Geofabrik + osmium tags-filter)")
    ap.add_argument("--countries", default="src/data/countries.json"); a = ap.parse_args()
    bbox = tuple(map(float, a.bbox.split(","))) if a.bbox else (LAT0, -180, LAT1, 180)
    if a.merge:
        els, failed = {}, []
        for f in a.merge:
            d = json.load(opn(f, "r")); failed += d.get("failed", [])
            for e in d["elements"]:
                k = (e["type"], e["id"]); o = els.get(k)
                if o: o.update({kk: v for kk, v in e.items() if kk not in o})
                else: els[k] = e
            print(f"Ham veri: {f}: {len(d['elements'])} öğe")
        bbox = (LAT0, -180, LAT1, 180)
    elif a.pbf:
        t0 = time.time(); els, failed = from_pbf(a.pbf), []
        print(f"PBF okundu: {a.pbf}: {len(els)} öğe, {round(time.time() - t0)} sn")
        if a.raw:
            with opn(a.raw, "w") as f: json.dump({"elements": list(els.values()), "failed": [], "src": a.pbf}, f)
        if a.harvest_only: return
    elif a.raw and os.path.exists(a.raw) and not a.harvest_only:
        d = json.load(opn(a.raw, "r")); els = {(e["type"], e["id"]): e for e in d["elements"]}; failed = d.get("failed", [])
        print(f"Ham veri okundu: {len(els)} öğe")
    else:
        print(f"Overpass sorgulanıyor, alan {bbox}…"); t0 = time.time(); els, failed = harvest(bbox, a.budget)
        print(f"  {len(els)} öğe, {len(failed)} başarısız karo, {round((time.time() - t0) / 60)} dk")
        if a.raw:
            with opn(a.raw, "w") as f: json.dump({"elements": list(els.values()), "failed": failed, "bbox": bbox}, f)
        if a.harvest_only: return
    plants, st = process(els); lost = assign(plants, a.countries); st["no_country"] = lost
    print("Özet:", json.dumps(st, ensure_ascii=False))
    fetched = datetime.now(timezone.utc).strftime("%Y-%m-%d"); os.makedirs(a.out, exist_ok=True)
    by = {}
    for p in plants:
        if p["a3"]: by.setdefault(p["a3"], []).append(p)
    index, world, keep = {}, [], set()
    for a3, ps in sorted(by.items()):
        counts, mws, known = {}, {}, {}
        for p in ps:
            counts[p["s"]] = counts.get(p["s"], 0) + 1
            if p["mw"]: mws[p["s"]] = round(mws.get(p["s"], 0) + p["mw"], 1); known[p["s"]] = known.get(p["s"], 0) + 1
        rows = [[round(p["lat"], 4), round(p["lon"], 4), p["s"], p["mw"], p["n"], p["t"]] for p in ps]
        rows.sort(key=lambda r: -(r[3] or 0))
        meta = {"counts": counts, "mw": mws, "withCapacity": known, "fetched": fetched}
        json.dump({"a3": a3, "meta": meta, "p": rows}, open(f"{a.out}/{a3}.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        keep.add(f"{a3}.json")
        la = [r[0] for r in rows]; lo = [r[1] for r in rows]
        index[a3] = {"n": len(rows), "counts": counts, "mw": mws, "bb": [min(lo), min(la), max(lo), max(la)]}
        world += [r + [a3] for r in rows if (r[3] or 0) >= WORLD_MW]
    world.sort(key=lambda r: -(r[3] or 0))
    json.dump({"p": world}, open(f"{a.out}/world.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    meta = {"source": "OpenStreetMap katkıcıları", "license": "ODbL 1.0", "fetched": fetched, "worldMW": WORLD_MW, "minMW": MIN_MW,
            "minSolarM2": MIN_SOLAR_M2, "failedTiles": failed, "stats": st, "bbox": bbox,
            "sources": [os.path.basename(f) for f in a.merge] if a.merge else None}
    json.dump({"meta": meta, "c": index}, open(f"{a.out}/index.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    # artık santrali kalmayan ülke dosyalarını sil (yalnızca tüm dünya sorgulandıysa)
    if not a.bbox or a.merge:
        for f in os.listdir(a.out):
            if re.fullmatch(r"[A-Z]{3}\.json", f) and f not in keep: os.remove(f"{a.out}/{f}")
    tot = sum(v["n"] for v in index.values())
    print(f"Yazıldı: {a.out} ({len(index)} ülke, {tot} santral, dünya görünümünde {len(world)})")
    for a3, v in sorted(index.items(), key=lambda x: -x[1]["n"])[:15]: print(f"  {a3}: {v['n']} santral, {round(sum(v['mw'].values()))} MW")

if __name__ == "__main__":
    main()
