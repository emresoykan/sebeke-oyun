#!/usr/bin/env python3
"""Global Energy Monitor (GEM) Global Integrated Power Tracker verisini OSM santral dosyasıyla birleştirir (pilot: Türkiye)

Kaynak: Global Integrated Power Tracker, Global Energy Monitor, CC BY 4.0 (https://globalenergymonitor.org). Dosya GEM'in
indirme formundan alınır (ad, e-posta ve kullanım amacı istenir; bu yüzden otomatik indirilmez). GEM birim/faz düzeyinde
kayıt tutar; kapasite, durum (işletmede, inşa hâlinde, …), sahip ve konum doğruluğu (exact/approximate) verir. Eşikleri
OSM'den yüksektir (ör. hidroda büyük santraller), küçük tesisler OSM'den kalır.

1. --extract: GIPT dosyasından (xlsx ya da csv) ülkenin satırları seçilip küçük bir ara dosyaya yazılır
   (data/gem/gipt-TUR.json). Sütunlar başlık adlarıyla esnek eşlenir; bulunan başlıklar ve tür/durum dağılımı yazdırılır.
2. --apply: ara dosyadaki işletmedeki birimler GEM konum kimliğiyle santrallere toplanır ve OSM ülke dosyasıyla
   eşleştirilir: aynı tür (doğalgaz ve petrol birbirine uyar), yakınlık (konum doğruluğuna ve türe göre yarıçap) ve ad
   benzerliği. Eşleşen OSM santralinin gücü GEM'in işletmedeki kapasitesiyle değiştirilir; eşleşmeyen GEM santralleri
   eklenir; eşleşen bir GEM santralinin yarıçapında kalan ve adı ona çok benzeyen başka OSM kayıtları (aynı santralin
   parçaları) ona katılır. Değişen satırların sonuna kaynak bilgisi eklenir: {"s": "m" eşleşti | "g" yalnızca GEM,
   "om": OSM gücü, "f": katılan OSM satırları, "ow": sahip, "y": işletmeye giriş yılı}. GEM'de kapanmış (emekli,
   bekletmede) bir santrale yakın ve adı benzer OSM kayıtları haritadan çıkarılıp dosyanın "x" listesine konur. Önceki birleştirme bu bilgiyle geri
   alınır; böylece betik aynı dosyada tekrar çalışabilir (OSM iş akışı da her güncellemede yeniden uygular).
   index.json'daki ülke özeti ve world.json'daki satırları da güncellenir; kapsama ETKB'nin Eylül 2026 sonu kurulu gücüyle yazdırılır.

Kullanım: python3 scripts/merge_gem.py --extract GIPT.xlsx --country TUR --out data/gem/gipt-TUR.json [--release "September 2026"]
          python3 scripts/merge_gem.py --apply data/gem/gipt-TUR.json public/data/plants
Gerekenler: openpyxl (yalnızca xlsx okumak için)
"""
import argparse, csv, difflib, json, math, os, re, sys
from datetime import datetime, timezone

WORLD_MW = 100
COUNTRY_NAMES = {"TUR": {"turkey", "turkiye", "türkiye"}}
# Türkiye kurulu gücü, Eylül 2026 sonu (MW; src/ui/realplants.js KURULU ile aynı). Kaynak: ETKB, "Elektrik kurulu gücü
# kaynaklara göre dağılımı, Eylül 2026" (toplam 127.355 MW). Kömür = yerli 11.565 + ithal 10.466; petrol ayrı verilmiyor.
KURULU = {"w": 15540, "s": 28222, "h": 32332, "g": 25009, "c": 22031, "j": 1798, "b": 2423}
# başlık adayları (küçük harf, yalnızca harf/rakam)
COLS = {"country": ["countryarea", "country"], "plant": ["plantprojectname", "projectname", "plantname"],
        "unit": ["unitphasename", "phasename", "unitname"], "loc": ["gemlocationid", "locationid"],
        "uid": ["gemunitphaseid", "gemunitid", "unitphaseid"], "type": ["type"], "tech": ["technology"], "fuel": ["fuel", "fuelcombustiononly"],
        "mw": ["capacitymw", "capacity"], "status": ["status"], "owner": ["owners", "owner"], "start": ["startyear"],
        "lat": ["latitude", "lat"], "lon": ["longitude", "lon", "lng"], "acc": ["locationaccuracy"]}
OPERATING, CLOSED = {"operating"}, {"retired", "mothballed"}

def norm_head(h): return re.sub(r"[^a-z0-9]", "", str(h or "").lower())

