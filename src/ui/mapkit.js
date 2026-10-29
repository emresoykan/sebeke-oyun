// --- Ana harita: Apple Haritalar (MapKit JS) ---
// VITE_MAPKIT_TOKEN tanımlıysa oyun Apple'ın haritasında oynanır (varsayılan hibrit: uydu görüntüsü + yol ve yer adları;
// sağ üstteki Apple düğmesiyle Standart/Uydu/Hibrit seçilir, seçim hatırlanır). MapKit JS betiği cdn.apple-mapkit.com'dan
// yüklenir. Belirteç Apple Developer hesabındaki Maps panosunda yalnızca sitenin alan adında çalışacak şekilde (Domain
// kısıtlı) üretilir; bu yüzden sayfaya gömülmesi amaçlanan kullanımdır. Betik yüklenemezse veya belirteç reddedilirse
// map.js düz MapLibre haritasına döner.
// Oyun katmanları: sahalar, rakipler ve seçim halkası HTML işaretleri; korunan alanlar ve fırtınalar daire katmanı;
// gece tarafı ve bulutlar karo katmanı (karolar tarayıcıda tuvalden üretilir).
import { wp } from "../perfmark.js";
import { fxOf } from "./wxfx.js";
import { S } from "../state.js";
import { TECH } from "../config.js";
import { cssv } from "../utils.js";
import { CAL } from "../calendar.js";
import { siteMW } from "../sim.js";
import { rivalSites } from "../rivals.js";
import { PROTECTED } from "../data/protected.js";
import { plantStatus, isLive } from "../plantstatus.js";
import { wxOn, cloudCanvas, tickClouds, activeStorms } from "./wxflat.js";
import * as P from "./potential.js";
import { realTileURL, onRealChange, onRealTile, realOn, setRealView } from "./realplants.js";
import { bndOf, occText, liveText, battHtml } from "./sitelive.js";
import { addRotors, spinRotors } from "./rotors.js";
import { siteCap, capMW } from "../rules.js";

