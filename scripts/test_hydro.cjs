// Hidrolojik yıl (Türkiye, src/hydro.js). Sınanan: oyunun başında 2026'nın gerçek değeri ve haberi, fiyat teriminin
// büyüklüğü (aylık ağırlık, kurak yılda küçük pay), aynı hava ve rastgelelikle bir günün Türkiye fiyatının yalnızca
// hidrolojiyle değişmesi (Avrupa değişmez), Türkiye'deki HES'in su bütçesinin w ile ölçeklenmesi, gelecek yılın
// bilinmemesi, yıl geçişinde geçmiş yıllardan seçim ve haber, seçimin dağılımı, saha paneli (GES ve yalnızca HES'li saha),
// gerçek dünya haberi, sözlük, kayıt.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_hydro.cjs http://localhost:5182/sebeke-oyun/
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
  const st=await imp("state.js"),w=await imp("world.js"),ac=await imp("actions.js"),sim=await imp("sim.js"),H=await imp("hydro.js"),
    cfg=await imp("config.js"),cal=await imp("calendar.js"),pn=await imp("ui/panel.js"),gl=await imp("glossary.js"),S=st.S,D=()=>st.D,C=cfg.HYDRO,out={};
  S.money=1e10;S.won=true;S.win1=1;S.evCool=1e9;S.mi=99;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1,repReady:1});
  const near=(a,b,e=1e-6)=>Math.abs(a-b)<=e*Math.max(1,Math.abs(b));
  const dayFor=(y,m,d)=>Math.ceil((Date.UTC(y,m,d)-Date.UTC(2026,2,20))/864e5/3)+1;
  // 1) oyunun başı: 2026 gerçek yıl, haber
  out.start={h:S.hyd&&S.hyd[2026],news:(S.news||[]).filter(n=>/^Hidroloji 2026: çok yağışlı bir yıl \(gerçek yıl, TEİAŞ\)/.test(n.t)).length,next:H.hydOf(2027)};
  // 2) fiyat terimi: Nisan 2026, Ocak 2026; kurak yılda küçük pay
  const d=(y,m)=>new Date(Date.UTC(y,m,15));
  out.shift={apr:H.hydShift(d(2026,3)),jan:H.hydShift(d(2026,0))};
  out.shift.eve=H.hydShift(d(2026,3),20);S.hyd[2031]={w:0.78,ref:2025};out.shift.dry=H.hydShift(d(2031,3));out.shift.dryEve=H.hydShift(d(2031,3),20);
  // saatlik ağırlık: yağışlı yılda akşam zirvesi az düşer, gece ve öğle tam; kurak yılda bütün saatler eşit
  out.hrOk=C.hr.length===24&&C.hr[3]===1&&C.hr[12]>=1&&C.hr[20]<0.5&&C.hr.every(x=>x>0);
  out.shiftOk=near(out.shift.apr,C.depth*C.mon[3]*(C.known[2026]-1))&&near(out.shift.jan,C.depth*C.mon[0]*(C.known[2026]-1))&&near(out.shift.eve,out.shift.apr*C.hr[20])
    &&near(out.shift.dry,C.depth*C.mon[3]*(-0.22)*C.dry)&&near(out.shift.dryEve,out.shift.dry);
  // 3) aynı gün, aynı hava ve rastgelelik: Türkiye fiyatı yalnızca hidrolojiyle değişir; HES su bütçesi w ile ölçeklenir
  S.sites.m={...w.describe(40.95,39.75),permit:"ok"};ac.build("m","hes","std");const hes=S.plants.find(q=>q.t==="m"&&q.k==="hes");
  S.dayNo=dayFor(2026,3,15);S.hour=0;S.newsDay=S.dayNo; // yeni gün haberleri ve rakip hamleleri tekrarlanmasın
  const wx0=JSON.stringify(S.wx),mR=Math.random,run=(W)=>{S.wx=JSON.parse(wx0);S.hyd[2026]={w:W,ref:0};hes.wet=0.35;let i=0;Math.random=()=>((i++*0.6180339887)%1);
    sim.newDay();Math.random=mR;return {T:[...D().T.price],E:[...D().E.price],hes:hes.plan.reduce((a,x)=>a+x,0)};};
  const a=run(1),b=run(1.27),mult=cfg.REG.T.mult,sh=C.depth*C.mon[3]*0.27*mult;
  const kept=a.T.map((x,h)=>[x,b.T[h],h]).filter(([x,y])=>y>0.01&&x<110*mult-0.01),diffs=kept.map(([x,y])=>x-y);
  out.day={sh,n:diffs.length,min:Math.min(...diffs),max:Math.max(...diffs),zeroA:a.T.filter(x=>x<0.01).length,zeroB:b.T.filter(x=>x<0.01).length,
    sameE:a.E.every((x,h)=>near(x,b.E[h],1e-9)),hesA:a.hes,hesB:b.hes,hesCap:hes.mw*24};
  out.dayOk=diffs.length>0&&kept.every(([x,y,h])=>near(x-y,sh*C.hr[h],1e-6))&&out.day.sameE;
  out.hesOk=a.hes>0&&a.hes<hes.mw*24*0.9&&near(b.hes/a.hes,1.27,1e-6);
  S.hyd[2026]={w:C.known[2026],real:1};
  // 4) yıl geçişi: 2027 önceden bilinmiyor; 1 Ocak'ta geçmiş yıllardan biri seçilir, haber ve kayıt
  delete S.hyd[2027];S.dayNo=dayFor(2026,11,28);S.hour=0;sim.newDay();out.pre2027=H.hydOf(2027);
  S.dayNo=dayFor(2027,0,1);S.hour=0;sim.newDay();const h27=S.hyd[2027];out.h27=h27;
  out.y27Ok=!!h27&&C.hist[h27.ref]===h27.w&&(S.news||[]).some(n=>n.t.startsWith(`Hidroloji 2027: ${H.hydClass(h27.w).n} bir yıl (${h27.ref} gibi)`))&&(S.log||[]).some(l=>/^Gün \d+: Hidroloji 2027:/.test(l));
  // 5) seçimin dağılımı: 3000 seçimde her geçmiş yıl ~1/11, ortalama ~1
  const cnt={};let sum=0;for(let i=0;i<3000;i++){delete S.hyd[2027];const x=H.hydOf(2027);cnt[x.ref]=(cnt[x.ref]||0)+1;sum+=x.w;}
  S.hyd[2027]=h27;out.dist={n:Object.keys(cnt).length,min:Math.min(...Object.values(cnt)),max:Math.max(...Object.values(cnt)),mean:sum/3000};
  // 6) panel: Türkiye GES sahasında YEKDEM'in altında hidroloji ve ertesi yılın olasılığı; yalnızca HES'li sahada bu yılın durumu
  S.sites.TR1={...w.describe(37.75,33.4),permit:"ok"};ac.build("TR1","ges","std");
  S.dayNo=dayFor(2027,5,1);S.hour=0;sim.newDay();
  S.sel={id:"TR1",lat:S.sites.TR1.lat,lon:S.sites.TR1.lon};pn.renderPanel();const tx1=document.getElementById("panel").innerText;
  out.panel1=tx1.includes(`Hidroloji 2027:`)&&tx1.includes("2028 hidrolojisi 1 Ocak'ta belli olur (2015–2025: 3 kurak, 4 normal, 3 yağışlı, 1 çok yağışlı yıl)");
  S.sel={id:"m",lat:S.sites.m.lat,lon:S.sites.m.lon};pn.renderPanel();const tx2=document.getElementById("panel").innerText;
  out.panel2=tx2.includes("Hidroloji 2027:")&&!tx2.includes("2028 hidrolojisi");
  // 7) gerçek dünya haberi (1 Haziran 2026) bir kez; sözlük; kayıt
  out.real=(S.news||[]).filter(n=>/Nisan ve Mayıs'ta gün öncesi fiyatı/.test(n.t)).length+((S.rn||[]).includes("2026-06-01-hidro")?10:0);
  out.gloss=gl.TERMS.some(t=>t.k==="hidro");
  st.save();out.saved=Object.keys(localStorage).some(k=>{const v=localStorage.getItem(k)||"";return v.includes('"hyd":{')&&v.includes(`"2027":{"w":${h27.w}`);});
  return out;},u);
