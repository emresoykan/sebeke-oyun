// --- Sahalardaki santral görselleri: haritada canlandırmalı SVG işaretçileri ---
// Hareketler simülasyona bağlıdır: rüzgâr gülleri o saatin rüzgârıyla döner, paneller güneşle parlar,
// HES planlı üretim saatlerinde su bırakır, batarya şarj/deşarj durumunu ve doluluğunu gösterir.
import * as maplibregl from "maplibre-gl";
import { S, D } from "../state.js";
import { clamp, shape, prof } from "../utils.js";

const markers=new Map(); // saha id -> {marker, el, sig, rotors}
let uid=0;

// Tek bir rüzgâr türbini: kule, gövde ve kendi göbeği etrafında dönen üç kanat
function turbine(x,hubY,len,delay,sea){
  const blade=a=>`<path transform="translate(${x} ${hubY}) rotate(${a})" d="M0 0C1.1-2.6 .9-${len*0.7} 0-${len}C-.6-${len*0.7}-.8-2.6 0 0Z"/>`;
  return `<path class="tower" d="M${x-1.1} ${sea?43:46}L${x-.45} ${hubY}H${x+.45}L${x+1.1} ${sea?43:46}Z"/>`+
    (sea?`<rect x="${x-1.4}" y="40.5" width="2.8" height="3.5" fill="#F2C94C"/>`:"")+
    `<rect class="nacelle" x="${x-1.6}" y="${hubY-1.1}" width="3.2" height="2.2" rx=".8"/>`+
    `<circle class="beacon" cx="${x}" cy="${hubY-1.4}" r=".7"/>`+
    `<g class="rotor" style="transform-origin:${x}px ${hubY}px">${blade(0)}${blade(120)}${blade(240)}<circle cx="${x}" cy="${hubY}" r="1"/></g>`;
}
function windSVG(mw,sea){
  const n=mw>=30?3:mw>=15?2:1, W=12+16*n, hs=[[19],[18,21],[17,20,22]][n-1];
  let wave="";for(let x=-12;x<W+12;x+=5)wave+="q2.5-1.6 5 0";
  const waves=sea?`<g class="waves"><path d="M-12 45${wave}"/><path d="M-9 47${wave}" opacity=".6"/></g>`:"";
  return `<svg viewBox="0 0 ${W} 48" class="v v-wind" style="width:${(W/48*52).toFixed(1)}px">${waves}`+
    hs.map((hh,i)=>turbine(14+16*i,46-hh-(sea?3:0)-5,7.2,0,sea)).join("")+`</svg>`;
}
function solarSVG(mw){
  const n=mw>=30?3:mw>=15?2:1, id="gc"+(++uid), rows=[];
  for(let i=0;i<n;i++){const y=44-i*6.5,x=4+i*3;rows.push(`M${x} ${y}L${x+24} ${y}L${x+28} ${y-5}L${x+4} ${y-5}Z`);}
  const d=rows.join("");
  const grid=rows.map((_,i)=>{const y=44-i*6.5,x=4+i*3;let g="";for(let k=1;k<6;k++)g+=`M${x+k*4} ${y}L${x+k*4+4} ${y-5}`;return g+`M${x+2} ${y-2.5}L${x+26} ${y-2.5}`;}).join("");
  return `<svg viewBox="0 0 40 48" class="v v-solar"><defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs>`+
    rows.map((_,i)=>{const y=44-i*6.5,x=4+i*3;return `<path class="leg" d="M${x+4} ${y}V${y+2}M${x+22} ${y}V${y+2}"/>`;}).join("")+
    `<path class="panel" d="${d}"/><path class="pgrid" d="${grid}"/>`+
    `<g clip-path="url(#${id})"><rect class="glint" x="-8" y="20" width="5" height="30"/></g></svg>`;
}
function hydroSVG(){
  return `<svg viewBox="0 0 40 48" class="v v-hydro">`+
    `<path class="lake" d="M0 24Q6 22 14 23L18 23L18 40L0 40Z"/>`+
    `<path class="dam" d="M16 20L22 20L27 41L13 41Z"/><path class="damline" d="M17 25H22.5M16.5 30H23.7M15.5 35H25"/>`+
    `<path class="river" d="M24 46Q30 43 40 44V48H22Z"/>`+
    `<g class="flow"><path d="M23 37V46"/><path d="M25 37V46"/><path d="M21 37V46"/></g></svg>`;
}
function battSVG(mw){
  const n=mw>=20?2:1, boxes=[];
  for(let i=0;i<n;i++){const x=3+i*15;boxes.push(`<rect class="cont" x="${x}" y="32" width="13" height="12" rx="1"/>`+[3,6,9].map(k=>`<path class="rib" d="M${x+k} 34V42"/>`).join(""));}
  return `<svg viewBox="0 0 40 48" class="v v-batt">${boxes.join("")}`+
    `<rect class="gauge" x="32" y="22" width="6" height="22" rx="1.2"/><rect class="cap" x="33.6" y="20.5" width="2.8" height="1.6" rx=".5"/>`+
    `<rect class="lvl" x="33" y="23" width="4" height="20" rx=".6"/>`+
    `<path class="bolt" d="M11 19L7 27H10.5L9 33L14.5 24.5H11L13 19Z"/></svg>`;
}

