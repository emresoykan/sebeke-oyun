// --- Gerçek santraller katmanı (dünya, OpenStreetMap) ---
// Veri: public/data/plants/, scripts/build_osm_plants.py ile OSM'den üretilir (© OpenStreetMap katkıcıları, ODbL 1.0).
// index.json ülke başına özet, world.json dünya görünümü için büyük santraller (≥ 100 MW), {ISO3}.json ülkenin tüm
// santralleri. Katman açılınca dizin ve dünya dosyası yüklenir; harita yeterince yaklaşınca (DETAIL_Z) görünen ülkelerin
// dosyaları yüklenir. Düz haritada (map.js) GeoJSON çember katmanı, Apple haritasında (mapkit.js) bu modülün çizdiği karo
// görüntüleri kullanılır. Noktalar teknoloji renginde, gücün kareköküyle büyür; dokununca ad ve güç görünür.
// OSM gönüllü verisidir: santrallerin bir kısmı eksik ya da gücü yazılmamış olabilir. Lejant haritanın ortasındaki ülkenin
// özetini gösterir; Türkiye'de kayıtlı gücü TEİAŞ'ın 2025 kurulu gücüyle karşılaştırır. GEM ile birleştirilen ülkelerde
// (scripts/merge_gem.py) satırın sonunda kaynak bilgisi bulunur (ülke dosyasında 7., dünya dosyasında 8. öğe). Lejanttaki satırlara
// dokununca o tür gizlenir/gösterilir; seçim tarayıcıda saklanır.
import { countryAt } from "../world.js";
import countries from "../data/countries.json";

const KEY="sebeke-realpl",HKEY="sebeke-realpl-hide",DIR=`${import.meta.env.BASE_URL}data/plants/`;
export const DETAIL_Z=4.5; // bu yakınlıktan sonra ülke dosyaları yüklenir (altında yalnızca büyük santraller)
const MAX_LOAD=8,CACHE=24;
export const KINDS={w:["Rüzgâr","#5AA2E0"],s:["Güneş","#F2B42C"],h:["Hidro","#A58BEA"],g:["Doğalgaz","#9FB1BD"],c:["Kömür","#B08968"],
  o:["Petrol","#D98BB6"],j:["Jeotermal","#E8755A"],b:["Biyokütle, atık","#A6C44E"],n:["Nükleer","#F2E94C"],e:["Batarya depolama","#3CC495"],x:["Diğer, bilinmiyor","#D7DEE2"]};
// TEİAŞ 2025 yıl sonu kurulu güç (MW): Türkiye için kapsama oranı
export const TEIAS_2025={w:14792,s:25927,h:32299,g:20027,c:21216,j:1758,b:2405,o:119};
const NAME=Object.fromEntries(countries.features.map(f=>[f.properties.a3,f.properties.n]));

let on=(()=>{try{return localStorage.getItem(KEY)==="1";}catch(e){return false;}})();
// yenilenebilir kaynaklar ("Yalnızca yenilenebilir" kısayolu); gizlenen türler
export const RENEW=["w","s","h","j","b"];
const NONRENEW=Object.keys(KINDS).filter(k=>!RENEW.includes(k));
let hidden=new Set((()=>{try{return JSON.parse(localStorage.getItem(HKEY)||"[]");}catch(e){return [];}})().filter(k=>KINDS[k]));
const shown=p=>!hidden.has(p[2]in KINDS?p[2]:"x");
function setHidden(h){hidden=new Set(h);try{localStorage.setItem(HKEY,JSON.stringify([...hidden]));}catch(e){}changed();}

let index=null,world=null,loading=null;const C=new Map(),pend=new Map(),listeners=new Set();
let view={w:20,s:30,e:50,n:45,z:4,lat:39,lon:35},focusA3=null,active=[],grid=new Map(),ver=0;
export const realOn=()=>on;
export const realData=()=>active;
export function onRealChange(f){listeners.add(f);}
const emit=()=>listeners.forEach(f=>f(on,active));

