// İlk oturum eğitimi için uçtan uca test (Playwright, Chromium).
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_onboarding.cjs http://localhost:5182/sebeke-oyun/
// Senaryolar:
//   1. Yeni kayıt, 1366×768 ve 390×844: iyi bir yer seç → araziyi al → izne başvur → 3x hızla izni bekle → GES sekmesi →
//      santrali kur → ilk satış kartı → piyasa ekranı → gün sonu → Rapor sekmesi. Düğmelere gerçek tıklamayla basılır
//      (mobilde alttaki kartta görünür ve tıklanabilir olmaları da sınanır). Bekleme süreleri ölçülür.
//   2. Sayfa yenilenince eğitim kaldığı yerden sürer, ilk satış kartı tekrar açılmaz, ödül tekrar verilmez.
//   3. İlk izin kolaylığı: uygun ilk sahada 30/30 onay; orman sahasında uygulanmaz.
//   4. İkinci proje: izin reddinde dört başvuru yolu (maliyet, süre, ihtimal görünür), Ek ÇED seçimi uygulanır.
//   5. Eski kayıt (görev zinciri v1) yeni zincire çevrilir.
// Her adımda yatay taşma ve açık pencerenin ekrana sığması denetlenir. Çıkış kodu: hata varsa 1.
const { chromium } = require("playwright");
const URL0 = process.argv[2] || "http://localhost:5182/sebeke-oyun/";
const OUT = process.argv[3] || null; // ekran görüntüleri için klasör (isteğe bağlı)
const PROFILE = { name: "Test", company: "Deneme Enerji", color: "#1F9D74", spec: "eng", created: 1 };
const SPOT = { lat: 38.1, lon: 32.6 }; // Konya ovası: güneş ●●●, izin ihtimali yüksek
let fails = 0;
const ok = (c, m) => { console.log((c ? "  ✓ " : "  ✗ ") + m); if (!c) fails++; };

async function layout(p, tag) {
  const r = await p.evaluate(() => {
    const d = document.querySelector("dialog[open]"), b = d && d.getBoundingClientRect();
    return { over: document.documentElement.scrollWidth - innerWidth, dlg: b ? b.left >= 0 && b.right <= innerWidth + 1 && b.top >= 0 && b.bottom <= innerHeight + 1 : true };
  });
  ok(r.over <= 1, `${tag}: yatay taşma yok (${r.over}px)`); ok(r.dlg, `${tag}: açık pencere ekrana sığıyor`);
}
const st = p => p.evaluate(async () => { const { S } = await import("/src/state.js"); return { mi: S.mi, ob: { ...S.ob }, money: S.money, sites: Object.values(S.sites).map(o => ({ permit: o.permit, days: o.days, tg: o.tg })), plants: S.plants.length, hour: S.hour, day: S.dayNo, log: S.log.slice() }; });
async function waitFor(p, fn, ms, arg) { return p.waitForFunction(fn, arg, { timeout: ms, polling: 100 }); }
// oyun durumu bir koşulu sağlayana kadar bekle (durum modülü eşzamansız yüklendiği için düğüm tarafında yoklanır)
async function waitState(p, pred, ms) { const t = Date.now(); while (Date.now() - t < ms) { if (pred(await st(p))) return true; await p.waitForTimeout(150); } return false; }

