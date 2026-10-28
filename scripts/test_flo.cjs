// Yüzer RES (çift rotor): derin deniz bandı, izinli teknolojiler, deneyim kilidi, kurulum, üretim, durum metni, fırtına
// kartında hasar görmemesi, gün sonu raporu ve haritadaki dönen pervaneler (her platformda iki rotor).
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_flo.cjs http://localhost:5182/sebeke-oyun/ [ekran görüntüsü klasörü]
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/",SHOT=process.argv[3];let fails=0;
const ok=(c,m)=>{console.log((c?"  ✓ ":"  ✗ ")+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const p=await b.newPage({viewport:{width:1366,height:768}});const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
await p.route(/fonts\.g/,r=>r.abort());
await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
await p.goto(URL0);await p.waitForTimeout(3500);
const r=await p.evaluate(async()=>{
  const st=await import("/src/state.js"),w=await import("/src/world.js"),ru=await import("/src/rules.js"),ac=await import("/src/actions.js"),cfg=await import("/src/config.js"),S=st.S,out={};
  S.money=9e6;S.won=true;S.win1=1;S.evCool=999;S.mi=9;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1});for(const k in S.rivals||{})S.rivals[k].sites=[];
  const deep=w.describe(33,29),shallow=w.describe(41.3,29.6),ocean=w.describe(30,-40);
  out.zones=[deep.deep&&!deep.shallow,ru.allowed(deep).join(","),shallow.shallow,ru.allowed(shallow).join(","),!!ocean.deep||!!ocean.shallow];
  // kilitliyken derin denizde arazi alınamaz
  S.sel={id:null,lat:33,lon:29};ac.buyLand();out.lockedBuy=!S.sel.id&&ru.locked("flo");
  // deneyim: 60 MW kurulu güç (kara sahası, doğrudan)
  S.sites.x={...w.describe(38.1,32.6),permit:"ok"};S.plants.push({t:"x",k:"ges",q:"std",mw:60,soc:0,cost:1});
  out.unlocked=!ru.locked("flo");
  S.sel={id:null,lat:33,lon:29};ac.buyLand();const id=S.sel.id;out.bought=!!id;S.sites[id].permit="ok";
  const m0=S.money;ac.build(id,"flo","std");ac.build(id,"flo","std");out.capex=m0-S.money;out.mw=S.plants.filter(q=>q.t===id).reduce((a,q)=>a+q.mw,0);
  out.capexExp=2*cfg.TECH.flo.capex;
  return {...out,id};});
ok(r.zones[0]&&r.zones[1]==="flo","derin deniz bandı (Mısır açığı): yalnızca yüzer RES");
ok(r.zones[2]&&r.zones[3]==="off,flo,mar","sığ deniz: sabit tabanlı, yüzer ve deniz enerjisi");
ok(!r.zones[4],"açık okyanus (kıyıya 350 km'den uzak): kurulum yok");
ok(r.lockedBuy,"60 MW'tan önce derin denizde arazi alınamaz");
ok(r.unlocked&&r.bought,"60 MW'tan sonra açılır, derin deniz alanı alınır");
ok(r.mw===10&&Math.abs(r.capex-r.capexExp)<1,`iki blok kuruldu: 10 MW, yatırım ${r.capex}`);
const r2=await p.evaluate(async id=>{const st=await import("/src/state.js"),sim=await import("/src/sim.js"),ps=await import("/src/plantstatus.js"),ev=await import("/src/events.js"),S=st.S,out={};
  // fırtına kartı: "çalışmaya devam et" yalnızca yüzer RES varken hiç arıza üretmez (karttaki seçenek doğrudan çalıştırılır)
  const storm=ev.EVENTS.find(e=>e.id==="storm");out.stormOk=storm.ok();
  S.plants=S.plants.filter(q=>q.t===id);let down=0;
  for(let i=0;i<60;i++){const o=storm.opts("T")[1];o.run();if(S.plants.some(q=>q.down)){down++;S.plants.forEach(q=>q.down=0);}}
  out.down=down;S.mods=[];
  // bir gün işlet: üretim, durum metni, rapor satırı
  for(let h=0;h<24;h++)sim.tick();document.querySelectorAll("dialog[open]").forEach(d=>d.close());
  out.E=S.last&&S.last.E.flo;out.txt=ps.statusText(ps.plantStatus(id));
  (await import("/src/ui/hud.js")).renderReport();out.row=/RES yüzer/.test(document.getElementById("report").textContent);
  return out;},r.id);
ok(r2.stormOk,"fırtına kartı yüzer RES sahibine de gelir");
ok(r2.down===0,`fırtınada "çalışmaya devam" 60 denemede yüzer RES'e hiç arıza vermedi (${r2.down})`);
ok(r2.E>0,`bir günde üretim ${Math.round(r2.E||0)} MWh`);
ok(/Yüzer RES/.test(r2.txt),`durum metni: "${r2.txt}"`);
ok(r2.row,"gün sonu raporunda RES yüzer satırı");
// harita görüntüsü: her platformda iki rotor (göbek), yakın görünüm
const im=await p.evaluate(async id=>{const F=await import("/src/ui/siteimage.js"),x=await F.siteImage(id,true);return {hubs:x.hubs.length,k:[...new Set(x.hubs.map(h=>h.k))].join(","),sym:x.hubs.every(h=>Math.abs(h.m[1])<1e-3)};},r.id);
ok(im.hubs===2&&im.k==="flo",`tesis görüntüsünde ${im.hubs} rotor göbeği (${im.k})`);
ok(im.sym,"rotor diski kameraya dönük (kaymasız)");
if(SHOT){await p.evaluate(async id=>{const S=(await import("/src/state.js")).S,o=S.sites[id];S.hour=12;S.sel={id,lat:o.lat,lon:o.lon};(await import("/src/ui/panel.js")).renderPanel();(await import("/src/ui/sheet.js")).openSheet("saha");},r.id);
  await p.click("#pauseBtn");await p.evaluate(()=>{const b=document.querySelector('#panel button[data-a="fly"]');b.scrollIntoView();b.click();});await p.waitForTimeout(6000);
  await (await p.$("#map3d")).screenshot({path:`${SHOT}/flo-close.png`});
  const fs=require("fs"),b64=await p.evaluate(async id=>{const F=await import("/src/ui/siteimage.js"),x=await F.siteImage(id,true),bl=await (await fetch(x.lods[0].url)).blob();
    return await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result.split(",")[1]);f.readAsDataURL(bl);});},r.id);fs.writeFileSync(`${SHOT}/flo-img.png`,Buffer.from(b64,"base64"));}
ok(errs.length===0,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));
await b.close();console.log(fails?`\n${fails} denetim başarısız`:"\nTüm denetimler geçti");process.exit(fails?1:0);})();
