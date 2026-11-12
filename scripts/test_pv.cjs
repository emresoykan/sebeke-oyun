// Güneş üretiminin bulut düzeltmesi (weather.js sunRel/cloudK, data/cloudk.js, config.js PV_K). Sınanan: tablonun bilinen
// noktalardaki değeri (Almanya < 0,8, İspanya ve Konya ~1,03–1,07), çarpanın Konya'yla ölçeklenmesi (Türkiye'nin üretimi
// değişmesin), GES üretiminin saat saat formülle aynı olması (göreli açıklık yerel ortalamaya bölünür), CSP'nin ham açıklığı
// kullanması, saha paneli durumunun üretimle tutarlı olması ve Almanya'da birkaç günlük üretimin düzeltmesiz formülün
// üstünde kalması.
// Kullanım: npx vite --port 5186 &  sonra  node scripts/test_pv.cjs http://localhost:5186/sebeke-oyun/
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5186/sebeke-oyun/";let fails=0;
const ok=(c,m)=>{console.log((c?"  ✓ ":"  ✗ ")+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const p=await b.newPage({viewport:{width:1366,height:900}});const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
await p.route(/fonts\.g|tile|arcgis|maptiler|openstreetmap|openfreemap|cartocdn|amazonaws/,r=>r.abort());
await p.goto(URL0);await p.waitForTimeout(4000);
const u=await p.evaluate(()=>performance.getEntriesByType("resource").map(e=>e.name).filter(n=>/\/src\/[\w/]+\.js/.test(n)));
const r=await p.evaluate(async(u)=>{const imp=n=>import(u.find(x=>new URL(x).pathname.endsWith("/src/"+n))||("/src/"+n));
  document.querySelectorAll("dialog[open]").forEach(d=>d.close());
  const st=await imp("state.js"),w=await imp("world.js"),ac=await imp("actions.js"),sim=await imp("sim.js"),mk=await imp("market.js"),wx=await imp("weather.js"),
    ws=await imp("wxsite.js"),cfg=await imp("config.js"),cal=await imp("calendar.js"),ut=await imp("utils.js"),eq=await imp("equipment.js"),ps=await imp("plantstatus.js"),S=st.S,out={};
  S.money=1e10;S.won=true;S.evCool=1e9;S.fitDone=1;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1,repReady:1});
  const close=()=>document.querySelectorAll("dialog[open]").forEach(d=>d.close());
  out.k={konya:wx.cloudK(37.9,32.5),ispanya:wx.cloudK(39.5,-3.5),brandenburg:wx.cloudK(52.3,13.9),bavyera:wx.cloudK(48.3,11.8),wrap:[wx.cloudK(10,179.9),wx.cloudK(10,-180)]};
  out.pvk={PV_K:cfg.PV_K,exp:1.24*out.k.konya};
  // Almanya'da GES ve CSP (CSP yalnızca formül sınaması için; sahada izinli olması gerekmez)
  S.sites.DG={...w.describe(52.3,13.9),permit:"ok"};ac.build("DG","ges","std");const g=S.plants.find(q=>q.t==="DG");
  S.sites.ES={...w.describe(39.5,-3.5),permit:"ok"};ac.build("ES","ges","std");const es=S.plants.find(q=>q.t==="ES");
  const t=S.sites.DG;out.base={k:ws.siteWx(t,12).base.k,cloud:ws.siteWx(t,12).base.cloud};
  // saat saat: üretim = mw × ışınım × gün eğrisi × öğle yüksekliği × (ham açıklık / k) × PV_K × verim × olay çarpanı
  let bad=0,n=0,stBad=0,raw=0,cor=0;
  for(let d=0;d<4;d++){S.hour=0;if(d)sim.newDay();close();g.down=false;es.down=false;
    for(let h=0;h<24;h++){const W=ws.siteWx(t,h),q=eq.eqOf(g),sn=t.snowDays>0?0.25:1,
        base=g.mw*(t.solar||0)*ut.shape(h)*cal.noonAmp(t.lat,cal.CAL.decl)*q.perf*sn,
        exp=base*wx.sunRelRaw(W,W.base)/W.base.k*cfg.PV_K,e=mk.production(g,h).e;
      if(e>0||exp>0){n++;if(Math.abs(e-exp)>1e-9*Math.max(1,exp))bad++;raw+=base*wx.sunRelRaw(W,W.base)*1.24;cor+=e;}
      // saha paneli durumu: kapasite oranı üretim ÷ güçle aynı (tavan 1)
      S.hour=h;const s=ps.plantStatus("DG");if(s&&s.ges&&!s.ges.down&&Math.abs(s.ges.f-Math.min(1,e/g.mw))>1e-9)stBad++;
      sim.tick();close();}}
  out.hours={n,bad,stBad,ratio:cor/raw};
  // CSP ham açıklığı kullanır (yerel düzeltme yok)
  const fake={t:"ES",k:"csp",q:"std",mw:5};S.hour=12;const W2=ws.siteWx(S.sites.ES,12),q2=eq.eqOf(fake);
  const cExp=fake.mw*cfg.CSP.sm*(S.sites.ES.solar||0)*ut.shape(12)*cal.noonAmp(S.sites.ES.lat,cal.CAL.decl)*wx.sunRelRaw(W2,W2.base)**1.5*q2.perf;
  out.csp={e:mk.cspHeat(fake,12),exp:cExp};
  return out;},u);
const f3=x=>x==null?"–":x.toFixed(3);
ok(r.k.brandenburg<0.8&&r.k.bavyera<0.85&&r.k.ispanya>1&&r.k.ispanya<1.1&&r.k.konya>1&&r.k.konya<1.1&&Math.abs(r.k.wrap[0]-r.k.wrap[1])<0.02,`düzeltme tablosu: Konya ${f3(r.k.konya)}, İspanya ${f3(r.k.ispanya)}, Brandenburg ${f3(r.k.brandenburg)}, Bavyera ${f3(r.k.bavyera)}; boylam çevrimi ${f3(r.k.wrap[0])}/${f3(r.k.wrap[1])}`);
ok(Math.abs(r.pvk.PV_K-r.pvk.exp)<0.002,`üretim çarpanı Konya'yla ölçekli: ${r.pvk.PV_K} (1,24 × ${f3(r.k.konya)} = ${f3(r.pvk.exp)})`);
ok(Math.abs(r.base.k-r.k.brandenburg)<1e-9,`saha tabanı düzeltmeyi taşıyor (k ${f3(r.base.k)})`);
ok(r.hours.n>10&&r.hours.bad===0,`GES üretimi saat saat formülle aynı (${r.hours.n} saat, hata ${r.hours.bad}); Almanya'da üretim düzeltmesiz formülün ${f3(r.hours.ratio)} katı`);
ok(r.hours.ratio>1.3,"Almanya'da üretim düzeltmeyle artıyor (en az %30)");
ok(r.hours.stBad===0,`saha paneli durumu üretimle tutarlı (fark ${r.hours.stBad})`);
ok(Math.abs(r.csp.e-r.csp.exp)<1e-9*Math.max(1,r.csp.exp),`CSP ham açıklığı kullanıyor (${f3(r.csp.e)} = ${f3(r.csp.exp)})`);
ok(!errs.length,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));
await b.close();console.log(fails?`\n${fails} başarısız`:"\nhepsi geçti");process.exit(fails?1:0);})();
