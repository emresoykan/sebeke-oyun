// Uygulama olarak kurma (PWA): derlenmiş sürümde service worker kaydı, internet kesikken yeniden açılış, uygulama tanımı
// (manifest) ve ikonlar, düz haritanın karo önbelleği (görülen karo saklanır, internetsizken gelir), Ayarlar'daki "Ana ekrana ekle" (Android/masaüstünde adımlar, iPhone'da adımlar ve kayıt taşıma),
// uygulama olarak açıkken düğmenin gizlenmesi.
// Kullanım: npx vite build --base=/sebeke-oyun/ && npx vite preview --base=/sebeke-oyun/ --port 5190 &
//           sonra  node scripts/test_pwa.cjs http://localhost:5190/sebeke-oyun/
const { chromium } = require("playwright");
const https=require("https"),fs=require("fs"),os=require("os"),path=require("path"),{execFileSync}=require("child_process");
const URL0=process.argv[2]||"http://localhost:5190/sebeke-oyun/";let fails=0;
const ok=(c,m)=>{console.log((c?"  ✓ ":"  ✗ ")+m);if(!c)fails++;};
const IOS="Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const prof=c=>c.addInitScript(()=>{if(!localStorage.getItem("sebeke-profile-v1"))localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
(async()=>{
// karo sunucuları (s3.amazonaws.com, tiles.openfreemap.org) tarayıcıda yerel bir HTTPS sunucusuna yönlendirilir (kendinden
// imzalı sertifika; service worker'ın kendi istekleri de buraya gelir). Ortamdaki vekil sunucu ad çözümlemeyi atlattığı için
// tarayıcı vekilsiz açılır.
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"wattlas-pwa-")),key=path.join(dir,"k.pem"),crt=path.join(dir,"c.pem");
execFileSync("openssl",["req","-x509","-newkey","rsa:2048","-nodes","-keyout",key,"-out",crt,"-days","2","-subj","/CN=tiles.local","-addext","subjectAltName=DNS:s3.amazonaws.com,DNS:tiles.openfreemap.org"],{stdio:"ignore"});
const PNG=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==","base64");
const TILE_BODY=Buffer.concat([PNG,Buffer.alloc(4000)]); // geçerli bir PNG başı + dolgu (boyut denetimi için)
const hits={};
const srv=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(crt)},(q,r)=>{
  if(/terrarium\/\d+\/\d+\/\d+\.png$/.test(q.url)){hits[q.url]=(hits[q.url]||0)+1;r.writeHead(200,{"access-control-allow-origin":"*","content-type":"image/png"});return r.end(TILE_BODY);}
  r.writeHead(404,{"access-control-allow-origin":"*"});r.end();});
await new Promise(r=>srv.listen(0,"127.0.0.1",r));const PORT=srv.address().port;
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>!/proxy/i.test(k)));
const b=await chromium.launch({env,args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--no-proxy-server",
  `--host-resolver-rules=MAP s3.amazonaws.com 127.0.0.1:${PORT}, MAP tiles.openfreemap.org 127.0.0.1:${PORT}, MAP * ~NOTFOUND, EXCLUDE localhost`]});
// 1) masaüstü: service worker, önbellek, çevrimdışı açılış
const ctx=await b.newContext({viewport:{width:1366,height:768},ignoreHTTPSErrors:true});await prof(ctx); // sertifika: yerel karo sunucusu
const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
await p.goto(URL0);await p.waitForTimeout(3000);
const sw=await p.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return {scope:r.scope,active:!!r.active};});
ok(sw.active&&/\/sebeke-oyun\/$/.test(sw.scope),`service worker etkin, kapsam ${sw.scope}`);
await p.reload();await p.waitForTimeout(3000); // önbellek dolsun (service worker artık sayfayı yönetiyor)
const cached=await p.evaluate(async()=>{const c=await caches.open("wattlas-v1"),ks=(await c.keys()).map(r=>new URL(r.url).pathname);
  return {n:ks.length,page:ks.some(k=>k.endsWith("/sebeke-oyun/")),js:ks.some(k=>/\/assets\/.+\.js$/.test(k)),tiles:ks.some(k=>/tile|arcgis|maptiler|openstreetmap/.test(k))};});
ok(cached.page&&cached.js,`önbellekte sayfa ve oyun dosyaları (${cached.n} kayıt)`);
ok(!cached.tiles,"uygulama önbelleğinde harita karosu yok");
// düz haritanın karoları ayrı önbellekte: görülen yükseklik karosu saklanır, internet kesikken de gelir; başka karo saklanmaz
const T="https://s3.amazonaws.com/elevation-tiles-prod/terrarium/13/1/2.png"; // haritanın istemeyeceği bir karo
const k1=await p.evaluate(async T=>{try{const r=await fetch(T);await r.arrayBuffer();return r.status;}catch(e){return "ağ yok: "+e.message;}},T);
ok(k1===200,`yükseklik karosu yerel sunucudan geldi (${k1})`);
{await new Promise(r=>setTimeout(r,500));
  const tc=await p.evaluate(async()=>{const c=await caches.open("wattlas-tiles-v1");return (await c.keys()).map(r=>r.url);});
  ok(tc.includes(T)&&tc.every(u=>/^https:\/\/(tiles\.openfreemap\.org\/planet\/|s3\.amazonaws\.com\/elevation-tiles-prod\/terrarium\/)/.test(u)),`görülen karo karo önbelleğinde (${tc.length} kayıt, yalnızca OpenFreeMap ve yükseklik karoları)`);
  await ctx.setOffline(true);
  const k2=await p.evaluate(async T=>{try{const r=await fetch(T);return r.status+" "+(await r.arrayBuffer()).byteLength;}catch(e){return "hata: "+e.message;}},T);
  await ctx.setOffline(false);
  const nT=hits[new URL(T).pathname]||0;
  ok(/^200 \d{4,}/.test(k2)&&nT===1,`internet yokken karo önbellekten geliyor (${k2} bayt; bu karo için sunucuya ${nT} istek)`);}
