// --- Harita: düz (Web Mercator) dünya haritası, MapLibre GL ---
// Oyun bu haritada oynanır: sahalar, rakipler, korunan alanlar, gece-gündüz gölgesi ve hava katmanı. "3D yakından bak"
// ve "Sinematik tur" istenince Cesium tabanlı 3D görünüm (globe3d.js) harita alanının üstündeki pencerede açılır;
// Cesium yalnızca o zaman yüklenir.
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { TECH, SITE_MIN_KM } from "../config.js";
import { km } from "../world.js";
import { S } from "../state.js";
import { cssv } from "../utils.js";
import { CAL } from "../calendar.js";
import { siteMW } from "../sim.js";
import { render } from "./hud.js";
import { renderPanel } from "./panel.js";
import { rivalSites, RIVALS } from "../rivals.js";
import { gfx, onGfx, LEVELS } from "./quality.js";
import { plantStatus, isLive } from "../plantstatus.js";
import { openSheet, collapseSheet, renderMySites, sheetState } from "./sheet.js";
import { buildStyle, ONLINE, HD, FALLBACK, VECTOR, FONT, MAXLAT } from "./mapstyle.js";
import { initWeatherLayer } from "./wxflat.js";
import { initPotButton, onPotChange, potMode, tilePNG } from "./potential.js";
import { initSearch } from "./search.js";

maplibregl.setWorkerUrl(workerUrl);

// Güneş/rüzgâr potansiyel karoları (potential.js): pot://s/z/x/y veya pot://w/z/x/y
const EMPTY_PNG=()=>Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="),c=>c.charCodeAt(0)).buffer;
maplibregl.addProtocol("pot",async p=>{const [k,z,x,y]=p.url.slice(6).split("/");return {data:(await tilePNG(k,+z,+x,+y))||EMPTY_PNG()};});

// Gömülü ayrıntılı kabartma karoları paketlerden okunur (z5–7 tek pakette, z8–9 z6 hücresine göre)
if(HD){
  const packs={},base=new URL(import.meta.env.BASE_URL,location.href).href;
  const EMPTY=Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="),c=>c.charCodeAt(0)).buffer;
  maplibregl.addProtocol("rhd",async p=>{
    const [z,x,y]=p.url.slice(6).split("/").map(Number),key=z<=7?"lo":`${z}-${x>>(z-6)}-${y>>(z-6)}`;
    packs[key]??=fetch(`${base}relief-hd/${key}.json`).then(r=>r.ok?r.json():{}).catch(()=>{delete packs[key];return {};});
    const b64=(await packs[key])[`${z}/${x}/${y}`];
    return {data:b64?Uint8Array.from(atob(b64),c=>c.charCodeAt(0)).buffer:EMPTY};
  });
}
const STATUS={none:"#FFFFFF",pending:"#F2C94C",ok:"#FFFFFF",rejected:"#F06A7D"};
const HALO="#0B1626";
const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)");
let map=null,ready=false,globe=null,globeOpen=false,lastHour=null;
const fc=features=>({type:"FeatureCollection",features});
const pt=(lon,lat,properties)=>({type:"Feature",properties,geometry:{type:"Point",coordinates:[lon,lat]}});
// harita yakınlığı → yaklaşık kamera yüksekliği (m); ses ve hava katmanı bunu kullanır
export const zoomToH=z=>2.6e7/2**z;
// Apple haritası açılamazsa nedeni haritanın üstünde birkaç saniye gösterilir (ör. belirteç reddi)
function mapNote(msg){
  const w=document.getElementById("mapwrap");if(!w)return;const d=document.createElement("div");d.className="mapnote";d.textContent=msg;
  w.appendChild(d);setTimeout(()=>d.remove(),9000);
}
// Apple Haritalar (mapkit.js) belirteç tanımlıysa ana haritadır; ?map=maplibre ile düz harita zorlanabilir
const MAPKIT=!!import.meta.env.VITE_MAPKIT_TOKEN&&new URLSearchParams(location.search).get("map")!=="maplibre";
let mk=null;

// Kameranın bulunduğu nokta (ortam sesi için); 3D pencere açıksa onun kamerası
export function camInfo(){
  if(globeOpen&&globe)return globe.camInfo();
  if(mk)return mk.camInfo();
  if(!map)return null;const c=map.getCenter();return {lat:c.lat,lon:c.lng,h:zoomToH(map.getZoom())};
}

