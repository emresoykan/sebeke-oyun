// Destek mekanizmaları (support.js): depolamaya kapasite ödemesi ve yeşil hidrojen üretim desteği. Piyasaya göre tutar
// (Avrupa, Kuzey Amerika; Türkiye'de yok), kullanılabilirlik koşulu (arıza, boştaki batarya), yeşil koşulu (sahadaki
// rüzgâr/güneşle saatlik eşleşme), 45V'in 2028 sınırı, rapor satırları, saha paneli notu ve proje ekonomisi.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_support.cjs http://localhost:5182/sebeke-oyun/
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/";let fails=0;
const ok=(c,m)=>{console.log((c?"  ✓ ":"  ✗ ")+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const p=await b.newPage({viewport:{width:1366,height:768}});const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
await p.route(/fonts\.g/,r=>r.abort());
await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
await p.goto(URL0);await p.waitForTimeout(3500);
const r=await p.evaluate(async()=>{
  const st=await import("/src/state.js"),w=await import("/src/world.js"),ac=await import("/src/actions.js"),sim=await import("/src/sim.js"),sp=await import("/src/support.js"),
    fin=await import("/src/finance.js"),S=st.S,out={};
  S.money=9e7;S.won=true;S.win1=1;S.evCool=99999;S.mi=9;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1});for(const k in S.rivals||{})S.rivals[k].sites=[];
  const put=(id,la,lo)=>{S.sites[id]={...w.describe(la,lo),permit:"ok"};return S.sites[id];};
  put("e",37.6,-4.6);put("n",40.5,-77.5);put("t",37.9,33.0);put("eh",37.7,-4.8);put("nh",35.0,-106.0);put("th",38.1,32.6);
  out.mk=["e","n","t","eh","nh","th"].map(id=>S.sites[id].mreg).join("");
  ac.build("e","batt","std");ac.build("n","batt","std");ac.build("t","batt","std");
  ac.build("eh","ges","std");ac.build("eh","ges","std");ac.build("eh","ges","std");ac.build("eh","h2","std");
  ac.build("nh","ges","std");ac.build("nh","ges","std");ac.build("nh","ges","std");ac.build("nh","h2","std");
  ac.build("th","ges","std");ac.build("th","h2","std");
  const pl=(t,k)=>S.plants.find(q=>q.t===t&&q.k===k);
  out.grant={eh:pl("eh","h2").h2s,nh:pl("nh","h2").h2s,th:pl("th","h2").h2s};
  out.expDay={E:sp.capDay("E","batt",5),N:sp.capDay("N","batt",5),T:sp.capDay("T","batt",5),Ephs:sp.capDay("E","phs",5)};
  // bir gün: kapasite ödemesi tesis başına
  const capOf=()=>Object.fromEntries(["e","n","t"].map(id=>[id,Math.round(pl(id,"batt").ac?.cp||0)]));
  sim.newDay();for(let h=0;h<24;h++)sim.tick();document.querySelectorAll("dialog[open]").forEach(x=>x.close());
  out.cap1=capOf();out.last={cap:Math.round(S.last.cap),h2:S.last.h2};
  // ikinci gün: batarya boşta (GÖP masası) ve Avrupa bataryası arızalı → ödeme yok
  S.desk.batt="off";const c0=capOf();for(let h=0;h<24;h++)sim.tick();document.querySelectorAll("dialog[open]").forEach(x=>x.close());
  const c1=capOf();out.offPaid=c1.e-c0.e+c1.n-c0.n;S.desk.batt="arb";
  pl("e","batt").down=2;const c2=capOf();for(let h=0;h<24;h++)sim.tick();document.querySelectorAll("dialog[open]").forEach(x=>x.close());
  const c3=capOf();out.downPaid=c3.e-c2.e;out.upPaid=c3.n-c2.n;pl("e","batt").down=0;
  // hidrojen: yeşil kg ≤ toplam kg; destek oranı tutarlı; Türkiye'de destek yok
  const h2=id=>{const q=pl(id,"h2");return {sub:Math.round(q.ac.sub||0),r:Math.round(q.ac.r)};};out.h2={eh:h2("eh"),nh:h2("nh"),th:h2("th")};
  // 45V sınırı: takvim 2028'i geçince yeni kurulum hak almaz
  const cal=await import("/src/calendar.js");const d0=S.dayNo;S.dayNo=260;cal.setCalendar(260);out.after2028=sp.h2Grant("N");out.eAfter=!!sp.h2Grant("E");out.date=cal.CAL.date.toISOString().slice(0,10);S.dayNo=d0;cal.setCalendar(d0);
  // proje ekonomisi: kapasite ödemesi ve destek ayrı kalemler
  const f=k=>fin.plantFinance(pl(k[0],k[1]));out.fin={e:f(["e","batt"]),eh:f(["eh","h2"])};
  out.fin=Object.fromEntries(Object.entries(out.fin).map(([k,v])=>[k,{wait:!!v.wait,npv:Math.round(v.npv||0),irr:v.irr}]));
  (await import("/src/ui/hud.js")).renderReport();const rep=document.getElementById("report").textContent;
  out.rep=["Kapasite ödemesi","Hidrojen desteği"].filter(x=>rep.includes(x));
  // saha paneli notları
  const pn=await import("/src/ui/panel.js");const note=(id,k)=>{const o=S.sites[id];S.sel={id,lat:o.lat,lon:o.lon};pn.renderPanel();
    document.querySelector(`#panel button[data-a="tab"][data-k="${k}"]`)?.click();return document.querySelector("#panel .eqnote.support")?.textContent||"";};
  out.notes={e:note("e","batt"),t:note("t","batt"),nh:note("nh","h2"),th:note("th","h2")};
  return out;});
