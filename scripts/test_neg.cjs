// Negatif fiyat (config.js priceFloor, REG.E/I.neg; sim.js, market.js, mods.js; docs/kalibrasyon.md "Negatif fiyat").
// Sınanan: Türkiye'de fiyat sıfırın altına inmez; Avrupa ve İberya'da eşlemenin biçimi (eşik, süreklilik, taban, tekdüzelik);
// 40 günde Avrupa ve İberya'da negatif saatler oluşur, taban aşılmaz, Türkiye'de hiç yok; negatif fiyatlı saatte RES ve GES
// üretmez, batarya şarj ederken, elektrolizör tüketirken para kazanır; dengesizlik negatif fiyatta da sapanın aleyhine;
// olay kartının fiyat çarpanı negatif fiyata uygulanmaz; fiyat biçimi eksi işaretli; grafik negatif fiyatla hatasız çizilir;
// ilk negatif fiyat haberi bir kez; sözlükte negatif fiyat.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_neg.cjs http://localhost:5182/sebeke-oyun/
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
  const close=()=>document.querySelectorAll("dialog[open]").forEach(d=>d.close());close();
  const st=await imp("state.js"),sim=await imp("sim.js"),cfg=await imp("config.js"),w=await imp("world.js"),ac=await imp("actions.js"),
    mk=await imp("market.js"),md=await imp("mods.js"),ut=await imp("utils.js"),gl=await imp("glossary.js"),S=st.S,D=()=>st.D,out={};
  S.money=1e10;S.won=true;S.win1=1;S.evCool=1e9;S.mi=99;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1,repReady:1});
  S.hyd={};for(let y=2026;y<=2030;y++)S.hyd[y]={w:1,ref:0};
  // 1) eşleme biçimi
  const pf=cfg.priceFloor,nE=cfg.REG.E.neg,nI=cfg.REG.I.neg,xs=[];for(let x=-150;x<=120;x+=0.5)xs.push(x);
  out.map={T:pf("T",-20)===0&&pf("T",35)===35,N:pf("N",-5)===0,
    E:pf("E",nE.z)===nE.z&&pf("E",nE.z+10)===nE.z+10&&Math.abs(pf("E",nE.t))<1e-9&&pf("E",nE.t-1)<0&&pf("E",-1e4)===nE.f,
    I:pf("I",nI.t-1)<0&&pf("I",-1e4)===nI.f&&nI.f>nE.f,
    mono:["E","I"].every(k=>xs.every((x,i)=>!i||pf(k,x)>=pf(k,xs[i-1])-1e-9)),
    cont:["E","I"].every(k=>{const n=cfg.REG[k].neg;return Math.abs(pf(k,n.z-1e-6)-n.z)<1e-3&&Math.abs(pf(k,n.t+1e-6))<1e-3;})};
  // santraller: Kuzey Almanya RES, Almanya'da batarya, GES ve elektrolizör
  const put=(id,la,lo)=>{S.sites[id]={...w.describe(la,lo),permit:"ok"};return S.sites[id];};
  put("R",53.4,9.6);put("C",51.0,10.0);put("H",48.8,11.5);
  ac.build("R","res","std");ac.build("C","batt","std");ac.build("H","ges","std");ac.build("H","h2","std");
  out.mreg=["R","C","H"].map(id=>S.sites[id].mreg).join("");
  // 2) 40 gün: negatif saatler Avrupa ve İberya'da var, taban aşılmaz, Türkiye'de yok
  let nn=0;window.addEventListener("sebeke:news",()=>{if(/Avrupa piyasasında fiyat eksiye indi/.test((S.news[0]||{}).t||""))nn++;}); // haber bandı son 14'ü tutar
  const c={E:[0,1e9],I:[0,1e9],T:[0,1e9]};let n=0;
  for(let d=0;d<40;d++){for(const k in c){const pr=D()[k].price;pr.forEach(v=>{if(v<0)c[k][0]++;c[k][1]=Math.min(c[k][1],v);});}n+=24;
    for(let h=0;h<24;h++)sim.tick();close();}
  out.cnt={E:c.E[0]/n,I:c.I[0]/n,T:c.T[0],minE:c.E[1],minI:c.I[1],minT:c.T[1]};
  out.news=nn;
  // 3) denetimli saat: Avrupa'da 12:00 −30, 19:00 150 $/MWh
  S.hour=12;const M=D().E;for(let h=0;h<24;h++)M.price[h]=h===12?-30:h===19?150:60;M.plan=md.battPlan(M.price);
  const pl=(t,k)=>S.plants.find(q=>q.t===t&&q.k===k),R=pl("R","res"),B=pl("C","batt"),G=pl("H","ges"),H2=pl("H","h2");
  [R,B,G,H2].forEach(q=>{q.down=false;});B.soc=0;sim.planH2(H2,12);
  const eR=mk.production(R,12).e,eG=mk.production(G,12).e,a=q=>({e:q.ac?q.ac.e:0,r:q.ac?q.ac.r:0});
  const r0=a(R),b0=a(B),g0=a(G),h0=a(H2),cu0=D().st.curt;
  sim.tick();close();
  const r1=a(R),b1=a(B),g1=a(G),h1=a(H2);
  out.hour={eR,eG,res:r1.e-r0.e,ges:g1.e-g0.e,curt:D().st.curt-cu0,batt:b1.r-b0.r,battPlan:M.plan[12],h2:h1.r-h0.r,h2plan:H2.plan[12]};
  // 4) dengesizlik
  const st0={surp:0,short:0,bBal:0};
  out.imb={surp:mk.settle("E",1,-20,[],{...st0}),short:mk.settle("E",-1,-20,[],{...st0}),surpP:mk.settle("E",1,20,[],{...st0}),shortP:mk.settle("E",-1,20,[],{...st0}),K:[mk.K_SURP,mk.K_SHORT]};
  // 5) olay kartı: fiyat ×3 negatif fiyata uygulanmaz
  S.hour=10;const M2=D().E;M2.price[11]=-10;M2.price[13]=40;md.addMod({t:"price",m:"E",v:3,d:1,label:"test"});out.mod=[M2.price[11],M2.price[13]];S.mods=[];
  // 6) biçim ve grafik
  out.fmt=[ut.fmtP(-12.4),ut.fmtP(7.6),ut.fmtP(-0.3)];
  S.sel={id:"C",lat:S.sites.C.lat,lon:S.sites.C.lon};(await imp("ui/hud.js")).render();
  out.gloss=gl.TERMS.some(t=>t.k==="negfiyat");
  return out;},u);
