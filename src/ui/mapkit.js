// --- Ana harita: Apple Haritalar (MapKit JS) ---
// VITE_MAPKIT_TOKEN tanımlıysa oyun Apple'ın haritasında oynanır (varsayılan hibrit: uydu görüntüsü + yol ve yer adları;
// sağ üstteki Apple düğmesiyle Standart/Uydu/Hibrit seçilir, seçim hatırlanır). MapKit JS betiği cdn.apple-mapkit.com'dan
// yüklenir. Belirteç Apple Developer hesabındaki Maps panosunda yalnızca sitenin alan adında çalışacak şekilde (Domain
// kısıtlı) üretilir; bu yüzden sayfaya gömülmesi amaçlanan kullanımdır. Betik yüklenemezse veya belirteç reddedilirse
// map.js düz MapLibre haritasına döner.
// Oyun katmanları: sahalar, rakipler ve seçim halkası HTML işaretleri; korunan alanlar ve fırtınalar daire katmanı;
// gece tarafı ve bulutlar karo katmanı (karolar tarayıcıda tuvalden üretilir).
import { S } from "../state.js";
import { TECH } from "../config.js";
import { cssv } from "../utils.js";
import { CAL } from "../calendar.js";
import { siteMW } from "../sim.js";
import { rivalSites } from "../rivals.js";
import { PROTECTED } from "../data/protected.js";
import { wxOn, cloudCanvas, tickClouds, activeStorms } from "./wxflat.js";

const TOKEN=import.meta.env.VITE_MAPKIT_TOKEN;
const SRC="https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js";
const PREF="sebeke-mk-type",RAD=Math.PI/180;
const STATUS={none:"#FFFFFF",pending:"#F2C94C",ok:"#FFFFFF",rejected:"#F06A7D"};
const reduced=matchMedia("(prefers-reduced-motion: reduce)");
// MapLibre yakınlığı ile kamera yüksekliği (m) arasındaki yaklaşık ilişki (map.js ile aynı)
const zoomToH=z=>2.6e7/2**z;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
let mk=null,map=null,box=null,hooks=null,sel=null,night=null,clouds=null,storms=[],parkLabels=[],lastHour=null,cloudVer=0,tapAt=0,failed=false;
const sites=new Map(),rivals=new Map(),nightCache=new Map(),cloudCache=new Map();

function loadScript(){
  return new Promise((res,rej)=>{
    if(window.mapkit)return res(window.mapkit);
    const s=document.createElement("script");s.src=SRC;s.crossOrigin="anonymous";s.async=true;
    s.onload=()=>window.mapkit?res(window.mapkit):rej(new Error("MapKit JS bulunamadı"));
    s.onerror=()=>rej(new Error("MapKit JS yüklenemedi"));
    document.head.appendChild(s);
  });
}
// Belirteç doğrulanınca "Initialized" gelir; birkaç saniyede ne hata ne onay gelirse yine devam edilir,
// sonradan gelen yetki hatası haritayı yedeğe düşürür
function authorize(){
  return new Promise((res,rej)=>{
    let done=false;const finish=(f,v)=>{if(!done){done=true;clearTimeout(t);f(v);}};
    const t=setTimeout(()=>finish(res),5000);
    mk.addEventListener("configuration-change",e=>{if(e.status==="Initialized")finish(res);});
    mk.addEventListener("error",e=>{const err=new Error("MapKit: "+e.status);if(!done)finish(rej,err);else fail(err);});
    mk.init({authorizationCallback:cb=>cb(TOKEN),language:"tr"});
  });
}
function fail(err){if(failed)return;failed=true;destroy();hooks&&hooks.fail(err);}

const div=(cls,parent)=>{const d=document.createElement("div");d.className=cls;if(parent)parent.appendChild(d);return d;};
const coord=(lat,lon)=>new mk.Coordinate(lat,lon);
// İşaret: kök öğe noktanın kendisi (ortası koordinata gelir), etiket altında taşar
function marker(cls,size,onSelect){
  const root=div("mk-mark "+cls),lab=div("mk-lbl",root);
  const a=new mk.Annotation(coord(0,0),()=>root,{calloutEnabled:false,anchorOffset:new DOMPoint(0,size/2),size:{width:size,height:size},
    displayPriority:mk.Annotation.DisplayPriority.Required,collisionMode:mk.Annotation.CollisionMode.None});
  if(onSelect)a.addEventListener("select",()=>{tapAt=performance.now();setTimeout(()=>{a.selected=false;},0);onSelect();});
  else a.enabled=false;
  return {a,root,lab,key:""};
}
function place(m,lat,lon){const k=lat+","+lon;if(m.key!==k){m.key=k;m.a.coordinate=coord(lat,lon);}}

