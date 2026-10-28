// Sahadaki santrallerin o saatteki çalışma durumu (3D modeller ve panel ortak kullanır)
import { S, D } from "./state.js";
import { clamp, shape } from "./utils.js";
import { eqOf } from "./equipment.js";
import { siteWx } from "./wxsite.js";
import { sunRel, powerCurve } from "./weather.js";
import { production, PV } from "./market.js";
import { PHS_H, CSP, FPV_COOL } from "./config.js";
import { CAL, noonAmp } from "./calendar.js";

export function plantStatus(id){
  const o=S.sites[id],M=o&&D[o.mreg],h=Math.min(S.hour,23),out={hour:h,night:shape(h)===0};
  if(!M)return out;
  const w=siteWx(o,h);out.wx=w;
  // aynı teknolojide farklı kademeler olabilir: çalışan ilk kayıt durumu belirler, hepsi arızalıysa "down"
  const ps=S.plants.filter(p=>p.t===id).sort((a,b)=>(a.down?1:0)-(b.down?1:0));
  ps.forEach(p=>{
    if(out[p.k])return;
    if(p.down){out[p.k]={f:0,down:true};return;}
    const q=eqOf(p).perf;
    if(p.k==="res"||p.k==="off"||p.k==="flo"){const v=w.hub;out[p.k]={f:clamp(powerCurve(v)*q,0,1),cut:v>25};}
    else if(PV.includes(p.k)){const sn=o.snowDays>0,f=clamp(o.solar*shape(h)*noonAmp(o.lat,CAL.decl)*sunRel(w,w.base)*1.24*q*(sn?0.25:1)*(p.k==="fpv"?FPV_COOL:1),0,1);out[p.k]={f,curt:f>0&&M.price[h]<=0,snow:sn};}
    else if(p.k==="hes"){const e=p.plan?p.plan[h]:0;out.hes={run:e>0,f:e/p.mw};}
    else if(p.k==="jes")out.jes={f:Math.min(0.96,(o.well??1)*q*0.92)};
    else if(p.k==="bes"){const e=p.plan?p.plan[h]:0;out.bes={run:e>0};}
    else if(p.k==="mar"){const r=production(p,h);out.mar={f:clamp(r.e/p.mw,0,1),tide:r.tide>=r.wave};}
    else if(p.k==="phs"){const soc=clamp((p.soc||0)/(p.mw*PHS_H),0,1),pl=p.plan?p.plan[h]:0;out.phs={soc,chg:pl===1&&soc<1,dis:pl===-1&&soc>0};}
    else if(p.k==="h2"){const e=p.plan?p.plan[h]:0;out.h2={run:e>0,price:M.price[h]};}
    else if(p.k==="csp"){const tank=clamp((p.tank||0)/(p.mw*CSP.h),0,1);out.csp={run:!!(p.plan&&p.plan[h])&&(p.tank||0)>0.01||tank>0.995&&shape(h)>0,tank,sun:shape(h)>0};}
    else if(p.k==="batt"){const soc=clamp((p.soc||0)/(p.mw*2),0,1);out.batt={soc,chg:M.plan[h]===1&&soc<1,dis:M.plan[h]===-1&&soc>0};}
  });
  return out;
}

const DOWN={res:"RES",off:"Offshore",flo:"Yüzer RES",ges:"GES",fpv:"Yüzer GES",csp:"CSP",hes:"HES",phs:"Pompaj HES",jes:"JES",bes:"Biyokütle",mar:"Deniz",batt:"Batarya",h2:"Elektrolizör"};
export function statusText(st){
  const pct=f=>"%"+Math.round(f*100),parts=[];
  for(const k in DOWN)if(st[k]&&st[k].down){parts.push(`${DOWN[k]}: arızalı, onarılıyor`);delete st[k];}
  if(st.res)parts.push(st.res.cut?"RES: fırtına, türbinler kesme hızında durdu":st.res.f<0.03?"RES: rüzgâr yok, türbinler durdu":`RES: ${pct(st.res.f)} kapasiteyle üretiyor`);
  if(st.off)parts.push(st.off.cut?"Offshore: fırtına, türbinler durdu":st.off.f<0.03?"Offshore: rüzgâr yok":`Offshore: ${pct(st.off.f)} kapasiteyle üretiyor`);
  if(st.flo)parts.push(st.flo.cut?"Yüzer RES: fırtına, türbinler durdu (platform güvende)":st.flo.f<0.03?"Yüzer RES: rüzgâr yok":`Yüzer RES: ${pct(st.flo.f)} kapasiteyle üretiyor`);
  if(st.ges)parts.push(st.ges.snow&&st.ges.f>0.005?`GES: paneller karla kaplı, ${pct(st.ges.f)} kapasite`:st.ges.curt?"GES: fiyat sıfır, üretim kısıldı":st.ges.f<0.03?"GES: gece, üretim yok":`GES: ${pct(st.ges.f)} kapasiteyle üretiyor`);
  if(st.fpv)parts.push(st.fpv.snow&&st.fpv.f>0.005?`Yüzer GES: paneller karla kaplı, ${pct(st.fpv.f)} kapasite`:st.fpv.curt?"Yüzer GES: fiyat sıfır, üretim kısıldı":st.fpv.f<0.03?"Yüzer GES: gece, üretim yok":`Yüzer GES: ${pct(st.fpv.f)} kapasiteyle üretiyor`);
  if(st.csp)parts.push(`CSP: tuz deposu ${pct(st.csp.tank)} dolu`+(st.csp.run?", türbin çalışıyor":st.csp.sun?", güneşi depoluyor":", bekliyor"));
  if(st.hes)parts.push(st.hes.run?"HES: türbinler çalışıyor":"HES: su biriktiriyor");
  if(st.jes)parts.push(`JES: ${pct(st.jes.f)} kapasiteyle sürekli üretiyor`);
  if(st.bes)parts.push(st.bes.run?"Biyokütle: fiyat yakıt maliyetinin üstünde, çalışıyor":"Biyokütle: fiyat düşük, yakıt yakmıyor");
  if(st.mar)parts.push(st.mar.f<0.03?"Deniz: gelgit dönüyor, akıntı durgun":`Deniz: ${pct(st.mar.f)} kapasite (${st.mar.tide?"gelgit akıntısı":"dalga"})`);
  if(st.phs)parts.push(`Pompaj HES: üst hazne ${pct(st.phs.soc)} dolu`+(st.phs.chg?", su pompalanıyor":st.phs.dis?", türbinler çalışıyor":", beklemede"));
  if(st.h2)parts.push(st.h2.run?"Elektrolizör: elektrik ucuz, hidrojen üretiyor":"Elektrolizör: elektrik pahalı, bekliyor");
  if(st.batt)parts.push(`Batarya: ${pct(st.batt.soc)} dolu`+(st.batt.chg?", şarj oluyor":st.batt.dis?", deşarj ediyor":", beklemede"));
  return parts.join(" • ");
}

// Sahada o saatte üretim (veya batarya hareketi) var mı: haritadaki "canlı" nabzı için
export function isLive(st){
  const f=x=>x&&!x.down&&x.f>=0.03;
  return !!((f(st.ges)&&!st.ges.curt)||(f(st.fpv)&&!st.fpv.curt)||f(st.res)||f(st.off)||f(st.flo)||f(st.jes)||f(st.mar)||(st.hes&&st.hes.run)||(st.bes&&st.bes.run)||(st.csp&&st.csp.run)||(st.h2&&st.h2.run)||
    (st.batt&&(st.batt.chg||st.batt.dis))||(st.phs&&(st.phs.chg||st.phs.dis)));
}