// Rakip işareti: şirket renginde eşkenar dörtgen (ikon olarak haritaya eklenir)
function diamondImg(c){const n=28,cv=document.createElement("canvas");cv.width=cv.height=n;const x=cv.getContext("2d");
  x.translate(n/2,n/2);x.rotate(Math.PI/4);x.fillStyle=c;x.strokeStyle="rgba(10,15,25,.9)";x.lineWidth=2.5;x.fillRect(-7,-7,14,14);x.strokeRect(-7,-7,14,14);
  return x.getImageData(0,0,n,n);}

function addGameLayers(){
  map.addSource("sites",{type:"geojson",data:fc([])});
  map.addSource("rivals",{type:"geojson",data:fc([])});
  map.addSource("sel",{type:"geojson",data:fc([])});
  RIVALS.forEach(r=>map.addImage("dia-"+r.id,diamondImg(r.c),{pixelRatio:2}));
  const lbl={"text-halo-color":HALO,"text-halo-width":1.5};
  map.addLayer({id:"rivals",type:"symbol",source:"rivals",layout:{"icon-image":["concat","dia-",["get","r"]],"icon-allow-overlap":true,"icon-size":["interpolate",["linear"],["zoom"],2,0.8,8,1.2]},
    paint:{"icon-opacity":["case",["get","build"],0.5,1]}});
  map.addLayer({id:"rival-labels",type:"symbol",source:"rivals",minzoom:4,layout:{"text-field":["get","t"],"text-font":FONT.m,"text-size":11,"text-offset":[0,1.2],"text-anchor":"top","text-optional":true},
    paint:{"text-color":["get","c"],...lbl}});
  // üretim yapan sahanın çevresinde teknoloji renginde genişleyip sönen halka
  map.addLayer({id:"site-pulse",type:"circle",source:"sites",filter:["==",["get","on"],1],paint:{"circle-radius":9,"circle-color":"rgba(0,0,0,0)",
    "circle-stroke-color":["get","col"],"circle-stroke-width":3,"circle-stroke-opacity":0,"circle-blur":0.15}});
  map.addLayer({id:"sites",type:"circle",source:"sites",paint:{"circle-radius":["interpolate",["linear"],["zoom"],1,5,8,8],"circle-color":["get","col"],"circle-opacity":["get","op"],
    "circle-stroke-color":["get","st"],"circle-stroke-width":2.5}});
  map.addLayer({id:"site-labels",type:"symbol",source:"sites",minzoom:3,filter:["!=",["get","t"],""],layout:{"text-field":["get","t"],"text-font":FONT.m,"text-size":12,"text-offset":[0,1.1],"text-anchor":"top","text-allow-overlap":true},
    paint:{"text-color":"#FFFFFF",...lbl}});
  map.addLayer({id:"sel-outer",type:"circle",source:"sel",paint:{"circle-radius":13,"circle-color":"rgba(0,0,0,0)","circle-stroke-color":"#000000","circle-stroke-width":3.5}});
  map.addLayer({id:"sel-inner",type:"circle",source:"sel",paint:{"circle-radius":12.5,"circle-color":"rgba(0,0,0,0)","circle-stroke-color":"#FFFFFF","circle-stroke-width":1.6}});
}

