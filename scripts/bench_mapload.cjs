// Düz haritanın karo yükleme beklemesi, benzetimli ağla (önce/sonra karşılaştırması için).
// Ölçülen, ?perf=1 ölçümüyle aynı tanım (src/ui/perfprobe.js): hareket bittikten sonra görünümdeki vektör ve yükseklik
// karolarının yüklenmesine kadar geçen süre; ayrıca her adımda sunucuya giden istek sayısı ve bayt.
// Karo sunucuları (tiles.openfreemap.org, s3.amazonaws.com) tarayıcıda yerel bir HTTPS sunucusuna yönlendirilir
// (--host-resolver-rules, kendinden imzalı sertifika, sertifika hataları yok sayılır): Playwright'ın istek yönlendirmesi service worker'ın kendi isteklerini
// yakalamıyor ve tarayıcının HTTP önbelleğini kapatıyor; böylece sayfa, MapLibre işçisi ve service worker aynı ağ yolunu kullanır.
// - Yükseklik karoları gerçek (AWS Terrain Tiles): curl ile indirilip diskte saklanır; AWS'nin başlıklarıyla verilir
//   (Last-Modified, ETag; Cache-Control yok).
// - OpenFreeMap vektör karoları sahte (bu ortamdan erişilemiyor): boş bir vektör karo, gerçek boyuta yakın olsun diye
//   çözümleyicinin atladığı bir alanla doldurulur (--vkb, varsayım). Yer adı, yol ve kıyı çizilmez; yalnızca ağ yükü ölçülür.
// - Ağ: her istek gecikme (--rtt) ve paylaşılan bant genişliği (--mbps) kadar bekler.
// - Sertifika hatası yok sayıldığı için tarayıcı bu karoları HTTP önbelleğine almayabilir; gerçek tarayıcıda bazı karolar
//   zaten HTTP önbelleğinden gelebilir. Service worker önbelleği (Cache API) bundan etkilenmez.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/bench_mapload.cjs http://localhost:5182/sebeke-oyun/
//   seçenekler: --rtt=120 --mbps=10 --vkb=50 --sessions=1 --cache=<klasör> --pause (oyun duraklatılır) --nosw (service worker kapalı) --json
//   service worker için: npx vite build && npx vite preview --port 5186 &  sonra  ... http://localhost:5186/sebeke-oyun/ --sessions=2
//   (sertifika için openssl gerekir)
const { chromium } = require("playwright");
const { execFile, execFileSync } = require("child_process");
const https = require("https");
const fs = require("fs"), path = require("path"), os = require("os");
const ARG = Object.fromEntries(process.argv.slice(3).map(a => a.replace(/^--/, "").split("=")).map(([k, v]) => [k, v ?? "1"]));
const URL0 = process.argv[2] || "http://localhost:5182/sebeke-oyun/";
const RTT = +(ARG.rtt || 120), MBPS = +(ARG.mbps || 10), VKB = +(ARG.vkb || 50), SESS = +(ARG.sessions || 1);
const CACHE = ARG.cache || path.join(os.tmpdir(), "wattlas-dem");fs.mkdirSync(CACHE, { recursive: true });
const DEM = /elevation-tiles-prod\/terrarium\/(\d+)\/(\d+)\/(\d+)\.png/;
const LAYERS = ["water", "waterway", "landcover", "landuse", "mountain_peak", "park", "boundary", "aeroway", "transportation", "building", "water_name", "transportation_name", "place", "housenumber", "poi", "aerodrome_label"];
// boş vektör karo + atlanan alan (etiket 15, uzunluk önekli): çözümleyici okur, atlar
function mvt(n) { const v = []; let x = n; while (x > 127) { v.push((x & 127) | 128); x >>>= 7; } v.push(x); return Buffer.concat([Buffer.from([0x7a, ...v]), Buffer.alloc(n)]); }
const VT = mvt(VKB * 1024);
const pending = new Map();
function demFile(z, x, y) {
  const f = path.join(CACHE, `${z}-${x}-${y}.png`);
  if (fs.existsSync(f)) return Promise.resolve(f);
  if (!pending.has(f)) pending.set(f, new Promise(res => execFile("curl", ["-s", "-f", "-m", "30", "-o", f, `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`], e => res(e ? null : f))));
  return pending.get(f);
}
// benzetimli ağ: gecikme + paylaşılan hat (aktarımlar sırayla)
let pipeFree = 0;
const netDelay = bytes => { const now = Date.now(), ready = Math.max(now + RTT, pipeFree) + bytes * 8 / (MBPS * 1e6) * 1000; pipeFree = ready; return ready - now; };
let cnt = null;
const count = (k, b) => { if (!cnt) return; const c = cnt[k] || (cnt[k] = { n: 0, kb: 0 }); c.n++; c.kb += b / 1024; };
const STEPS = [
  ["Konya z9", m => m.flyTo({ center: [32.5, 37.9], zoom: 9, duration: 1200, essential: true })],
  ["Konya z12", m => m.flyTo({ center: [32.5, 37.9], zoom: 12, duration: 1200, essential: true })],
  ["kaydır sağa", m => m.panBy([250, 0], { duration: 400, essential: true })],
  ["kaydır aşağı", m => m.panBy([0, 300], { duration: 400, essential: true })],
  ["kaydır sola", m => m.panBy([-250, 0], { duration: 400, essential: true })],
  ["uzaklaş z10", m => m.zoomTo(10, { duration: 600, essential: true })],
  ["geri yaklaş z12", m => m.zoomTo(12, { duration: 600, essential: true })],
  ["İzmir z11", m => m.flyTo({ center: [27.14, 38.42], zoom: 11, duration: 1500, essential: true })],
  ["Konya'ya dön z12", m => m.flyTo({ center: [32.5, 37.9], zoom: 12, duration: 1500, essential: true })],
];
(async () => {
  // yerel karo sunucusu (kendinden imzalı sertifika, iki alan adı için)
  const key = path.join(CACHE, "tile.key"), crt = path.join(CACHE, "tile.crt");
  if (!fs.existsSync(crt)) execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", key, "-out", crt, "-days", "30", "-subj", "/CN=tiles.local", "-addext", "subjectAltName=DNS:tiles.openfreemap.org,DNS:s3.amazonaws.com"], { stdio: "ignore" });
  const send = (res, code, headers, body, k) => { if (k) count(k, body.length);setTimeout(() => { res.writeHead(code, { "access-control-allow-origin": "*", ...headers });res.end(body); }, k ? netDelay(body.length) : 0); };
  const srv = https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(crt) }, async (req, res) => {
    const host = (req.headers.host || "").split(":")[0], u = req.url;let m;
    if (host === "s3.amazonaws.com" && (m = u.match(DEM))) { const f = await demFile(+m[1], +m[2], +m[3]);if (!f) return send(res, 404, {}, Buffer.alloc(0));
      return send(res, 200, { "content-type": "image/png", "last-modified": "Fri, 17 Nov 2017 01:46:15 GMT", etag: `"${m[1]}-${m[2]}-${m[3]}"`, vary: "Origin" }, fs.readFileSync(f), "yükseklik"); }
    if (host === "tiles.openfreemap.org") {
      if (/\.pbf$/.test(u)) return send(res, 200, { "content-type": "application/x-protobuf" }, VT, "vektör");
      const tj = Buffer.from(JSON.stringify({ tilejson: "3.0.0", tiles: ["https://tiles.openfreemap.org/planet/20260101_000000_pt/{z}/{x}/{y}.pbf"], minzoom: 0, maxzoom: 14, vector_layers: LAYERS.map(id => ({ id, fields: {} })) }));
      return send(res, 200, { "content-type": "application/json" }, tj, "vektör (tanım)"); }
    send(res, 404, {}, Buffer.alloc(0));
  });
  await new Promise(r => srv.listen(0, "127.0.0.1", r));const PORT = srv.address().port;
  // ortamdaki vekil sunucu (HTTPS_PROXY) ad çözümlemeyi kendisi yapar ve yönlendirmeyi atlar: tarayıcı vekilsiz açılır
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/proxy/i.test(k)));
  const b = await chromium.launch({ env, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-proxy-server",
    `--host-resolver-rules=MAP tiles.openfreemap.org 127.0.0.1:${PORT}, MAP s3.amazonaws.com 127.0.0.1:${PORT}, MAP * ~NOTFOUND, EXCLUDE localhost`] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: "reduce", ignoreHTTPSErrors: true, serviceWorkers: ARG.nosw ? "block" : "allow" });
  await ctx.addInitScript(() => { if (!localStorage.getItem("sebeke-profile-v1")) localStorage.setItem("sebeke-profile-v1", JSON.stringify({ name: "T", company: "D", color: "#1F9D74", spec: "eng", created: 1 })); });
  const all = [];
  for (let s = 1; s <= SESS; s++) {
    const p = await ctx.newPage();const errs = [];p.on("pageerror", e => errs.push(String(e).slice(0, 160)));
    cnt = {};const t0 = Date.now();
    await p.goto(URL0 + (URL0.includes("?") ? "&" : "?") + "perf=1");
    await p.waitForFunction(() => window.__perfMap && window.__perfMap.loaded(), null, { timeout: 60000, polling: 200 });
    await p.evaluate(() => document.querySelectorAll("dialog[open]").forEach(d => d.close()));
    if (ARG.pause) await p.evaluate(() => document.getElementById("pauseBtn")?.click()); // oyun saati durur (karşılaştırma için)
    await p.evaluate(async () => { const m = window.__perfMap, t = performance.now();
      while (!["omt", "dem"].every(id => !m.getSource(id) || m.isSourceLoaded(id)) && performance.now() - t < 60000) await new Promise(r => setTimeout(r, 50)); });
    const rows = [{ step: "açılış", wait: Date.now() - t0, req: cnt }];
    if (s > 1) await p.evaluate(() => navigator.serviceWorker && navigator.serviceWorker.ready);
    for (const [name, fn] of STEPS) {
      cnt = {};
      // hareket ve bekleme sayfanın içinde izlenir (Playwright'ın dışarıdan yoklaması yönlendirilen istekleri ~1 sn geciktiriyordu)
      const w = await p.evaluate(async src => { const F = window.__perfFlat, m = window.__perfMap, n0 = F.nw, t = performance.now();
        (0, eval)(src)(m);
        while (!(F.nw > n0 && !m.isMoving()) && performance.now() - t < 90000) await new Promise(r => setTimeout(r, 50));
        return F.nw > n0 ? F.waits.at(-1) : null; }, `(${fn.toString()})`);
      rows.push({ step: name, wait: w, req: cnt });
    }
    const sw = await p.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller));
    const src = await p.evaluate(() => Object.fromEntries(Object.entries(window.__perfFlat.src).map(([k, s]) => { const d = s.d.slice().sort((a, b) => a - b);return [k, { n: s.n, med: Math.round(d[d.length >> 1]), p90: Math.round(d[Math.floor(d.length * 0.9)]), max: Math.round(d.at(-1)) }]; })));
    console.error(`oturum ${s} karo süreleri (istek → hazır):`, JSON.stringify(src));
    all.push({ session: s, sw, rows, errs });
    await p.close();
  }
  await b.close();srv.close();
  if (ARG.json) { console.log(JSON.stringify(all)); return; }
  const fmt = r => Object.entries(r.req).map(([k, v]) => `${k} ${v.n} (${Math.round(v.kb)} KB)`).join(", ") || "istek yok";
  console.log(`benzetimli ağ: gecikme ${RTT} ms, ${MBPS} Mbit/sn; vektör karo ${VKB} KB (varsayım)`);
  for (const a of all) {
    console.log(`\noturum ${a.session}${a.sw ? " (service worker etkin)" : ""}`);
    for (const r of a.rows) console.log(`  ${r.step.padEnd(18)} bekleme ${String(r.wait ?? "–").padStart(5)} ms • ${fmt(r)}`);
    const t = a.rows.slice(1);
    const req = t.reduce((x, r) => x + Object.values(r.req).reduce((y, v) => y + v.n, 0), 0), kb = t.reduce((x, r) => x + Object.values(r.req).reduce((y, v) => y + v.kb, 0), 0);
    const ws = t.map(r => r.wait || 0);
    console.log(`  toplam (açılış hariç): ${req} istek, ${(kb / 1024).toFixed(1)} MB; bekleme toplamı ${ws.reduce((x, y) => x + y, 0)} ms, en uzun ${Math.max(...ws)} ms`);
    if (a.errs.length) console.log("  sayfa hataları:", a.errs);
  }
})();
