// --- 3D santral modelleri: three.js ile kurulur, glTF olarak Cesium'a verilir ---
// Her saha gerçek boyutlu (metre) yerel koordinatlarla kurulur: x=doğu, y=yukarı, z=güney. glTF'ye
// dönüştürülüp sahanın doğu-kuzey-yukarı çerçevesine yerleştirilir; Cesium güneşe göre aydınlatır ve
// gölgelerini düşürür. Ölçek gerçektir (uzaktan büyütülmez; uzakta sahayı işaret noktası gösterir).
// Araziye oturtma: Google 3D arazisi varsa kamera yaklaşınca saha alanında zemin yükseklikleri ölçülür; her panel
// masası, türbin ve bina kendi zeminine iner, masalar yamaç boyunca eğilir. Çakıl/beton/yol alanları modelden çıkarılıp araziye serilir.
// Hareketli parçalar (rotorlar, ikaz ışıkları, dolusavak, durum LED'leri) düğüm adlarıyla canlandırılır.
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import * as Cesium from "cesium";
import { S } from "../state.js";
import { plantStatus } from "../plantstatus.js";
import { tierOf } from "../equipment.js";
import { buildSite, conformSite, takePads } from "./sitemodel.js";

const RAD=Math.PI/180;
const reduced=matchMedia("(prefers-reduced-motion: reduce)");
let scene=null, viewer=null, lastT=0;
const sites=new Map(); // saha id -> {sig, model, parts, pads}

const KX=lat=>111320*Math.cos(lat*RAD),KY=110574;
// saha koordinatı (x doğu, z güney; metre) -> coğrafi
const geo=(o,x,z)=>[o.lon+x/KX(o.lat),o.lat-z/KY];

async function toModel(root,id,o,h0){
  const glb=await new GLTFExporter().parseAsync(root,{binary:true});
  const url=URL.createObjectURL(new Blob([glb],{type:"model/gltf-binary"}));
  const model=await Cesium.Model.fromGltfAsync({url,id,upAxis:Cesium.Axis.Y,forwardAxis:Cesium.Axis.X,
    modelMatrix:Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(o.lon,o.lat,h0||0)),
    heightReference:h0==null?Cesium.HeightReference.CLAMP_TO_GROUND:Cesium.HeightReference.NONE,scene,
    distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,6e4),shadows:Cesium.ShadowMode.ENABLED});
  model.readyEvent.addEventListener(()=>URL.revokeObjectURL(url));
  return model;
}
// yeni model hazır olunca eskisi kaldırılır (değişim sırasında saha bir an bile boş görünmez)
function swap(cur,model,parts){const old=cur.model;scene.primitives.add(model);cur.model=model;cur.parts=parts;
  if(!old)return;if(model.ready)scene.primitives.remove(old);else model.readyEvent.addEventListener(()=>{if(!old.isDestroyed())scene.primitives.remove(old);});}

// zemin alanları: araziye (ve Google 3D dokusuna) serilen yarı saydam çokgenler; tıklanınca saha seçilir
function drawPads(id,o,pads){
  return pads.map(p=>{const e=viewer.entities.add({polygon:{hierarchy:Cesium.Cartesian3.fromDegreesArray(p.pts.flatMap(([x,z])=>geo(o,x,z))),
    material:Cesium.Color.fromCssColorString(p.color).withAlpha(p.a),classificationType:Cesium.ClassificationType.BOTH}});e.siteId=id;return e;});
}
const clearPads=cur=>{(cur.pads||[]).forEach(e=>viewer.entities.remove(e));cur.pads=null;};

async function loadSite(id,o,ps,sig){
  const {root,parts}=buildSite(id,o,ps),pads=takePads(root);
  // önce düz model (tek noktadan zemine oturur): hemen görünür; kamera yaklaşınca arazi ölçülür ve oturtulmuş modelle değişir
  const model=await toModel(root,id,o,null);
  const cur=sites.get(id);
  if(!cur||cur.sig!==sig){model.destroy();return;} // bu arada santral değişti
  swap(cur,model,parts);clearPads(cur);cur.pads=drawPads(id,o,pads);Object.assign(cur,{o,ps,lastD:Infinity,G:null,busy:false,near:0});
}

