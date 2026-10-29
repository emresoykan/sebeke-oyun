// Deniz üstü GES (kazıklı, sığ kıyı): izinli yerler (sığ denizde kıyıya SPV_KM'den yakın), kurulum ve maliyet, saha sınırı,
// dört günlük işletme (üretim aynı enlemdeki kara GES'iyle kıyaslanır: SPV_GAIN × hava farkı), durum metni, rapor satırı,
// proje ekonomisi, satış teklifi, saha paneli notu ve haritadaki tesis görüntüsü; eski kayıtta güneş ve kıyı uzaklığı tamamlanır.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_spv.cjs http://localhost:5182/sebeke-oyun/
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/";let fails=0;
const ok=(c,m)=>{console.log((c?"  ✓ ":"  ✗ ")+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const p=await b.newPage({viewport:{width:1366,height:768}});const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
await p.route(/fonts\.g/,r=>r.abort());
await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
await p.goto(URL0);await p.waitForTimeout(3500);
const r=await p.evaluate(async()=>{
  const st=await import("/src/state.js"),w=await import("/src/world.js"),ru=await import("/src/rules.js"),ac=await import("/src/actions.js"),cfg=await import("/src/config.js"),S=st.S,out={};
  S.money=9e7;S.won=true;S.win1=1;S.evCool=99999;S.mi=9;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1});for(const k in S.rivals||{})S.rivals[k].sites=[];
  // Antalya körfezi (kıyıya ~7 km), Kuzey Denizi açığı (~49 km), derin bant, kara
  const near=w.describe(36.75,31.2),far=w.describe(54.2,7.9),land=w.describe(36.9,30.9);
  out.near={km:near.coastKm,sun:near.solar,a:ru.baseAllowed(near)};out.far={km:far.coastKm,a:ru.baseAllowed(far)};out.land=ru.baseAllowed(land);
  // eski kayıt: sığ deniz sahasında güneş 0 ve kıyı uzaklığı yok; fillRes tamamlar
  const old={...near,solar:0};delete old.coastKm;w.fillRes(old);out.old={sun:old.solar,km:old.coastKm};
  S.sites.s={...near,permit:"ok"};S.sites.g={...land,permit:"ok"};
  const m0=S.money;ac.build("s","spv","std");out.cost=m0-S.money;out.exp=cfg.TECH.spv.capex;
  ac.build("g","ges","std");
  // saha sınırı: deniz GES'i sınıra sayılır
  for(let i=0;i<9;i++)ac.build("s","spv","std");out.mw=S.plants.filter(q=>q.t==="s"&&q.k==="spv").reduce((a,q)=>a+q.mw,0);out.cap=ru.capMW("s");
  out.fit=!!S.sites.s.fit||!!S.sites.g.fit;
  return out;});
ok(r.near.a.includes("spv")&&r.near.km<=20&&r.near.sun>0.3,`kıyıya ${r.near.km} km sığ deniz: ${r.near.a.join(",")} (güneş ${r.near.sun.toFixed(2)})`);
ok(!r.far.a.includes("spv")&&r.far.a.includes("off"),`kıyıya ${r.far.km} km: deniz GES'i yok (${r.far.a.join(",")})`);
ok(!r.land.includes("spv"),"karada deniz GES'i yok");
ok(r.old.sun>0.3&&r.old.km>0,`eski kayıtta güneş (${r.old.sun.toFixed(2)}) ve kıyı uzaklığı (${r.old.km} km) tamamlandı`);
ok(Math.abs(r.cost-r.exp)<1,`kurulum maliyeti ${r.cost} (${r.exp})`);
ok(r.mw===40&&r.cap===40,`saha sınırına sayılır: ${r.mw} MW kuruldu, sınır ${r.cap} MW`);
const d=await p.evaluate(async()=>{const st=await import("/src/state.js"),sim=await import("/src/sim.js"),ps=await import("/src/plantstatus.js"),fin=await import("/src/finance.js"),sale=await import("/src/sale.js"),S=st.S,out={};
  const days=[];for(let i=0;i<4;i++){for(let h=0;h<24;h++)sim.tick();document.querySelectorAll("dialog[open]").forEach(x=>x.close());days.push(JSON.parse(JSON.stringify(S.last)));}
  out.E={spv:Math.round(days.reduce((a,L)=>a+L.E.spv,0)),ges:Math.round(days.reduce((a,L)=>a+L.E.ges,0))};
  out.txt=ps.statusText(ps.plantStatus("s"));
  (await import("/src/ui/hud.js")).renderReport();out.rep=document.getElementById("report").textContent.includes("GES denizde");
  const q=S.plants.find(x=>x.k==="spv"),f=fin.plantFinance(q);out.fin={wait:!!f.wait,lcoe:f.lcoe==null?null:Math.round(f.lcoe),irr:f.irr};
  out.sale=sale.saleOffer("s");out.sale=out.sale&&out.sale.price>0&&Number.isFinite(out.sale.price);
  const pn=await import("/src/ui/panel.js");const o=S.sites.s;S.sel={id:"s",lat:o.lat,lon:o.lon};pn.renderPanel();
  out.res=document.querySelector("#panel .res")?.textContent||"";document.querySelector('#panel button[data-a="tab"][data-k="spv"]')?.click();out.note=[...document.querySelectorAll("#panel .eqnote")].map(e=>e.textContent).join(" ");
  const F=await import("/src/ui/siteimage.js"),im=await F.siteImage("s",true);out.img=im&&im.lods&&im.lods[0].w;
  return out;});
// aynı enlemde, mevsimde: deniz GES'i (40 MW) ile kara GES'i (5 MW) MW başına üretimi; hava farkı payı geniş
const ratio=(d.E.spv/40)/(d.E.ges/5);
ok(d.E.spv>0&&ratio>0.8&&ratio<1.35,`dört gün: deniz GES'i ${d.E.spv} MWh (40 MW), kara GES'i ${d.E.ges} MWh (5 MW); MW başına oran ${ratio.toFixed(2)}`);
ok(/Deniz GES/.test(d.txt),`durum: ${d.txt}`);
ok(d.rep,"raporda 'GES denizde' satırı");
ok(!d.fin.wait&&d.fin.lcoe>0,`proje ekonomisi: LCOE ${d.fin.lcoe} $/MWh, IRR ${d.fin.irr==null?"yok":(d.fin.irr*100).toFixed(1)+"%"}`);
ok(d.sale,"satış teklifi hesaplanır");
ok(/kazık/.test(d.note)&&/20 km/.test(d.note),"saha panelinde deniz GES'i notu");
ok(/Güneş/.test(d.res)&&/Kıyıya~?\s*~?7 km/.test(d.res.replace(/\s+/g," ").replace("Kıyıya ","Kıyıya")),`saha kaynakları: ${d.res.replace(/\s+/g," ").slice(0,160)}`);
ok(d.img>0,`tesis görüntüsü çizildi (${d.img} px)`);
ok(errs.length===0,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));
await b.close();console.log(fails?`\n${fails} denetim başarısız`:"\nTüm denetimler geçti");process.exit(fails?1:0);})();
