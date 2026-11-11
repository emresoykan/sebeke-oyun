// Türkiye piyasasının aylık fiyat şekli (docs/kalibrasyon.md "Günlük fiyat şekli"): her ay ortalama fiyat, günlük en yüksek–en
// düşük farkı, saat gruplarının ortalamaya oranı (gece 0–6, sabah 7–9, öğle 10–15, 16–17, akşam 18–22), tavandaki saat payı ve
// piyasanın güneş fiyat oranı (Σ fiyat × güneş üretim profili ÷ Σ profil ÷ ortalama). Hedef: EPİAŞ 2025 saatlik PTF (USD).
// Oyun normal (rakipler yatırım yapar), olay kartları kapalı; bütün yıllar aynı su endeksi (varsayılan w 1, normal yıl).
// Kullanım: npx vite --port 5182 &  sonra  node scripts/calib_shape.cjs http://localhost:5182/sebeke-oyun/ [gün=120] [koşu=3] [w=1]
//   [mult] [cap] [sm: 12 değer] [nz] [dem: 12 değer]: ayar denemesi (CALIB_DT='{...}' gün tipi çarpanı REG.T.dt yerine) için REG.T yerine (kod değişmeden). CALIB_OUT=dosya.json ham sonucu yazar.
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/",DAYS=+(process.argv[3]||120),RUNS=+(process.argv[4]||3),W=+(process.argv[5]||1);
const O={mult:process.argv[6]?+process.argv[6]:null,cap:process.argv[7]?+process.argv[7]:null,sm:process.argv[8]?process.argv[8].split(",").map(Number):null,nz:process.argv[9]?+process.argv[9]:null,dem:process.argv[10]?process.argv[10].split(",").map(Number):null,dt:process.env.CALIB_DT?JSON.parse(process.env.CALIB_DT):null};
if(O.sm&&O.sm.length!==12)throw new Error("sm 12 değer olmalı");
const G=[["gece",0,6],["sabah",7,9],["öğle",10,15],["16–17",16,17],["akşam",18,22]];
// EPİAŞ 2025 (USD; PTF ve lisanslı güneşin gerçek zamanlı üretimi, docs/kalibrasyon.md): ay → [ortalama, günlük fark, gece, sabah,
// öğle, 16–17, akşam, tavan payı]; SOL: aylık güneş fiyat oranı (yıl 0,834)
const REAL={1:[70.8,36.6,0.91,1.13,0.91,1.16,1.11,.16],2:[68.7,34.8,0.93,1.11,0.90,1.11,1.11,.06],3:[59.1,53.3,1.08,1.03,0.65,1.07,1.26,.05],
  4:[64.6,57.0,1.04,0.95,0.68,1.03,1.32,.15],5:[63.6,65.2,1.13,0.85,0.62,0.96,1.34,.17],6:[56.0,65.5,1.16,0.74,0.58,0.95,1.41,.08],
  7:[74.0,37.6,1.05,0.93,0.84,1.04,1.13,.27],8:[72.2,40.2,1.07,0.95,0.80,1.02,1.14,.21],9:[66.2,53.3,1.07,0.96,0.70,1.11,1.22,.12],
  10:[65.7,57.7,1.02,1.05,0.70,1.20,1.21,.26],11:[66.1,51.0,0.95,1.13,0.79,1.21,1.17,.29],12:[69.8,31.5,0.89,1.09,0.97,1.13,1.08,.29]};
const SOL=[0.928,0.926,0.743,0.793,0.751,0.788,0.899,0.868,0.827,0.801,0.827,0.963];
(async()=>{const b=await chromium.launch();const res=[];
for(let run=0;run<RUNS;run++){const p=await b.newPage();const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
  await p.route(/fonts\.g|tile|arcgis|maptiler|openstreetmap|cartocdn|amazonaws/,r=>r.abort());
  await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
  await p.goto(URL0);await p.waitForTimeout(3000);
  const r=await p.evaluate(async([W,DAYS,O])=>{const st=await import("/src/state.js"),sim=await import("/src/sim.js"),cal=await import("/src/calendar.js"),cfg=await import("/src/config.js"),S=st.S;
    if(O.mult!=null)cfg.REG.T.mult=O.mult;if(O.cap!=null)cfg.REG.T.cap=O.cap;if(O.sm)cfg.REG.T.sm=O.sm;if(O.nz!=null)cfg.REG.T.nz=O.nz;if(O.dem)cfg.REG.T.dem=O.dem;if(O.dt)cfg.REG.T.dt={...cfg.REG.T.dt,...O.dt};const dty=await import("/src/daytype.js");
    S.money=1e10;S.won=true;S.win1=1;S.evCool=1e9;S.mi=9;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1});
    S.hyd={};for(let y=2026;y<=2030;y++)S.hyd[y]={w:W,ref:0};
    const top=(cfg.REG.T.cap!=null?cfg.REG.T.cap:110*cfg.REG.T.mult)-0.01,m={},days=[];
    for(let d=0;d<DAYS;d++){const mo=cal.CAL.date.getUTCMonth(),a=m[mo]||(m[mo]={d:0,p:0,sp:0,top:0,h:Array(24).fill(0),sp2:0,s:0});const M=st.D.T,pr=M.price;
      days.push({mo,k:dty.dayType(cal.CAL.date).k,p:[...pr]});
      a.d++;pr.forEach((x,h)=>{a.h[h]+=x;a.p+=x/24;if(x>=top)a.top++;a.sp2+=x*M.sunP[h];a.s+=M.sunP[h];});a.sp+=Math.max(...pr)-Math.min(...pr);
      for(let h=0;h<24;h++)sim.tick();document.querySelectorAll("dialog[open]").forEach(x=>x.close());}
    return Object.fromEntries(Object.entries(m).map(([k,a])=>[k,{avg:a.p/a.d,sp:a.sp/a.d,h:a.h.map(x=>x/a.d),top:a.top/(24*a.d),sol:a.s>0?a.sp2/a.s:null,ps:a.sp2,s:a.s,d:a.d}]).concat([["days",days]]));},[W,DAYS,O]);
  res.push(r);console.log(`koşu ${run+1}${errs.length?" HATA "+errs.join("|"):""}`);await p.close();}
