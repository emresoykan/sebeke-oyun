// Simülasyon: günlük fiyat üretimi, saatlik tick, gün sonu kapanışı
import { BASE, EFF, BLOCK, REG, MARKETS, TECH } from "./config.js";
import { placeName } from "./world.js";
import { S, D, setD, save, addLog } from "./state.js";
import { permitProb, rejectWhy, landCost } from "./rules.js";
import { rnd, clamp, shape } from "./utils.js";
import { render, renderReport } from "./ui/hud.js";
import { renderPanel } from "./ui/panel.js";
import { drawMap } from "./ui/map.js";
import { eqOf, eqName } from "./equipment.js";
import { spec, checkAch } from "./profile.js";
import { renderProfileChip } from "./ui/profile.js";
import { factor, salePrice, priceMods, ageMods } from "./mods.js";
import { maybeEvent } from "./events.js";
import { checkMissions } from "./missions.js";
import { dayFx, celebrate, toast } from "./ui/fx.js";
import { initWx, stepWx, forecast, sampleWx, clearFactor, setSeason } from "./weather.js";
import { CAL, setCalendar, noonAmp, demandOf, seasonOf, fmtDate } from "./calendar.js";
import { MREF, siteWx, clock } from "./wxsite.js";
import { RENEW, production, dayAhead, settle, deskSummary } from "./market.js";
import { openDesk } from "./ui/desk.js";

const site=id=>S.sites[id];
const SEASON_NOTE={spr:"Kar erimesiyle HES'lere bol su geliyor, talep düşük: fiyatlar gevşer.",sum:"Uzun günler GES'i parlatıyor; sıcak hava akşam talebini artırır, Ege'de meltem esiyor.",aut:"Günler kısalıyor, yağışlar başlıyor.",win:"Kısa günler GES üretimini düşürür; fırtınalar ve kar artar, rüzgâr güçlenir, ısınma talebi fiyatları yükseltir."};

export function newDay(){
  // takvim ve mevsim: gün uzunluğu, güneş yüksekliği, hava sistemlerinin enlemi ve talep
  const prev=seasonOf(CAL.date);setCalendar(S.dayNo);setSeason(CAL.decl);
  const sn=seasonOf(CAL.date);if(S.dayNo>1&&sn.k!==prev.k&&S.seasonSeen!==sn.k){S.seasonSeen=sn.k;addLog(`${sn.i} ${sn.n} geldi (${fmtDate(CAL.date)}). ${SEASON_NOTE[sn.k]}`);toast(`${sn.i} ${sn.n} geldi`,SEASON_NOTE[sn.k]);}
  if(!S.wx)S.wx=initWx();
  setD({st:{E:{ges:0,res:0,off:0,hes:0},R:{ges:0,res:0,off:0,hes:0},imb:0,bNet:0,curt:0,opex:0,sBase:0,da:0,dev:0,short:0,surp:0,bBal:0,fcErr:0,fcE:0,fee:0},wxf:forecast(S.wx,24)});
  MARKETS.forEach(k=>{
    // piyasanın temsilî noktasındaki saatlik hava tahmini: bulut güneş üretimini, rüzgâr rüzgâr üretimini, sıcak hava akşam talebini belirler
    const [la,lo]=MREF[k],ws=D.wxf.slice(0,24).map(x=>sampleWx(x,la,lo));
    const sunH=ws.map(w=>clamp(clearFactor(w.c)/0.8,0.25,1.1)),windH=ws.map(w=>clamp(w.v/7,0.3,1.8));
    const solarMW=S.plants.filter(p=>p.k==="ges"&&site(p.t).mreg===k).reduce((a,p)=>a+p.mw,0);
    const mS=S.mSolar[k]+solarMW/200, mult=REG[k].mult, dem=demandOf(CAL.date,la), amp=noonAmp(la,CAL.decl);
    const price=BASE.map((b,h)=>clamp(mult*(b*dem*(0.92+0.16*rnd())*(h>=17&&h<=22?1+0.35*ws[h].heat:1)-57*mS*shape(h)*amp*sunH[h]-10*windH[h]),0,110*mult));
    const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
    D[k]={sun:avg(sunH.filter((_,h)=>shape(h)>0)),windDay:avg(windH),price,gen:Array.from({length:24},()=>({s:0,w:0,h:0,b:0}))};
    priceMods(k,D[k]); // olay etkileri, günlük ortalama ve batarya planı
  });
  S.plants.forEach(p=>{if(p.k!=="hes")return;const t=site(p.t),pr=D[t.mreg].price;
    let budget=p.down?0:p.mw*24*t.hydro*(0.25+rnd()*0.3)*eqOf(p).perf*factor("out",t.mreg,"hes")*(0.6+1.2*(p.wet??0.35));p.plan=Array(24).fill(0); // son günlerin yağışı ve kar erimesi
    [...Array(24).keys()].sort((a,b)=>pr[b]-pr[a]).forEach(h=>{const e=Math.min(p.mw,budget);p.plan[h]=e;budget-=e;});});
  dayAhead(); // GÖP: üretim tahmini ve teklif
  if(S.desk.fc==="pre"){const f=deskSummary().fee;S.money-=f;D.st.fee=f;}
}

