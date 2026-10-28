// Ekonomi temposu botu: oyunu tarayıcıda ekransız, gerçek kurallarla (görevler, izin olasılıkları, rakipler, olay
// kartları, GÖP masası otomatik) baştan oynar ve portföy değerinin 0,5 / 1 / 2 / 5 M$'a kaçıncı günde ulaştığını yazar.
// Rastgelelik tohumludur (Math.random sayfa açılmadan değiştirilir): aynı tohumla senaryolar aynı hava ve fiyatlarda
// karşılaştırılır.
//
// Botun oyun tarzı (makul bir oyuncu): sırayla aday sahalara (önce Türkiye, iki sahadan sonra Avrupa) arazi alır,
// izne başvurur (reddedilirse nakit yetiyorsa Ek ÇED, yoksa normal), izinli sahada sahanın kaynağına uygun teknolojide
// (güneş ●●●+ ise GES, değilse RES) standart +5 MW blok kurar; nakit 20 b$'ın altına inmez. Yeni saha ancak açık
// sahalar dolunca alınır. Olay kartlarında ilk uygun seçeneği seçer. Batarya, offshore ve diğer teknolojileri kullanmaz.
//
// Senaryolar (--s):
//   base   bugünkü oyun (ilk projeye alım garantisi dahil: config.js FIT, 90 $/MWh taban, 5 ekonomik yıl)
//   nofit  oyunun alım garantisi kapalı (garantiden önceki oyun)
//   fit    yasal düzeyde alım garantisi (oyununki kapalı; bot içinde taklit): ilk iki saha, GES 133, RES 73 $/MWh taban
//          (5346 sayılı Kanun I sayılı cetveldeki ABD doları sent/kWh değerleri), 10 ekonomik yıl (~58 oyun günü)
//   capex  tüm yatırım maliyetleri %30 düşük (yalnızca bot içinde)
// --loan 1: ilk satıştan sonra kurulumlar banka kredili (özsermaye payı nakitten)
// Kullanım: npx vite --port 5182 &  sonra
//   node scripts/econ_bot.cjs --s base --seeds 3 --days 300 --url http://localhost:5182/sebeke-oyun/
const { chromium } = require("playwright");
const A = Object.fromEntries(process.argv.slice(2).join(" ").split("--").filter(Boolean).map(x => x.trim().split(/\s+/)));
const SCN = A.s || "base", SEEDS = +(A.seeds || 3), DAYS = +(A.days || 300), LOAN = A.loan === "1", URL0 = A.url || "http://localhost:5182/sebeke-oyun/";
// aday sahalar: [ad, enlem, boylam]; Türkiye'de güneşli ova ve rüzgârlı kıyılar, Avrupa'da İspanya iç kesimi ve Kuzey Almanya
const CAND = [["Konya", 37.9, 32.5], ["Karaman", 37.25, 33.25], ["Çanakkale", 40.1, 26.5], ["Endülüs", 37.6, -4.6], ["Kastilya", 39.4, -3.3],
  ["Schleswig", 54.4, 9.3], ["Aksaray", 38.4, 33.9], ["Balıkesir", 39.6, 27.9], ["Extremadura", 38.9, -6.3], ["Murcia", 38.0, -1.4],
  ["Niedersachsen", 53.0, 7.6], ["Burdur", 37.6, 30.1], ["Alentejo", 38.2, -7.9], ["Aragon", 41.6, -0.9], ["Mecklenburg", 53.9, 12.4],
  ["Niğde", 37.95, 34.6], ["Toledo", 39.9, -4.3], ["Sevilla", 37.3, -5.9], ["Brandenburg", 52.5, 13.9], ["Ciudad Real", 38.9, -3.9]];

