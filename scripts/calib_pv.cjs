// Güneş üretimi ölçümü: verilen noktalarda birer GES kurar, N gün işletir ve her biri için yazar: kısıntı öncesi ve sonrası
// kapasite faktörü, kısıntı payı (fiyat ≤ 0 saatlerde üretilmeyen), bulut çarpanının (sunRel) ortalaması ve tavana takılan saat
// payı; ayrıca Avrupa ve İberya piyasasının kendi güneş profiliyle (sunP) fiyat ≤ 0 saatlerdeki güneş payı (piyasa geneli).
// Kullanım: npx vite --port 5184 &  sonra
//   node scripts/calib_pv.cjs 120 "37.9,32.5;39.5,-3.5;52.3,13.9;48.3,11.8" http://localhost:5184/sebeke-oyun/
const { chromium } = require("playwright");
const DAYS = +(process.argv[2] || 120), PTS = (process.argv[3] || "37.9,32.5;39.5,-3.5;52.3,13.9;48.3,11.8").split(";").map(s => s.split(",").map(Number)), URL0 = process.argv[4] || "http://localhost:5184/sebeke-oyun/";
(async () => {
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem("sebeke-profile-v1", JSON.stringify({ name: "Sim", company: "Sim", color: "#1F9D74", spec: "eng", created: 1 })); });
  await p.goto(URL0); await p.waitForTimeout(4000);
  const u = await p.evaluate(() => performance.getEntriesByType("resource").map(e => e.name).filter(n => /\/src\/[\w/]+\.js/.test(n)));
  const r = await p.evaluate(async ([u, DAYS, PTS]) => {
    const imp = n => import(u.find(x => new URL(x).pathname.endsWith("/src/" + n)) || ("/src/" + n));
    const st = await imp("state.js"), sl = await imp("slope.js"), ac = await imp("actions.js"), sim = await imp("sim.js"), mk = await imp("market.js"), wx = await imp("weather.js"), ws = await imp("wxsite.js"), cfg = await imp("config.js"), S = st.S;
    S.money = 1e12; S.won = true; S.evCool = 1e9; S.fitDone = 1; S.hyd = {}; for (let y = 2026; y <= 2035; y++) S.hyd[y] = { w: 1, ref: 0 }; Object.keys(S.mSolar).forEach(k => S.mSolar[k] = cfg.REG[k].s0);
    const close = () => document.querySelectorAll("dialog[open]").forEach(d => d.close()); close();
    // düz ve izinli bir nokta bulana kadar yakın çevrede dene (sim_year.cjs ile aynı yol: arazi alımı, izin hemen, standart ekipman)
    const mkP = async (lat0, lon0) => { let id = null; for (let i = 0; i < 12 && !id; i++) { const lat = +(lat0 + (i % 4) * 0.08).toFixed(4), lon = +(lon0 + Math.floor(i / 4) * 0.08).toFixed(4); await sl.slopeOf(lat, lon); S.sel = { id: null, lat, lon }; ac.buyLand(); id = S.sel.id; }
      if (!id) return null; S.sites[id].permit = "ok"; ac.build(id, "ges", "std"); return S.plants.find(q => q.t === id && q.k === "ges") || null; };
    const ps = []; for (const [la, lo] of PTS) { const q = await mkP(la, lo); if (q) ps.push(q); }
    const A = ps.map(() => ({ pre: 0, post: 0, cap: 0, sr: 0, n: 0, hit: 0, preNeg: 0 })), M = { E: { s: 0, n: 0 }, I: { s: 0, n: 0 } };
    for (let d = 0; d < DAYS; d++) {
      S.hour = 0; if (d) sim.newDay(); close(); ps.forEach(q => q.down = false);
      for (const k of ["E", "I"]) { const D = st.D[k]; D.price.forEach((x, h) => { const s = D.sunP[h] || 0; M[k].n += s; if (x <= 0) M[k].s += s; }); }
      for (let h = 0; h < 24; h++) {
        const pre = ps.map(q => mk.production(q, h).e), e0 = ps.map(q => q.ac ? q.ac.e : 0);
        ps.forEach((q, i) => { const t = S.sites[q.t], W = ws.siteWx(t, h); if (pre[i] > 0) { const sr = wx.clearFactor(W.c) / wx.clearFactor(W.base.cloud); A[i].sr += Math.min(1.25, sr); A[i].n++; if (sr > 1.25) A[i].hit++; } if (st.D[t.mreg].price[h] <= 0) A[i].preNeg += pre[i]; });
        sim.tick(); close();
        ps.forEach((q, i) => { A[i].pre += pre[i]; A[i].post += q.ac.e - e0[i]; A[i].cap += q.mw; });
      }
    }
    const out = ps.map((q, i) => { const t = S.sites[q.t], a = A[i]; return { lat: t.lat, lon: t.lon, a3: t.a3, m: t.mreg, ghi: +(t.solar * 9).toFixed(2), cloud: +wx.siteBase(t).cloud.toFixed(3), cfPre: +(a.pre / a.cap).toFixed(4), cfPost: +(a.post / a.cap).toFixed(4), curt: +(1 - a.post / a.pre).toFixed(3), negShare: +(a.preNeg / a.pre).toFixed(3), sunRel: +(a.sr / a.n).toFixed(3), clampHit: +(a.hit / a.n).toFixed(3) }; });
    return { days: DAYS, plants: out, market: { E: +(M.E.s / M.E.n).toFixed(3), I: +(M.I.s / M.I.n).toFixed(3) } };
  }, [u, DAYS, PTS]);
  console.log(JSON.stringify(r)); await b.close();
})();
