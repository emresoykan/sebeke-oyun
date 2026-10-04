// --- Geri bildirim: bildirim balonları, kutlama, gün sonu kazancı ve isteğe bağlı ses ---
import { fmt$ } from "../utils.js";

const reduced=matchMedia("(prefers-reduced-motion: reduce)");
const SOUND_KEY="sebeke-sound";
let soundOn=(()=>{try{return localStorage.getItem(SOUND_KEY)==="1";}catch(e){return false;}})();
let ctx=null;

// Balonlar "popover" olarak üst katmanda gösterilir; böylece açık bir pencerenin (olay kartı) üstünde de görünür
function box(){let el=document.getElementById("toasts");if(!el){el=document.createElement("div");el.id="toasts";el.setAttribute("aria-live","polite");el.popover="manual";document.body.appendChild(el);}
  if(el.showPopover){try{if(el.matches(":popover-open"))el.hidePopover();el.showPopover();}catch(e){}}return el;}

export function toast(title,sub="",kind=""){
  const el=document.createElement("div");el.className=`toast ${kind}`;
  el.innerHTML=`<b></b>${sub?"<span></span>":""}`;el.querySelector("b").textContent=title;if(sub)el.querySelector("span").textContent=sub;
  const b=box();b.appendChild(el);while(b.children.length>4)b.firstChild.remove();
  setTimeout(()=>{el.classList.add("out");setTimeout(()=>el.remove(),400);},kind==="win"?4200:3200);
  return el;
}

// Görev ve rozet: parlayan balon, küçük konfeti patlaması ve ses
export function celebrate(title,sub){
  const el=toast(title,sub,"win");sfx("win");
  if(reduced.matches)return;
  const cols=["#F2B42C","#5AA2E0","#3CC495","#A58BEA","#F06A7D"];
  for(let i=0;i<18;i++){const p=document.createElement("i");p.className="confetti";const a=Math.random()*Math.PI*2,r=40+Math.random()*60;
    p.style.cssText=`--x:${Math.cos(a)*r}px;--y:${Math.sin(a)*r-30}px;background:${cols[i%cols.length]};animation-delay:${Math.random()*80}ms`;el.appendChild(p);}
}

// Gün sonu: kazanç balonu ve nakit göstergesinde renkli vuruş
export function dayFx(L){
  if(!L)return;
  const pos=L.net>=0;toast(`Gün ${L.dayNo} kapandı`,`Net ${pos?"+":""}${fmt$(L.net)}`,pos?"pos":"neg");
  const c=document.getElementById("cash");if(c){c.classList.remove("flash-pos","flash-neg");void c.offsetWidth;c.classList.add(pos?"flash-pos":"flash-neg");}
  if(pos&&L.net>0)sfx("coin");
}

// Kısa sesler Web Audio ile üretilir (dosya yok); varsayılan kapalı
export function sfx(type){
  if(!soundOn)return;
  try{ctx=ctx||new (window.AudioContext||window.webkitAudioContext)();
    const seq={coin:[[880,.06],[1320,.12]],win:[[660,.08],[880,.08],[1320,.2]],build:[[220,.08],[330,.1]],event:[[440,.12],[392,.18]]}[type]||[[600,.08]];
    let t=ctx.currentTime;seq.forEach(([f,d])=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type="triangle";o.frequency.value=f;
      g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.12,t+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t+d);
      o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+d+0.02);t+=d*0.8;});
  }catch(e){}
}
export function initSound(btn){
  const lbl=()=>{btn.textContent=soundOn?"Ses: açık":"Ses: kapalı";btn.setAttribute("aria-pressed",soundOn);};
  lbl();btn.onclick=()=>{soundOn=!soundOn;try{localStorage.setItem(SOUND_KEY,soundOn?"1":"0");}catch(e){}lbl();sfx("coin");};
}