async function run(b, seed) {
  const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  await p.route(/apple-mapkit|terrarium|openfreemap|fonts\.g|amazonaws/, r => r.abort());
  await p.addInitScript(sd => {
    let a = sd >>> 0; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    localStorage.clear(); localStorage.setItem("sebeke-profile-v1", JSON.stringify({ name: "Bot", company: "Bot", color: "#1F9D74", spec: "eng", created: 1 }));
  }, seed);
  if (A.dbg) p.on("console", m => { if (/^gün /.test(m.text())) console.log("   " + m.text()); });
  await p.goto(URL0); await p.waitForTimeout(4000);
  const r = await p.evaluate(async ([SCN, DAYS, LOAN, CAND, DBG]) => {
    const st = await import("/src/state.js"), ac = await import("/src/actions.js"), sim = await import("/src/sim.js"), cfg = await import("/src/config.js"),
      w = await import("/src/world.js"), ru = await import("/src/rules.js"), eq = await import("/src/equipment.js"), we = await import("/src/weather.js"), tu = await import("/src/tutorial.js"), lo = await import("/src/loans.js");
    globalThis.__dbg = DBG; const S = st.S; document.querySelectorAll("dialog[open]").forEach(d => d.close()); document.getElementById("pauseBtn")?.click();
    // GÖP masası "her gün otomatik gönder" modunda (masa açılıp kapanmadan teklif varsayılan ayarlarla gider)
    S.desk = { ratio: 1, fc: "std", batt: "arb", auto: true };
    if (SCN === "capex") for (const k in cfg.TECH) cfg.TECH[k].capex = Math.round(cfg.TECH[k].capex * 0.7);
    if (SCN === "nofit" || SCN === "fit") S.fitDone = 1;
    const FIT = { ges: 133, res: 73 }, FIT_N = 2, FIT_DAYS = Math.round(10 * lo.ECON_YEAR), fitSites = [], fitFrom = {};
    let ci = 0, extraFit = 0;
    const kindOf = t => { const ks = ru.allowed(t); const sun = ks.includes("ges") && t.solar >= 0.5, cf = we.expectedCF(we.windSpeedOf(t));
      return sun && !(ks.includes("res") && cf >= 0.34) ? "ges" : ks.includes("res") && cf >= 0.22 ? "res" : ks.includes("ges") ? "ges" : null; };
    const buyNext = () => { while (ci < CAND.length) { const [n, lat0, lon0] = CAND[ci++];
        for (let j = 0; j < 9; j++) { const lat = +(lat0 + (j % 3 - 1) * 0.12).toFixed(3), lon = +(lon0 + (Math.floor(j / 3) - 1) * 0.12).toFixed(3), t = w.describe(lat, lon);
          if (t.urban || t.sea || !t.mreg || !kindOf(t) || ru.permitProb(t) < 0.6) continue; const c = ru.landCost(t) + ru.permitFee(t);
          if (S.money < c + 20000) { ci--; return false; } S.sel = { id: null, lat, lon }; ac.buyLand(); const id = S.sel.id; if (!id) continue;
          S.sites[id].kind = kindOf(S.sites[id]); S.sites[id].bot = n; ac.applyPermit(id); if (fitSites.length < FIT_N) fitSites.push(id); return true; } }
      return false; };
    const ms = {}, hist = [];
    // pencereler oyuncu gibi kapatılır (zorla kapatmak pencere sırasını kilitler): olay kartında ilk uygun seçenek,
    // GÖP masasında "Teklifi gönder", ilk satış kartında "Piyasa", zafer ekranında "Devam et"
    const tickWait = () => new Promise(r => setTimeout(r, 0));
    const closeDlgs = async () => { for (let i = 0; i < 8; i++) { await tickWait();
      const ev = document.querySelector("#eventDlg[open]");
      if (ev) { const ok = ev.querySelector('[data-a="ok"]'); if (ok) ok.click(); else { const o = [...ev.querySelectorAll("button[data-i]")].find(x => !x.disabled) || ev.querySelector("button[data-i]"); o.disabled = false; o.click(); } continue; }
      const dk = document.querySelector("#deskDlg[open] #deskGo"); if (dk) { dk.click(); continue; }
      const fs = document.querySelector('#firstDlg[open] [data-v="mkt"]'); if (fs) { fs.click(); continue; }
      const wn = document.querySelector('#winDlg[open] [data-v="go"]'); if (wn) { wn.click(); continue; }
      break; } };
    for (let d = 0; d < DAYS; d++) {
      // gün başı kararları
      for (const [id, o] of Object.entries(S.sites)) if (o.permit === "rejected") { const opt = S.money > ru.permitFee(o) * 3 + 40000 ? "ced" : "n"; ac.applyPermit(id, opt); }
      for (let guard = 0; guard < 40; guard++) {
        const open = Object.entries(S.sites).find(([id, o]) => o.permit === "ok" && o.kind && sim.siteMW(id) + cfg.BLOCK <= ru.siteCap(o));
        if (!open) { const pending = Object.values(S.sites).some(o => o.permit === "pending"); if (pending || !buyNext()) break; continue; }
        const [id, o] = open, k = o.kind, loan = LOAN && tu.proOn() && lo.loanTerms(id, k, "std")?.debt > 0, pay = loan ? lo.loanTerms(id, k, "std").equity : eq.capexOf(k, "std");
        if (S.money < pay + 20000) break; const n0 = S.plants.length, mw0 = sim.siteMW(id); ac.build(id, k, "std", loan); if (sim.siteMW(id) === mw0) break;
        if (!fitFrom[id]) fitFrom[id] = S.dayNo;
      }
      for (let h = 0; h < 24; h++) {
        sim.tick();
        if (SCN === "fit") for (const id of fitSites) { const x = sim.LIVE[id], o = S.sites[id]; if (!x || x.mw <= 0 || !fitFrom[id] || S.dayNo - fitFrom[id] > FIT_DAYS) continue;
          const add = Math.max(0, x.mw * FIT[o.kind] - x.r); S.money += add; extraFit += add; }
        if (S.hour === 0) break;
      }
      await closeDlgs();
      if (tu.ob().repReady && !tu.ob().rep) tu.ob().rep = 1; // oyuncu ilk raporu açar (eğitimin son adımı)
      const nw = sim.netWorth(); hist.push(Math.round(nw));
      if (globalThis.__dbg && d % 5 === 0) console.log(`gün ${S.dayNo} nakit ${Math.round(S.money)} MW ${S.plants.reduce((a, q) => a + q.mw, 0)} portföy ${Math.round(nw)} görev ${S.mi} dünkü net ${S.last ? Math.round(S.last.net) : 0} borç ${Math.round(lo.totalDebt())} olay ${S.evDone}/${S.evCool}/${(S.evHist||[]).join(',')} kuyruk ${(await import('/src/ui/modal.js')).modalBusy()} açık ${[...document.querySelectorAll('dialog[open]')].map(x=>x.id)}`);
      for (const g of [5e5, 1e6, 2e6, 5e6]) if (!ms[g] && nw >= g) ms[g] = S.dayNo;
      if (S.over) { ms.over = S.dayNo; break; }
      if (nw >= 5e6) break;
    }
    const mw = S.plants.reduce((a, q) => a + q.mw, 0);
    return { ms, days: S.dayNo, nw: Math.round(sim.netWorth()), cash: Math.round(S.money), mw, sites: Object.keys(S.sites).length, mi: S.mi, extraFit: Math.round(extraFit),
      eu: Object.values(S.sites).filter(o => o.mreg === "E").length, gameFit: Math.round(S.stats.fit || 0), hist: hist.filter((_, i) => i % 10 === 0) };
  }, [SCN, DAYS, LOAN, CAND, !!A.dbg]);
  await p.close(); return r;
}
(async () => {
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const out = [];
  for (let s = 1; s <= SEEDS; s++) { const r = await run(b, 1000 + s); out.push(r);
    console.log(`tohum ${1000 + s}: 0,5 M$ gün ${r.ms[5e5] ?? "-"} • 1 M$ gün ${r.ms[1e6] ?? "-"} • 2 M$ gün ${r.ms[2e6] ?? "-"} • 5 M$ gün ${r.ms[5e6] ?? "-"}${r.ms.over ? " • İFLAS gün " + r.ms.over : ""} | son gün ${r.days}, ${r.mw} MW, ${r.sites} saha (${r.eu} Avrupa), portföy ${r.nw}, nakit ${r.cash}${r.extraFit ? ", bot garantisi ek geliri " + r.extraFit : ""}${r.gameFit ? ", oyun garantisi ek geliri " + r.gameFit : ""}`); }
  const med = g => { const v = out.map(r => r.ms[g]).filter(x => x != null).sort((a, b) => a - b); return v.length ? v[v.length >> 1] + (v.length < out.length ? ` (${v.length}/${out.length} ulaştı)` : "") : "ulaşılmadı"; };
  console.log(`\n${SCN}${LOAN ? " + kredi" : ""} medyan: 0,5 M$ ${med(5e5)} • 1 M$ ${med(1e6)} • 2 M$ ${med(2e6)} • 5 M$ ${med(5e6)} (oyun günü; 1x'te gün 12 sn, 8x'te 1,5 sn)`);
  await b.close();
})();
