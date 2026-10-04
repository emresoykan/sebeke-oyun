// Sahadaki santrallerin o saatteki çalışma durumu (3D modeller ve panel ortak kullanır)
import { S, D } from "./state.js";
import { clamp, shape, prof } from "./utils.js";

export function plantStatus(id){
  const o=S.sites[id],M=o&&D[o.mreg],h=Math.min(S.hour,23),out={hour:h,night:shape(h)===0};
  if(!M)return out;
  S.plants.forEach(p=>{
    if(p.t!==id)return;
    if(p.k==="res"||p.k==="off")out[p.k]={f:clamp(o.wind*M.windDay*prof(h),0,1)};
    else if(p.k==="ges"){const f=clamp(o.solar*shape(h)*M.sun,0,1);out.ges={f,curt:f>0&&M.price[h]<=0};}
    else if(p.k==="hes"){const e=p.plan?p.plan[h]:0;out.hes={run:e>0,f:e/p.mw};}
    else if(p.k==="batt"){const soc=clamp((p.soc||0)/(p.mw*2),0,1);out.batt={soc,chg:M.plan[h]===1&&soc<1,dis:M.plan[h]===-1&&soc>0};}
  });
  return out;
}

export function statusText(st){
  const pct=f=>"%"+Math.round(f*100),parts=[];
  if(st.res)parts.push(st.res.f<0.03?"RES: rüzgâr yok, türbinler durdu":`RES: kapasitenin ${pct(st.res.f)}'i`);
  if(st.off)parts.push(st.off.f<0.03?"Offshore: rüzgâr yok":`Offshore: kapasitenin ${pct(st.off.f)}'i`);
  if(st.ges)parts.push(st.ges.curt?"GES: fiyat sıfır, üretim kısıldı":st.ges.f<0.03?"GES: gece, üretim yok":`GES: kapasitenin ${pct(st.ges.f)}'i`);
  if(st.hes)parts.push(st.hes.run?"HES: türbinler çalışıyor":"HES: su biriktiriyor");
  if(st.batt)parts.push(`Batarya: ${pct(st.batt.soc)} dolu`+(st.batt.chg?", şarj oluyor":st.batt.dis?", deşarj ediyor":", beklemede"));
  return parts.join(" • ");
}