const TOKEN=import.meta.env.VITE_MAPKIT_TOKEN;
const SRC="https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js";
const PREF="sebeke-mk-type",RAD=Math.PI/180;
const STATUS={none:"#FFFFFF",pending:"#F2C94C",ok:"#FFFFFF",rejected:"#F06A7D"};
const reduced=matchMedia("(prefers-reduced-motion: reduce)");
// MapLibre yakınlığı ile kamera yüksekliği (m) arasındaki yaklaşık ilişki (map.js ile aynı)
const zoomToH=z=>2.6e7/2**z;
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
let mk=null,map=null,box=null,hooks=null,sel=null,night=null,clouds=null,storms=[],parkLabels=[],lastHour=null,cloudVer=0,tapAt=0,failed=false;
const sites=new Map(),rivals=new Map();
// Karo katmanları (gece, bulut) için eşzamansız önbellek: get() hazır görüntüyü, yoksa eskisini (o da yoksa null) hemen
// döndürür, eksik karoyu kuyruğa koyar. Kuyruk karo karo çizilir; görüntü toBlob ile kodlanır (toDataURL ana iş
// parçacığını bekletiyordu: her oyun saatinde gece ve bulut karolarının hepsi baştan kodlanıyor, harita takılıyordu).
// Kuyruk bitince reload çağrılır; o sırada harita hareket ediyorsa ya da yeni durulduysa yenileme bekler (whenStill).
// ver değişince karolar yeniden çizilir.
function asyncTiles(draw,reload,max=400,name="karo"){
  const cache=new Map(),q=new Map();let busy=false,last=0,ver="";
  const drop=u=>{if(u)setTimeout(()=>URL.revokeObjectURL(u),5000);}; // harita eski adresi hâlâ yüklüyor olabilir
  async function step(){
    const it=q.entries().next();if(it.done){busy=false;whenStill(reload);return;}
    const [k,t]=it.value;q.delete(k);let url=null;
    if(t.v===ver){const t0=performance.now(),c=draw(t.x,t.y,t.z);wp(name,t0);if(c){const b=await new Promise(r=>{try{c.toBlob(r,"image/png");}catch(e){r(null);}});c.width=c.height=0;url=b?URL.createObjectURL(b):null;}
      const o=cache.get(k);cache.delete(k);cache.set(k,{v:t.v,url});if(o&&o.url!==url)drop(o.url);
      while(cache.size>max){const [ok,ov]=cache.entries().next().value;cache.delete(ok);drop(ov.url);}}
    setTimeout(step,0); // katman yalnızca kuyruk bitince yenilenir (her yenileme haritanın karo yüklemesiyle yarışıyor)
  }
  return {get(x,y,z){const k=`${z}/${x}/${y}`,c=cache.get(k);if(c&&c.v===ver)return c.url;
      if(!(q.has(k)&&q.get(k).v===ver)){q.set(k,{x,y,z,v:ver});if(!busy){busy=true;setTimeout(step,0);}}return c?c.url:null;},
    setVer(v){ver=String(v);}};
}
// harita kaydırılırken karo katmanları yenilenmez (dokunuşla kaydırma takılmasın); bitince bekleyenler uygulanır
// Kaydırma bittikten sonra da 2 sn beklenir: Apple'ın kendi karoları (uydu görüntüsü) önce yüklensin; bizim katman
// yenilemelerimiz aynı anda karo istediği için harita uzun süre boş ızgara kalıyordu
let moving=false,settleT=0;const afterMove=[];
const flush=()=>{settleT=0;if(!moving)afterMove.splice(0).forEach(f=>f());};
const whenStill=f=>{if(moving||settleT){if(!afterMove.includes(f))afterMove.push(f);}else f();};
// katman yenileme; ?perf=1 açıksa sayılır (perfprobe.js raporunda "katman yenilemeleri"). Bekleyen yenilemeler aynı işlevle
// sıraya girer: harita durulunca her katman bir kez yenilenir
const rl=(o,n)=>{if(!o)return;wp("Apple yenileme: "+n,performance.now());o.reload();};
const reNight=()=>rl(night,"gece"),reClouds=()=>rl(clouds,"bulut"),reWeather=()=>{rl(clouds,"bulut");drawStorms();};

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
// İşaret: MapKit'e sıfır boyutlu bir çapa verilir, nokta bu çapaya ortalanır; böylece MapKit'in çapa noktası
// (alt orta veya merkez) ne olursa olsun nokta tam koordinatın üstünde durur. Etiket noktanın altında taşar.
function marker(cls,size,onSelect){
  const anchor=div("mk-anchor"),root=div("mk-mark "+cls,anchor),lab=div("mk-lbl",root);
  const a=new mk.Annotation(coord(0,0),()=>anchor,{calloutEnabled:false,
    displayPriority:mk.Annotation.DisplayPriority.Required,collisionMode:mk.Annotation.CollisionMode.None});
  const m0={a,root,lab,anchor,key:""};
  // parmakla dokunmak için nokta çevresinde görünmez 44 piksellik alan
  if(onSelect)div("mk-hit",root);
  if(onSelect)a.addEventListener("select",()=>{tapAt=performance.now();setTimeout(()=>{a.selected=false;},0);onSelect();});
  else a.enabled=false;
  return m0;
}
function place(m,lat,lon){const k=lat+","+lon;if(m.key!==k){m.key=k;m.lat=lat;m.lon=lon;m.a.coordinate=coord(lat,lon);}}

