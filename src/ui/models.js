// --- 3D santral modelleri: MapLibre özel (custom) katmanında three.js ile çizilir ---
// Her saha kendi sahnesinde, gerçek boyutlu (metre) yerel koordinatlarla kurulur: x=doğu, y=yukarı, z=güney.
// Sahne, küre (veya Mercator) üzerindeki noktaya kendi model matrisiyle yerleştirilir ve uzaktan görünsün
// diye zoom'a göre büyütülür. Güneş oyun saatine göre hareket eder; gölgeler zemine düşer.
import * as THREE from "three";
import * as maplibregl from "maplibre-gl";
import { S } from "../state.js";
import { plantStatus } from "../plantstatus.js";
import { sunElevation } from "../utils.js";

const R_EARTH=6371008.8, TURBINE_H=163, RAD=Math.PI/180;
const reduced=matchMedia("(prefers-reduced-motion: reduce)");
let map=null, renderer=null, camera=null, M=null, lastT=0, env=null;
const sites=new Map(); // saha id -> {sig, scene, parts, box, sun, hemi, sunDir}
const picks=[];        // son karede ekrandaki modellerin sınır kutuları (tıklama için)

// ---- dokular (canvas ile üretilir, dış dosya yok) ----
function tex(w,h,draw,rep){const c=document.createElement("canvas");c.width=w;c.height=h;draw(c.getContext("2d"),w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.wrapS=t.wrapT=THREE.RepeatWrapping;if(rep)t.repeat.set(rep[0],rep[1]);return t;}
function materials(){
  const cells=tex(512,64,(g,w,h)=>{g.fillStyle="#0B1F3D";g.fillRect(0,0,w,h);g.strokeStyle="#6E88A8";g.lineWidth=1.5;
    for(let x=0;x<=w;x+=21){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}
    g.beginPath();g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();g.strokeStyle="#C7D1DB";g.lineWidth=3;g.strokeRect(1.5,1.5,w-3,h-3);},[1,1]);
  const ribs=tex(128,32,(g,w,h)=>{g.fillStyle="#E6EAED";g.fillRect(0,0,w,h);for(let x=0;x<w;x+=4){g.fillStyle=(x/4)%2?"#D2D8DD":"#F3F5F7";g.fillRect(x,0,2,h);}g.fillStyle="#7F8A92";g.fillRect(0,h-2,w,2);},[3,1]);
  const foam=tex(64,256,(g,w,h)=>{g.fillStyle="#A9CFEA";g.fillRect(0,0,w,h);for(let i=0;i<260;i++){g.fillStyle=`rgba(255,255,255,${0.4+Math.random()*0.6})`;g.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*7,8+Math.random()*24);}},[1,3]);
  const ripple=tex(128,128,(g,w,h)=>{g.fillStyle="#1F5E86";g.fillRect(0,0,w,h);for(let i=0;i<90;i++){g.strokeStyle=`rgba(190,225,250,${0.15+Math.random()*0.3})`;g.lineWidth=1;const x=Math.random()*w,y=Math.random()*h;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+6,y-3,x+12,y);g.stroke();}},[2,6]);
  const std=(o)=>new THREE.MeshStandardMaterial(o);
  return {
    white:std({color:0xF2F4F5,roughness:.38,metalness:.08}), grey:std({color:0x80878D,roughness:.65,metalness:.25}),
    dark:std({color:0x2A3036,roughness:.6,metalness:.35}), yellow:std({color:0xF0BE2C,roughness:.5,metalness:.1}),
    panel:std({map:cells,roughness:.16,metalness:.6}), frame:std({color:0xB8C0C7,roughness:.35,metalness:.75}),
    gravel:std({color:0xB4AB97,roughness:1}), concrete:std({color:0xA8A6A0,roughness:.95}), road:std({color:0xC9BFA8,roughness:1}),
    container:std({map:ribs,roughness:.5,metalness:.15}), dam:std({color:0xCDC7BA,roughness:.9}), earth:std({color:0x7A7450,roughness:1}),
    water:std({color:0x1C5A82,roughness:.05,metalness:.3,transparent:true,opacity:.94}),
    river:std({map:ripple,roughness:.12,metalness:.2}), foam:std({map:foam,roughness:.45,transparent:true,opacity:.95}),
    shadow:new THREE.ShadowMaterial({opacity:.4}), beacon:new THREE.MeshBasicMaterial({color:0xFF2236})
  };
}