await b.close();
if(process.env.CALIB_OUT)require("fs").writeFileSync(process.env.CALIB_OUT,JSON.stringify(res));
const mean=(mo,f)=>{const v=res.map(r=>r[mo]).filter(Boolean).map(f).filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;};
const f1=x=>x==null?"–":x.toFixed(1),f2=x=>x==null?"–":x.toFixed(2);
console.log(`\nw ${W}; her hücre oyun / EPİAŞ 2025`);
console.log("ay  ortalama     fark        "+G.map(g=>g[0].padEnd(11)).join(" ")+" tavan       güneş oranı");
let A=0,Sp=0,PS=0,SS=0,n=0;
for(let mo=0;mo<12;mo++){if(!res[0][mo])continue;const R=REAL[mo+1],avg=mean(mo,r=>r.avg);
  const g=G.map(([,a,z])=>mean(mo,r=>{let s=0;for(let h=a;h<=z;h++)s+=r.h[h];return s/(z-a+1)/r.avg;}));
  const sol=mean(mo,r=>r.sol!=null?r.sol/r.avg:null);A+=avg;Sp+=mean(mo,r=>r.sp);n++;PS+=mean(mo,r=>r.ps/r.d);SS+=mean(mo,r=>r.s/r.d);
  console.log(String(mo+1).padStart(2)+"  "+`${f1(avg)}/${R[0]}`.padEnd(12)+" "+`${f1(mean(mo,r=>r.sp))}/${R[1]}`.padEnd(11)+" "+g.map((x,i)=>`${f2(x)}/${R[2+i].toFixed(2)}`.padEnd(11)).join(" ")+" "+`${Math.round(mean(mo,r=>r.top)*100)}/${Math.round(R[7]*100)}%`.padEnd(11)+" "+`${f2(sol)}/${SOL[mo].toFixed(2)}`);}
console.log(`yıl: ortalama ${f1(A/n)} (EPİAŞ 66,4), günlük fark ${f1(Sp/n)} (48,6), güneş fiyat oranı ${f2(PS/SS/(A/n))} (0,83)`);
// gün tipi (daytype.js): aynı ayın iş günlerine göre gün ortalaması, öğle (10–15), gece (0–6), akşam (18–22), günlük fark
// EPİAŞ 2024–2025 hedefi (docs/kalibrasyon.md "Hafta sonu ve tatil"): [gün, öğle, gece, akşam, günlük fark $]
const DT={wd:[1,1,1,1,42.3],sat:[0.93,0.77,1.03,1.00,50.2],sun:[0.78,0.40,1.01,0.96,67.4],hol:[0.85,0.61,1.0,0.99,61.5],bay:[0.52,0.08,0.74,0.82,76.1]};
const days=res.flatMap(r=>r.days),ref={};
days.filter(x=>x.k==="wd").forEach(x=>{const a=ref[x.mo]||(ref[x.mo]={n:0,h:Array(24).fill(0)});a.n++;x.p.forEach((v,h)=>a.h[h]+=v);});
const sum=(p,a,z)=>{let s=0;for(let h=a;h<=z;h++)s+=p[h];return s;};
console.log("\nGün tipi: oyun / EPİAŞ 2024–2025 (aynı ayın iş günlerine göre)\ntip   n    gün         öğle        gece        akşam       günlük fark $");
for(const k of ["wd","sat","sun","hol","bay"]){const L=days.filter(x=>x.k===k&&ref[x.mo]);if(!L.length){console.log(k.padEnd(5)," 0");continue;}
  const r=(a,z)=>L.reduce((s,x)=>{const R=ref[x.mo].h.map(v=>v/ref[x.mo].n);const den=sum(R,a,z);return s+(den>0.5?sum(x.p,a,z)/den:1);},0)/L.length;
  const sp=L.reduce((s,x)=>s+Math.max(...x.p)-Math.min(...x.p),0)/L.length,T=DT[k];
  console.log(k.padEnd(5)+String(L.length).padStart(3)+"  "+[[r(0,23),T[0]],[r(10,15),T[1]],[r(0,6),T[2]],[r(18,22),T[3]]].map(([a,b])=>`${f2(a)}/${b.toFixed(2)}`.padEnd(11)).join(" ")+" "+`${f1(sp)}/${T[4]}`);}
})();
