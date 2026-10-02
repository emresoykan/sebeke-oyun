// --- Harita: CesiumJS 3D dünya ---
// Google Maps API anahtarı varsa (VITE_GOOGLE_MAPS_API_KEY) Google Photorealistic 3D Tiles kullanılır:
// gerçek 3D arazi, binalar ve yüksek çözünürlüklü görüntü. Anahtar yoksa ya da yüklenemezse gömülü
// NASA Blue Marble (gündüz) ve Black Marble (gece) görüntüleriyle küre çizilir.
// Sınırlar, şehirler ve coğrafi bölgeler: Natural Earth.
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import countries from "../data/countries.json";
import landBorders from "../data/borders.json";
import countryLabels from "../data/country-labels.json";
import cities from "../data/cities.json";
import trMosaic from "../data/tr-mosaic.json";
import { PROTECTED } from "../data/protected.js";
import { TECH, SITE_MIN_KM } from "../config.js";
import { km } from "../world.js";
import { S } from "../state.js";
import { cssv, daylight } from "../utils.js";
import { siteMW } from "../sim.js";
import { render } from "./hud.js";
import { renderPanel } from "./panel.js";
import { initModels, syncModels } from "./models.js";

const base=new URL(import.meta.env.BASE_URL,location.href).href;
window.CESIUM_BASE_URL=base+"cesium/";
const GOOGLE_KEY=import.meta.env.VITE_GOOGLE_MAPS_API_KEY||"";
const FONT="'Bricolage Grotesque',system-ui,sans-serif";
// Eski harita zoom seviyesine karşılık gelen kamera yüksekliği (m); etiket bantları buna göre açılır
const H=z=>2.6e7/2**z*(innerWidth<600?0.55:1); // dar ekranda etiketler daha geç belirir
const STATUS={none:"#FFFFFF",pending:"#F2C94C",ok:"#FFFFFF",rejected:"#F06A7D"};

let viewer=null, scene=null, google=null, nightShader=null, ready=false, lastFrame=0;
const borders=[];
const siteEnts=new Map();
let selOuter=null, selInner=null;

function selectSite(id){const o=S.sites[id];S.sel={id,lat:o.lat,lon:o.lon};renderPanel();drawMap();render();}
// Seçili sahaya eğik açıyla yaklaş: kamera sahanın güneyinde, kuzeye bakar
export function flyToSite(id){
  const o=S.sites[id];if(!viewer||!o)return;
  viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(o.lon+0.006,o.lat-0.028,1400),
    orientation:{heading:Cesium.Math.toRadians(-10),pitch:Cesium.Math.toRadians(-22),roll:0},duration:2.4});
}

// Kara sınırları ve Türkiye çerçevesi zemine oturan çizgilerle çizilir (yüzeyle derinlik çakışması olmaz)
function addBorders(){
  const ground=(lines,color,width)=>{
    const geometryInstances=lines.map(l=>new Cesium.GeometryInstance({geometry:new Cesium.GroundPolylineGeometry({positions:Cesium.Cartesian3.fromDegreesArray(l.flat()),width})}));
    borders.push(scene.groundPrimitives.add(new Cesium.GroundPolylinePrimitive({geometryInstances,classificationType:Cesium.ClassificationType.BOTH,
      appearance:new Cesium.PolylineMaterialAppearance({material:Cesium.Material.fromType("Color",{color})})})));};
  ground(landBorders,Cesium.Color.WHITE.withAlpha(0.55),1.5);
  const tur=countries.features.find(f=>f.properties.a3==="TUR").geometry.coordinates.map(poly=>poly[0]);
  ground(tur,Cesium.Color.fromCssColorString("#F06A7D"),2.5);
}