// --- Yakınlaşınca tesisin kendisi (siteimage.js): işaretin arkasına gerçek ölçekli kuşbakışı görüntü (büyütme yok) ---
// three.js ilk yakınlaşmada yüklenir; boyut her harita hareketinde (yakınlaştırırken her karede) metre/piksele göre ayarlanır.
const FAC_H=zoomToH(11);let F=null,Fload=null,facRaf=0;
function facPpm(m){const kx=111320*Math.cos(m.lat*RAD),a=map.convertCoordinateToPointOnPage(coord(m.lat,m.lon)),b=map.convertCoordinateToPointOnPage(coord(m.lat,m.lon+1000/kx));return (b.x-a.x)/1000;}
function sizeFac(m){
  if(!m.fac||!m.img||!map)return;
  const k=facPpm(m),[e0,e1]=m.img.east,[n0,n1]=m.img.north,w=(e1-e0)*k,vis=map.cameraDistance<FAC_H&&w<9000;
  m.fac.style.display=vis?"":"none";m.root.classList.toggle("fac",vis);if(m.rot&&!vis)m.rot.style.display="none";if(!vis)return;
  const box={width:w+"px",height:(n1-n0)*k+"px",left:e0*k+"px",top:-n1*k+"px"};Object.assign(m.fac.style,box);
  if(m.rot){Object.assign(m.rot.style,box);m.rot.style.display="";}
  const url=F.lodFor(m.img,w*(window.devicePixelRatio||1));if(m.facUrl!==url){m.facUrl=url;m.fac.src=url;}
}
function ensureFac(id,m){
  if(!F)return;const sig=F.siteSig(id);if(m.facSig===sig)return;m.facSig=sig;
  F.siteImage(id,true).then(img=>{if(m.facSig!==sig||!map)return;
    if(!img){if(m.fac){m.fac.remove();m.fac=null;}dropRot(m);m.root.classList.remove("fac");return;}
    if(!m.fac){m.fac=document.createElement("img");m.fac.className="mk-fac";m.fac.alt="";m.anchor.insertBefore(m.fac,m.anchor.firstChild);}
    m.img=img;m.facUrl=null;buildRot(m);spinRot(m,id);sizeFac(m);});
}
// dönen pervaneler (rotors.js): tesis görüntüsüyle aynı kutuda
function dropRot(m){if(m.rot){m.rot.remove();m.rot=null;}m.spin=[];}
function buildRot(m){dropRot(m);const hs=m.img&&m.img.hubs;if(!hs||!hs.length||!m.fac)return;m.rot=div("mk-rot");m.fac.after(m.rot);m.spin=addRotors(m.rot,hs);}
const spinRot=(m,id)=>{if(m.spin&&m.spin.length)spinRotors(m.spin,plantStatus(id));};
function syncFac(){
  if(!map||map.cameraDistance>FAC_H*1.3)return sites.forEach(sizeFac);
  if(!F){Fload=Fload||import("./siteimage.js").then(x=>{F=x;sites.forEach((m,id)=>ensureFac(id,m));});return;}
  sites.forEach((m,id)=>{ensureFac(id,m);sizeFac(m);});
}
function facLoop(){cancelAnimationFrame(facRaf);const step=()=>{sites.forEach(sizeFac);sizeBnds();facRaf=requestAnimationFrame(step);};facRaf=requestAnimationFrame(step);}

// --- Yakında saha sınırı (kesik çizgi, doluluk) ve kendi sahanda canlı üretim kutusu (sitelive.js) ---
// Tesis görüntüsüyle aynı yakınlıkta görünür; rakip sahalarında yalnızca sınır ve doluluk çizilir.
function ensureBnd(m,live){
  if(m.bnd)return;m.bnd=div("mk-bnd");m.bndLab=div("mk-bndlbl",m.bnd);m.bnd.style.display="none";m.anchor.insertBefore(m.bnd,m.anchor.firstChild);
  if(live){m.live=div("mk-live",m.anchor);m.live.style.display="none";}
}
function sizeBnd(m){
  if(!m.bnd)return;const near=map.cameraDistance<FAC_H;
  if(!near){if(m.bndOn){m.bndOn=false;m.bnd.style.display="none";if(m.live)m.live.style.display="none";}return;}
  const k=facPpm(m),[e0,e1,n0,n1]=bndOf(m.fac?m.img:null),w=(e1-e0)*k,vis=w>=30&&w<12000;
  if(vis!==m.bndOn){m.bndOn=vis;m.bnd.style.display=vis?"":"none";if(m.live)m.live.style.display=vis&&m.liveKey?"":"none";}
  if(!vis)return;
  Object.assign(m.bnd.style,{width:w+"px",height:(n1-n0)*k+"px",left:e0*k+"px",top:-n1*k+"px"});
  m.bnd.classList.toggle("lbl",w>=90);
}
function sizeBnds(){if(!map)return;sites.forEach(sizeBnd);rivals.forEach(sizeBnd);}