const get=f=>fetch(DIR+f).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json();});
export function loadReal(){
  if(index||loading)return loading||Promise.resolve(true);
  loading=Promise.all([get("index.json"),get("world.json")]).then(([i,w])=>{index=i;world=w.p;return true;})
    .catch(e=>{console.warn("Gerçek santral verisi yüklenemedi:",e);loading=null;return false;});
  return loading;
}
function loadCountry(a3){
  if(C.has(a3)||pend.has(a3))return;
  pend.set(a3,get(a3+".json").then(d=>{C.set(a3,d.p);if(C.size>CACHE){const old=[...C.keys()].find(k=>!wanted.has(k));if(old)C.delete(old);}})
    .catch(e=>console.warn("Ülke santralleri yüklenemedi:",a3,e)).finally(()=>{pend.delete(a3);changed();}));
  legend();
}
// görünür ülkeler: sınır kutusu görünümle kesişen, görünüm merkezine en yakın MAX_LOAD ülke
let wanted=new Set();
function visibleCountries(){
  if(!index||view.z<DETAIL_Z)return [];const {w,s,e,n}=view,out=[];
  // görünümün 5°'lik hücreleri (build_osm_plants.py ile aynı numara); santrali bu hücrelerde olan ülkeler seçilir
  const cells=new Set(),all=e-w>=360;
  for(let la=Math.floor(Math.max(-90,s)/5);la<=Math.floor(Math.min(89.9,n)/5);la++)
    for(let lo=Math.floor((all?-180:w)/5);lo<=Math.floor((all?179.9:e)/5);lo++){const L=((lo+36)%72+72)%72;cells.add((la+18)*72+L);}
  for(const [a3,c] of Object.entries(index.c)){
    const [x0,y0,x1,y1]=c.bb;
    if(c.g){if(!c.g.some(k=>cells.has(k)))continue;}
    else if(y1<s||y0>n||!(all||[0,360,-360].some(d=>x1+d>=w&&x0+d<=e)))continue;
    // sıralama: ülkenin görünümdeki hücre sayısı çok olan ve merkeze yakın olan önce
    const inView=c.g?c.g.filter(k=>cells.has(k)).length:1;
    out.push([a3,-inView*1000+Math.hypot((x0+x1)/2-view.lon,(y0+y1)/2-view.lat)]);}
  return out.sort((a,b)=>a[1]-b[1]).slice(0,MAX_LOAD).map(x=>x[0]);
}
// haritanın görünümü değişti (map.js, mapkit.js): {w,s,e,n,z,lat,lon}
export function setRealView(v){
  view=v;const c=countryAt(((v.lon+540)%360)-180,v.lat),f=c?c.a3:null,moved=f!==focusA3;focusA3=f;
  if(!on||!index)return;
  const vis=visibleCountries(),same=vis.length===wanted.size&&vis.every(a=>wanted.has(a));wanted=new Set(vis);vis.forEach(loadCountry);
  if((v.z>=DETAIL_Z)!==active.detail||!same)changed();else if(moved)legend();
}
// etkin liste: dünya görünümündeki büyük santraller; yaklaşınca yüklü ülkelerin tüm santralleri onların yerini alır
function rebuild(){
  const detail=view.z>=DETAIL_Z,loaded=detail?[...C.keys()].filter(a=>wanted.has(a)):[],L=new Set(loaded),list=[];
  if(world)for(const p of world)if(!L.has(p[6])&&shown(p))list.push(p);
  for(const a3 of loaded)for(const p of C.get(a3))if(shown(p))list.push(p);
  active=list;active.detail=detail;
  grid=new Map();for(const p of list){const k=Math.floor(p[0])*400+Math.floor(p[1]);let g=grid.get(k);if(!g)grid.set(k,g=[]);g.push(p);}
  ver++;tiles.clear();
}
function changed(){rebuild();emit();legend();}
export async function setReal(v){on=v;try{localStorage.setItem(KEY,v?"1":"0");}catch(e){}if(v){legend();await loadReal();setRealView(view);}changed();label();}

