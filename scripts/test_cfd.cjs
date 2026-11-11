// Deniz üstü rüzgâra fark sözleşmesi (src/support.js CFD). Sınanan: Avrupa'daki offshore santralin ilk blokta sözleşme alması,
// Türkiye'deki offshore'un ve yüzer RES'in almaması, bir günde her saat gerçekleşen gelirin üretim × sözleşme fiyatı olması
// (iki yönlü: farkın işareti piyasaya göre), raporda satır, süresi dolunca ödeme olmaması, eski kayıtta sözleşmenin bugünden
// başlaması, proje ekonomisinde ilk 20 yılın sözleşme fiyatıyla sayılması, kurulum ve saha paneli notları, sözlük, haberler,
// kayıt. N gün işletip desteksiz ve destekli IRR'ı da yazar (ölçüm; 60 günden kısa koşuda yalnızca yazılır, sınanmaz).
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_cfd.cjs http://localhost:5182/sebeke-oyun/ [gün=3; ölçüm için 120]
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
  const st=await imp("state.js"),w=await imp("world.js"),ac=await imp("actions.js"),sim=await imp("sim.js"),sp=await imp("support.js"),fin=await imp("finance.js"),
    ln=await imp("loans.js"),pn=await imp("ui/panel.js"),gl=await imp("glossary.js"),S=st.S,out={};
  S.money=1e10;S.won=true;S.win1=1;S.evCool=1e9;S.mi=99;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1,repReady:1});
  const close=()=>document.querySelectorAll("dialog[open]").forEach(d=>d.close());
  const near=(a,b,e=1e-6)=>Math.abs(a-b)<=e*Math.max(1,Math.abs(b));
  // kara GES ilk proje (başlangıç desteği ona gider), sonra Kuzey Denizi'nde offshore, Marmara'da offshore, Avrupa'da yüzer RES
  S.sites.G={...w.describe(39.5,-3.5),permit:"ok"};ac.build("G","ges","std");
  S.sites.N={...w.describe(54.2,7.9),permit:"ok"};const a0=sp.cfdGrant("E","off");ac.build("N","off","std");ac.build("N","off","std");
  S.sites.M={...w.describe(40.6,27.2),permit:"ok"};ac.build("M","off","std");
  S.sites.F={...w.describe(54.2,7.9+0.6),permit:"ok"};ac.build("F","flo","std");
  const off=S.plants.find(q=>q.t==="N"&&q.k==="off"),offT=S.plants.find(q=>q.t==="M"&&q.k==="off"),flo=S.plants.find(q=>q.t==="F");
  out.grant={N:off&&off.cfd,mw:off&&off.mw,T:offT?offT.cfd:"yok",F:flo?flo.cfd:"yok",days:Math.round(20*ln.ECON_YEAR),strike:sp.CFD.E.p,mreg:S.sites.N.mreg};
  out.grantOk=!!off&&off.cfd&&off.cfd.p===122&&off.cfd.until-S.dayNo===Math.round(20*ln.ECON_YEAR)&&offT&&offT.cfd===null&&sp.cfdGrant("E","flo")===null; // yüzer RES oyunda kilitli olabilir: hak hesabıyla
  // panel notları (kurulum sekmesi ve saha)
  S.sel={id:"N",lat:S.sites.N.lat,lon:S.sites.N.lon};pn.renderPanel();const pt=document.getElementById("panel").innerText;
  out.panelN=pt.includes("Fark sözleşmesi:")&&pt.includes("122,0 $/MWh");
  S.sel={id:"M",lat:S.sites.M.lat,lon:S.sites.M.lon};pn.renderPanel();out.panelM=document.getElementById("panel").innerText.includes("deniz üstü RES'e destek yok");
  // bir gün: her saat gelir artışı = üretim × sözleşme fiyatı; fark = üretim × (sözleşme − satış)
  // santral arızalıysa onarılır; üretimsiz (durgun) günde en çok 3 gün denenir (negatif fiyatlı saatte de üretmez)
  let bad=0,sumX=0,pos=0,neg=0;
  for(let tr=0;tr<3;tr++){S.hour=0;sim.newDay();close();off.down=false;bad=0;sumX=0;pos=0;neg=0;const e00=off.ac?off.ac.e:0;
  for(let h=0;h<24;h++){const e0=off.ac?off.ac.e:0,r0=off.ac?off.ac.r:0,c0=off.ac?(off.ac.cf||0):0,pr=st.D.E.price[h];sim.tick();close();
    const de=off.ac.e-e0,dr=off.ac.r-r0,dc=(off.ac.cf||0)-c0;if(de>0){if(!near(dr,de*122,1e-9))bad++;if(!near(dc,de*(122-pr),1e-6))bad++;if(pr>122)neg++;else pos++;}sumX+=dc;}
  if(off.ac.e>e00)break;}
  out.day={bad,cfd:S.last.cfd,sumX,pos,neg,e:off.ac.e};out.dayOk=bad===0&&near(S.last.cfd,sumX,1e-9)&&off.ac.e>0;
  out.report=((document.getElementById("report")||{}).innerText||"").includes("Fark sözleşmesi");
  // N gün işlet: desteksiz (piyasa) ve destekli IRR (%10 ve %7,5)
  for(let d=1;d<DAYS;d++){S.hour=0;sim.newDay();close();for(let h=0;h<24;h++){sim.tick();close();}}
  fin.setWacc(0.10);const f10=fin.plantFinance(off);const strike=off.cfd;off.cfd=null;const g10=fin.plantFinance(off);off.cfd=strike;
  fin.setWacc(0.075);const f75=fin.plantFinance(off);off.cfd=null;const g75=fin.plantFinance(off);off.cfd=strike;fin.setWacc(0.10);
  out.econ={days:DAYS,cf:f10.cf,mkt:f10.price,irrCfd:f10.irr,irrMkt:g10.irr,lcoe10:f10.lcoe,lcoe75:f75.lcoe,npvCfd10:f10.npv,npvMkt10:g10.npv,npvCfd75:f75.npv,npvMkt75:g75.npv};
  // süresi dolunca ödeme yok
  off.cfd={...off.cfd,until:S.dayNo-1};S.hour=0;sim.newDay();close();for(let h=0;h<24;h++){sim.tick();close();}out.expired=S.last.cfd;off.cfd=strike;
  // eski kayıt: sözleşmesi belirlenmemiş offshore bugünden başlar
  delete off.cfd;S.hour=0;sim.newDay();close();out.migr=off.cfd&&off.cfd.p===122&&off.cfd.until-S.dayNo===Math.round(20*ln.ECON_YEAR);
  const rn=await imp("data/realnews.js");out.real=(S.rn||[]).includes("2026-01-14-cfd-ar7")&&rn.REAL_NEWS.some(n=>n.id==="2026-08-12-offshore-yeka");
  out.gloss=gl.TERMS.some(t=>t.k==="cfd");
  st.save();out.saved=Object.keys(localStorage).some(k=>{const v=localStorage.getItem(k)||"";return v.includes('"cfd":{"p":122');});
  return out;},[u,DAYS]);