// Yakınlaşınca tesisin kendisi: 3D modelin gerçek ölçekli kuşbakışı görüntüsü sahanın üstüne yerleşir (siteimage.js;
// three.js yalnızca ilk yakınlaşmada yüklenir). Santral listesi değişince görüntü yenilenir.
const FAC_Z=11;const facs=new Map();let facBusy=false,facAgain=false,facMod=null,facRaf=0;
async function syncFacilities(){
  if(!map||mk||map.getZoom()<FAC_Z-0.5)return;
  if(facBusy){facAgain=true;return;}facBusy=true;
  try{const F=facMod=await import("./siteimage.js");
    for(const id of Object.keys(S.sites)){
      const sig=F.siteSig(id),cur=facs.get(id),src="fac-"+id;
      if(cur&&cur.sig===sig)continue;facs.set(id,{sig});
      if(!sig){if(map.getLayer(src))map.removeLayer(src);if(map.getSource(src))map.removeSource(src);continue;}
      const img=await F.siteImage(id);if(!img||facs.get(id).sig!==sig||!map)continue;
      const f=facs.get(id),k=facK(S.sites[id],img),coordinates=F.cornersOf(S.sites[id],img,k);f.img=img;f.url=F.lodFor(img,facPx(S.sites[id],img,k));
      if(map.getSource(src))map.getSource(src).updateImage({url:f.url,coordinates});
      else{map.addSource(src,{type:"image",url:f.url,coordinates});
        map.addLayer({id:src,type:"raster",source:src,minzoom:FAC_Z-0.5,paint:{"raster-fade-duration":0,"raster-opacity":["interpolate",["linear"],["zoom"],FAC_Z-0.5,0,FAC_Z+1,1]}},"site-pulse");}
    }
  }catch(e){console.warn("Tesis görüntüleri yüklenemedi:",e);}
  facBusy=false;if(facAgain){facAgain=false;syncFacilities();}
}

// uzaktan tesis en az belirli piksel boyutunda; yaklaştıkça gerçek ölçeğe iner (yakınlaştırırken karede bir güncellenir)
const facMpp=o=>40075016*Math.cos(o.lat*Math.PI/180)/(512*2**map.getZoom());
function facK(o,img){return facMod.facScale(img,1/facMpp(o));}
// görüntünün ekrandaki genişliği (cihaz pikseli): uygun küçültülmüş kopyayı seçmek için
const facPx=(o,img,k)=>(img.east[1]-img.east[0])*k/facMpp(o)*map.getPixelRatio();
function rescaleFacilities(){
  if(!facMod||facRaf)return;facRaf=requestAnimationFrame(()=>{facRaf=0;
    for(const [id,f] of facs){const src=map.getSource("fac-"+id),o=S.sites[id];if(!src||!f.img||!o)continue;
      const k=facK(o,f.img),coordinates=facMod.cornersOf(o,f.img,k),url=facMod.lodFor(f.img,facPx(o,f.img,k));
      if(url!==f.url){f.url=url;src.updateImage({url,coordinates});}else src.setCoordinates(coordinates);}});
}

// Nabız: ~25 kare/sn; sekme gizliyken, hareket azaltma açıkken veya üreten saha yokken durur (pil)
let anyLive=false;
function pulseLoop(){
  let last=0;const step=t=>{requestAnimationFrame(step);if(document.hidden||reducedMotion.matches||!map||mk||!anyLive||t-last<40)return;last=t;
    const ph=(t%2200)/2200;map.setPaintProperty("site-pulse","circle-radius",10+22*ph);map.setPaintProperty("site-pulse","circle-stroke-opacity",0.95*(1-ph)**1.5);};
  requestAnimationFrame(step);
}

// Vektör katmanları yüklenemezse (ağ, engelleme) yerel ülke adları, şehirler ve sınırlar gösterilir
let vectorOk=false;
function useFallback(fb){
  FALLBACK.forEach(id=>map.getLayer(id)&&map.setLayoutProperty(id,"visibility",fb?"visible":"none"));
  VECTOR.forEach(id=>map.getLayer(id)&&map.setLayoutProperty(id,"visibility",fb?"none":"visible"));
}