// --- Araziye oturtma ---
// Yükseklikler ekranda yüklü Google 3D karolarından ölçülür (scene.sampleHeight). Google yaklaştıkça daha ayrıntılı
// (çoğu zaman biraz daha yüksek) zemin karoları yükler; uzaktan ölçülen yükseklikte kalan alçak paneller bu zeminin
// altında kalıp kaybolur. Bu yüzden kamera sahaya ~3 km içindeyken her belirgin yaklaşmada (mesafe ~%40 azalınca)
// karolar yüklenince yeniden ölçülür; model yalnızca zemin gerçekten değiştiyse (>0,4 m) yeniden kurulur.
// Ölçüm karelere bölünür (arayüz takılmaz). En ayrıntılı karoları indirip bekleyen yöntem (sampleHeightMostDetailed)
// canlıda sonuç vermemişti.
const LIFT=0.25; // ölçüm ve karo farklarına karşı küçük pay: masalar zemine gömülmesin
function tileset(){for(let i=0;i<scene.primitives.length;i++){const p=scene.primitives.get(i);if(p instanceof Cesium.Cesium3DTileset&&p.show)return p;}return null;}
function checkGround(){
  if(!scene||!viewer.useDefaultRenderLoop||document.hidden||!scene.sampleHeightSupported)return;
  const ts=tileset();if(!ts)return;
  const now=performance.now(),cam=viewer.camera.positionWC;
  for(const [id,s] of sites){
    if(!s.model||!s.model.ready||s.busy||!s.o||s.o.sea)continue;
    const d=Cesium.Cartesian3.distance(cam,s.model.boundingSphere.center);
    if(d>3000||d>s.lastD*0.6){s.near=0;continue;}
    // karolar yüklenince ölç; sürekli akış varsa ~6 sn sonra yine de ölç
    if(!s.near)s.near=now;
    if(ts.tilesLoaded||now-s.near>6000)conformNow(id,s,d);
  }
}
async function conformNow(id,s,d){
  const sig=s.sig,t0=performance.now();s.busy=true;
  try{
    const b=buildSite(id,s.o,s.ps);takePads(b.root);
    const g=await groundOf(s.o,b.root);
    if(s.sig!==sig||sites.get(id)!==s)return;
    if(!g){console.warn("Arazi yüksekliği ölçülemedi (karolar henüz yüklenmemiş olabilir):",id);s.near=0;return;}
    s.lastD=d;s.near=0;
    // zemin öncekinden belirgin farklı değilse model aynen kalır
    if(s.G&&Math.abs(g.h0-s.h0)<0.4&&g.G.length===s.G.length&&g.G.every((v,i)=>Math.abs(v-s.G[i])<0.4))return;
    conformSite(b.root,g.f);
    const m2=await toModel(b.root,id,s.o,g.h0+LIFT);
    if(s.sig!==sig||sites.get(id)!==s){m2.destroy();return;}
    swap(s,m2,b.parts);s.G=g.G;s.h0=g.h0;
    console.info(`Saha araziye oturtuldu (${id}): kamera ${Math.round(d)} m, ${g.n} nokta, ${Math.round(performance.now()-t0)} ms, zemin farkı ${g.lo.toFixed(1)}…${g.hi.toFixed(1)} m`);
  }catch(e){console.warn("Arazi yüksekliği ölçülemedi:",e);}
  finally{s.busy=false;}
}