const box=(w,h,d,mat,x=0,y=0,z=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;return m;};
const pad=(w,d,mat,y=0.06)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat);m.rotation.x=-Math.PI/2;m.position.y=y;m.receiveShadow=true;return m;};

// ---- rüzgâr türbini: konik kule, gövde, burun ve kanat profilli üç kanat ----
let bladeGeo=null;
function bladeGeometry(){
  if(bladeGeo)return bladeGeo;
  const s=new THREE.Shape();
  s.moveTo(-1.2,1.6);s.bezierCurveTo(-2.6,6,-2.3,15,-1.3,30);s.lineTo(-.35,60.5);s.lineTo(.3,61);s.bezierCurveTo(.9,40,1.5,14,1.4,5);s.lineTo(1.2,1.6);s.closePath();
  bladeGeo=new THREE.ExtrudeGeometry(s,{depth:.5,bevelEnabled:true,bevelThickness:.25,bevelSize:.18,bevelSegments:1,curveSegments:8});
  bladeGeo.translate(0,0,-.25);bladeGeo.rotateY(Math.PI/2);return bladeGeo;
}
function turbine(sea,parts){
  const g=new THREE.Group(),base=sea?16:0,top=base+100;
  if(sea){const mono=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.2,16,24),M.dark);mono.position.y=-2;g.add(mono);
    const tp=new THREE.Mesh(new THREE.CylinderGeometry(3.4,3.4,10,24),M.yellow);tp.position.y=base-5;tp.castShadow=true;g.add(tp);
    const deck=new THREE.Mesh(new THREE.CylinderGeometry(6,6,.8,24),M.grey);deck.position.y=base;deck.castShadow=true;g.add(deck);
    const ring=new THREE.Mesh(new THREE.RingGeometry(3.4,9,32),M.foam);ring.rotation.x=-Math.PI/2;ring.position.y=.3;g.add(ring);}
  const tower=new THREE.Mesh(new THREE.CylinderGeometry(1.5,2.7,100,24),M.white);tower.position.y=base+50;tower.castShadow=true;g.add(tower);
  g.add(box(12,4.2,4.4,M.white,2.8,top+2,0));
  const rotor=new THREE.Group();rotor.position.set(-3.8,top+2,0);
  const hub=new THREE.Mesh(new THREE.SphereGeometry(2.3,20,14),M.white);hub.scale.set(1.6,1,1);hub.castShadow=true;rotor.add(hub);
  for(let i=0;i<3;i++){const b=new THREE.Mesh(bladeGeometry(),M.white);b.rotation.x=i*2*Math.PI/3;b.castShadow=true;rotor.add(b);}
  rotor.rotation.x=Math.random()*Math.PI;g.add(rotor);
  const bc=new THREE.Mesh(new THREE.SphereGeometry(1.1,10,8),M.beacon);bc.position.set(4,top+4.6,0);g.add(bc);
  parts.rotors.push({rotor,w:0,f:.92+Math.random()*.16});parts.beacons.push(bc);
  return g;
}
function windFarm(mw,sea,parts,yaw){
  const n=Math.min(4,Math.max(1,Math.ceil(mw/10))),g=new THREE.Group(),cols=n>2?2:n,sp=150;
  for(let i=0;i<n;i++){const t=turbine(sea,parts),c=i%cols,r=Math.floor(i/cols);
    t.position.set((c-(cols-1)/2)*sp+(r%2?sp*.35:0),0,(r-(Math.ceil(n/cols)-1)/2)*sp*1.1);t.rotation.y=yaw;g.add(t);
    if(!sea){const cp=pad(26,26,M.gravel);cp.position.x=t.position.x;cp.position.z=t.position.z;g.add(cp);}}
  if(!sea&&n>1){const xs=g.children.filter(c=>c.type==="Group").map(c=>c.position);const a=xs[0],b=xs[xs.length-1];
    const road=pad(Math.hypot(b.x-a.x,b.z-a.z)+20,6,M.road,.05);road.position.x=(a.x+b.x)/2;road.position.z=(a.z+b.z)/2;road.rotation.z=-Math.atan2(b.z-a.z,b.x-a.x);g.add(road);}
  if(sea&&n>=3){const p=new THREE.Group();[[-6,-4],[6,-4],[-6,4],[6,4]].forEach(([x,z])=>{const l=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,22,10),M.dark);l.position.set(x,9,z);p.add(l);});
    p.add(box(20,9,14,M.yellow,0,24,0),box(16,4,10,M.grey,0,30.5,0));p.position.set(0,0,sp*1.25);g.add(p);}
  return g;
}

