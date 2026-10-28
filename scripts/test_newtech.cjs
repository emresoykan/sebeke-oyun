// Yeni teknolojiler: yüzer GES (baraj gölünde), pompaj depolamalı HES, yeşil hidrojen (elektrolizör), CSP (kule, erimiş tuz).
// İzinli yerler, yüzer GES'in göl kuralı (önce HES, en çok HES gücü kadar, saha sınırına sayılmaz), kurulum, bir günlük
// işletme (üretim, depolama, hidrojen, durum metinleri, rapor satırları), proje ekonomisi ve satış teklifi, haritadaki tesis
// görüntüsü ve CSP'nin 120 günlük kapasite faktörü (IRENA 2024 dünya ortalaması %41'e yakın olmalı).
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_newtech.cjs http://localhost:5182/sebeke-oyun/
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/";let fails=0;
const ok=(c,m)=>{console.log((c?"  ✓ ":"  ✗ ")+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const p=await b.newPage({viewport:{width:1366,height:768}});const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
await p.route(/fonts\.g/,r=>r.abort());
await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
await p.goto(URL0);await p.waitForTimeout(3500);
// 1) izinli yerler ve kurulum kuralları
const r=await p.evaluate(async()=>{
  const st=await import("/src/state.js"),w=await import("/src/world.js"),ru=await import("/src/rules.js"),ac=await import("/src/actions.js"),cfg=await import("/src/config.js"),S=st.S,out={};
  S.money=9e7;S.won=true;S.win1=1;S.evCool=99999;S.mi=9;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1});for(const k in S.rivals||{})S.rivals[k].sites=[];
  const mtn=w.describe(40.95,39.75),urfa=w.describe(37.0,39.3),konya=w.describe(37.9,33.0),sea=w.describe(40.6,27.2);
  out.mtn=ru.baseAllowed(mtn);out.urfa=ru.baseAllowed(urfa);out.konya=ru.baseAllowed(konya);out.sea=ru.baseAllowed(sea);
  const put=(id,t)=>{S.sites[id]={...t,permit:"ok"};return id;};
  put("m",mtn);put("u",urfa);put("k",konya);
  // yüzer GES: HES yokken kurulamaz; 5 MW HES'le 5 MW kurulur, ikinci blok göl dolu
  ac.build("m","fpv","std");out.fpvNoHes=S.plants.filter(q=>q.t==="m").length;out.block0=ru.siteBlock("m","fpv");
  ac.build("m","hes","std");ac.build("m","fpv","std");out.fpv1=S.plants.filter(q=>q.t==="m"&&q.k==="fpv").reduce((a,q)=>a+q.mw,0);
  out.block1=ru.siteBlock("m","fpv");ac.build("m","fpv","std");out.fpv2=S.plants.filter(q=>q.t==="m"&&q.k==="fpv").reduce((a,q)=>a+q.mw,0);
  // saha sınırı: HES 40 MW'a çıkınca saha dolar; yüzer GES sınıra sayılmadığı için eklenebilir
  for(let i=0;i<7;i++)ac.build("m","hes","std");out.capM=ru.capMW("m");
  const before=S.plants.filter(q=>q.t==="m").reduce((a,q)=>a+q.mw,0);ac.build("m","phs","std");out.phsFull=S.plants.filter(q=>q.t==="m").reduce((a,q)=>a+q.mw,0)===before;
  ac.build("m","fpv","std");out.fpv3=S.plants.filter(q=>q.t==="m"&&q.k==="fpv").reduce((a,q)=>a+q.mw,0);
  // pompaj HES ayrı bir dağ sahasında, elektrolizör ve batarya Konya'da, CSP ve GES Şanlıurfa'da
  put("p",w.describe(40.7,39.5));const m0=S.money;ac.build("p","phs","std");ac.build("p","phs","std");out.phsCost=m0-S.money;out.phsExp=2*cfg.TECH.phs.capex;
  ac.build("k","h2","std");ac.build("k","ges","std");ac.build("u","csp","std");ac.build("u","csp","std");ac.build("u","ges","std");
  ac.build("k","csp","std");out.cspKonya=S.plants.some(q=>q.t==="k"&&q.k==="csp");
  out.ks=S.plants.map(q=>q.t+":"+q.k+":"+q.mw).join(" ");
  return out;});
