// Testlerin hepsini tek komutla çalıştırır: boş bir portta kendi Vite sunucusunu açar, testleri sırayla koşturur, özet yazar,
// sunucuyu kapatır. Testler çalışırken src/ altında dosya değiştirme: Vite modülleri yeniden yükler ve açık sayfalarda
// "Cannot set properties of undefined" gibi sahte hatalar çıkar.
// Kullanım:
//   node scripts/test_all.cjs                 ana set (oyun kuralları ve arayüz akışları)
//   node scripts/test_all.cjs --more          ana set + ağır görsel testler (dokunma, yakın görünüm, hava, kontrast, saha modeli)
//   node scripts/test_all.cjs --only grid,yeka   yalnızca bunlar
//   node scripts/test_all.cjs --skip onboarding  ana setten çıkar
// Ayrı kurulum isteyenler (yalnızca --only ile): pwa (derlenmiş sürüm ve preview), mapkit (VITE_MAPKIT_TOKEN=test).
// Playwright bulunamazsa NODE_PATH için /opt/node-tools/node_modules denenir (bulut ortamı).
const { spawn, spawnSync } = require("child_process");
const net = require("net"), fs = require("fs"), path = require("path"), http = require("http");
const ROOT = path.resolve(__dirname, "..");
const CORE = ["coast","grid","yeka","hydro","yekdem","cfd","capex","support","onboarding","newtech","help","sell","spv","flo","lose","rotors"];
const MORE = ["tap","closeview","wxfx","dark","sitemodel"];
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
let list = arg("--only") ? arg("--only").split(",") : process.argv.includes("--more") ? [...CORE, ...MORE] : CORE;
if (arg("--skip")) { const s = arg("--skip").split(","); list = list.filter(t => !s.includes(t)); }
list = list.filter(t => { const ok = fs.existsSync(path.join(ROOT, "scripts", `test_${t}.cjs`)); if (!ok) console.log(`(yok: test_${t}.cjs)`); return ok; });
const env = { ...process.env };
try { require.resolve("playwright"); } catch (e) { if (!env.NODE_PATH && fs.existsSync("/opt/node-tools/node_modules")) env.NODE_PATH = "/opt/node-tools/node_modules"; }
const freePort = (p) => new Promise(res => { const s = net.createServer(); s.once("error", () => res(freePort(p + 1))); s.listen(p, "127.0.0.1", () => s.close(() => res(p))); });
const up = (url) => new Promise(res => { const t0 = Date.now(); const go = () => http.get(url, r => { r.resume(); res(true); }).on("error", () => Date.now() - t0 > 60000 ? res(false) : setTimeout(go, 500)); go(); });
(async () => {
  const port = await freePort(5300), url = `http://localhost:${port}/sebeke-oyun/`;
  const vite = spawn("npx", ["vite", "--port", String(port), "--strictPort"], { cwd: ROOT, env, stdio: "ignore", detached: true });
  const stop = () => { try { process.kill(-vite.pid); } catch (e) {} };
  process.on("SIGINT", () => { stop(); process.exit(130); });
  if (!(await up(url))) { console.log("Vite açılmadı"); stop(); process.exit(2); }
  console.log(`Vite ${url} — ${list.length} test\n`);
  const rows = []; const t00 = Date.now();
  for (const t of list) {
    const t0 = Date.now(), r = spawnSync("node", [path.join("scripts", `test_${t}.cjs`), url], { cwd: ROOT, env, encoding: "utf8", timeout: 15 * 60000, maxBuffer: 64 << 20 });
    const out = (r.stdout || "") + (r.stderr || ""), bad = out.split("\n").filter(l => /✗|Error:|TypeError/.test(l)).slice(0, 5);
    const sec = Math.round((Date.now() - t0) / 1000), ok = r.status === 0;
    rows.push({ t, ok, sec, bad }); console.log(`${ok ? "✓" : "✗"} ${t.padEnd(12)} ${String(sec).padStart(4)} sn${ok ? "" : "  (çıkış " + r.status + ")"}`);
    bad.forEach(l => console.log("     " + l.trim().slice(0, 200)));
  }
  stop();
  const f = rows.filter(x => !x.ok);
  console.log(`\n${rows.length - f.length}/${rows.length} geçti, ${Math.round((Date.now() - t00) / 60000)} dk` + (f.length ? `; başarısız: ${f.map(x => x.t).join(", ")}` : ""));
  process.exit(f.length ? 1 : 0);
})();
