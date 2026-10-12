// --- Haritada tesis görüntüsü ---
// Sahanın 3D modeli (sitemodel.js) tarayıcıda, güneyden hafif eğik bakan ortografik bir kamerayla saydam bir PNG'ye
// çizilir. Görüntü gerçek ölçeklidir: hangi metre aralığını kapladığı (doğu ve kuzey sınırları, saha koordinatına göre)
// görüntüyle birlikte döner; harita bu sınırlarla yerleştirir. Santral listesi değişmedikçe görüntü yeniden çizilmez.
import * as THREE from "three";
import { S } from "../state.js";
import { tierOf } from "../equipment.js";
import { buildSite } from "./sitemodel.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const TILT=28*Math.PI/180, MAX_PX=1400, MIN_RES=0.3;
const cache=new Map(); // saha id -> {sig, p}
let R=null,ENV=null;

export const siteSig=id=>S.plants.filter(p=>p.t===id).map(p=>p.k+tierOf(p)+p.mw).sort().join(",");

// {url, lods, east:[min,max], north:[min,max]} (metre) veya santral yoksa null
// lods: aynı görüntünün yarıya yarıya küçültülmüş kopyaları (büyükten küçüğe). Harita küçük çizerken büyük görüntüyü
// doğrudan küçültürse panel sıraları titreşen çizgilere (moiré) dönüşür; ekrandaki boyuta en yakın kopya kullanılır.
export function siteImage(id){
  const sig=siteSig(id);if(!sig)return Promise.resolve(null);
  const c=cache.get(id);if(c&&c.sig===sig)return c.p;
  const p=new Promise(res=>setTimeout(()=>{try{res(render(id,sig));}catch(e){console.warn("Tesis görüntüsü çizilemedi:",e);res(null);}},0));
  cache.set(id,{sig,p});return p;
}

function render(id){
  const o=S.sites[id],ps=S.plants.filter(p=>p.t===id);
  const {root}=buildSite(id,o,ps);
  // haritada anlamsız olan parçalar: GES parıltı bantları, su sıçraması
  root.traverse(n=>{if(/^glint|^spray/.test(n.name||""))n.visible=false;});
  const box=new THREE.Box3().setFromObject(root),ctr=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  // güneyden ve yukarıdan bakan kamera; görüntünün üstü kuzey
  const cam=new THREE.OrthographicCamera(-1,1,1,-1,1,20000),dir=new THREE.Vector3(0,Math.cos(TILT),Math.sin(TILT));
  cam.position.copy(ctr).addScaledVector(dir,5000);cam.up.set(0,0,-1);cam.lookAt(ctr);cam.updateMatrixWorld();
  const inv=cam.matrixWorldInverse;let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
  for(const sx of [box.min.x,box.max.x])for(const sy of [box.min.y,box.max.y])for(const sz of [box.min.z,box.max.z]){
    const v=new THREE.Vector3(sx,sy,sz).applyMatrix4(inv);x0=Math.min(x0,v.x);x1=Math.max(x1,v.x);y0=Math.min(y0,v.y);y1=Math.max(y1,v.y);}
  const m=2;x0-=m;x1+=m;y0-=m;y1+=m;
  Object.assign(cam,{left:x0,right:x1,bottom:y0,top:y1});cam.updateProjectionMatrix();
  const res=Math.max(MIN_RES,Math.max(x1-x0,y1-y0)/MAX_PX),W=Math.round((x1-x0)/res),H=Math.round((y1-y0)/res);
  // ışık: gökyüzü ve kuzeybatıdan güneş, gölgeli
  root.add(new THREE.HemisphereLight(0xFFFFFF,0x8A7E66,1.25));
  const sun=new THREE.DirectionalLight(0xFFFFFF,2.1);sun.position.set(ctr.x-0.5*size.x-200,600,ctr.z-300);sun.target.position.copy(ctr);
  sun.castShadow=true;const sc=sun.shadow.camera,r=Math.max(size.x,size.z)*0.75+60;Object.assign(sc,{left:-r,right:r,top:r,bottom:-r,near:10,far:3000});
  sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-0.0006;root.add(sun,sun.target);
  if(!R){R=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});R.setClearColor(0x000000,0);R.shadowMap.enabled=true;R.outputColorSpace=THREE.SRGBColorSpace;
    // metal yüzeyler (paneller) yansıtacak bir gökyüzü bulamazsa simsiyah görünür: yumuşak bir ortam ışığı verilir
    const pm=new THREE.PMREMGenerator(R);ENV=pm.fromScene(new RoomEnvironment(),0.04).texture;pm.dispose();}
  const scene=new THREE.Scene();scene.environment=ENV;scene.environmentIntensity=0.35;scene.add(root);
  R.setPixelRatio(1);R.setSize(W,H,false);R.render(scene,cam);
  const lods=mips(R.domElement),url=lods[0].url;
  root.traverse(n=>{if(n.geometry)n.geometry.dispose();});
  // saha koordinatının (orijin) kameradaki yeri: görüntü sınırları ona göre metreye çevrilir; kuzey ekseni eğimle kısalır
  const org=new THREE.Vector3(0,0,0).applyMatrix4(inv),c=Math.cos(TILT);
  return {url,lods,east:[x0-org.x,x1-org.x],north:[(y0-org.y)/c,(y1-org.y)/c]};
}
// Yarıya küçültme zinciri: her adım dört pikselin ortalamasını alır (kutu süzgeci), en küçüğü ~48 piksel
function mips(src){
  const out=[];let c=document.createElement("canvas");c.width=src.width;c.height=src.height;c.getContext("2d").drawImage(src,0,0);
  for(;;){out.push({w:c.width,url:c.toDataURL("image/png")});if(c.width<96)break;
    const n=document.createElement("canvas");n.width=Math.max(1,c.width>>1);n.height=Math.max(1,c.height>>1);
    const g=n.getContext("2d");g.imageSmoothingEnabled=true;g.imageSmoothingQuality="high";g.drawImage(c,0,0,n.width,n.height);c=n;}
  return out;
}
// Ekranda px (cihaz pikseli) genişlikte çizilecekse kullanılacak kopya: en az o kadar geniş olan en küçük kopya
export function lodFor(img,px){let u=img.lods[0].url;for(const l of img.lods){if(l.w>=px)u=l.url;else break;}return u;}

// Metre sınırlarını coğrafi köşelere çevir (MapLibre görüntü kaynağı sırası: KB, KD, GD, GB)
// k: büyütme (uzaktan bakınca tesis en az belirli piksel boyutunda görünsün diye)
export function cornersOf(o,img,k=1){
  const kx=111320*Math.cos(o.lat*Math.PI/180),ky=110574,[e0,e1]=img.east.map(v=>v*k),[n0,n1]=img.north.map(v=>v*k);
  const w=o.lon+e0/kx,e=o.lon+e1/kx,s=o.lat+n0/ky,n=o.lat+n1/ky;
  return [[w,n],[e,n],[e,s],[w,s]];
}
// Tesisin ekranda en az MIN_PX genişlikte görünmesi için büyütme (ppm: metre başına piksel)
export const MIN_PX=80;
export const facScale=(img,ppm)=>Math.max(1,MIN_PX/((img.east[1]-img.east[0])*ppm));