ok(r.start.h&&r.start.h.w===1.27&&r.start.h.real&&r.start.news===1&&r.start.next===null,`oyunun başı: 2026 gerçek yıl (w ${r.start.h&&r.start.h.w}), haber bir kez, 2027 henüz belli değil`);
ok(r.hrOk,"saatlik ağırlık: 24 saat, gece 1, öğle en az 1, saat 20 yarının altında");
ok(r.shiftOk,`fiyat terimi: Nisan ${r.shift.apr.toFixed(2)} (saat 20: ${r.shift.eve.toFixed(2)}), Ocak ${r.shift.jan.toFixed(2)}, kurak Nisan ${r.shift.dry.toFixed(2)} (saat 20 aynı) $/MWh (piyasa çarpanından önce)`);
ok(r.dayOk,`aynı gün: Türkiye fiyatı kesilmeyen ${r.day.n} saatte tam ağırlıklı tutar kadar düşük (en etkili saatte ${r.day.sh.toFixed(2)}; ${r.day.min.toFixed(2)}–${r.day.max.toFixed(2)} $/MWh); sıfır saat ${r.day.zeroA} → ${r.day.zeroB}; Avrupa aynı`);
ok(r.hesOk,`Türkiye HES su bütçesi w ile: ${r.day.hesA.toFixed(1)} → ${r.day.hesB.toFixed(1)} MWh (×${(r.day.hesB/r.day.hesA).toFixed(3)})`);
ok(r.pre2027===null&&r.y27Ok,`yıl geçişi: 2027 Aralık'ta bilinmiyor, 1 Ocak'ta seçildi (${r.h27&&r.h27.ref} gibi, w ${r.h27&&r.h27.w}), haber ve kayıt`);
ok(r.dist.n===11&&r.dist.min>180&&r.dist.max<370&&Math.abs(r.dist.mean-1)<0.02,`seçim dağılımı: 11 yılın hepsi (${r.dist.min}–${r.dist.max} kez / 3000), ortalama w ${r.dist.mean.toFixed(3)}`);
ok(r.panel1,"GES sahası panelinde hidroloji ve ertesi yılın geçmiş yıllara göre dağılımı");
ok(r.panel2,"yalnızca HES'li Türkiye sahasında bu yılın hidrolojisi");
ok(r.real===11,`1 Haziran 2026 gerçek dünya haberi bir kez (${r.real})`);
ok(r.gloss,"sözlükte hidrolojik yıl terimi");
ok(r.saved,"yılın hidrolojisi kayda yazılıyor");
ok(!errs.length,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));
await b.close();console.log(fails?`\n${fails} başarısız`:"\nhepsi geçti");process.exit(fails?1:0);})();
