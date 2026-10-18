// --- Gerçek santraller katmanı (Türkiye, OpenStreetMap) ---
// Veri: public/data/plants-tr.json, scripts/build_osm_plants.py ile OSM'den üretilir (© OpenStreetMap katkıcıları, ODbL 1.0).
// Katman ilk açıldığında yüklenir. Düz haritada (map.js) GeoJSON çember katmanı, Apple haritasında (mapkit.js) bu modülün
// çizdiği karo görüntüleri kullanılır. Noktalar teknoloji renginde, gücün kareköküyle büyür; dokununca ad ve güç görünür.
// OSM gönüllü verisidir: santrallerin bir kısmı eksik ya da gücü yazılmamış olabilir. Lejant, OSM'de kayıtlı gücü TEİAŞ'ın
// 2025 kurulu gücüyle karşılaştırır.
const KEY="sebeke-realpl";
export const KINDS={w:["Rüzgâr","#5AA2E0"],s:["Güneş","#F2B42C"],h:["Hidro","#A58BEA"],g:["Doğalgaz","#9FB1BD"],c:["Kömür","#B08968"],
  o:["Petrol","#D98BB6"],j:["Jeotermal","#E8755A"],b:["Biyokütle, atık","#A6C44E"],n:["Nükleer","#F2E94C"],x:["Diğer, bilinmiyor","#D7DEE2"]};
// TEİAŞ 2025 yıl sonu kurulu güç (MW): kapsama oranı için
export const TEIAS_2025={w:14792,s:25927,h:32299,g:20027,c:21216,j:1758,b:2405,o:119};

let on=(()=>{try{return localStorage.getItem(KEY)==="1";}catch(e){return false;}})();
let data=null,loading=null;const listeners=new Set();
export const realOn=()=>on;
export const realData=()=>data;
export function onRealChange(f){listeners.add(f);}
const emit=()=>listeners.forEach(f=>f(on,data));

export function loadReal(){
  if(data||loading)return loading||Promise.resolve(data);
  loading=fetch(`${import.meta.env.BASE_URL}data/plants-tr.json`).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json();})
    .then(d=>{data=d;tiles.clear();return d;}).catch(e=>{console.warn("Gerçek santral verisi yüklenemedi:",e);loading=null;return null;});
  return loading;
}
export async function setReal(v){on=v;try{localStorage.setItem(KEY,v?"1":"0");}catch(e){}if(v)await loadReal();emit();label();legend();}

// nokta yarıçapı (piksel): gücün kareköküyle; gücü bilinmeyen küçük nokta
export const radiusOf=mw=>mw?Math.min(14,2.5+0.55*Math.sqrt(mw)):2.5;
export const kindOf=k=>KINDS[k]||KINDS.x;
export function infoText(p){
  const [,,k,mw,name,t]=p,[n]=kindOf(k);
  return `${name||`Adı yazılmamış ${n.toLowerCase()} santrali`} • ${n}${mw?` • ${mw>=10?Math.round(mw):mw.toLocaleString("tr-TR",{maximumFractionDigits:1})} MW`:" • gücü yazılmamış"}${t?` • ${t} türbin`:""} (OpenStreetMap)`;
}
// sayfa koordinatına en yakın santral (pagePoint: (lat,lon) → {x,y}); en çok maxPx uzaklıkta
export function realAt(x,y,pagePoint,maxPx=12){
  if(!on||!data)return null;let best=null,bd=maxPx*maxPx;
  for(const p of data.p){const q=pagePoint(p[0],p[1]);if(!q)continue;const d=(q.x-x)**2+(q.y-y)**2;if(d<bd){bd=d;best=p;}}
  return best;
}
// MapLibre için GeoJSON
export function realGeoJSON(){
  return {type:"FeatureCollection",features:(data?.p||[]).map((p,i)=>({type:"Feature",id:i,geometry:{type:"Point",coordinates:[p[1],p[0]]},
    properties:{k:p[2],mw:p[3]||0,r:radiusOf(p[3]),c:kindOf(p[2])[1],n:p[4]||"",i}}))};
}

