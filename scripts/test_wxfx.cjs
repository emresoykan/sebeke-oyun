// Saha görselinde hava ve mevsim (wxfx.js): mantık denetimi ve maliyet ölçümü. Hafif yakın görünüm ekran kartsız
// tarayıcıda (SwiftShader) açılır; açık, yağmur, fırtına ve kar durumlarında 5'er saniye ana iş parçacığının meşguliyeti
// (CDP TaskDuration), en uzun görev (longtask) ve kare hızı ölçülür. Haritadaki tesis görüntüsünün kar görünümü de denetlenir.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_wxfx.cjs http://localhost:5182/sebeke-oyun/ [ekran görüntüsü klasörü]
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/",SHOT=process.argv[3];let fails=0;
const ok=(c,m)=>{console.log((c?"  ✓ ":"  ✗ ")+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
for(const vp of [{width:1366,height:768},{width:390,height:844}]){
  const m=vp.width<900;console.log(`\n[${vp.width}×${vp.height}]`);
  const p=await b.newPage({viewport:vp,hasTouch:m,isMobile:m});const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
  await p.route(/fonts\.g/,r=>r.abort());
  await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));
    window.__lt=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push(Math.round(e.duration)))).observe({type:"longtask",buffered:true});});
  await p.goto(URL0);await p.waitForTimeout(4000);
  // mantık: yağış türü, mevsim (kuzey, güney, dönenceler), kar örtüsü
  const L=await p.evaluate(async()=>{const fx=(await import("/src/ui/wxfx.js")).fxOf,cal=await import("/src/calendar.js");const o={lat:38},d0=cal.CAL.date;
    const w=(x)=>({storm:0,snow:false,rain:0,...x}),r={};
    r.kinds=[fx(o,w({storm:0.6,rain:0.8})).kind,fx(o,w({snow:true,rain:0.5})).kind,fx(o,w({rain:0.5})).kind,fx(o,w({rain:0.1})).kind].join(",");
    r.snowy=[fx(o,w({snow:true,rain:0.5})).snowy,fx({lat:38,snowDays:2},w({})).snowy,fx(o,w({rain:0.5})).snowy].join(",");
    r.seasons=["2026-01-15","2026-04-15","2026-07-15","2026-10-15"].map(s=>{cal.CAL.date=new Date(s+"T12:00:00Z");return fx(o,w({})).season+"/"+fx({lat:-34},w({})).season+"/"+fx({lat:5},w({})).season;}).join(" ");
    cal.CAL.date=d0;return r;});
  ok(L.kinds==="storm,snow,rain,","yağış türü: fırtına, kar, yağmur, açık");
  ok(L.snowy==="true,true,false","kar yağarken ya da paneller karla örtülüyken saha karlı");
  ok(L.seasons==="win/sum/sum spr/aut/sum sum/win/sum aut/spr/sum",`mevsim: kuzey, güney yarıküre ters, dönenceler yaz (${L.seasons})`);
  // saha: GES + RES + batarya; hafif yakın görünüm
  await p.evaluate(async()=>{const st=await import("/src/state.js"),ac=await import("/src/actions.js"),S=st.S;S.money=9e6;S.won=true;S.win1=1;S.evCool=999;S.mi=9;
    Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1});S.desk={ratio:1,fc:"std",batt:"arb",auto:true};document.querySelectorAll("dialog[open]").forEach(d=>d.close());
    for(const r in S.rivals||{})S.rivals[r].sites=S.rivals[r].sites.filter(x=>Math.hypot(x.lat-38.1,x.lon-32.6)>1);
    S.sel={id:null,lat:38.1,lon:32.6};ac.buyLand();const id=S.sel.id;S.sites[id].permit="ok";["ges","ges","res","res","batt"].forEach(k=>ac.build(id,k,"std"));});
  await p.click("#pauseBtn");await p.waitForTimeout(1500);
  await p.evaluate(async()=>{(await import("/src/ui/sheet.js")).openSheet("saha");const b=document.querySelector('#panel button[data-a="fly"]');b.scrollIntoView();b.click();});
  await p.waitForFunction(()=>{const e=document.querySelector(".cv .cvpic");return e&&e.style.visibility!=="hidden"&&e.offsetWidth>50;},null,{timeout:30000});
  await p.waitForTimeout(2500);
  // gerçek yol: paneller karla örtülünce yakın görünüm karlı
  const real=await p.evaluate(async()=>{const S=(await import("/src/state.js")).S,o=S.sites[Object.keys(S.sites)[0]];o.snowDays=2;(await import("/src/ui/closeview.js")).update();
    const r=document.querySelector(".cv").classList.contains("snowy");o.snowDays=0;(await import("/src/ui/closeview.js")).update();return r&&!document.querySelector(".cv").classList.contains("snowy");});
  ok(real,"o.snowDays → yakın görünüm karlı, kalkınca normal");
  const cdp=await p.context().newCDPSession(p);await cdp.send("Performance.enable");
  const busy=async()=>{const r=await cdp.send("Performance.getMetrics");return r.metrics.find(x=>x.name==="TaskDuration").value;};
  const res={};
  for(const k of ["","rain","storm","snow"]){
    await p.evaluate(k=>{const c=document.querySelector(".cv");if(k)c.dataset.wx=k;else delete c.dataset.wx;c.dataset.season=k==="snow"?"win":"sum";c.classList.toggle("snowy",k==="snow");c.style.setProperty("--fxo","0.9");window.__lt.length=0;},k);
    await p.waitForTimeout(800);const t0=await busy();
    const fr=await p.evaluate(()=>new Promise(r=>{let n=0;const s=performance.now();const f=()=>{n++;if(performance.now()-s<5000)requestAnimationFrame(f);else r(n/5);};requestAnimationFrame(f);}));
    const t1=await busy(),lt=await p.evaluate(()=>Math.max(0,...window.__lt));
    res[k||"açık"]={busy:Math.round((t1-t0)/5*1000),fps:Math.round(fr),lt};
    if(SHOT)await p.screenshot({path:`${SHOT}/wxfx-${vp.width}-${k||"acik"}.png`});}
  for(const [k,v] of Object.entries(res))console.log(`    ${k.padEnd(6)} ana iş parçacığı ${String(v.busy).padStart(4)} ms/sn • ${v.fps} kare/sn • en uzun görev ${v.lt} ms`);
  const base=res["açık"];
  for(const k of ["rain","storm","snow"]){const v=res[k];ok(v.lt<50&&v.busy<=base.busy+60,`${k}: yeni uzun görev yok (${v.lt} ms), ana iş parçacığına ek yük ${v.busy-base.busy} ms/sn (sınır 60)`);}
  await p.click(".close3d");
  // haritadaki tesis görüntüsü (düz harita): karla kaplı saha soluk ve açık
  await p.evaluate(async()=>{const S=(await import("/src/state.js")).S,o=S.sites[Object.keys(S.sites)[0]];window.__map.setMaxZoom(16); // test ortamında yükseklik karoları yüklenemeyince harita 8.de kilitlenir
    window.__map.jumpTo({center:[o.lon,o.lat],zoom:13});
    await new Promise(r=>setTimeout(r,500));(await import("/src/ui/map.js")).drawMap();});
  for(let i=0;i<60&&!(await p.evaluate(async()=>{const S=(await import("/src/state.js")).S;return !!window.__map.getLayer("fac-"+Object.keys(S.sites)[0]);}));i++)await p.waitForTimeout(500);
  const fac=await p.evaluate(async()=>{const S=(await import("/src/state.js")).S,id=Object.keys(S.sites)[0],mp=window.__map,L="fac-"+id;if(!mp||!mp.getLayer(L))return null;
    const M=await import("/src/ui/map.js");S.sites[id].snowDays=2;M.drawMap();const a=mp.getPaintProperty(L,"raster-saturation");S.sites[id].snowDays=0;M.drawMap();return [a,mp.getPaintProperty(L,"raster-saturation")];});
  ok(fac&&fac[0]===-0.6&&fac[1]===0,`düz haritada karlı tesis görüntüsü soluklaşır ve geri döner (${JSON.stringify(fac)})`);
  ok(errs.length===0,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));await p.close();}
await b.close();console.log(fails?`\n${fails} denetim başarısız`:"\nTüm denetimler geçti");process.exit(fails?1:0);})();