ok(["hes","fpv","phs"].every(k=>r.mtn.includes(k))&&!r.mtn.includes("csp"),`dağlık saha: HES, yüzer GES, pompaj (${r.mtn.join(",")})`);
ok(r.urfa.includes("csp")&&r.urfa.includes("h2"),`Şanlıurfa (güneş ~5,1 kWh/m²/gün): CSP ve elektrolizör (${r.urfa.join(",")})`);
ok(!r.konya.includes("csp")&&r.konya.includes("h2"),`Konya (~4,9 kWh/m²/gün): CSP yok, elektrolizör var (${r.konya.join(",")})`);
ok(!r.sea.some(k=>["fpv","phs","h2","csp"].includes(k)),`sığ deniz: yeni teknolojiler yok (${r.sea.join(",")})`);
ok(r.fpvNoHes===0&&r.block0==="lake","HES yokken yüzer GES kurulamaz (göl yok)");
ok(r.fpv1===5&&r.block1==="lakefull"&&r.fpv2===5,"5 MW HES gölüne en çok 5 MW yüzer GES");
ok(r.capM===40&&r.phsFull,`saha sınırı: HES 40 MW, pompaj sığmaz (sınıra sayılan ${r.capM} MW)`);
ok(r.fpv3===10,`yüzer GES saha sınırına sayılmaz: dolu sahaya 10 MW'a çıktı (${r.fpv3} MW)`);
ok(Math.abs(r.phsCost-r.phsExp)<1,`pompaj HES iki blok: ${r.phsCost} (${r.phsExp})`);
ok(!r.cspKonya,"Konya'ya CSP kurulamaz");
// 2) üç gün işletme: üretim, depolama, hidrojen, durum metinleri, rapor
const d=await p.evaluate(async()=>{const st=await import("/src/state.js"),sim=await import("/src/sim.js"),ps=await import("/src/plantstatus.js"),fin=await import("/src/finance.js"),sale=await import("/src/sale.js"),S=st.S,out={};
  const days=[];for(let i=0;i<4;i++){for(let h=0;h<24;h++)sim.tick();document.querySelectorAll("dialog[open]").forEach(x=>x.close());days.push(JSON.parse(JSON.stringify(S.last)));}
  out.E=Object.fromEntries(["fpv","csp","ges","hes"].map(k=>[k,Math.round(days.reduce((a,L)=>a+L.E[k],0))]));
  out.pNet=Math.round(days.reduce((a,L)=>a+(L.pNet||0),0));out.kg=Math.round(days.reduce((a,L)=>a+(L.h2?L.h2.kg:0),0));
  out.h2r=Math.round(days.reduce((a,L)=>a+L.h2.r-L.h2.c,0));
  // CSP ortalama satış fiyatı aynı sahadaki GES'inkinden yüksek olmalı (ısıyı pahalı saatlere taşır)
  const pr=(t,k)=>{const q=S.plants.find(x=>x.t===t&&x.k===k);return q.ac.r/q.ac.e;};out.pCsp=pr("u","csp");out.pGes=pr("u","ges");
  const phs=S.plants.find(q=>q.t==="p"&&q.k==="phs");out.soc=phs.soc;out.plan=phs.plan.filter(Boolean).length;
  out.txt=["m","p","k","u"].map(id=>ps.statusText(ps.plantStatus(id))).join(" | ");
  (await import("/src/ui/hud.js")).renderReport();const rep=document.getElementById("report").textContent;
  out.rep=["GES yüzer","CSP (erimiş tuz)","Pompaj HES arbitrajı"].filter(x=>rep.includes(x));
  // proje ekonomisi: depolama ve hidrojen net gelirle (LCOE yok), CSP ve yüzer GES üretimle
  const f=k=>{const q=S.plants.find(x=>x.k===k);return fin.plantFinance(q);};out.fin={phs:f("phs"),h2:f("h2"),csp:f("csp"),fpv:f("fpv")};
  out.fin=Object.fromEntries(Object.entries(out.fin).map(([k,v])=>[k,{wait:!!v.wait,lcoe:v.lcoe==null?null:Math.round(v.lcoe),cf:v.cf}]));
  out.sale=["m","p","k","u"].map(id=>sale.saleOffer(id)).every(o=>o&&o.price>0&&Number.isFinite(o.price));
  // proje ekonomisi sekmesi hatasız çizilir
  (await import("/src/ui/finview.js")).renderFin();out.finRows=document.querySelectorAll("#finTab tr, .fintab tr, #fin tr").length;
  return out;});