ok(r.map.T&&r.map.N,"Türkiye ve Kuzey Amerika'da taban 0");
ok(r.map.E&&r.map.I&&r.map.mono&&r.map.cont,"Avrupa ve İberya eşlemesi: z üstü aynen, t'de 0, t altı negatif, tabanda durur, sürekli ve tekdüze; İberya tabanı Avrupa'dan sığ");
ok(r.mreg==="EEE","test santralleri Avrupa piyasasında");
ok(r.cnt.E>0&&r.cnt.I>0&&r.cnt.T===0,`40 günde negatif saat: Avrupa %${(r.cnt.E*100).toFixed(1)}, İberya %${(r.cnt.I*100).toFixed(1)}, Türkiye ${r.cnt.T}`);
ok(r.cnt.minE>=-283-1e-9&&r.cnt.minI>=-17-1e-9&&r.cnt.minT>=0,`en düşük fiyat: Avrupa ${r.cnt.minE.toFixed(1)}, İberya ${r.cnt.minI.toFixed(1)}, Türkiye ${r.cnt.minT.toFixed(1)} $/MWh`);
ok(r.news===1,`ilk negatif fiyat haberi bir kez (${r.news})`);
ok(r.hour.res===0&&r.hour.ges===0&&Math.abs(r.hour.curt-(r.hour.eR+r.hour.eG))<1e-6,`−30 $/MWh saatinde RES ve GES üretmez (kısılan ${r.hour.curt.toFixed(2)} MWh = beklenen ${(r.hour.eR+r.hour.eG).toFixed(2)})`);
ok(r.hour.battPlan===1&&r.hour.batt>0,`batarya negatif fiyatta şarj ederken kazanır (+${r.hour.batt.toFixed(0)} $)`);
ok(r.hour.h2plan>0&&r.hour.h2>0,`elektrolizör negatif fiyatta çalışır ve kazanır (+${r.hour.h2.toFixed(0)} $)`);
ok(Math.abs(r.imb.surp-(-20-r.imb.K[0]*20))<1e-9&&Math.abs(r.imb.short-(20-r.imb.K[1]*20))<1e-9&&Math.abs(r.imb.surpP-20*(1-r.imb.K[0]))<1e-9&&Math.abs(r.imb.shortP+20*(1+r.imb.K[1]))<1e-9,
  `dengesizlik: −20 $/MWh'de fazla ${r.imb.surp.toFixed(1)} $ öder, eksik ${r.imb.short.toFixed(1)} $ alır; +20'de ${r.imb.surpP.toFixed(1)} / ${r.imb.shortP.toFixed(1)}`);
ok(r.mod[0]===-10&&r.mod[1]===120,`fiyat ×3 olayı: negatif saat değişmez (${r.mod[0]}), pozitif saat ×3 (${r.mod[1]})`);
ok(r.fmt[0]==="−12 $/MWh"&&r.fmt[1]==="8 $/MWh"&&r.fmt[2]==="0 $/MWh",`fiyat biçimi: ${r.fmt.join(", ")}`);
ok(r.gloss,"sözlükte negatif fiyat");
ok(errs.length===0,"sayfa hatası yok (grafik negatif fiyatla çizildi)"+(errs.length?": "+errs.join(" | "):""));
await b.close();console.log(fails?`\n${fails} denetim başarısız`:"\nTüm denetimler geçti");process.exit(fails?1:0);})();
