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
import { CAL } from "../calendar.js";
import { siteMW } from "../sim.js";
import { render } from "./hud.js";
import { renderPanel } from "./panel.js";
import { initModels, syncModels } from "./models.js";
import { initWeatherLayer } from "./weatherLayer.js";
import { rivalSites } from "../rivals.js";
import { gfx, onGfx, frameTick } from "./quality.js";

const base=new URL(import.meta.env.BASE_URL,location.href).href;
window.CESIUM_BASE_URL=base+"cesium/";
const GOOGLE_KEY=import.meta.env.VITE_GOOGLE_MAPS_API_KEY||"";
const FONT="'Bricolage Grotesque',system-ui,sans-serif";
// Eski harita zoom seviyesine karşılık gelen kamera yüksekliği (m); etiket bantları buna göre açılır
const H=z=>2.6e7/2**z*(innerWidth<600?0.55:1); // dar ekranda etiketler daha geç belirir
const STATUS={none:"#FFFFFF",pending:"#F2C94C",ok:"#FFFFFF",rejected:"#F06A7D"};

let viewer=null, scene=null, google=null, nightShader=null, ready=false, lastFrame=0;
const borders=[];
const siteEnts=new Map(), rivEnts=new Map();
let selOuter=null, selInner=null;
// seçim halkası ve saha işaretleri her zaman üstte çizilir: Google 3D zemini (arazi yüksekliği) onları kısmen örtüp
// karolar yüklendikçe titreştirmesin. Kürenin arkasına geçenler stepClock içinde gizlenir.
const ON_TOP=Number.POSITIVE_INFINITY;

function selectSite(id){const o=S.sites[id];S.sel={id,lat:o.lat,lon:o.lon};renderPanel();drawMap();render();}
// Seçili sahaya eğik açıyla yaklaş: kamera sahanın güneyinde, kuzeye bakar
export function flyToSite(id){
  const o=S.sites[id];if(!viewer||!o)return;stopOrbit();
  viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(o.lon+0.006,o.lat-0.028,1400),
    orientation:{heading:Cesium.Math.toRadians(-10),pitch:Cesium.Math.toRadians(-22),roll:0},duration:2.4});
}

// Grafik kalitesi: kenar yumuşatma, çözünürlük, Google 3D ayrıntısı ve boşta kare hızı
function applyGfx(L){
  if(!viewer)return;const dpr=devicePixelRatio||1;
  scene.msaaSamples=L.msaa;scene.postProcessStages.fxaa.enabled=L.fxaa;
  viewer.resolutionScale=Math.min(L.px,dpr)/dpr;viewer.targetFrameRate=L.idle;
  if(google)google.maximumScreenSpaceError=L.sse;
}

// Ortam sesi için kameranın konumu
export function camInfo(){if(!viewer)return null;const c=viewer.camera.positionCartographic;return {lat:Cesium.Math.toDegrees(c.latitude),lon:Cesium.Math.toDegrees(c.longitude),h:c.height};}

