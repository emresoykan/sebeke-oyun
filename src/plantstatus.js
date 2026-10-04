// Sahadaki santrallerin o saatteki çalışma durumu (3D modeller ve panel ortak kullanır)
import { S, D } from "./state.js";
import { clamp, shape, prof } from "./utils.js";
import { eqOf } from "./equipment.js";

export function plantStatus(id){
  const o=S.sites[id],M=o&&D[o.mreg],h=Math.min(S.hour,23),out={hour:h,night:shape(h)===0};
  if(!M)return out;
  // aynı teknolojide farklı kademeler olabilir: çalışan ilk kayıt durumu belirler, hepsi arızalıysa "down"
  const ps=S.plants.filter(p=>p.t===id).sort((a,b)=>(a.down?1:0)-(b.down?1:0));
  ps.forEach(p=>{
    if(out[p.k])return;
    if(p.down){out[p.k]={f:0,down:true};return;}
    const q=eqOf(p).perf;
    if(p.k==="res"||p.k==="off")out[p.k]={f:clamp(o.wind*M.windDay*prof(h)*q,0,1)};
    else if(p.k==="ges"){const f=clamp(o.solar*shape(h)*M.sun*q,0,1);out.ges={f,curt:f>0&&M.price[h]<=0};}
    else if(p.k==="hes"){const e=p.plan?p.plan[h]:0;out.hes={run:e>0,f:e/p.mw};}
    else if(p.k==="batt"){const soc=clamp((p.soc||0)/(p.mw*2),0,1);out.batt={soc,chg:M.plan[h]===1&&soc<1,dis:M.plan[h]===-1&&soc>0};}
  });
  return out;
}

const DOWN={res:"RES",off:"Offshore",ges:"GES",hes:"HES",batt:"Batarya"};
export function statusText(st){
  const pct=f=>"%"+Math.round(f*100),parts=[];
  for(const k in DOWN)if(st[k]&&st[k].down){parts.push(`${DOWN[k]}: arızalı, onarılıyor`);delete st[k];}
  if(st.res)parts.push(st.res.f<0.03?"RES: rüzgâr yok, türbinler durdu":`RES: ${pct(st.res.f)} kapasiteyle üretiyor`);
  if(st.off)parts.push(st.off.f<0.03?"Offshore: rüzgâr yok":`Offshore: ${pct(st.off.f)} kapasiteyle üretiyor`);
  if(st.ges)parts.push(st.ges.curt?"GES: fiyat sıfır, üretim kısıldı":st.ges.f<0.03?"GES: gece, üretim yok":`GES: ${pct(st.ges.f)} kapasiteyle üretiyor`);
  if(st.hes)parts.push(st.hes.run?"HES: türbinler çalışıyor":"HES: su biriktiriyor");
  if(st.batt)parts.push(`Batarya: ${pct(st.batt.soc)} dolu`+(st.batt.chg?", şarj oluyor":st.batt.dis?", deşarj ediyor":", beklemede"));
  return parts.join(" • ");
}
