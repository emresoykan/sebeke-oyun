// --- Ortam sesi: rüzgâr, yağmur, gök gürültüsü ve türbin uğultusu (WebAudio ile üretilir, ses dosyası yok) ---
// Ses kameranın bulunduğu noktanın havasından ve yüksekliğinden hesaplanır: yere yaklaştıkça rüzgâr ve yağmur duyulur,
// uzayda yalnızca hafif bir uğultu kalır. Oyuncunun rüzgâr sahasına birkaç km yaklaşınca kanat geçişleriyle (saniyede
// ~0,6-0,9) dalgalanan türbin sesi eklenir. "Ses" düğmesi kapalıyken hiçbir şey çalmaz.
import { S, D } from "../state.js";
import { clamp, prof } from "../utils.js";
import { km } from "../world.js";
import { sampleWx, siteBase } from "../weather.js";
import { snap, frac } from "../wxsite.js";
import { plantStatus } from "../plantstatus.js";
import { camInfo } from "./map.js";
import { isSoundOn } from "./fx.js";

let ctx=null,N=null,timer=null,nextThunder=0;

function noiseBuf(c){
  // kahverengi gürültü: düşük frekanslı, rüzgâra benzer
  const n=c.sampleRate*4,b=c.createBuffer(1,n,c.sampleRate),d=b.getChannelData(0);let last=0;
  for(let i=0;i<n;i++){const w=Math.random()*2-1;last=(last+0.02*w)/1.02;d[i]=last*3.5;}
  return b;
}
function src(buf){const s=ctx.createBufferSource();s.buffer=buf;s.loop=true;s.loopStart=Math.random()*3;s.start(0,Math.random()*3);return s;}
function chain(...n){for(let i=0;i<n.length-1;i++)n[i].connect(n[i+1]);return n[n.length-1];}

function build(){
  ctx=new (window.AudioContext||window.webkitAudioContext)();
  const buf=noiseBuf(ctx),white=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),wd=white.getChannelData(0);
  for(let i=0;i<wd.length;i++)wd[i]=Math.random()*2-1;
  const master=ctx.createGain();master.gain.value=0.7;master.connect(ctx.destination);
  const g=()=>{const x=ctx.createGain();x.gain.value=0;return x;};
  // rüzgâr: bant geçiren süzgecin merkezi yavaş bir LFO ile oynar (esinti)
  const wf=ctx.createBiquadFilter();wf.type="bandpass";wf.frequency.value=500;wf.Q.value=0.7;
  const gust=ctx.createOscillator(),gd=ctx.createGain();gust.frequency.value=0.13;gd.gain.value=180;chain(gust,gd,wf.frequency);gust.start();
  const wind=g();chain(src(buf),wf,wind,master);
  // atmosfer uğultusu (yüksekten bakarken)
  const af=ctx.createBiquadFilter();af.type="lowpass";af.frequency.value=160;const air=g();chain(src(buf),af,air,master);
  // yağmur: yüksek geçiren beyaz gürültü
  const rf=ctx.createBiquadFilter();rf.type="highpass";rf.frequency.value=1800;const rain=g();chain(src(white),rf,rain,master);
  // türbin: alçak bant gürültü, kanat geçiş frekansında genlik dalgası
  const tf=ctx.createBiquadFilter();tf.type="bandpass";tf.frequency.value=260;tf.Q.value=1.1;const turb=g();
  const blade=ctx.createOscillator(),bd=ctx.createGain();blade.frequency.value=0.7;bd.gain.value=0;chain(blade,bd,turb.gain);blade.start();
  chain(src(buf),tf,turb,master);
  N={master,wind,wf,air,rain,turb,blade,bd,buf};
}
function thunder(level){
  const t=ctx.currentTime,s=ctx.createBufferSource();s.buffer=N.buf;
  const f=ctx.createBiquadFilter();f.type="lowpass";f.frequency.value=120+Math.random()*80;const g=ctx.createGain();
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.5*level,t+0.15+Math.random()*0.3);g.gain.exponentialRampToValueAtTime(0.0001,t+3+Math.random()*2);
  chain(s,f,g,N.master);s.start(t,Math.random()*2);s.stop(t+5.5);
}
const set=(p,v)=>p.setTargetAtTime(v,ctx.currentTime,0.6);

function update(){
  if(!ctx||!N)return;
  const c=camInfo();if(!c||!D.wxf)return;
  // yükseklik etkisi: 300 m'de ~1, 30 km'de ~0,45, 3000 km'de 0
  const alt=clamp(1-(Math.log10(Math.max(c.h,200))-2.5)/3.5,0,1);
  const w=sampleWx(snap(Math.min(S.hour,23),frac()),c.lat,c.lon,siteBase({lat:c.lat,lon:c.lon,wind:0.45,solar:0.5}));
  const v=w.v*prof(Math.min(S.hour,23))/0.85;
  set(N.wind.gain,(0.03+0.32*clamp(v/16,0,1.3))*alt);
  set(N.wf.frequency,350+28*clamp(v,0,25));
  set(N.air.gain,0.05*(1-alt)+0.01);
  set(N.rain.gain,0.16*clamp(w.rain,0,1)*alt*alt);
  // en yakın oyuncu rüzgâr sahası
  let best=0,bf=0;
  Object.entries(S.sites).forEach(([id,o])=>{
    if(!S.plants.some(p=>p.t===id&&(p.k==="res"||p.k==="off")))return;
    const d=Math.hypot(km(c.lat,c.lon,o.lat,o.lon),c.h/1000),near=clamp(1-(d-0.4)/4,0,1);if(near<=best)return;
    const st=plantStatus(id),x=st.res||st.off;best=near;bf=x?x.f:0;});
  const tl=0.22*best*best*(bf>0.03?0.4+0.6*bf:0);
  set(N.turb.gain,tl*0.6);set(N.bd.gain,tl*0.4);set(N.blade.frequency,0.55+0.35*bf);
  // fırtınada ara ara gök gürültüsü
  const now=performance.now();
  if(w.storm>0.35&&alt>0.25&&now>nextThunder){if(nextThunder)thunder(clamp(w.storm,0,1)*alt);nextThunder=now+5000+Math.random()*14000;}
}

function apply(){
  const on=isSoundOn()&&!document.hidden;
  if(on){if(!ctx)build();if(ctx.state==="suspended")ctx.resume().catch(()=>{});if(!timer)timer=setInterval(update,250);update();}
  else{if(timer){clearInterval(timer);timer=null;}if(ctx&&ctx.state==="running")ctx.suspend().catch(()=>{});}
}
export function initAmbient(){
  window.addEventListener("sebeke:sound",apply);
  document.addEventListener("visibilitychange",apply);
  // ses önceki oturumdan açık kaldıysa tarayıcı ilk dokunuşa kadar çalmaya izin vermez
  const first=()=>{apply();window.removeEventListener("pointerdown",first);window.removeEventListener("keydown",first);};
  window.addEventListener("pointerdown",first);window.addEventListener("keydown",first);
  if(import.meta.env.DEV)window.__amb=()=>N&&{ctx:ctx.state,wind:N.wind.gain.value,rain:N.rain.gain.value,turb:N.turb.gain.value,air:N.air.gain.value};
}