// Gece tarafı: Mercator satırlarıyla çizilen küçük bir görüntü; her pikselde güneşin yüksekliğinden karanlık hesaplanır
// (+4° üstü aydınlık, −10° altı tam gece, arası yumuşak alacakaranlık). Yalnızca oyun saati değişince yeniden çizilir.
const NW=256,NH=256,RAD=Math.PI/180;let nightCv=null;
function drawNight(hour){
  const g=nightCv.getContext("2d"),im=g.createImageData(NW,NH),px=im.data,d=CAL.decl*RAD,sd=Math.sin(d),cd=Math.cos(d),sub=(12-(hour-3))*15;
  const ch=new Float32Array(NW);for(let x=0;x<NW;x++)ch[x]=Math.cos(((x+0.5)/NW*360-180-sub)*RAD);
  for(let y=0;y<NH;y++){const la=Math.atan(Math.sinh(Math.PI*(1-2*(y+0.5)/NH))),a=Math.sin(la)*sd,b=Math.cos(la)*cd;
    for(let x=0;x<NW;x++){const el=Math.asin(Math.max(-1,Math.min(1,a+b*ch[x])))/RAD,t=Math.max(0,Math.min(1,(4-el)/14)),p=(y*NW+x)*4;
      px[p]=2;px[p+1]=6;px[p+2]=18;px[p+3]=t*t*(3-2*t)*72;}}
  g.putImageData(im,0,0);const src=map.getSource("night");src.play();requestAnimationFrame(()=>requestAnimationFrame(()=>src.pause()));
}
// Potansiyel katmanları gece gölgesinin üstünde, yer adlarının ve oyun işaretlerinin altında
function addPotential(){
  ["s","w"].forEach(k=>{map.addSource("pot-"+k,{type:"raster",tiles:[`pot://${k}/{z}/{x}/{y}`],tileSize:256,minzoom:1,maxzoom:13});
    map.addLayer({id:"pot-"+k,type:"raster",source:"pot-"+k,layout:{visibility:potMode()===k?"visible":"none"},paint:{"raster-fade-duration":150,"raster-resampling":"linear"}},"labels-start");});
  onPotChange(m=>["s","w"].forEach(k=>map&&map.getLayer("pot-"+k)&&map.setLayoutProperty("pot-"+k,"visibility",m===k?"visible":"none")));
}
function addNight(){
  nightCv=document.createElement("canvas");nightCv.width=NW;nightCv.height=NH;
  map.addSource("night",{type:"canvas",canvas:nightCv,animate:false,coordinates:[[-180,MAXLAT],[180,MAXLAT],[180,-MAXLAT],[-180,-MAXLAT]]});
  map.addLayer({id:"night",type:"raster",source:"night",paint:{"raster-fade-duration":0,"raster-resampling":"linear"}},"labels-start");
}
export function setGameClock(hour){
  if(globeOpen&&globe)globe.setGlobeClock(hour);
  if(!ready)return;const h=Math.min(hour,23);
  if(h===lastHour)return;lastHour=h;
  if(mk)mk.setClock(h);else drawNight(h);
  drawMap(); // saatlik üretim durumu (canlı nabız)
}

