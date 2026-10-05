// --- Panel ---
import { BLOCK, SITE_LIMIT, REG, TECH, TER_N } from "../config.js";
import { S, selSite } from "../state.js";
import { allowed, landCost, permitFee, permitProb, oddsTxt, ministry } from "../rules.js";
import { fmt$, dots, shape } from "../utils.js";
import { siteMW } from "../sim.js";
import { buyLand, applyPermit, build } from "../actions.js";
import { plantStatus, statusText } from "../plantstatus.js";
import { flyToSite } from "./map.js";
import { EQUIP, TIERS, TIER_ORDER, capexOf, eqName, tierOf } from "../equipment.js";
import { siteWx, siteForecast } from "../wxsite.js";
import { wxLabel, dirName } from "../weather.js";

const coord=(v,p,n)=>Math.abs(v).toFixed(2)+"°"+(v>=0?p:n);
const near=t=>t.cityKm<5?`${t.city}`:`${t.city} (${t.cityKm} km)`;
let tab=null; // ekipman kartlarında seçili teknoloji

// Anlık hava ve günün kalan saatleri için 3 saatlik tahmin şeridi
function wxHtml(t){
  const w=siteWx(t),l=wxLabel(w,shape(Math.min(S.hour,23))===0),rain=w.rain>0.25?" • Yağış var":"";
  const fc=siteForecast(t,Math.min(S.hour,23)).map(({h,w})=>{const x=wxLabel(w,shape(h)===0);return `<div title="${String(h).padStart(2,"0")}:00 ${x.t}, rüzgâr ${w.hub.toFixed(0)} m/s"><small>${String(h).padStart(2,"0")}</small><span>${x.i}</span><small>${w.hub.toFixed(0)} m/s</small></div>`;}).join("");
  return `<div class="wx"><div class="wxnow"><span class="wxi">${l.i}</span><span><b>${l.t}</b> • Rüzgâr ${w.hub.toFixed(0)} m/s ${dirName(w.dir)} (türbin yüksekliği)${rain}</span></div><div class="wxfc" aria-label="Hava tahmini">${fc}</div></div>`;
}
const pctTxt=v=>"%"+(Math.round(v*1000)/10).toLocaleString("tr-TR");

// Ekipman seçimi: teknoloji sekmeleri ve her kademe için bir kart (marka, özellik, üretim, arıza riski, maliyet)
function buildHtml(t){
  const ks=allowed(t);if(!ks.includes(tab))tab=ks[0];
  let h=`<div class="eqtabs" role="tablist">`+ks.map(k=>`<button role="tab" aria-selected="${k===tab}" class="${k===tab?"on":""}" style="--c:var(${TECH[k].c})" data-a="tab" data-k="${k}">${TECH[k].n}</button>`).join("")+`</div>`;
  h+=`<div class="eqcards">`+TIER_ORDER.map(q=>{const e=EQUIP[tab][q],c=capexOf(tab,q);
    const perf=tab==="batt"?`<span>Verim</span><b>${pctTxt(e.rte)}</b>`:`<span>Üretim</span><b>${pctTxt(e.perf)}</b>`;
    return `<div class="eqcard t-${q}"><div class="eqtier">${TIERS[q]}</div><div class="eqname">${eqName(tab,q)}</div><div class="eqspec">${e.spec}</div>
      <div class="eqstats">${perf}<span>Arızasız gün</span><b>${pctTxt(e.avail)}</b><span>İşletme gideri</span><b>${pctTxt(e.opex)}</b></div>
      <button class="tech" style="--c:var(${TECH[tab].c})" data-a="build" data-k="${tab}" data-q="${q}" data-c="${c}">+5 MW • ${fmt$(c)}</button></div>`;}).join("")+`</div>`;
  return h+`<div class="eqnote">Yüzdeler standart kademeye göre. Ekonomi aynı parayla daha çok MW kurdurur; premium 40 MW'lık saha sınırında en çok üretimi verir.</div>`;
}

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
  html+=`<div id="wxBox">${wxHtml(t)}</div>`;
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
    const mw=siteMW(id),list=S.plants.filter(q=>q.t===id).map(q=>`${TECH[q.k].n} ${q.mw} MW (${eqName(q.k,tierOf(q))}${q.down?", arızalı":""})`).join(", ");
    html+=`<div class="status ok">İzin var. Bu sahada ${mw}/${SITE_LIMIT} MW kurulu${list?": "+list:""}.</div>`;
    if(mw)html+=`<div class="live" id="liveStatus">${statusText(plantStatus(id))}</div>`;
    if(mw)html+=`<div class="actions"><button data-a="fly">3D yakından bak</button></div>`;
    html+=buildHtml(t);
  }
  el.innerHTML=html;
  el.querySelectorAll("button[data-a]").forEach(b=>{b.onclick=()=>{const a=b.dataset.a;if(a==="fly")flyToSite(S.sel.id);else if(a==="land")buyLand();else if(a==="permit")applyPermit(S.sel.id);
    else if(a==="tab"){tab=b.dataset.k;renderPanel();}else build(S.sel.id,b.dataset.k,b.dataset.q);};});
  updateButtons();
}
export function updateButtons(){const wb=document.getElementById("wxBox");if(wb){const t=selSite();if(t&&t.lat!=null)wb.innerHTML=wxHtml(t);}const ls=document.getElementById("liveStatus");if(ls&&S.sel.id)ls.textContent=statusText(plantStatus(S.sel.id));document.querySelectorAll("#panel button[data-c]").forEach(b=>{let d=S.money<+b.dataset.c;if(b.dataset.a==="build"&&siteMW(S.sel.id)+BLOCK>SITE_LIMIT)d=true;b.disabled=d;});}
