// --- Sözlük ve sürüm notları pencereleri ---
// Sözlük (glossary.js): arama kutulu, kategorilere ayrılmış terim listesi. data-gloss özniteliği taşıyan her öğe sözlüğü
// açar; değer bir terim anahtarıysa (ör. data-gloss="dscr") o terime kaydırır ve kısa süre vurgular.
// Sürüm notları (changelog.js): en yeni sürüm açık, eskiler katlanmış. Oyuncunun gördüğü son sürüm localStorage'da tutulur;
// yeni sürüm varsa Ayarlar sekmesinde nokta ve düğmede "Yeni" etiketi çıkar, pencere açılınca kalkar. İlk kez oynayan
// (sahası olmayan) oyuncuya işaret gösterilmez.
import { S } from "../state.js";
import { CATS, TERMS } from "../glossary.js";
import { NOTES, LATEST } from "../changelog.js";

const SEEN="sebeke-notes-seen",coarse=matchMedia("(pointer:coarse)");
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const fold=s=>s.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ı/g,"i");
const dateTR=id=>new Date(id.slice(0,10)+"T12:00:00").toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric"});
const getSeen=()=>{try{return localStorage.getItem(SEEN)||"";}catch(e){return "";}};
const setSeen=v=>{try{localStorage.setItem(SEEN,v);}catch(e){}};

function glossHtml(){
  return `<div class="hhead"><h3 id="glossTitle">Sözlük</h3><button type="button" class="hclose" aria-label="Kapat">✕</button></div>
    <p class="hsub">Oyunda geçen terimler. "Oyunda" satırı oyunun basitleştirmesini söyler; oyundaki değerler temsilidir.</p>
    <input type="search" class="gsearch" placeholder="Terim ara (ör. DSCR, dengesizlik)" aria-label="Sözlükte ara" autocomplete="off">
    <div class="glist">${CATS.map(([c,n])=>`<section data-cat="${c}"><h4>${n}</h4><dl>${TERMS.filter(x=>x.c===c).map(x=>
      `<div class="gterm" id="g-${x.k}" data-q="${esc(fold(x.t+" "+(x.e||"")+" "+x.d))}"><dt>${esc(x.t)}${x.e?` <small>${esc(x.e)}</small>`:""}</dt>
        <dd>${esc(x.d)}${x.g?`<span class="gin"><b>Oyunda:</b> ${esc(x.g)}</span>`:""}</dd></div>`).join("")}</dl></section>`).join("")}
      <p class="gnone" hidden>Bu aramayla eşleşen terim yok.</p></div>`;
}
function filter(d,q){
  const f=fold(q.trim());let any=false;
  d.querySelectorAll(".gterm").forEach(e=>{const ok=!f||e.dataset.q.includes(f);e.hidden=!ok;any=any||ok;});
  d.querySelectorAll(".glist section").forEach(s=>s.hidden=!s.querySelector(".gterm:not([hidden])"));
  d.querySelector(".gnone").hidden=any;
}
export function openGlossary(k){
  const d=document.getElementById("glossDlg");if(!d)return;
  if(!d.firstChild){d.innerHTML=glossHtml();d.querySelector(".hclose").onclick=()=>d.close();
    const inp=d.querySelector(".gsearch");inp.oninput=()=>filter(d,inp.value);}
  const inp=d.querySelector(".gsearch");inp.value="";filter(d,"");
  d.showModal();
  const t=k&&d.querySelector(`#g-${CSS.escape(k)}`);
  if(t){t.scrollIntoView({block:"center"});t.classList.remove("hit");void t.offsetWidth;t.classList.add("hit");d.querySelector(".hclose").focus();}
  // dokunmatikte arama kutusuna odak ekran klavyesini açıp listeyi örter
  else{d.scrollTop=0;(coarse.matches?d.querySelector(".hclose"):inp).focus();}
}

function notesHtml(){
  return `<div class="hhead"><h3 id="notesTitle">Sürüm notları</h3><button type="button" class="hclose" aria-label="Kapat">✕</button></div>
    <p class="hsub">Oyunda neler değişti; en yenisi üstte.</p>
    ${NOTES.map((n,i)=>`<details class="rel"${i===0?" open":""}><summary><b>${esc(n.t)}</b> <time datetime="${n.id.slice(0,10)}">${dateTR(n.id)}</time></summary>
      <ul>${n.items.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></details>`).join("")}`;
}
export function openNotes(){
  const d=document.getElementById("notesDlg");if(!d)return;
  if(!d.firstChild){d.innerHTML=notesHtml();d.querySelector(".hclose").onclick=()=>d.close();}
  d.showModal();d.querySelector(".hclose").focus();
  setSeen(LATEST);mark();
}
function mark(){
  const fresh=getSeen()<LATEST,b=document.getElementById("notesBtn"),tab=document.querySelector('[role="tab"][data-tab="ayar"]');
  if(b){b.classList.toggle("isnew",fresh);b.setAttribute("aria-label",fresh?"Sürüm notları (yeni)":"Sürüm notları");}
  if(tab)tab.classList.toggle("hasnew",fresh);
}

export function initHelp(){
  // ilk kez oynayan oyuncu için tüm notlar görülmüş sayılır
  if(!getSeen()&&!Object.keys(S.sites).length)setSeen(LATEST);
  mark();
  document.getElementById("glossBtn")?.addEventListener("click",()=>openGlossary());
  document.getElementById("notesBtn")?.addEventListener("click",openNotes);
  document.addEventListener("click",e=>{const g=e.target.closest("[data-gloss]");if(!g)return;e.preventDefault();openGlossary(g.dataset.gloss);});
}