ok(d.E.fpv>0&&d.E.csp>0,`dört günde üretim: yüzer GES ${d.E.fpv} MWh, CSP ${d.E.csp} MWh`);
ok(d.pNet!==0&&d.plan>0,`pompaj HES plan ${d.plan} saat, net arbitraj ${d.pNet} $ (üst hazne ${Math.round(d.soc)} MWh)`);
ok(d.kg>0,`elektrolizör ${d.kg} kg hidrojen üretti, net ${d.h2r} $`);
ok(d.pCsp>d.pGes,`CSP ortalama satış fiyatı ${d.pCsp.toFixed(1)} > GES ${d.pGes.toFixed(1)} $/MWh (aynı saha)`);
ok(/Yüzer GES/.test(d.txt)&&/Pompaj HES: üst hazne/.test(d.txt)&&/Elektrolizör/.test(d.txt)&&/CSP: tuz deposu/.test(d.txt),`durum metinleri: "${d.txt.slice(0,240)}…"`);
ok(d.rep.length===3,`gün sonu raporu: ${d.rep.join(", ")}`);
ok(!d.fin.phs.wait&&d.fin.phs.lcoe===null&&d.fin.h2.lcoe===null&&d.fin.csp.lcoe>0&&d.fin.fpv.lcoe>0,`proje ekonomisi: pompaj ve hidrojen LCOE'siz (net gelir), CSP LCOE ${d.fin.csp.lcoe}, yüzer GES ${d.fin.fpv.lcoe} $/MWh`);
ok(d.sale,"dört sahanın satış teklifi hesaplanır");
// 3) saha paneli: yüzer GES sekmesi ve göl dolu notu, pompaj kartında 10 saat
const ui=await p.evaluate(async()=>{const st=await import("/src/state.js"),w=await import("/src/world.js"),ac=await import("/src/actions.js"),S=st.S,pn=await import("/src/ui/panel.js"),out={};
  const sel=id=>{const o=S.sites[id];S.sel={id,lat:o.lat,lon:o.lon};pn.renderPanel();document.querySelector('#panel button[data-a="tab"][data-k="fpv"]').click();return document.getElementById("panel");};
  // 5 MW HES + 5 MW yüzer GES: göl dolu; 40 MW HES + 10 MW yüzer GES: saha dolu ama yüzer GES eklenebilir
  S.sites.q={...w.describe(40.6,39.9),permit:"ok"};ac.build("q","hes","std");ac.build("q","fpv","std");
  let el=sel("q");out.note=el.querySelector(".eqnote:last-of-type").textContent;out.dis=[...el.querySelectorAll('button[data-a="build"][data-k="fpv"]')].every(b=>b.disabled);
  el=sel("m");out.status=el.querySelector(".status.ok").textContent;out.en=[...el.querySelectorAll('button[data-a="build"][data-k="fpv"]')].some(b=>!b.disabled);out.noFull=!el.querySelector(".sitefull");
  document.querySelector('#panel button[data-a="tab"][data-k="phs"]').click();out.phs=document.querySelector("#panel .eqcards").textContent;out.full=!!document.querySelector("#panel .sitefull");return out;});
ok(/Göl dolu/.test(ui.note)&&ui.dis,"yüzer GES sekmesi (5 MW HES, 5 MW yüzer): göl dolu notu, düğmeler kapalı");
ok(ui.en&&ui.noFull,"dolu sahada (40 MW HES) yüzer GES sekmesi açık, saha dolu uyarısı yok");
ok(/gölde ayrıca 10 MW yüzer GES/.test(ui.status),`saha durumu: "${ui.status.slice(0,90)}…"`);
ok(/10 saat/.test(ui.phs)&&/50 MWh/.test(ui.phs)&&ui.full,"pompaj kartı: 10 saat, 50 MWh; saha dolu uyarısı");
// 4) haritadaki tesis görüntüleri
const im=await p.evaluate(async()=>{const F=await import("/src/ui/siteimage.js"),out={};for(const id of ["m","p","k","u"]){const x=await F.siteImage(id,true);out[id]=x?x.lods[0].w:0;}return out;});
ok(Object.values(im).every(v=>v>100),`tesis görüntüleri çizildi (${JSON.stringify(im)})`);
// 5) CSP kapasite faktörü: iki sahada 120 gün (bir takvim yılı)
const cf=await p.evaluate(async()=>{const st=await import("/src/state.js"),w=await import("/src/world.js"),sim=await import("/src/sim.js"),S=st.S;
  S.plants=[];S.sites={};S.loans=[];S.money=9e7;
  [["a",37.0,39.3],["b",31.1,-6.6]].forEach(([id,la,lo])=>{S.sites[id]={...w.describe(la,lo),permit:"ok"};S.plants.push({t:id,k:"csp",q:"std",mw:5,soc:0,cost:1});});
  sim.newDay();for(let i=0;i<120;i++){for(let h=0;h<24;h++)sim.tick();document.querySelectorAll("dialog[open]").forEach(x=>x.close());}
  return S.plants.map(q=>q.ac.e/q.ac.cap);});
const avg=(cf[0]+cf[1])/2;
ok(avg>0.33&&avg<0.5,`CSP 120 günlük kapasite faktörü: Şanlıurfa %${(cf[0]*100).toFixed(0)}, Ouarzazate %${(cf[1]*100).toFixed(0)} (IRENA 2024 dünya ortalaması %41)`);
ok(errs.length===0,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));
await b.close();console.log(fails?`\n${fails} denetim başarısız`:"\nTüm denetimler geçti");process.exit(fails?1:0);})();
