// Fransa tamamlayıcı ödemesi ve İtalya FER X (src/support.js PREM.FRA, FERX). Sınanan: katılımın isteğe bağlı olması (panel
// düğmesi, ilk bloktan sonra değişmez); katılan santralin hakkı (tarif, süre, iki yönlü), katılmayanın almaması; Fransa'da ay
// sonunda üretim × (tarif − piyasa değeri), piyasa değeri tarifin üstündeyse geri ödeme; İtalya'da saatlik fark (referans
// sıfırın altına inmez), alım garantisi sürerken uzlaştırma yok; Fransa ve İtalya piyasa değeri birikimleri; eski kayıttaki
// tek birikimin Avrupa'ya taşınması; proje ekonomisi; sözlük.
// Kullanım: npx vite --port 5183 &  sonra  node scripts/test_frit.cjs http://localhost:5183/sebeke-oyun/
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5183/sebeke-oyun/";let fails=0;
const ok=(c,m)=>{console.log((c?"  ✓ ":"  ✗ ")+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const p=await b.newPage({viewport:{width:1366,height:900}});const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
await p.route(/fonts\.g|tile|arcgis|maptiler|openstreetmap|openfreemap|cartocdn|amazonaws/,r=>r.abort());
await p.goto(URL0);await p.waitForTimeout(4000);
const u=await p.evaluate(()=>performance.getEntriesByType("resource").map(e=>e.name).filter(n=>/\/src\/[\w/]+\.js/.test(n)));
const r=await p.evaluate(async(u)=>{const imp=n=>import(u.find(x=>new URL(x).pathname.endsWith("/src/"+n))||("/src/"+n));
  document.querySelectorAll("dialog[open]").forEach(d=>d.close());
  const st=await imp("state.js"),w=await imp("world.js"),ac=await imp("actions.js"),sim=await imp("sim.js"),sp=await imp("support.js"),fin=await imp("finance.js"),
    ln=await imp("loans.js"),pn=await imp("ui/panel.js"),gl=await imp("glossary.js"),cal=await imp("calendar.js"),S=st.S,out={};
  S.money=1e10;S.won=true;S.win1=1;S.evCool=1e9;S.mi=99;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1,repReady:1});
  const close=()=>document.querySelectorAll("dialog[open]").forEach(d=>d.close());
  const near=(a,b,e=1e-6)=>Math.abs(a-b)<=e*Math.max(1,Math.abs(b));
  const days=Math.round(20*ln.ECON_YEAR);S.fitDone=1;
  const site=(id,la,lo)=>{S.sites[id]={...w.describe(la,lo),permit:"ok"};return S.sites[id];};
  const tab=(id,k)=>{S.sel={id,lat:S.sites[id].lat,lon:S.sites[id].lon};pn.renderPanel();const bt=document.querySelector(`#panel button[data-a="tab"][data-k="${k}"]`);if(bt)bt.click();return document.getElementById("panel").innerText;};
  const join=(id,k)=>{tab(id,k);const bt=document.querySelector(`#panel button[data-a="supJ"][data-k="${k}"]`);if(bt)bt.click();return !!bt;};
  const build=(id,k)=>{ac.build(id,k,"std");return S.plants.find(q=>q.t===id&&q.k===k);};
  site("FG",44.0,4.6);site("FW",49.6,2.8);site("FN",46.5,2.5);site("IG",41.0,16.2);site("IW",40.9,15.4);site("IF",41.3,16.0);
  out.where=Object.fromEntries(["FG","FW","FN","IG","IW","IF"].map(i=>[i,[S.sites[i].a3,S.sites[i].mreg]]));
  // panel: katılım seçilmeden "Katılmıyorsun", düğmeyle "Katılıyorsun"
  const p0=tab("FG","ges");out.p0=p0.includes("Tamamlayıcı ödeme (Fransa)")&&p0.includes("Katılmıyorsun")&&p0.includes("88,8 $/MWh");
  out.btn=join("FG","ges");const p1=document.getElementById("panel").innerText;out.p1=p1.includes("Katılıyorsun");
  join("FW","res");join("IG","ges");join("IF","ges");
  const pi=tab("IW","res");out.pi=pi.includes("Fark sözleşmesi (FER X, İtalya)")&&pi.includes("81,6 $/MWh")&&pi.includes("Katılmıyorsun");
  window.__w=out.where;const fg=build("FG","ges"),fw=build("FW","res"),fn=build("FN","ges"),ig=build("IG","ges"),iw=build("IW","res"),iF=build("IF","ges");
  out.grant={fg:fg.eeg,fw:fw.eeg,fn:fn.eeg,ig:ig.cfd,iw:iw.cfd,igE:ig.eeg,fgC:fg.cfd};
  out.grantOk=fg.eeg&&fg.eeg.aw===88.8&&fg.eeg.two===1&&fg.eeg.m==="R"&&fg.eeg.until-S.dayNo===days&&fw.eeg&&fw.eeg.aw===86.3&&fw.eeg.two===1&&fn.eeg===null&&
    ig.cfd&&ig.cfd.p===63.6&&ig.cfd.z===1&&ig.cfd.until-S.dayNo===days&&iw.cfd===null&&ig.eeg===null&&!fg.cfd;
  // ilk bloktan sonra katılım değişmez, düğme yok
  out.locked=sp.supToggle("FG","ges")===false&&!tab("FG","ges").includes("Katılımı geri al")&&!document.querySelector('#panel button[data-a="supJ"]');
  const ps=tab("FG","ges");out.status=ps.includes("Tamamlayıcı ödeme: GES")&&ps.includes("tarif 88,8");
  // İtalya: bir gün saat saat fark = üretim × (63,6 − max(0, fiyat)); alım garantili sahada uzlaştırma yok
  S.sites.IF.fit={p:90,until:S.dayNo+50};
  const all=[fg,fw,fn,ig,iw,iF];let tries=0,exp=0,got=0,de=0,fitCf=0,s0;
  do{exp=0;got=0;de=0;S.hour=0;sim.newDay();close();all.forEach(q=>q.down=false);const P=st.D.L.price.slice();s0={R:S.eeg.R.s[1],L:S.eeg.L.s[1]};
    const f0=iF.ac?iF.ac.cf||0:0;
    for(let h=0;h<24;h++){const a=ig.ac?ig.ac.e:0,c=ig.ac?ig.ac.cf||0:0;sim.tick();close();const d=(ig.ac?ig.ac.e:0)-a;de+=d;exp+=d*(63.6-Math.max(0,P[h]));got+=(ig.ac?ig.ac.cf||0:0)-c;}
    fitCf=(iF.ac?iF.ac.cf||0:0)-f0;tries++;}while(de<=0&&tries<4);
  out.it={de,exp,got,fitCf,neg:st.D.L.price.filter(x=>x<0).length};
  out.itOk=de>0&&near(got,exp,1e-9)&&fitCf===0;
  out.accum={R:S.eeg.R.s[1]>s0.R,L:S.eeg.L.s[1]>s0.L,fgE:fg.eegE>0,fnE:!(fn.eegE>0)};
  delete S.sites.IF.fit;
  // Fransa ay sonu (zorla): güneşin piyasa değeri 40 (tarifin altında: ödeme), rüzgârın 100 (üstünde: geri ödeme)
  const mo=cal.CAL.date.getUTCFullYear()*12+cal.CAL.date.getUTCMonth(),z=(s,wv)=>({mo:mo-1,s:[s*10,10],w:[wv*5,5]});
  S.eeg={E:z(50,50),R:z(40,100),L:z(90,90)};fg.eegE=1000;fw.eegE=500;
  const a0={g:fg.ac.mp||0,w:fw.ac?fw.ac.mp||0:0},m0=S.money;S.hour=0;sim.newDay();close();
  const xg=1000*(88.8-40),xw=500*(86.3-100);
  out.pay={mp:st.D.st.mp,xg,xw,dg:fg.ac.mp-a0.g,dw:(fw.ac.mp||0)-a0.w,last:S.eegLast.R,log:(S.log||[]).slice(0,4).map(x=>typeof x==="string"?x:x.m||x.t||JSON.stringify(x)).join(" | ")};
  out.payOk=near(out.pay.dg,xg,1e-9)&&near(out.pay.dw,xw,1e-9)&&near(st.D.st.mp,xg+xw,1e-9)&&S.eegLast.R.mo===mo-1&&near(S.eegLast.R.mv.res,100)&&S.eeg.R.mo===mo;
  out.logOk=out.pay.log.includes("Tamamlayıcı ödeme (Fransa)")&&out.pay.log.includes("rüzgârın piyasa değeri 100 $/MWh");
  // eski kayıt: tek birikim (Avrupa) {mo,s,w} → S.eeg.E
  S.eeg={mo:mo,s:[7,1],w:[8,1]};S.eegLast={mo:mo-1,mv:{ges:1,res:2}};sp.eegDay(st.D.R,"R");
  out.migr=S.eeg.E&&S.eeg.E.s[0]>=7&&S.eeg.R&&S.eeg.R.s[1]>0&&S.eegLast.E&&S.eegLast.E.mv.res===2;
  // proje ekonomisi: Fransa iki yönlü (prim = tarif − ortalama piyasa değeri, eksi olabilir); İtalya sözleşme fiyatı
  for(let d=0;d<12;d++){S.hour=0;sim.newDay();close();all.forEach(q=>q.down=false);for(let h=0;h<24;h++){sim.tick();close();}}
  fg.ac.mq=fg.ac.mq||1;fg.ac.mv=fg.ac.mv||40;fw.ac.mq=fw.ac.mq||1;fw.ac.mv=fw.ac.mv||100;
  const f1=fin.plantFinance(fg),a=fg.ac,mvA=a.mv/a.mq,fi=fin.plantFinance(ig),fw1=fin.plantFinance(fw);
  out.fin={prem:f1.prem,exp:88.8-mvA,strike:fi.strike,fw:fw1.prem};
  out.finOk=near(f1.prem,out.fin.exp,1e-9)&&fi.strike===63.6&&fw1.prem<0;
  out.gloss=gl.TERMS.some(t=>t.k==="tamamlayici")&&gl.TERMS.some(t=>t.k==="cfd"&&/FER X/.test(t.g));
  st.save();out.saved=Object.keys(localStorage).some(k=>{const v=localStorage.getItem(k)||"";return v.includes('"supJ":{"ges":1}')&&v.includes('"two":1');});
  return out;},u);