// Seçim (iki harita da kullanır): rakip işareti, kendi sahan veya haritada bir nokta (yakında sahan varsa o seçilir)
// Kendi sahan seçiliyken boş bir yere ilk dokunuş seçimi değiştirmez (yanlışlıkla seçim kaybını önler):
// mobilde açık kartı küçültür, masaüstünde "tekrar tıkla" ipucu gösterir; ikinci dokunuş yeni noktayı seçer.
// Seçim yapılınca panel açılır (masaüstünde yan sütun başa kayar).
let armed=false,armT=0;
const mobile=matchMedia("(max-width:899.98px)");
const afterSelect=()=>{armed=false;renderPanel();drawMap();render();openSheet("saha");ensureVisible();window.dispatchEvent(new CustomEvent("sebeke:select"));};
// Mobilde kart açılınca seçili nokta kartın altında kalırsa harita kaydırılır (kart animasyonu bitince)
function pagePoint(lat,lon){
  if(mk)return mk.pagePoint(lat,lon);if(!map)return null;
  const r=map.getContainer().getBoundingClientRect(),q=map.project([lon,lat]);return {x:r.left+q.x,y:r.top+q.y};
}
function ensureVisible(delay=320){
  if(!mobile.matches)return;
  setTimeout(()=>{const p=pagePoint(S.sel.lat,S.sel.lon),mw=document.getElementById("mapwrap").getBoundingClientRect();if(!p)return;
    const bot=Math.min(mw.bottom,document.getElementById("side").getBoundingClientRect().top);
    if(p.y<mw.top+40||p.y>bot-40){const dy=p.y-(mw.top+bot)/2;if(mk)mk.panBy(dy);else if(map)map.panBy([0,dy],{duration:reducedMotion.matches?0:400});}},delay);
}
function selectRival(lat,lon){S.sel={id:null,lat,lon};afterSelect();}
function selectSite(id){const o=S.sites[id];if(!o)return;S.sel={id,lat:o.lat,lon:o.lon};afterSelect();}
function tapPoint(lat,lon){
  if(S.sel.id&&!armed&&siteAt(lat,lon)!==S.sel.id){
    if(mobile.matches&&sheetState()!=="peek"){armed=true;collapseSheet();return;}
    if(!mobile.matches){armed=true;clearTimeout(armT);armT=setTimeout(()=>{armed=false;},4000);hint(lat,lon,"Sahan seçili. Bu noktayı seçmek için tekrar tıkla.");return;}
  }
  selectPoint(lat,lon);
}
function siteAt(lat,lon){
  let id=null,bd=SITE_MIN_KM;
  Object.entries(S.sites).forEach(([k,o])=>{const d=km(lat,lon,o.lat,o.lon);if(d<bd){bd=d;id=k;}});
  return id;
}
// Tıklanan yerin yanında kısa süreli ipucu
function hint(lat,lon,text){
  const mw=document.getElementById("mapwrap"),p=pagePoint(lat,lon);if(!mw||!p)return;
  let el=mw.querySelector(".maphint");if(!el){el=document.createElement("div");el.className="maphint";el.setAttribute("role","status");mw.appendChild(el);}
  const r=mw.getBoundingClientRect();el.textContent=text;
  Object.assign(el.style,{left:Math.min(Math.max(8,p.x-r.left+12),r.width-268)+"px",top:Math.min(Math.max(8,p.y-r.top+12),r.height-80)+"px"});
  el.hidden=false;clearTimeout(el._t);el._t=setTimeout(()=>{el.hidden=true;},3200);
}
function selectPoint(lat,lon){
  const id=siteAt(lat,lon);
  const mh=document.querySelector(".maphint");if(mh)mh.hidden=true;
  S.sel=id?{id,lat:S.sites[id].lat,lon:S.sites[id].lon}:{id:null,lat:+lat.toFixed(4),lon:+lon.toFixed(4)};afterSelect();
}
// dokunma alanı işaretin çevresinde ~44 px: en yakın işaret seçilir
function onClick(e){
  const {x,y}=e.point,fs=map.queryRenderedFeatures([[x-16,y-16],[x+16,y+16]],{layers:["rivals","sites"]});
  const d=f=>{const p=map.project(f.geometry.coordinates);return (p.x-x)**2+(p.y-y)**2;},f=fs.sort((a,b)=>d(a)-d(b))[0];
  if(f&&f.layer.id==="rivals"){const [lon,lat]=f.geometry.coordinates;selectRival(lat,lon);}
  else if(f&&f.layer.id==="sites"&&S.sites[f.properties.id])selectSite(f.properties.id);
  else{const {lat,lng}=e.lngLat.wrap();tapPoint(lat,lng);}
}

// Bir sahaya git: seç ve haritayı oraya götür ("Sahalarım" ve ◎ düğmesi)
// Arama sonucuna git: şehir ve koordinatta nokta da seçilir (panelde kaynak puanları görünür)
export function goTo(r){
  if(mk)mk.flyTo(r.lat,r.lon,zoomToH(r.zoom));
  else if(map)map.flyTo({center:[r.lon,r.lat],zoom:Math.min(r.zoom,map.getMaxZoom()),duration:reducedMotion.matches?0:1400,essential:true});
  if(r.sel){armed=false;selectPoint(r.lat,r.lon);ensureVisible(reducedMotion.matches?320:1500);}
}
export function focusSite(id){
  const o=S.sites[id];if(!o)return;selectSite(id);
  if(mk)mk.focus(o.lon,o.lat);else if(map)map.flyTo({center:[o.lon,o.lat],zoom:Math.max(map.getZoom(),8),duration:reducedMotion.matches?0:1200,essential:true});
  ensureVisible(reducedMotion.matches?320:1300);
}
function zoomBy(d){if(mk)mk.zoomBy(d);else if(map)map.easeTo({zoom:map.getZoom()+d,duration:reducedMotion.matches?0:300});}
// Harita düğmeleri: yakınlaştır/uzaklaştır, sıradaki saham, lejant, tam ekran (masaüstü)
function initMapButtons(){
  const $=id=>document.getElementById(id);
  $("zoomIn").onclick=()=>zoomBy(1);$("zoomOut").onclick=()=>zoomBy(-1);
  $("nextSite").onclick=()=>{const ids=Object.keys(S.sites);if(!ids.length){openSheet("saha");return;}
    const i=ids.indexOf(S.sel.id);focusSite(ids[(i+1)%ids.length]);};
  const lg=$("mapLegend"),lb=$("legendBtn");lb.onclick=()=>{lg.hidden=!lg.hidden;lb.setAttribute("aria-expanded",String(!lg.hidden));};
  const fs=$("fsBtn");if(document.fullscreenEnabled&&!mobile.matches){fs.hidden=false;
    fs.onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen().catch(()=>{});}
}

