// Yakın görünüm (yazılımla çizen tarayıcı, ekran kartı yok): "3D yakından bak" Cesium yerine hafif görünümü açar.
// Ölçülen: açılış süresi, açıkken ve kapattıktan sonra ana iş parçacığının en uzun görevi (longtask), pervane sayısı,
// aynı sahayı yeniden açma (önbellek). Chromium burada SwiftShader ile (ekran kartsız) çalıştırılır.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_closeview.cjs http://localhost:5182/sebeke-oyun/
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/";let fails=0;
const ok=(c,m)=>{console.log((c?"  ✓ ":"  ✗ ")+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
for(const vp of [{width:1366,height:768},{width:390,height:844}]){
  const m=vp.width<900;console.log(`\n[${vp.width}×${vp.height}]`);
  const p=await b.newPage({viewport:vp,hasTouch:m,isMobile:m});const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
  await p.route(/fonts\.g/,r=>r.abort());
  await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));
    window.__lt=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__lt.push(Math.round(e.duration)))).observe({type:"longtask",buffered:true});});
  await p.goto(URL0);await p.waitForTimeout(4000);
  await p.evaluate(async()=>{const st=await import("/src/state.js"),ac=await import("/src/actions.js"),S=st.S;S.money=9e6;S.won=true;S.evCool=99;S.mi=8;
    S.ob={g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1};S.desk={ratio:1,fc:"std",batt:"arb",auto:true};document.querySelectorAll("dialog[open]").forEach(d=>d.close());
    S.sel={id:null,lat:38.1,lon:32.6};ac.buyLand();const id=S.sel.id;S.sites[id].permit="ok";["ges","ges","res","res","batt"].forEach(k=>ac.build(id,k,"std"));});
  await p.waitForTimeout(1500);
  const open=async()=>p.evaluate(async()=>{window.__lt.length=0;const t=performance.now();const b=document.querySelector('#panel button[data-a="fly"]');b.scrollIntoView();b.click();
    await new Promise(r=>{const c=()=>{const e=document.querySelector(".cv .cvpic");if(e&&e.style.visibility!=="hidden"&&e.offsetWidth>50&&!document.querySelector(".cv").hidden)r();else setTimeout(c,50);};c();});
    const ms=Math.round(performance.now()-t);await new Promise(r=>setTimeout(r,1500)); // pervaneler ve yerleşim otursun
    const pic=document.querySelector(".cvpic").getBoundingClientRect(),info=document.querySelector(".cvinfo").getBoundingClientRect();
    return {ms,lt:Math.max(0,...window.__lt),rotors:document.querySelectorAll(".cv .mk-rotor:not(.mk-rotsh)").length,shadows:document.querySelectorAll(".cv .mk-rotsh").length,cesium:!!window.__viewer,fits:pic.bottom<=info.top+1&&pic.width>50};});
  const a=await open();
  ok(!a.cesium,"Cesium yüklenmedi (hafif görünüm)");ok(a.rotors===2,`pervaneler göbeklerde (${a.rotors})`);ok(a.shadows===2,`pervane gölgeleri (${a.shadows})`);ok(a.fits,"görüntü bilgi panelinin üstünde, taşmıyor");
  ok(a.lt<3000,`ilk açılışta en uzun görev ${a.lt} ms (< 3000; ölçüm makineye bağlı)`);console.log(`    açılış ${a.ms} ms`);
  if(process.argv[3])await p.screenshot({path:`${process.argv[3]}/closeview-${vp.width}.png`});
  await p.click(".close3d");
  const after=await p.evaluate(async()=>{window.__lt.length=0;await new Promise(r=>setTimeout(r,4000));return {lt:Math.max(0,...window.__lt),hidden:document.getElementById("map3d").hidden};});
  ok(after.hidden,"kapatınca harita geri geldi");ok(after.lt<600,`kapattıktan sonra 4 sn'de en uzun görev ${after.lt} ms (< 600)`);
  const c=await open();ok(c.lt<200&&c.ms<500,`aynı saha yeniden: ${c.ms} ms, en uzun görev ${c.lt} ms (önbellek)`);
  // yakınlaştırma: düğme, tekerlek, çift tık ile sığdırma; görüntü sahne dışına kaymaz
  const zs=()=>p.evaluate(()=>{const t=getComputedStyle(document.querySelector(".cvpic")).transform;return t==="none"?1:new DOMMatrix(t).a;});
  await p.click('.cvzoom [data-z="in"]');await p.click('.cvzoom [data-z="in"]');const z1=await zs();
  ok(z1>2.4&&z1<2.7,`+ düğmesi iki kez: ölçek ${z1.toFixed(2)}`);
  const st=await p.$(".cvstage"),bb=await st.boundingBox();await p.mouse.move(bb.x+bb.width*.3,bb.y+bb.height*.5);await p.mouse.wheel(0,-400);await p.waitForTimeout(200);
  const z2=await zs();ok(z2>z1&&z2<=6,`tekerlekle yakınlaşır, en çok 6x (${z2.toFixed(2)})`);
  const cover=await p.evaluate(()=>{const s=document.querySelector(".cvstage").getBoundingClientRect(),r=document.querySelector(".cvpic").getBoundingClientRect();
    return r.left<=s.left+1||r.right>=s.right-1;});ok(cover,"yakınken görüntü sahneyi doldurur (boşluğa kaymaz)");
  if(process.argv[3])await p.screenshot({path:`${process.argv[3]}/closeview-zoom-${vp.width}.png`});
  await p.mouse.dblclick(bb.x+bb.width*.5,bb.y+bb.height*.5);await p.waitForTimeout(200);ok(await zs()===1,"çift tıkla sığdırılır");
  await p.click(".close3d");ok(errs.length===0,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));await p.close();}
await b.close();console.log(fails?`\n${fails} denetim başarısız`:"\nTüm denetimler geçti");process.exit(fails?1:0);})();
