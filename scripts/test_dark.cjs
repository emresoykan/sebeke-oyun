// Karanlık tema denetimi: oyunun ekranlarını prefers-color-scheme: dark ile açar, her ekranda görünür metinlerin
// zemine karşı kontrast oranını (WCAG 2.x) ölçer ve ekran görüntüsü alır. Zemin, öğeden yukarı doğru ilk opak arka plan
// rengine kadar yarı saydam katmanlar üst üste bindirilerek bulunur; arka planında görüntü/degrade olan ya da haritanın
// üstünde saydam duran metin "ölçülemedi" sayılır (ekran görüntüsünden gözle bakılır). Sınır: normal metin 4,5, büyük
// metin (24 px ya da 18,66 px kalın) 3. Devre dışı düğmeler WCAG gereği hariç.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_dark.cjs http://localhost:5182/sebeke-oyun/ [ekran görüntüsü klasörü] [--light]
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/",SHOT=process.argv[3]&&!process.argv[3].startsWith("--")?process.argv[3]:null;
const SCHEME=process.argv.includes("--light")?"light":"dark";
const all=[];
async function audit(p,name,root="body"){
  const r=await p.evaluate(root=>{
    const parse=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return null;const v=m[1].split(/[ ,/]+/).filter(Boolean).map(Number);return [v[0],v[1],v[2],v.length>3?v[3]:1];};
    const lum=([r,g,b])=>{const f=x=>{x/=255;return x<=0.03928?x/12.92:((x+0.055)/1.055)**2.4;};return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
    const over=(top,bot)=>{const a=top[3];return [top[0]*a+bot[0]*(1-a),top[1]*a+bot[1]*(1-a),top[2]*a+bot[2]*(1-a),1];};
    // zemin: yukarı doğru yarı saydam katmanlar; opak renge ulaşınca biter. Görüntü/degrade ya da harita: ölçülemez
    function bgOf(el){const layers=[];for(let e=el;e;e=e.parentElement){const cs=getComputedStyle(e);
        if(cs.backgroundImage&&cs.backgroundImage!=="none")return null;
        if(e.id==="map"||e.id==="mapwrap"||e.classList.contains("maplibregl-map"))return null;
        const c=parse(cs.backgroundColor);if(c&&c[3]>0){layers.push(c);if(c[3]>=0.99)break;}
        if(e.tagName==="DIALOG"&&e.open&&!(c&&c[3]>=0.99))return null;}
      let b=layers.length&&layers[layers.length-1][3]>=0.99?layers.pop():parse(getComputedStyle(document.body).backgroundColor);
      for(let i=layers.length-1;i>=0;i--)b=over(layers[i],b);return b;}
    const out=[],seen=new Set(),R=document.querySelector(root)||document.body;
    const tw=document.createTreeWalker(R,NodeFilter.SHOW_TEXT);let n;
    while((n=tw.nextNode())){const t=n.textContent.trim();if(!t)continue;const el=n.parentElement;if(!el||seen.has(el))continue;seen.add(el);
      if(el.closest("[hidden],script,style,svg,canvas")||el.closest("button:disabled,input:disabled"))continue;
      const rc=el.getBoundingClientRect();if(rc.width<1||rc.height<1)continue; // kaydırılarak görülen metin de ölçülür
      const cs=getComputedStyle(el);if(cs.visibility==="hidden"||+cs.opacity===0)continue;
      // üst üste binen modal varken altta kalanlar ölçülmez
      const dlg=document.querySelector("dialog[open]");if(dlg&&!dlg.contains(el))continue;
      let op=1;for(let e=el;e;e=e.parentElement)op*=+getComputedStyle(e).opacity;
      const fg=parse(cs.color);if(!fg)continue;const bg=bgOf(el);
      const sz=parseFloat(cs.fontSize),bold=+cs.fontWeight>=700,large=sz>=24||(sz>=18.66&&bold),need=large?3:4.5;
      const id=(el.id?"#"+el.id:"")+(el.className&&typeof el.className==="string"?"."+el.className.trim().split(/\s+/).slice(0,2).join("."):"");
      const lbl=`${el.tagName.toLowerCase()}${id} "${t.slice(0,40)}"`;
      if(!bg){out.push({lbl,na:true});continue;}
      const f=over([fg[0],fg[1],fg[2],fg[3]*op],bg),L1=lum(f),L2=lum(bg),ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
      out.push({lbl,ratio:Math.round(ratio*100)/100,need,fg:cs.color,bg:`rgb(${bg.slice(0,3).map(Math.round).join(",")})`});}
    return out;},root);
  const bad=r.filter(x=>!x.na&&x.ratio<x.need),na=r.filter(x=>x.na).length,okN=r.length-bad.length-na;
  all.push({name,bad,na,okN});
  console.log(`  ${bad.length?"✗":"✓"} ${name}: ${okN} metin geçti${bad.length?`, ${bad.length} düşük kontrast`:""}${na?`, ${na} ölçülemedi (görüntü/harita zemini)`:""}`);
  for(const x of bad.slice(0,12))console.log(`      ${x.ratio} < ${x.need}  ${x.lbl}  (${x.fg} / ${x.bg})`);
}
const shot=async(p,name)=>{if(SHOT)await p.screenshot({path:`${SHOT}/${SCHEME}-${name}.png`});};
const closeAll=p=>p.evaluate(()=>document.querySelectorAll("dialog[open]").forEach(d=>d.close()));

