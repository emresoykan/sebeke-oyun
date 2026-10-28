// --- Haritada tesis görüntüsü ---
// Sahanın 3D modeli (sitemodel.js) tarayıcıda, güneyden hafif eğik bakan ortografik bir kamerayla saydam bir PNG'ye
// çizilir. Görüntü gerçek ölçeklidir: hangi metre aralığını kapladığı (doğu ve kuzey sınırları, saha koordinatına göre)
// görüntüyle birlikte döner; harita bu sınırlarla yerleştirir. Santral listesi değişmedikçe görüntü yeniden çizilmez.
import * as THREE from "three";
import { S } from "../state.js";
import { tierOf } from "../equipment.js";
import { buildSite, padAlpha } from "./sitemodel.js";
import { gpuName } from "./quality.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// Yazılımla çizimde (ekran kartı yok) WebGL komutları piksel okunurken işlenir ve ana iş parçacığını bekletir: 4096'lık
// gölge haritası ve 4x kenar yumuşatmayla 20 MW sahada ~3,5 sn. Orada gölge haritası 1024, kenar yumuşatma kapalı ve
// görüntü en çok 1000 piksel (ekran kartında kalite aynı)
const SOFT=/swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpuName());
const TILT=28*Math.PI/180, MAX_PX=SOFT?1000:1400, MIN_RES=0.3, SHADOW=SOFT?1024:4096;
const cache=new Map(); // saha id -> {sig, p}
let R=null,ENV=null;

export const siteSig=id=>S.plants.filter(p=>p.t===id).map(p=>p.k+tierOf(p)+p.mw).sort().join(",");

// {url, lods, east:[min,max], north:[min,max], hubs} (metre) veya santral yoksa null
// bare: pervanesiz görüntü (Apple haritası pervaneleri üstüne dönen katman olarak çizer); hubs: her türbin göbeğinin
// görüntüdeki yeri (x, y: genişlik ve yüksekliğe oranla), rotor yarıçapı (r: genişliğe oranla), yönü (yaw) ve teknolojisi (k)
// lods: aynı görüntünün yarıya yarıya küçültülmüş kopyaları (büyükten küçüğe). Harita küçük çizerken büyük görüntüyü
// doğrudan küçültürse panel sıraları titreşen çizgilere (moiré) dönüşür; ekrandaki boyuta en yakın kopya kullanılır.
export function siteImage(id,bare=false){
  const sig=siteSig(id);if(!sig)return Promise.resolve(null);
  const key=id+(bare?"|b":""),c=cache.get(key);if(c&&c.sig===sig)return c.p;
  const p=new Promise(res=>setTimeout(()=>{render(id,bare).then(res,e=>{console.warn("Tesis görüntüsü çizilemedi:",e);res(null);});},0));
  // eski görüntünün adresleri harita yenisini yükleyene kadar kullanılabilir: biraz sonra serbest bırakılır
  if(c)c.p.then(o=>{if(o)setTimeout(()=>o.lods.forEach(l=>URL.revokeObjectURL(l.url)),15000);});
  cache.set(key,{sig,p});return p;
}
const ROTOR=/^rotor\d/,BLADE=61; // kanat boyu (m, sitemodel.js bladeGeometry)
// aynı malzeme tek bir Lambert karşılığına çevrilir (shader programı paylaşılır)
const LAM=new WeakMap();
function lambert(m){let l=LAM.get(m);if(l)return l;
  l=new THREE.MeshLambertMaterial({color:m.color,map:m.map||null,transparent:m.transparent,opacity:m.opacity,depthWrite:m.depthWrite,side:m.side,
    vertexColors:!!m.vertexColors,normalMap:m.normalMap||null}); // köşe renkleri (HES arazisi, su kenarı saydamlığı) ve su dalgacıkları korunur
  if(m.normalMap)l.normalScale.copy(m.normalScale);
  if(m.emissive)l.emissive=m.emissive.clone();if(m.isMeshBasicMaterial){l.emissive=m.color.clone();l.color.setScalar(0);}LAM.set(m,l);return l;}