const man=await p.evaluate(async()=>{const l=document.querySelector('link[rel="manifest"]').href,m=await (await fetch(l)).json(),
  ic=await Promise.all(m.icons.map(async i=>(await fetch(new URL(i.src,l))).ok)),at=await fetch(document.querySelector('link[rel="apple-touch-icon"]').href);
  return {name:m.name,display:m.display,icons:ic.every(Boolean),apple:at.ok};});
ok(man.name==="Wattlas"&&man.display==="standalone"&&man.icons&&man.apple,"uygulama tanımı (tam ekran) ve ikonlar erişilebilir");
await ctx.setOffline(true);await p.reload();await p.waitForTimeout(3500);
const off=await p.evaluate(()=>({title:document.title,panel:!!document.getElementById("panel"),cash:!!document.querySelector(".cash"),tabs:document.querySelectorAll('[role="tab"][data-tab]').length}));
ok(/Wattlas/.test(off.title)&&off.panel&&off.cash&&off.tabs>=4,`internet yokken oyun açılıyor (${off.title})`);
await ctx.setOffline(false);
// Android/masaüstü: kurulum penceresi yoksa adımlar
await p.reload();await p.waitForTimeout(2500);
await p.evaluate(()=>{document.querySelector('[role="tab"][data-tab="ayar"]').click();document.getElementById("installBtn").click();});
const dsk=await p.evaluate(()=>{const d=document.getElementById("confirmDlg");return {open:d.open,txt:d.textContent};});
ok(dsk.open&&/Uygulamayı yükle/.test(dsk.txt)&&!/Kaydını taşı/.test(dsk.txt),"Ayarlar ▸ Ana ekrana ekle: Chrome/Edge adımları");
await ctx.close();
// 2) iPhone Safari: adımlar, kayıt taşıma notu, 3. günden sonra tek seferlik ipucu
const ic=await b.newContext({viewport:{width:390,height:844},userAgent:IOS,isMobile:true,hasTouch:true});await prof(ic);
const q=await ic.newPage();q.on("pageerror",e=>errs.push(String(e).slice(0,200)));
await q.goto(URL0);await q.waitForTimeout(3000);
await q.evaluate(()=>{document.querySelectorAll("dialog[open]").forEach(d=>d.close());document.querySelector('[role="tab"][data-tab="ayar"]').click();document.getElementById("installBtn").click();});
const ios=await q.evaluate(()=>{const d=document.getElementById("confirmDlg");return {open:d.open,txt:d.textContent,save:!!d.querySelector('[data-v="save"]')};});
ok(ios.open&&/Paylaş/.test(ios.txt)&&/Ana Ekrana Ekle/.test(ios.txt)&&/Kaydını taşı/.test(ios.txt)&&ios.save,"iPhone: Safari adımları ve kayıt taşıma (Kaydı indir düğmesi)");
// oyunu 3. güne getir: ipucu ~8 sn sonra bir kez çıkar, sonraki açılışta çıkmaz
// kayıt eğitim sırasında gün sonunda yazılmaz; "Kaydı indir" önce kaydı yazar
await q.evaluate(()=>{document.querySelectorAll("dialog[open]").forEach(d=>d.close());document.getElementById("saveExport").click();});await q.waitForTimeout(500);
await q.evaluate(()=>{const k="sebeke-world-v3",s=JSON.parse(localStorage.getItem(k));s.dayNo=3;localStorage.setItem(k,JSON.stringify(s));localStorage.removeItem("wattlas-install-hint");});
const toastTxt=async()=>q.evaluate(()=>[...document.querySelectorAll(".toast")].map(x=>x.textContent).join(" | "));
await q.reload();await q.waitForTimeout(9500);const t1=await toastTxt();
await q.reload();await q.waitForTimeout(9500);const t2=await toastTxt();
ok(/Uygulama gibi oyna/.test(t1)&&!/Uygulama gibi oyna/.test(t2),"iPhone Safari: 3. günden sonra tek seferlik 'ana ekrana ekle' ipucu");
await ic.close();
// 3) uygulama olarak açık (iOS ana ekran): düğme gizli
const sc=await b.newContext({viewport:{width:390,height:844},userAgent:IOS,isMobile:true,hasTouch:true});await prof(sc);
await sc.addInitScript(()=>{Object.defineProperty(navigator,"standalone",{get:()=>true});});
const s=await sc.newPage();await s.goto(URL0);await s.waitForTimeout(2500);
ok(await s.evaluate(()=>document.getElementById("installBtn").hidden),"ana ekrandan açıkken 'Ana ekrana ekle' gizli");
await sc.close();
ok(errs.length===0,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));
await b.close();srv.close();fs.rmSync(dir,{recursive:true,force:true});console.log(fails?`\n${fails} denetim başarısız`:"\nTüm denetimler geçti");process.exit(fails?1:0);})();
