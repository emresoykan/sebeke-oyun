// Çok yıllı fiyat yolu (docs/kalibrasyon.md "Türkiye fiyat düzeyi: ilk oyun yılı", vaka çalışması 5. bölüm): oyun yıl yıl
// işletilir (120 oyun günü = bir yıl) ve her yıl için Türkiye ve Avrupa'nın ortalama fiyatı, Türkiye'nin güneş fiyat oranı
// (Σ fiyat × güneş üretim profili ÷ Σ profil ÷ ortalama) ve rakiplerin Türkiye'deki işletmedeki kurulu gücü (yıl ortalaması)
// yazılır. Oyun normal (rakipler yatırım yapar), olay kartları kapalı, oyuncunun santrali yok; bütün yıllar normal hidrolojik
// yıl (w 1; hydro.js).
// Kullanım: npx vite --port 5182 &  sonra  node scripts/calib_years.cjs http://localhost:5182/sebeke-oyun/ [yıl=3] [koşu=3]
//   CALIB_OUT=dosya.json ham sonucu yazar. CALIB_REG='{"mult":0.92,"cap":null,...}' REG.T alanlarını değiştirir (karşılaştırma için;
//   null alanı siler: cap → genel üst sınır, sm/dem → yok, nz → 0,16).
const { chromium } = require("playwright");
const REGO=process.env.CALIB_REG?JSON.parse(process.env.CALIB_REG):null;
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/",YEARS=+(process.argv[3]||3),RUNS=+(process.argv[4]||3),YD=120;
(async()=>{const b=await chromium.launch();const res=[];
for(let run=0;run<RUNS;run++){const p=await b.newPage();const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
  await p.route(/fonts\.g|tile|arcgis|maptiler|openstreetmap|openfreemap|cartocdn|amazonaws/,r=>r.abort());
  await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
  await p.goto(URL0);await p.waitForTimeout(3000);
  const r=await p.evaluate(async([YEARS,YD,REGO])=>{const st=await import("/src/state.js"),sim=await import("/src/sim.js"),rv=await import("/src/rivals.js"),cfg=await import("/src/config.js"),S=st.S;
    if(REGO)for(const [k,v] of Object.entries(REGO)){if(v===null)delete cfg.REG.T[k];else cfg.REG.T[k]=v;}
    S.money=1e10;S.won=true;S.win1=1;S.evCool=1e9;S.mi=9;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1});
    S.hyd={};for(let y=2026;y<=2026+YEARS+1;y++)S.hyd[y]={w:1,ref:0}; // normal hidrolojik yıl
    const out=[];
    for(let y=0;y<YEARS;y++){const a={T:0,E:0,ps:0,s:0,gw:0,ges:0,res:0,d:0};
      for(let d=0;d<YD;d++){const T=st.D.T,E=st.D.E;a.T+=T.price.reduce((x,v)=>x+v,0)/24;a.E+=E.price.reduce((x,v)=>x+v,0)/24;
        T.price.forEach((x,h)=>{a.ps+=x*T.sunP[h];a.s+=T.sunP[h];});
        const c=rv.rivalCap("T");a.ges+=c.ges;a.res+=c.res;a.d++;
        for(let h=0;h<24;h++)sim.tick();document.querySelectorAll("dialog[open]").forEach(x=>x.close());}
      const tAvg=a.T/a.d;out.push({T:tAvg,E:a.E/a.d,sol:a.s>0?(a.ps/a.s)/tAvg:null,gwGes:a.ges/a.d/1000,gwRes:a.res/a.d/1000});}
    return out;},[YEARS,YD,REGO]);
  res.push(r);console.log(`koşu ${run+1}: `+r.map((y,i)=>`${i+1}. yıl T ${y.T.toFixed(1)} E ${y.E.toFixed(1)} rakip ${(y.gwGes+y.gwRes).toFixed(2)} GW`).join(" | ")+(errs.length?" HATA "+errs.join("|"):""));
  await p.close();}
await b.close();
if(process.env.CALIB_OUT)require("fs").writeFileSync(process.env.CALIB_OUT,JSON.stringify(res));
const f1=x=>x.toFixed(1),f2=x=>x.toFixed(2),st=(y,f)=>{const v=res.map(r=>f(r[y]));return {m:v.reduce((a,b)=>a+b,0)/v.length,lo:Math.min(...v),hi:Math.max(...v)};};
console.log("\nOyun yılı | Türkiye fiyatı ($/MWh) | 1. yıla göre | güneş fiyat oranı | Avrupa fiyatı | rakip GES + RES, Türkiye (GW)");
const y0=st(0,y=>y.T).m;
for(let y=0;y<YEARS;y++){const t=st(y,x=>x.T),s=st(y,x=>x.sol),e=st(y,x=>x.E),g=st(y,x=>x.gwGes+x.gwRes),gg=st(y,x=>x.gwGes);
  console.log(`${y+1} | ${f1(t.m)} (${f1(t.lo)}–${f1(t.hi)}) | ${((t.m/y0-1)*100).toFixed(0)}% | ${f2(s.m)} | ${f1(e.m)} | ${f2(g.m)} (GES ${f2(gg.m)})`);}
})();
