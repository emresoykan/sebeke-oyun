// Piyasaya göre yatırım maliyeti (config.js CAPEX_M). Sınanan: güneş ailesinin kurulum bedelinin piyasa katsayısıyla değişmesi
// (Türkiye küresel, Avrupa ve İberya ×1,127, Kuzey Amerika ×1,531, Asya ×0,855), rüzgârın değişmemesi, kurulumda düşülen nakdin panelde
// yazan bedelle aynı olması, proje ekonomisinde yatırımın katsayıyla hesaplanması, eski kayıtta santralin piyasasının
// tamamlanması, İberya piyasasına geçişte eski kaydın taşınması, panel notu. N gün işletip GES'in LCOE ve IRR'ını piyasa başına yazar (ölçüm).
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_capex.cjs http://localhost:5182/sebeke-oyun/ [gün=3]
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/",DAYS=+(process.argv[3]||3);let fails=0;
const ok=(c,m)=>{console.log((c?"  ✓ ":"  ✗ ")+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const p=await b.newPage({viewport:{width:1366,height:900}});const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
await p.route(/fonts\.g|tile|arcgis|maptiler|openstreetmap|openfreemap|cartocdn|amazonaws/,r=>r.abort());
await p.goto(URL0);await p.waitForTimeout(4000);
const u=await p.evaluate(()=>performance.getEntriesByType("resource").map(e=>e.name).filter(n=>/\/src\/[\w/]+\.js/.test(n)));
const r=await p.evaluate(async([u,DAYS])=>{const imp=n=>import(u.find(x=>new URL(x).pathname.endsWith("/src/"+n))||("/src/"+n));
  document.querySelectorAll("dialog[open]").forEach(d=>d.close());
  const st=await imp("state.js"),w=await imp("world.js"),ac=await imp("actions.js"),sim=await imp("sim.js"),eq=await imp("equipment.js"),
    fin=await imp("finance.js"),cfg=await imp("config.js"),pn=await imp("ui/panel.js"),S=st.S,out={};
  S.money=1e10;S.won=true;S.win1=1;S.evCool=1e9;S.mi=99;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1,repReady:1});
  const close=()=>document.querySelectorAll("dialog[open]").forEach(d=>d.close());
  const near=(a,b,e=1e-6)=>Math.abs(a-b)<=e*Math.max(1,Math.abs(b));
  const M={T:[37.75,33.4],E:[48.8,11.5],I:[37.6,-4.6],N:[35.0,-106.0],A:[27.3,71.5]};
  // önce Türkiye'de ilk proje (başlangıç desteği); sonra her piyasada GES
  out.cost={};out.paid={};
  for(const [m,[la,lo]] of Object.entries(M)){const id="G"+m;S.sites[id]={...w.describe(la,lo),permit:"ok"};
    out.cost[m]=eq.capexOf("ges","std",S.sites[id].mreg);const m0=S.money;ac.build(id,"ges","std");out.paid[m]=m0-S.money;out[m+"mreg"]=S.sites[id].mreg;}
  const base=cfg.TECH.ges.capex*eq.EQUIP.ges.std.capex,rnd=x=>Math.round(x/100)*100;
  out.costOk=["T","E","I","N","A"].every(m=>out.cost[m]===rnd(base*cfg.capexMul("ges",m))&&out.paid[m]===out.cost[m]);
  out.wind=[eq.capexOf("res","std","N"),eq.capexOf("res","std","T")];
  // panel notu: Kuzey Amerika'da güneş pahalı
  S.sel={id:"GN",lat:S.sites.GN.lat,lon:S.sites.GN.lon};pn.renderPanel();out.note=document.getElementById("panel").innerText.includes("küresel ortalamanın %53 üstünde");
  // eski kayıt: santralin piyasası yoksa gün başında tamamlanır
  const pN=S.plants.find(q=>q.t==="GN");delete pN.m;S.hour=0;sim.newDay();close();out.migr=pN.m==="N";
  // N gün işlet; proje ekonomisinde yatırım katsayılı
  for(let d=0;d<DAYS;d++){if(d)sim.newDay();close();for(let h=0;h<24;h++){sim.tick();close();}S.hour=0;}
  out.econ={};fin.setWacc(0.075);
  for(const m of ["T","E","I","N","A"]){const q=S.plants.find(x=>x.t==="G"+m),f=fin.plantFinance(q);
    out.econ[m]=f.wait?null:{capex:f.capex,lcoe:f.lcoe,irr:f.irr,cf:f.cf,price:f.price,capOk:near(f.capex,cfg.FIN?0:0)};}
  const F=fin.FIN.ges.capex*eq.EQUIP.ges.std.capex*5000;
  out.finOk=["T","E","I","N","A"].every(m=>!out.econ[m]||near(out.econ[m].capex,F*cfg.capexMul("ges",m),1e-9));
  fin.setWacc(0.10);
  // kurumlar vergisi piyasaya göre: İberya taxI, Avrupa taxE (11.11.2026)
  const qE=S.plants.find(x=>x.t==="GE"),qI=S.plants.find(x=>x.t==="GI"),irr=(q,m)=>{const r=fin.projectFinance(q,"spot",m);return r.wait?null:r.projIrr;};
  const i0=irr(qI,"I"),e0=irr(qE,"E");fin.setPf("taxE",0);const i1=irr(qI,"I"),e1=irr(qE,"E");fin.setPf("taxI",0);const i2=irr(qI,"I");fin.resetPf();
  out.tax={def:[fin.PF_DEFAULT.taxE,fin.PF_DEFAULT.taxI],src:!!fin.PF_SRC.taxI,i0,i1,i2,e0,e1};
  // eski kayıt (piyasa v1): İspanya'daki saha, santral ve rakip sahası Avrupa'dan İberya'ya taşınır; Almanya'dakiler kalır
  const old=JSON.parse(JSON.stringify(S));delete old.mktV;delete old.mSolar.I;
  old.sites.GI.mreg="E";old.sites.GI.reg="E";old.plants.find(q=>q.t==="GI").m="E";
  old.rivals={x:{cash:0,sites:[{lat:39.5,lon:-3.5,k:"ges",mw:5,mreg:"E"},{lat:52.6,lon:8.4,k:"res",mw:5,mreg:"E"}]}};
  localStorage.setItem(cfg.SAVE_KEY,JSON.stringify(old));const L=st.load();
  out.mkt={site:L.sites.GI.mreg,reg:L.sites.GI.reg,plant:L.plants.find(q=>q.t==="GI").m,riv:L.rivals.x.sites.map(x=>x.mreg).join(""),
    de:L.sites.GE.mreg,ms:L.mSolar.I===cfg.REG.I.s0,v:L.mktV,log:/İberya/.test(L.log[0]||""),fresh:st.fresh().mktV};
  return out;},[u,DAYS]);