// --- Gece tarafı: karo başına güneş yüksekliğinden karanlık (map.js'teki düz harita ile aynı eşikler) ---
// Yakında (z > NIGHT_Z) gece karanlığı görünüm içinde tek renktir: her karo için hesap yerine görünüm merkezindeki
// güneş yüksekliğinden tek bir düz karo üretilir ve hepsine o verilir (yakınlaştıkça karo sayısı katlanarak artıyordu)
const NIGHT_Z=7,flatNight=new Map();let flatKey="";
function nightAlpha(lat,lon){const d=CAL.decl*RAD,sub=(12-(lastHour-3))*15,
  el=Math.asin(clamp(Math.sin(lat*RAD)*Math.sin(d)+Math.cos(lat*RAD)*Math.cos(d)*Math.cos((lon-sub)*RAD),-1,1))/RAD,t=clamp((4-el)/14,0,1);return t*t*(3-2*t)*72;}
function flatNightKey(){if(!map||lastHour==null)return "";const c=map.center,a=Math.round(nightAlpha(c.latitude,c.longitude)/4)*4;return String(a);}
function nightGet(x,y,z){
  if(z<=NIGHT_Z)return nightT.get(x,y,z);
  const k=flatKey||(flatKey=flatNightKey());if(!k||k==="0")return null;let u=flatNight.get(k);
  if(!u){const c=document.createElement("canvas");c.width=c.height=4;const g=c.getContext("2d");g.fillStyle=`rgba(2,6,18,${(+k/255).toFixed(3)})`;g.fillRect(0,0,4,4);u=c.toDataURL();c.width=c.height=0;flatNight.set(k,u);}
  return u;
}
// görünüm ya da saat değişince düz gece karosu güncellenir (yalnızca yakındayken ve renk değiştiyse)
function refreshFlatNight(){if(!map||!night)return;const k=flatNightKey();if(k!==flatKey){flatKey=k;if(map.cameraDistance<zoomToH(NIGHT_Z+0.5))rl(night,"gece");}}
function nightDraw(x,y,z){
  const n=2**z;if(lastHour==null||y<0||y>=n)return null;x=((x%n)+n)%n;
  const N=64,c=document.createElement("canvas");c.width=c.height=N;const g=c.getContext("2d"),im=g.createImageData(N,N),px=im.data;
  const d=CAL.decl*RAD,sd=Math.sin(d),cd=Math.cos(d),sub=(12-(lastHour-3))*15;
  for(let j=0;j<N;j++){const la=Math.atan(Math.sinh(Math.PI*(1-2*(y+(j+0.5)/N)/n))),a=Math.sin(la)*sd,b=Math.cos(la)*cd;
    for(let i=0;i<N;i++){const lon=(x+(i+0.5)/N)/n*360-180,el=Math.asin(clamp(a+b*Math.cos((lon-sub)*RAD),-1,1))/RAD,t=clamp((4-el)/14,0,1),p=(j*N+i)*4;
      px[p]=2;px[p+1]=6;px[p+2]=18;px[p+3]=t*t*(3-2*t)*72;}}
  g.putImageData(im,0,0);return c;
}
// --- Bulutlar: düz haritanın Mercator bulut tuvalinden karo kesilir; yakınlaştıkça incelir ---
function cloudDraw(x,y,z){
  const n=2**z;if(!wxOn()||y<0||y>=n)return null;x=((x%n)+n)%n;
  const cv=cloudCanvas(),sw=cv.width/n,c=document.createElement("canvas");c.width=c.height=256;
  const g=c.getContext("2d");g.imageSmoothingEnabled=true;g.drawImage(cv,x*sw,y*sw,sw,sw,0,0,256,256);return c;
}
let nightT=null,cloudT=null,nightLast=0,nightTimer=0;
const cloudOpacity=h=>{const z=Math.log2(2.6e7/h);return z<=2?0.9:z<=4?0.9-0.2*(z-2):z<=5?0.5-0.3*(z-4):z<=6?0.2-0.2*(z-5):0;};