// Sinematik tur: kamera sahanın etrafında yavaşça döner; dokunma, sürükleme veya kaydırma turu bitirir
let orbit=null;
const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)");
export function stopOrbit(){if(!orbit)return;orbit=null;viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);document.body.classList.remove("cine");}
export function orbitSite(id){
  const o=S.sites[id];if(!viewer||!o)return;stopOrbit();
  const carto=Cesium.Cartographic.fromDegrees(o.lon,o.lat),gh=(google?scene.sampleHeight(carto):scene.globe.getHeight(carto))||0;
  const center=Cesium.Cartesian3.fromDegrees(o.lon,o.lat,gh+60),h0=Cesium.Math.toRadians(-10);
  if(reducedMotion.matches){viewer.camera.lookAt(center,new Cesium.HeadingPitchRange(h0,Cesium.Math.toRadians(-16),1000));viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);return;}
  viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(center,250),{offset:new Cesium.HeadingPitchRange(h0,Cesium.Math.toRadians(-16),1000),duration:2.6,
    complete:()=>{orbit={center,head:h0,t0:performance.now(),last:performance.now()};document.body.classList.add("cine");}});
}
function stepOrbit(now){
  if(!orbit)return;const dt=(now-orbit.last)/1000;orbit.last=now;const t=(now-orbit.t0)/1000;
  if(t>75)return stopOrbit();
  orbit.head+=dt*0.09; // ~70 sn'de bir tur
  const range=1000-250*Math.sin(t*0.12),pitch=Cesium.Math.toRadians(-16+5*Math.sin(t*0.07));
  viewer.camera.lookAt(orbit.center,new Cesium.HeadingPitchRange(orbit.head,pitch,range));
}
// Açılış: kamera uzaydan dönerek Türkiye'ye iner
function intro(){
  const lon=S.sel.lon,lat=S.sel.lat,end=Cesium.Cartesian3.fromDegrees(lon,lat-1.2,innerWidth<600?5.2e6:3.4e6);
  if(reducedMotion.matches){viewer.camera.setView({destination:end});return;}
  viewer.camera.setView({destination:Cesium.Cartesian3.fromDegrees(lon-75,lat-8,3.4e7)});
  viewer.camera.flyTo({destination:end,duration:5.5,easingFunction:Cesium.EasingFunction.CUBIC_IN_OUT});
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
const win=new Cesium.Cartesian2(),toCam=new Cesium.Cartesian3(),up=new Cesium.Cartesian3(),pos=new Cesium.Cartesian3();
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
    nightShader=makeNightShader();google.customShader=nightShader;google.maximumScreenSpaceError=gfx().sse;scene.primitives.add(google);scene.globe.show=false;
  }catch(e){console.warn("Google 3D Tiles yüklenemedi, gömülü görüntüyle devam ediliyor:",e);google=null;}
}

function pickGround(pos){
  if(google){const c=scene.pickPosition(pos);if(c)return c;}
  const ray=viewer.camera.getPickRay(pos);return (ray&&scene.globe.show&&scene.globe.pick(ray,scene))||viewer.camera.pickEllipsoid(pos)||null;
}
function onClick(e){
  const picked=scene.pick(e.position);
  // rakip sahası: panelde şirket bilgisi gösterilir
  if(picked&&picked.id&&picked.id.rivalPos){const [lat,lon]=picked.id.rivalPos;S.sel={id:null,lat,lon};renderPanel();drawMap();render();return;}
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
    navigationHelpButton:false,fullscreenButton:false,infoBox:false,selectionIndicator:false,shouldAnimate:false,shadows:true,msaaSamples:gfx().msaa,requestRenderMode:false});
  scene=viewer.scene;
  // kamera dururken 30 kare/sn yeterli (rotorlar ve bulutlar akıcı kalır); kullanıcı haritayı oynatırken tam hız
  viewer.camera.moveStart.addEventListener(()=>{viewer.targetFrameRate=undefined;});
  viewer.camera.moveEnd.addEventListener(()=>{viewer.targetFrameRate=gfx().idle;});
  viewer.useBrowserRecommendedResolution=false;applyGfx(gfx());onGfx(applyGfx);
  // Türkiye ve çevresi: ~300 m/piksel Sentinel-2 yaz mozaiği (yakınlaşınca dünya dokusunun bulanıklığını giderir)
  const s2credit=`Contains modified Copernicus Sentinel data ${trMosaic.years.join("–")}`;
  trMosaic.parts.forEach(p=>viewer.imageryLayers.add(Cesium.ImageryLayer.fromProviderAsync(Cesium.SingleTileImageryProvider.fromUrl(base+"textures/"+p.file,
    {rectangle:Cesium.Rectangle.fromDegrees(p.west,p.south,p.east,p.north),credit:s2credit}),{nightAlpha:0})));
  const night=Cesium.ImageryLayer.fromProviderAsync(Cesium.SingleTileImageryProvider.fromUrl(base+"textures/earth-night.jpg",{credit:"Gece ışıkları: NASA Black Marble"}),{dayAlpha:0,nightAlpha:1});
  viewer.imageryLayers.add(night);
  Object.assign(scene.globe,{enableLighting:true,dynamicAtmosphereLighting:true,dynamicAtmosphereLightingFromSun:true,baseColor:Cesium.Color.fromCssColorString("#0B1D33")});
  scene.screenSpaceCameraController.minimumZoomDistance=600;
  viewer.shadowMap.softShadows=true;viewer.shadowMap.size=2048;viewer.shadowMap.maximumDistance=25000;
  intro();
  ["pointerdown","wheel"].forEach(ev=>viewer.canvas.addEventListener(ev,stopOrbit,{passive:true}));
  viewer.screenSpaceEventHandler.setInputAction(onClick,Cesium.ScreenSpaceEventType.LEFT_CLICK);
  viewer.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  addBorders();addLabels();addParks();
  selOuter=viewer.entities.add({point:{pixelSize:24,color:Cesium.Color.TRANSPARENT,outlineColor:Cesium.Color.BLACK,outlineWidth:3.5,heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,disableDepthTestDistance:ON_TOP}});
  selInner=viewer.entities.add({point:{pixelSize:22,color:Cesium.Color.TRANSPARENT,outlineColor:Cesium.Color.WHITE,outlineWidth:1.6,heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,disableDepthTestDistance:ON_TOP}});
  scene.preRender.addEventListener(stepClock);
  initModels(scene);initWeatherLayer(viewer);ready=true;drawMap();
  await addGoogle();
  if(import.meta.env.DEV){window.__viewer=viewer;window.__Cesium=Cesium;}
}

