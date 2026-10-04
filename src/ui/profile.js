// --- Oyuncu profili arayüzü: başlıktaki rozet, ilk açılışta şirket kurma formu ve profil penceresi ---
import { S } from "../state.js";
import { TECH } from "../config.js";
import { getProfile, saveProfile, SPECS, COLORS, initials, titleOf, ACH, marketCount } from "../profile.js";
import { TIERS, TIER_ORDER, tierOf } from "../equipment.js";
import { netWorth } from "../sim.js";
import { fmt$ } from "../utils.js";

const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const dlg=()=>document.getElementById("profileDlg");
let onCreated=null;

export function renderProfileChip(){
  const el=document.getElementById("profileBtn"),P=getProfile();if(!el)return;
  if(!P){el.innerHTML=`<span class="avatar">?</span><span><b>Profil oluştur</b></span>`;return;}
  const t=titleOf(netWorth());
  el.innerHTML=`<span class="avatar" style="background:${P.color}">${esc(initials(P.company))}</span><span><b>${esc(P.company)}</b><small>${t.n} • ${SPECS[P.spec].n}</small></span>`;
}

// Şirket kurma / düzenleme formu. Uzmanlık yalnızca oyun başında (henüz santral yokken) seçilebilir.
function formHtml(P){
  const locked=!!P&&(S.plants.length>0||S.dayNo>1),cur=P||{name:"",company:"",color:COLORS[0],spec:"eng"};
  return `<form method="dialog" class="pform">
    <h3>${P?"Profili düzenle":"Şirketini kur"}</h3>
    ${P?"":`<p class="pmuted">Yenilenebilir enerji şirketinin adını koy ve uzmanlığını seç. Uzmanlık oyunun bir mekaniğini sana kolaylaştırır.</p>`}
    <label>Adın<input name="name" required maxlength="24" autocomplete="nickname" value="${esc(cur.name)}"></label>
    <label>Şirket adı<input name="company" required maxlength="28" value="${esc(cur.company)}"></label>
    <fieldset class="pcolors"><legend>Şirket rengi</legend>${COLORS.map(c=>`<label><input type="radio" name="color" value="${c}" ${c===cur.color?"checked":""}><span style="background:${c}"></span></label>`).join("")}</fieldset>
    <fieldset class="pspecs" ${locked?"disabled":""}><legend>Uzmanlık${locked?" (oyun başladı, değiştirilemez)":""}</legend>
      ${Object.entries(SPECS).map(([k,v])=>`<label><input type="radio" name="spec" value="${k}" ${k===cur.spec?"checked":""}><span><b>${v.n}</b><small>${v.d}</small></span></label>`).join("")}</fieldset>
    <div class="pact">${P?`<button value="cancel" formnovalidate>Vazgeç</button>`:""}<button class="pri" value="ok">${P?"Kaydet":"Başla"}</button></div>
  </form>`;
}
function openForm(P){
  const d=dlg();d.innerHTML=formHtml(P);
  const f=d.querySelector("form");
  f.onsubmit=e=>{
    if(e.submitter&&e.submitter.value==="cancel"){openView();e.preventDefault();return;}
    const v=new FormData(f),name=String(v.get("name")).trim(),company=String(v.get("company")).trim();
    if(!name||!company){e.preventDefault();return;}
    saveProfile({name,company,color:v.get("color")||COLORS[0],spec:P&&f.querySelector(".pspecs").disabled?P.spec:(v.get("spec")||"eng"),created:P?P.created:Date.now()});
    renderProfileChip();
    if(!P&&onCreated){const cb=onCreated;onCreated=null;cb();}
  };
  // ilk kurulumda pencere formu doldurmadan kapatılamaz
  d.oncancel=e=>{if(!getProfile())e.preventDefault();};
  if(!d.open)d.showModal();
  d.scrollTop=0;
}

function openView(){
  const P=getProfile(),d=dlg();if(!P)return openForm(null);
  const nw=netWorth(),t=titleOf(nw),st=S.stats,mw=S.plants.reduce((a,p)=>a+p.mw,0),got=new Set(S.ach);
  const byTier=TIER_ORDER.map(q=>[q,S.plants.filter(p=>tierOf(p)===q).reduce((a,p)=>a+p.mw,0)]);
  const byTech=Object.keys(TECH).map(k=>[k,S.plants.filter(p=>p.k===k).reduce((a,p)=>a+p.mw,0)]).filter(x=>x[1]);
  d.innerHTML=`<div class="pview">
    <div class="phead"><span class="avatar big" style="background:${P.color}">${esc(initials(P.company))}</span>
      <div><h3>${esc(P.company)}</h3><div class="pmuted">${esc(P.name)} • ${SPECS[P.spec].n}</div></div></div>
    <div class="ptitle"><div><b>${t.n}</b>${t.next?`<span class="pmuted"> → ${t.next} (${fmt$(t.need)} portföy)</span>`:""}</div><div class="goal"><div style="width:${Math.round(t.pct*100)}%"></div></div></div>
    <div class="pmuted pspec">${SPECS[P.spec].d}</div>
    <div class="pstats">
      <div><small>Portföy değeri</small><b>${fmt$(nw)}</b></div><div><small>Gün</small><b>${S.dayNo}</b></div>
      <div><small>Kurulu güç</small><b>${mw} MW</b></div><div><small>Saha / piyasa</small><b>${Object.keys(S.sites).length} / ${marketCount(S)}</b></div>
      <div><small>Toplam üretim</small><b>${Math.round(st.mwh).toLocaleString("tr-TR")} MWh</b></div><div><small>Toplam net gelir</small><b class="${st.net<0?"neg":"pos"}">${fmt$(st.net)}</b></div>
      <div><small>En iyi gün</small><b>${st.best?`${fmt$(st.best.net)} (Gün ${st.best.day})`:"–"}</b></div><div><small>Arıza</small><b>${st.outages}</b></div>
    </div>
    ${mw?`<h4>Filo</h4><div class="pfleet">${byTech.map(([k,v])=>`<span style="--c:var(${TECH[k].c})">${TECH[k].n} ${v} MW</span>`).join("")}</div>
      <div class="pfleet tiers">${byTier.filter(x=>x[1]).map(([q,v])=>`<span class="t-${q}">${TIERS[q]} ${v} MW</span>`).join("")}</div>`:""}
    <h4>Rozetler <span class="pmuted">${got.size}/${ACH.length}</span></h4>
    <ul class="pach">${ACH.map(a=>`<li class="${got.has(a.id)?"on":""}" title="${esc(a.d)}"><b>${a.n}</b><small>${a.d}</small></li>`).join("")}</ul>
    <div class="pact"><button data-a="edit">Profili düzenle</button><button class="pri" data-a="close">Kapat</button></div>
  </div>`;
  d.querySelector('[data-a="edit"]').onclick=()=>openForm(P);
  d.querySelector('[data-a="close"]').onclick=()=>d.close();
  d.oncancel=null;
  if(!d.open)d.showModal();
  d.scrollTop=0;d.querySelector('[data-a="close"]').focus({preventScroll:true});
}

// Başlıktaki rozet profili açar; profil yoksa şirket kurma formu açılır ve oyun form doldurulunca başlar
export function initProfile(start){
  document.getElementById("profileBtn").onclick=()=>openView();
  dlg().addEventListener("click",e=>{if(e.target===dlg()&&getProfile())dlg().close();}); // dışına tıklayınca kapat
  renderProfileChip();
  if(getProfile())start();else{onCreated=start;openForm(null);}
}
