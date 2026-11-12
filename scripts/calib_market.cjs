// Piyasa fiyat modeli kalibrasyonu (docs/kalibrasyon.md): her piyasada ortalama fiyat, filo düzeyinde rüzgâr ve güneş
// fiyat oranı (ENTSO-E'nin bölge üretimiyle ölçtüğü yakalama oranına denk: Σ fiyat × üretim ÷ Σ üretim ÷ ortalama fiyat;
// sıfır fiyatlı saatlerdeki üretim de sayılır) ve örnek santrallerin kendi yakalama oranı. Rüzgâr filosunun ortalama
// kapasite oranı da yazılır (config.js FLEET_CF). Oyun normal (rakipler yatırım yapar), olay kartları kapalı; her piyasada
// 5 MW GES ve RES'ler. RUNS koşu × DAYS gün (120 gün = bir takvim yılı). Türkiye'de bütün yıllar normal hidrolojik yıl
// (w 1; hydro.js): ölçülen taban düzeydir, kurak ve yağışlı yıllar için scripts/calib_hydro.cjs.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/calib_market.cjs http://localhost:5182/sebeke-oyun/ [gün=120] [koşu=4]
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/",DAYS=+(process.argv[3]||120),RUNS=+(process.argv[4]||4);
const PL={T:[["ges",37.9,32.5],["res",40.05,26.6]],E:[["ges",48.8,11.5],["res",53.4,9.6]],I:[["ges",39.5,-3.5],["res",41.7,-4.3]],R:[["ges",43.9,4.3],["res",50.0,2.8]],L:[["ges",41.3,16.0],["res",41.2,15.6]],K:[["ges",56.0,13.6],["res",63.0,16.5]],N:[["ges",35.0,-106.0],["res",42.0,-94.5]]};
// CALIB_MK="E,R" yalnızca bu piyasaları yazar (hepsi yine simüle edilir)
const MKS=process.env.CALIB_MK?process.env.CALIB_MK.split(","):Object.keys(PL);
// CALIB_REGS='{"E":{"mult":1.8,"neg":{"t":20,"z":40,"a":0.01,"p":2,"f":-283}},"I":{"sk":4}}' REG alanlarını, CALIB_FCF='{"E":0.2}' FLEET_CF'yi koda dokunmadan değiştirir (deneme için)
const REGS=process.env.CALIB_REGS?JSON.parse(process.env.CALIB_REGS):null,FCF=process.env.CALIB_FCF?JSON.parse(process.env.CALIB_FCF):null;
(async()=>{const b=await chromium.launch();const all=[];
for(let run=0;run<RUNS;run++){const p=await b.newPage();const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
  await p.route(/fonts\.g|tile|arcgis|maptiler|openstreetmap|cartocdn|amazonaws/,r=>r.abort());
  await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
  await p.goto(URL0);await p.waitForTimeout(3000);
  const r=await p.evaluate(async([PL,DAYS,REGS,FCF])=>{const st=await import("/src/state.js"),w=await import("/src/world.js"),sim=await import("/src/sim.js"),ac=await import("/src/actions.js"),cfg=await import("/src/config.js"),S=st.S;
    if(REGS)for(const [k,o] of Object.entries(REGS)){Object.assign(cfg.REG[k],o);if(o.s0!=null)S.mSolar[k]=o.s0;}if(FCF)Object.assign(cfg.FLEET_CF,FCF);
    S.money=1e10;S.won=true;S.win1=1;S.evCool=1e9;S.mi=9;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1});
    S.hyd={};for(let y=2026;y<=2035;y++)S.hyd[y]={w:1,ref:0}; // normal hidrolojik yıl (hydro.js): kalibrasyon taban düzeyi ölçer
    const ids={};for(const [mk,list] of Object.entries(PL))list.forEach(([k,la,lo],i)=>{const id=`${mk}_${k}${i}`;S.sites[id]={...w.describe(la,lo),permit:"ok"};ac.build(id,k,"std");ids[id]={mk,k};});
    sim.newDay();const A={};for(const mk in PL)A[mk]={p:0,n:0,wp:0,w:0,sp:0,s:0,f:0,fn:0,wh:0,neg:[]};
    for(let d=0;d<DAYS;d++){for(const mk in PL){const M=st.D[mk],a=A[mk];for(let h=0;h<24;h++){const pr=M.price[h];a.p+=pr;a.n++;if(pr<0)a.neg.push(pr);
        if(M.fleet){a.wp+=pr*M.fleet[h];a.w+=M.fleet[h];a.f+=M.fleet[h];a.fn++;}a.sp+=pr*M.sunP[h];a.s+=M.sunP[h];}a.wh+=M.windDay;}
      for(let h=0;h<24;h++)sim.tick();document.querySelectorAll("dialog[open]").forEach(x=>x.close());}
    const out={};for(const mk in A){const a=A[mk],avg=a.p/a.n;const ng=[...a.neg].sort((x,y)=>x-y);out[mk]={avg,wind:a.w?a.wp/a.w/avg:null,solar:a.sp/a.s/avg,fleetCF:a.fn?a.f/a.fn:null,windH:a.wh/DAYS,plants:{},negShare:ng.length/a.n,negMed:ng.length?ng[Math.floor(ng.length/2)]:null,negMin:ng.length?ng[0]:null,negAvg:ng.length?ng.reduce((x,y)=>x+y,0)/ng.length:null};}
    S.plants.forEach(q=>{const x=ids[q.t];if(!x)return;const a=q.ac;out[x.mk].plants[q.t]={cap:a.r/a.e/out[x.mk].avg,cf:a.e/a.cap};});
    out.riv=Object.values(S.rivals||{}).reduce((a,o)=>a+o.sites.reduce((b,s)=>b+s.mw,0),0);
    return out;},[PL,DAYS,REGS,FCF]);
  all.push(r);const f=(x,d=2)=>x==null?"–":x.toFixed(d);
  console.log(`koşu ${run+1}: `+MKS.map(mk=>{const m=r[mk];return `${mk} fiyat ${f(m.avg,1)} rüzgâr ${f(m.wind)} güneş ${f(m.solar)} filoKF ${f(m.fleetCF,3)} endeks ${f(m.windH)}${m.negShare?` neg %${f(m.negShare*100,1)} ort ${f(m.negAvg,1)} ortanca ${f(m.negMed,1)} min ${f(m.negMin,0)}`:""} | `+Object.entries(m.plants).map(([id,v])=>`${id} ${f(v.cap)}`).join(" ");}).join(" || ")+` rakip ${r.riv} MW${errs.length?" HATA "+errs.join("|"):""}`);
  await p.close();}
await b.close();
const S=(mk,g)=>{const v=all.map(r=>g(r[mk])).filter(x=>x!=null);return v.length?`${(v.reduce((a,b)=>a+b,0)/v.length).toFixed(3)} (${Math.min(...v).toFixed(3)}–${Math.max(...v).toFixed(3)})`:"–";};
for(const mk of MKS)console.log(`${mk}: fiyat ${S(mk,m=>m.avg)} | rüzgâr oranı ${S(mk,m=>m.wind)} | güneş oranı ${S(mk,m=>m.solar)} | filo KF ${S(mk,m=>m.fleetCF)} | rüzgâr endeksi ${S(mk,m=>m.windH)} | negatif saat payı ${S(mk,m=>m.negShare)} | negatif ortalama ${S(mk,m=>m.negAvg)}`);
})();
