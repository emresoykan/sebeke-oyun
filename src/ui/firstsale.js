// --- İlk satış kartı: ilk üretim ve ilk satış gerçekleşince tek bir sonuç kartı ---
// Üretilen enerji, satış fiyatı, gelir ve havanın üretime etkisi (tutorial.js ob().first) ile ilk iki üretim görevinin
// ödülü gösterilir; kısa bir konfeti ve (ses açıksa) ses çalar. Ardından üç seçenek: kapasiteyi artır, yeni arazi ara,
// piyasa ekranını incele. Kart gösterilince ob().card işaretlenir; sayfa kart görünmeden yenilenirse açılışta gelir.
import { S, save } from "../state.js";
import { TECH } from "../config.js";
import { fmt$ } from "../utils.js";
import { placeName } from "../world.js";
import { MISSIONS } from "../missions.js";
import { ob } from "../tutorial.js";
import { enqueue } from "./modal.js";
import { sfx } from "./fx.js";
import { openSheet } from "./sheet.js";
import { focusSite } from "./map.js";

const reduced=matchMedia("(prefers-reduced-motion: reduce)");
const nf=(v,d=1)=>v.toLocaleString("tr-TR",{maximumFractionDigits:d});

function show(done){
  const d=document.getElementById("firstDlg"),f=ob().first;if(!d||!f){done();return;}
  ob().card=1;save();
  const t=S.sites[f.id],ks=[...new Set(S.plants.filter(p=>p.t===f.id).map(p=>TECH[p.k].n))].join(" + ");
  const rw=MISSIONS.filter(m=>m.id==="run"||m.id==="sale").reduce((a,m)=>a+m.r,0);
  const cell=(k,v)=>`<div><small>${k}</small><b>${v}</b></div>`;
  d.innerHTML=`<span class="evtag">İlk satış</span><h3 id="firstTitle">İlk elektriğini sattın</h3>
    <p class="fsub">${t?placeName(t):""}${ks?` • ${ks}`:""} • saat ${String(f.h).padStart(2,"0")}:00–${String((f.h+1)%24).padStart(2,"0")}:00</p>
    <div class="winstats">${cell("Üretilen enerji",`${nf(f.mwh,f.mwh<10?2:1)} MWh`)}${cell("Satış fiyatı",`${f.price} $/MWh`)}${cell("Gelir",fmt$(f.rev))}${cell("Hava",f.wx)}</div>
    <p class="fwx">${f.fx}</p>
    <p class="frw">Görev ödülleri: <b>+${fmt$(rw)}</b>. Kredili kurulum ve Rapor sekmesindeki proje ekonomisi (Uzman ayrıntıları) artık açık.</p>
    <p class="fq">Sırada ne var?</p>
    <div class="fopts">
      <button type="button" data-v="cap"><b>Kapasiteyi artır</b><span>Aynı sahaya +5 MW daha kur: aynı arazi, daha çok üretim.</span></button>
      <button type="button" data-v="land"><b>Yeni arazi ara</b><span>Başka bir yerde, farklı bir kaynakla portföyünü çeşitlendir.</span></button>
      <button type="button" data-v="mkt"><b>Piyasa ekranını incele</b><span>Saatlik fiyat eğrisini ve üretimini gör.</span></button>
    </div>`;
  const close=v=>{d.close();
    if(v==="cap"&&S.sites[f.id])focusSite(f.id);
    else if(v==="land"){const pb=document.getElementById("potBtn");if(pb&&pb.getAttribute("aria-pressed")!=="true")pb.click();
      const mw=document.getElementById("map");if(mw)mw.focus({preventScroll:true});}
    else if(v==="mkt")openSheet("piyasa");};
  d.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>close(b.dataset.v));
  d.addEventListener("close",()=>done(),{once:true});
  d.showModal();d.querySelector('[data-v="cap"]').focus();
  sfx("win");
  if(!reduced.matches){const cols=["#F2B42C","#5AA2E0","#3CC495","#A58BEA","#F06A7D"],box=d.querySelector(".winstats");
    for(let i=0;i<24;i++){const p=document.createElement("i");p.className="confetti";const a=Math.random()*Math.PI*2,r=50+Math.random()*90;
      p.style.cssText=`--x:${Math.cos(a)*r}px;--y:${Math.sin(a)*r-40}px;background:${cols[i%cols.length]};animation-delay:${Math.random()*90}ms;left:50%;top:40%`;box.appendChild(p);}}
}
export function initFirstSale(){
  window.addEventListener("sebeke:firstsale",()=>{if(!ob().card)enqueue(show);});
  if(ob().sale&&!ob().card)enqueue(show);
}
