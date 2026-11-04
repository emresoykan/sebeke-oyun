// Hidrolojik yıl kalibrasyonu (hydro.js, docs/kalibrasyon.md "Hidrolojik yıl"): bütün yıllara aynı su endeksi (w) verilip
// Türkiye piyasasının aylık ortalama fiyatı ölçülür. Hedef: EPİAŞ'ta 2026 (yağışlı, w ~1,27) ile 2025'in (kurak, w 0,78)
// aylık TL fiyat oranı (kurdan bağımsız). Oyun normal (rakipler yatırım yapar), olay kartları kapalı. Konya kırsalında 5 MW GES ve
// Çanakkale'de 5 MW RES'in ortalama satış fiyatı da yazılır (YEKDEM kararı için).
// Kullanım: npx vite --port 5182 &  sonra  node scripts/calib_hydro.cjs http://localhost:5182/sebeke-oyun/ [gün=120] [koşu=2] [w listesi=0.78,1,1.27]
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/",DAYS=+(process.argv[3]||120),RUNS=+(process.argv[4]||2);
const WS=(process.argv[5]||"0.78,1,1.27").split(",").map(Number);
const AY=["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
(async()=>{const b=await chromium.launch();const res={};
for(const W of WS)for(let run=0;run<RUNS;run++){const p=await b.newPage();const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
  await p.route(/fonts\.g|tile|arcgis|maptiler|openstreetmap|cartocdn|amazonaws/,r=>r.abort());
  await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
  await p.goto(URL0);await p.waitForTimeout(3000);
  const r=await p.evaluate(async([W,DAYS])=>{const st=await import("/src/state.js"),sim=await import("/src/sim.js"),cal=await import("/src/calendar.js"),w=await import("/src/world.js"),ac=await import("/src/actions.js"),S=st.S;
    S.money=1e10;S.won=true;S.win1=1;S.evCool=1e9;S.mi=9;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1});
    S.hyd={};for(let y=2026;y<=2030;y++)S.hyd[y]={w:W,ref:0};
    [["G","ges",37.75,33.4],["R","res",40.05,26.6]].forEach(([id,k,la,lo])=>{S.sites[id]={...w.describe(la,lo),permit:"ok"};ac.build(id,k,"std");});
    sim.newDay();const m={};let tot=0,n=0;
    for(let d=0;d<DAYS;d++){const mo=cal.CAL.date.getUTCMonth(),a=m[mo]||(m[mo]={p:0,n:0,lo:0});const pr=st.D.T.price;
      for(let h=0;h<24;h++){a.p+=pr[h];a.n++;if(pr[h]<5)a.lo++;tot+=pr[h];n++;}
      for(let h=0;h<24;h++)sim.tick();document.querySelectorAll("dialog[open]").forEach(x=>x.close());}
    const sp=id=>{const q=S.plants.find(q=>q.t===id);return q&&q.ac&&q.ac.e>0?q.ac.r/q.ac.e:null;};
    return {avg:tot/n,ges:sp("G"),res:sp("R"),m:Object.fromEntries(Object.entries(m).map(([k,a])=>[k,{avg:a.p/a.n,lo:a.lo/a.n}]))};},[W,DAYS]);
  (res[W]=res[W]||[]).push(r);console.log(`w ${W} koşu ${run+1}: yıl ${r.avg.toFixed(1)} $/MWh${errs.length?" HATA "+errs.join("|"):""}`);
  await p.close();}
await b.close();
const mean=(W,f)=>{const v=res[W].map(f).filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;};
const f1=x=>x==null?"–":x.toFixed(1),f2=x=>x==null?"–":x.toFixed(2);
console.log("\nAylık ortalama fiyat ($/MWh); parantezde 5 $/MWh altındaki saatlerin payı");
console.log("ay   "+WS.map(W=>`w ${W}`.padEnd(16)).join("")+(WS.length>1?`oran ${WS[WS.length-1]}/${WS[0]}`:""));
for(let mo=0;mo<12;mo++){const v=WS.map(W=>mean(W,r=>r.m[mo]?r.m[mo].avg:null)),lo=WS.map(W=>mean(W,r=>r.m[mo]?r.m[mo].lo:null));if(v[0]==null)continue;
  console.log(AY[mo].padEnd(5)+v.map((x,i)=>`${f1(x)} (%${Math.round((lo[i]||0)*100)})`.padEnd(16)).join("")+(WS.length>1?f2(v[v.length-1]/v[0]):""));}
console.log("yıl  "+WS.map(W=>f1(mean(W,r=>r.avg)).padEnd(16)).join(""));
console.log("GES  "+WS.map(W=>f1(mean(W,r=>r.ges)).padEnd(16)).join("")+" (Konya, ortalama satış fiyatı)");
console.log("RES  "+WS.map(W=>f1(mean(W,r=>r.res)).padEnd(16)).join("")+" (Çanakkale)");
})();