const flatRatio=L=>Math.min(devicePixelRatio||1,L===LEVELS.low?1.5:L===LEVELS.med?2:3);
function applyGfx(L){if(!map)return;map.setPixelRatio(flatRatio(L));if(map.getLayer("hillshade"))map.setLayoutProperty("hillshade","visibility",L.shadows?"visible":"none");}

export async function initMap(){
  initMapButtons();initPotButton();initSearch(goTo);renderMySites(focusSite);
  const el=document.getElementById("map");
  if(MAPKIT){
    try{
      const m=await import("./mapkit.js");
      await m.initMapKit(el,{selectPoint:tapPoint,selectSite,selectRival,fail:e=>{console.warn("Apple Haritalar kapandı, düz haritaya geçiliyor:",e);mapNote("Apple Haritalar kapandı ("+e.message+"); düz harita kullanılıyor.");mk=null;ready=false;el.replaceChildren();initFlat();}});
      mk=m;ready=true;drawMap();setGameClock(S.hour);return;
    }catch(e){console.warn("Apple Haritalar açılamadı, düz harita kullanılıyor:",e);el.replaceChildren();mapNote("Apple Haritalar açılamadı ("+e.message+"); düz harita kullanılıyor.");}
  }
  await initFlat();
}
async function initFlat(){
  const mobile=innerWidth<600,end={center:[S.sel.lon,S.sel.lat-1],zoom:mobile?3.6:4.6};
  map=new maplibregl.Map({container:"map",style:buildStyle(),center:reducedMotion.matches?end.center:[S.sel.lon-70,S.sel.lat-10],zoom:reducedMotion.matches?end.zoom:0.9,
    minZoom:0.6,maxZoom:16,renderWorldCopies:true,attributionControl:{compact:true},pixelRatio:flatRatio(gfx()),dragRotate:false,pitchWithRotate:false,touchPitch:false,maxPitch:0,clickTolerance:8,
    canvasContextAttributes:{antialias:gfx().msaa>1}});
  map.touchZoomRotate.disableRotation();
  // arazi verisi hiç gelmiyorsa (ör. önizleme) yakınlaşma sınırlanır: büyütülmüş bulanık görüntü gösterilmez
  let demOk=false,demErr=0;
  map.on("error",e=>{if(e.sourceId==="omt"&&!vectorOk)useFallback(true);
    if(e.sourceId==="dem"&&!demOk&&++demErr===3)map.setMaxZoom(HD?11:8);});
  map.on("data",e=>{if(e.sourceId==="dem"&&e.tile&&!demOk){demOk=true;map.setMaxZoom(16);}});
  // başarılı yükleme TileJSON'dan katman listesi gelmesiyle anlaşılır (başarısız yüklemede de "loaded" olur)
  map.on("sourcedata",e=>{if(e.sourceId==="omt"&&!vectorOk&&e.sourceDataType==="metadata"&&map.getSource("omt").vectorLayerIds){vectorOk=true;useFallback(false);}});
  await new Promise(r=>map.once("load",r));
  // atıf kutusu kapalı başlasın (dar ekranda haritanın altını kapatmasın); ⓘ ile açılır
  // (kaynaklar değiştikçe kendiliğinden yeniden açılır; kullanıcı ⓘ'ye basmadıkça kapalı tutulur)
  const att=document.querySelector("#map .maplibregl-ctrl-attrib");
  if(att){let userAt=0;att.addEventListener("click",()=>userAt=Date.now(),true);
    const close=()=>{if(Date.now()-userAt>600&&(att.hasAttribute("open")||att.classList.contains("maplibregl-compact-show"))){att.removeAttribute("open");att.classList.remove("maplibregl-compact-show");}};
    new MutationObserver(close).observe(att,{attributes:true,attributeFilter:["class","open"]});close();}
  // vektör kaynağı birkaç saniyede gelmezse yerel adlarla devam et
  if(ONLINE)setTimeout(()=>{if(!vectorOk)useFallback(true);},8000);
  addNight();addPotential();addGameLayers();initWeatherLayer(map);pulseLoop();map.on("zoomend",syncFacilities);map.on("zoom",rescaleFacilities);
  map.on("click",onClick);
  ["rivals","sites"].forEach(l=>{map.on("mouseenter",l,()=>map.getCanvas().style.cursor="pointer");map.on("mouseleave",l,()=>map.getCanvas().style.cursor="");});
  ready=true;onGfx(applyGfx);applyGfx(gfx());drawMap();setGameClock(S.hour);
  if(!reducedMotion.matches)map.flyTo({...end,duration:4500,curve:1.6,essential:false});
  if(new URLSearchParams(location.search).has("fps"))fpsMeter();
  if(import.meta.env.DEV){window.__map=map;}
}