const KIND={ges:"solar",res:"wind",off:"wind",hes:"hydro",batt:"batt"};
function build(ps){
  const by={};ps.forEach(p=>by[p.k]=(by[p.k]||0)+p.mw);
  return ["res","off","ges","hes","batt"].filter(k=>by[k]).map(k=>
    `<div class="vig" data-k="${k}">`+(k==="res"?windSVG(by[k],false):k==="off"?windSVG(by[k],true):k==="ges"?solarSVG(by[k]):k==="hes"?hydroSVG():battSVG(by[k]))+`</div>`).join("");
}

// Santral listesindeki değişikliğe göre işaretçileri oluştur, güncelle veya kaldır
export function syncScenes(map,onSelect){
  const live=new Set();
  Object.entries(S.sites).forEach(([id,o])=>{
    const ps=S.plants.filter(p=>p.t===id);if(!ps.length)return;live.add(id);
    const sig=ps.map(p=>p.k+p.mw).sort().join(",");let m=markers.get(id);
    if(!m){
      const el=document.createElement("div");el.className="site3d-root";el.innerHTML=`<div class="site3d"></div>`;
      el.addEventListener("click",e=>{e.stopPropagation();onSelect(id);});
      const marker=new maplibregl.Marker({element:el,anchor:"bottom",offset:[0,-11],opacityWhenCovered:0}).setLngLat([o.lon,o.lat]).addTo(map);
      m={marker,el,sig:null};markers.set(id,m);
    }
    if(m.sig!==sig){m.el.firstChild.innerHTML=build(ps);m.sig=sig;
      m.rotors=[...m.el.querySelectorAll(".rotor")].map(el=>({el,v:el.closest(".vig"),a:Math.random()*120,w:0,f:0.9+Math.random()*0.2}));}
  });
  for(const [id,m] of markers)if(!live.has(id)){m.marker.remove();markers.delete(id);}
  animateScenes();
  if(markers.size&&!spinning&&!reduced.matches){spinning=true;last=performance.now();requestAnimationFrame(spin);}
}

// Kanat dönüşü: her rotor hedef hıza ataletle yaklaşır (gerçek türbin gibi yavaşça hızlanır/durur)
const reduced=matchMedia("(prefers-reduced-motion: reduce)");
let spinning=false,last=0;
function spin(t){
  const dt=Math.min(0.1,(t-last)/1000);last=t;
  for(const m of markers.values())for(const r of m.rotors){
    const target=(r.v._target||0)*r.f;r.w+=(target-r.w)*Math.min(1,dt*0.8);r.a=(r.a+r.w*dt)%360;
    r.el.style.transform=`rotate(${r.a.toFixed(1)}deg)`;}
  if(markers.size)requestAnimationFrame(spin);else spinning=false;
}

// Her saat adımında: üretim durumuna göre hız, parlaklık, akış ve şarj göstergelerini ayarla
export function animateScenes(){
  if(!markers.size||!D.st)return;
  const h=Math.min(S.hour,23), night=shape(h)===0;
  for(const [id,m] of markers){
    const o=S.sites[id],M=D[o.mreg];if(!M)continue;
    m.el.classList.toggle("night",night);
    m.el.querySelectorAll(".vig").forEach(v=>{
      const k=v.dataset.k;
      if(k==="res"||k==="off"){const f=clamp(o.wind*M.windDay*prof(h),0,1);
        v._target=f<0.03?0:90+330*f;v.title=f<0.03?"Rüzgâr yok: türbinler durdu":`Rüzgâr: kapasitenin %${Math.round(f*100)}'i`;}
      else if(k==="ges"){const irr=o.solar*shape(h)*M.sun,curt=irr>0&&M.price[h]<=0;
        v.classList.toggle("idle",irr<0.03);v.classList.toggle("curt",curt);v.style.setProperty("--sun",clamp(irr*1.3,0,1).toFixed(2));
        v.title=curt?"Fiyat sıfır: üretim kısıldı":irr<0.03?"Gece: üretim yok":`Güneş: kapasitenin %${Math.round(irr*100)}'i`;}
      else if(k==="hes"){const p=S.plants.find(q=>q.t===id&&q.k==="hes"),run=!!(p&&p.plan&&p.plan[h]>0);
        v.classList.toggle("idle",!run);v.title=run?"Türbinler çalışıyor":"Su biriktiriliyor";}
      else if(k==="batt"){const p=S.plants.find(q=>q.t===id&&q.k==="batt"),cap=p.mw*2,soc=clamp((p.soc||0)/cap,0,1);
        const chg=M.plan[h]===1&&soc<1,dis=M.plan[h]===-1&&soc>0;
        v.classList.toggle("chg",chg);v.classList.toggle("dis",dis);v.style.setProperty("--soc",Math.max(0.04,soc).toFixed(2));
        v.title=`Doluluk %${Math.round(soc*100)}`+(chg?" • şarj oluyor":dis?" • deşarj ediyor":"");}
    });
  }
}

// Yakınlaştırmaya göre görsel boyutu; çok uzakta gizle
export function scaleScenes(map){
  const z=map.getZoom(),c=map.getContainer();
  c.style.setProperty("--site-scale",clamp((z-1.2)/3.4,0.5,1.5).toFixed(2));
  c.classList.toggle("scenes-off",z<2);
}
