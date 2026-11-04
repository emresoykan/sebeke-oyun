// Şebeke bağlantı kapasitesi (Türkiye, src/grid.js). Sınanan: ilk projenin kontenjana sayılmaması, serbest kontenjanın
// RES/GES bloklarıyla tükenmesi ve sonra kurulumun engellenmesi (kurulum ve panel), depolamalı yol (önce batarya; üretim gücü
// bataryayı aşamaz; boşta batarya varsa kontenjandan önce o kullanılır), YEKA sahasının kendi teknolojisi, HES ve batarya
// gibi teknolojiler ile Avrupa'nın sınırsız olması, geri almanın kontenjanı iade etmesi, 30 Eylül'den sonra kapanma,
// 1 Ocak'ta yenilenme ve haberleri, gerçek dünya haberleri, sözlük, kayıt.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_grid.cjs http://localhost:5182/sebeke-oyun/
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/";let fails=0;
const ok=(c,m)=>{console.log((c?"  ✓ ":"  ✗ ")+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const p=await b.newPage({viewport:{width:1366,height:900}});const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
await p.route(/fonts\.g|tile|arcgis|maptiler|openstreetmap|openfreemap|cartocdn|amazonaws/,r=>r.abort());
await p.goto(URL0);await p.waitForTimeout(4000);
const u=await p.evaluate(()=>performance.getEntriesByType("resource").map(e=>e.name).filter(n=>/\/src\/[\w/]+\.js/.test(n)));
const r=await p.evaluate(async(u)=>{const imp=n=>import(u.find(x=>new URL(x).pathname.endsWith("/src/"+n))||("/src/"+n));
  document.querySelectorAll("dialog[open]").forEach(d=>d.close());
  const st=await imp("state.js"),w=await imp("world.js"),ac=await imp("actions.js"),sim=await imp("sim.js"),G=await imp("grid.js"),ru=await imp("rules.js"),
    cfg=await imp("config.js"),pn=await imp("ui/panel.js"),gl=await imp("glossary.js"),S=st.S,out={};
  S.money=1e10;S.won=true;S.win1=1;S.evCool=1e9;S.mi=99;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1,repReady:1});
  const close=()=>document.querySelectorAll("dialog[open]").forEach(d=>d.close());
  const dayFor=(y,m,d)=>Math.ceil((Date.UTC(y,m,d)-Date.UTC(2026,2,20))/864e5/3)+1;const go=n=>{S.dayNo=n;S.hour=0;sim.newDay();close();};
  const mw=(id,k)=>S.plants.filter(q=>q.t===id&&(!k||q.k===k)).reduce((a,q)=>a+q.mw,0);
  const put=(id,la,lo)=>{S.sites[id]={...w.describe(la,lo),permit:"ok"};return id;};
  go(dayFor(2026,3,10));out.news0=(S.news||[]).some(n=>/^Bağlantı kapasitesi 2026: Türkiye'de yeni RES ve GES için 75 MW/.test(n.t));
  // 1) ilk proje (başlangıç desteği) kontenjana sayılmaz
  put("F",38.95,34.3);for(let i=0;i<8;i++)ac.build("F","res","std");out.first={mw:mw("F"),left:G.gridLeft(),fit:!!S.sites.F.fit};
  // 2) serbest kontenjan: 75 MW = 15 blok; A sahasında 40, B'de 35 MW GES; sonra C'de engel
  put("A",37.75,33.4);put("B",38.6,35.6);put("C",37.3,40.7);
  for(let i=0;i<8;i++)ac.build("A","ges","std");for(let i=0;i<7;i++)ac.build("B","ges","std");
  out.used={A:mw("A"),B:mw("B"),left:G.gridLeft()};
  const m0=S.money;ac.build("C","ges","std");out.blocked={mw:mw("C"),money:S.money===m0,why:ru.siteBlock("C","ges"),res:ru.siteBlock("C","res"),hes:ru.siteBlock("C","hes"),batt:ru.siteBlock("C","batt")};
  S.sel={id:"C",lat:S.sites.C.lat,lon:S.sites.C.lon};pn.renderPanel();await new Promise(r=>setTimeout(r,50));
  const btn=document.querySelector('#panel button[data-a="build"][data-k="ges"]');out.panelBlocked=document.getElementById("panel").innerText.includes("Bağlantı kapasitesi yok")&&!!btn&&btn.disabled;
  // 3) depolamalı: 2 blok batarya (10 MW) → 10 MW GES; sonra yine engel
  ac.build("C","batt","std");ac.build("C","batt","std");out.store0=G.gridStore("C");
  ac.build("C","ges","std");ac.build("C","ges","std");ac.build("C","ges","std");out.store={ges:mw("C","ges"),batt:mw("C","batt"),dep:S.sites.C.depMW,free:G.gridStore("C")};
  // 4) geri alma: kontenjan ve depolama iade edilir
  ac.build("C","batt","std");ac.build("C","ges","std");out.preUndo={dep:S.sites.C.depMW,free:G.gridStore("C")};ac.undoLast();out.undo={dep:S.sites.C.depMW,free:G.gridStore("C"),ges:mw("C","ges")};
  // 5) boşta batarya varsa kontenjandan önce o kullanılır (kontenjan yeni yılda 75): D sahasında 5 MW batarya + 10 MW GES
  // 6) sınırsızlar: HES, Avrupa, YEKA sahasının kendi teknolojisi
  put("H",40.95,39.75);ac.build("H","hes","std");out.hes=mw("H","hes");
  put("E",39.5,-3.5);for(let i=0;i<3;i++)ac.build("E","ges","std");out.eu=mw("E");
  S.sites.Y={...w.describe(39.45,36.8),permit:"ok",cap:60,yeka:{k:"res",p:58.2,from:S.dayNo+35,until:S.dayNo+150,fee:1,bid:20,y:2026,n:"RES-2026 Sivas"}};
  ac.build("Y","res","std");ac.build("Y","ges","std");out.yeka={res:mw("Y","res"),ges:mw("Y","ges")};
  // 7) 30 Eylül'den sonra kapanır: yeni yıl öncesi kontenjan sıfır, haber
  go(dayFor(2026,9,2));out.closed={open:G.gridOpen(),left:G.gridLeft(),news:(S.news||[]).some(n=>/^Bağlantı kapasitesi 2026: serbest kontenjan kapandı \(75 MW kullandın\)/.test(n.t))};
  // 8) 1 Ocak'ta yenilenir; boşta batarya önce kullanılır
  go(dayFor(2027,0,1));out.renew={left:G.gridLeft(),news:(S.news||[]).some(n=>/^Bağlantı kapasitesi 2027: Türkiye'de yeni RES ve GES için 75 MW/.test(n.t))};
  put("D",37.6,30.3);ac.build("D","batt","std");ac.build("D","ges","std");out.storeFirst={left:G.gridLeft(),dep:S.sites.D.depMW};ac.build("D","ges","std");out.storeFirst2={left:G.gridLeft(),dep:S.sites.D.depMW};
  S.sel={id:"D",lat:S.sites.D.lat,lon:S.sites.D.lon};pn.renderPanel();out.panelOpen=document.getElementById("panel").innerText.includes("serbest kontenjanından 70 MW kaldı");
  // 9) gerçek dünya haberleri, sözlük, kayıt
  out.real=["2026-03-02-lisanssiz","2026-09-30-lisanssiz"].every(k=>(S.rn||[]).includes(k));
  out.gloss=gl.TERMS.some(t=>t.k==="baglanti");
  st.save();out.saved=Object.keys(localStorage).some(k=>{const v=localStorage.getItem(k)||"";return v.includes('"grid":{"y":2027,"used":5}')&&v.includes('"depMW":10');});
  return out;},u);
ok(r.news0,"oyun yılı başında kontenjan haberi");
ok(r.first.mw===40&&r.first.left===75&&r.first.fit,`ilk proje kontenjana sayılmıyor (${r.first.mw} MW kuruldu, kontenjan ${r.first.left} MW)`);
ok(r.used.A===40&&r.used.B===35&&r.used.left===0,`kontenjan RES/GES bloklarıyla tükeniyor (A ${r.used.A}, B ${r.used.B} MW; kalan ${r.used.left})`);
ok(r.blocked.mw===0&&r.blocked.money&&r.blocked.why==="grid"&&r.blocked.res==="grid"&&r.blocked.hes===null&&r.blocked.batt===null,"kontenjan bitince yeni GES/RES kurulmuyor, nakit düşmüyor; HES ve batarya serbest");
ok(r.panelBlocked,"panelde engel nedeni yazıyor, GES düğmesi kapalı");
ok(r.store0===10&&r.store.ges===10&&r.store.dep===10&&r.store.free===0,`depolamalı: 10 MW batarya ile ${r.store.ges} MW GES, sonra yine engel`);
ok(r.preUndo.dep===15&&r.undo.dep===10&&r.undo.free===5&&r.undo.ges===10,`geri alma depolama bağlantısını iade ediyor (${r.preUndo.dep} → ${r.undo.dep} MW)`);
ok(r.hes===5&&r.eu===15,"HES ve Avrupa sınırsız");
ok(r.yeka.res===5&&r.yeka.ges===0,"YEKA sahasında kendi teknolojisi (RES) serbest, başka teknoloji (GES) kontenjana tabi");
ok(!r.closed.open&&r.closed.left===0&&r.closed.news,"30 Eylül'den sonra kontenjan kapalı, haber");
ok(r.renew.left===75&&r.renew.news,"1 Ocak'ta kontenjan yenileniyor, haber");
ok(r.storeFirst.left===75&&r.storeFirst.dep===5&&r.storeFirst2.left===70&&r.storeFirst2.dep===5,"boşta batarya varsa kontenjandan önce o kullanılıyor");
ok(r.panelOpen,"panelde kalan kontenjan");
ok(r.real,"gerçek dünya haberleri (2 Mart ve 30 Eylül 2026)");
ok(r.gloss,"sözlükte bağlantı kapasitesi");
ok(r.saved,"kontenjan ve depolama bağlantısı kayda yazılıyor");
ok(!errs.length,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));
await b.close();console.log(fails?`\n${fails} başarısız`:"\nhepsi geçti");process.exit(fails?1:0);})();
