// İflas ekranı: "Yeni oyun" onay sormadan oyunu sıfırlar ve şirket profilini de siler (kurulum ekranı açılır).
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_lose.cjs http://localhost:5182/sebeke-oyun/
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/";let fails=0;
const ok=(c,m)=>{console.log((c?"  ✓ ":"  ✗ ")+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch();
for(const vp of [{width:1366,height:768},{width:390,height:844}]){
  const m=vp.width<900;console.log(`\n[${vp.width}×${vp.height}]`);
  const p=await b.newPage({viewport:vp,hasTouch:m,isMobile:m});const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
  await p.route(/fonts\.g/,r=>r.abort());
  await p.addInitScript(()=>{if(sessionStorage.getItem("t"))return;sessionStorage.setItem("t","1");localStorage.clear();
    localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
  await p.goto(URL0);await p.waitForTimeout(3500);
  await p.evaluate(async()=>{const st=await import("/src/state.js"),ac=await import("/src/actions.js"),S=st.S;S.sel={id:null,lat:38.1,lon:32.6};ac.buyLand();
    S.over=true;st.save();document.querySelectorAll("dialog[open]").forEach(d=>d.close());(await import("/src/ui/hud.js")).showLose();});
  await p.waitForTimeout(300);
  const t=await p.evaluate(()=>{const d=document.getElementById("winDlg");return {open:d.open,txt:d.textContent};});
  ok(t.open&&/iflas/.test(t.txt),"iflas ekranı açık");ok(/profilini de siler/.test(t.txt),"pencerede profilin silineceği yazıyor");
  await Promise.all([p.waitForNavigation({waitUntil:"load"}),p.click('#winDlg [data-v="new"]')]);await p.waitForTimeout(3000);
  const a=await p.evaluate(async()=>{const st=await import("/src/state.js");return {prof:localStorage.getItem("sebeke-profile-v1"),setup:document.getElementById("profileDlg").open,
    sites:Object.keys(st.S.sites).length,over:!!st.S.over,lose:document.getElementById("winDlg").open};});
  ok(a.prof===null,"şirket profili silindi");ok(a.setup,"kurulum ekranı açıldı");ok(a.sites===0&&!a.over&&!a.lose,"oyun sıfırlandı, iflas ekranı kapandı");
  ok(errs.length===0,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));await p.close();}
await b.close();console.log(fails?`\n${fails} denetim başarısız`:"\nTüm denetimler geçti");process.exit(fails?1:0);})();