export function tick(){
  const h=S.hour, st=D.st; let cash=0;
  const dev={},val={},batts={},bm=S.desk?S.desk.batt:"arb"; // piyasa başına sapma (gerçek − taahhüt) ve değeri
  S.plants.forEach(p=>{
    const t=site(p.t), M=D[t.mreg], m=t.mreg, pr=M.price[h], g=M.gen[h], q=eqOf(p);
    const ox=TECH[p.k].opex*q.opex*p.mw/BLOCK/24;st.opex+=ox;cash-=ox;
    const sp=salePrice(m,p.k,h,pr);
    if(p.down){ // arızalı santral üretmez, işletme gideri sürer; GÖP'te sattığı miktar eksik üretim olarak dengesizliğe düşer
      const c=p.cm?p.cm[h]:0;if(c){cash+=c*sp;st.da+=c*sp;dev[m]=(dev[m]||0)-c;val[m]=(val[m]||0)-c*sp;}return;}
    const w=siteWx(t,h);
    if(p.k==="hes"){if(w.snow)p.snowAcc=(p.snowAcc||0)+w.rain;else p.wetAcc=(p.wetAcc||0)+w.rain;}
    if(w.snow&&p.k==="ges")t.snowDays=2; // paneller karla kaplanır
    if(RENEW.includes(p.k)){
      let {e,v}=production(p,h);if(p.k!=="ges")stormCheck(p,t,v);
      if(p.k==="ges"&&sp<=0){st.curt+=e;e=0;}
      const c=p.cm?p.cm[h]:e; // GÖP taahhüdü (gün ortasında kurulan santralde üretimin kendisi)
      cash+=c*sp;st.da+=c*sp;dev[m]=(dev[m]||0)+e-c;val[m]=(val[m]||0)+(e-c)*sp;
      st.E[p.k]+=e;st.R[p.k]+=e*sp;st.fcErr+=Math.abs(e-(p.fc?p.fc[h]:e));st.fcE+=e;
      if(p.k==="ges"){st.sBase+=e*M.avg;g.s+=e;}else g.w+=e;}
    else if(p.k==="hes"){const e=p.plan?p.plan[h]:0;st.E.hes+=e;st.R.hes+=e*sp;st.da+=e*sp;g.h+=e;cash+=e*sp;}
    else if(p.k==="batt"){p.soc=p.soc||0;const cap=p.mw*2;
      if(bm==="bal"){(batts[m]=batts[m]||[]).push(p);return;}if(bm==="off")return;
      if(M.plan[h]===1){const e=Math.min(p.mw,cap-p.soc);p.soc+=e;st.bNet-=e*pr;cash-=e*pr;g.b-=e;}
      else if(M.plan[h]===-1){const r=q.rte||EFF,e=Math.min(p.mw,p.soc);p.soc-=e;st.bNet+=e*r*pr;cash+=e*r*pr;g.b+=e*r;}}
  });
  // dengesizlik uzlaştırması: piyasa başına net sapma; dengeleme modundaki batarya önce sapmayı kapatır
  for(const m in dev){const c=settle(m,dev[m],D[m].price[h],batts[m]||[],st);st.dev+=Math.abs(dev[m]);cash+=c;st.imb+=val[m]-c;}
  S.money+=cash; S.hour++;stepWx(S.wx,1);clock.at=performance.now();
  if(S.hour>=24)endDay();
  render();
}