ok(r.mk==="ENTENT",`piyasalar: ${r.mk}`);
ok(Math.abs(r.expDay.E-80.25*0.2094*5000/365)<1&&Math.abs(r.expDay.N-120.147*0.2094*5000/365)<1&&r.expDay.T===0,
  `günlük kapasite ödemesi (5 MW batarya): Avrupa ${r.expDay.E.toFixed(0)} $, Kuzey Amerika ${r.expDay.N.toFixed(0)} $, Türkiye 0; pompaj (Avrupa) ${r.expDay.Ephs.toFixed(0)} $`);
ok(Math.abs(r.cap1.e-r.expDay.E)<2&&Math.abs(r.cap1.n-r.expDay.N)<2&&r.cap1.t===0,`bir günde ödenen: ${JSON.stringify(r.cap1)}`);
ok(r.offPaid===0,"GÖP masasında boştaki batarya kapasite ödemesi almaz");
ok(r.downPaid===0&&r.upPaid>0,`arızalı batarya almaz (${r.downPaid}), çalışan alır (${r.upPaid})`);
ok(r.grant.eh&&Math.abs(r.grant.eh.kg-0.448)<0.001&&r.grant.nh&&r.grant.nh.kg===3&&r.grant.th===null,`hidrojen desteği hakkı: Avrupa ${r.grant.eh&&r.grant.eh.kg.toFixed(3)} $/kg, ABD ${r.grant.nh&&r.grant.nh.kg} $/kg, Türkiye yok`);
ok(r.h2.eh.sub>0&&r.h2.nh.sub>r.h2.eh.sub&&r.h2.th.sub===0,`üç günde destek: Avrupa ${r.h2.eh.sub} $, ABD ${r.h2.nh.sub} $, Türkiye ${r.h2.th.sub} $`);
ok(r.last.h2&&r.last.h2.g<=r.last.h2.kg+1e-6,`yeşil kg (${Math.round(r.last.h2.g)}) toplamı (${Math.round(r.last.h2.kg)}) aşmaz`);
ok(r.after2028===null&&r.eAfter,`45V: takvim ${r.date}, yeni kurulum hak almaz; Avrupa'da alır`);
ok(!r.fin.e.wait&&Number.isFinite(r.fin.e.npv),`proje ekonomisi hesaplanır (Avrupa batarya NPV ${r.fin.e.npv} $)`);
ok(r.rep.length===2,`raporda: ${r.rep.join(", ")}`);
ok(/günde/.test(r.notes.e)&&/kapasite ödemesi yok/.test(r.notes.t)&&/45V/.test(r.notes.nh)&&/desteği yok/.test(r.notes.th),"saha panelinde piyasaya göre destek notu");
ok(errs.length===0,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));
await b.close();console.log(fails?`\n${fails} denetim başarısız`:"\nTüm denetimler geçti");process.exit(fails?1:0);})();
