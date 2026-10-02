// --- Panel ---
import { BLOCK, SITE_LIMIT, REG, TECH, TER_N } from "../config.js";
import { S, selSite } from "../state.js";
import { allowed, landCost, permitFee, permitProb, oddsTxt, ministry } from "../rules.js";
import { fmt$, dots } from "../utils.js";
import { siteMW } from "../sim.js";
import { buyLand, applyPermit, build } from "../actions.js";
import { plantStatus, statusText } from "../plantstatus.js";
import { flyToSite } from "./map.js";

const coord=(v,p,n)=>Math.abs(v).toFixed(2)+"°"+(v>=0?p:n);
const near=t=>t.cityKm<5?`${t.city}`:`${t.city} (${t.cityKm} km)`;

export function renderPanel(){
  const t=selSite(),id=S.sel.id,o=id?S.sites[id]:null,el=document.getElementById("panel");
  const latS=coord(t.lat,"K","G"),lonS=coord(t.lon,"D","B");
  let title,html="";
  if(t.sea&&!t.shallow){el.innerHTML=`<h3>Açık deniz</h3><div class="loc">${latS}, ${lonS} • En yakın şehir: ${near(t)}</div><div class="status bad">Derin deniz: sabit tabanlı türbin kurulamaz. Kıyıya en fazla 200 km mesafedeki sığ sulara bak.</div>`;return;}
  if(t.reg==="X"){el.innerHTML=`<h3>Antarktika</h3><div class="loc">${latS}, ${lonS}</div><div class="status bad">Antarktika Antlaşması gereği ticari enerji tesisi kurulamaz. Arazi satışa kapalı.</div>`;return;}
  if(t.reg==="G"){el.innerHTML=`<h3>Grönland buz örtüsü</h3><div class="loc">${latS}, ${lonS}</div><div class="status bad">Buz örtüsü üzerinde tesis izni verilmez ve şebeke bağlantısı yok.</div>`;return;}
  title=t.sea?`${t.country} • Sığ deniz`:`${t.country} • ${TER_N[t.ter]}${t.park?" ("+t.park+")":""}`;
  html+=`<h3>${title}</h3><div class="loc">${latS}, ${lonS} • En yakın şehir: ${near(t)} • ${REG[t.mreg].n} piyasasına satar</div>`;
  html+=`<div class="res">`+(t.sea?`<span>Rüzgâr</span><span class="dots">${dots(t.wind)}</span>`:
    `<span>Güneş</span><span class="dots">${dots(t.solar)}</span><span>Rüzgâr</span><span class="dots">${dots(t.wind)}</span><span>Hidro</span><span class="dots">${t.hydro?dots(t.hydro):"–  (yalnızca dağlık bölgeler)"}</span>`)+`</div>`;
  const p=permitProb(t);
  if(!o){
    html+=`<div class="status">${t.sea?"Deniz alanı tahsisi":"Arazi"}: <b>${fmt$(landCost(t))}</b>. Satın aldıktan sonra ${ministry(t)} izni gerekir. Tahmini izin ihtimali: <b>${oddsTxt(p)}</b>.${t.ter==="p"?" Korunan alanda izin neredeyse hiç verilmez.":t.ter==="f"?" Orman alanlarında izin zor çıkar.":""}</div>`;
    html+=`<div class="actions"><button class="pri" data-a="land" data-c="${landCost(t)}">${t.sea?"Deniz alanını kirala":"Araziyi satın al"}</button></div>`;
  }else if(o.permit==="none"||o.permit==="rejected"){
    if(o.permit==="rejected")html+=`<div class="status bad">İzin reddedildi: ${o.why}. Tekrar başvurabilirsin; ihtimal değişmez.</div>`;
    else html+=`<div class="status">Arazi senin. ${ministry(t)} izni olmadan kurulum yapılamaz. İzin ihtimali: <b>${oddsTxt(p)}</b>.</div>`;
    html+=`<div class="actions"><button class="pri" data-a="permit" data-c="${permitFee(t)}">İzin başvurusu yap (${fmt$(permitFee(t))})</button></div>`;
  }else if(o.permit==="pending"){
    html+=`<div class="status wait">İzin inceleniyor: yaklaşık ${o.days} gün kaldı.</div>`;
  }else{
    const mw=siteMW(id),list=S.plants.filter(q=>q.t===id).map(q=>`${TECH[q.k].n} ${q.mw} MW`).join(", ");
    html+=`<div class="status ok">İzin var. Bu sahada ${mw}/${SITE_LIMIT} MW kurulu${list?": "+list:""}.</div>`;
    if(mw)html+=`<div class="live" id="liveStatus">${statusText(plantStatus(id))}</div>`;
    html+=`<div class="actions">`+(mw?`<button data-a="fly">3D yakından bak</button>`:"");
    allowed(t).forEach(k=>{html+=`<button class="tech" style="--c:var(${TECH[k].c})" data-a="build" data-k="${k}" data-c="${TECH[k].capex}">${TECH[k].long}: +5 MW, ${fmt$(TECH[k].capex)}</button>`;});
    html+=`</div>`;
  }
  el.innerHTML=html;
  el.querySelectorAll("button[data-a]").forEach(b=>{b.onclick=()=>{const a=b.dataset.a;if(a==="fly")flyToSite(S.sel.id);else if(a==="land")buyLand();else if(a==="permit")applyPermit(S.sel.id);else build(S.sel.id,b.dataset.k);};});
  updateButtons();
}
export function updateButtons(){const ls=document.getElementById("liveStatus");if(ls&&S.sel.id)ls.textContent=statusText(plantStatus(S.sel.id));document.querySelectorAll("#panel button[data-c]").forEach(b=>{let d=S.money<+b.dataset.c;if(b.dataset.a==="build"&&siteMW(S.sel.id)+BLOCK>SITE_LIMIT)d=true;b.disabled=d;});}
