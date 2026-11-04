// YEKA yarışmaları (Türkiye, src/yeka.js). Sınanan: kartın 2 Kasım'dan önce çıkmaması, sonra yılda bir kez çıkması, kart
// içeriği (dört seçenek, katkı payı tutarı, kazanma ihtimali), kazanınca izni hazır saha ve sözleşme, kaybedince ödeme
// olmaması, serbest piyasa döneminde fark olmaması, sabit fiyat döneminde bir günlük farkın üretim kaydından bağımsız
// yeniden hesabı, YEKDEM'e kapalı olması, saha paneli, rapor satırı, yakın saha varken kartın çıkmaması, gerçek dünya
// haberleri, sözlük, kayıt.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_yeka.cjs http://localhost:5182/sebeke-oyun/
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
  document.querySelectorAll("dialog[open]").forEach(d=>d.close());
  const st=await imp("state.js"),w=await imp("world.js"),ac=await imp("actions.js"),sim=await imp("sim.js"),K=await imp("yeka.js"),Y=await imp("yekdem.js"),
    cfg=await imp("config.js"),ln=await imp("loans.js"),pn=await imp("ui/panel.js"),gl=await imp("glossary.js"),S=st.S,C=cfg.YEKA,out={};
  S.money=1e10;S.won=true;S.win1=1;S.evCool=1e9;S.mi=99;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1,repReady:1});
  const near=(a,b,e=1e-6)=>Math.abs(a-b)<=e*Math.max(1,Math.abs(b));
  const dayFor=(y,m,d)=>Math.ceil((Date.UTC(y,m,d)-Date.UTC(2026,2,20))/864e5/3)+1;
  const wait=ms=>new Promise(r=>setTimeout(r,ms)),dlg=()=>document.getElementById("eventDlg");
  const close=()=>document.querySelectorAll("dialog[open]").forEach(d=>d.close());
  // bir Avrupa santrali: kartın çıkması için santral gerekir, Türkiye'deki YEKA sahalarına uzak
  S.sites.EU1={...w.describe(39.5,-3.5),permit:"ok"};ac.build("EU1","ges","std");
  // 1) 2 Kasım'dan önce çıkmaz; sonra bir kez çıkar
  S.dayNo=dayFor(2026,9,30);S.hour=0;sim.newDay();await wait(300);out.before=!!(dlg()&&dlg().open)||S.yekaY===2026;close();
  S.dayNo=dayFor(2026,10,2);S.hour=0;sim.newDay();await wait(300);const d1=dlg();
  out.shown=!!(d1&&d1.open)&&/^YEKA (RES|GES)-2026: /.test(d1.querySelector("h3").textContent)&&S.yekaY===2026;
  out.btns=d1?[...d1.querySelectorAll("button[data-i]")].map(x=>x.innerText.replace(/\s+/g," ")):[];
  // kartı "Katılma" ile kapat; aynı yıl tekrar çıkmaz
  if(d1)[...d1.querySelectorAll("button[data-i]")].pop().click();await wait(100);const okb=d1&&d1.querySelector('[data-a="ok"]');if(okb)okb.click();
  S.dayNo++;sim.newDay();await wait(300);out.again=!!(dlg()&&dlg().open);close();
  // 2) kart içeriği (RES): dört seçenek, katkı payı ve ihtimal
  const fee=(k,mw)=>Math.round(k*1000*C.eur*K.yekaCap(mw)*ln.ECON_YEAR/365);
  out.odds=[K.winOdds("res",20),K.winOdds("res",45),K.winOdds("res",90),K.winOdds("ges",20),K.winOdds("ges",45),K.winOdds("ges",90)];
  out.price=[K.yekaPrice("res"),K.yekaPrice("ges")];
  // 3) kazanma: rakip ilk kazanan teklif (RES 30 bin €/MW) olsun; orta teklif (45) kazanır
  const mR=Math.random;let seq=[0.0,0.0,0.0];Math.random=()=>seq.length?seq.shift():0;
  const shown=K.yekaCard("res");Math.random=mR;await wait(300);const d2=dlg();
  const site=C.res.sites[0],cap=K.yekaCap(site[1]),m0=S.money,ids0=Object.keys(S.sites);
  out.card={shown,title:d2.querySelector("h3").textContent,n:d2.querySelectorAll("button[data-i]").length,
    oddsTxt:d2.querySelectorAll("button[data-i]")[1].innerText.includes(`~%${Math.round(out.odds[1]*100)}`)};
  Math.random=()=>0;d2.querySelectorAll("button[data-i]")[1].click();Math.random=mR;await wait(100);
  out.winRes=d2.querySelector(".evresult").textContent;d2.querySelector('[data-a="ok"]').click();
  const id=Object.keys(S.sites).find(k=>!ids0.includes(k)),o=S.sites[id];
  out.win={id:!!id,permit:o&&o.permit,cap:o&&o.cap,capOk:o&&o.cap===cap,paid:m0-S.money,feeExp:fee(45,site[1]),yeka:o&&o.yeka,
    from:o&&o.yeka.from-S.dayNo,len:o&&o.yeka.until-o.yeka.from+1,elig:Y.yekEligible(id)};
  out.winOk=!!id&&o.permit==="ok"&&o.cap===cap&&near(m0-S.money,fee(45,site[1]))&&o.yeka.k==="res"&&o.yeka.p===C.res.p&&
    o.yeka.from-S.dayNo===Math.round(C.res.merch*ln.ECON_YEAR)&&o.yeka.until-o.yeka.from+1===Math.round(C.years*ln.ECON_YEAR);
  // 4) kaybetme: rakip 154 bin €/MW; yüksek teklif (90) kaybeder, ödeme yok
  Math.random=()=>0.99;K.yekaCard("res");Math.random=mR;await wait(300);const d3=dlg(),m1=S.money,n1=Object.keys(S.sites).length;
  Math.random=()=>4.5/7;d3.querySelectorAll("button[data-i]")[2].click();Math.random=mR;await wait(100);
  out.lose={txt:d3.querySelector(".evresult").textContent,paid:m1-S.money,sites:Object.keys(S.sites).length-n1};d3.querySelector('[data-a="ok"]').click();
  // 5) YEKA sahasına RES kur; serbest piyasa döneminde fark yok
  ac.build(id,"res","std");ac.build(id,"res","std");const res=S.plants.filter(q=>q.t===id&&q.k==="res");
  S.hour=0;sim.newDay();for(let h=0;h<24;h++){sim.tick();close();}out.merch=S.last.yeka;
  // 6) sabit fiyat dönemi: bir gün, fark üretim kaydından yeniden hesaplanır
  S.dayNo=o.yeka.from;S.hour=0;sim.newDay();close();let exp=0;
  for(let h=0;h<24;h++){const e0=res.map(q=>q.ac?q.ac.e:0),r0=res.map(q=>q.ac?q.ac.r:0);sim.tick();close();
    res.forEach((q,i)=>{exp+=(q.ac.e-e0[i])*o.yeka.p-(q.ac.r-r0[i]);});}
  out.fixed={yeka:S.last.yeka,exp,e:res.reduce((a,q)=>a+q.ac.e,0)};out.fixedOk=near(S.last.yeka,exp,1e-9)&&out.fixed.e>0&&S.last.yeka!==0;
  out.report=(document.getElementById("report")||{}).innerText||"";
  // 7) panel
  S.sel={id,lat:o.lat,lon:o.lon};pn.renderPanel();const tx=document.getElementById("panel").innerText;
  out.panel=tx.includes(`YEKA RES-2026 ${site[0]}:`)&&tx.includes("Sabit fiyat dönemi")&&tx.includes("(YEKA sahası)")&&!tx.includes("YEKDEM 20");
  // 8) yakın saha varken kart çıkmaz: bütün RES illerinin yakınına saha koy
  C.res.sites.forEach(([,,la,lo],i)=>{S.sites["blk"+i]={...w.describe(la+0.05,lo),permit:"none"};});out.blocked=K.yekaCard("res")===false;
  C.res.sites.forEach((_,i)=>delete S.sites["blk"+i]);
  // 9) gerçek dünya haberleri, sözlük, kayıt
  out.real=["2026-11-02-yeka-res","2026-11-03-yeka-ges"].every(k=>(S.rn||[]).includes(k))&&(S.news||[]).filter(n=>/YEKA RES-2026: 7 yarışmada/.test(n.t)).length<=1;
  out.gloss=gl.TERMS.some(t=>t.k==="yeka");
  st.save();out.saved=Object.keys(localStorage).some(k=>{const v=localStorage.getItem(k)||"";return v.includes('"yeka":{"k":"res"')&&v.includes('"yekaY":2026');});
  return out;},u);