def read_table(path):
    """(başlıklar, satır üreteci): xlsx'te en çok satırı olan sayfa, csv'de dosyanın kendisi"""
    if path.lower().endswith((".csv", ".csv.gz")):
        # Excel'in Türkçe ayarıyla kaydedilen csv: ";" ayraçlı ve Windows-1254 kodlu olabilir
        raw = open(path, "rb").read()
        try: txt = raw.decode("utf-8-sig")
        except UnicodeDecodeError: txt = raw.decode("cp1254")
        dl = ";" if txt.split("\n", 1)[0].count(";") > txt.split("\n", 1)[0].count(",") else ","
        r = csv.reader(txt.splitlines(), delimiter=dl); head = next(r); return head, r
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = max(wb.worksheets, key=lambda s: s.max_row or 0)
    print(f"Sayfa: {ws.title} ({ws.max_row} satır); diğerleri: {[s.title for s in wb.worksheets if s is not ws]}")
    it = ws.iter_rows(values_only=True); head = list(next(it)); return head, it

def extract(a):
    head, rows = read_table(a.extract); hn = [norm_head(h) for h in head]
    idx = {}
    for k, cands in COLS.items():
        for c in cands:
            if c in hn: idx[k] = hn.index(c); break
    print("Başlıklar:", head)
    print("Eşlenen sütunlar:", {k: head[i] for k, i in idx.items()})
    miss = [k for k in ("country", "type", "mw", "status", "lat", "lon") if k not in idx]
    if miss: sys.exit(f"Gerekli sütunlar bulunamadı: {miss}")
    names = COUNTRY_NAMES.get(a.country, {a.country.lower()}); out, types, stats = [], {}, {}
    for r in rows:
        if not r or len(r) <= idx["country"]: continue
        if str(r[idx["country"]] or "").strip().lower() not in names: continue
        g = {k: (r[i] if i < len(r) else None) for k, i in idx.items()}; g.pop("country")
        for k in list(g):
            v = g[k]
            if isinstance(v, str): v = v.strip()
            if v in ("", None, "not found", "unknown"): g.pop(k); continue
            g[k] = v
        out.append(g); t = (g.get("type"), g.get("fuel") if g.get("type") == "oil/gas" else None)
        types[str(t)] = types.get(str(t), 0) + 1; stats[g.get("status")] = stats.get(g.get("status"), 0) + 1
    print(f"{a.country}: {len(out)} birim/faz"); print("  tür:", types); print("  durum:", stats)
    if not out: sys.exit("Ülkenin satırı yok (ülke adı farklı yazılmış olabilir).")
    release = a.release or re.sub(r"[-_]+", " ", os.path.splitext(os.path.basename(a.extract))[0])
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    json.dump({"source": "Global Integrated Power Tracker, Global Energy Monitor", "license": "CC BY 4.0",
               "release": release, "extracted": datetime.now(timezone.utc).strftime("%Y-%m-%d"), "country": a.country,
               "units": out}, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"), default=str)
    print(f"Yazıldı: {a.out}")

# --- birleştirme ---
def kind(u):
    t = str(u.get("type", "")).lower(); f = str(u.get("fuel", "")).lower(); te = str(u.get("tech", "")).lower()
    if "wind" in t: return "w"
    if "solar" in t: return "s"
    if "hydro" in t: return "h"
    if "nuclear" in t: return "n"
    if "geothermal" in t: return "j"
    if "bio" in t or "waste" in t: return "b"
    if "coal" in t: return "c"
    if "oil" in t or "gas" in t:
        return "g" if ("gas" in f or "lng" in f or ("gas" in t and "oil" not in t) or (not f and "oil" not in te)) else "o"
    if "storage" in t or "battery" in t: return "e"
    return "x"

GROUP = {"g": "go", "o": "go"}
# eşleştirme yarıçapı (km), konumu kesin olan GEM kaydı için; yaklaşık konumda ad benzerliği şartıyla 3 katı
RADIUS = {"w": 6, "s": 3, "h": 5, "n": 5}
TR_MAP = str.maketrans("çğıöşüâîûİI", "cgiosuaiuii")
STOP = set("""res ges hes jes des dgkc dgks tes ruzgar gunes enerji enerjisi santrali santral santralı elektrik uretim
hidroelektrik baraji baraj regulator regulatoru termik dogalgaz kombine cevrim jeotermal biyokutle biyogaz wind farm power
plant station solar pv park project phase hydroelectric hydropower dam thermal combined cycle gas geothermal biomass
biogas nuclear coal fired energy unite unit ve and of the""".split())

def toks(s):
    s = str(s or "").lower().translate(TR_MAP); return [t for t in re.findall(r"[a-z0-9]+", s) if t not in STOP]

# santral ya da ünite ayırıcıları: Roma ve Arap rakamları, tek harf (Kovada I / Kovada II, Soma A / Soma B)
DESIG = re.compile(r"^(?:[ivx]{1,4}|\d{1,3}|[a-h])$")

def sim(a, b):
    """ad benzerliği 0…1: ortak anlamlı sözcük oranı (biri ötekinin en az 4 harflik öneki olan sözcükler de sayılır);
    ortak sözcük yoksa yalnızca yazımı çok yakın adlar (ör. Türkçe/İngilizce harf farkı). İki adda da ayırıcı varsa ve
    farklıysa (Kovada I ile Kovada II) benzerlik en çok 0,4 olur; yalnızca birinde varsa (GEM "Soma", OSM "Soma B")
    düşürülmez, çünkü GEM aynı konumdaki santralleri tek kayıtta toplar."""
    wa, wb = set(toks(a)), set(toks(b))
    da, db = {t for t in wa if DESIG.match(t)}, {t for t in wb if DESIG.match(t)}
    ta, tb = wa - da, wb - db
    if not ta or not tb: return 0.0
    v = _sim(ta, tb)
    return min(v, 0.4) if da and db and da != db else v

def _sim(ta, tb):
    hit = lambda t, other: any(t == u or (min(len(t), len(u)) >= 4 and (t.startswith(u) or u.startswith(t))) for u in other)
    ov = min(sum(hit(t, tb) for t in ta), sum(hit(t, ta) for t in tb)) / min(len(ta), len(tb))
    if ov: return ov
    r = difflib.SequenceMatcher(None, " ".join(sorted(ta)), " ".join(sorted(tb))).ratio()
    return r if r >= 0.8 else 0.0

def km(la1, lo1, la2, lo2):
    p = math.pi / 180; x = (lo2 - lo1) * p * math.cos((la1 + la2) / 2 * p); y = (la2 - la1) * p
    return 6371 * math.hypot(x, y)

def num(v):
    try: return float(str(v).replace(",", "."))
    except (TypeError, ValueError): return None

def plants_from(units, want=OPERATING):
    """verilen durumdaki birimleri GEM konum kimliğine (yoksa ada ve konuma) göre santrale topla"""
    by = {}
    for u in units:
        if str(u.get("status", "")).lower() not in want: continue
        la, lo, mw = num(u.get("lat")), num(u.get("lon")), num(u.get("mw")) or 0
        if la is None or lo is None: continue
        k = kind(u); key = (u.get("loc") or f"{u.get('plant')}|{round(la, 2)}|{round(lo, 2)}", k)
        p = by.get(key)
        if not p:
            p = by[key] = {"lat": la, "lon": lo, "k": k, "mw": 0.0, "n": u.get("plant") or "", "acc": str(u.get("acc", "")).lower(),
                           "ow": u.get("owner"), "y": None, "loc": u.get("loc"), "units": 0, "big": -1}
        p["mw"] += mw; p["units"] += 1
        if mw > p["big"]: p["big"] = mw; p["ow"] = u.get("owner") or p["ow"]
        y = num(u.get("start"))
        if y and (p["y"] is None or y < p["y"]): p["y"] = int(y)
    for p in by.values(): p["mw"] = round(p["mw"], 1); p.pop("big")
    return {k: p for k, p in by.items() if p["mw"] > 0}

def gem_plants(units):
    """(işletmedeki santraller, kapanmış santraller: hiçbir birimi işletmede olmayıp emekli ya da bekletmede olanlar)"""
    op = plants_from(units); cl = plants_from(units, CLOSED)
    return list(op.values()), [p for k, p in cl.items() if k not in op]

def strip(rows, gone=()):
    """önceki GEM birleştirmesini geri al: yalnızca GEM satırlarını sil, eşleşenlerin OSM gücünü, katılanları ve kapandığı
    için çıkarılanları (gone) geri koy"""
    out = [list(r[:6]) for r in gone]
    for r in rows:
        x = r[6] if len(r) > 6 and isinstance(r[6], dict) else None
        if not x: out.append(r); continue
        if x.get("s") == "g": continue
        out.append(r[:3] + [x.get("om"), x.get("on", r[4]), r[5]]); out += [list(f) for f in x.get("f", [])]
    # sıra eşleştirmede eşitlikleri bozar: her çalıştırmada aynı olsun (betik aynı dosyada tekrar çalışınca aynı sonuç)
    return sorted(out, key=lambda r: (-(r[3] or 0), r[0], r[1], r[2], r[4] or ""))

def candidates(gem, osm):
    pairs = []
    for gi, g in enumerate(gem):
        R = RADIUS.get(g["k"], 3); exact = g["acc"].startswith("exact"); grp = GROUP.get(g["k"], g["k"])
        for o in osm:
            if GROUP.get(o["k"], o["k"]) != grp or abs(o["lat"] - g["lat"]) > 0.5: continue
            d = km(g["lat"], g["lon"], o["lat"], o["lon"])
            if d > 3 * R: continue
            s = sim(g["n"], o["n"])
            # gücü birebir aynı (%3 içinde, en az 20 MW) ise ad farklı olsa da aynı santral sayılır (ör. OSM "Acwa Power
            # Kırıkkale", GEM "Yahsihan power station", ikisi de 927,4 MW, 8 km)
            cap = bool(o["mw"] and g["mw"] >= 20 and abs(o["mw"] - g["mw"]) <= 0.03 * g["mw"])
            if cap: s = max(s, 0.6)
            # adı benzemiyor ve gücü üç kattan çok farklı: büyük olasılıkla yan yana iki ayrı santral
            if s < 0.3 and o["mw"] and not (1 / 3 <= g["mw"] / o["mw"] <= 3): continue
            ok = (d <= R and (s >= 0.3 or d <= R / 2 or not o["n"])) if exact else (d <= R and s >= 0.3)
            if not ok and d <= 3 * R and s >= 0.6: ok = True  # konum farklı ama ad aynı (ör. baraj gövdesi ile santral binası)
            if ok: pairs.append((d / R - s, gi, o["i"], d, s))
    return sorted(pairs)

def merge(rows, gem, closed=()):
    osm = [dict(i=i, lat=r[0], lon=r[1], k=r[2], mw=r[3], n=r[4], t=r[5]) for i, r in enumerate(rows)]
    pairs = candidates(gem, osm); gm, om = {}, {}
    for _, gi, oi, d, s in pairs:
        if gi in gm or oi in om: continue
        gm[gi] = oi; om[oi] = gi
    # aynı santralin parçası olan diğer OSM kayıtları (eşleşen GEM santralinin iki yarıçap içinde, adı çok benzer;
    # GEM aynı konumdaki santralleri tek kayıtta toplar: Afşin-Elbistan A ve B)
    fold = {}
    for _, gi, oi, d, s in pairs:
        if oi in om or oi in fold or gi not in gm: continue
        if s >= 0.6 and d <= 2 * RADIUS.get(gem[gi]["k"], 3): fold[oi] = gi
    # GEM'de kapanmış (emekli, bekletmede) bir santrale yakın ve adı benzer olup işletmedeki hiçbir GEM santraliyle
    # eşleşmeyen OSM kayıtları çıkarılır (OSM'de kapanan santraller çoğu zaman silinmez); ad şartı daha sıkı
    gone, used = set(), set()
    for _, gi, oi, d, s in candidates(list(closed), [o for o in osm if o["i"] not in om and o["i"] not in fold]):
        if gi in used or oi in gone or s < 0.8 or d > RADIUS.get(closed[gi]["k"], 3): continue
        gone.add(oi); used.add(gi); print(f"  kapanmış: {rows[oi][4]!r} ({rows[oi][3]} MW) ← GEM {closed[gi]['n']!r}, {d:.1f} km")
    for oi, gi in fold.items(): print(f"  katıldı: {rows[oi][4]!r} → GEM {gem[gi]['n']!r}")
    weak = sorted((s, d, gi, oi) for _, gi, oi, d, s in pairs if gm.get(gi) == oi and s < 0.3)
    print(f"  ad benzerliği zayıf eşleşme (yalnızca yakınlıkla): {len(weak)}")
    for s, d, gi, oi in weak[:15]: print(f"    {rows[oi][4]!r} ↔ GEM {gem[gi]['n']!r}, {d:.1f} km")
    out, st = [], {"matched": len(gm), "folded": len(fold), "closed": len(gone), "gem_only": 0, "osm_only": 0, "mw_changed": 0}
    extra = {gi: [] for gi in gm}
    for oi, gi in fold.items(): extra[gi].append(rows[oi][:6])
    for o in osm:
        r = rows[o["i"]][:6]
        if o["i"] in fold or o["i"] in gone: continue
        if o["i"] in om:
            g = gem[om[o["i"]]]; x = {"s": "m", "om": r[3]}
            if not r[4] and g["n"]: x["on"] = r[4]  # OSM'de adsız: GEM adı yazılır, eski hâli saklanır
            if extra.get(om[o["i"]]): x["f"] = extra[om[o["i"]]]
            if g.get("ow"): x["ow"] = str(g["ow"])[:120]
            if g.get("y"): x["y"] = g["y"]
            if r[3] != g["mw"]: st["mw_changed"] += 1
            out.append([r[0], r[1], r[2], g["mw"], r[4] or g["n"], r[5], x])
        else: out.append(r); st["osm_only"] += 1
    for gi, g in enumerate(gem):
        if gi in gm: continue
        x = {"s": "g"}
        if g.get("ow"): x["ow"] = str(g["ow"])[:120]
        if g.get("y"): x["y"] = g["y"]
        out.append([round(g["lat"], 4), round(g["lon"], 4), g["k"], g["mw"], g["n"], 0, x]); st["gem_only"] += 1
    out.sort(key=lambda r: -(r[3] or 0))
    return out, st, [rows[i][:6] for i in sorted(gone)]

def summary(rows):
    counts, mws, known = {}, {}, {}
    for r in rows:
        counts[r[2]] = counts.get(r[2], 0) + 1
        if r[3]: mws[r[2]] = round(mws.get(r[2], 0) + r[3], 1); known[r[2]] = known.get(r[2], 0) + 1
    return counts, mws, known

def apply(a):
    gx = json.load(open(a.apply, encoding="utf-8")); a3 = gx["country"]; base = a.plants
    fp = f"{base}/{a3}.json"; d = json.load(open(fp, encoding="utf-8"))
    rows = strip(d["p"], d.pop("x", [])); _, before, _ = summary(rows)
    gem, closed = gem_plants(gx["units"]); gem_mw = {}
    for g in gem: gem_mw[g["k"]] = round(gem_mw.get(g["k"], 0) + g["mw"], 1)
    rows, st, gone = merge(rows, gem, closed); counts, mws, known = summary(rows)
    st["gem_plants"] = len(gem)
    print(f"{a3}: {len(gem)} işletmedeki GEM santrali; eşleşme özeti:", json.dumps(st))
    print(f"{'tür':4} {'ETKB 09/26':>10} {'OSM':>14} {'GEM':>14} {'birleşik':>14}")
    for k in sorted(set(before) | set(mws) | set(KURULU), key=lambda k: -KURULU.get(k, 0)):
        t = KURULU.get(k); f = lambda v: f"{round(v or 0):>7}" + (f" (%{round((v or 0) / t * 100):>3})" if t else "       ")
        print(f"{k:4} {t or '—':>10} {f(before.get(k))} {f(gem_mw.get(k))} {f(mws.get(k))}")
    d["meta"].update({"counts": counts, "mw": mws, "withCapacity": known,
                      "gem": {"release": gx["release"], "license": gx["license"], "extracted": gx["extracted"], **st}})
    d["p"] = rows
    if gone: d["x"] = gone  # GEM'e göre kapanmış santraller: haritada gösterilmez, sonraki birleştirmede geri konur
    json.dump(d, open(fp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    ip = f"{base}/index.json"; ix = json.load(open(ip, encoding="utf-8"))
    la = [r[0] for r in rows]; lo = [r[1] for r in rows]
    cells = sorted({(int(math.floor(r[0] / 5)) + 18) * 72 + int(math.floor(r[1] / 5)) + 36 for r in rows})
    ix["c"][a3] = {"n": len(rows), "counts": counts, "mw": mws, "bb": [min(lo), min(la), max(lo), max(la)], "g": cells, "gem": 1}
    ix["meta"]["gem"] = {"source": gx["source"], "license": gx["license"], "release": gx["release"],
                         "countries": sorted(set(ix["meta"].get("gem", {}).get("countries", [])) | {a3})}
    json.dump(ix, open(ip, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    wp = f"{base}/world.json"; w = json.load(open(wp, encoding="utf-8"))
    w["p"] = [r for r in w["p"] if r[6] != a3] + [r[:6] + [a3] + r[6:] for r in rows if (r[3] or 0) >= WORLD_MW]
    w["p"].sort(key=lambda r: -(r[3] or 0))
    json.dump(w, open(wp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"Yazıldı: {fp} ({len(rows)} santral), index.json, world.json")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--extract", help="GIPT dosyası (xlsx ya da csv)"); ap.add_argument("--country", default="TUR")
    ap.add_argument("--out", help="ara dosya (ör. data/gem/gipt-TUR.json)"); ap.add_argument("--release", help="sürüm adı (ör. September 2026)")
    ap.add_argument("--apply", help="ara dosya"); ap.add_argument("plants", nargs="?", default="public/data/plants")
    a = ap.parse_args()
    if a.extract: extract(a)
    if a.apply: apply(a)
    if not a.extract and not a.apply: ap.print_help()

if __name__ == "__main__":
    main()
