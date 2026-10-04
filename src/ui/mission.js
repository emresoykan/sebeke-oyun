// --- Görev çubuğu: haritanın üstünde sıradaki görev, ilerleme ve ödül ---
import { S } from "../state.js";
import { MISSIONS } from "../missions.js";
import { fmt$ } from "../utils.js";
import { activeMods } from "../mods.js";

export function renderMission(){
  const el=document.getElementById("mission");if(!el)return;
  const i=S.mi||0,n=MISSIONS.length;
  if(i>=n){el.innerHTML=`<div class="mtop"><span class="mstep">Görevler tamam</span></div><b class="mtitle">Hedef: 5 M$ portföy</b><div class="mdesc">Tüm görevleri bitirdin. Büyümeye ve olaylara karşı portföyünü korumaya devam et.</div>`;}
  else{const m=MISSIONS[i];
    el.innerHTML=`<div class="mtop"><span class="mstep">Görev ${i+1}/${n}</span><span class="mreward">Ödül ${fmt$(m.r)}</span></div>
      <b class="mtitle">${m.n}</b><div class="mdesc">${m.d}</div><div class="mbar"><div style="width:${Math.round(i/n*100)}%"></div></div>`;}
  renderMods();
}

// Etkin olay etkileri: kalan gün sayısıyla küçük etiketler
export function renderMods(){
  const el=document.getElementById("mods");if(!el)return;const a=activeMods();
  el.hidden=!a.length;el.innerHTML=a.map(x=>`<span>${x.label} <small>${x.d} gün</small></span>`).join("");
}
