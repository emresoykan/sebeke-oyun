// Sözlük ve sürüm notları: Ayarlar'daki düğmeler, arama, terim bağlantıları (data-gloss), "yeni" işareti, ekrana sığma.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_help.cjs http://localhost:5182/sebeke-oyun/ [ekran görüntüsü klasörü]
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/",SHOT=process.argv[3];let fails=0;
const ok=(c,m)=>{console.log((c?"  ✓ ":"  ✗ ")+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch();
for(const vp of [{width:1366,height:768},{width:390,height:844}]){
  const m=vp.width<900;console.log(`\n[${vp.width}×${vp.height}]`);
  const p=await b.newPage({viewport:vp,hasTouch:m,isMobile:m});const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
  await p.route(/fonts\.g/,r=>r.abort());
  // yalnızca ilk açılışta temizlenir (yenilemede kayıt ve görülen sürüm korunur)
  await p.addInitScript(()=>{if(sessionStorage.getItem("t"))return;sessionStorage.setItem("t","1");localStorage.clear();
    localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
  await p.goto(URL0);await p.waitForTimeout(3500);
  const C=await p.evaluate(async()=>{const g=await import("/src/glossary.js"),n=await import("/src/changelog.js");return {terms:g.TERMS.length,notes:n.NOTES.length,latest:n.LATEST,
    keys:new Set(g.TERMS.map(x=>x.k)).size};});
  ok(C.keys===C.terms,`terim anahtarları benzersiz (${C.terms} terim)`);
  const badge=()=>p.evaluate(()=>({btn:document.getElementById("notesBtn").classList.contains("isnew"),tab:document.querySelector('[role="tab"][data-tab="ayar"]').classList.contains("hasnew"),
    seen:localStorage.getItem("sebeke-notes-seen")}));
  let bd=await badge();ok(!bd.btn&&!bd.tab&&bd.seen===C.latest,"yeni oyuncuda 'yeni' işareti yok, son sürüm görülmüş sayıldı");

  const tab=async t=>{await p.evaluate(async t=>{document.querySelectorAll("dialog[open]").forEach(d=>d.close());const s=await import("/src/ui/sheet.js");s.openSheet(t);},t);await p.waitForTimeout(500);};
  const fit=sel=>p.evaluate(sel=>{const d=document.querySelector(sel),r=d.getBoundingClientRect();
    return {open:d.open,inView:r.left>=0&&r.top>=0&&r.right<=innerWidth+0.5&&r.bottom<=innerHeight+0.5,hx:d.scrollWidth-d.clientWidth,page:document.documentElement.scrollWidth-innerWidth};},sel);

  // Sözlük
  await tab("ayar");await p.click("#glossBtn");await p.waitForTimeout(300);
  let f=await fit("#glossDlg");ok(f.open,"Ayarlar › Sözlük açıldı");ok(f.inView&&f.hx<=0&&f.page<=0,`sözlük ekrana sığıyor, yatay taşma yok (${f.hx}px)`);
  const vis=()=>p.evaluate(()=>[...document.querySelectorAll("#glossDlg .gterm")].filter(e=>!e.hidden).map(e=>e.id));
  ok((await vis()).length===C.terms,`tüm terimler listede (${C.terms})`);
  ok(await p.evaluate(m=>document.activeElement.classList.contains(m?"hclose":"gsearch"),m),m?"dokunmatikte odak kapat düğmesinde (klavye açılmaz)":"odak arama kutusunda");
  await p.fill("#glossDlg .gsearch","dscr");let v=await vis();ok(v.length===1&&v[0]==="g-dscr",`"dscr" araması: ${v.join(",")}`);
  await p.fill("#glossDlg .gsearch","DENGESİZLİK");v=await vis();ok(v.includes("g-imb"),`büyük harf ve Türkçe karakterle arama bulur (${v.join(",")})`);
  await p.fill("#glossDlg .gsearch","irr");v=await vis();ok(v.includes("g-irr"),`"irr" (ı/i farkı) bulunur`);
  await p.fill("#glossDlg .gsearch","zzzz");ok(await p.evaluate(()=>!document.querySelector("#glossDlg .gnone").hidden&&[...document.querySelectorAll("#glossDlg section")].every(s=>s.hidden)),"eşleşme yoksa bilgi satırı");
  // pencere açıkken klavye kısayolu çalışmaz (aramaya "3" yazmak hızı değiştirmez)
  await p.fill("#glossDlg .gsearch","");
  if(SHOT)await p.screenshot({path:`${SHOT}/gloss-${vp.width}.png`});
  await p.keyboard.type("3");
  ok(await p.evaluate(()=>document.querySelector('.speedgrp [data-sp="3"]').getAttribute("aria-pressed"))==="false","sözlükte yazarken hız değişmedi");
  await p.click("#glossDlg .hclose");ok(!(await fit("#glossDlg")).open,"✕ ile kapandı");

  // terim bağlantısı: belirli terime kaydırır ve vurgular
  await p.evaluate(async()=>{const h=await import("/src/ui/help.js");h.openGlossary("dscr");});await p.waitForTimeout(300);
  const hit=await p.evaluate(()=>{const e=document.getElementById("g-dscr"),r=e.getBoundingClientRect(),d=document.getElementById("glossDlg").getBoundingClientRect();
    return {hit:e.classList.contains("hit"),inView:r.top>=d.top&&r.bottom<=d.bottom};});
  ok(hit.hit&&hit.inView,"openGlossary('dscr'): terim görünür ve vurgulu");
  await p.keyboard.press("Escape");
  // Rapor'daki bağlantı
  await tab("rapor");await p.click('section[data-tab="rapor"] [data-gloss]');await p.waitForTimeout(300);
  ok((await fit("#glossDlg")).open,"Rapor › 'Terimler: Sözlük' sözlüğü açar");await p.keyboard.press("Escape");
  // GÖP masası girişindeki bağlantı (masa açıkken üstüne açılır)
  await p.evaluate(async()=>{const st=await import("/src/state.js"),ac=await import("/src/actions.js"),S=st.S;S.money=9e6;S.won=true;S.win1=1;S.evCool=99;S.mi=8;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1});S.sel={id:null,lat:38.1,lon:32.6};ac.buyLand();
    S.sites[S.sel.id].permit="ok";ac.build(S.sel.id,"ges","std");(await import("/src/sim.js")).newDay();document.querySelectorAll("dialog[open]").forEach(x=>x.close());S.ob.desk=0;const d=await import("/src/ui/desk.js");d.openDesk(true);});await p.waitForTimeout(500);
  const dg=await p.$('#deskDlg [data-gloss="imb"]');ok(!!dg,"GÖP masası girişinde sözlük bağlantıları");
  if(dg){await dg.click();await p.waitForTimeout(300);ok(await p.evaluate(()=>document.getElementById("glossDlg").open&&document.getElementById("g-imb").classList.contains("hit")),"masadan 'dengesizlik' terimi açıldı");
    await p.keyboard.press("Escape");ok(await p.evaluate(()=>!document.getElementById("glossDlg").open&&document.getElementById("deskDlg").open),"sözlük kapanınca GÖP masası açık kalır");}
  await p.evaluate(()=>document.querySelectorAll("dialog[open]").forEach(d=>d.close()));

  // Sürüm notları: daha eski sürümü görmüş, sahası olan oyuncu
  await p.evaluate(async()=>{const st=await import("/src/state.js"),ac=await import("/src/actions.js");st.S.sel={id:null,lat:38.1,lon:32.6};ac.buyLand();st.save();
    localStorage.setItem("sebeke-notes-seen","2026-10-01");});
  await p.reload();await p.waitForTimeout(3500);await p.evaluate(()=>document.querySelectorAll("dialog[open]").forEach(d=>d.close()));
  bd=await badge();ok(bd.btn&&bd.tab,"eski sürümü görmüş oyuncuda Ayarlar sekmesinde nokta ve düğmede 'Yeni'");
  await tab("ayar");await p.click("#notesBtn");await p.waitForTimeout(300);
  f=await fit("#notesDlg");ok(f.open&&f.inView&&f.hx<=0,"sürüm notları açıldı ve ekrana sığıyor");
  const rel=await p.evaluate(()=>[...document.querySelectorAll("#notesDlg details.rel")].map(d=>d.open));
  ok(rel.length===C.notes&&rel[0]&&rel.slice(1).every(x=>!x),`${C.notes} sürüm; en yenisi açık, eskiler kapalı`);
  if(SHOT)await p.screenshot({path:`${SHOT}/notes-${vp.width}.png`});
  await p.keyboard.press("Escape");bd=await badge();ok(!bd.btn&&!bd.tab&&bd.seen===C.latest,"açınca 'Yeni' işareti kalktı ve kaydedildi");
  ok(errs.length===0,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));await p.close();}
await b.close();console.log(fails?`\n${fails} denetim başarısız`:"\nTüm denetimler geçti");process.exit(fails?1:0);})();