function addLabels(){
  const labels=scene.primitives.add(new Cesium.LabelCollection({scene})),dots=scene.primitives.add(new Cesium.PointPrimitiveCollection());
  const ground={heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,disableDepthTestDistance:1.5e5};
  countryLabels.features.forEach(f=>{const [lon,lat]=f.geometry.coordinates,b=Math.min(7,Math.floor(f.properties.mz)),text=f.properties.n.toLocaleUpperCase("tr-TR");
    decl.push({prio:f.properties.r,far:H(b),center:true,w:text.length*8.2+6,label:labels.add({...ground,position:Cesium.Cartesian3.fromDegrees(lon,lat),text,font:`600 12px ${FONT}`,
      fillColor:Cesium.Color.WHITE.withAlpha(0.9),outlineColor:Cesium.Color.BLACK.withAlpha(0.75),outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,
      horizontalOrigin:Cesium.HorizontalOrigin.CENTER,verticalOrigin:Cesium.VerticalOrigin.CENTER,distanceDisplayCondition:new Cesium.DistanceDisplayCondition(4e5,H(b)),
      scaleByDistance:new Cesium.NearFarScalar(1.5e6,1.0,1.4e7,0.7),translucencyByDistance:new Cesium.NearFarScalar(0.6*H(b),1.0,H(b),0.0)})});});
  cities.forEach(([n,a3,lat,lon,pop,mz,cap])=>{const b=cap?Math.min(Math.floor(mz),2):Math.min(7,Math.floor(mz)),far=H(b+1),pos=Cesium.Cartesian3.fromDegrees(lon,lat);
    dots.add({position:pos,pixelSize:cap?6:4.5,color:Cesium.Color.WHITE,outlineColor:Cesium.Color.BLACK.withAlpha(0.7),outlineWidth:1,disableDepthTestDistance:1.5e5,distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,far)});
    decl.push({prio:(cap?20:40)-Math.log10(pop+10),far,center:false,w:n.length*(cap?7.6:7)+12,label:labels.add({...ground,position:pos,text:n,font:`${cap?600:400} ${cap?13:12}px ${FONT}`,fillColor:Cesium.Color.WHITE,outlineColor:Cesium.Color.BLACK.withAlpha(0.8),outlineWidth:3,
      style:Cesium.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new Cesium.Cartesian2(7,0),horizontalOrigin:Cesium.HorizontalOrigin.LEFT,verticalOrigin:Cesium.VerticalOrigin.CENTER,
      distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,far),translucencyByDistance:new Cesium.NearFarScalar(0.6*far,1.0,far,0.0)})});});
  decl.sort((a,b)=>a.prio-b.prio);
}

// Etiket çakışmalarını ayıkla: öncelik sırasına göre yerleştir, çakışanı gizle (Cesium bunu kendisi yapmaz)
const decl=[];let lastDecl=0;
const win=new Cesium.Cartesian2(),toCam=new Cesium.Cartesian3(),up=new Cesium.Cartesian3();
function declutter(){
  const cp=viewer.camera.positionWC,placed=[],W=viewer.canvas.clientWidth,Hh=viewer.canvas.clientHeight;
  for(const e of decl){
    const p=e.label.position;let ok=Cesium.Cartesian3.distance(cp,p)<=e.far;
    if(ok){Cesium.Cartesian3.normalize(p,up);Cesium.Cartesian3.subtract(cp,p,toCam);ok=Cesium.Cartesian3.dot(up,toCam)>0;} // ufkun arkası
    if(ok){const w=Cesium.SceneTransforms.worldToWindowCoordinates(scene,p,win);ok=!!w&&w.x>-50&&w.x<W+50&&w.y>-20&&w.y<Hh+20;
      if(ok){const x0=e.center?w.x-e.w/2:w.x,x1=x0+e.w,y0=w.y-9,y1=w.y+9;
        ok=!placed.some(b=>x0<b[2]&&x1>b[0]&&y0<b[3]&&y1>b[1]);if(ok)placed.push([x0,y0,x1,y1]);}}
    e.label.show=ok;
  }
}

function addParks(){
  PROTECTED.forEach(([n,lat,lon,r])=>viewer.entities.add({position:Cesium.Cartesian3.fromDegrees(lon,lat),
    ellipse:{semiMajorAxis:r*1000,semiMinorAxis:r*1000,material:Cesium.Color.fromCssColorString("#C2364A").withAlpha(0.25),classificationType:Cesium.ClassificationType.BOTH},
    label:{text:n,font:`500 12px ${FONT}`,fillColor:Cesium.Color.fromCssColorString("#FFD3D9"),outlineColor:Cesium.Color.BLACK.withAlpha(0.7),outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,
      heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,disableDepthTestDistance:1.5e5,distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,H(5))}}));
}