// --- Gece tarafı: karo başına güneş yüksekliğinden karanlık (map.js'teki düz harita ile aynı eşikler) ---
function nightTile(x,y,z){
  const n=2**z;if(lastHour==null||y<0||y>=n)return null;x=((x%n)+n)%n;
  const key=`${lastHour}/${z}/${x}/${y}`;let u=nightCache.get(key);if(u)return u;
  const N=64,c=document.createElement("canvas");c.width=c.height=N;const g=c.getContext("2d"),im=g.createImageData(N,N),px=im.data;
  const d=CAL.decl*RAD,sd=Math.sin(d),cd=Math.cos(d),sub=(12-(lastHour-3))*15;
  for(let j=0;j<N;j++){const la=Math.atan(Math.sinh(Math.PI*(1-2*(y+(j+0.5)/N)/n))),a=Math.sin(la)*sd,b=Math.cos(la)*cd;
    for(let i=0;i<N;i++){const lon=(x+(i+0.5)/N)/n*360-180,el=Math.asin(clamp(a+b*Math.cos((lon-sub)*RAD),-1,1))/RAD,t=clamp((4-el)/14,0,1),p=(j*N+i)*4;
      px[p]=2;px[p+1]=6;px[p+2]=18;px[p+3]=t*t*(3-2*t)*72;}}
  g.putImageData(im,0,0);u=c.toDataURL();
  if(nightCache.size>600)nightCache.clear();nightCache.set(key,u);return u;
}
// --- Bulutlar: düz haritanın Mercator bulut tuvalinden karo kesilir; yakınlaştıkça incelir ---
function cloudTile(x,y,z){
  const n=2**z;if(!wxOn()||y<0||y>=n)return null;x=((x%n)+n)%n;
  const key=`${cloudVer}/${z}/${x}/${y}`;let u=cloudCache.get(key);if(u)return u;
  const cv=cloudCanvas(),sw=cv.width/n,c=document.createElement("canvas");c.width=c.height=256;
  const g=c.getContext("2d");g.imageSmoothingEnabled=true;g.drawImage(cv,x*sw,y*sw,sw,sw,0,0,256,256);u=c.toDataURL();
  if(cloudCache.size>300)cloudCache.clear();cloudCache.set(key,u);return u;
}
const cloudOpacity=h=>{const z=Math.log2(2.6e7/h);return z<=2?0.9:z<=4?0.9-0.2*(z-2):z<=5?0.5-0.3*(z-4):z<=6?0.2-0.2*(z-5):0;};

function drawStorms(){
  if(storms.length)map.removeOverlays(storms);
  const st=new mk.Style({strokeColor:"#FF6B6B",lineWidth:2.2,lineDash:[6,4],fillColor:"#FF6B6B",fillOpacity:0.06});
  storms=activeStorms().map(s=>new mk.CircleOverlay(coord(s.lat,s.lon),s.r*750,{style:st,enabled:false}));
  if(storms.length)map.addOverlays(storms);
}
function updateWeather(force){
  if(!map)return;
  if(tickClouds(force)){cloudVer++;cloudCache.clear();clouds.reload();drawStorms();}
}

// Yakınlığa göre: bulut saydamlığı, etiketlerin görünürlüğü (düz haritadaki eşiklerle)
function onRegion(){
  if(!map)return;const h=map.cameraDistance,el=box;
  clouds.opacity=wxOn()?cloudOpacity(h):0;
  el.classList.toggle("mk-z3",h<zoomToH(3));el.classList.toggle("mk-z4",h<zoomToH(4));
  const showParks=h<zoomToH(6);parkLabels.forEach(a=>{if(a.visible!==showParks)a.visible=showParks;});
}

