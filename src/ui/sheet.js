// --- Oyun paneli: sekmeler (Saha, Piyasa, Rapor, Ayarlar), mobilde alttan açılan kart, "Sahalarım" listesi, onay penceresi ---
// Masaüstünde panel haritanın sağında sabit durur; mobilde ekranın altında küçük bir şerit (sekmeler) olarak bekler,
// seçim yapılınca yarıya kadar açılır. Tutamağa dokunmak veya sürüklemek kartı büyütür/küçültür.
import { S } from "../state.js";
import { TECH } from "../config.js";
import { cssv } from "../utils.js";
import { siteMW } from "../sim.js";

const mobile=matchMedia("(max-width:899.98px)");
const side=()=>document.getElementById("side");
const STATES=["peek","half","full"];
let onTab=null;

export function setTab(t){
  const sd=side();if(!sd)return;
  sd.querySelectorAll(".tabs [role=tab]").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tab===t)));
  sd.querySelectorAll(".tabp").forEach(p=>p.hidden=p.dataset.tab!==t);
  if(onTab)onTab(t);
}
export function setSheet(st){const sd=side();if(sd&&mobile.matches&&sd.dataset.state!==st){sd.dataset.state=st;window.dispatchEvent(new CustomEvent("sebeke:sheet"));}}
export const sheetState=()=>side()?.dataset.state||"peek";
// Seçim yapılınca: Saha sekmesi; mobilde kart yarıya açılır, masaüstünde panel başa kaydırılır
export function openSheet(tab="saha"){
  setTab(tab);
  if(mobile.matches){if(sheetState()==="peek")setSheet("half");}
  else{const sd=side();if(sd)sd.scrollTo({top:0,behavior:"smooth"});}
}
export function collapseSheet(){setSheet("peek");}

export function initSheet(opts={}){
  const sd=side();if(!sd)return;onTab=opts.onTab||null;
  sd.querySelectorAll(".tabs [role=tab]").forEach(b=>b.onclick=()=>{setTab(b.dataset.tab);if(mobile.matches&&sheetState()==="peek")setSheet("half");});
  const grip=document.getElementById("grip");
  // tutamak: dokununca bir sonraki duruma geçer; dikey sürükleme yukarı büyütür, aşağı küçültür
  let y0=null,moved=false;
  grip.addEventListener("pointerdown",e=>{y0=e.clientY;moved=false;grip.setPointerCapture(e.pointerId);});
  grip.addEventListener("pointermove",e=>{if(y0!=null&&Math.abs(e.clientY-y0)>12)moved=true;});
  grip.addEventListener("pointerup",e=>{if(y0==null)return;const dy=e.clientY-y0,i=STATES.indexOf(sheetState());y0=null;
    if(!moved)setSheet(STATES[(i+1)%STATES.length]);else setSheet(STATES[Math.max(0,Math.min(2,i+(dy<0?1:-1)))]);});
  grip.addEventListener("pointercancel",()=>{y0=null;});
  // sekmeler şeridini yukarı kaydırmak da kartı açar
  const tabs=sd.querySelector(".tabs");let ty=null;
  tabs.addEventListener("touchstart",e=>{ty=e.touches[0].clientY;},{passive:true});
  tabs.addEventListener("touchend",e=>{if(ty==null)return;const dy=e.changedTouches[0].clientY-ty,i=STATES.indexOf(sheetState());ty=null;
    if(Math.abs(dy)>30)setSheet(STATES[Math.max(0,Math.min(2,i+(dy<0?1:-1)))]);},{passive:true});
  mobile.addEventListener("change",()=>{if(!mobile.matches)sd.dataset.state="peek";});
}

// "Sahalarım": kendi sahaların, dokununca o sahaya gidilir
export function renderMySites(go){
  const el=document.getElementById("mySites");if(!el)return;
  const ids=Object.keys(S.sites);el.hidden=!ids.length;if(!ids.length){el.innerHTML="";return;}
  el.innerHTML=ids.map(id=>{const o=S.sites[id],mw=siteMW(id),top=S.plants.filter(p=>p.t===id).sort((a,b)=>b.mw-a.mw)[0];
    const st=o.permit==="pending"?" • izin bekliyor":o.permit==="rejected"?" • izin reddedildi":o.permit!=="ok"?" • izin yok":"";
    return `<button data-id="${id}" aria-current="${S.sel.id===id}" style="--c:${top?cssv(TECH[top.k].c):"transparent"}"><i></i>${o.city}${mw?` • ${mw} MW`:""}${st}</button>`;}).join("");
  el.querySelectorAll("button").forEach(b=>b.onclick=()=>go(b.dataset.id));
}

// Onay penceresi: Promise<boolean>
// check verilirse pencerede bir onay kutusu çıkar ve sonuç {ok, checked} olur
export function confirmBox(title,text,ok="Evet",danger=false,check=null){
  const d=document.getElementById("confirmDlg");
  d.innerHTML=`<h3></h3><p></p>${check?'<label class="dlgcheck"><input type="checkbox"> <span></span></label>':""}<div class="dlgbtns"><button data-v="0">Vazgeç</button><button data-v="1" class="${danger?"dangerbtn":"pri"}"></button></div>`;
  d.querySelector("h3").textContent=title;d.querySelector("p").textContent=text;d.querySelector('[data-v="1"]').textContent=ok;
  if(check)d.querySelector(".dlgcheck span").textContent=check;
  const out=v=>check?{ok:v,checked:d.querySelector(".dlgcheck input").checked}:v;
  return new Promise(res=>{d.querySelectorAll("button").forEach(b=>b.onclick=()=>{d.close();res(out(b.dataset.v==="1"));});
    d.oncancel=()=>res(out(false));d.showModal();d.querySelector('[data-v="0"]').focus();});
}