// ?fps: köşede saniyedeki kare sayısı (harita yalnızca değişince çizildiği için hareket ederken anlamlıdır)
function fpsMeter(){
  const el=document.createElement("div");el.className="fpsmeter";document.getElementById("mapwrap").appendChild(el);
  let n=0,t0=performance.now();map.on("render",()=>n++);
  setInterval(()=>{const now=performance.now();el.textContent=`${Math.round(n*1000/(now-t0))} kare/sn`;n=0;t0=now;},1000);
}

// Sahaları, rakipleri ve seçimi haritaya yansıt
export function drawMap(){
  if(globeOpen&&globe)globe.drawGlobe();
  renderMySites(focusSite);
  if(!ready)return;
  if(mk){mk.draw();return;}
  let live=false;
  map.getSource("sites").setData(fc(Object.entries(S.sites).map(([id,o])=>{
    const ps=S.plants.filter(p=>p.t===id),top=ps.slice().sort((a,b)=>b.mw-a.mw)[0],mw=siteMW(id);
    const on=mw&&isLive(plantStatus(id))?1:0;if(on)live=true;
    return pt(o.lon,o.lat,{id,col:top?cssv(TECH[top.k].c):"#FFFFFF",op:top?1:0.3,st:STATUS[o.permit]||"#FFFFFF",t:mw?`${mw} MW`:"",on});})));
  anyLive=live;
  map.getSource("rivals").setData(fc(rivalSites().map(({r,s})=>pt(s.lon,s.lat,{r:r.id,c:r.c,build:s.build>0,t:`${r.sh} ${s.mw} MW${s.build>0?" (inşaat)":""}`}))));
  map.getSource("sel").setData(fc([pt(S.sel.lon,S.sel.lat,{})]));
  syncFacilities();
}

// --- 3D pencere ---
const box3d=()=>document.getElementById("map3d");
async function open3D(id,mode){
  const o=S.sites[id];if(!o)return;
  const b=box3d();b.hidden=false;globeOpen=true;document.body.classList.add("view3d");
  if(!globe){b.classList.add("loading");globe=await import("./globe3d.js");await globe.initGlobe(b.querySelector(".map3d-view"));b.classList.remove("loading");}
  globe.pauseGlobe(false);globe.drawGlobe();globe.setGlobeClock(S.hour);
  if(mode==="orbit")globe.orbitSite(id);else globe.flyToSite(id);
  b.querySelector(".close3d").focus({preventScroll:true});
}
export function close3D(){const b=box3d();if(!b||b.hidden)return;b.hidden=true;globeOpen=false;document.body.classList.remove("view3d");if(globe)globe.pauseGlobe(true);
  const o=S.sites[S.sel.id];if(o&&mk)mk.focus(o.lon,o.lat);
  if(map&&!mk){if(o)map.easeTo({center:[o.lon,o.lat],zoom:Math.max(map.getZoom(),9),duration:reducedMotion.matches?0:800});}}
export function flyToSite(id){open3D(id,"fly");}
export function orbitSite(id){open3D(id,"orbit");}
export function initMap3DUI(){
  const b=box3d();b.querySelector(".close3d").onclick=close3D;
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&globeOpen&&!document.querySelector("dialog[open]"))close3D();});
}
