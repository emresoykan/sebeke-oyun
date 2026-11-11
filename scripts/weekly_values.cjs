// Haftalık güncellemede gözden geçirilecek gerçek dünya değerleri: oyunda kullanılan tarife, fiyat ve kural değerlerini
// kaynak tarihleriyle tek listede yazar (config.js'ten okunur; support.js tarayıcı modüllerine bağlı olduğu için metinden).
// Kullanım: node scripts/weekly_values.cjs
const path = require("path"), fs = require("fs"), { pathToFileURL } = require("url");
const ROOT = path.resolve(__dirname, "..");
(async () => {
  const c = await import(pathToFileURL(path.join(ROOT, "src/config.js")).href);
  const sup = fs.readFileSync(path.join(ROOT, "src/support.js"), "utf8"), news = fs.readFileSync(path.join(ROOT, "src/data/realnews.js"), "utf8");
  const tr = (x, d = 1) => (+x).toFixed(d).replace(".", ",");
  const rows = [
    ["YEKDEM (Türkiye)", `${tr(c.YEKDEM.p)} $/MWh, depolamalı ${tr(c.YEKDEM.store)} $/MWh (${c.YEKDEM.asOf})`, "EPİAŞ YEKDEM tablosu her ay; başvuru 30 Kasım", "src/config.js YEKDEM"],
    ["Türkiye fiyat düzeyi", `REG.T.mult ${c.REG.T.mult} (hedef EPİAŞ 2025 ortalaması 66,4 $/MWh)`, "çeyreklik: EPİAŞ PTF, docs/kalibrasyon.md", "src/config.js REG"],
    ["Türkiye azami fiyat", `${c.REG.T.cap} $/MWh (4.500 TL, 2026 kuruyla)`, "EPİAŞ PTF'de en yüksek değer; EPDK azami fiyat kararı değişince", "src/config.js REG.T.cap"],
    ["Hidrolojik yıl", Object.entries(c.HYDRO.known).map(([y, w]) => `${y}: w ${w}`).join(", ") + " (tahmin)", "TEİAŞ aylık hidro; yıllık veri çıkınca kesinleştir", "src/config.js HYDRO"],
    ["YEKA", `RES ${tr(c.YEKA.res.ec, 2)} / GES ${tr(c.YEKA.ges.ec, 2)} €c/kWh → ${tr(c.YEKA.res.p)} / ${tr(c.YEKA.ges.p)} $/MWh (ref PTF ${tr(c.YEKA.ref, 2)}, €/$ ${c.YEKA.eur})`, "Bakanlık YEKA duyuruları; yeni tur ya da deniz üstü YEKA", "src/config.js YEKA"],
    ["Bağlantı kapasitesi", `${c.GRID.quota} MW/yıl, kapanış ${c.GRID.close[1]}.${c.GRID.close[0] + 1}`, "TEİAŞ lisanssız kapasite duyuruları, EPDK kararları", "src/config.js GRID"],
    ["Başlangıç desteği (oyun)", `${c.FIT.p} $/MWh, ${c.FIT.years} ekonomik yıl`, "oyun kuralı (gerçek karşılığı yok)", "src/config.js FIT"],
    ["Yatırım katsayıları", Object.entries(c.CAPEX_M.ges).map(([m, x]) => `${m} ×${tr(x, 3)}`).join(", ") + " (GES)", "IRENA yıllık maliyet raporu (Temmuz)", "src/config.js CAPEX_M"],
  ];
  const grab = (re) => { const m = sup.match(re); return m ? m[1] : "?"; };
  rows.push(["Kapasite ödemesi", grab(/CAP=\{[\s\S]*?src:"([^"]+)"/), "GB kapasite piyasası, PJM sonuçları", "src/support.js CAP"]);
  rows.push(["Hidrojen desteği", grab(/H2SUB=\{[\s\S]*?src:"([^"]+)"/), "Avrupa Hidrojen Bankası, ABD 45V", "src/support.js H2SUB"]);
  rows.push(["Offshore fark sözleşmesi", grab(/CFD=\{[\s\S]*?src:"([^"]+)"/), "Britanya CfD turları, Almanya WindSeeG", "src/support.js CFD"]);
  rows.push(["Almanya piyasa primi", `${grab(/EEG=\{[\s\S]*?ges:\{[^}]*?src:"([^"]+)"/)}; ${grab(/EEG=\{[\s\S]*?res:\{[^}]*?src:"([^"]+)"/)}`, "BNetzA ihale sonuçları (güneş: 1 Mart, 1 Temmuz, 1 Aralık turları; kara rüzgârı: 1 Şubat, Mayıs, Ağustos, Kasım)", "src/support.js EEG"]);
  const ids = [...news.matchAll(/id:"([^"]+)",d:"([^"]+)"/g)].map(m => m[2]).sort();
  rows.push(["Gerçek dünya haberleri", `${ids.length} haber, son tarih ${ids[ids.length - 1]}`, "haftalık başlıklar", "src/data/realnews.js"]);
  for (const [n, v, s, f] of rows) console.log(`• ${n}: ${v}\n    kontrol: ${s}\n    dosya: ${f}`);
})();
