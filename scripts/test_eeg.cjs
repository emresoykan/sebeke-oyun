// Almanya piyasa primi (src/support.js EEG). Sınanan: Almanya'daki GES ve kara RES'in ilk blokta hak alması (ödül değeri,
// süre); Fransa (Avrupa), İspanya (İberya), Türkiye ve Almanya offshore'unun almaması; uygun üretimin saat saat birikmesi
// (başlangıç desteği sürerken ve süresi dolunca birikmez); ay değişince primin max(0, ödül − piyasa değeri) × uygun üretim
// olarak ödenmesi, proje gelirine (ac) katılması ve raporda satır; ayın piyasa değerinin Avrupa piyasasının saatlik
// fiyatlarının güneş profili ve rüzgâr filosuyla ağırlıklı ortalaması olması (gerçek ay geçişinde bağımsız hesapla); eski
// kayıtta hakkın bugünden başlaması; proje ekonomisinde primin ilk 20 yıl eklenmesi ve fiyat stresinde artması; panel
// notları, sözlük, kayıt.
// Kullanım: npx vite --port 5183 &  sonra  node scripts/test_eeg.cjs http://localhost:5183/sebeke-oyun/
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
  const days=Math.round(20*ln.ECON_YEAR),aw=Math.round(47.9*sp.FX.eur*10)/10;
  // başlangıç desteği (alım garantisi) kimseye verilmez (aşağıda ayrıca sınanır); Almanya'da GES ve RES, Fransa'da GES,
  // İspanya'da GES, Almanya'nın Kuzey Denizi kıyısında offshore; Türkiye'deki GES sahası için yalnızca hak hesabı
  S.fitDone=1;
  const mk=(id,la,lo,k)=>{S.sites[id]={...w.describe(la,lo),permit:"ok"};ac.build(id,k,"std");return S.plants.find(q=>q.t===id&&q.k===k);};
  const trT=w.describe(37.9,32.5),dg=mk("DG",52.3,13.9,"ges"),dw=mk("DW",53.8,9.5,"res"),fr=mk("FR",46.5,2.5,"ges"),es=mk("ES",39.5,-3.5,"ges"),off=mk("OF",54.2,7.9,"off");
  out.where={T:[trT.a3,trT.mreg],DG:[S.sites.DG.a3,S.sites.DG.mreg],DW:[S.sites.DW.a3,S.sites.DW.mreg],FR:[S.sites.FR.a3,S.sites.FR.mreg],ES:[S.sites.ES.a3,S.sites.ES.mreg],OF:[S.sites.OF.a3,S.sites.OF.mreg]};
  const g=x=>x?x.eeg:"kurulmadı";out.grant={tr:sp.eegGrant(trT,"ges"),dg:g(dg),dw:g(dw),fr:g(fr),es:g(es),off:g(off),aw,days};
  out.grantOk=!!dg&&!!dw&&dg.eeg&&dg.eeg.aw===aw&&dg.eeg.until-S.dayNo===days&&dw.eeg&&dw.eeg.aw===aw&&out.grant.tr===null&&fr&&fr.eeg===null&&es&&es.eeg===null&&off&&off.eeg==null&&sp.EEG.ges.aw===53.6;
  // panel notları: Almanya GES sekmesinde prim, Fransa'da "tanımlı değil"
  const tab=(id,k)=>{S.sel={id,lat:S.sites[id].lat,lon:S.sites[id].lon};pn.renderPanel();const bt=document.querySelector(`#panel button[data-a="tab"][data-k="${k}"]`);if(bt)bt.click();return document.getElementById("panel").innerText;};
  const pD=tab("DG","ges");out.panelD=pD.includes("Piyasa primi (Almanya):")&&pD.includes("ödül değeri 53,6 $/MWh")&&pD.includes("Piyasa primi: GES");
  const pF=tab("FR","ges");out.panelF=pF;out.panelDt=pD.split("\n").filter(l=>l.includes("rim")).join("\n");
  // bir gün: Almanya GES'te biriken uygun üretim = gün içindeki üretim (negatif fiyatlı saatte üretim yok); başlangıç desteği
  // (alım garantisi) sahası Türkiye'de olduğu için birikir; Almanya sahasına alım garantisi verilirse birikmez
  const day=()=>{S.hour=0;sim.newDay();close();[dg,dw,fr,es,off].forEach(q=>q&&(q.down=false));for(let h=0;h<24;h++){sim.tick();close();}};
  S.sites.DW.fit={p:90,until:S.dayNo+50};
  let tries=0,eg0,e0,ew0;do{eg0=dg.eegE||0;e0=dg.ac?dg.ac.e:0;ew0=dw.eegE||0;
    S.hour=0;sim.newDay();close();[dg,dw].forEach(q=>q.down=false);const P=st.D.E.price.slice();let eNeg=0;
    for(let h=0;h<24;h++){const a=dg.ac?dg.ac.e:0;sim.tick();close();if(P[h]<0)eNeg+=(dg.ac?dg.ac.e:0)-a;}
    out.acc={de:dg.ac.e-e0,dq:(dg.eegE||0)-eg0,eNeg,dw:(dw.eegE||0)-ew0,neg:P.filter(x=>x<0).length};tries++;}while(out.acc.de<=0&&tries<4);
  out.accOk=out.acc.de>0&&near(out.acc.dq,out.acc.de,1e-9)&&out.acc.eNeg===0&&out.acc.dw===0;
  delete S.sites.DW.fit;
  // ay sonu ödemesi (zorla): biten ayın birikimi güneş 40, rüzgâr 70 $/MWh piyasa değeri; GES 1000, RES 500 MWh uygun üretim
  const mo=cal.CAL.date.getUTCFullYear()*12+cal.CAL.date.getUTCMonth();
  S.eeg={mo:mo-1,s:[40*10,10],w:[70*5,5]};dg.eegE=1000;dw.eegE=500;const a0={mp:dg.ac.mp||0,mq:dg.ac.mq||0,mv:dg.ac.mv||0,r:dg.ac.r},w0={mp:dw.ac?dw.ac.mp||0:0},m0=S.money;
  S.hour=0;sim.newDay();close();const expG=1000*(aw-40);
  out.pay={mp:st.D.st.mp,expG,dmp:dg.ac.mp-a0.mp,dmq:dg.ac.mq-a0.mq,dmv:dg.ac.mv-a0.mv,dr:dg.ac.r-a0.r,dw:(dw.ac.mp||0)-w0.mp,dwq:dw.ac.mq,reset:[dg.eegE,dw.eegE],last:S.eegLast,newMo:S.eeg.mo===mo,log:(S.log||[]).slice(0,3).map(x=>typeof x==="string"?x:x.m||x.t||JSON.stringify(x)).join(" | ")};
  out.payOk=near(st.D.st.mp,expG,1e-9)&&near(out.pay.dmp,expG,1e-9)&&out.pay.dmq===1000&&near(out.pay.dmv,40000,1e-9)&&near(out.pay.dr,expG,1e-9)&&out.pay.dw===0&&out.pay.dwq===500&&dg.eegE===0&&dw.eegE===0&&S.eegLast.mo===mo-1&&near(S.eegLast.mv.ges,40)&&out.pay.newMo;
  out.logOk=out.pay.log.includes("Piyasa primi (Almanya)")&&out.pay.log.includes("güneşin piyasa değeri 40 $/MWh");
  for(let h=0;h<24;h++){sim.tick();close();}
  out.last=S.last.mp;out.report=((document.getElementById("report")||{}).innerText||"").includes("Piyasa primi");
  // gerçek ay geçişi: ayın başından itibaren günlük fiyatlarla bağımsız birikim; ay değişince ödenen piyasa değeri bununla aynı
  let gs=0,gd=0,ws=0,wd=0,n=0,paid=null;const mo1=S.eeg.mo;
  // önceki günlerin birikimi (bu ay içinde zaten geçen günler) testin bağımsız toplamına baştan katılır
  gs=S.eeg.s[0];gd=S.eeg.s[1];ws=S.eeg.w[0];wd=S.eeg.w[1];
  for(let d=0;d<14&&!paid;d++){S.hour=0;sim.newDay();close();if(S.eegLast&&S.eegLast.mo===mo1){paid={...S.eegLast,mp:st.D.st.mp};break;}
    [dg,dw].forEach(q=>q.down=false);const M=st.D.E;M.price.forEach((x,h)=>{const s=M.sunP[h]||0,f=M.fleet?M.fleet[h]||0:1;gs+=x*s;gd+=s;ws+=x*f;wd+=f;});n++;
    for(let h=0;h<24;h++){sim.tick();close();}}
  out.month={n,paid,ges:gd>0?gs/gd:null,res:wd>0?ws/wd:null,avg:null};
  out.monthOk=!!paid&&near(paid.mv.ges,out.month.ges,1e-9)&&near(paid.mv.res,out.month.res,1e-9);
  // süresi dolunca birikmez
  const keep=dg.eeg;dg.eeg={...keep,until:S.dayNo-1};const q0=dg.eegE||0;day();out.expired=(dg.eegE||0)-q0;dg.eeg=keep;
  // eski kayıt: hakkı belirlenmemiş Almanya santrali bugünden başlar
  delete dw.eeg;S.hour=0;sim.newDay();close();out.migr=dw.eeg&&dw.eeg.aw===aw&&dw.eeg.until-S.dayNo===days;
  // proje ekonomisi: prim gösterilir, ilk 20 yıl eklenir; fiyat stresinde prim artar (stresli spot IRR destekli > desteksiz)
  fin.setWacc(0.10);const f1=fin.plantFinance(dg),a=dg.ac,mvA=a.mv/a.mq,mpE=a.mp/a.mq;
  out.fin={prem:f1.prem,exp:Math.max(mpE,aw-mvA),price:f1.price,irr:f1.irr};
  const s1=fin.projectFinance(dg,"spot","E",0.2),eg=dg.eeg;dg.eeg=null;const f0=fin.plantFinance(dg),s0=fin.projectFinance(dg,"spot","E",0.2);dg.eeg=eg;
  out.fin.irr0=f0.irr;out.fin.eq1=s1.eqIrr;out.fin.eq0=s0.eqIrr;out.fin.prem0=f0.prem;
  out.finOk=near(f1.prem,out.fin.exp,1e-9)&&f0.prem==null&&near(f0.price,f1.price,1e-9)&&(f1.irr==null||f0.irr==null||f1.irr>=f0.irr)&&(s1.eqIrr==null||s0.eqIrr==null||s1.eqIrr>s0.eqIrr);
  out.gloss=gl.TERMS.some(t=>t.k==="piyasaprimi");
  st.save();out.saved=Object.keys(localStorage).some(k=>(localStorage.getItem(k)||"").includes('"eeg":{"aw":53.6'));
  return out;},u);