function drawStorms(){
  if(storms.length)map.removeOverlays(storms);
  const st=new mk.Style({strokeColor:"#FF6B6B",lineWidth:2.2,lineDash:[6,4],fillColor:"#FF6B6B",fillOpacity:0.06});
  storms=activeStorms().map(s=>new mk.CircleOverlay(coord(s.lat,s.lon),s.r*750,{style:st,enabled:false}));
  if(storms.length)map.addOverlays(storms);
}
function updateWeather(force){
  if(!map)return;
  // bulutlar görünmüyorsa (hava kapalı ya da yakın: saydamlık 0) karo üretilmez; görünür olunca onRegion yeniler
  if(!force&&(moving||!clouds.opacity))return;
  if(tickClouds(force)){cloudVer++;cloudT.setVer(cloudVer);whenStill(reWeather);}
}

// Yakınlığa göre: bulut saydamlığı, etiketlerin görünürlüğü (düz haritadaki eşiklerle)
function onRegion(){
  if(!map)return;const h=map.cameraDistance,el=box;
  const was=clouds.opacity;clouds.opacity=wxOn()?cloudOpacity(h):0;if(!was&&clouds.opacity)updateWeather(true);
  el.classList.toggle("mk-z3",h<zoomToH(3));el.classList.toggle("mk-z4",h<zoomToH(4));
  const showParks=h<zoomToH(6);parkLabels.forEach(a=>{if(a.visible!==showParks)a.visible=showParks;});
}

