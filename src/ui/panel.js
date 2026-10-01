// --- Panel ---
import { BLOCK, TILE_LIMIT, REG, TECH, TER_N } from "../config.js";
import { T } from "../world.js";
import { S } from "../state.js";
import { allowed, landCost, permitFee, permitProb, oddsTxt, ministry } from "../rules.js";
import { fmt$, dots } from "../utils.js";
import { tileMW } from "../sim.js";
import { buyLand, applyPermit, build } from "../actions.js";

export function renderPanel(){
  const t=T[S.sel],o=S.tiles[S.sel],el=document.getElementById("panel");
  const latS=(t.lat>=0?t.lat+"°K":(-t.lat)+"°G"),lonS=(t.lon>=0?t.lon+"°D":(-t.lon)+"°B");
  let title,html="";
  if(t.sea&&!t.shallow){el.innerHTML=`<h3>Açık deniz</h3><div class="loc">${latS}, ${lonS}</div><div class="status bad">Derin deniz: sabit tabanlı türbin kurulamaz. Kıyıya yakın açık mavi karelere bak.</div>`;return;}
  if(t.reg==="X"){el.innerHTML=`<h3>Antarktika</h3><div class="loc">${latS}, ${lonS}</div><div class="status bad">Antarktika Antlaşması gereği ticari enerji tesisi kurulamaz. Arazi satışa kapalı.</div>`;return;}
  if(t.reg==="G"){el.innerHTML=`<h3>Grönland buz örtüsü</h3><div class="loc">${latS}, ${lonS}</div><div class="status bad">Buz örtüsü üzerinde tesis izni verilmez ve şebeke bağlantısı yok.</div>`;return;}
  title=t.sea?`${REG[t.mreg].n} • Sığ deniz`:`${REG[t.mreg].n} • ${TER_N[t.ter]}`;
  html+=`<h3>${title}</h3><div class="loc">${latS}, ${lonS} • ${REG[t.mreg].n} piyasasına satar</div>`;
  html+=`<div class="res">`+(t.sea?`<span>Rüzgâr</span><span class="dots">${dots(t.wind)}</span>`:
    `<span>Güneş</span><span class="dots">${dots(t.solar)}</span><span>Rüzgâr</span><span class="dots">${dots(t.wind)}</span><span>Hidro</span><span class="dots">${t.hydro?dots(t.hydro):"–  (yalnızca dağlık kareler)"}</span>`)+`</div>`;
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
    const mw=tileMW(S.sel),list=S.plants.filter(q=>q.t==S.sel).map(q=>`${TECH[q.k].n} ${q.mw} MW`).join(", ");
    html+=`<div class="status ok">İzin var. Bu karede ${mw}/${TILE_LIMIT} MW kurulu${list?": "+list:""}.</div><div class="actions">`;
    allowed(t).forEach(k=>{html+=`<button class="tech" style="--c:var(${TECH[k].c})" data-a="build" data-k="${k}" data-c="${TECH[k].capex}">${TECH[k].long}: +5 MW, ${fmt$(TECH[k].capex)}</button>`;});
    html+=`</div>`;
  }
  el.innerHTML=html;
  el.querySelectorAll("button[data-a]").forEach(b=>{b.onclick=()=>{const a=b.dataset.a;if(a==="land")buyLand(S.sel);else if(a==="permit")applyPermit(S.sel);else build(S.sel,b.dataset.k);};});
  updateButtons();
}
export function updateButtons(){document.querySelectorAll("#panel button[data-c]").forEach(b=>{let d=S.money<+b.dataset.c;if(b.dataset.a==="build"&&tileMW(S.sel)+BLOCK>TILE_LIMIT)d=true;b.disabled=d;});}