// Google 3D Tiles kendi ışığını taşır (pişmiş aydınlatma); gece için oyun saatine göre karartılır
function makeNightShader(){
  return new Cesium.CustomShader({uniforms:{u_day:{type:Cesium.UniformType.FLOAT,value:1}},lightingModel:Cesium.LightingModel.UNLIT,
    fragmentShaderText:"void fragmentMain(FragmentInput fsInput,inout czm_modelMaterial material){material.diffuse*=mix(vec3(0.07,0.09,0.17),vec3(1.0),u_day);}"});
}
async function addGoogle(){
  if(!GOOGLE_KEY)return;
  try{
    google=await Cesium.createGooglePhotorealistic3DTileset({key:GOOGLE_KEY,onlyUsingWithGoogleGeocoder:true},{showCreditsOnScreen:true,shadows:Cesium.ShadowMode.RECEIVE});
    nightShader=makeNightShader();google.customShader=nightShader;scene.primitives.add(google);scene.globe.show=false;
  }catch(e){console.warn("Google 3D Tiles yüklenemedi, gömülü görüntüyle devam ediliyor:",e);google=null;}
}

function pickGround(pos){
  if(google){const c=scene.pickPosition(pos);if(c)return c;}
  const ray=viewer.camera.getPickRay(pos);return (ray&&scene.globe.show&&scene.globe.pick(ray,scene))||viewer.camera.pickEllipsoid(pos)||null;
}
function onClick(e){
  const picked=scene.pick(e.position);
  let id=picked?(typeof picked.id==="string"?picked.id:picked.id&&picked.id.siteId):null;
  if(id&&!S.sites[id])id=null;
  if(id)return selectSite(id);
  const c=pickGround(e.position);if(!c)return;
  const g=Cesium.Cartographic.fromCartesian(c),lat=Cesium.Math.toDegrees(g.latitude),lon=Cesium.Math.toDegrees(g.longitude);
  let bd=SITE_MIN_KM;Object.entries(S.sites).forEach(([k,o])=>{const d=km(lat,lon,o.lat,o.lon);if(d<bd){bd=d;id=k;}});
  S.sel=id?{id,lat:S.sites[id].lat,lon:S.sites[id].lon}:{id:null,lat:+lat.toFixed(4),lon:+lon.toFixed(4)};
  renderPanel();drawMap();render();
}

export async function initMap(){
  Cesium.Ion.defaultAccessToken=undefined;
  const day=Cesium.ImageryLayer.fromProviderAsync(Cesium.SingleTileImageryProvider.fromUrl(base+"textures/earth-day.jpg",{credit:"Görüntü: NASA Blue Marble"}));
  viewer=new Cesium.Viewer("map",{baseLayer:day,animation:false,timeline:false,baseLayerPicker:false,geocoder:false,homeButton:false,sceneModePicker:false,
    navigationHelpButton:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,shouldAnimate:false,shadows:true,msaaSamples:4,requestRenderMode:false});
  scene=viewer.scene;
  viewer.useBrowserRecommendedResolution=false;viewer.resolutionScale=Math.min(2,devicePixelRatio||1)/(devicePixelRatio||1);
  // Türkiye ve çevresi: ~300 m/piksel Sentinel-2 yaz mozaiği (yakınlaşınca dünya dokusunun bulanıklığını giderir)
  const s2credit=`Contains modified Copernicus Sentinel data ${trMosaic.years.join("–")}`;
  trMosaic.parts.forEach(p=>viewer.imageryLayers.add(Cesium.ImageryLayer.fromProviderAsync(Cesium.SingleTileImageryProvider.fromUrl(base+"textures/"+p.file,
    {rectangle:Cesium.Rectangle.fromDegrees(p.west,p.south,p.east,p.north),credit:s2credit}),{nightAlpha:0})));
  const night=Cesium.ImageryLayer.fromProviderAsync(Cesium.SingleTileImageryProvider.fromUrl(base+"textures/earth-night.jpg",{credit:"Gece ışıkları: NASA Black Marble"}),{dayAlpha:0,nightAlpha:1});
  viewer.imageryLayers.add(night);
  Object.assign(scene.globe,{enableLighting:true,dynamicAtmosphereLighting:true,dynamicAtmosphereLightingFromSun:true,baseColor:Cesium.Color.fromCssColorString("#0B1D33")});
  scene.screenSpaceCameraController.minimumZoomDistance=600;
  viewer.shadowMap.softShadows=true;viewer.shadowMap.size=2048;viewer.shadowMap.maximumDistance=25000;
  viewer.camera.setView({destination:Cesium.Cartesian3.fromDegrees(S.sel.lon,S.sel.lat,innerWidth<600?1.45e7:1.6e7)});
  viewer.screenSpaceEventHandler.setInputAction(onClick,Cesium.ScreenSpaceEventType.LEFT_CLICK);
  viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  addBorders();addLabels();addParks();
  selOuter=viewer.entities.add({point:{pixelSize:24,color:Cesium.Color.TRANSPARENT,outlineColor:Cesium.Color.BLACK,outlineWidth:3.5,heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,disableDepthTestDistance:1.5e5}});
  selInner=viewer.entities.add({point:{pixelSize:22,color:Cesium.Color.TRANSPARENT,outlineColor:Cesium.Color.WHITE,outlineWidth:1.6,heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,disableDepthTestDistance:1.5e5}});
  scene.preRender.addEventListener(stepClock);
  initModels(scene);ready=true;drawMap();
  await addGoogle();
  if(import.meta.env.DEV){window.__viewer=viewer;window.__Cesium=Cesium;}
}

