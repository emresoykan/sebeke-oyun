// Saha satışı (sale.js, panel "Sahayı sat"): teklif dökümü, hesap tutarlılığı, onay penceresi, satış sonrası portföy,
// kredi kapama, eğitimde gizli olması, nakit yetmezse düğmenin kapalı olması. 1366×768 ve 390×844.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_sell.cjs http://localhost:5182/sebeke-oyun/ [ekran görüntüsü klasörü]
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/",SHOT=process.argv[3];let fails=0;
const ok=(c,m)=>{console.log((c?"  ✓ ":"  ✗ ")+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch();
for(const vp of [{width:1366,height:768},{width:390,height:844}]){
  const m=vp.width<900;console.log(`\n[${vp.width}×${vp.height}]`);
  const p=await b.newPage({viewport:vp,hasTouch:m,isMobile:m});const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
  await p.route(/fonts\.g/,r=>r.abort());
  await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
  await p.goto(URL0);await p.waitForTimeout(3500);
  // eğitim sürerken satış bölümü yok
  const tut=await p.evaluate(async()=>{const st=await import("/src/state.js"),ac=await import("/src/actions.js"),S=st.S;S.money=5e6;S.won=true;S.win1=1;S.evCool=999;
    S.sel={id:null,lat:38.1,lon:32.6};ac.buyLand();(await import("/src/ui/panel.js")).renderPanel();return !!document.querySelector("#panel details.sell");});
  ok(!tut,"eğitim sürerken 'Sahayı sat' görünmez");
  // eğitim bitti; aynı sahada izinli, iki GES bloğu (biri kredili), 7 gün işletme
  const setup=await p.evaluate(async()=>{const st=await import("/src/state.js"),ac=await import("/src/actions.js"),sim=await import("/src/sim.js"),S=st.S;
    S.mi=9;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1});S.desk={ratio:1,fc:"std",batt:"arb",auto:true};
    const id=S.sel.id;S.sites[id].permit="ok";ac.build(id,"ges","std");ac.build(id,"ges","std",true);
    for(let d=0;d<7;d++){for(let h=0;h<24;h++)sim.tick();document.querySelectorAll("dialog[open]").forEach(x=>x.close());}
    S.sel={id,lat:S.sites[id].lat,lon:S.sites[id].lon};return {id,loans:S.loans.filter(L=>L.t===id).length};});
  ok(setup.loans===1,"kredili blok kuruldu");
  await p.click("#pauseBtn");
  await p.evaluate(async()=>{document.querySelectorAll("dialog[open]").forEach(x=>x.close());const s=await import("/src/ui/sheet.js");s.openSheet("saha");(await import("/src/ui/panel.js")).renderPanel();});
  await p.waitForTimeout(500);
  const d0=await p.evaluate(()=>{const d=document.querySelector("#panel details.sell");return d?{open:d.open}:null;});
  ok(d0&&!d0.open,"izinli sahada 'Sahayı sat' kutusu var, kapalı geliyor");
  await p.evaluate(()=>document.querySelector("#panel details.sell summary").scrollIntoView({block:"center"}));
  await p.click("#panel details.sell summary");await p.waitForTimeout(200);
  const f=await p.evaluate(async id=>{const sa=await import("/src/sale.js"),u=await import("/src/utils.js"),f=sa.saleOffer(id),d=document.querySelector("#panel details.sell");
    return {...f,items:f.items.map(x=>({how:x.how,v:x.v,book:x.book})),txt:d.textContent,price$:u.fmt$(f.price),net$:u.fmt$(f.net),debt$:u.fmt$(f.debt),
      over:document.getElementById("panel").scrollWidth-document.getElementById("panel").clientWidth};},setup.id);
  ok(f.items.every(x=>x.how==="income"||x.how==="cap"),`7 gün sonra gelir yöntemi uygulanıyor (${f.items.map(x=>x.how).join(",")})`);
  const sum=f.landV+f.items.reduce((a,x)=>a+x.v,0);
  ok(Math.abs(sum-f.gross)<1&&Math.abs(f.fee-f.gross*0.05)<1&&f.price===Math.round((f.gross-f.fee)/100)*100,"toplam, %5 masraf ve bedel tutarlı");
  ok(Math.abs(f.net-(f.price-f.debt))<1&&f.debt>0,"nakde geçecek = bedel − kalan kredi");
  ok(f.txt.includes(f.price$)&&f.txt.includes(f.debt$)&&f.txt.includes(f.net$),"dökümde bedel, kredi ve nakde geçecek tutar yazıyor");
  ok(f.over<=0,`panelde yatay taşma yok (${f.over}px)`);
  await p.evaluate(async()=>(await import("/src/ui/panel.js")).renderPanel());
  ok(await p.evaluate(()=>document.querySelector("#panel details.sell").open),"yeniden çizimde kutu açık kalıyor");
  if(SHOT){await p.evaluate(()=>document.querySelector("#panel details.sell").scrollIntoView({block:"start"}));await p.waitForTimeout(300);await p.screenshot({path:`${SHOT}/sell-${vp.width}.png`});}
  // vazgeç
  await p.click('#panel [data-a="sell"]');await p.waitForTimeout(200);
  ok(await p.evaluate(()=>document.getElementById("confirmDlg").open),"onay penceresi açıldı");
  await p.click('#confirmDlg [data-v="0"]');await p.waitForTimeout(200);
  ok(await p.evaluate(async id=>!!(await import("/src/state.js")).S.sites[id],setup.id),"vazgeçince saha duruyor");
  // sat
  const before=await p.evaluate(async()=>{const sim=await import("/src/sim.js"),st=await import("/src/state.js");return {nw:sim.netWorth(),money:st.S.money,n:Object.keys(st.S.sites).length};});
  await p.click('#panel [data-a="sell"]');await p.waitForTimeout(200);await p.click('#confirmDlg [data-v="1"]');await p.waitForTimeout(400);
  const after=await p.evaluate(async id=>{const sim=await import("/src/sim.js"),st=await import("/src/state.js"),S=st.S;
    return {nw:sim.netWorth(),money:S.money,site:!!S.sites[id],plants:S.plants.filter(x=>x.t===id).length,loans:(S.loans||[]).filter(L=>L.t===id).length,sold:S.stats.sold,
      log:S.log.slice(0,3).join(" | "),toast:[...document.querySelectorAll(".toast b")].map(x=>x.textContent).join(","),sel:S.sel.id};},setup.id);
  ok(!after.site&&after.plants===0&&after.loans===0,"saha, santralleri ve kredisi portföyden çıktı");
  ok(Math.abs(after.money-before.money-f.net)<1,`nakit ${Math.round(f.net)} arttı`);
  ok(Math.abs(after.nw-before.nw-f.gain)<1,`portföy değeri satış kârı/zararı kadar değişti (${Math.round(f.gain)})`);
  ok(after.sold===1&&after.sel===null,"istatistik güncel, seçim kaldırıldı");
  ok(/satıldı/.test(after.toast+after.log),"bildirim ve kayıt");
  // santralsiz arazi teklifi ve nakit yetmezse düğme kapalı
  const raw=await p.evaluate(async()=>{const st=await import("/src/state.js"),ac=await import("/src/actions.js"),sa=await import("/src/sale.js"),ru=await import("/src/rules.js"),S=st.S;
    S.sel={id:null,lat:37.3,lon:33.3};ac.buyLand();const id=S.sel.id,o=S.sites[id],f=sa.saleOffer(id);
    const r1={price:f.price,exp:Math.round(ru.landCost(o)*sa.SALE.raw*(1-sa.SALE.fee)/100)*100};
    o.permit="ok";const f2=sa.saleOffer(id);r1.rtb=f2.price;r1.rtbExp=Math.round(ru.landCost(o)*sa.SALE.rtb*(1-sa.SALE.fee)/100)*100;
    ac.build(id,"ges","std",true);const L=S.loans.find(x=>x.t===id);L.bal=1e7;S.money=1000;(await import("/src/ui/panel.js")).renderPanel();
    const btn=document.querySelector('#panel [data-a="sell"]');r1.dis=btn&&btn.disabled;r1.msg=/yetmiyor/.test(document.querySelector("#panel details.sell").textContent);return r1;});
  ok(raw.price===raw.exp,`izinsiz arazi: arazi bedelinin %85'i − masraf (${raw.price})`);
  ok(raw.rtb===raw.rtbExp,`izinli, inşaata hazır arazi: 1,2 katı − masraf (${raw.rtb})`);
  ok(raw.dis&&raw.msg,"nakit krediyi kapatmaya yetmiyorsa düğme kapalı ve açıklama var");
  ok(errs.length===0,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));await p.close();}
await b.close();console.log(fails?`\n${fails} denetim başarısız`:"\nTüm denetimler geçti");process.exit(fails?1:0);})();
