// Teknoloji ekonomisi denetimi: her teknolojiyi üç piyasada (Türkiye T, Avrupa E, Kuzey Amerika N) temsilî bir sahada
// DAYS oyun günü (120 gün = bir takvim yılı) işletir, RUNS kez tekrarlar ve proje ekonomisini ölçer: kapasite faktörü,
// gerçekleşen satış fiyatı, yakalama oranı (desteksiz satış fiyatı ÷ piyasanın saatlik ortalama fiyatı), LCOE (oyunun %10 iskontosu ve
// IRENA'nın OECD varsayımına yakın %7,5), IRR, NPV; depolama ve hidrojende yıllık net gelir ve destekli/desteksiz IRR.
// Oyuncunun güneş kapasitesi öğle fiyatını düşürdüğü için (sim.js: güneş MW / 200) güneş türleri ayrı koşularda ölçülür:
// B1 GES ve güneş dışı her şey, B2 yüzer GES (HES gölünde), B3 deniz üstü GES, B4 elektrolizör (yeşil hidrojen desteği için
// sahada 15 MW GES ile). Rakipler varsayılan olarak dondurulur (yatırım yapmaz: gelirin üst sınırı); "rakip" seçeneğiyle
// normal oyundaki gibi yatırım yaparlar. Olay kartları kapalı. Her koşu yeni bir oyunla başlar.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/audit_econ.cjs http://localhost:5182/sebeke-oyun/ [gün=120] [koşu=3] [çıktı.json|-] [rakip]
const { chromium } = require("playwright");
const fs=require("fs");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/",DAYS=+(process.argv[3]||120),RUNS=+(process.argv[4]||3),OUT=process.argv[5]&&process.argv[5]!=="-"?process.argv[5]:null,
  RIV=process.argv[6]==="rakip"; // rakip: rakipler normal oyundaki gibi yatırım yapar (fiyatı ek olarak düşürür); yoksa dondurulur
// [teknoloji, enlem, boylam]; aynı batch'te aynı saha kimliği tekrar edilirse aynı sahaya kurulur
const SITES={
  T:{ges:[37.9,33.0],res:[40.05,26.6],off:[40.6,27.2],mar:[40.7,27.5],mtn:[40.95,39.75],jes:[37.85,28.0],bes:[39.0,35.5],csp:[37.0,39.3],batt:[37.9,33.9],spv:[36.75,31.2],h2:[38.1,32.6]},
  E:{ges:[37.6,-4.6],res:[53.4,9.6],off:[54.2,7.9],flo:[44.0,-12.5],mar:[51.3,-3.4],mtn:[46.2,7.6],jes:[43.2,10.9],bes:[52.2,19.5],csp:[37.7,-4.4],batt:[51.0,10.0],spv:[51.6,3.4],h2:[37.7,-4.8]},
  N:{ges:[35.0,-106.0],res:[42.0,-94.5],off:[39.3,-74.2],flo:[35.0,-124.5],mar:[45.3,-64.6],mtn:[39.5,-106.0],jes:[38.8,-122.8],bes:[41.5,-90.0],csp:[33.4,-112.5],batt:[35.1,-106.2],spv:[40.4,-73.8],h2:[35.0,-106.0]}
};
// batch: [saha anahtarı, teknoloji, blok sayısı]; kilitli teknolojiler (deniz, yüzer RES) toplam güç eşiğini geçmek için sonda
const BATCH={
  B1:[["ges","ges",1],["res","res",1],["off","off",1],["mtn","hes",1],["mtn","phs",1],["jes","jes",1],["bes","bes",1],["csp","csp",1],["batt","batt",1],["mar","mar",1],["flo","flo",1]],
  B2:[["mtn","hes",1],["mtn","fpv",1]],
  B3:[["spv","spv",1]],
  B4:[["h2","ges",3],["h2","h2",1]]
};
const MEASURE={B1:null,B2:["fpv"],B3:["spv"],B4:["h2"]};
(async()=>{
const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const all=[],t0=Date.now();
for(const [bn,list] of Object.entries(BATCH))for(let run=0;run<RUNS;run++){
  const p=await b.newPage();const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
  await p.route(/fonts\.g|tile|arcgis|maptiler|openstreetmap|cartocdn|amazonaws/,r=>r.abort());
  await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
  await p.goto(URL0);await p.waitForTimeout(3000);
  const rows=await p.evaluate(async([SITES,list,DAYS,measure,RIV])=>{
    const st=await import("/src/state.js"),w=await import("/src/world.js"),sim=await import("/src/sim.js"),fin=await import("/src/finance.js"),ac=await import("/src/actions.js"),cfg=await import("/src/config.js"),S=st.S;
    S.money=1e10;S.won=true;S.win1=1;S.evCool=1e9;S.mi=9;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1});
    if(!RIV)for(const k in S.rivals||{}){S.rivals[k].sites=[];S.rivals[k].cash=-1e15;}
    const built=[];
    for(const mk of ["T","E","N"])for(const [sk,k,n] of list){const c=SITES[mk][sk];if(!c)continue;const id=mk+"_"+sk;
      if(!S.sites[id])S.sites[id]={...w.describe(c[0],c[1]),permit:"ok"};
      const before=S.plants.length;for(let i=0;i<n;i++)ac.build(id,k,"std");if(S.plants.length===before)built.push("KURULAMADI "+id+":"+k);}
    if(!RIV)for(const k in S.rivals||{}){S.rivals[k].sites=[];S.rivals[k].cash=-1e15;}
    sim.newDay();const sum={T:0,E:0,N:0};let n=0;
    for(let d=0;d<DAYS;d++){for(const mk in sum)sum[mk]+=st.D[mk].price.reduce((a,x)=>a+x,0);n+=24;
      for(let h=0;h<24;h++)sim.tick();document.querySelectorAll("dialog[open]").forEach(x=>x.close());
      if(!RIV)for(const k in S.rivals||{})S.rivals[k].cash=-1e15;}
    const avg={T:sum.T/n,E:sum.E/n,N:sum.N/n};
    const out=[];
    const pick=S.plants.filter(q=>!measure||measure.includes(q.k));
    const seen=new Set();
    for(const q of pick){const key=q.t+":"+q.k;if(seen.has(key))continue;seen.add(key);
      // aynı sahada aynı teknolojiden birden çok kayıt varsa ilki (hepsi aynı hava ve fiyatı görür)
      const mk=S.sites[q.t].mreg,a=q.ac;fin.setWacc(0.10);const f10=fin.plantFinance(q);fin.setWacc(0.075);const f75=fin.plantFinance(q);fin.setWacc(0.10);
      // destekler (kapasite ödemesi, hidrojen desteği, deniz enerjisinin MWh başına yenilik desteği) çıkarılınca
      const cp=a.cp||0,sb=a.sub||0,mp=q.k==="mar"?a.e*cfg.MAR_PREMIUM:0;a.r-=cp+sb+mp;a.cp=0;a.sub=0;const g=fin.plantFinance(q);a.r+=cp+sb+mp;a.cp=cp;a.sub=sb;
      const yr=x=>a.cap>0?x/a.cap*8760/1000:0; // $/kW-yıl (a.cap: MW × saat)
      out.push({k:q.k,mk,site:q.t,cf:f10.cf,price:f10.price,price0:g.price,avg:avg[mk],cap:g.price/avg[mk],lcoe10:f10.lcoe,lcoe75:f75.lcoe,irr:f10.irr,irr0:g.irr,npv:f10.npv,
        net:["batt","phs","h2"].includes(q.k)?yr(a.r-cp-sb):null,cpY:yr(cp),subY:yr(sb),capex:f10.capex/q.mw/1000,opex:f10.opex/q.mw/1000});}
    const riv=Object.values(S.rivals||{}).reduce((a,o)=>a+o.sites.reduce((b,s)=>b+s.mw,0),0);
    return {out,built,avg,riv};},[SITES,list,DAYS,MEASURE[bn],RIV]);
  rows.out.forEach(r=>all.push({batch:bn,run,...r}));
  console.log(`${bn} koşu ${run+1}/${RUNS}: ${rows.out.length} santral, ortalama fiyat T ${rows.avg.T.toFixed(1)} E ${rows.avg.E.toFixed(1)} N ${rows.avg.N.toFixed(1)} $/MWh${RIV?`, rakip kurulu güç ${rows.riv} MW`:""}${rows.built.length?" • "+rows.built.join(", "):""}${errs.length?" • HATA: "+errs.join(" | "):""} (${((Date.now()-t0)/60000).toFixed(1)} dk)`);
  await p.close();}
