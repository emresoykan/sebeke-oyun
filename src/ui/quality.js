// --- Grafik kalitesi: Yüksek / Dengeli / Düşük, varsayılan otomatik ---
// Otomatik modda ekran kartı adına bakılır: dahili Intel HD/UHD kartlarında 4x kenar yumuşatma (MSAA) çok yavaştır
// (Chrome bu kartlarda MSAA'yı "yavaş" olarak işaretler), bu yüzden onlarda ve giriş seviyesi GeForce MX/9xxM kartlarda
// Dengeli ile başlanır; yazılımla çizimde Düşük.
// Oyun açıldıktan sonra kare hızı uzun süre 20'nin altında kalırsa bir kademe düşülür.
import { toast } from "./fx.js";

const KEY="sebeke-gfx";
// msaa: kenar yumuşatma örnek sayısı; px: en fazla piksel oranı (1 = CSS pikseli); sse: Google 3D ayrıntı eşiği
// (büyüdükçe daha az ayrıntı yüklenir); idle: kamera dururken kare hızı
export const LEVELS={
  high:{n:"Yüksek",msaa:4,px:2,fxaa:false,shadows:true,sse:16,idle:30},
  med:{n:"Dengeli",msaa:1,px:1,fxaa:true,shadows:true,sse:24,idle:30},
  low:{n:"Düşük",msaa:1,px:0.8,fxaa:true,shadows:false,sse:40,idle:24}
};
const ORDER=["high","med","low"];
const read=()=>{try{return localStorage.getItem(KEY)||"auto";}catch(e){return "auto";}};
let mode=read(),autoLevel=null,listeners=[];

export function gpuName(){
  try{const gl=document.createElement("canvas").getContext("webgl");const x=gl&&gl.getExtension("WEBGL_debug_renderer_info");
    return x?String(gl.getParameter(x.UNMASKED_RENDERER_WEBGL)):"";}catch(e){return "";}
}
function detect(){
  const g=gpuName();
  if(/SwiftShader|llvmpipe|Basic Render|Software/i.test(g))return "low";
  if(/Intel.*(HD|UHD) Graphics|GeForce (MX ?\d{3}|9\d0M|GT \d{3})|Mali-[GT]?[0-7]\d|Adreno.*\b[3-5]\d\d\b|PowerVR/i.test(g))return "med";
  return "high";
}
export const gfxKey=()=>mode==="auto"?(autoLevel||(autoLevel=detect())):mode;
export const gfx=()=>LEVELS[gfxKey()];
export const onGfx=fn=>listeners.push(fn);
const emit=()=>{listeners.forEach(f=>f(gfx()));label();};

let btn=null;
function label(){if(!btn)return;btn.textContent=`Grafik: ${mode==="auto"?"Otomatik ("+gfx().n+")":LEVELS[mode].n}`;}
export function initGfxToggle(b){
  btn=b;label();
  b.onclick=()=>{const seq=["auto",...ORDER],i=seq.indexOf(mode);mode=seq[(i+1)%seq.length];if(mode==="auto")autoLevel=detect();
    try{localStorage.setItem(KEY,mode);}catch(e){}emit();};
}

// Kare hızı izleme (yalnızca otomatik modda): açılıştan 12 sn sonra başlar, 6 sn'lik pencerelerde ölçer
let frames=0,winStart=0,started=0,lowWins=0;
export function frameTick(now){
  if(mode!=="auto"||document.hidden){winStart=0;return;}
  if(!started)started=now;if(now-started<12000)return;
  if(!winStart){winStart=now;frames=0;return;}
  frames++;
  if(now-winStart<6000)return;
  const fps=frames*1000/(now-winStart);winStart=0;
  lowWins=fps<20?lowWins+1:0;
  const k=gfxKey(),i=ORDER.indexOf(k);
  if(lowWins>=2&&i<ORDER.length-1){autoLevel=ORDER[i+1];lowWins=0;emit();
    toast(`Grafik kalitesi: ${gfx().n}`,`Kare hızı düşük kaldığı için ayrıntı azaltıldı (${Math.round(fps)} kare/sn). Alttaki "Grafik" düğmesiyle değiştirebilirsin.`);}
}