const f1=x=>x==null?"–":x.toFixed(1);
console.log("  · sahalar:",JSON.stringify(r.where));
ok(r.p0&&r.btn&&r.p1&&r.pi,"panel: Fransa ve İtalya'da katılım seçimi (varsayılan katılmıyor; düğmeyle katılıyor)");
ok(r.grantOk,"katılan Fransa GES (88,8) ve RES (86,3) iki yönlü prim, İtalya GES 63,6 $/MWh FER X aldı; katılmayanlar almadı"+(r.grantOk?"":" "+JSON.stringify(r.grant)));
ok(r.locked&&r.status,"ilk bloktan sonra katılım değişmiyor; saha durumunda tamamlayıcı ödeme");
ok(r.itOk,`İtalya bir gün: fark ${f1(r.it.got)} $ = üretim ${f1(r.it.de)} MWh × (63,6 − fiyat) (${f1(r.it.exp)}); alım garantili sahada ${f1(r.it.fitCf)}`);
ok(r.accum.R&&r.accum.L&&r.accum.fgE&&r.accum.fnE,"Fransa ve İtalya piyasa değeri birikiyor; yalnızca katılan Fransa santralinde uygun üretim");
ok(r.payOk,`Fransa ay sonu: GES 1000 × (88,8 − 40) = ${f1(r.pay.xg)}, RES 500 × (86,3 − 100) = ${f1(r.pay.xw)} $ (geri ödeme); toplam ${f1(r.pay.mp)}`+(r.payOk?"":" "+JSON.stringify(r.pay)));
ok(r.logOk,"günlükte: "+r.pay.log.slice(0,200));
ok(r.migr,"eski kayıttaki tek birikim Avrupa'ya taşındı");
ok(r.finOk,`proje ekonomisi: Fransa GES prim ${f1(r.fin.prem)} (tarif − ort. piyasa değeri ${f1(r.fin.exp)}), RES ${f1(r.fin.fw)}; İtalya sözleşme ${r.fin.strike}`);
ok(r.gloss,"sözlükte tamamlayıcı ödeme ve FER X");
ok(r.saved,"katılım ve hak kayda yazılıyor");
ok(!errs.length,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));
await b.close();console.log(fails?`\n${fails} başarısız`:"\nhepsi geçti");process.exit(fails?1:0);})();
