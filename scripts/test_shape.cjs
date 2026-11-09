// Türkiye'nin günlük fiyat şekli (config.js REG.T: cap, sm, dem, nz; sim.js, mods.js; docs/kalibrasyon.md "Günlük fiyat
// şekli"). Sınanan: Türkiye fiyatı azami fiyatı (tavan) hiç aşmaz, olay kartının fiyat etkisi de aşamaz; Avrupa'nın tavanı
// değişmedi; aynı hava ve rastgelelikle aylık talep düzeyi (dem) bütün saatleri, aylık güneş çarpanı (sm) yalnızca güneşli
// saatleri değiştirir; rastgele oynama genişliği (nz) Türkiye'ye özgü; fiyat grafiğinin üst sınırı tavan; sözlükte azami fiyat.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_shape.cjs http://localhost:5182/sebeke-oyun/
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
  const st=await imp("state.js"),sim=await imp("sim.js"),cfg=await imp("config.js"),md=await imp("mods.js"),cal=await imp("calendar.js"),gl=await imp("glossary.js"),
    S=st.S,D=()=>st.D,T=cfg.REG.T,out={};
  S.money=1e10;S.won=true;S.win1=1;S.evCool=1e9;S.mi=99;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1,repReady:1});
  S.hyd={};for(let y=2026;y<=2030;y++)S.hyd[y]={w:1,ref:0}; // normal yıl: hidroloji terimi sıfır
  // 1) 60 gün: Türkiye fiyatı tavanı aşmaz; tavana değen saatler var
  let mx=0,top=0,n=0;for(let d=0;d<60;d++){sim.newDay();D().T.price.forEach(x=>{mx=Math.max(mx,x);if(x>=T.cap-1e-9)top++;n++;});}
  out.cap={cap:T.cap,mx,top:top/n,eCap:cfg.priceCap("E"),eExp:110*cfg.REG.E.mult};
  // 2) olay kartı: Türkiye'de fiyat ×3 etkisi tavanda durur; Avrupa'da tavan yok (oyunun genel kuralı)
  md.addMod({t:"price",m:null,v:3,d:2,label:"test"});sim.newDay();out.mod={T:Math.max(...D().T.price),E:Math.max(...D().E.price)};S.mods=[];
  // 3) aynı gün, aynı hava ve rastgelelik: dem bütün saatleri, sm yalnızca güneşli saatleri değiştirir
  const mo=cal.CAL.date.getUTCMonth(),wx0=JSON.stringify(S.wx),mR=Math.random,dem0=[...T.dem],sm0=[...T.sm];
  const run=()=>{S.wx=JSON.parse(wx0);let i=0;Math.random=()=>((i++*0.6180339887)%1);const day=S.dayNo;sim.newDay();S.dayNo=day;Math.random=mR;return {T:[...D().T.price],E:[...D().E.price],sun:[...D().T.sunP]};};
  T.cap=1e9; // tavan bu karşılaştırmayı kesmesin
  const a=run();T.dem[mo]=dem0[mo]*1.1;const b=run();T.dem[mo]=dem0[mo];T.sm[mo]=sm0[mo]*2;const c=run();T.sm[mo]=sm0[mo];T.cap=cfg.REG.T.cap;
  const night=[0,1,2,3,4,23],sunny=a.sun.map((s,h)=>s>0.05?h:-1).filter(h=>h>=0);
  out.dem={up:night.every(h=>b.T[h]>a.T[h]),sameE:a.E.every((x,h)=>Math.abs(x-b.E[h])<1e-9)};
  out.sm={night:night.every(h=>Math.abs(c.T[h]-a.T[h])<1e-9),sunny:sunny.length>0&&sunny.every(h=>c.T[h]<a.T[h]||c.T[h]===0),n:sunny.length};
  T.cap=out.cap.cap;
  out.nz={T:T.nz,E:cfg.REG.E.nz};
  out.gloss=gl.TERMS.some(t=>t.k==="tavan");
  return out;},u);
ok(r.cap.mx<=r.cap.cap+1e-9&&r.cap.top>0,`60 günde Türkiye'nin en yüksek fiyatı ${r.cap.mx.toFixed(1)} ≤ tavan ${r.cap.cap} $/MWh; saatlerin %${(r.cap.top*100).toFixed(1)}'i tavanda`);
ok(Math.abs(r.cap.eCap-r.cap.eExp)<1e-9,`Avrupa'nın üst sınırı değişmedi (${r.cap.eCap.toFixed(1)})`);
ok(r.mod.T<=r.cap.cap+1e-9&&r.mod.E>r.cap.eCap,`fiyat ×3 olay etkisi: Türkiye tavanda (${r.mod.T.toFixed(1)}), Avrupa'da tavan yok (${r.mod.E.toFixed(1)})`);
ok(r.dem.up&&r.dem.sameE,"aylık talep düzeyi (dem) Türkiye'nin gece fiyatını artırır, Avrupa aynı");
ok(r.sm.night&&r.sm.sunny,`aylık güneş çarpanı (sm) gece fiyatını değiştirmez, ${r.sm.n} güneşli saatte fiyatı düşürür`);
ok(r.nz.T>0.16&&r.nz.E==null,`rastgele oynama genişliği Türkiye'ye özgü (${r.nz.T}; diğer piyasalar 0,16)`);
ok(r.gloss,"sözlükte azami fiyat");
ok(errs.length===0,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));
await b.close();console.log(fails?`\n${fails} denetim başarısız`:"\nTüm denetimler geçti");process.exit(fails?1:0);})();