// ---- GES: ekvatora bakan eğik panel sıraları, ayaklar, invertör/trafo köşkü ----
function solarFarm(mw,lat,parts){
  // ~0,5 ha/MW kare saha; ortadan geçen servis yolu sıraları iki yarıya böler
  const g=new THREE.Group(),side=Math.sqrt(mw*5000),pitch=8,rows=Math.max(4,Math.round(side/pitch)),L=Math.round(side-12),half=(L-8)/2;
  const tilt=25*RAD*(lat>=0?1:-1),D=rows*pitch,legStep=12,perHalf=Math.floor(half/legStep)+1;
  const mat=M.panel.clone();mat.map=M.panel.map.clone();mat.map.repeat.set(half/24,1);mat.map.needsUpdate=true;
  const pg=new THREE.BoxGeometry(half,.12,4.4),lg=new THREE.CylinderGeometry(.12,.12,1,6);
  const panels=new THREE.InstancedMesh(pg,mat,rows*2),legs=new THREE.InstancedMesh(lg,M.frame,rows*2*perHalf*2);
  panels.castShadow=panels.receiveShadow=true;legs.castShadow=true;
  const m=new THREE.Matrix4(),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),tilt),q0=new THREE.Quaternion(),one=new THREE.Vector3(1,1,1);
  let pi=0,li=0;
  for(let i=0;i<rows;i++){const z=(i-(rows-1)/2)*pitch;
    for(const cx of [-(half/2+4),half/2+4]){panels.setMatrixAt(pi++,m.compose(new THREE.Vector3(cx,1.9,z),q,one));
      for(let k=0;k<perHalf;k++)for(const dz of [-1.6,1.6]){const hh=1.9-dz*Math.sin(tilt);
        legs.setMatrixAt(li++,m.compose(new THREE.Vector3(cx-half/2+k*legStep,hh/2,z+dz),q0,new THREE.Vector3(1,hh,1)));}}}
  g.add(pad(L+14,D+12,M.gravel),pad(7,D+12,M.road,.08),panels,legs);
  const nInv=Math.max(1,Math.round(mw/10));
  for(let b=0;b<nInv;b++){const z=(b-(nInv-1)/2)*(D/nInv);g.add(box(3,2.6,6,M.grey,0,1.3,z));
    const led=new THREE.Mesh(new THREE.BoxGeometry(.1,.5,.5),new THREE.MeshBasicMaterial({color:0x3CC495}));led.position.set(1.56,2,z);g.add(led);parts.inv.push(led);}
  return g;
}

// ---- BESS: 40 ft konteyner sıraları, soğutma üniteleri, LED şeritleri, PCS ----
function bess(mw,parts){
  const g=new THREE.Group(),n=Math.min(24,Math.max(3,Math.ceil(mw/5)*3)),cols=Math.min(6,n),rows=Math.ceil(n/cols);
  const ledMat=new THREE.MeshBasicMaterial({color:0x6F7A82,transparent:true});parts.leds.push(ledMat);
  for(let i=0;i<n;i++){const c=i%cols,r=Math.floor(i/cols),x=(c-(cols-1)/2)*15,z=(r-(rows-1)/2)*6;
    g.add(box(12.2,2.9,2.45,M.container,x,1.75,z),box(1.1,2.3,2.2,M.dark,x+6.7,1.45,z));
    const led=new THREE.Mesh(new THREE.BoxGeometry(10,.22,.05),ledMat);led.position.set(x,2.6,z+1.25);g.add(led);}
  g.add(pad(cols*15+6,rows*6+10,M.concrete,.07),box(4,3,3,M.grey,-(cols*15)/2-4,1.5,0));
  return g;
}