// Oyun saati → Cesium saati: güneş konumu, gece/gündüz sınırı ve gölgeler gerçek coğrafyaya göre hesaplanır.
// Tarih oyunun takviminden gelir (mevsimle güneşin yüksekliği ve gün uzunluğu değişir), saat Türkiye saatidir (UTC+3).

let targetTime=null;
export function setGameClock(hour){
  if(!viewer)return;
  targetTime=Cesium.JulianDate.addHours(Cesium.JulianDate.fromDate(CAL.date),hour-3,new Cesium.JulianDate());
  if(nightShader)nightShader.setUniform("u_day",0.15+0.85*daylight(Math.min(hour,23)));
}
function stepClock(){
  const now=performance.now(),dt=Math.min(0.25,(now-(lastFrame||now))/1000);lastFrame=now;
  stepOrbit(now);
  // çok alçaktan bakarken sınır çizgilerini gizle (yakın planda arazi görünsün); Türkiye çerçevesinin kaba kıyı çizgisi
  // net uydu görüntüsünde kıyıyla örtüşmediği için daha erken gizlenir
  const h=viewer.camera.positionCartographic.height;borders[0].show=h>4e4;borders[1].show=h>5e5;
  // gölgeler yalnızca yakın planda görünür; uzaktayken kapatmak ekran kartını epey rahatlatır
  const sh=gfx().shadows&&h<8e4;if(viewer.shadows!==sh)viewer.shadows=sh;
  frameTick(now);
  if(now-lastDecl>150){lastDecl=now;declutter();
    // her zaman üstte çizilen işaretler kürenin arkasına geçince görünmesin
    const cp=viewer.camera.positionWC,front=e=>{const p=e.position.getValue(viewer.clock.currentTime,pos);if(!p)return false;
      Cesium.Cartesian3.normalize(p,up);Cesium.Cartesian3.subtract(cp,p,toCam);return Cesium.Cartesian3.dot(up,toCam)>0;};
    selOuter.show=selInner.show=front(selOuter);for(const e of siteEnts.values())e.show=front(e);for(const e of rivEnts.values())e.show=front(e);}
  if(!targetTime)return;const clk=viewer.clock,diff=Cesium.JulianDate.secondsDifference(targetTime,clk.currentTime);
  if(Math.abs(diff)>6*3600||Math.abs(diff)<1)clk.currentTime=Cesium.JulianDate.clone(targetTime,clk.currentTime); // gece yarısı geçişi: atla
  else clk.currentTime=Cesium.JulianDate.addSeconds(clk.currentTime,diff*(1-Math.exp(-dt*8)),clk.currentTime); // ~0,3 sn'de yetiş
}