export async function initMapKit(el,h){
  if(!TOKEN)throw new Error("VITE_MAPKIT_TOKEN tanımlı değil");
  hooks=h;mk=await loadScript();await authorize();
  const T=mk.Map.MapTypes;let type=T.Hybrid;
  try{const v=localStorage.getItem(PREF);if(v&&Object.values(T).includes(v))type=v;}catch(e){}
  const mobile=innerWidth<600,end=zoomToH(mobile?3.6:4.6);
  map=new mk.Map(el,{mapType:type,colorScheme:mk.Map.ColorSchemes.Dark,showsMapTypeControl:true,showsZoomControl:false,
    showsCompass:mk.FeatureVisibility.Hidden,showsScale:mk.FeatureVisibility.Hidden,isRotationEnabled:false,showsPointsOfInterest:false,
    center:coord(S.sel.lat-1,S.sel.lon)});
  map.cameraDistance=reduced.matches?end:1.4e7;
  box=el;el.classList.add("mk-map");
  map.addEventListener("map-type-change",()=>{try{localStorage.setItem(PREF,map.mapType);}catch(e){}});
  // haritaya dokunma: işarete dokunulduysa ("select") nokta seçimi yapılmaz
  // koordinat dokunma anında çevrilir: 40 ms içinde harita kayarsa (açılış animasyonu, savrulma) nokta kaymasın
  // dokunma noktası: MapKit'in pointOnPage'i ile tarayıcının işaretçi olayı karşılaştırılır; 24 px'ten çok ayrışırsa
  // işaretçi olayı kullanılır (MapKit sayfa ölçeği ya da kaydırmayla şaşarsa seçim kaymasın). ?tapdebug=1: tıklanan
  // nokta kırmızı, seçilen koordinatın haritadaki yeri yeşil işaretlenir, ikisi konsola yazılır
  let lastPtr=null;el.addEventListener("pointerup",e=>{lastPtr={x:e.clientX+scrollX,y:e.clientY+scrollY,t:performance.now()};},{capture:true,passive:true});
  const DBG=new URLSearchParams(location.search).has("tapdebug");
  const dot=(x,y,c)=>{const d=document.createElement("div");Object.assign(d.style,{position:"absolute",left:x-6+"px",top:y-6+"px",width:"12px",height:"12px",borderRadius:"50%",background:c,zIndex:9999,pointerEvents:"none",border:"2px solid #fff"});document.body.appendChild(d);setTimeout(()=>d.remove(),4000);};
  map.addEventListener("single-tap",e=>{let p=e.pointOnPage;if(!p){stopIntro();return;}
    if(lastPtr&&performance.now()-lastPtr.t<1000&&Math.hypot(lastPtr.x-p.x,lastPtr.y-p.y)>24){console.warn("MapKit dokunma noktası işaretçiden farklı:",p.x,p.y,"→",lastPtr.x,lastPtr.y);p=new DOMPoint(lastPtr.x,lastPtr.y);}
    const c=map.convertPointOnPageToCoordinate(p);stopIntro();
    if(DBG){const q=map.convertCoordinateToPointOnPage(c);dot(p.x,p.y,"#E5484D");dot(q.x,q.y,"#30A46C");console.log("tapdebug",{page:[p.x,p.y],ptr:lastPtr&&[lastPtr.x,lastPtr.y],lat:c.latitude,lon:c.longitude,back:[q.x,q.y]});}
    setTimeout(()=>{if(!map||performance.now()-tapAt<400)return;if(hooks.realTap&&hooks.realTap(p.x,p.y,c.latitude,((c.longitude+540)%360)-180))return;
      hooks.selectPoint(c.latitude,((c.longitude+540)%360)-180);},40);});
  map.addEventListener("region-change-end",onRegion);
  // gerçek santraller: görünen ülkelerin dosyaları görünüme göre yüklenir (yakınlık kamera uzaklığından)
  const realView=()=>{if(!map)return;const r=map.region,c=r.center,sp=r.span;
    setRealView({w:c.longitude-sp.longitudeDelta/2,e:c.longitude+sp.longitudeDelta/2,s:c.latitude-sp.latitudeDelta/2,n:c.latitude+sp.latitudeDelta/2,z:Math.log2(2.6e7/map.cameraDistance),lat:c.latitude,lon:c.longitude});};
  map.addEventListener("region-change-end",realView);
  map.addEventListener("region-change-start",()=>{moving=true;facLoop();});
  map.addEventListener("region-change-end",()=>{moving=false;clearTimeout(settleT);settleT=setTimeout(flush,2000);whenStill(refreshFlatNight);});
  map.addEventListener("region-change-end",()=>{cancelAnimationFrame(facRaf);syncFac();sizeBnds();});
  // korunan alanlar
  const ps=new mk.Style({fillColor:"#C2364A",fillOpacity:0.15,strokeColor:"#F06A7D",lineWidth:1,lineDash:[4,4]});
  map.addOverlays(PROTECTED.map(([n,lat,lon,r])=>new mk.CircleOverlay(coord(lat,lon),r*1000,{style:ps,enabled:false})));
  parkLabels=PROTECTED.map(([n,lat,lon])=>{const m=marker("mk-park",2,null);m.lab.textContent=n;m.a.coordinate=coord(lat,lon);
    m.a.displayPriority=mk.Annotation.DisplayPriority.Low;m.a.collisionMode=mk.Annotation.CollisionMode.Rectangle;m.a.visible=false;return m.a;});
  map.addAnnotations(parkLabels);
  nightT=asyncTiles(nightDraw,reNight,600,"Apple: gece karosu");cloudT=asyncTiles(cloudDraw,reClouds,300,"Apple: bulut karosu");
  night=new mk.TileOverlay(nightGet,{opacity:1});
  clouds=new mk.TileOverlay((x,y,z)=>cloudT.get(x,y,z),{maximumZ:7,opacity:0});
  // güneş/rüzgâr potansiyeli (potential.js): karo hazır değilse boş kalır, hazır olunca katman yenilenir
  const pot=new mk.TileOverlay((x,y,z)=>P.tileURL(z,x,y),{opacity:P.potMode()==="off"?0:1}),rePot=()=>rl(pot,"potansiyel");let potT=0;
  P.onPotChange(m=>{if(!map)return;pot.opacity=m==="off"?0:1;whenStill(rePot);});
  // yenileme seyrek: hesap sürerken en fazla 1,2 sn'de bir, kuyruk bitince bir kez daha (her karoda yenilemek kasabilir)
  let potLast=0;const reloadPot=()=>{potT=0;potLast=performance.now();if(map)whenStill(rePot);};
  P.onPotTile(()=>{if(!map||P.potMode()==="off"||potT)return;
    potT=setTimeout(reloadPot,P.potPending()===0?150:Math.max(150,1200-(performance.now()-potLast)));});
  // gerçek santraller (realplants.js): karo görüntüsü olarak çizilir; açılıp kapanınca yenilenir
  const real=new mk.TileOverlay((x,y,z)=>realTileURL(z,x,y),{opacity:realOn()?1:0});
  onRealChange(on=>{if(!map)return;real.opacity=on?1:0;rl(real,"santral");});
  const reloadReal=()=>{if(map&&realOn())rl(real,"santral");};
  onRealTile(()=>whenStill(reloadReal)); // arka planda çizilen karolar hazır olunca (harita durulduktan sonra)
  // ?overlays=0 (tanı): bizim karo katmanlarımız eklenmez; harita yalnızca Apple'ın kendi görüntüsüyle açılır
  if(!new URLSearchParams(location.search).has("overlays")||new URLSearchParams(location.search).get("overlays")!=="0")map.addTileOverlays([night,pot,real,clouds]);
  sel=marker("mk-sel",28,null);map.addAnnotation(sel.a);
  window.addEventListener("sebeke:wx",()=>{updateWeather(true);onRegion();});
  updateWeather(true);wxTimer=setInterval(()=>{if(!document.hidden)updateWeather(false);},400);onRegion();
  // açılış: uzaydan Türkiye'ye yaklaşma; oyuncu haritaya dokunursa iptal edilir, dokunuş seçimle çakışmaz
  if(!reduced.matches){introEnd=end;introT=setTimeout(()=>{introT=0;map&&map.setCameraDistanceAnimated(end,true);},400);
    el.addEventListener("pointerdown",stopIntro,{once:true});}
  if(import.meta.env.DEV)window.__mk=map;
}