// ---- HES: ağırlık barajı, iki yamaç, baraj gölü, dolusavak, santral binası ve nehir ----
function hydro(parts){
  const g=new THREE.Group(),C=120,H=42;
  const prof=new THREE.Shape();prof.moveTo(-4,0);prof.lineTo(-4,H);prof.lineTo(3,H);prof.lineTo(30,0);prof.closePath();
  const dg=new THREE.ExtrudeGeometry(prof,{depth:C,bevelEnabled:false});dg.translate(0,0,-C/2);dg.rotateY(-Math.PI/2);
  const dam=new THREE.Mesh(dg,M.dam);dam.castShadow=dam.receiveShadow=true;g.add(dam);
  const hill=new THREE.Shape();hill.moveTo(0,0);hill.lineTo(0,H+4);hill.bezierCurveTo(14,H+12,34,H+10,52,H*0.55);hill.bezierCurveTo(64,H*0.3,74,6,86,0);hill.closePath();
  [[-1,C/2],[1,C/2]].forEach(([sgn,off])=>{const hg=new THREE.ExtrudeGeometry(hill,{depth:240,bevelEnabled:false,curveSegments:10});hg.translate(0,0,-200);
    const h=new THREE.Mesh(hg,M.earth);h.scale.x=sgn;h.position.x=sgn*off;h.castShadow=h.receiveShadow=true;g.add(h);});
  const lake=new THREE.Mesh(new THREE.PlaneGeometry(C+30,190),M.water);lake.rotation.x=-Math.PI/2;lake.position.set(0,H-3,-98);g.add(lake);
  const len=Math.hypot(27,H),chute=new THREE.Mesh(new THREE.PlaneGeometry(16,len),M.foam.clone());
  chute.material.map=M.foam.map.clone();chute.material.map.needsUpdate=true;
  chute.rotation.x=-(Math.PI/2-Math.atan2(H,27));chute.position.set(0,H/2+.3,16.5);g.add(chute);
  const river=new THREE.Mesh(new THREE.PlaneGeometry(26,170),M.river.clone());river.material.map=M.river.map.clone();river.material.map.needsUpdate=true;
  river.rotation.x=-Math.PI/2;river.position.set(0,.25,30+85);river.receiveShadow=true;g.add(river);
  g.add(box(26,13,15,M.concrete,34,6.5,38),box(26,1,15,M.dark,34,13.5,38));
  parts.flows.push({chute,river});
  return g;
}

// ---- trafo merkezi: çit içinde iki trafo ve iki gergi direği ----
function substation(){
  const g=new THREE.Group();g.add(pad(32,24,M.gravel,.05),box(5,4,3.5,M.dark,-6,2,0),box(5,4,3.5,M.dark,4,2,0));
  [-12,12].forEach(x=>{g.add(box(.6,14,.6,M.frame,x,7,-6),box(.6,14,.6,M.frame,x,7,6),box(.5,.5,12.6,M.frame,x,13.6,0));});
  return g;
}

function hashYaw(id){let h=0;for(const c of id)h=(h*31+c.charCodeAt(0))|0;return ((Math.abs(h)%50)-25)*RAD;}

function buildSite(id,o,ps){
  const by={};ps.forEach(p=>by[p.k]=(by[p.k]||0)+p.mw);
  const scene=new THREE.Scene(),parts={rotors:[],beacons:[],flows:[],leds:[],inv:[]},groups=[];
  if(by.res)groups.push(windFarm(by.res,false,parts,hashYaw(id)));
  if(by.off)groups.push(windFarm(by.off,true,parts,hashYaw(id)));
  if(by.ges)groups.push(solarFarm(by.ges,o.lat,parts));
  if(by.hes)groups.push(hydro(parts));
  if(by.batt)groups.push(bess(by.batt,parts));
  if(!o.sea&&(by.res||by.ges||by.batt))groups.push(substation());
  // grupları soldan sağa diz, sahayı merkeze al
  const bb=groups.map(gr=>new THREE.Box3().setFromObject(gr)),gap=35,total=bb.reduce((a,b)=>a+b.max.x-b.min.x,0)+gap*(groups.length-1);
  let x=-total/2;groups.forEach((gr,i)=>{const w=bb[i].max.x-bb[i].min.x;gr.position.x=x-bb[i].min.x;x+=w+gap;scene.add(gr);});
  const all=new THREE.Box3().setFromObject(scene),size=all.getSize(new THREE.Vector3()),ext=Math.max(size.x,size.z)*0.75+60;
  const catcher=new THREE.Mesh(new THREE.PlaneGeometry(ext*2,ext*2),M.shadow);catcher.rotation.x=-Math.PI/2;catcher.position.y=.02;catcher.receiveShadow=true;scene.add(catcher);
  const hemi=new THREE.HemisphereLight(0xCFE3FF,0x6B5A45,.6),sun=new THREE.DirectionalLight(0xFFF1DC,2.6);
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);const sc=sun.shadow.camera;sc.left=sc.bottom=-ext;sc.right=sc.top=ext;sc.near=1;sc.far=4000;
  sun.shadow.bias=-.0004;sun.shadow.normalBias=.6;scene.add(hemi,sun,sun.target);
  return {scene,parts,box:all,sun,hemi,sunDir:new THREE.Vector3(0,1,0),ext,south:o.lat>=0};
}