const pc=x=>x==null?"–":(x*100).toFixed(1)+"%",f0=x=>x==null?"–":x.toFixed(1);
ok(r.Tmreg==="T"&&r.Emreg==="E"&&r.Imreg==="I"&&r.Nmreg==="N"&&r.Amreg==="A","test sahaları beklenen piyasalarda");
ok(r.costOk,`GES kurulum bedeli piyasaya göre: T ${r.cost.T}, E ${r.cost.E}, I ${r.cost.I}, N ${r.cost.N}, A ${r.cost.A} $ (düşülen nakit aynı)`);
ok(r.wind[0]===r.wind[1],"karada rüzgâr değişmedi");
ok(r.note,"panelde yatırım maliyeti notu (Kuzey Amerika +%53)");
ok(r.migr,"eski kayıtta santralin piyasası tamamlanıyor");
ok(r.tax.def[0]===29.9&&r.tax.def[1]===25&&r.tax.src&&(r.tax.i0==null||(r.tax.i1===r.tax.i0&&r.tax.i2>=r.tax.i0))&&(r.tax.e0==null||r.tax.e1>=r.tax.e0),
  `kurumlar vergisi: Avrupa %${r.tax.def[0]}, İberya %${r.tax.def[1]}; İberya santrali yalnızca İberya vergisinden etkilenir (${JSON.stringify(r.tax)})`);
ok(r.mkt.site==="I"&&r.mkt.reg==="I"&&r.mkt.plant==="I"&&r.mkt.riv==="IE"&&r.mkt.de==="E"&&r.mkt.ms&&r.mkt.v===1&&r.mkt.log&&r.mkt.fresh===1,`eski kayıt: İspanya'daki saha, santral ve rakip sahası İberya'ya taşındı, Almanya kaldı (${JSON.stringify(r.mkt)})`);
ok(r.finOk,"proje ekonomisinde yatırım piyasa katsayılı");
console.log("  · ölçüm (%7,5 iskonto, "+DAYS+" gün): "+["T","E","I","N","A"].map(m=>{const e=r.econ[m];return e?`${m} yatırım ${(e.capex/1e6).toFixed(2)} M$, KF ${pc(e.cf)}, fiyat ${f0(e.price)}, LCOE ${f0(e.lcoe)} $/MWh, IRR ${pc(e.irr)}`:`${m} veri yok`;}).join(" | "));
ok(!errs.length,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));
await b.close();console.log(fails?`\n${fails} başarısız`:"\nhepsi geçti");process.exit(fails?1:0);})();
