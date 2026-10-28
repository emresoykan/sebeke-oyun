// Saha modelleri (sitemodel.js): her teknoloji için parça (çizim çağrısı) ve üçgen sayısı, haritadaki tesis görüntüsünün
// çizim süresi (siteimage.js, ekran kartsız tarayıcı: SwiftShader) ve hafif yakın görünüm ekran görüntüsü.
// Sahalar kurallar atlanarak doğrudan kurulur (her teknoloji uygun bir noktada, 20 MW; HES 5 MW).
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_sitemodel.cjs http://localhost:5182/sebeke-oyun/ [ekran görüntüsü klasörü] [--tag ad]
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/",SHOT=process.argv[3]&&!process.argv[3].startsWith("--")?process.argv[3]:null;
const TAG=(process.argv.includes("--tag")?process.argv[process.argv.indexOf("--tag")+1]:"")||"m";
// [teknoloji, enlem, boylam, MW]
// hfpv: HES ve gölünde yüzer GES (yüzer GES tek başına kurulamaz)
const SITES=[["ges",38.1,32.6,20],["res",40.05,26.6,20],["off",40.6,27.2,20],["hes",40.95,39.75,5],["jes",37.85,28.0,20],["bes",39.0,35.5,20],["batt",37.9,33.9,20],["mar",40.4,26.4,10],["flo",33,29,34],
  ["hfpv",40.7,39.5,0],["phs",40.95,39.75,20],["h2",38.1,32.6,20],["csp",37.0,39.3,20],["mix",38.4,34.4,0]];
(async()=>{const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const p=await b.newPage({viewport:{width:1366,height:768}});const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
await p.route(/fonts\.g/,r=>r.abort());
await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
await p.goto(URL0);await p.waitForTimeout(4000);
const ids=await p.evaluate(async SITES=>{const st=await import("/src/state.js"),w=await import("/src/world.js"),cfg=await import("/src/config.js"),S=st.S;
  S.money=9e6;S.won=true;S.win1=1;S.evCool=999;S.mi=9;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1});
  for(const r in S.rivals||{})S.rivals[r].sites=[];document.querySelectorAll("dialog[open]").forEach(d=>d.close());
  const out=[];
  for(const [k,lat,lon,mw] of SITES){const id="t_"+k,t=w.describe(lat,lon);S.sites[id]={...t,permit:"ok",well:k==="jes"?0.9:undefined};
    const add=(kk,m)=>S.plants.push({t:id,k:kk,q:"std",mw:m,soc:0,cost:cfg.TECH[kk].capex*m/cfg.BLOCK});
    if(k==="mix"){add("ges",20);add("res",10);add("batt",10);}else if(k==="hfpv"){add("hes",10);add("fpv",10);}else add(k,mw);out.push(id);}
  st.save();return out;},SITES);
await p.click("#pauseBtn");
// ısınma: çizici ve dokular bir kez kurulur (ilk çizim ayrıca ölçülür)
const warm=await p.evaluate(async()=>{const F=await import("/src/ui/siteimage.js"),t=performance.now();await F.siteImage("t_batt",true);return Math.round(performance.now()-t);});
const rows=[];
for(const id of ids){
  const r=await p.evaluate(async id=>{const st=await import("/src/state.js"),M=await import("/src/ui/sitemodel.js"),F=await import("/src/ui/siteimage.js"),S=st.S;
    const {root}=M.buildSite(id,S.sites[id],S.plants.filter(x=>x.t===id),true);let calls=0,tris=0;
    root.traverse(n=>{if(!n.isMesh)return;calls++;const g=n.geometry,t=(g.index?g.index.count:g.attributes.position.count)/3;tris+=t*(n.isInstancedMesh?n.count:1);});
    window.__lt=[];const ob=new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push(e.duration)));ob.observe({type:"longtask"});
    const t0=performance.now();const im=await F.siteImage(id+"",false);const ms=performance.now()-t0;await new Promise(r=>setTimeout(r,50));ob.disconnect();
    return {calls,tris:Math.round(tris),ms:Math.round(ms),lt:Math.round(Math.max(0,...window.__lt)),px:im?im.lods[0].w||0:0};},id);
  rows.push({saha:id.slice(2),...r});}
console.log(`\nısınma (ilk çizim, batarya): ${warm} ms`);
console.table(rows);
if(SHOT){
  // tesis görüntüsünün kendisi (haritadaki hali, tam çözünürlük): ayrıntıyı incelemek için
  const fs=require("fs");
  for(const id of ids){const b64=await p.evaluate(async id=>{const F=await import("/src/ui/siteimage.js"),im=await F.siteImage(id,true);if(!im)return null;
      const bl=await (await fetch(im.lods[0].url)).blob();return await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result.split(",")[1]);fr.readAsDataURL(bl);});},id);
    if(b64)fs.writeFileSync(`${SHOT}/img-${TAG}-${id.slice(2)}.png`,Buffer.from(b64,"base64"));}
  await p.evaluate(async()=>{const st=await import("/src/state.js");st.S.hour=12;}); // öğle: gece karartması olmadan
  for(const id of ids){
    await p.evaluate(async id=>{const st=await import("/src/state.js"),S=st.S,o=S.sites[id];S.sel={id,lat:o.lat,lon:o.lon};(await import("/src/ui/panel.js")).renderPanel();
      (await import("/src/ui/sheet.js")).openSheet("saha");},id);
    await p.waitForTimeout(300);
    await p.evaluate(()=>{const b=document.querySelector('#panel button[data-a="fly"]');b.scrollIntoView();b.click();});
    for(let i=0;i<60;i++){if(await p.evaluate(()=>{const e=document.querySelector(".cv .cvpic");return !!e&&e.style.visibility!=="hidden"&&e.offsetWidth>50&&!document.querySelector(".cv").hidden;}))break;await p.waitForTimeout(500);}
    await p.waitForTimeout(800);
    const el=await p.$("#map3d");await el.screenshot({path:`${SHOT}/site-${TAG}-${id.slice(2)}.png`});
    await p.click(".close3d");await p.waitForTimeout(300);}
}
console.log(errs.length?`sayfa hatası: ${errs.join(" | ")}`:"sayfa hatası yok");
await b.close();})();
