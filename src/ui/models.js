// --- 3D santral modelleri: three.js ile kurulur, glTF olarak Cesium'a verilir ---
// Her saha gerçek boyutlu (metre) yerel koordinatlarla kurulur: x=doğu, y=yukarı, z=güney. glTF'ye
// dönüştürülüp sahanın doğu-kuzey-yukarı çerçevesine yerleştirilir; Cesium güneşe göre aydınlatır,
// gölgelerini düşürür ve uzaktan görünsün diye en az belirli bir piksel boyutunda çizer.
// Hareketli parçalar (rotorlar, ikaz ışıkları, dolusavak, durum LED'leri) düğüm adlarıyla canlandırılır.
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import * as Cesium from "cesium";
import { S } from "../state.js";
import { plantStatus } from "../plantstatus.js";
import { tierOf } from "../equipment.js";
import { buildSite } from "./sitemodel.js";

const RAD=Math.PI/180;
const reduced=matchMedia("(prefers-reduced-motion: reduce)");
let scene=null, lastT=0;
const sites=new Map(); // saha id -> {sig, model, parts}

async function loadSite(id,o,ps,sig){
  const {root,parts}=buildSite(id,o,ps);
  const glb=await new GLTFExporter().parseAsync(root,{binary:true});
  const url=URL.createObjectURL(new Blob([glb],{type:"model/gltf-binary"}));
  const model=await Cesium.Model.fromGltfAsync({url,id,upAxis:Cesium.Axis.Y,forwardAxis:Cesium.Axis.X,
    modelMatrix:Cesium.Transforms.eastNorthUpToFixedFrame(Cesium.Cartesian3.fromDegrees(o.lon,o.lat,0)),
    heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,scene,minimumPixelSize:120,maximumScale:900,
    distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,2.2e6),shadows:Cesium.ShadowMode.ENABLED});
  const cur=sites.get(id);
  if(!cur||cur.sig!==sig){model.destroy();URL.revokeObjectURL(url);return;} // bu arada santral değişti
  model.readyEvent.addEventListener(()=>URL.revokeObjectURL(url));
  scene.primitives.add(model);cur.model=model;cur.parts=parts;
}

// Santral listesindeki değişikliğe göre saha modellerini kur/yenile/kaldır
export function syncModels(){
  if(!scene)return;
  const live=new Set();
  Object.entries(S.sites).forEach(([id,o])=>{
    const ps=S.plants.filter(p=>p.t===id);if(!ps.length)return;live.add(id);
    const sig=ps.map(p=>p.k+tierOf(p)+p.mw).sort().join(","),cur=sites.get(id);
    if(cur&&cur.sig===sig)return;
    if(cur&&cur.model)scene.primitives.remove(cur.model);
    sites.set(id,{sig,model:null,parts:null});
    loadSite(id,o,ps,sig).catch(e=>console.error("3D model yüklenemedi:",e));
  });
  for(const [id,s] of sites)if(!live.has(id)){if(s.model)scene.primitives.remove(s.model);sites.delete(id);}
}

const rotX=new Cesium.Matrix3(),rotM=new Cesium.Matrix4();
function show(model,name,v){const n=model.getNode(name);if(n)n.show=v;}
function animate(s,st,dt){
  const m=s.model,spin=!reduced.matches,wind=st.res||st.off;
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

export function initModels(sc){
  scene=sc;syncModels();
  scene.preUpdate.addEventListener(()=>{
    const now=performance.now(),dt=Math.min(0.1,(now-(lastT||now))/1000);lastT=now;
    for(const [id,s] of sites)if(s.model&&s.model.ready&&S.sites[id])animate(s,plantStatus(id),dt);
  });
}