// yükseklik ölçümünde arazi dışındaki her şey (modeller, bulut katmanı, etiketler, işaretler, sınırlar) yok sayılır
function others(){
  const out=[...viewer.entities.values];
  const walk=c=>{for(let i=0;i<c.length;i++){const p=c.get(i);if(p instanceof Cesium.Cesium3DTileset)continue;out.push(p);if(typeof p.get==="function"&&p.length!=null)walk(p);}};
  walk(scene.primitives);walk(scene.groundPrimitives);return out;
}
const median=a=>{const v=a.filter(x=>x!=null).sort((p,q)=>p-q);return v.length?v[v.length>>1]:null;};
// Sahanın zemin yüksekliği: ızgara (en çok 16×16 nokta, 3×3 medyan süzgeci: tek ağaç/direk sıçramaları atılır) ve
// tek tek nesneler (türbin, bina) için beşer noktanın medyanı. Dönüş: {h0: saha noktasının elipsoit yüksekliği, f, n, lo, hi}
async function groundOf(o,root){
  const bb=new THREE.Box3().setFromObject(root),x0=bb.min.x-10,x1=bb.max.x+10,z0=bb.min.z-10,z1=bb.max.z+10;
  const n=Math.max(2,Math.min(16,Math.ceil(Math.max(x1-x0,z1-z0)/15)+1)),dx=(x1-x0)/(n-1),dz=(z1-z0)/(n-1);
  const anchors=[];conformSite(root,(x,z,ex)=>{if(ex)anchors.push([x,z]);return 0;});
  const pts=[],five=(x,z)=>[[0,0],[6,0],[-6,0],[0,6],[0,-6]].forEach(([a,b])=>pts.push([x+a,z+b]));
  for(let j=0;j<n;j++)for(let i=0;i<n;i++)pts.push([x0+i*dx,z0+j*dz]);
  five(0,0);anchors.forEach(([x,z])=>five(x,z));
  const ex=others(),H=[],c=new Cesium.Cartographic();
  for(let k=0;k<pts.length;k++){
    const [lon,lat]=geo(o,pts[k][0],pts[k][1]);Cesium.Cartographic.fromDegrees(lon,lat,0,c);
    const h=scene.sampleHeight(c,ex);H.push(Number.isFinite(h)?h:null);
    if(k%25===24)await new Promise(r=>setTimeout(r,0));
  }
  const N=n*n,h0=median(H.slice(N,N+5));
  if(h0==null||H.filter(v=>v!=null).length<N*0.5)return null;
  const G=new Float64Array(N);let lo=0,hi=0;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const nb=[];for(let b=-1;b<=1;b++)for(let a=-1;a<=1;a++){const ii=i+a,jj=j+b;if(ii>=0&&jj>=0&&ii<n&&jj<n)nb.push(H[jj*n+ii]);}
    const v=median(nb),g=(v==null?h0:v)-h0;G[j*n+i]=g;lo=Math.min(lo,g);hi=Math.max(hi,g);}
  const key=(x,z)=>x.toFixed(2)+","+z.toFixed(2),A=new Map();
  anchors.forEach(([x,z],k)=>{const v=median(H.slice(N+5+k*5,N+10+k*5));if(v!=null)A.set(key(x,z),v-h0);});
  const bil=(x,z)=>{const u=Math.min(n-1.001,Math.max(0,(x-x0)/dx)),w=Math.min(n-1.001,Math.max(0,(z-z0)/dz)),i=u|0,j=w|0,a=u-i,b=w-j;
    return (G[j*n+i]*(1-a)+G[j*n+i+1]*a)*(1-b)+(G[(j+1)*n+i]*(1-a)+G[(j+1)*n+i+1]*a)*b;};
  return {h0,G,n:pts.length,lo,hi,f:(x,z,ex)=>{if(ex){const v=A.get(key(x,z));if(v!=null)return v;}return bil(x,z);}};
}

// Santral listesindeki değişikliğe göre saha modellerini kur/yenile/kaldır
export function syncModels(){
  if(!scene)return;
  const live=new Set();
  Object.entries(S.sites).forEach(([id,o])=>{
    const ps=S.plants.filter(p=>p.t===id);if(!ps.length)return;live.add(id);
    const sig=ps.map(p=>p.k+tierOf(p)+p.mw).sort().join(","),cur=sites.get(id);
    if(cur&&cur.sig===sig)return;
    if(cur)cur.sig=sig;else sites.set(id,{sig,model:null,parts:null,pads:null});
    loadSite(id,o,ps,sig).catch(e=>console.error("3D model yüklenemedi:",e));
  });
  for(const [id,s] of sites)if(!live.has(id)){if(s.model)scene.primitives.remove(s.model);clearPads(s);sites.delete(id);}
}
// Google 3D arazisi sonradan yüklenince sahalar yeniden ölçülür (kamera yaklaşınca)
export function regroundModels(){for(const s of sites.values()){s.lastD=Infinity;s.G=null;s.near=0;}}

