// --- Görev çubuğu: haritanın üstünde sıradaki görev, ilerleme ve ödül ---
// Eğitim görevlerinde (ilk 8, tutorial.js) ilgili kontrol vurgulanır: body[data-tut] anahtarına göre style.css'te
// yanıp sönen bir çerçeve. Panel sık yeniden çizildiği için vurgu sınıf yerine bu öznitelikle seçilir. Görevin kendi
// düğmesi (Paneli aç, Raporu aç…) özellikle mobilde kapalı karttaki kontrole tek dokunuşla ulaştırır.
import { S } from "../state.js";
import { MISSIONS } from "../missions.js";
import { fmt$ } from "../utils.js";
import { activeMods } from "../mods.js";
import { TUT_N, ob } from "../tutorial.js";
import { openSheet, sheetState } from "./sheet.js";
import { focusSite } from "./map.js";

const firstSite=()=>Object.keys(S.sites)[0];
const paused=()=>document.getElementById("pauseBtn")?.getAttribute("aria-pressed")==="true";
const goSite=()=>{const id=S.sel.id&&S.sites[S.sel.id]?S.sel.id:firstSite();if(id)focusSite(id);else openSheet("saha");reveal(document.body.dataset.tut);};
const siteAct=()=>S.sel.id&&S.sites[S.sel.id]&&panelOpen()?null:{l:"Sahaya git",run:goSite};
const click=id=>()=>document.getElementById(id)?.click();
const mobile=matchMedia("(max-width:899.98px)");
// vurgulanan panel kontrolü (style.css'teki seçicilerle aynı)
const SEL={land:'#panel button[data-a="land"]',permit:'#panel button[data-a="permit"],#panel .popt',tech:"#panel .eqtabs",build:'#panel .eqcard.t-std button[data-a="build"]:not(.loan)'};
// vurgulanan kontrol panelde görünmüyorsa görünür alana kaydırılır (masaüstünde panel uzun; mobilde kart yarı açık)
function reveal(hl){const q=SEL[hl];if(!q)return;setTimeout(()=>{const e=document.querySelector(q);if(!e)return;const r=e.getBoundingClientRect();
  if(r.top<0||r.bottom>innerHeight)e.scrollIntoView({block:"center",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});},mobile.matches?380:60);}
// panel düğmesi: seçili sahada ve panel görünürken gereksiz (mobilde kart kapalıyken ya da başka sahadayken gösterilir)
const panelOpen=()=>!mobile.matches||sheetState()!=="peek";
// görev → [vurgu anahtarı, kart düğmesi {l, run}]
function hint(m){
  const o=Object.values(S.sites),run=paused()?["resume",{l:"Devam et",run:click("pauseBtn")}]:["speed",null];
  switch(m.id){
    case "pick":return ["pick",{l:"Potansiyel haritası",run:click("potBtn")}];
    case "land":return ["land",panelOpen()?null:{l:"Paneli aç",run:()=>{openSheet("saha");reveal("land");}}];
    case "permit":return [o.length?"permit":"pick",o.length?siteAct():null];
    case "tech":return o.some(x=>x.permit==="ok")?["tech",siteAct()]:o.some(x=>x.permit==="pending")?run:["permit",siteAct()];
    case "build":return ["build",siteAct()];
    case "run":case "sale":return run;
    case "report":return ob().repReady?["report",{l:"Raporu aç",run:()=>openSheet("rapor")}]:run;
  }
  return [null,null];
}
let last="",act=null;
export function renderMission(){
  const el=document.getElementById("mission");if(!el)return;
  const i=S.mi||0,n=MISSIONS.length,tut=i<TUT_N;let html,hl=null;act=null;
  if(i>=n)html=`<div class="mtop"><span class="mstep">Görevler tamam</span></div><b class="mtitle">Hedef: 5 M$ portföy</b><div class="mdesc">Tüm görevleri bitirdin. Büyümeye ve olaylara karşı portföyünü korumaya devam et.</div>`;
  else{const m=MISSIONS[i],d=typeof m.d==="function"?m.d():m.d;
    if(tut)[hl,act]=hint(m);
    const step=tut?`İlk adımlar ${i+1}/${TUT_N}`:`Görev ${i-TUT_N+1}/${n-TUT_N}`,pct=tut?i/TUT_N:(i-TUT_N)/(n-TUT_N);
    html=`<div class="mtop"><span class="mstep">${step}</span><span class="mreward">Ödül ${fmt$(m.r)}</span></div>
      <b class="mtitle">${m.n}</b><div class="mdesc">${d}</div>${act?`<button type="button" class="mact">${act.l}</button>`:""}<div class="mbar"><div style="width:${Math.round(pct*100)}%"></div></div>`;}
  // yalnızca değişince yeniden çizilir (aria-live aynı metni tekrar okumasın)
  if(html!==last){last=html;el.innerHTML=html;const b=el.querySelector(".mact");if(b)b.onclick=e=>{e.stopPropagation();act&&act.run();};}
  el.classList.toggle("tut",tut);
  if(hl)document.body.dataset.tut=hl;else delete document.body.dataset.tut;
  renderMods();
}
// tamamlanan görevde kartın kısa parlaması (hareket azaltılmışsa yalnızca renk)
window.addEventListener("sebeke:mission",()=>{const el=document.getElementById("mission");if(!el)return;el.classList.remove("mdone");void el.offsetWidth;el.classList.add("mdone");
  setTimeout(()=>{renderMission();reveal(document.body.dataset.tut);},0);});
// kart açılıp kapanınca ve seçim değişince düğme (Paneli aç / Sahaya git) gerekip gerekmediği değişir
["sebeke:sheet","sebeke:select","sebeke:permit"].forEach(e=>window.addEventListener(e,()=>renderMission()));

// Etkin olay etkileri: kalan gün sayısıyla küçük etiketler
export function renderMods(){
  const el=document.getElementById("mods");if(!el)return;const a=activeMods();
  el.hidden=!a.length;el.innerHTML=a.map(x=>`<span>${x.label} <small>${x.d} gün</small></span>`).join("");
}
