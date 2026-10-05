// --- Haber bandı: en yeni haber hemen görünür, diğerleri sırayla döner; dokununca son haberlerin listesi açılır ---
import { S } from "../state.js";

let idx=0,timer=null,shown=null;
const el=()=>document.getElementById("ticker");
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);

function show(n){
  const it=el()?.querySelector(".tk-item");if(!it||!n)return;
  if(shown===n)return;shown=n;
  it.classList.remove("in");void it.offsetWidth; // animasyonu yeniden başlat
  it.innerHTML=`<span class="tk-i" aria-hidden="true">${n.i}</span><span class="tk-d">Gün ${n.d}</span> ${esc(n.t)}`;it.classList.add("in");
}
function rotate(){const L=S.news||[];if(!L.length)return;idx=(idx+1)%Math.min(L.length,6);show(L[idx]);}
function renderList(){
  const ul=el()?.querySelector(".tk-list");if(!ul)return;
  ul.innerHTML=(S.news||[]).map(n=>`<li><span aria-hidden="true">${n.i}</span><span class="tk-d">Gün ${n.d}</span> ${esc(n.t)}</li>`).join("")||"<li>Henüz haber yok.</li>";
}
export function initTicker(){
  const t=el();if(!t)return;
  const btn=t.querySelector(".tk-btn"),ul=t.querySelector(".tk-list");
  btn.onclick=()=>{const o=btn.getAttribute("aria-expanded")!=="true";btn.setAttribute("aria-expanded",o);ul.hidden=!o;if(o)renderList();};
  window.addEventListener("sebeke:news",()=>{idx=0;t.hidden=false;show(S.news[0]);if(!ul.hidden)renderList();});
  if(S.news&&S.news.length){t.hidden=false;show(S.news[0]);}
  clearInterval(timer);timer=setInterval(rotate,7000);
}
