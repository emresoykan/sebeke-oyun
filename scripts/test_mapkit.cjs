// Apple haritası yolu (src/ui/mapkit.js) sahte MapKit ile (scripts/mapkit_mock.js; Apple'ın betiğine test ortamından
// erişilemez): harita Apple yolundan açılır, sayfa hatası yok; bizim karo katmanlarımız (gece, bulut) harita hareket
// ederken ve hareket bittikten sonraki 2 sn içinde yenilenmez, sonra yenilenir (yenilemeler Apple'ın kendi karolarıyla
// yarışıyordu: harita bir süre boş ızgara kalıyordu); yakında (z > 7) saat ilerler ve yer değişirken hiçbir katman
// yenilenmez, gece karanlığı yalnızca saydamlıkla değişir, gündüz ve bulut karosu verilmez; ?perf=1 kutusu Apple
// karolarının süresini ve katman yenilemelerini gösterir.
// Kullanım: VITE_MAPKIT_TOKEN=test npx vite --port 5184 &  sonra  node scripts/test_mapkit.cjs http://localhost:5184/sebeke-oyun/
const { chromium } = require("playwright");
const fs=require("fs"),path=require("path");
const URL0=process.argv[2]||"http://localhost:5184/sebeke-oyun/";let fails=0;
const ok=(c,m)=>{console.log((c?"  ✓ ":"  ✗ ")+m);if(!c)fails++;};
const MOCK=fs.readFileSync(path.join(__dirname,"mapkit_mock.js"),"utf8");
const PNG=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==","base64");
const CORS={"access-control-allow-origin":"*"};
(async()=>{const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const ctx=await b.newContext({viewport:{width:1366,height:768}});
await ctx.addInitScript(()=>{if(!localStorage.getItem("sebeke-profile-v1"))localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
await ctx.route(/fonts\.g/,r=>r.abort());
await ctx.route(/cdn\.apple-mapkit\.com\/mk\//,r=>r.fulfill({status:200,headers:{...CORS,"content-type":"application/javascript"},body:MOCK}));
await ctx.route(/cdn\.apple-mapkit\.com\/ma\//,r=>r.fulfill({status:200,headers:{...CORS,"content-type":"application/json"},body:"{}"}));
await ctx.route(/apple-mapkit\.com\/ti\//,r=>setTimeout(()=>r.fulfill({status:200,headers:{"content-type":"image/png"},body:PNG}).catch(()=>{}),150));
const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
await p.goto(URL0+"?map=apple&perf=1");await p.waitForTimeout(6000);
const st=await p.evaluate(()=>({mk:document.getElementById("map").classList.contains("mk-map")&&!!document.querySelector(".mkmock"),
  note:[...document.querySelectorAll(".mapnote")].map(x=>x.textContent).join(" | ")}));
ok(st.mk&&!/açılamadı|kapandı/.test(st.note),"harita Apple yolundan açıldı (sahte MapKit)"+(st.note?": "+st.note:""));
// katman sırası (addTileOverlays): 0 gece, 1 yakın gece (tek renk), 2 potansiyel, 3 gerçek santraller, 4 bulut
// yakınlaştır: hareket sırasında ve bittikten sonraki 2 sn içinde gece ve bulut katmanı yenilenmemeli
await p.evaluate(()=>{document.querySelectorAll("dialog[open]").forEach(d=>d.close());window.__mkmock.reloads.length=0;});
await p.evaluate(()=>document.getElementById("zoomIn").click());
await p.waitForTimeout(4500);
const r=await p.evaluate(()=>{const M=window.__mkmock,mv=M.moves[M.moves.length-1];
  return {s:mv.s,e:mv.e,rl:M.reloads.filter(x=>x.i===0||x.i===4).map(x=>({i:x.i,dt:Math.round(x.t-mv.e)}))};});
const early=r.rl.filter(x=>x.dt<1900),late=r.rl.filter(x=>x.dt>=1900);
ok(r.e&&early.length===0,`hareket sırasında ve hemen sonra katman yenilenmedi (hareket bitişine göre ms: ${JSON.stringify(r.rl.map(x=>(x.i?"bulut ":"gece ")+x.dt))})`);
ok(late.length>0,"harita durulduktan 2 sn sonra bekleyen yenilemeler yapıldı");
// yakında (kamera 5 km, z ~12): gece saatleri ilerlerken ve iki kaydırmada hiçbir katman yenilenmez; karanlık saydamlıkla
// oyunun yüklediği modül (dosya değişince Vite adrese ?t= ekler; yalın adres ayrı, haritasız bir kopya olurdu)
const near=await p.evaluate(async()=>{const mk=await import(performance.getEntriesByType("resource").map(e=>e.name).find(n=>/\/src\/ui\/mapkit\.js/.test(n))),M=window.__mkmock,ov=M.maps[0].tov,w=ms=>new Promise(r=>setTimeout(r,ms));
  mk.flyTo(38.42,27.35,5000);await w(3500);mk.setClock(12);await w(300);const day={op:ov[1].opacity,l:M.loads[1]||0,c0:M.loads[4]||0};
  mk.panBy(120,80);await w(3000);day.l2=M.loads[1]||0;day.c=(M.loads[4]||0)-day.c0;
  mk.setClock(21);await w(3000);M.reloads.length=0;const l0=M.loads[1]||0,c0=M.loads[4]||0,ops=[];
  for(let h=22;h<=34;h++){mk.setClock(h%24);if(h<27)ops.push(+ov[1].opacity.toFixed(3));await w(600);if(h===23)mk.panBy(-150,40);}
  mk.panBy(100,-60);await w(5500);
  return {cam:!!mk.camInfo(),day,ops,rl:M.reloads.map(x=>x.i),flat:(M.loads[1]||0)-l0,cl:(M.loads[4]||0)-c0};});
ok(near.cam,"test oyunun harita modülünü kullanıyor");
ok(near.day.op===0&&near.day.l2===near.day.l,`yakında gündüz: gece katmanı saydam, karo verilmiyor (${near.day.l2-near.day.l} karo)`);
ok(near.ops.some(x=>x>0.1),`yakında gece: karanlık saydamlıkla (${near.ops.join(", ")})`);
ok(near.rl.length===0,`yakında saat ilerlerken ve kaydırınca katman yenilenmedi (yenilenen: ${JSON.stringify(near.rl)})`);
ok(near.flat>0&&near.cl===0&&near.day.c===0,`yakında yalnızca tek renk gece karosu verildi (${near.flat}), bulut karosu yok (${near.day.c}, ${near.cl})`);
const perf=await p.evaluate(()=>{const b=[...document.querySelectorAll("body > div")].find(d=>/Wattlas perf/.test(d.textContent));
  if(!b)return "";const t=b.firstChild;t.click();if(/^Wattlas perf[^\n]*\n[^\n]*$/.test(t.textContent))t.click();return t.textContent;});
const tl=(perf.match(/Apple karoları:[^\n]*/)||[""])[0],rl=(perf.match(/katman yenilemeleri:[^\n]*/)||[""])[0];
ok(/Apple karoları: [1-9]/.test(tl),"?perf=1: "+(tl||"Apple karoları satırı yok"));
ok(/gece \d+/.test(rl),"?perf=1: "+(rl||"katman yenilemeleri satırı yok"));
ok(errs.length===0,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));
await b.close();console.log(fails?`\n${fails} denetim başarısız`:"\nTüm denetimler geçti");process.exit(fails?1:0);})();