await b.close();
// özet: teknoloji × piyasa, koşuların ortalaması ve aralığı
const grp={};all.forEach(r=>{(grp[r.k+"|"+r.mk]??=[]).push(r);});
const m=(a,f)=>{const v=a.map(f).filter(x=>x!=null&&Number.isFinite(x));return v.length?{avg:v.reduce((x,y)=>x+y,0)/v.length,min:Math.min(...v),max:Math.max(...v),n:v.length}:null;};
const summary=Object.entries(grp).map(([key,a])=>{const [k,mk]=key.split("|");
  return {k,mk,cf:m(a,r=>r.cf),price:m(a,r=>r.price),avg:m(a,r=>r.avg),cap:m(a,r=>r.cap),lcoe10:m(a,r=>r.lcoe10),lcoe75:m(a,r=>r.lcoe75),irr:m(a,r=>r.irr),irr0:m(a,r=>r.irr0),net:m(a,r=>r.net),cpY:m(a,r=>r.cpY),subY:m(a,r=>r.subY),runs:a.length};});
const f=(x,d=1,s=1)=>x?`${(x.avg*s).toFixed(d)}${x.n>1?` (${(x.min*s).toFixed(d)}–${(x.max*s).toFixed(d)})`:""}`:"–";
console.table(summary.map(r=>({tek:r.k,pz:r.mk,KF:f(r.cf,1,100),satis:f(r.price,0),yakalama:f(r.cap,2),LCOE10:f(r.lcoe10,0),LCOE75:f(r.lcoe75,0),IRR:f(r.irr,1,100),IRR_destek_yok:f(r.irr0,1,100),net_kW:f(r.net,0)})));
if(OUT)fs.writeFileSync(OUT,JSON.stringify({date:new Date().toISOString(),DAYS,RUNS,rivals:RIV,SITES,rows:all,summary},null,1));
console.log(`Toplam ${((Date.now()-t0)/60000).toFixed(1)} dk`);
})();