ok(!r.before,"2 Kasım'dan önce YEKA kartı çıkmıyor");
ok(r.shown&&r.btns.length===4&&/Katılma/.test(r.btns[3]),`2 Kasım'dan sonra kart çıkıyor (${r.btns.length} seçenek)`);
ok(!r.again,"aynı yıl ikinci kez çıkmıyor");
ok(r.price[0]===58.2&&r.price[1]===54,`sabit fiyat: RES ${r.price[0]}, GES ${r.price[1]} $/MWh`);
ok(JSON.stringify(r.odds.map(x=>Math.round(x*100)))==="[29,71,86,17,67,83]",`kazanma ihtimalleri (RES 20/45/90, GES 20/45/90): ${r.odds.map(x=>Math.round(x*100)).join(", ")}`);
ok(r.card.shown&&r.card.n===4&&r.card.oddsTxt,`kart: ${r.card.title}; ihtimal metni`);
ok(r.winOk&&!r.win.elig,`kazanma: izinli saha ${r.win.cap} MW, katkı payı ${r.win.paid} $ (beklenen ${r.win.feeExp}), ${r.win.from} gün serbest piyasa, ${r.win.len} gün sabit fiyat; YEKDEM'e kapalı`);
ok(r.lose.txt.startsWith("Kaybettin: rakip 154 bin €/MW")&&r.lose.paid===0&&r.lose.sites===0,`kaybetme: ${r.lose.txt}; ödeme ${r.lose.paid}, yeni saha ${r.lose.sites}`);
ok(r.merch===0||r.merch===undefined,`serbest piyasa döneminde fark yok (${r.merch})`);
ok(r.fixedOk,`sabit fiyat günü: fark ${r.fixed.yeka.toFixed(2)} $ (yeniden hesap ${r.fixed.exp.toFixed(2)} $), üretim ${r.fixed.e.toFixed(0)} MWh`);
ok(/YEKA farkı/.test(r.report),"günlük raporda YEKA farkı satırı");
ok(r.panel,"saha panelinde YEKA sözleşmesi, YEKDEM bölümü yok");
ok(r.blocked,"bütün illerde yakın saha varken kart çıkmıyor");
ok(r.real,"YEKA RES ve GES 2026 gerçek dünya haberleri");
ok(r.gloss,"sözlükte YEKA terimi");
ok(r.saved,"sözleşme ve yılın kartı kayda yazılıyor");
ok(!errs.length,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));
await b.close();console.log(fails?`\n${fails} başarısız`:"\nhepsi geçti");process.exit(fails?1:0);})();