// Oyun saati → Cesium saati: güneş konumu, gece/gündüz sınırı ve gölgeler gerçek coğrafyaya göre hesaplanır.
// Tarih sonbahar ekinoksuna sabitlenir (gün ve gece eşit), saat Türkiye saatidir (UTC+3).
const BASE_DATE=Cesium.JulianDate.fromIso8601("2026-09-22T00:00:00Z");
let targetTime=null;
export function setGameClock(hour){
  if(!viewer)return;
  targetTime=Cesium.JulianDate.addHours(BASE_DATE,hour-3,new Cesium.JulianDate());
  if(nightShader)nightShader.setUniform("u_day",0.15+0.85*daylight(Math.min(hour,23)));
}
function stepClock(){
  const now=performance.now(),dt=Math.min(0.25,(now-(lastFrame||now))/1000);lastFrame=now;
  // çok alçaktan bakarken sınır çizgilerini gizle (yakın planda arazi görünsün); Türkiye çerçevesinin kaba kıyı çizgisi
  // net uydu görüntüsünde kıyıyla örtüşmediği için daha erken gizlenir
  const h=viewer.camera.positionCartographic.height;borders[0].show=h>4e4;borders[1].show=h>5e5;
  if(now-lastDecl>150){lastDecl=now;declutter();}
  if(!targetTime)return;const clk=viewer.clock,diff=Cesium.JulianDate.secondsDifference(targetTime,clk.currentTime);
  if(Math.abs(diff)>6*3600||Math.abs(diff)<1)clk.currentTime=Cesium.JulianDate.clone(targetTime,clk.currentTime); // gece yarısı geçişi: atla
  else clk.currentTime=Cesium.JulianDate.addSeconds(clk.currentTime,diff*(1-Math.exp(-dt*8)),clk.currentTime); // ~0,3 sn'de yetiş
}

// Sahaları, seçimi ve 3D modelleri haritaya yansıt
export function drawMap(){
  if(!ready)return;
  const live=new Set();
  Object.entries(S.sites).forEach(([id,o])=>{
    live.add(id);const ps=S.plants.filter(p=>p.t===id),top=ps.slice().sort((a,b)=>b.mw-a.mw)[0],mw=siteMW(id);
    let e=siteEnts.get(id);
    if(!e){e=viewer.entities.add({position:Cesium.Cartesian3.fromDegrees(o.lon,o.lat),
      point:{pixelSize:12,outlineWidth:2.5,heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,disableDepthTestDistance:1.5e5},
      label:{font:`600 12px ${FONT}`,fillColor:Cesium.Color.WHITE,outlineColor:Cesium.Color.BLACK.withAlpha(0.8),outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset:new Cesium.Cartesian2(0,18),heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,disableDepthTestDistance:1.5e5,distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,H(3))}});
      e.siteId=id;siteEnts.set(id,e);}
    e.point.color=top?Cesium.Color.fromCssColorString(cssv(TECH[top.k].c)):Cesium.Color.WHITE.withAlpha(0.3);
    e.point.outlineColor=Cesium.Color.fromCssColorString(STATUS[o.permit]);
    e.label.text=mw?`${mw} MW`:"";
  });
  for(const [id,e] of siteEnts)if(!live.has(id)){viewer.entities.remove(e);siteEnts.delete(id);}
  const p=Cesium.Cartesian3.fromDegrees(S.sel.lon,S.sel.lat);selOuter.position=p;selInner.position=p;
  syncModels();
}