const pc=x=>x==null?"–":(x*100).toFixed(1)+"%",f0=x=>x==null?"–":x.toFixed(1);
ok(r.grantOk,`Avrupa offshore sözleşme aldı (${r.grant.strike} $/MWh, ${r.grant.days} gün); Türkiye offshore ve yüzer RES almadı`);
ok(r.panelN&&r.panelM,"panel notları: Avrupa'da sözleşme, Türkiye'de destek yok");
ok(r.dayOk,`bir gün: her saat gelir = üretim × 122; fark ${f0(r.day.cfd)} $ (saat: piyasa altında ${r.day.pos}, üstünde ${r.day.neg}); hata ${r.day.bad}`);
ok(r.report,"günlük raporda fark sözleşmesi satırı");
ok(r.expired===0,"süresi dolunca ödeme yok");
ok(r.migr,"eski kayıtta sözleşme bugünden başlıyor");
ok(r.real&&r.gloss,"gerçek dünya haberleri ve sözlük");
ok(r.saved,"sözleşme kayda yazılıyor");
(r.econ.days<60?(m=>console.log("  · "+m)):(m=>ok(r.econ.irrCfd!=null&&(r.econ.irrMkt==null||r.econ.irrCfd>r.econ.irrMkt),m)))(`ölçüm (${r.econ.days} gün, KF ${pc(r.econ.cf)}, piyasa satış fiyatı ${f0(r.econ.mkt)} $/MWh): IRR destekli ${pc(r.econ.irrCfd)}, desteksiz ${pc(r.econ.irrMkt)}; LCOE %10 ${f0(r.econ.lcoe10)}, %7,5 ${f0(r.econ.lcoe75)}; NPV %10 destekli ${f0(r.econ.npvCfd10/1e6)} M$, desteksiz ${f0(r.econ.npvMkt10/1e6)} M$; %7,5 destekli ${f0(r.econ.npvCfd75/1e6)} M$`);
ok(!errs.length,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));
await b.close();console.log(fails?`\n${fails} başarısız`:"\nhepsi geçti");process.exit(fails?1:0);})();
