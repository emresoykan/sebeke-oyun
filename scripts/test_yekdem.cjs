// YEKDEM (Türkiye, src/yekdem.js) ve gerçek dünyadan tarihli haberler (src/data/realnews.js).
// Sınanan: saatlik uzlaştırmanın hesabı (yeşil dolum ve boşaltma), uygunluk (yalnızca Türkiye), yeni sahanın o yıl katılması
// (panel düğmesiyle), bir günlük farkın üretim kaydından bağımsız yeniden hesaplanması (bataryasız ve bataryalı), yıl
// geçişinde başvurulu sahanın sabit fiyata geçmesi ve başlangıç desteğinin bitmesi, 1 Kasım hatırlatması, 30 Kasım'dan
// sonra başvurunun kapanması, 157 sayılı İlke Kararı haberinin bir kez görünmesi, günlük rapor satırı, sözlük, kayıt.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_yekdem.cjs http://localhost:5182/sebeke-oyun/
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/";let fails=0;
const ok=(c,m)=>{console.log((c?"  ✓ ":"  ✗ ")+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const p=await b.newPage({viewport:{width:1366,height:900}});const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
await p.route(/fonts\.g|tile|arcgis|maptiler|openstreetmap|openfreemap|cartocdn|amazonaws/,r=>r.abort());
await p.goto(URL0);await p.waitForTimeout(4000);
// Vite'ın ?t= sürümlü modül adresleri: uygulamanın kullandığı örnekler
const u=await p.evaluate(()=>performance.getEntriesByType("resource").map(e=>e.name).filter(n=>/\/src\/[\w/]+\.js/.test(n)));
const r=await p.evaluate(async(u)=>{const imp=n=>import(u.find(x=>new URL(x).pathname.endsWith("/src/"+n))||("/src/"+n));
  document.querySelectorAll("dialog[open]").forEach(d=>d.close());
  const st=await imp("state.js"),w=await imp("world.js"),ac=await imp("actions.js"),sim=await imp("sim.js"),Y=await imp("yekdem.js"),
    cfg=await imp("config.js"),pn=await imp("ui/panel.js"),gl=await imp("glossary.js"),S=st.S,D=()=>st.D,P=cfg.YEKDEM.p,PS=cfg.YEKDEM.store,out={};
  S.money=1e10;S.won=true;S.win1=1;S.evCool=1e9;S.mi=99;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1,repReady:1});
  const near=(a,b,e=1e-6)=>Math.abs(a-b)<=e*Math.max(1,Math.abs(b));
  // 1) hesap: yeşil dolum ve boşaltma
  const q={t:"A",gsoc:0};let x1=Y.yekSettle({A:5},{A:200},[{p:q,e:3,c:true,sb:0,r:0,pr:40}]);
  const x2=Y.yekSettle({},{},[{p:q,e:3,c:false,sb:3,r:0.9,pr:100}]);const x3=Y.yekSettle({},{},[{p:{t:"B",gsoc:0},e:2,c:false,sb:5,r:0.9,pr:100}]);
  out.calc=[x1,x2,x3,q.gsoc];out.calcOk=near(x1,2*(P-40))&&near(x2,3*0.9*(PS-100))&&x3===0&&near(q.gsoc,0);
  // 2) sahalar: önce Avrupa'da GES (başlangıç desteği ona gider), sonra Konya'da GES
  const mk=(id,la,lo)=>{S.sites[id]={...w.describe(la,lo),permit:"ok"};};
  mk("EU1",39.5,-3.5);ac.build("EU1","ges","std");mk("TR1",37.75,33.4);ac.build("TR1","ges","std"); // Karapınar yakını (kırsal)
  out.elig=[Y.yekEligible("TR1"),Y.yekEligible("EU1")];out.fitEU=!!S.sites.EU1.fit;
  const s0=Y.yekStatus("TR1");out.s0={y:s0.y,on:s0.on,canNow:s0.canNow,open:s0.open,fit:s0.fit};
  // 3) panel: YEKDEM bölümü ve "şimdi katıl" düğmesi
  S.sel={id:"TR1",lat:S.sites.TR1.lat,lon:S.sites.TR1.lon};pn.renderPanel();
  const btn=document.querySelector('button[data-a="yekNow"]');out.panelBefore=document.body.innerText.includes(`YEKDEM ${s0.y}:`);out.btn=!!btn;if(btn)btn.click();
  out.on=Y.yekOn("TR1");out.panelAfter=/katılıyor; üretim 59,2 \$\/MWh sabit fiyattan/.test(document.body.innerText);
  // 4) bir gün: fark, üretim kaydından yeniden hesaplanır (bataryasız)
  const ges=S.plants.find(q=>q.t==="TR1"&&q.k==="ges");if(!ges)throw new Error("Türkiye GES kurulamadı: "+JSON.stringify(S.plants.map(q=>q.t+":"+q.k)));sim.newDay();let exp=0;
  for(let h=0;h<24;h++){const e0=ges.ac?ges.ac.e:0,r0=ges.ac?ges.ac.r:0;sim.tick();exp+=(ges.ac.e-e0)*P-(ges.ac.r-r0);document.querySelectorAll("dialog[open]").forEach(d=>d.close());}
  out.day1={yek:S.last.yek,exp,e:ges.ac.e};out.day1Ok=near(S.last.yek,exp,1e-9)&&ges.ac.e>0;
  out.report=(document.getElementById("report")||{}).innerText||"";
  // 5) bataryalı gün: her saat yeşil pay ≤ dolum; fark, GES ve batarya kaydından yeniden hesaplanır
  ac.build("TR1","batt","std");const bt=S.plants.find(q=>q.t==="TR1"&&q.k==="batt");exp=0;let inv=true,gUp=0,gDown=0;
  for(let h=0;h<24;h++){const e0=ges.ac.e,r0=ges.ac.r,so=bt.soc,ar0=bt.ac?bt.ac.r:0,g0=bt.gsoc||0,hh=S.hour,pr=D().T.price[hh];sim.tick();
    const de=ges.ac.e-e0,dr=ges.ac.r-r0,ds=bt.soc-so,g1=bt.gsoc||0;if(g1>bt.soc+1e-9)inv=false;
    let avail=de,x=0;if(ds>0){const g=Math.min(ds,avail);avail-=g;}if(ds<0){const e=-ds,rr=(bt.ac.r-ar0)/(e*pr),gOut=g0-g1;x+=gOut*rr*(PS-pr);gDown+=gOut;}
    if(g1>g0)gUp+=g1-g0;if(de>0)x+=avail*(P-dr/de);exp+=x;document.querySelectorAll("dialog[open]").forEach(d=>d.close());}
  out.day2={yek:S.last.yek,exp,gUp,gDown,inv};out.day2Ok=near(S.last.yek,exp,1e-6)&&inv;
  // 6) başlangıç desteği süren yeni Türkiye sahası: o yıl katılamaz; ertesi yıla başvurur, yıl geçişinde destek biter
  mk("TR2",38.95,34.3);ac.build("TR2","res","std");S.sites.TR2.fit={p:90,until:S.dayNo+500}; // Kırşehir kırsalı
  const s2=Y.yekStatus("TR2");out.tr2={canNow:s2.canNow,fit:s2.fit,apply:Y.yekApplyNext("TR2"),next:Y.yekStatus("TR2").next};
  const dayFor=(y,m,d)=>Math.ceil((Date.UTC(y,m,d)-Date.UTC(2026,2,20))/864e5/3)+1;const go=n=>{S.dayNo=n;S.hour=0;sim.newDay();};
  go(dayFor(2027,0,1));out.y2027={on2:Y.yekOn("TR2"),on1:Y.yekOn("TR1"),fitEnded:S.sites.TR2.fit.until<S.dayNo,
    news:(S.news||[]).some(n=>/YEKDEM 2027: Türkiye'deki 1 sahan/.test(n.t)),log:(S.log||[]).some(l=>/başlangıç desteği \(alım garantisi\) sona erdi/.test(l))};
  // 7) 1 Kasım hatırlatması ve 30 Kasım'dan sonra başvurunun kapanması
  go(dayFor(2027,10,2));out.remind=(S.news||[]).some(n=>/YEKDEM 2028 başvuruları 30 Kasım'a kadar/.test(n.t));out.openNov=Y.yekStatus("TR1").open;
  go(dayFor(2027,11,2));out.closed={open:Y.yekStatus("TR1").open,apply:Y.yekApplyNext("TR1")};
  // 8) gerçek dünya haberi: tarihi geçince bir kez
  go(S.dayNo+1);out.real=(S.news||[]).filter(n=>/157 sayılı İlke Kararı/.test(n.t)).length;out.rn=S.rn;
  // 9) sözlük ve kayıt
  out.gloss=gl.TERMS.some(t=>t.k==="yekdem")&&/~29 oyun günü/.test(gl.TERMS.find(t=>t.k==="fit").g);
  st.save();out.saved=Object.keys(localStorage).some(k=>{const v=localStorage.getItem(k)||"";return v.includes('"TR2"')&&v.includes('"yek":{"2027":1}');});
  return out;},u);
ok(r.calcOk,`uzlaştırma hesabı: doğrudan ${r.calc[0].toFixed(2)}, yeşil boşaltma ${r.calc[1].toFixed(2)}, şebekeden dolum ${r.calc[2]}`);
ok(r.elig[0]&&!r.elig[1],"yalnızca Türkiye sahası uygun");
ok(r.fitEU&&r.s0.canNow&&r.s0.open&&!r.s0.on&&!r.s0.fit,`yeni Türkiye sahası ${r.s0.y} için hemen katılabilir (başlangıç desteği Avrupa'daki ilk projede)`);
ok(r.panelBefore&&r.btn&&r.on&&r.panelAfter,"panelde YEKDEM bölümü; \"şimdi katıl\" düğmesi sahayı sabit fiyata alıyor");
ok(r.day1Ok,`bir günlük fark üretim kaydıyla aynı: ${r.day1.yek.toFixed(2)} $ (yeniden hesap ${r.day1.exp.toFixed(2)} $)`);
ok(/YEKDEM farkı/.test(r.report),"günlük raporda YEKDEM farkı satırı");
ok(r.day2Ok&&r.day2.gUp>0,`bataryalı gün: fark ${r.day2.yek.toFixed(2)} $ (yeniden hesap ${r.day2.exp.toFixed(2)} $), yeşil dolum ${r.day2.gUp.toFixed(2)} MWh, yeşil boşaltma ${r.day2.gDown.toFixed(2)} MWh, yeşil pay hep ≤ dolum`);
ok(!r.tr2.canNow&&r.tr2.fit&&r.tr2.apply&&r.tr2.next,"başlangıç desteği süren saha o yıl katılamıyor, ertesi yıla başvurabiliyor");
ok(r.y2027.on2&&!r.y2027.on1&&r.y2027.fitEnded&&r.y2027.news&&r.y2027.log,"yıl geçişi: başvurulu saha sabit fiyatta, başvurusuz saha piyasada, başlangıç desteği bitti, haber ve kayıt");
ok(r.remind&&r.openNov,"1 Kasım'dan sonra ertesi yıl başvurusu hatırlatması");
ok(!r.closed.open&&!r.closed.apply,"30 Kasım'dan sonra başvuru kapalı");
ok(r.real===1,`157 sayılı İlke Kararı haberi bir kez (${r.real})`);
ok(r.gloss,"sözlükte YEKDEM terimi; başlangıç desteğinin süresi doğru (~29 oyun günü)");
ok(r.saved,"başvuru kayda yazılıyor");
ok(!errs.length,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));
await b.close();console.log(fails?`\n${fails} başarısız`:"\nhepsi geçti");process.exit(fails?1:0);})();