async function flow(b, vp, tag) {
  console.log(`\n[${tag}] ${vp.width}×${vp.height}`);
  const ctx = await b.newContext({ viewport: vp, hasTouch: vp.width < 900, isMobile: vp.width < 900 });
  const p = await ctx.newPage(); const errs = [];
  p.on("pageerror", e => errs.push(String(e).slice(0, 200)));
  await p.route(/fonts\.g/, r => r.abort());
  await p.addInitScript(P => { if (!sessionStorage.getItem("t0")) { localStorage.clear(); sessionStorage.setItem("t0", "1"); } localStorage.setItem("sebeke-profile-v1", JSON.stringify(P)); }, PROFILE);
  await p.goto(URL0); await p.waitForTimeout(4000);
  const T0 = Date.now(), lap = n => console.log(`    ⏱ ${n}: ${((Date.now() - T0) / 1000).toFixed(1)} sn`);
  let s = await st(p); ok(s.mi === 0, "yeni kayıt: eğitim 1. adımda");
  ok(await p.evaluate(() => document.body.dataset.tut === "pick"), "1. adım: potansiyel düğmesi vurgulu");
  ok(/İlk adımlar 1\/8/.test(await p.textContent("#mission")), "görev kartı: İlk adımlar 1/8");
  ok(!(await p.isVisible("#captureBox")), "capture oranı eğitimde gizli");
  await layout(p, "açılış");
  // 1. yer seç (arama sonucuna gitmekle aynı yol: nokta seçilir, panel açılır)
  // rakip şirketler rastgele yerleşir: test noktasının 40 km yakınındaki rakip sahası kaldırılır (sonuç belirlensin)
  await p.evaluate(async P => { const { S } = await import("/src/state.js"), w = await import("/src/world.js");
    for (const id in S.rivals || {}) S.rivals[id].sites = S.rivals[id].sites.filter(x => w.km(P.lat, P.lon, x.lat, x.lon) > 40);
    const m = await import("/src/ui/map.js"); m.goTo({ ...P, zoom: 9, sel: true }); }, SPOT);
  await waitFor(p, () => document.querySelector("#panel .tutspot"), 8000);
  ok(await p.isVisible("#panel .tutspot.ok"), "panel: 'İlk proje için iyi bir yer' bilgisi");
  s = await st(p); ok(s.mi === 1 && s.ob.pick === 1, "iyi yer seçilince 2. adıma geçildi");
  ok(await p.evaluate(() => document.body.dataset.tut === "land"), "2. adım: satın al düğmesi vurgulu");
  // 2. araziyi al (eğim ölçümü bitince düğme açılır)
  await waitFor(p, () => { const b = document.querySelector('#panel button[data-a="land"]'); return b && !b.disabled; }, 15000);
  await layout(p, "arazi paneli");
  if (OUT) await p.screenshot({ path: `${OUT}/${tag}-1-arazi.png` });
  await p.click('#panel button[data-a="land"]'); lap("arazi alındı");
  s = await st(p); ok(s.sites.length === 1 && s.mi === 2, "arazi alındı, 3. adım (izin)");
  // 3. izin başvurusu
  await p.click('#panel button[data-a="permit"]'); lap("izne başvuruldu");
  s = await st(p); ok(s.sites[0].permit === "pending" && s.sites[0].days === 2 && s.sites[0].tg === 1, `ilk izin kısa sürüyor (2 gün) ve onaylanacak`);
  ok(await p.evaluate(() => document.body.dataset.tut === "speed"), "4. adım beklerken hız düğmesi vurgulu");
  ok(/hız düğmesine bas/.test(await p.textContent("#mission")), "görev kartı hızlandırmayı öğretiyor");
  await p.click("#speedBtn"); // 3x
  ok((await p.textContent("#speedBtn")).trim() === "3x", "hız 3x");
  await waitFor(p, () => document.querySelector("#panel .eqtabs"), 30000); lap("izin çıktı");
  s = await st(p); ok(s.sites[0].permit === "ok", "ilk izin onaylandı");
  ok(await p.evaluate(() => document.body.dataset.tut === "tech"), "teknoloji sekmeleri vurgulu");
  // 4. teknoloji seç, 5. kur
  await p.click('#panel .eqtabs button[data-k="ges"]');
  s = await st(p); ok(s.mi === 4, "teknoloji seçildi, 5. adım (kur)");
  ok(!(await p.$('#panel button.loan')), "kredili kurulum ilk satıştan önce gizli");
  await p.waitForTimeout(1200);
  ok(await p.evaluate(() => { const r = document.querySelector('#panel .eqcard.t-std button[data-a="build"]').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), "kur düğmesi kaydırmadan görünür alanda");
  if (OUT) await p.screenshot({ path: `${OUT}/${tag}-2-kur.png` });
  await p.click('#panel .eqcard.t-std button[data-a="build"]:not(.loan)'); lap("santral kuruldu");
  s = await st(p); ok(s.plants === 1 && s.mi >= 5, "santral kuruldu, 6. adıma geçildi");
  // 6–7. ilk üretim ve satış: sonuç kartı
  await waitFor(p, () => document.querySelector("#firstDlg[open]"), 60000); lap("ilk satış kartı");
  const card = await p.textContent("#firstDlg");
  ok(/MWh/.test(card) && /\$\/MWh/.test(card) && /Gelir/.test(card) && /Hava/.test(card), "kartta enerji, fiyat, gelir ve hava var");
  s = await st(p); ok(s.mi === 7 && s.ob.sale === 1 && s.ob.card === 1, "ilk üretim ve satış görevleri tamam (8. adım: rapor)");
  console.log("    kart: " + card.replace(/\s+/g, " ").slice(0, 260));
  await layout(p, "ilk satış kartı");
  if (OUT) await p.screenshot({ path: `${OUT}/${tag}-3-kart.png` });
  ok(await p.evaluate(() => document.activeElement && document.activeElement.dataset.v === "cap"), "kart açılınca odak ilk seçenekte (klavye)");
  await p.click('#firstDlg [data-v="mkt"]');
  ok(await p.isVisible('.tabp[data-tab="piyasa"]'), "seçim: piyasa ekranı açıldı");
  ok(await p.isVisible("#captureBox"), "ilk satıştan sonra capture oranı açıldı");
  // 8. gün sonu ve rapor
  ok(await waitState(p, s => s.ob.repReady === 1, 60000), "üretimli ilk gün kapandı"); lap("gün kapandı");
  ok(await p.evaluate(() => document.body.dataset.tut === "report"), "Rapor sekmesi vurgulu");
  await p.click("#mission .mact"); // "Raporu aç"
  s = await st(p); ok(s.mi >= 8 && s.ob.rep === 1, `rapor açıldı: eğitim tamam (sıradaki görev ${s.mi + 1})`);
  ok(await p.isVisible("#report details.expert"), "raporda Uzman ayrıntıları (kapalı)");
  ok(await p.isVisible("#fin details.expert"), "proje ekonomisi Uzman ayrıntıları altında");
  if (OUT) await p.screenshot({ path: `${OUT}/${tag}-4-rapor.png` });
  await layout(p, "rapor");
  // 2. yenileme: kaldığı yerden
  const before = await st(p);
  await p.reload(); await p.waitForTimeout(3500);
  const after = await st(p);
  ok(after.mi === before.mi && after.ob.card === 1, "yenilemeden sonra görev ve eğitim durumu korundu");
  ok(!(await p.$("#firstDlg[open]")), "ilk satış kartı tekrar açılmadı");
  ok(after.mi === before.mi && after.log.filter(l => /Görev tamamlandı/.test(l)).length === before.log.filter(l => /Görev tamamlandı/.test(l)).length, "yenilemede görev ödülü tekrar verilmedi");
  ok(errs.length === 0, "sayfa hatası yok" + (errs.length ? ": " + errs.join(" | ") : ""));
  await ctx.close();
}

// 3–5: mantık sınamaları (aynı sayfada modüllerle)
async function logic(b) {
  console.log("\n[mantık] izin kolaylığı, red seçenekleri, eski kayıt");
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  await p.route(/fonts\.g/, r => r.abort());
  await p.addInitScript(P => { localStorage.clear(); localStorage.setItem("sebeke-profile-v1", JSON.stringify(P)); }, PROFILE);
  await p.goto(URL0); await p.waitForTimeout(3500);
  const r = await p.evaluate(async P => {
    const st = await import("/src/state.js"), ac = await import("/src/actions.js"), sim = await import("/src/sim.js"), ru = await import("/src/rules.js"), w = await import("/src/world.js");
    const S = () => st.S, out = {};
    document.querySelectorAll("dialog[open]").forEach(d => d.close());
    // uygun ilk saha: 30 yeni oyunda hep onay
    let okN = 0;
    for (let i = 0; i < 30; i++) {
      st.setS(st.fresh()); S().money = 1e6; S().sel = { id: null, lat: P.lat, lon: P.lon }; ac.buyLand(); const id = S().sel.id;
      ac.applyPermit(id); for (let d = 0; d < 4 && S().sites[id].permit === "pending"; d++) sim.endDay(); if (S().sites[id].permit === "ok") okN++;
    }
    out.easy = okN;
    // orman: kolaylık uygulanmaz (ihtimal ve süre normal)
    st.setS(st.fresh()); S().money = 1e6;
    // aynı ovadaki sahanın arazi tipi orman yapılır (izin ihtimali %30: ilk proje için uygun değil)
    { S().sel = { id: null, lat: P.lat, lon: P.lon }; ac.buyLand(); const id = S().sel.id; S().sites[id].ter = "f"; ac.applyPermit(id); out.forest = { tg: S().sites[id].tg || 0, days: S().sites[id].days, g: S().ob.g || 0 }; }
    // ikinci proje: kolaylık kullanılmış, red sonrası dört yol
    st.setS(st.fresh()); S().money = 1e6; S().ob = { g: 1, pick: 1 }; S().mi = 8;
    S().sel = { id: null, lat: P.lat, lon: P.lon }; ac.buyLand(); const id2 = S().sel.id; ac.applyPermit(id2);
    out.second = { tg: S().sites[id2].tg || 0 };
    Object.assign(S().sites[id2], { permit: "rejected", why: "test" });
    const { renderPanel } = await import("/src/ui/panel.js"); renderPanel();
    out.opts = [...document.querySelectorAll("#panel .popt")].map(b => ({ k: b.dataset.o, label: b.getAttribute("aria-label") }));
    const m0 = S().money; document.querySelector('#panel .popt[data-o="ced"]').click();
    const o2 = S().sites[id2]; out.ced = { paid: m0 - S().money, pk: o2.pk, days: o2.days, permit: o2.permit };
    // küçültme: saha sınırı 20 MW
    Object.assign(o2, { permit: "rejected" }); delete o2.pk; renderPanel(); document.querySelector('#panel .popt[data-o="small"]').click();
    out.small = { cap: o2.cap, capF: ru.siteCap(o2) };
    // eski kayıt: v1 görev 4 (santral kurulu) → v2 görev 8, eğitim işaretli
    const old = { ...st.fresh(), mv: undefined, ob: undefined, mi: 4, plants: [{ t: "s1", k: "ges", q: "std", mw: 5 }], sites: { s1: { lat: 38, lon: 33, permit: "ok", mreg: "T", reg: "T", ter: "pl" } } };
    localStorage.setItem("sebeke-world-v3", JSON.stringify(old)); const L = st.load(); out.mig = { mi: L.mi, mv: L.mv, sale: L.ob.sale, card: L.ob.card };
    return out;
  }, SPOT);
  ok(r.easy === 30, `uygun ilk sahada ilk izin ${r.easy}/30 onaylandı`);
  ok(r.forest && r.forest.tg === 0 && r.forest.days >= 6 && r.forest.g === 0, `orman sahasında kolaylık yok (süre ${r.forest && r.forest.days} gün)`);
  ok(r.second.tg === 0, "kolaylık kullanıldıktan sonra ikinci proje normal ihtimalle");
  ok(r.opts.length === 4 && r.opts.every(o => /gün/.test(o.label) && /yüzde \d+/.test(o.label) && /\$/.test(o.label)), "red sonrası 4 yol; maliyet, süre ve ihtimal etikette: " + r.opts.map(o => o.k).join(","));
  ok(r.ced.paid === 15000 && r.ced.pk === "ced" && r.ced.permit === "pending" && r.ced.days >= 5, `Ek ÇED: 15 b$ ödendi, inceleme ${r.ced.days} gün`);
  ok(r.small.cap === 20 && r.small.capF === 20, "Projeyi küçült: saha sınırı 20 MW");
  ok(r.mig.mi === 8 && r.mig.mv === 2 && r.mig.sale === 1 && r.mig.card === 1, "eski kayıt: görev 4 → 8, eğitim tamam sayıldı");
}

(async () => {
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  try {
    await flow(b, { width: 1366, height: 768 }, "masaüstü");
    await flow(b, { width: 390, height: 844 }, "mobil");
    await logic(b);
  } finally { await b.close(); }
  console.log(fails ? `\n${fails} denetim başarısız` : "\nTüm denetimler geçti");
  process.exit(fails ? 1 : 0);
})();