export async function initMapKit(el,h){
  if(!TOKEN)throw new Error("VITE_MAPKIT_TOKEN tanımlı değil");
  hooks=h;mk=await loadScript();await authorize();
  const T=mk.Map.MapTypes;let type=T.Hybrid;
  try{const v=localStorage.getItem(PREF);if(v&&Object.values(T).includes(v))type=v;}catch(e){}
  const mobile=innerWidth<600,end=zoomToH(mobile?3.6:4.6);
  map=new mk.Map(el,{mapType:type,colorScheme:mk.Map.ColorSchemes.Dark,showsMapTypeControl:true,showsZoomControl:true,
    showsCompass:mk.FeatureVisibility.Hidden,showsScale:mk.FeatureVisibility.Hidden,isRotationEnabled:false,showsPointsOfInterest:false,
    center:coord(S.sel.lat-1,S.sel.lon)});
  map.cameraDistance=reduced.matches?end:1.4e7;
  box=el;el.classList.add("mk-map");
  map.addEventListener("map-type-change",()=>{try{localStorage.setItem(PREF,map.mapType);}catch(e){}});
  // haritaya dokunma: işarete dokunulduysa ("select") nokta seçimi yapılmaz
  map.addEventListener("single-tap",e=>{const p=e.pointOnPage;if(!p)return;
    setTimeout(()=>{if(!map||performance.now()-tapAt<400)return;const c=map.convertPointOnPageToCoordinate(p);
      hooks.selectPoint(c.latitude,((c.longitude+540)%360)-180);},40);});
  map.addEventListener("region-change-end",onRegion);
  // korunan alanlar
  const ps=new mk.Style({fillColor:"#C2364A",fillOpacity:0.15,strokeColor:"#F06A7D",lineWidth:1,lineDash:[4,4]});
  map.addOverlays(PROTECTED.map(([n,lat,lon,r])=>new mk.CircleOverlay(coord(lat,lon),r*1000,{style:ps,enabled:false})));
  parkLabels=PROTECTED.map(([n,lat,lon])=>{const m=marker("mk-park",2,null);m.lab.textContent=n;m.a.coordinate=coord(lat,lon);
    m.a.displayPriority=mk.Annotation.DisplayPriority.Low;m.a.collisionMode=mk.Annotation.CollisionMode.Rectangle;m.a.visible=false;return m.a;});
  map.addAnnotations(parkLabels);
  night=new mk.TileOverlay(nightTile,{opacity:1});
  clouds=new mk.TileOverlay(cloudTile,{maximumZ:7,opacity:0});
  map.addTileOverlays([night,clouds]);
  sel=marker("mk-sel",28,null);map.addAnnotation(sel.a);
  window.addEventListener("sebeke:wx",()=>{updateWeather(true);onRegion();});
  updateWeather(true);setInterval(()=>updateWeather(false),400);onRegion();
  if(!reduced.matches)setTimeout(()=>map&&map.setCameraDistanceAnimated(end,true),400);
  if(import.meta.env.DEV)window.__mk=map;
}

export function draw(){
  if(!map)return;
  const seen=new Set();
  for(const [id,o] of Object.entries(S.sites)){
    seen.add(id);let m=sites.get(id);
    if(!m){m=marker("mk-site",18,()=>hooks.selectSite(id));sites.set(id,m);map.addAnnotation(m.a);}
    const top=S.plants.filter(p=>p.t===id).sort((a,b)=>b.mw-a.mw)[0],mw=siteMW(id);
    place(m,o.lat,o.lon);
    m.root.style.background=top?cssv(TECH[top.k].c):"rgba(255,255,255,.3)";m.root.style.borderColor=STATUS[o.permit]||"#FFFFFF";
    const t=mw?`${mw} MW`:"";if(m.lab.textContent!==t)m.lab.textContent=t;
  }
  for(const [id,m] of sites)if(!seen.has(id)){map.removeAnnotation(m.a);sites.delete(id);}
  const rs=new Set();
  rivalSites().forEach(({r,s})=>{
    const k=`${r.id}:${s.lat}:${s.lon}`;rs.add(k);let m=rivals.get(k);
    if(!m){m=marker("mk-rival",16,()=>hooks.selectRival(s.lat,s.lon));m.root.style.setProperty("--c",r.c);m.lab.style.color=r.c;rivals.set(k,m);place(m,s.lat,s.lon);map.addAnnotation(m.a);}
    m.root.classList.toggle("build",s.build>0);
    const t=`${r.sh} ${s.mw} MW${s.build>0?" (inşaat)":""}`;if(m.lab.textContent!==t)m.lab.textContent=t;
  });
  for(const [k,m] of rivals)if(!rs.has(k)){map.removeAnnotation(m.a);rivals.delete(k);}
  place(sel,S.sel.lat,S.sel.lon);
}

export function setClock(hour){
  if(!map||hour===lastHour)return;
  lastHour=hour;nightCache.clear();night.reload();
}
export function camInfo(){
  if(!map)return null;const c=map.center;return {lat:c.latitude,lon:c.longitude,h:map.cameraDistance};
}
export function focus(lon,lat){
  if(!map)return;map.setCenterAnimated(coord(lat,lon),!reduced.matches);
  if(map.cameraDistance>zoomToH(9))map.setCameraDistanceAnimated(zoomToH(9),!reduced.matches);
}
export function destroy(){
  if(map){try{map.destroy();}catch(e){}}
  if(box)box.classList.remove("mk-map","mk-z3","mk-z4");
  map=null;sites.clear();rivals.clear();storms=[];
}