let introT=0,introEnd=0,wxTimer=0;
// açılış animasyonu başlamadan dokunulursa doğrudan son yakınlığa geçilir
function stopIntro(){if(introT){clearTimeout(introT);introT=0;if(map)map.cameraDistance=introEnd;}}
// + / - düğmeleri: kamera uzaklığı yarıya iner / iki katına çıkar
export function zoomBy(d){
  if(!map)return;stopIntro();
  map.setCameraDistanceAnimated(Math.min(4e7,Math.max(150,map.cameraDistance/2**d)),!reduced.matches);
}

export function draw(){const t=performance.now();drawImpl();wp("Apple: işaretler",t);}
function drawImpl(){
  if(!map)return;
  const seen=new Set();
  for(const [id,o] of Object.entries(S.sites)){
    seen.add(id);let m=sites.get(id);
    if(!m){m=marker("mk-site",18,()=>hooks.selectSite(id));sites.set(id,m);map.addAnnotation(m.a);}
    const top=S.plants.filter(p=>p.t===id).sort((a,b)=>b.mw-a.mw)[0],mw=siteMW(id);
    place(m,o.lat,o.lon);
    const col=top?cssv(TECH[top.k].c):"rgba(255,255,255,.3)";m.root.style.background=col;m.root.style.borderColor=STATUS[o.permit]||"#FFFFFF";
    m.root.style.setProperty("--c",col);m.root.classList.toggle("on",!!(mw&&isLive(plantStatus(id))));
    const t=mw?`${mw} MW`:"";if(m.lab.textContent!==t)m.lab.textContent=t;
    ensureBnd(m,true);const b=occText(capMW(id),siteCap(o));if(m.bndLab.textContent!==b)m.bndLab.textContent=b;
    const st=plantStatus(id),lv=liveText(id),bh=battHtml(st.batt),lk=lv+bh;
    if(m.liveKey!==lk){m.liveKey=lk;m.live.innerHTML=lv?`<span>${lv}</span>${bh}`:"";if(m.bndOn)m.live.style.display=lv?"":"none";}
    spinRot(m,id);
    if(m.fac)m.fac.classList.toggle("snowy",fxOf(o).snowy); // karla kaplı saha (wxfx.js)
  }
  for(const [id,m] of sites)if(!seen.has(id)){map.removeAnnotation(m.a);sites.delete(id);}
  syncFac();
  const rs=new Set();
  rivalSites().forEach(({r,s})=>{
    const k=`${r.id}:${s.lat}:${s.lon}`;rs.add(k);let m=rivals.get(k);
    if(!m){m=marker("mk-rival",16,()=>hooks.selectRival(s.lat,s.lon));m.root.style.setProperty("--c",r.c);m.lab.style.color=r.c;rivals.set(k,m);place(m,s.lat,s.lon);map.addAnnotation(m.a);}
    m.root.classList.toggle("build",s.build>0);
    const t=`${r.sh} ${s.mw} MW${s.build>0?" (inşaat)":""}`;if(m.lab.textContent!==t)m.lab.textContent=t;
    ensureBnd(m,false);m.bnd.style.setProperty("--c",r.c);const b=`${r.sh} • ${occText(s.mw)}${s.build>0?" • inşaat":""}`;if(m.bndLab.textContent!==b)m.bndLab.textContent=b;
  });
  for(const [k,m] of rivals)if(!rs.has(k)){map.removeAnnotation(m.a);rivals.delete(k);}
  place(sel,S.sel.lat,S.sel.lon);
  sizeBnds();
}

