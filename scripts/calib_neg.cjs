// Negatif fiyat kalibrasyonu (docs/kalibrasyon.md "Negatif fiyat"): Avrupa (E), İberya (I), Fransa (R) ve İskandinavya (K) piyasasında ham fiyatın
// (sim.js D[k].raw: sıfırda kesilmeden önce) ve oyundaki fiyatın (D[k].price) dağılımı. Yazılanlar: ham fiyatı sıfırın
// altında olan saatlerin payı, negatif fiyatlı saatlerin payı (aylara göre de), ortalaması, ortancası ve en düşüğü; ortalama
// fiyat ve güneş fiyat oranı. Oyun normal (rakipler yatırım yapar), olay kartları kapalı, oyuncunun santrali yok.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/calib_neg.cjs http://localhost:5182/sebeke-oyun/ [gün=120] [koşu=2]
//   CALIB_NEG='{"E":{"t":20,"z":40,"a":0.01,"p":2,"f":-283}}' REG[k].neg'i koda dokunmadan değiştirir (null: kapat).
//   CALIB_REGS='{"E":{"mult":1.7}}' REG alanlarını değiştirir. CALIB_OUT=önek: ham fiyatı 80 $'ın altındaki saatleri önek.E.json,
//   önek.I.json'a yazar (çevrimdışı uydurma için).
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/",DAYS=+(process.argv[3]||120),RUNS=+(process.argv[4]||2);
const NEG=process.env.CALIB_NEG?JSON.parse(process.env.CALIB_NEG):null,REGS=process.env.CALIB_REGS?JSON.parse(process.env.CALIB_REGS):null;
const MK=process.env.CALIB_MK?process.env.CALIB_MK.split(","):["E","I","R","K"];
(async()=>{const b=await chromium.launch();const all=[];
for(let run=0;run<RUNS;run++){const p=await b.newPage();const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
  await p.route(/fonts\.g|tile|arcgis|maptiler|openstreetmap|openfreemap|cartocdn|amazonaws/,r=>r.abort());
  await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
  await p.goto(URL0);await p.waitForTimeout(3000);
  const r=await p.evaluate(async([DAYS,MK,NEG,REGS])=>{const st=await import("/src/state.js"),sim=await import("/src/sim.js"),cfg=await import("/src/config.js"),cal=await import("/src/calendar.js"),S=st.S;
    if(REGS)for(const [k,o] of Object.entries(REGS))Object.assign(cfg.REG[k],o);
    if(NEG)for(const [k,o] of Object.entries(NEG)){if(o===null)delete cfg.REG[k].neg;else cfg.REG[k].neg=o;}
    S.money=1e10;S.won=true;S.win1=1;S.evCool=1e9;S.mi=9;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1});
    S.hyd={};for(let y=2026;y<=2030;y++)S.hyd[y]={w:1,ref:0};
    const out={};MK.forEach(k=>out[k]={low:[],raw:[],neg:[],n:0,sum:0,sp:0,s:0,mo:Array(12).fill(0),moN:Array(12).fill(0),zero:0});
    for(let d=0;d<DAYS;d++){const mo=cal.CAL.date.getUTCMonth();
      for(const k of MK){const M=st.D[k],o=out[k];for(let h=0;h<24;h++){const x=M.raw[h],pr=M.price[h];o.n++;o.sum+=pr;o.sp+=pr*M.sunP[h];o.s+=M.sunP[h];o.moN[mo]++;
        if(x<80)o.low.push(+x.toFixed(2));if(x<0)o.raw.push(+x.toFixed(2));if(pr<0){o.neg.push(+pr.toFixed(2));o.mo[mo]++;}if(pr===0)o.zero++;}}
      for(let h=0;h<24;h++)sim.tick();document.querySelectorAll("dialog[open]").forEach(x=>x.close());}
    return out;},[DAYS,MK,NEG,REGS]);
  all.push(r);await p.close();if(errs.length)console.log("HATA",errs.join(" | "));}
await b.close();
const q=(a,f)=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);return s[Math.floor(f*(s.length-1))];},mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null,f1=x=>x==null?"–":x.toFixed(1);
for(const k of MK){const R=all.map(r=>r[k]),n=R.reduce((a,o)=>a+o.n,0),raw=R.flatMap(o=>o.raw),neg=R.flatMap(o=>o.neg),zero=R.reduce((a,o)=>a+o.zero,0);
  const mo=Array(12).fill(0).map((_,i)=>{const a=R.reduce((s,o)=>s+o.mo[i],0),b=R.reduce((s,o)=>s+o.moN[i],0);return b?(a/b*100).toFixed(1):"–";});
  const avg=R.reduce((a,o)=>a+o.sum,0)/n,sol=R.reduce((a,o)=>a+o.sp,0)/R.reduce((a,o)=>a+o.s,0)/avg;
  console.log(`${k}: ${R.length} koşu × ${DAYS} gün | ort ${f1(avg)} $/MWh, güneş oranı ${sol.toFixed(3)} | ham<0 %${(raw.length/n*100).toFixed(2)} (ortanca ${f1(q(raw,0.5))}, %10 ${f1(q(raw,0.1))}, en düşük ${f1(q(raw,0))})`);
  console.log(`   fiyat<0 %${(neg.length/n*100).toFixed(2)}: ort ${f1(mean(neg))}, ortanca ${f1(q(neg,0.5))}, %10 ${f1(q(neg,0.1))}, en düşük ${f1(q(neg,0))} $/MWh | fiyat=0 %${(zero/n*100).toFixed(2)}`);
  console.log(`   aylık negatif fiyat % (Oca…Ara): ${mo.join(" ")}`);
  const low=R.flatMap(o=>o.low);if(process.env.CALIB_OUT)require("fs").writeFileSync(process.env.CALIB_OUT+"."+k+".json",JSON.stringify({n,low}));console.log(`   ham fiyatın düşük ucu, P(ham<x): `+[0,5,10,15,20,25,30,40].map(x=>`${x}: %${(low.filter(v=>v<x).length/n*100).toFixed(1)}`).join(", "));}
})();