// Rakip sahaları: şirket renginde eşkenar dörtgen; inşaattakiler soluk
const diamonds={};
function diamond(c){if(diamonds[c])return diamonds[c];const cv=document.createElement("canvas");cv.width=cv.height=28;const x=cv.getContext("2d");
  x.translate(14,14);x.rotate(Math.PI/4);x.fillStyle=c;x.strokeStyle="rgba(10,15,25,.85)";x.lineWidth=2.5;x.fillRect(-7,-7,14,14);x.strokeRect(-7,-7,14,14);return diamonds[c]=cv;}
function drawRivals(){
  const live=new Set();
  rivalSites().forEach(({r,i,s})=>{const key=r.id+":"+i;live.add(key);let e=rivEnts.get(key);
    if(!e){e=viewer.entities.add({position:Cesium.Cartesian3.fromDegrees(s.lon,s.lat),
      billboard:{image:diamond(r.c),heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,disableDepthTestDistance:ON_TOP},
      label:{font:`600 11px ${FONT}`,fillColor:Cesium.Color.fromCssColorString(r.c),outlineColor:Cesium.Color.BLACK.withAlpha(0.85),outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset:new Cesium.Cartesian2(0,16),heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,disableDepthTestDistance:ON_TOP,distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,H(4))}});
      e.rivalPos=[s.lat,s.lon];rivEnts.set(key,e);}
    e.billboard.color=s.build>0?Cesium.Color.WHITE.withAlpha(0.5):Cesium.Color.WHITE;
    e.label.text=`${r.sh} ${s.mw} MW${s.build>0?" (inşaat)":""}`;});
  for(const [k,e] of rivEnts)if(!live.has(k)){viewer.entities.remove(e);rivEnts.delete(k);}
}

// Sahaları, seçimi ve 3D modelleri haritaya yansıt
export function drawMap(){
  if(!ready)return;
  const live=new Set();
  Object.entries(S.sites).forEach(([id,o])=>{
    live.add(id);const ps=S.plants.filter(p=>p.t===id),top=ps.slice().sort((a,b)=>b.mw-a.mw)[0],mw=siteMW(id);
    let e=siteEnts.get(id);
    if(!e){e=viewer.entities.add({position:Cesium.Cartesian3.fromDegrees(o.lon,o.lat),
      point:{pixelSize:12,outlineWidth:2.5,heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,disableDepthTestDistance:ON_TOP},
      label:{font:`600 12px ${FONT}`,fillColor:Cesium.Color.WHITE,outlineColor:Cesium.Color.BLACK.withAlpha(0.8),outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset:new Cesium.Cartesian2(0,18),heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,disableDepthTestDistance:ON_TOP,distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,H(3))}});
      e.siteId=id;siteEnts.set(id,e);}
    e.point.color=top?Cesium.Color.fromCssColorString(cssv(TECH[top.k].c)):Cesium.Color.WHITE.withAlpha(0.3);
    e.point.outlineColor=Cesium.Color.fromCssColorString(STATUS[o.permit]);
    e.label.text=mw?`${mw} MW`:"";
  });
  for(const [id,e] of siteEnts)if(!live.has(id)){viewer.entities.remove(e);siteEnts.delete(id);}
  drawRivals();
  const p=Cesium.Cartesian3.fromDegrees(S.sel.lon,S.sel.lat);selOuter.position=p;selInner.position=p;
  syncModels();
}