export function setClock(hour){
  if(!map||hour===lastHour)return;
  lastHour=hour;
  const go=()=>{nightTimer=0;nightLast=performance.now();nightT.setVer(`${lastHour}/${CAL.decl.toFixed(2)}`);flatKey=flatNightKey();whenStill(reNight);};
  // gece en çok 5 sn'de bir yenilenir (1x hızda oyun saati 0,5 sn; karanlık zaten yavaş değişir)
  if(nightTimer)return;const wait=5000-(performance.now()-nightLast);if(wait<=0)go();else nightTimer=setTimeout(go,wait);
}
export function camInfo(){
  if(!map)return null;const c=map.center;return {lat:c.latitude,lon:c.longitude,h:map.cameraDistance};
}
export function focus(lon,lat){
  if(!map)return;map.setCenterAnimated(coord(lat,lon),!reduced.matches);
  if(map.cameraDistance>zoomToH(9))map.setCameraDistanceAnimated(zoomToH(9),!reduced.matches);
}
export function flyTo(lat,lon,h){if(!map)return;stopIntro();map.setCenterAnimated(coord(lat,lon),!reduced.matches);map.setCameraDistanceAnimated(h,!reduced.matches);}
export function pagePoint(lat,lon){if(!map)return null;const p=map.convertCoordinateToPointOnPage(coord(lat,lon));return {x:p.x,y:p.y};}
// haritayı dx, dy piksel kaydır (pozitif dy: içerik yukarı çıkar; pozitif dx: içerik sola kayar)
export function panBy(dy,dx=0){
  if(!map)return;const r=box.getBoundingClientRect(),c=map.convertPointOnPageToCoordinate(new DOMPoint(r.left+r.width/2+dx,r.top+r.height/2+dy));
  map.setCenterAnimated(c,!reduced.matches);
}
export function destroy(){
  stopIntro();clearInterval(wxTimer);
  if(map){try{map.destroy();}catch(e){}}
  if(box)box.classList.remove("mk-map","mk-z3","mk-z4");
  map=null;sites.clear();rivals.clear();storms=[];
}