export function endDay(){
  const st=D.st, E=st.E, R=st.R;
  const net=R.ges+R.res+R.off+R.hes-st.imb+st.bNet-st.opex-st.fee;
  const sRate=E.ges>0?(R.ges/E.ges)/(st.sBase/E.ges):(()=>{const M=D.T;let a=0,b=0;M.price.forEach((p,h)=>{a+=p*shape(h);b+=shape(h);});return(a/b)/M.avg;})();
  S.last={dayNo:S.dayNo,E:{...E},R:{...R},imb:st.imb,bNet:st.bNet,curt:st.curt,opex:st.opex,net,sRate,da:st.da,short:st.short,surp:st.surp,bBal:st.bBal,fee:st.fee,err:st.fcE>0?st.fcErr/st.fcE:0};
  S.hist.push(sRate);if(S.hist.length>14)S.hist.shift();
  MARKETS.forEach(k=>S.mSolar[k]=Math.min(1.6,S.mSolar[k]+0.012));
  // izin süreçleri
  Object.values(S.sites).forEach(o=>{
    if(o.permit!=="pending")return;o.days--;
    if(o.days<=0){const nm=placeName(o);
      if(rnd()<permitProb(o)){o.permit="ok";addLog(`${nm} için izin çıktı. Artık santral kurabilirsin.`);}
      else{o.permit="rejected";o.why=rejectWhy(o);addLog(`${nm} için izin reddedildi: ${o.why}.`);}}
  });
  // istatistikler
  const mwh=E.ges+E.res+E.off+E.hes,ss=S.stats;ss.mwh+=mwh;ss.net+=net;if(!ss.best||net>ss.best.net)ss.best={day:S.dayNo,net};
  // HES: günün yağışı rezervuarı besler (yavaş değişen nem göstergesi); kışın kar birikir, ilkbaharda erir ve suya dönüşür
  const melt=CAL.decl>-4&&CAL.decl<18;
  S.plants.forEach(p=>{if(p.k!=="hes")return;p.snowpack=(p.snowpack||0)+(p.snowAcc||0)/24*3;p.snowAcc=0;
    const m=melt?p.snowpack*0.18:0;p.snowpack-=m;
    p.wet=0.75*(p.wet??0.35)+0.25*Math.min(1.4,(p.wetAcc||0)/24*3+m);p.wetAcc=0;});
  Object.values(S.sites).forEach(o=>{if(o.snowDays>0)o.snowDays--;});
  rollOutages();ageMods();
  S.dayNo++;S.hour=0;newDay();awardAch();checkMissions();save();renderReport();renderPanel();drawMap();
  dayFx(S.last);maybeEvent();openDesk();
}

// Arızalar: her santral her gün ekipmanının arızasız gün olasılığına göre bozulabilir; 1-2 gün üretmez.
// Mühendis uzmanlığı arıza olasılığını yarıya indirir.
function rollOutages(){
  const k=spec()==="eng"?0.5:1;
  S.plants.forEach(p=>{
    if(p.down){p.down--;if(!p.down)addLog(`${placeName(site(p.t))}: ${TECH[p.k].n} (${eqName(p.k,p.q)}) onarıldı, yeniden üretimde.`);return;}
    if(rnd()<(1-eqOf(p).avail)*k*factor("risk",site(p.t).mreg,p.k)){p.down=1+(rnd()<0.4?1:0);S.stats.outages++;
      addLog(`${placeName(site(p.t))}: ${TECH[p.k].n} ${p.mw} MW arızalandı (${eqName(p.k,p.q)}), ${p.down} gün üretim yok.`);}
  });
}

// Fırtına: rüzgâr kesme hızını (25 m/s) aşınca türbinler kendini durdurur; sahada günde bir kez bildirilir
function stormCheck(p,t,v){
  if(v<=25||t.stormDay===S.dayNo)return;t.stormDay=S.dayNo;
  const m=`${placeName(t)}: rüzgâr ${Math.round(v)} m/s, ${TECH[p.k].n} türbinleri kesme hızında durdu`;addLog(m+".");toast("Fırtına",m,"neg");
}

// Yeni rozetleri aç ve bildir
export function awardAch(){
  checkAch(S,netWorth()).forEach(a=>{addLog(`Rozet kazandın: ${a.n}. ${a.d}`);celebrate(`Rozet: ${a.n}`,a.d);});
  renderProfileChip();
}

export function netWorth(){let v=S.money;Object.values(S.sites).forEach(o=>v+=landCost(o));S.plants.forEach(p=>v+=p.cost??TECH[p.k].capex*p.mw/BLOCK);return v;}
export function siteMW(id){return S.plants.filter(p=>p.t===id).reduce((a,p)=>a+p.mw,0);}

export function newDayHydro(p){const t=site(p.t),pr=D[t.mreg].price;let b=p.down?0:p.mw*24*t.hydro*0.4*eqOf(p).perf;p.plan=Array(24).fill(0);
  [...Array(24).keys()].filter(h=>h>=S.hour).sort((a,c)=>pr[c]-pr[a]).forEach(h=>{const e=Math.min(p.mw,b);p.plan[h]=e;b-=e;});}