const f1=x=>x==null?"–":x.toFixed(1),pc=x=>x==null?"–":(x*100).toFixed(1)+"%";
console.log("  · sahalar:",JSON.stringify(r.where));
ok(r.grantOk,`Almanya GES ve RES hak aldı (${r.grant.aw} $/MWh, ${r.grant.days} gün); Türkiye, Fransa, İspanya ve offshore almadı`+(r.grantOk?"":" "+JSON.stringify(r.grant)));
ok(r.panelD&&r.panelF.includes("desteği tanımlı değil"),"panel notları: Almanya'da prim, Fransa'da tanımlı değil"+(r.panelD?"":"\n"+r.panelDt));
ok(r.accOk,`bir gün: uygun üretim = üretim (${f1(r.acc.dq)} MWh; negatif saat ${r.acc.neg}, o saatlerde üretim ${f1(r.acc.eNeg)}); alım garantili sahada birikim ${f1(r.acc.dw)}`);
ok(r.payOk,`ay sonu: GES 1000 MWh × (${r.grant.aw} − 40) = ${f1(r.pay.expG)} $ ödendi (${f1(r.pay.mp)}), proje gelirine katıldı; RES piyasa değeri 70 > ödül: prim yok`+(r.payOk?"":" "+JSON.stringify(r.pay)));
ok(r.logOk,"ödeme günlükte: "+r.pay.log.slice(0,160));
ok(r.last>0&&r.report,`günlük raporda piyasa primi satırı (${f1(r.last)} $)`);
ok(r.monthOk,`gerçek ay geçişi (${r.month.n} gün): piyasa değeri güneş ${f1(r.month.paid&&r.month.paid.mv.ges)} / bağımsız ${f1(r.month.ges)}, rüzgâr ${f1(r.month.paid&&r.month.paid.mv.res)} / ${f1(r.month.res)} $/MWh; prim ${f1(r.month.paid&&r.month.paid.mp)} $`);
ok(r.expired===0,"süresi dolunca birikmiyor");
ok(r.migr,"eski kayıtta hak bugünden başlıyor");
ok(r.finOk,`proje ekonomisi: prim ${f1(r.fin.prem)} $/MWh (beklenen ${f1(r.fin.exp)}), piyasa fiyatı ${f1(r.fin.price)}; IRR destekli ${pc(r.fin.irr)}, desteksiz ${pc(r.fin.irr0)}; stres −%20 özsermaye IRR ${pc(r.fin.eq1)} / ${pc(r.fin.eq0)}`);
ok(r.gloss,"sözlükte piyasa primi");
ok(r.saved,"hak kayda yazılıyor");
ok(!errs.length,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));
await b.close();console.log(fails?`\n${fails} başarısız`:"\nhepsi geçti");process.exit(fails?1:0);})();
