// Avrupa'nın ayrı piyasaları: Fransa (R), İtalya (L), İskandinavya (K) (12.11.2026; config.js REG, docs/kalibrasyon.md
// "Avrupa'nın kalanı"). Sınanan: ülkelerin piyasası (Fransa, İtalya, İsveç, Norveç, Finlandiya; Danimarka ve Almanya Avrupa'da,
// İspanya İberya'da), bir günde üç piyasanın da fiyatı, fiyat tabanı (İtalya'da negatif yok; İskandinavya'da eşik sıfırın
// altında), Avrupa kurallarının ve hidrojen desteğinin geçmesi, kurumlar vergisinin piyasaya göre olması, rüzgâr üretiminin
// (kara katsayısı ve aylık desen) Avrupa'dakiyle aynı kalması, eski kaydın taşınması (piyasa v2), panel notu ve sözlük.
// Kullanım: npx vite --port 5189 &  sonra  node scripts/test_eu3.cjs http://localhost:5189/sebeke-oyun/
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5189/sebeke-oyun/";let fails=0;
const ok=(c,m)=>{console.log((c?"  ✓ ":"  ✗ ")+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const p=await b.newPage({viewport:{width:1366,height:900}});const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
await p.route(/fonts\.g|tile|arcgis|maptiler|openstreetmap|openfreemap|cartocdn|amazonaws/,r=>r.abort());
await p.goto(URL0);await p.waitForTimeout(4000);
const u=await p.evaluate(()=>performance.getEntriesByType("resource").map(e=>e.name).filter(n=>/\/src\/[\w/]+\.js/.test(n)));
const r=await p.evaluate(async(u)=>{const imp=n=>import(u.find(x=>new URL(x).pathname.endsWith("/src/"+n))||("/src/"+n));
  document.querySelectorAll("dialog[open]").forEach(d=>d.close());
  const st=await imp("state.js"),w=await imp("world.js"),ac=await imp("actions.js"),sim=await imp("sim.js"),cfg=await imp("config.js"),fin=await imp("finance.js"),
    sp=await imp("support.js"),wx=await imp("weather.js"),pn=await imp("ui/panel.js"),gl=await imp("glossary.js"),S=st.S,out={};
  S.money=1e10;S.won=true;S.win1=1;S.evCool=1e9;S.fitDone=1;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1,repReady:1});
  const close=()=>document.querySelectorAll("dialog[open]").forEach(d=>d.close());
  const P={FR:[46.5,2.5],IT:[41.3,16.0],SE:[59.5,15.5],NO:[60.5,10.5],FI:[62.5,25.5],DK:[56.0,9.2],DE:[51.0,10.5],ES:[39.5,-3.5]};
  out.m={};for(const [k,[la,lo]] of Object.entries(P)){const d=w.describe(la,lo);out.m[k]=d?d.mreg:null;}
  out.cfg={markets:["R","L","K"].every(k=>cfg.MARKETS.includes(k)&&cfg.EU.has(k)&&cfg.REG[k]&&cfg.FLEET_CF[k]>0&&cfg.CAPEX_M.ges[k]===cfg.CAPEX_M.ges.E),
    names:["R","L","K"].map(k=>cfg.REG[k].n),h2:["R","L","K"].every(k=>sp.h2Grant(k)&&sp.h2Grant(k).kg===sp.h2Grant("E").kg),
    floor:{L:cfg.priceFloor("L",-30),K5:cfg.priceFloor("K",-5),K40:cfg.priceFloor("K",-40),R0:cfg.priceFloor("R",0),R50:cfg.priceFloor("R",50)}};
  // rüzgâr: kara ve deniz katsayısı, aylık desen Avrupa'dakiyle aynı (oyuncunun RES üretimi değişmez)
  out.wind={land:["R","L"].every(k=>w.LAND_K[k]===w.LAND_K.E)&&w.LAND_K.K===1.3&&["R","L","K"].every(k=>w.SEA_K[k]===w.SEA_K.E),
    season:["R","L","K"].every(k=>Math.abs(wx.windSeason(48,3,k,"FRA")-wx.windSeason(48,3,"E","FRA"))<1e-12)};
  // sahalar ve bir gün
  const mk=(id,[la,lo],k)=>{S.sites[id]={...w.describe(la,lo),permit:"ok"};ac.build(id,k,"std");return S.plants.find(q=>q.t===id&&q.k===k);};
  const gR=mk("FR",P.FR,"ges"),gL=mk("IT",P.IT,"ges"),gK=mk("SE",P.SE,"res"),gE=mk("DE",P.DE,"ges");
  S.hour=0;sim.newDay();close();for(let h=0;h<24;h++){sim.tick();close();}
  const D=st.D;out.day={R:D.R&&D.R.price.length===24,L:D.L&&D.L.price.every(x=>x>=0),K:D.K&&D.K.price.length===24,avg:["R","L","K"].map(k=>D[k].price.reduce((a,x)=>a+x,0)/24),
    last:!!S.last&&S.last.dayNo>=1,m:[gR&&gR.m,gL&&gL.m,gK&&gK.m]};
  // kurumlar vergisi piyasaya göre: Fransa'daki santral yalnızca taxR'den etkilenir
  for(let d=0;d<3;d++){S.hour=0;sim.newDay();close();[gR,gL,gK,gE].forEach(q=>q&&(q.down=false));for(let h=0;h<24;h++){sim.tick();close();}}
  const irr=(q,m)=>{const x=fin.projectFinance(q,"spot",m);return x.wait?null:x.projIrr;};
  const r0=irr(gR,"R"),e0=irr(gE,"E");fin.setPf("taxE",0);const r1=irr(gR,"R");fin.setPf("taxR",0);const r2=irr(gR,"R");fin.resetPf();
  out.tax={def:["R","L","K"].map(k=>fin.PF_DEFAULT["tax"+k]),src:["R","L","K"].every(k=>!!fin.PF_SRC["tax"+k]),r0,r1,r2,e0};
  // panel: Fransa GES sekmesinde Almanya'nın primi yok, "tanımlı değil" notu
  S.sel={id:"FR",lat:S.sites.FR.lat,lon:S.sites.FR.lon};pn.renderPanel();const bt=document.querySelector('#panel button[data-a="tab"][data-k="ges"]');if(bt)bt.click();
  out.panel=document.getElementById("panel").innerText.includes("Fransa için oyunda kara GES desteği tanımlı değil");
  out.gloss=(gl.TERMS.find(t=>t.k==="tbolge")||{}).g||"";
  // eski kayıt (piyasa v1): Fransa, İtalya ve İsveç'teki sahalar, santraller ve rakip sahaları Avrupa'dan taşınır; Almanya kalır
  const old=JSON.parse(JSON.stringify(S));old.mktV=1;["R","L","K"].forEach(k=>delete old.mSolar[k]);
  const seWind=S.sites.SE.wind;old.sites.SE.wind=0.05; // eski katsayıyla düşük rüzgâr puanı
  for(const id of ["FR","IT","SE"]){old.sites[id].mreg="E";old.sites[id].reg="E";old.plants.filter(q=>q.t===id).forEach(q=>q.m="E");}
  old.rivals={x:{cash:0,sites:[{lat:46.5,lon:2.5,k:"ges",mw:5,mreg:"E"},{lat:41.3,lon:16,k:"ges",mw:5,mreg:"E"},{lat:52.6,lon:8.4,k:"res",mw:5,mreg:"E"}]}};
  localStorage.setItem(cfg.SAVE_KEY,JSON.stringify(old));const L=st.load();
  out.mig={sites:["FR","IT","SE","DE"].map(id=>L.sites[id].mreg).join(""),reg:["FR","IT","SE"].map(id=>L.sites[id].reg).join(""),
    plants:["FR","IT","SE"].map(id=>L.plants.find(q=>q.t===id).m).join(""),riv:L.rivals.x.sites.map(x=>x.mreg).join(""),
    ms:["R","L","K"].every(k=>L.mSolar[k]===cfg.REG[k].s0),v:L.mktV,log:L.log.some(x=>/Fransa, İtalya ve İskandinavya/.test(x)),wind:[L.sites.SE.wind,seWind],windLog:/İskandinavya'da rüzgâr/.test(L.log[0]||""),fresh:st.fresh().mktV};
  return out;},u);
const f1=x=>x==null?"–":x.toFixed(1),pc=x=>x==null?"–":(x*100).toFixed(2)+"%";
ok(r.m.FR==="R"&&r.m.IT==="L"&&r.m.SE==="K"&&r.m.NO==="K"&&r.m.FI==="K"&&r.m.DK==="E"&&r.m.DE==="E"&&r.m.ES==="I",`ülkelerin piyasası: ${JSON.stringify(r.m)}`);
ok(r.cfg.markets&&r.cfg.names.join()==="Fransa,İtalya,İskandinavya",`piyasalar tanımlı, Avrupa kurallarında, yatırım katsayısı Avrupa'yla aynı (${r.cfg.names.join(", ")})`);
ok(r.cfg.h2,"Avrupa Hidrojen Bankası desteği üç piyasada da");
ok(r.cfg.floor.L===0&&r.cfg.floor.K5>=0&&r.cfg.floor.K40<0&&r.cfg.floor.R0<0&&r.cfg.floor.R50===50,`fiyat tabanı: İtalya'da negatif yok, İskandinavya'da eşik sıfırın altında, Fransa'da Almanya gibi (${JSON.stringify(r.cfg.floor)})`);
ok(r.wind.land&&r.wind.season,"rüzgâr: Fransa ve İtalya Avrupa'nın katsayısında, İskandinavya 1,3 (İsveç filosu); deniz katsayısı ve aylık desen Avrupa'yla aynı");
ok(r.day.R&&r.day.L&&r.day.K&&r.day.last&&r.day.m.join("")==="RLK",`bir gün: fiyatlar hesaplandı (ortalama R ${f1(r.day.avg[0])}, L ${f1(r.day.avg[1])}, K ${f1(r.day.avg[2])} $/MWh), santrallerin piyasası ${r.day.m.join("")}`);
ok(r.tax.def.join()==="25,27.8,20.6"&&r.tax.src&&(r.tax.r0==null||(r.tax.r1===r.tax.r0&&r.tax.r2>=r.tax.r0)),`kurumlar vergisi: Fransa %25, İtalya %27,8, İskandinavya %20,6; Fransa santrali yalnızca Fransa vergisinden etkilenir (IRR ${pc(r.tax.r0)} → taxE 0: ${pc(r.tax.r1)} → taxR 0: ${pc(r.tax.r2)})`);
ok(r.panel,"panel: Fransa'da kara GES desteği tanımlı değil (Almanya'nın primi yalnızca Almanya'da)");
ok(/Fransa/.test(r.gloss)&&/İskandinavya/.test(r.gloss),"sözlükte teklif bölgesi açıklaması güncel");
ok(r.mig.sites==="RLKE"&&r.mig.reg==="RLK"&&r.mig.plants==="RLK"&&r.mig.riv==="RLE"&&r.mig.ms&&r.mig.v===3&&r.mig.log&&r.mig.fresh===3&&r.mig.wind[0]===r.mig.wind[1]&&r.mig.windLog,`eski kayıt taşındı, İskandinavya sahasının rüzgârı yeniden hesaplandı: ${JSON.stringify(r.mig)}`);
ok(!errs.length,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));
await b.close();console.log(fails?`\n${fails} başarısız`:"\nhepsi geçti");process.exit(fails?1:0);})();
