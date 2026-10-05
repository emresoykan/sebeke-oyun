// --- Arkadaş ligi penceresi: lig kur / katıl, sıralama ve son duyurular ---
import { LG, leagueAvailable, joinLeague, leaveLeague, newCode, normCode, codeOk, feedText, safeColor } from "../league.js";
import { fmt$ } from "../utils.js";
import { TITLES } from "../profile.js";

const dlg=()=>document.getElementById("leagueDlg");
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const ago=t=>{const m=Math.round((Date.now()-t)/60000);return m<1?"az önce":m<60?`${m} dk önce`:m<1440?`${Math.round(m/60)} sa önce`:`${Math.round(m/1440)} gün önce`;};
let msg="";

function body(){
  if(!LG.code)return `<p class="pmuted">Arkadaşlarınla aynı ligde yarış: sıralamada şirket adın, portföy değerin ve kurulu gücün görünür, 50 MW veya 1 M$ gibi eşikleri geçince lige duyuru düşer. Kişi adın paylaşılmaz.</p>
    <div class="lgform"><button class="pri" data-a="new">Yeni lig kur</button>
    <span class="pmuted">veya</span>
    <input id="lgCode" maxlength="16" placeholder="Davet kodu" autocomplete="off" spellcheck="false" aria-label="Davet kodu"><button data-a="join">Katıl</button></div>
    ${msg?`<p class="neg">${esc(msg)}</p>`:""}`;
  const st={connecting:"Bağlanıyor…",on:"Bağlı",error:"Bağlantı sorunu"}[LG.status]||"";
  const rows=LG.players.map((p,i)=>`<li class="${p.id===LG.uid?"me":""}"><i style="background:${safeColor(p.c)}"></i><b>${esc(p.co)}</b><span class="v">${fmt$(p.v)}</span>
      <span class="sub">${esc((TITLES[p.ti]||TITLES[0])[1])} • ${p.mw} MW • Gün ${p.d}</span></li>`).join("");
  const feed=LG.feed.map(f=>`<li><span aria-hidden="true">🏆</span> ${esc(feedText(f))} <small class="pmuted">${ago(f.at)}</small></li>`).join("");
  return `<div class="lgcode"><span>Davet kodu</span><b id="lgCodeTxt">${esc(LG.code)}</b><button data-a="copy">Kopyala</button>
      <small class="lgst ${LG.status}">${st}${LG.err?` (${esc(LG.err)})`:""}</small></div>
    <p class="pmuted">Kodu arkadaşlarına gönder; sitede "Lig" düğmesinden katılırlar.</p>
    <h4>Sıralama <span class="pmuted">portföy değerine göre</span></h4>
    <ol class="lgrank">${rows||'<li class="pmuted">Henüz kimse yok.</li>'}</ol>
    <h4>Duyurular</h4><ul class="lgfeed">${feed||'<li class="pmuted">Henüz duyuru yok.</li>'}</ul>
    ${msg?`<p class="pmuted">${esc(msg)}</p>`:""}`;
}
function render(){
  const d=dlg();if(!d||!d.open)return;
  const v=d.querySelector("#lgCode")?.value||"";
  d.innerHTML=`<div class="lgview"><h3>🏆 Arkadaş ligi</h3>${body()}<div class="pact">${LG.code?'<button data-a="leave">Ligden ayrıl</button>':""}<button class="pri" data-a="close">Kapat</button></div></div>`;
  const inp=d.querySelector("#lgCode");if(inp){inp.value=v;inp.onkeydown=e=>{if(e.key==="Enter")act("join");};}
  d.querySelectorAll("button[data-a]").forEach(b=>b.onclick=()=>act(b.dataset.a));
}
async function act(a){
  const d=dlg();msg="";
  if(a==="close")return d.close();
  if(a==="new"){await joinLeague(newCode());return render();}
  if(a==="join"){const c=normCode(d.querySelector("#lgCode").value);if(!codeOk(c)){msg="Kod 6-16 harf veya rakam olmalı.";return render();}await joinLeague(c);return render();}
  if(a==="copy"){try{await navigator.clipboard.writeText(LG.code);msg="Kod kopyalandı.";}catch(e){msg="Kopyalanamadı; kodu elle seç.";}return render();}
  if(a==="leave"){if(confirm("Ligden ayrılırsan sıralamadan silinirsin. Emin misin?"))await leaveLeague();return render();}
}
export function openLeague(){const d=dlg();msg="";if(!d.open)d.showModal();render();}
export function initLeagueUI(btn){
  if(!leagueAvailable()){btn.hidden=true;return;}
  btn.hidden=false;btn.onclick=openLeague;
  dlg().addEventListener("click",e=>{if(e.target===dlg())dlg().close();});
  window.addEventListener("sebeke:league",render);
}