// 1° ızgarada [s,n]×[w,e] kutusundaki noktalar
function inBox(s,w,n,e){const out=[];
  for(let la=Math.floor(s);la<=Math.floor(n);la++)for(let lo=Math.floor(w);lo<=Math.floor(e);lo++){const g=grid.get(la*400+(((lo+180)%360+360)%360-180));if(g)out.push(...g);}
  return out;}

// nokta yarıçapı (piksel): gücün kareköküyle; gücü bilinmeyen küçük nokta
export const radiusOf=mw=>mw?Math.min(14,2.5+0.55*Math.sqrt(mw)):2.5;
export const kindOf=k=>KINDS[k]||KINDS.x;
export function infoText(p){
  const [,,k,mw,name,t]=p,[n]=kindOf(k),x=[p[6],p[7]].find(v=>v&&typeof v==="object"); // GEM ile birleştirilmiş satırın kaynak bilgisi
  const src=!x?"OpenStreetMap":x.s==="g"?"Global Energy Monitor":"OpenStreetMap; güç: Global Energy Monitor";
  return `${name||`Adı yazılmamış ${n.toLowerCase()} santrali`} • ${n}${mw?` • ${mw>=10?Math.round(mw).toLocaleString("tr-TR"):mw.toLocaleString("tr-TR",{maximumFractionDigits:1})} MW`:" • gücü yazılmamış"}${t?` • ${t} türbin`:""}${x&&x.y?` • işletmeye giriş ${x.y}`:""}${x&&x.ow?` • Sahibi: ${x.ow}`:""} (${src})`;
}
// sayfa koordinatına en yakın santral (pagePoint: (lat,lon) → {x,y}); en çok maxPx uzaklıkta. lat/lon verilirse yalnızca
// çevresindeki ızgara hücrelerine bakılır (Apple haritasında her nokta için dönüşüm pahalı)
export function realAt(x,y,pagePoint,maxPx=12,lat=null,lon=null){
  if(!on||!active.length)return null;let best=null,bd=maxPx*maxPx;
  const deg=Math.max(0.05,maxPx*360/(256*2**view.z)*2),cand=lat==null?active:inBox(lat-deg,lon-deg,lat+deg,lon+deg);
  for(const p of cand){const q=pagePoint(p[0],p[1]);if(!q)continue;const d=(q.x-x)**2+(q.y-y)**2;if(d<bd){bd=d;best=p;}}
  return best;
}
// MapLibre için GeoJSON
export function realGeoJSON(){
  return {type:"FeatureCollection",features:active.map((p,i)=>({type:"Feature",id:i,geometry:{type:"Point",coordinates:[p[1],p[0]]},
    properties:{k:p[2],mw:p[3]||0,r:radiusOf(p[3]),c:kindOf(p[2])[1],n:p[4]||"",i}}))};
}