async function render(id,bare){
  const o=S.sites[id],ps=S.plants.filter(p=>p.t===id);
  const {root}=buildSite(id,o,ps,bare);
  // haritada anlamsız olan parçalar: GES parıltı bantları, su sıçraması
  root.traverse(n=>{if(/^glint|^spray/.test(n.name||""))n.visible=false;});
  if(bare)root.traverse(n=>{if(ROTOR.test(n.name||""))n.visible=false;});
  // zemin alanları yarı saydam: altındaki uydu görüntüsü (toprak, bitki örtüsü) sezilir
  root.traverse(n=>{if(n.name==="pad"){n.material=n.material.clone();n.material.transparent=true;n.material.opacity=padAlpha(n.material);}});
  const box=new THREE.Box3().setFromObject(root);
  // güneş: öğleden sonra, güney-güneybatıdan ~50° yükseklikte (güney yarıkürede kuzeyden); gölgeler zemine düşer
  const sd=new THREE.Vector3(-0.34,1.19,o.lat>=0?0.94:-0.94).normalize();
  // gölgeler sınırların dışına taşar: görüntü alanı gölge boyunca genişletilir
  const sh=new THREE.Vector3(-sd.x,0,-sd.z).multiplyScalar(box.max.y/sd.y);
  box.expandByPoint(box.min.clone().add(sh).setY(0)).expandByPoint(box.max.clone().add(sh).setY(0));
  const ctr=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  // güneyden ve yukarıdan bakan kamera; görüntünün üstü kuzey
  const cam=new THREE.OrthographicCamera(-1,1,1,-1,1,20000),dir=new THREE.Vector3(0,Math.cos(TILT),Math.sin(TILT));
  cam.position.copy(ctr).addScaledVector(dir,5000);cam.up.set(0,0,-1);cam.lookAt(ctr);cam.updateMatrixWorld();
  const inv=cam.matrixWorldInverse;let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
  for(const sx of [box.min.x,box.max.x])for(const sy of [box.min.y,box.max.y])for(const sz of [box.min.z,box.max.z]){
    const v=new THREE.Vector3(sx,sy,sz).applyMatrix4(inv);x0=Math.min(x0,v.x);x1=Math.max(x1,v.x);y0=Math.min(y0,v.y);y1=Math.max(y1,v.y);}
  const m=2;x0-=m;x1+=m;y0-=m;y1+=m;
  const hubs=[];
  if(bare){root.updateMatrixWorld(true);root.traverse(n=>{if(!ROTOR.test(n.name||""))return;
    const v=n.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv),s=n.getWorldScale(new THREE.Vector3()).x;let g=n.parent;while(g&&!g.userData.k)g=g.parent;
    const yaw=n.parent.rotation.y;
    // rotor diski (türbin ekseninde dik düzlem) görüntüde bir elipse izdüşer: diskin yatay ekseni (sin yaw, cos TILT·cos yaw),
    // aşağı ekseni (0, sin TILT) piksele gider (görüntünün üstü kuzey, kamera güneyden TILT eğimle bakar). m: CSS matrix(a,b,c,d)
    hubs.push({x:(v.x-x0)/(x1-x0),y:(y1-v.y)/(y1-y0),r:BLADE*s/(x1-x0),k:g?g.userData.k:"res",m:[Math.sin(yaw),Math.cos(TILT)*Math.cos(yaw),0,Math.sin(TILT)].map(x=>+x.toFixed(4))});});}
  Object.assign(cam,{left:x0,right:x1,bottom:y0,top:y1});cam.updateProjectionMatrix();
  const res=Math.max(MIN_RES,Math.max(x1-x0,y1-y0)/MAX_PX),W=Math.round((x1-x0)/res),H=Math.round((y1-y0)/res);
  // ışık: gökyüzü ve güneş, gölgeli; saydam bir gölge yakalayıcı gölgeleri uydu görüntüsünün üstüne düşürür
  root.add(new THREE.HemisphereLight(0xFFFFFF,0x8A7E66,1.25));
  const sun=new THREE.DirectionalLight(0xFFFFFF,2.1);sun.position.copy(ctr).addScaledVector(sd,1500);sun.target.position.copy(ctr);
  sun.castShadow=true;const sc=sun.shadow.camera,r=Math.max(size.x,size.z)*0.75+60;Object.assign(sc,{left:-r,right:r,top:r,bottom:-r,near:10,far:4000});
  sun.shadow.mapSize.set(SHADOW,SHADOW);sun.shadow.bias=-0.0006;root.add(sun,sun.target);
  const catcher=new THREE.Mesh(new THREE.PlaneGeometry(size.x+40,size.z+40),new THREE.ShadowMaterial({opacity:0.42}));
  catcher.rotation.x=-Math.PI/2;catcher.position.set(ctr.x,0.02,ctr.z);catcher.receiveShadow=true;root.add(catcher);
  if(!R){R=new THREE.WebGLRenderer({alpha:true,antialias:!SOFT,preserveDrawingBuffer:true});R.setClearColor(0x000000,0);R.shadowMap.enabled=true;R.outputColorSpace=THREE.SRGBColorSpace;
    // metal yüzeyler (paneller) yansıtacak bir gökyüzü bulamazsa simsiyah görünür: yumuşak bir ortam ışığı verilir
    if(!SOFT){const pm=new THREE.PMREMGenerator(R);ENV=pm.fromScene(new RoomEnvironment(),0.04).texture;pm.dispose();}}
  // yazılımla çizimde fiziksel tabanlı malzeme (ortam ışığı örneklemesi) ve onun ilk hazırlığı (PMREM) çok pahalı: ilk
  // görüntü ~4,9 sn sürüyordu, çoğu tek seferlik ısınma. Orada malzemeler basit Lambert gölgelendirmesine çevrilir
  // (metal yüzeyler ortam ışığı olmadan da kararmaz) ve ortam ışığı hazırlanmaz
  if(SOFT)root.traverse(n=>{if(!n.isMesh||!n.material||n.material.isShadowMaterial)return;n.material=lambert(n.material);});
  const scene=new THREE.Scene();if(!SOFT){scene.environment=ENV;scene.environmentIntensity=0.35;}scene.add(root);
  R.setPixelRatio(1);R.setSize(W,H,false);R.render(scene,cam);
  const lods=await mips(R.domElement),url=lods[0].url;
  root.traverse(n=>{if(n.geometry)n.geometry.dispose();});
  // saha koordinatının (orijin) kameradaki yeri: görüntü sınırları ona göre metreye çevrilir; kuzey ekseni eğimle kısalır
  const org=new THREE.Vector3(0,0,0).applyMatrix4(inv),c=Math.cos(TILT);
  return {url,lods,east:[x0-org.x,x1-org.x],north:[(y0-org.y)/c,(y1-org.y)/c],hubs};
}
// Yarıya küçültme zinciri: her adım dört pikselin ortalamasını alır (kutu süzgeci), en küçüğü ~48 piksel.
// PNG kodlaması toBlob ile eşzamansızdır. Çizim tuvali (paylaşılan renderer) eşzamanlı olarak 2D tuvale kopyalanır,
// sonra serbesttir.
function mips(src){
  // işlemci tuvalleri (willReadFrequently): ekran kartına bağlı 2D tuvalden okuma yazılımla çizimde ~12 kat yavaş
  // (1000×450 tuvalde toBlob 387 ms'ye karşı 32 ms; görüntü başına 6 kopya)
  const ctx=c=>c.getContext("2d",{willReadFrequently:true});
  const cs=[];let c=document.createElement("canvas");c.width=src.width;c.height=src.height;ctx(c).drawImage(src,0,0);
  for(;;){cs.push(c);if(c.width<96)break;
    const n=document.createElement("canvas");n.width=Math.max(1,c.width>>1);n.height=Math.max(1,c.height>>1);
    const g=ctx(n);g.imageSmoothingEnabled=true;g.imageSmoothingQuality="high";g.drawImage(c,0,0,n.width,n.height);c=n;}
  return Promise.all(cs.map(c=>new Promise((res,rej)=>c.toBlob(b=>b?res({w:c.width,url:URL.createObjectURL(b)}):rej(new Error("toBlob")),"image/png"))));
}
// Ekranda px (cihaz pikseli) genişlikte çizilecekse kullanılacak kopya: en az o kadar geniş olan en küçük kopya
export function lodFor(img,px){let u=img.lods[0].url;for(const l of img.lods){if(l.w>=px)u=l.url;else break;}return u;}

// Metre sınırlarını coğrafi köşelere çevir (MapLibre görüntü kaynağı sırası: KB, KD, GD, GB); gerçek ölçek
export function cornersOf(o,img){
  const kx=111320*Math.cos(o.lat*Math.PI/180),ky=110574,[e0,e1]=img.east,[n0,n1]=img.north;
  const w=o.lon+e0/kx,e=o.lon+e1/kx,s=o.lat+n0/ky,n=o.lat+n1/ky;
  return [[w,n],[e,n],[e,s],[w,s]];
}
