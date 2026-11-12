// Güneş üretiminin bulut düzeltme tablosu (src/data/cloudk.js). Oyunun hava modeli sahanın iklim bulutluluğuna (siteBase)
// geçen sistemlerin bulutunu ekler; alçak basınçların sık geçtiği orta enlemlerde (Avrupa) ortalama bulut iklim değerinin
// üstünde kalır. Yıllık ışınım zaten haritadan (GHI) geldiği için bu, üretimi ikinci kez düşürür. Bu betik hava modelini iki
// oyun yılı (240 gün, gün başına 24 saat) tohumlu çalıştırır ve 5°×10° ızgarada üretim ağırlıklı (gün eğrisi × öğle
// yüksekliği) ortalama bulut çarpanını (sunRel, 1,25 tavanlı) ölçer. Üretim bu değere bölünür: uzun dönemde ortalama 1 olur.
// Kullanım: npx vite --port 5184 &  sonra  node scripts/gen_cloudk.cjs http://localhost:5184/sebeke-oyun/ [gün=240] [tohum...]
// Çıktı: src/data/cloudk.js (tohumların ortalaması) ve ekrana birkaç sahanın değeri.
const { chromium } = require("playwright"), fs = require("fs"), path = require("path");
const URL0 = process.argv[2] || "http://localhost:5184/sebeke-oyun/", DAYS = +(process.argv[3] || 240), SEEDS = (process.argv.slice(4).length ? process.argv.slice(4) : ["11", "22", "33"]).map(Number);
const LAT0 = -55, LAT1 = 70, DLAT = 5, LON0 = -180, DLON = 10, NLAT = (LAT1 - LAT0) / DLAT + 1, NLON = 360 / DLON;
(async () => {
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage();
  await p.route(/fonts\.g|tile|arcgis|maptiler|openstreetmap|openfreemap|cartocdn|amazonaws/, r => r.abort());
  await p.goto(URL0); await p.waitForTimeout(3000);
  const r = await p.evaluate(async ([DAYS, SEEDS, LAT0, DLAT, NLAT, LON0, DLON, NLON]) => {
    const wx = await import("/src/weather.js"), cal = await import("/src/calendar.js"), ut = await import("/src/utils.js"), w = await import("/src/world.js");
    const pts = []; for (let i = 0; i < NLAT; i++) for (let j = 0; j < NLON; j++) { const lat = LAT0 + i * DLAT, lon = LON0 + j * DLON, solar = Math.max(0.12, Math.min(1, w.ghiAt(lat, lon) / 9));
      pts.push({ lat, lon, base: { cloud: wx.siteBase({ lat, lon, solar }).cloud } }); }
    const acc = pts.map(() => [0, 0]), save = [cal.CAL.decl];
    for (const seed of SEEDS) { const W = wx.initWx(seed);
      for (let d = 1; d <= DAYS; d++) { cal.setCalendar(d); wx.setSeason(cal.CAL.decl, cal.doyOf(cal.CAL.date));
        for (let h = 0; h < 24; h++) { const sh = ut.shape(h);
          if (sh > 0) pts.forEach((q, i) => { const a = sh * cal.noonAmp(q.lat, cal.CAL.decl); if (a <= 0) return; const s = wx.sampleWx(W, q.lat, q.lon, q.base), sr = Math.min(1.25, wx.clearFactor(s.c) / wx.clearFactor(q.base.cloud)); acc[i][0] += a * sr; acc[i][1] += a; });
          wx.stepWx(W, 1); } } }
    return pts.map((q, i) => +(acc[i][0] / acc[i][1]).toFixed(3));
  }, [DAYS, SEEDS, LAT0, DLAT, NLAT, LON0, DLON, NLON]);
  await b.close();
  const rows = []; for (let i = 0; i < NLAT; i++) rows.push("[" + r.slice(i * NLON, (i + 1) * NLON).join(",") + "]");
  const out = `// Güneş üretiminin bulut düzeltmesi (scripts/gen_cloudk.cjs ile üretildi; elle düzenlemeyin). Hava modelinin üretim ağırlıklı
// ortalama bulut çarpanı (sunRel): ${LAT0}…${LAT1}° enlem ${DLAT}° adımla (satırlar), ${LON0}…${LON0 + 360 - DLON}° boylam ${DLON}° adımla (sütunlar).
// ${DAYS} oyun günü × ${SEEDS.length} tohum (${SEEDS.join(", ")}). Üretim bu değere bölünür (weather.js sunRel): yıllık üretim ışınım haritasını izler.
export const CLOUDK={lat0:${LAT0},dlat:${DLAT},lon0:${LON0},dlon:${DLON},k:[\n${rows.join(",\n")}]};\n`;
  fs.writeFileSync(path.join(__dirname, "..", "src", "data", "cloudk.js"), out);
  const at = (la, lo) => { const i = Math.round((la - LAT0) / DLAT), j = ((Math.round((lo - LON0) / DLON) % NLON) + NLON) % NLON; return r[i * NLON + j]; };
  const all = r.filter(x => isFinite(x)), mean = all.reduce((a, x) => a + x, 0) / all.length;
  console.log(JSON.stringify({ min: Math.min(...all), max: Math.max(...all), mean: +mean.toFixed(3), Konya: at(37.9, 32.5), Ispanya: at(39.5, -3.5), Brandenburg: at(52.3, 13.9), Bavyera: at(48.3, 11.8), Teksas: at(31, -100), Sahra: at(25, 5), Avustralya: at(-25, 135), Sili: at(-23, -70), Norvec: at(60, 10) }));
})();