const rotX=new Cesium.Matrix3(),rotM=new Cesium.Matrix4();
function show(model,name,v){const n=model.getNode(name);if(n)n.show=v;}
function animate(s,st,dt){
  const m=s.model,spin=!reduced.matches,wind=st.res||st.off||st.flo;
  for(const r of s.parts.rotors){const target=wind&&wind.f>=0.03?(0.55+1.15*wind.f)*r.f:0;r.w+=(target-r.w)*Math.min(1,dt*0.6);if(spin)r.a+=r.w*dt;
    const n=m.getNode(r.name);if(n){Cesium.Matrix3.fromRotationX(r.a,rotX);Cesium.Matrix4.multiply(n.originalMatrix,Cesium.Matrix4.fromRotation(rotX,rotM),rotM);n.matrix=rotM;}}
  // türbinler rüzgârın estiği yöne döner (rotor rüzgâra bakar): yön kuzeyden saat yönünde d derece ise yaw = d+90°
  if(st.wx)for(const y of s.parts.yaws){let d=(st.wx.dir+90)*RAD-y.cur;d=Math.atan2(Math.sin(d),Math.cos(d));y.cur+=d*Math.min(1,dt*0.25);
    const n=m.getNode(y.name);if(n){Cesium.Matrix3.fromRotationY(y.cur-y.base,rotX);Cesium.Matrix4.multiply(n.originalMatrix,Cesium.Matrix4.fromRotation(rotX,rotM),rotM);n.matrix=rotM;}}
  const blink=st.night&&(performance.now()%1600<800);s.parts.beacons.forEach(b=>show(m,b,blink));
  s.parts.flows.forEach(f=>show(m,f,!!(st.hes&&st.hes.run)));
  const b=st.batt,bs=!b?"off":b.chg?"chg":b.dis?"dis":"off",pulse=(b&&(b.chg||b.dis))?Math.sin(performance.now()/260)>-0.4:true;
  s.parts.leds.forEach(l=>{for(const k in l)show(m,l[k],k===bs&&pulse);});
  const g=st.ges,gs=!g||g.f<0.03?"off":g.curt?"curt":"run";s.parts.inv.forEach(l=>{for(const k in l)show(m,l[k],k===gs);});
  const now=performance.now()/1000,tr=(n,x,y,z)=>{Cesium.Matrix4.multiply(n.originalMatrix,Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(x,y,z),rotM),rotM);n.matrix=rotM;};
  // GES: üretim varken parıltı bandı panellerin üstünden kayar (kar, kısıntı ve gece hariç)
  if(s.parts.glints.length){const on=g&&!g.down&&g.f>=0.08&&!g.curt&&!g.snow,K=s.parts.glints.length,pos=spin?(now*1.6)%(K+4)-2:-9;
    s.parts.glints.forEach((n,k)=>show(m,n,on&&Math.abs(k-pos)<0.7));}
  // batarya: şarj veya deşarjda soğutma fanları döner
  if(s.parts.fans.length){const on=b&&(b.chg||b.dis);for(const f of s.parts.fans){if(on&&spin)f.a+=dt*9;
    const n=m.getNode(f.name);if(n){Cesium.Matrix3.fromRotationY(f.a,rotX);Cesium.Matrix4.multiply(n.originalMatrix,Cesium.Matrix4.fromRotation(rotX,rotM),rotM);n.matrix=rotM;}}}
  // buhar, duman ve su sıçraması hafifçe süzülür; BES konveyöründe yakıt ilerler
  if(spin){for(const d of s.parts.drifts){const n=m.getNode(d.name);if(n)tr(n,Math.sin(now*d.sp*0.7+d.ph)*d.amp*0.6,Math.abs(Math.sin(now*d.sp+d.ph))*d.amp,0);}
    if(st.bes&&st.bes.run)for(const b of s.parts.belts){const n=m.getNode(b);if(n)tr(n,(now*3.4)%6.8,0,0);}}
  s.parts.belts.forEach(b=>show(m,b,!!(st.bes&&st.bes.run)));
  show(m,"spray",!!(st.hes&&st.hes.run));
  // durumla açılıp kapanan parçalar (elektrolizör buharı, CSP alıcısının parıltısı): {n: düğüm, k: teknoloji, f: durum alanı}
  (s.parts.toggles||[]).forEach(t=>show(m,t.n,!!(st[t.k]&&!st[t.k].down&&st[t.k][t.f])));
  // JES buharı ve BES dumanı yalnızca çalışırken
  s.parts.steams.forEach(n=>show(m,n,!!(st.jes&&!st.jes.down&&st.jes.f>0)));
  s.parts.smokes.forEach(n=>show(m,n,!!(st.bes&&st.bes.run)));
  // gelgit rotorları akıntıyla döner; şamandıralar dalgayla inip kalkar
  const mr=st.mar,tgt=mr&&!mr.down&&mr.f>=0.03?0.4+1.6*mr.f:0;
  for(const r of s.parts.tides){r.w+=(tgt-r.w)*Math.min(1,dt*0.5);if(spin)r.a+=r.w*dt;
    const n=m.getNode(r.name);if(n){Cesium.Matrix3.fromRotationX(r.a,rotX);Cesium.Matrix4.multiply(n.originalMatrix,Cesium.Matrix4.fromRotation(rotX,rotM),rotM);n.matrix=rotM;}}
  if(s.parts.buoys.length){const amp=spin?0.6+2.4*Math.min(1,((st.wx&&st.wx.hub)||4)/16):0,t=performance.now()/1000;
    for(const b of s.parts.buoys){const n=m.getNode(b.name);if(!n)continue;
      Cesium.Matrix4.multiply(n.originalMatrix,Cesium.Matrix4.fromTranslation(new Cesium.Cartesian3(0,amp*Math.sin(t*1.1+b.ph),0),rotM),rotM);n.matrix=rotM;}}
}

export function initModels(sc,v){
  scene=sc;viewer=v;syncModels();setInterval(checkGround,700);
  scene.preUpdate.addEventListener(()=>{
    const now=performance.now(),dt=Math.min(0.1,(now-(lastT||now))/1000);lastT=now;
    for(const [id,s] of sites)if(s.model&&s.model.ready&&S.sites[id])animate(s,plantStatus(id),dt);
  });
}
