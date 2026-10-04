// --- Olay kartı penceresi: oyun durur, oyuncu bir seçenek seçer, sonuç gösterilir ---
import { S } from "../state.js";
import { sfx } from "./fx.js";
import { renderMods } from "./mission.js";

// Oyun döngüsünü main.js durdurur/sürdürür
const hold=v=>window.dispatchEvent(new CustomEvent(v?"sebeke:hold":"sebeke:release"));

export function showEvent(ev,pick){
  const d=document.getElementById("eventDlg");
  d.innerHTML=`<div class="evcard"><span class="evtag">${ev.tag}</span><h3>${ev.title}</h3><p>${ev.text}</p>
    <div class="evlearn"><b>Piyasa notu</b> ${ev.learn}</div>
    <div class="evopts">${ev.opts.map((o,i)=>`<button data-i="${i}" ${o.c&&S.money<o.c?"disabled":""}><b>${o.l}</b><small>${o.e}${o.c&&S.money<o.c?` (nakit yetersiz)`:""}</small></button>`).join("")}</div></div>`;
  d.oncancel=e=>e.preventDefault(); // karar vermeden kapanmaz
  d.querySelectorAll("button[data-i]").forEach(b=>b.onclick=()=>{
    const r=pick(+b.dataset.i);renderMods();
    d.querySelector(".evopts").outerHTML=`<div class="evresult">${r}</div><div class="pact"><button class="pri" data-a="ok">Devam</button></div>`;
    const ok=d.querySelector('[data-a="ok"]');ok.focus();ok.onclick=()=>{d.close();hold(false);};
  });
  hold(true);sfx("event");d.showModal();d.scrollTop=0;
}
