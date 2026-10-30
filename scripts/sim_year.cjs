// Oyunu tarayıcıda ekransız çalıştırıp bir piyasada bir GES ve bir RES ile N gün simüle eder; kalibrasyon ve vaka
// çalışmasındaki göstergeleri yazdırır: ortalama fiyat, güneş ve rüzgâr fiyat oranı (capture rate), kısıntı, kapasite
// faktörü, öğle fiyatı (11–14), WACC %8/%10/%12'de proje ekonomisi ve proje finansmanı (spot / PPA, baz / fiyat stresi;
// src/finance.js). Oyun normal (rakipler yatırım yapar), olay kartları kapalı. 120 oyun günü = bir takvim yılı.
// Kullanım: önce `npx vite --port 5181`, sonra
//   node scripts/sim_year.cjs 120 37.9,32.5 40.1,26.4            (Türkiye: Konya GES, Çanakkale RES)
//   node scripts/sim_year.cjs 120 39.5,-3.5 53.8,9.5             (Avrupa: İspanya iç kesim GES, Kuzey Almanya RES)
// Gerekenler: playwright (npm i -D playwright) ve bir Chromium; arazi eğimi için AWS Terrain Tiles'a ağ erişimi.
// Sonuçlar oyunun hava modeli ve rastgelelik nedeniyle koşudan koşuya değişir.
const { chromium } = require("playwright");
const [DAYS, G, W, URL] = [+process.argv[2] || 120, (process.argv[3] || "37.9,32.5").split(",").map(Number), (process.argv[4] || "40.1,26.4").split(",").map(Number), process.argv[5] || "http://localhost:5181/sebeke-oyun/"];
(async () => {
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem("sebeke-profile-v1", JSON.stringify({ name: "Sim", company: "Sim", color: "#1F9D74", spec: "eng", created: 1 })); });
  await p.goto(URL); await p.waitForTimeout(5000);
  const r = await p.evaluate(async ([DAYS, G, W]) => {
    const cfg = await import("/src/config.js"), st = await import("/src/state.js"), ac = await import("/src/actions.js"), sim = await import("/src/sim.js"), sl = await import("/src/slope.js"), F = await import("/src/finance.js");
    const S = st.S; S.money = 9e12; S.won = true; S.evCool = 1e9; Object.keys(S.mSolar).forEach(k => S.mSolar[k] = cfg.REG[k].s0);
    document.querySelectorAll("dialog[open]").forEach(d => d.close()); document.getElementById("pauseBtn")?.click();
    // düz ve izinli bir nokta bulana kadar yakın çevrede dene; izin hemen verilir, standart ekipman
    const mk = async (lat0, lon0, k) => { let id = null; for (let i = 0; i < 12 && !id; i++) { const lat = +(lat0 + (i % 4) * 0.08).toFixed(4), lon = +(lon0 + Math.floor(i / 4) * 0.08).toFixed(4); await sl.slopeOf(lat, lon); S.sel = { id: null, lat, lon }; ac.buyLand(); id = S.sel.id; }
      if (!id) throw new Error("Uygun saha bulunamadı: " + lat0 + "," + lon0); S.sites[id].permit = "ok"; ac.build(id, k, "std"); return S.plants.find(q => q.t === id && q.k === k); };
    const ges = await mk(G[0], G[1], "ges"), res = await mk(W[0], W[1], "res"), MK = S.sites[ges.t].mreg;
    let B = 0, curt = 0, mid = 0;
    for (let d = 0; d < DAYS; d++) { const pr = st.D[MK].price; B += pr.reduce((a, v) => a + v, 0) / 24; mid += (pr[11] + pr[12] + pr[13] + pr[14]) / 4; for (let h = 0; h < 24; h++) sim.tick(); document.querySelectorAll("dialog[open]").forEach(x => x.close()); curt += S.last ? S.last.curt : 0; }
    const base = B / DAYS, g = ges.ac, w = res.ac, fin = {};
    for (const x of [0.08, 0.10, 0.12]) { F.setWacc(x); const one = q => { const f = F.plantFinance(q); return { lcoe: +f.lcoe.toFixed(1), npv: Math.round(f.npv), irr: f.irr == null ? null : +f.irr.toFixed(4), pb: f.pb == null ? null : +f.pb.toFixed(2), capex: Math.round(f.capex) }; }; fin[x] = { ges: one(ges), res: one(res) }; }
    F.setWacc(0.10);F.resetPf();
    // proje finansmanı (varsayılan varsayımlarla): spot ve PPA, baz ve spot fiyat −%20 stres
    const pfOf=q=>{const o={};for(const m of ["spot","ppa"])for(const st of [0,0.2]){const r=F.projectFinance(q,m,MK,st);o[m+(st?"_stres":"")]={gear:+r.gear.toFixed(3),debt:Math.round(r.debt),minDscr:r.minDscr==null?null:+r.minDscr.toFixed(2),projIrr:r.projIrr==null?null:+r.projIrr.toFixed(4),eqIrr:r.eqIrr==null?null:+r.eqIrr.toFixed(4),eqPb:r.eqPb==null?null:+r.eqPb.toFixed(1),ppaPrice:r.ppaPrice==null?null:+r.ppaPrice.toFixed(1)};}return o;};
    const pfin={ges:pfOf(ges),res:pfOf(res)};
    return { market: MK, days: DAYS, base: +base.toFixed(1), mid: +(mid / DAYS).toFixed(1),
      solar: { price: +(g.r / g.e).toFixed(1), capture: +(g.r / g.e / base).toFixed(3), captureMarket: +(g.r / (g.e + curt) / base).toFixed(3), curtailPct: +(curt / (g.e + curt) * 100).toFixed(1), cf: +(g.e / g.cap).toFixed(3) },
      wind: { price: +(w.r / w.e).toFixed(1), capture: +(w.r / w.e / base).toFixed(3), cf: +(w.e / w.cap).toFixed(3) }, fin, pfin };
  }, [DAYS, G, W]);
  console.log(JSON.stringify(r, null, 1)); await b.close();
})();