// Apple haritası için karo görüntüsü (256 px, Web Mercator); önbellekli
const tiles=new Map();
const lon2x=(lon,z)=>(lon+180)/360*256*2**z,lat2y=(lat,z)=>{const s=Math.sin(lat*Math.PI/180);return (0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*256*2**z;};
export function realTileURL(z,x,y){
  if(!on||!data)return null;const key=`${z}/${x}/${y}`;if(tiles.has(key))return tiles.get(key);
  const x0=x*256,y0=y*256,sc=z<5?0.7:z<7?0.85:1,cv=document.createElement("canvas");cv.width=cv.height=256;const g=cv.getContext("2d");let n=0;
  for(let i=data.p.length-1;i>=0;i--){const p=data.p[i],px=lon2x(p[1],z)-x0,py=lat2y(p[0],z)-y0,r=radiusOf(p[3])*sc;
    if(px<-r||py<-r||px>256+r||py>256+r)continue;
    g.beginPath();g.arc(px,py,r,0,Math.PI*2);g.fillStyle=kindOf(p[2])[1];g.globalAlpha=0.85;g.fill();g.globalAlpha=1;g.lineWidth=1;g.strokeStyle="rgba(10,15,25,.85)";g.stroke();n++;}
  const u=n?cv.toDataURL("image/png"):null;tiles.set(key,u);if(tiles.size>400)tiles.delete(tiles.keys().next().value);return u;
}

// --- Düğme ve lejant ---
function label(){const b=document.getElementById("realBtn");if(!b)return;b.setAttribute("aria-pressed",String(on));b.classList.toggle("on",on);}
function legend(){
  const mw=document.getElementById("mapwrap");if(!mw)return;let el=document.getElementById("realLegend");
  if(!on){if(el)el.hidden=true;return;}
  // açılır kutu: masaüstünde açık, dar ekranda kapalı başlar (haritayı kapatmasın)
  if(!el){el=document.createElement("details");el.id="realLegend";el.className="reallegend";el.open=!matchMedia("(max-width:599px)").matches;mw.appendChild(el);}
  el.hidden=false;
  if(!data){el.innerHTML=`<summary>Gerçek santraller</summary><small>${loading?"Yükleniyor…":"Veri yüklenemedi."}</small>`;return;}
  const m=data.meta||{},rows=Object.keys(KINDS).filter(k=>m.counts?.[k]).sort((a,b)=>(m.mw?.[b]||0)-(m.mw?.[a]||0));
  el.innerHTML=`<summary>Gerçek santraller, Türkiye <small>${data.p.length.toLocaleString("tr-TR")} santral</small></summary><table><thead><tr><th></th><th>Santral</th><th title="OSM'de gücü yazılı santrallerin toplamı">OSM MW</th><th title="OSM'de gücü yazılı santrallerin TEİAŞ 2025 kurulu gücüne oranı">Kapsama</th></tr></thead><tbody>${rows.map(k=>{
    const [n,c]=KINDS[k],t=TEIAS_2025[k],cov=t&&m.mw?.[k]?Math.round(m.mw[k]/t*100):null;
    return `<tr><td><i style="background:${c}"></i>${n}</td><td>${m.counts[k]}</td><td>${Math.round(m.mw?.[k]||0).toLocaleString("tr-TR")}</td><td>${cov==null?"—":"%"+cov}</td></tr>`;}).join("")}</tbody></table>
    <small>Gönüllü verisi: bazı santraller eksik ya da gücü yazılmamış. Kapsama, OSM'de gücü yazılı santrallerin TEİAŞ 2025 kurulu gücüne oranıdır. © OpenStreetMap katkıcıları (ODbL), ${m.fetched||""}.</small>`;
}
export function initRealButton(){
  const b=document.getElementById("realBtn");if(!b)return;label();
  b.onclick=()=>setReal(!on);
  if(on)loadReal().then(()=>{emit();legend();});
}