// Santral listesindeki değişikliğe göre saha sahnelerini kur/yenile/kaldır
export function syncModels(){
  if(!M)return;
  const live=new Set();
  Object.entries(S.sites).forEach(([id,o])=>{
    const ps=S.plants.filter(p=>p.t===id);if(!ps.length)return;live.add(id);
    const sig=ps.map(p=>p.k+p.mw).sort().join(","),cur=sites.get(id);
    if(!cur||cur.sig!==sig){if(cur)dispose(cur.scene);const s=buildSite(id,o,ps);s.sig=sig;sites.set(id,s);}
  });
  for(const [id,s] of sites)if(!live.has(id)){dispose(s.scene);sites.delete(id);}
  map&&map.triggerRepaint();
}
function dispose(scene){scene.traverse(o=>{if(o.geometry&&o.geometry!==bladeGeo)o.geometry.dispose();});}

// Güneş: doğudan doğar, öğlen ekvator tarafında en yükseğe çıkar, batıda batar
function sunTarget(h,south){
  const t=(h+0.5-6)/13,el=sunElevation(h);
  const az=(south?90+t*180:90-t*180)*RAD;
  return {dir:new THREE.Vector3(Math.sin(az)*Math.cos(el),Math.sin(el),-Math.cos(az)*Math.cos(el)).normalize(),el};
}

function animate(s,st,dt){
  const {dir,el}=sunTarget(st.hour,s.south),k=Math.min(1,dt*1.5);
  s.sunDir.lerp(dir,k).normalize();
  const day=Math.max(0,Math.min(1,(s.sunDir.y+0.05)/0.35));
  s.sun.position.copy(s.sunDir).multiplyScalar(1500);s.sun.intensity=2.8*day;
  s.sun.color.setHSL(0.09,0.6*(1-Math.min(1,el/(25*RAD))),0.55+0.4*Math.min(1,el/(25*RAD)));
  s.scene.environment=env;s.scene.environmentIntensity=0.3+0.7*day;
  s.hemi.intensity=0.45+0.15*day;s.hemi.color.setHSL(0.6,0.45-0.15*day,0.45+0.35*day);
  const spin=!reduced.matches,wind=st.res||st.off;
  for(const r of s.parts.rotors){const target=wind&&wind.f>=0.03?(0.55+1.15*wind.f)*r.f:0;r.w+=(target-r.w)*Math.min(1,dt*0.6);if(spin)r.rotor.rotation.x+=r.w*dt;}
  const blink=st.night&&(performance.now()%1600<800);s.parts.beacons.forEach(b=>b.visible=blink);
  for(const f of s.parts.flows){const run=!!(st.hes&&st.hes.run);f.chute.visible=run;if(spin&&run){f.chute.material.map.offset.y-=dt*1.6;}if(spin)f.river.material.map.offset.y-=dt*(run?0.9:0.15);}
  for(const m of s.parts.leds){const b=st.batt;if(!b)continue;const pulse=0.55+0.45*Math.sin(performance.now()/260);
    m.color.set(b.chg?0x3CC495:b.dis?0xF2A93B:0x6F7A82);m.opacity=(b.chg||b.dis)?pulse:0.9;}
  for(const l of s.parts.inv){const g=st.ges;l.material.color.set(!g||g.f<0.03?0x39424A:g.curt?0xF06A7D:0x3CC495);}
}

// Dış mekân ortam haritası: gökyüzü–ufuk–zemin gradyanından PMREM (metal/cam yüzeyler gökyüzünü yansıtır)
function outdoorEnv(){
  const sc=new THREE.Scene(),mat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
    vertexShader:"varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:"varying vec3 vP;void main(){float h=vP.y;vec3 sky=mix(vec3(.78,.86,.95),vec3(.32,.52,.86),smoothstep(0.,.6,h));vec3 gr=mix(vec3(.52,.47,.38),vec3(.33,.3,.25),smoothstep(0.,.5,-h));gl_FragColor=vec4(h>0.?sky:gr,1.);}"});
  sc.add(new THREE.Mesh(new THREE.SphereGeometry(10,48,24),mat));
  const pm=new THREE.PMREMGenerator(renderer),t=pm.fromScene(sc,0.02).texture;pm.dispose();return t;
}