(async()=>{const b=await chromium.launch();
for(const vp of [{width:1366,height:768},{width:390,height:844}]){
  const m=vp.width<900,W=vp.width;console.log(`\n[${W}×${vp.height}, ${SCHEME}]`);
  const p=await b.newPage({viewport:vp,hasTouch:m,isMobile:m,colorScheme:SCHEME});const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
  await p.route(/fonts\.g/,r=>r.abort());
  await p.addInitScript(()=>{if(sessionStorage.getItem("t"))return;sessionStorage.setItem("t","1");localStorage.clear();});
  // 1. kurulum ekranı (profil yok)
  await p.goto(URL0);await p.waitForTimeout(3500);
  await audit(p,`${W} kurulum ekranı`);await shot(p,`${W}-01-kurulum`);
  await p.evaluate(()=>{localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"Deneme Enerji",color:"#1F9D74",spec:"eng",created:1}));});
  await p.reload();await p.waitForTimeout(3500);
  // 2. eğitim başı: görev çubuğu, vurgu
  await audit(p,`${W} eğitim başı`);await shot(p,`${W}-02-egitim`);
  // 3. seçili nokta paneli
  await p.evaluate(async()=>{const st=await import("/src/state.js"),S=st.S;S.sel={id:null,lat:38.1,lon:32.6};(await import("/src/ui/panel.js")).renderPanel();
    if(innerWidth<900)(await import("/src/ui/sheet.js")).openSheet("saha");});
  await p.waitForTimeout(1200);await audit(p,`${W} nokta paneli`,"#panel");await shot(p,`${W}-03-nokta`);
  // 4. izin reddi seçenekleri
  await p.evaluate(async()=>{const st=await import("/src/state.js"),ac=await import("/src/actions.js"),S=st.S;S.money=5e6;S.won=true;S.win1=1;S.evCool=999;
    for(const r in S.rivals||{})S.rivals[r].sites=S.rivals[r].sites.filter(x=>Math.hypot(x.lat-38.1,x.lon-32.6)>1);S.sel={id:null,lat:38.1,lon:32.6};ac.buyLand();
    const o=S.sites[S.sel.id];o.permit="rejected";o.why="ÇED raporu yetersiz bulundu";(await import("/src/ui/panel.js")).renderPanel();});
  await p.waitForTimeout(500);await audit(p,`${W} izin reddi`,"#panel");await shot(p,`${W}-04-red`);
  // 5. santralli saha + eğitim sonrası; ilk satış kartı
  await p.evaluate(async()=>{const st=await import("/src/state.js"),ac=await import("/src/actions.js"),sim=await import("/src/sim.js"),S=st.S;
    const id=S.sel.id;S.sites[id].permit="ok";ac.build(id,"ges","std");ac.build(id,"res","std");ac.build(id,"batt","std");S.desk={ratio:1,fc:"std",batt:"arb",auto:true};
    for(let h=0;h<14;h++)sim.tick();});
  await p.waitForTimeout(800);
  if(await p.evaluate(()=>document.getElementById("firstDlg").open)){await audit(p,`${W} ilk satış kartı`,"#firstDlg");await shot(p,`${W}-05-ilksatis`);}
  else console.log("  · ilk satış kartı açılmadı");
  await closeAll(p);
  await p.evaluate(async()=>{const st=await import("/src/state.js"),sim=await import("/src/sim.js"),S=st.S;S.mi=9;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1});
    for(let d=0;d<7;d++){for(let h=0;h<24;h++)sim.tick();document.querySelectorAll("dialog[open]").forEach(x=>x.close());}});
  await p.click("#pauseBtn").catch(()=>{});await closeAll(p);
  await p.evaluate(async()=>{const S=(await import("/src/state.js")).S,id=Object.keys(S.sites)[0];S.sel={id,lat:S.sites[id].lat,lon:S.sites[id].lon};
    (await import("/src/ui/panel.js")).renderPanel();if(innerWidth<900)(await import("/src/ui/sheet.js")).openSheet("saha");});
  await p.waitForTimeout(800);await audit(p,`${W} saha paneli`,"#panel");await shot(p,`${W}-06-saha`);
  await p.evaluate(()=>{const d=document.querySelector("#panel details.sell");if(d){d.open=true;d.scrollIntoView({block:"start"});}});
  await p.waitForTimeout(300);await audit(p,`${W} sahayı sat`,"#panel details.sell");await shot(p,`${W}-07-sat`);
  // 6. sekmeler
  for(const [t,n] of [["piyasa","08-piyasa"],["rapor","09-rapor"],["ayar","10-ayarlar"]]){
    await p.evaluate(async t=>{(await import("/src/ui/sheet.js")).openSheet(t);document.querySelector(`section.tabp[data-tab="${t}"]`)?.scrollTo?.(0,0);},t);
    if(t==="rapor")await p.evaluate(()=>document.querySelectorAll("#report details,#fin details").forEach(d=>d.open=true));
    await p.waitForTimeout(600);await audit(p,`${W} ${t} sekmesi`,`section.tabp[data-tab="${t}"]`);await shot(p,`${W}-${n}`);}
  // 7. pencereler (olay kartı önce: GÖP masası zorla kapatılınca pencere kuyruğu kilitli kalır, oyuncu masayı düğmeyle kapatır)
  const dlgs=[
    ["12-olay","olay kartı","#eventDlg",async()=>{(await import("/src/ui/eventcard.js")).showEvent({tag:"Piyasa",title:"Deneme olayı",text:"Olay kartının karanlık temada okunurluğu için örnek metin.",learn:"Örnek piyasa notu.",
      opts:[{l:"Birinci seçenek",e:"Etkisi: üretim %10 düşer"},{l:"İkinci seçenek",e:"Etkisi: 5 b$ maliyet",c:1e12}]},()=>"Sonuç metni");}],
    ["11-gop","GÖP masası","#deskDlg",async()=>{(await import("/src/ui/desk.js")).openDesk(true);}],
    ["13-sozluk","sözlük","#glossDlg",async()=>{(await import("/src/ui/help.js")).openGlossary("dscr");}],
    ["14-notlar","sürüm notları","#notesDlg",async()=>{(await import("/src/ui/help.js")).openNotes();}],
    ["15-geribildirim","geri bildirim","#fbDlg",async()=>{(await import("/src/ui/feedback.js")).openFeedback();}],
    ["16-profil","profil","#profileDlg",async()=>{document.getElementById("profileBtn").click();}],
    ["17-onay","onay penceresi","#confirmDlg",async()=>{(await import("/src/ui/sheet.js")).confirmBox("Yeniden başla","Deneme metni: tüm ilerleme silinsin mi?","Sil",true,"Şirket profilini de sil",true);}],
    ["18-zafer","zafer ekranı","#winDlg",async()=>{const S=(await import("/src/state.js")).S;S.won=false;S.money=9e6;(await import("/src/ui/hud.js")).render();await new Promise(r=>setTimeout(r,200));}],
    ["19-iflas","iflas ekranı","#winDlg",async()=>{(await import("/src/ui/hud.js")).showLose();}]];
  for(const [n,lbl,sel,fn] of dlgs){await closeAll(p);await p.evaluate(fn);await p.waitForTimeout(600);
    if(!(await p.evaluate(s=>document.querySelector(s)?.open,sel))){console.log(`  · ${lbl} açılmadı (pencere kuyruğu: ${await p.evaluate(async()=>(await import("/src/ui/modal.js")).modalBusy())})`);continue;}
    await audit(p,`${W} ${lbl}`,sel);await shot(p,`${W}-${n}`);
    // olay kartı oyuncu gibi kapatılır (seçim + Tamam): zorla kapatmak pencere kuyruğunu kilitler
    if(n==="12-olay"){await p.click("#eventDlg button[data-i]:not(:disabled)");await p.waitForTimeout(300);
      await audit(p,`${W} olay sonucu`,sel);const okb=await p.$('#eventDlg [data-a="ok"]');if(okb)await okb.click();await p.waitForTimeout(300);}}
  await closeAll(p);
  // 8. harita kontrolleri: lejant, arama, haber listesi
  await p.evaluate(async()=>{(await import("/src/ui/sheet.js")).collapseSheet?.();});
  await p.click("#legendBtn").catch(()=>{});await p.waitForTimeout(400);await audit(p,`${W} lejant`,"#mapLegend");await shot(p,`${W}-20-lejant`);await p.click("#legendBtn").catch(()=>{});
  await p.click("#searchBtn").catch(()=>{});await p.keyboard.type("konya");await p.waitForTimeout(500);await audit(p,`${W} yer arama`,"#mapSearch");await shot(p,`${W}-21-arama`);await p.keyboard.press("Escape");
  const tk=await p.$("#ticker:not([hidden]) .tk-btn");if(tk){await tk.click();await p.waitForTimeout(300);await audit(p,`${W} haber listesi`,"#ticker");await shot(p,`${W}-22-haber`);await tk.click();}
  // 9. hafif yakın görünüm (ekran kartsız tarayıcı)
  await p.evaluate(async()=>{const S=(await import("/src/state.js")).S,id=Object.keys(S.sites)[0];S.sel={id,lat:S.sites[id].lat,lon:S.sites[id].lon};(await import("/src/ui/panel.js")).renderPanel();
    (await import("/src/ui/sheet.js")).openSheet("saha");});
  await p.waitForTimeout(600);const fly=await p.$('#panel button[data-a="fly"]');
  if(fly){await fly.scrollIntoViewIfNeeded();await fly.click();await p.waitForTimeout(5000);await audit(p,`${W} yakın görünüm`,"#map3d");await shot(p,`${W}-23-yakin`);await p.click(".close3d").catch(()=>{});}
  console.log(errs.length?`  ✗ sayfa hatası: ${errs.join(" | ")}`:"  ✓ sayfa hatası yok");await p.close();}
await b.close();
const nb=all.reduce((a,x)=>a+x.bad.length,0);console.log(nb?`\n${nb} düşük kontrastlı metin (${all.filter(x=>x.bad.length).length} ekranda)`:"\nTüm ölçülen metinler kontrast sınırını geçti");
process.exit(nb?1:0);})();
