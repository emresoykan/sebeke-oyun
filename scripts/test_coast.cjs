// Türkiye çevresinde ayrıntılı kıyı (src/coasttr.js). Sınanan: kaba kıyının (1:50m) deniz dediği ama ayrıntılı kıyıya göre
// kara olan noktaların kara sayılması (deniz GES kurulamaz), kıyı şeridinde (1 km) saha açılamaması (izinli teknoloji yok,
// arazi alınamıyor, panel nedeni yazıyor), açıktaki noktada deniz GES'i ve kıyıya uzaklığın ayrıntılı kıyıdan gelmesi,
// kutu dışının (Kuzey Denizi, İspanya) değişmemesi, eski kayıtta yanlış tarafta kalan deniz sahasının denize, kıyı
// şeridindeki kara sahasının içeriye ve rakip sahasının taşınması (santraller korunur, kayıt notu), describe hızı.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_coast.cjs http://localhost:5182/sebeke-oyun/
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
  const st=await imp("state.js"),w=await imp("world.js"),ru=await imp("rules.js"),ac=await imp("actions.js"),ct=await imp("coasttr.js"),pn=await imp("ui/panel.js"),S=st.S,out={};
  S.money=1e10;S.won=true;S.win1=1;S.evCool=1e9;S.mi=99;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1,repReady:1});
  // 1) Kırklareli ve Türkiye kıyısında kaba kıyının deniz, ayrıntılının kara dediği noktalar
  const scan=(a0,a1,o0,o1,st,max)=>{const L=[];for(let la=a0;la<=a1&&L.length<max;la+=st)for(let lo=o0;lo<=o1&&L.length<max;lo+=st)
    if(w.countryAt(lo,la)===null&&ct.landTR(lo,la)===true&&ct.coastKmTR(lo,la,3)>=1.2)L.push([la,lo]);return L;};
  const kir=scan(41.6,42.1,27.8,28.4,0.004,50),mis=kir.length?kir:scan(36.0,42.2,26.0,41.8,0.013,400),kk=mis[0];out.kir=kir.length;
  const tk=w.describe(kk[0],kk[1]);out.mis={n:mis.length,pt:kk,sea:tk.sea,mreg:tk.mreg,spv:ru.allowed(tk).includes("spv"),ges:ru.allowed(tk).includes("ges")};
  // 2) kıyı şeridi: Kırklareli kıyısı (41,9 K 28,0 D)
  const ts=w.describe(41.9,28.0);out.shore={shore:!!ts.shore,km:ct.coastKmTR(28.0,41.9),allowed:ru.allowed(ts).length};
  S.sel={id:null,lat:41.9,lon:28.0};const m0=S.money,n0=Object.keys(S.sites).length;ac.buyLand();out.shore.bought=Object.keys(S.sites).length-n0;out.shore.paid=m0-S.money;
  pn.renderPanel();out.shore.panel=document.getElementById("panel").innerText.includes("Kıyı şeridi");
  // 3) açıkta: deniz GES'i, kıyıya uzaklık ayrıntılı kıyıdan
  const to=w.describe(41.85,28.08);out.off={sea:to.sea,shore:!!to.shore,coastKm:to.coastKm,ck:ct.coastKmTR(28.08,41.85),spv:ru.allowed(to).includes("spv")};
  // 4) kutu dışı değişmedi
  const n1=w.describe(54.2,7.9),e1=w.describe(39.5,-3.5);out.out={ns:n1.sea&&n1.shallow&&!n1.shore,es:!e1.sea&&!e1.shore,inTR:ct.inTR(7.9,54.2)};
  // 5) eski kayıt: karadaki deniz GES'i, şeritteki kara GES'i, şeritteki rakip sahası
  const old={...st.fresh(),coastV:undefined,dayNo:30,
    sites:{s1:{...w.describe(kk[0],kk[1]),sea:true,shallow:true,coastKm:1,mreg:"T",reg:null,permit:"ok"},s2:{...w.describe(41.9,28.0),sea:false,shore:undefined,permit:"ok"}},
    plants:[{t:"s1",k:"spv",q:"std",mw:5,soc:0,cost:1},{t:"s2",k:"ges",q:"std",mw:5,soc:0,cost:1}],
    rivals:{r1:{cash:0,sites:[{lat:41.9,lon:28.0,k:"ges",mw:20,city:"X",country:"Türkiye",mreg:"T",day:1}]}}};
  localStorage.setItem("sebeke-world-v3",JSON.stringify(old));const L=st.load();
  const a=L.sites.s1,c=L.sites.s2,rv=L.rivals.r1.sites[0];
  out.mig={s1:[a.lat,a.lon],s1Land:ct.landTR(a.lon,a.lat),s1Km:ct.coastKmTR(a.lon,a.lat),s1Coast:a.coastKm,s2Land:ct.landTR(c.lon,c.lat),s2Km:ct.coastKmTR(c.lon,c.lat),
    rvLand:ct.landTR(rv.lon,rv.lat),rvKm:ct.coastKmTR(rv.lon,rv.lat),plants:L.plants.length,log:(L.log||[]).some(l=>/ayrıntılı kıyı verisine geçti/.test(l)),v:L.coastV};
  out.migOk=out.mig.s1Land===false&&out.mig.s1Km>=1.2&&out.mig.s2Land===true&&out.mig.s2Km>=1.2&&out.mig.rvLand===true&&out.mig.rvKm>=1.2&&out.mig.plants===2&&out.mig.log&&out.mig.v===1;
  // 6) hız: 2000 describe (Türkiye kıyısı çevresinde)
  const t0=performance.now();for(let i=0;i<2000;i++)w.describe(40+Math.random()*2,26+Math.random()*4);out.ms=performance.now()-t0;
  return out;},u);
const f2=x=>x==null?"–":(+x).toFixed(2);
ok(r.mis.n>0&&!r.mis.sea&&r.mis.mreg==="T"&&!r.mis.spv&&r.mis.ges,`kaba kıyının denize düşürdüğü kara: ${r.kir?`Kırklareli kıyısında ${r.kir}`:`Türkiye kıyısında ${r.mis.n}`} nokta; örnek ${r.mis.pt.map(f2).join(", ")} artık kara (GES var, deniz GES'i yok)`);
ok(r.shore.shore&&r.shore.allowed===0&&r.shore.bought===0&&r.shore.paid===0&&r.shore.panel,`kıyı şeridi (kıyıya ${f2(r.shore.km)} km): teknoloji yok, arazi alınamıyor, panel nedeni yazıyor`);
ok(r.off.sea&&!r.off.shore&&r.off.spv&&Math.abs(r.off.coastKm-r.off.ck)<0.06,`açıkta deniz GES'i; kıyıya uzaklık ayrıntılı kıyıdan (${r.off.coastKm} km)`);
ok(r.out.ns&&r.out.es&&!r.out.inTR,"kutu dışı değişmedi (Kuzey Denizi, İspanya)");
ok(r.migOk,`eski kayıt: deniz sahası denize (${r.mig.s1.map(f2).join(", ")}, kıyıya ${f2(r.mig.s1Km)} km), kara sahası içeriye (${f2(r.mig.s2Km)} km), rakip sahası taşındı; santraller korundu, not düşüldü`);
ok(r.ms<1500,`2000 describe ${Math.round(r.ms)} ms`);
ok(!errs.length,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));
await b.close();console.log(fails?`\n${fails} başarısız`:"\nhepsi geçti");process.exit(fails?1:0);})();