// Uzaktan görünsün diye büyütme: türbin yüksekliği zoom'a göre ~30 px'den ~115 px'e çıkar
function exaggeration(lat,z){const mpp=2*Math.PI*R_EARTH*Math.cos(lat*RAD)/(512*2**z),px=z<=4?30:z>=9?115:30+(z-4)*17;return Math.max(1,px*mpp/TURBINE_H);}
function modelMatrix(o,s,globe){
  if(globe)return new THREE.Matrix4().makeRotationY(o.lon*RAD).multiply(new THREE.Matrix4().makeRotationX(-o.lat*RAD))
    .multiply(new THREE.Matrix4().makeTranslation(0,0,1)).multiply(new THREE.Matrix4().makeRotationX(Math.PI/2)).multiply(new THREE.Matrix4().makeScale(s/R_EARTH,s/R_EARTH,s/R_EARTH));
  const mc=maplibregl.MercatorCoordinate.fromLngLat([o.lon,o.lat],0),k=mc.meterInMercatorCoordinateUnits()*s;
  return new THREE.Matrix4().makeTranslation(mc.x,mc.y,mc.z).multiply(new THREE.Matrix4().makeRotationZ(Math.PI)).multiply(new THREE.Matrix4().makeRotationX(Math.PI/2)).multiply(new THREE.Matrix4().makeScale(-k,k,k));
}
function screenRect(b,PM,W,H){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;const v=new THREE.Vector4();
  for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){
    v.set(x,y,z,1).applyMatrix4(PM);if(v.w<=0)return null;const px=(v.x/v.w+1)/2*W,py=(1-v.y/v.w)/2*H;
    x0=Math.min(x0,px);x1=Math.max(x1,px);y0=Math.min(y0,py);y1=Math.max(y1,py);}
  return {x0,y0,x1,y1};
}

export const modelLayer={
  id:"plants-3d",type:"custom",renderingMode:"3d",
  onAdd(m,gl){
    map=m;M=materials();camera=new THREE.Camera();camera.matrixAutoUpdate=false;camera.matrixWorldAutoUpdate=false;
    renderer=new THREE.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:true});
    renderer.autoClear=false;renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    syncModels();
  },
  render(gl,args){
    picks.length=0;const z=map.getZoom();if(z<2.6||!sites.size)return;
    const pd=args.defaultProjectionData,globe=pd.projectionTransition>0.5,main=new THREE.Matrix4().fromArray(globe?pd.mainMatrix:(pd.fallbackMatrix||pd.mainMatrix));
    const now=performance.now(),dt=Math.min(0.1,(now-(lastT||now))/1000);lastT=now;
    const cv=map.getCanvas(),W=cv.clientWidth,H=cv.clientHeight;
    renderer.resetState();if(!env){env=outdoorEnv();renderer.resetState();}
    renderer.setViewport(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight);renderer.clearDepth();
    // kürede kameranın konumu (birim küre koordinatı): arka yüzdeki sahaları atlamak için
    const cam=globe?new THREE.Vector3(0,0,-1).applyMatrix4(main.clone().invert()):null;
    let drawn=0;
    for(const [id,s] of sites){
      const o=S.sites[id];if(!o)continue;
      if(cam){const n=new THREE.Vector3(Math.sin(o.lon*RAD)*Math.cos(o.lat*RAD),Math.sin(o.lat*RAD),Math.cos(o.lon*RAD)*Math.cos(o.lat*RAD));if(n.dot(cam.clone().sub(n))<0)continue;}
      animate(s,plantStatus(id),dt);
      const PM=main.clone().multiply(modelMatrix(o,exaggeration(o.lat,z),globe));
      const c=new THREE.Vector3(0,0,-1).applyMatrix4(PM.clone().invert()); // kameranın yerel konumu (yansımalar için)
      camera.matrixWorld.makeTranslation(c.x,c.y,c.z);camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
      camera.projectionMatrix.copy(PM).multiply(camera.matrixWorld);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
      renderer.render(s.scene,camera);
      const r=screenRect(s.box,PM,W,H);if(r&&r.x1-r.x0<W*1.5&&r.y1-r.y0<H*1.5)picks.push({id,...r});drawn++;
    }
    if(drawn)map.triggerRepaint(); // pervaneler, su ve ışıklar için sürekli çizim
  }
};

// Ekrandaki bir noktaya denk gelen saha modeli (varsa)
export function pickModel(p){const hit=picks.filter(r=>p.x>=r.x0&&p.x<=r.x1&&p.y>=r.y0&&p.y<=r.y1);
  if(!hit.length)return null;hit.sort((a,b)=>(a.x1-a.x0)*(a.y1-a.y0)-(b.x1-b.x0)*(b.y1-b.y0));return hit[0].id;}