// Apple haritası için karo görüntüsü (256 px, Web Mercator); önbellekli, sürüm değişince temizlenir
const tiles=new Map();
// karo biçimi: WebP kodlaması PNG'den çok hızlı (yazılımla çizen Chromium'da 256 px karo: PNG ~1 sn, WebP ~25 ms);
// tarayıcı WebP kodlayamıyorsa (Safari) PNG
let fmt=null;const FMT=()=>fmt||(fmt=(()=>{try{const c=document.createElement("canvas");c.width=c.height=1;return c.toDataURL("image/webp").startsWith("data:image/webp")?"image/webp":"image/png";}catch(e){return "image/png";}})());
const lon2x=(lon,z)=>(lon+180)/360*256*2**z,lat2y=(lat,z)=>{const s=Math.sin(lat*Math.PI/180);return (0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*256*2**z;};
const x2lon=(x,z)=>x/2**z*360-180,y2lat=(y,z)=>Math.atan(Math.sinh(Math.PI*(1-2*y/2**z)))*180/Math.PI;
export function realTileURL(z,x,y){
  if(!on||!active.length)return null;const key=`${ver}/${z}/${x}/${y}`;if(tiles.has(key))return tiles.get(key);
  const m=0.15*360/2**z;// kenara taşan noktalar için pay
  const pts=z<3?active:inBox(y2lat(y+1,z)-m,x2lon(x,z)-m,y2lat(y,z)+m,x2lon(x+1,z)+m);
  const x0=x*256,y0=y*256,sc=z<5?0.7:z<7?0.85:1,cv=document.createElement("canvas");cv.width=cv.height=256;const g=cv.getContext("2d",{willReadFrequently:true});let n=0;
  // renge göre tek yolda çizilir (her nokta için ayrı fill/stroke binlerce noktada saniyeler sürüyordu); kenar çizgisi
  // yalnızca yakında (z ≥ 5). Önce küçükler, sonra büyükler: büyük santraller üstte kalır
  const by=new Map();
  for(let i=pts.length-1;i>=0;i--){const p=pts[i],px=lon2x(p[1],z)-x0,py=lat2y(p[0],z)-y0,r=radiusOf(p[3])*sc;
    if(px<-r||py<-r||px>256+r||py>256+r)continue;const k=(r>6?"b":"s")+kindOf(p[2])[1];let a=by.get(k);if(!a)by.set(k,a=[]);a.push(px,py,r);n++;}
  const keys=[...by.keys()].sort((a,b)=>a[0]===b[0]?0:a[0]==="s"?-1:1);
  g.lineWidth=1;g.strokeStyle="rgba(10,15,25,.85)";
  // küçük noktalar (yarıçap < 3 px) kare çizilir: yazılımla çizen tarayıcıda yay çizmek karoyu saniyeye çıkarıyordu
  for(const k of keys){const a=by.get(k);g.fillStyle=k.slice(1);g.globalAlpha=0.85;g.beginPath();let arcs=0;
    for(let j=0;j<a.length;j+=3){const r=a[j+2];if(r<3){g.rect(a[j]-r,a[j+1]-r,2*r,2*r);}else{g.moveTo(a[j]+r,a[j+1]);g.arc(a[j],a[j+1],r,0,Math.PI*2);arcs++;}}
    g.fill();g.globalAlpha=1;if(z>=5)g.stroke();}
  const u=n?cv.toDataURL(FMT()):null;tiles.set(key,u);if(tiles.size>400)tiles.delete(tiles.keys().next().value);return u;
}

// --- Düğme ve lejant ---
function label(){const b=document.getElementById("realBtn");if(!b)return;b.setAttribute("aria-pressed",String(on));b.classList.toggle("on",on);}
const fmtN=v=>Math.round(v||0).toLocaleString("tr-TR");
function legend(){
  const mw=document.getElementById("mapwrap");if(!mw)return;let el=document.getElementById("realLegend");
  if(!on){if(el)el.hidden=true;return;}
  // açılır kutu: masaüstünde açık, dar ekranda kapalı başlar (haritayı kapatmasın)
  if(!el){el=document.createElement("details");el.id="realLegend";el.className="reallegend";
    // varsayılan kapalı (haritayı kapatmasın); açık/kapalı seçimi saklanır
    try{el.open=localStorage.getItem(KEY+"-legend")==="1";}catch(e){}
    el.addEventListener("toggle",()=>{try{localStorage.setItem(KEY+"-legend",el.open?"1":"0");}catch(e){}});mw.appendChild(el);}
  el.hidden=false;
  if(!index){el.innerHTML=`<summary>Gerçek santraller</summary><small>${loading?"Yükleniyor…":"Veri yüklenemedi."}</small>`;return;}
  // kapsam: haritanın ortasındaki ülke; denizdeyse ya da ülkede santral yoksa dünya toplamı
  const c=focusA3&&index.c[focusA3],tot={n:0,counts:{},mw:{}};
  if(!c)for(const v of Object.values(index.c)){tot.n+=v.n;for(const k in v.counts){tot.counts[k]=(tot.counts[k]||0)+v.counts[k];tot.mw[k]=(tot.mw[k]||0)+(v.mw[k]||0);}}
  const sc=c||tot,tr=focusA3==="TUR",gem=c&&c.gem&&index.meta.gem,rows=Object.keys(KINDS).filter(k=>sc.counts[k]).sort((a,b)=>(sc.mw[b]||0)-(sc.mw[a]||0));
  const where=c?NAME[focusA3]||focusA3:`Dünya, ${Object.keys(index.c).length} ülke`,busy=pend.size?" • yükleniyor…":"";
  const note=view.z<DETAIL_Z?`Bu uzaklıkta yalnızca ${index.meta.worldMW} MW ve üstü santraller çizilir; yaklaşınca ülkenin tüm santralleri yüklenir.`:"";
  el.innerHTML=`<summary>Gerçek santraller, ${where} <small>${sc.n.toLocaleString("tr-TR")} santral${busy}</small></summary><table><thead><tr><th></th><th>Santral</th><th title="${gem?"Gücü yazılı santrallerin toplamı (OSM ve GEM birleşik)":"OSM'de gücü yazılı santrallerin toplamı"}">${gem?"MW":"OSM MW"}</th>${tr?`<th title="Gücü yazılı santrallerin TEİAŞ 2025 kurulu gücüne oranı">Kapsama</th>`:""}</tr></thead><tbody>${rows.map(k=>{
    const [n,col]=KINDS[k],t=TEIAS_2025[k],cov=tr&&t&&sc.mw[k]?Math.round(sc.mw[k]/t*100):null;
    return `<tr class="${hidden.has(k)?"off":""}"><td><button type="button" data-k="${k}" aria-pressed="${!hidden.has(k)}" title="Göster / gizle"><i style="background:${col}"></i>${n}</button></td><td>${sc.counts[k].toLocaleString("tr-TR")}</td><td>${fmtN(sc.mw[k])}</td>${tr?`<td>${cov==null?"—":"%"+cov}</td>`:""}</tr>`;}).join("")}</tbody></table>
    <div class="rlf"><button type="button" data-f="renew" aria-pressed="${[...hidden].sort().join()===NONRENEW.slice().sort().join()}">Yalnızca yenilenebilir</button><button type="button" data-f="all" aria-pressed="${hidden.size===0}">Hepsi</button></div>
    <small>${note?note+" ":""}Satıra dokununca o tür gizlenir ya da gösterilir. Gönüllü verisi: bazı santraller eksik ya da gücü yazılmamış; 1 MW altı tesisler ve adı yazılmamış küçük güneş alanları gösterilmez.${gem?" Büyük santrallerin gücü ve OSM'de olmayan santraller Global Energy Monitor'dan.":""}${tr?" Kapsama, gücü yazılı santrallerin TEİAŞ 2025 kurulu gücüne oranıdır.":""} Deniz santralleri en yakın ülkeye atanır. © OpenStreetMap katkıcıları (ODbL), ${index.meta.fetched||""}.${gem?` Global Integrated Power Tracker, Global Energy Monitor, ${gem.release} (CC BY 4.0).`:""}</small>`;
}
// lejant düğmeleri: tür aç/kapa, kısayollar (olay yetkisi bir kez kutuya bağlanır)
function onLegendClick(e){const b=e.target.closest("button");if(!b)return;
  if(b.dataset.k){const h=new Set(hidden);h.has(b.dataset.k)?h.delete(b.dataset.k):h.add(b.dataset.k);setHidden(h);}
  else if(b.dataset.f==="renew")setHidden(NONRENEW);
  else if(b.dataset.f==="all")setHidden([]);}
export function initRealButton(){
  document.getElementById("mapwrap")?.addEventListener("click",e=>{if(e.target.closest("#realLegend"))onLegendClick(e);});
  const b=document.getElementById("realBtn");if(!b)return;label();
  b.onclick=()=>setReal(!on);
  if(on){legend();loadReal().then(()=>{setRealView(view);changed();});}
}
