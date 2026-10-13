// --- Saha modelleri (yalnızca three.js): 3D görünüm (models.js) ve haritadaki tesis görüntüsü (siteimage.js) ortak kullanır ---
// Her saha gerçek boyutlu (metre) yerel koordinatlarla kurulur: x=doğu, y=yukarı, z=güney; saha koordinatı orijindedir.
import * as THREE from "three";
import { tierOf, TIER_ORDER } from "../equipment.js";

const RAD=Math.PI/180;
let M=null;

// Durum LED'i: her durum için üst üste bir ağ; Cesium'da yalnızca biri görünür
function ledSet(g,geo,[x,y,z],mats,name){
  const names={};for(const [st,mat] of Object.entries(mats)){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.name=`${name}_${st}`;g.add(m);names[st]=m.name;}
  return names;
}

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
    gravel:std({color:0xB4AB97,roughness:1,name:"gravel"}), concrete:std({color:0xA8A6A0,roughness:.95}), road:std({color:0xC9BFA8,roughness:1}),
    container:std({map:ribs,roughness:.5,metalness:.15}), dam:std({color:0xCDC7BA,roughness:.9}), earth:std({color:0x7A7450,roughness:1}),
    water:std({color:0x1C5A82,roughness:.05,metalness:.3,transparent:true,opacity:.94}),
    river:std({map:ripple,roughness:.12,metalness:.2}), foam:std({map:foam,roughness:.45,transparent:true,opacity:.95}),
    chips:std({color:0x8A6A43,roughness:1}), membrane:std({color:0x5E7F3A,roughness:.55,metalness:.05}),
    steam:new THREE.MeshBasicMaterial({color:0xFAFBFC,transparent:true,opacity:.93}), smoke:std({color:0x9AA0A6,roughness:1,transparent:true,opacity:.45}),
    glint:new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:.5,depthWrite:false}),
    beacon:new THREE.MeshBasicMaterial({color:0xFF2236}),
    ledG:new THREE.MeshBasicMaterial({color:0x3CC495}), ledA:new THREE.MeshBasicMaterial({color:0xF2A93B}),
    ledR:new THREE.MeshBasicMaterial({color:0xF06A7D}), ledO:new THREE.MeshBasicMaterial({color:0x39424A})
  };
}

const box=(w,h,d,mat,x=0,y=0,z=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;return m;};
// zemin alanı (çakıl, beton, yol): 3D görünümde modelden çıkarılıp araziye serilir (takePads)
const pad=(w,d,mat,y=0.06)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat);m.rotation.x=-Math.PI/2;m.position.y=y;m.receiveShadow=true;m.name="pad";return m;};

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
  const k=parts.rotors.length;rotor.name=`rotor${k}`;g.add(rotor);g.name=`tw${k}`;
  const bc=new THREE.Mesh(new THREE.SphereGeometry(1.1,10,8),M.beacon);bc.position.set(4,top+4.6,0);bc.name=`beacon${k}`;g.add(bc);
  parts.rotors.push({name:rotor.name,a:Math.random()*Math.PI,w:0,f:.92+Math.random()*.16});parts.beacons.push(bc.name);
  return g;
}
// ~5 MW'lık türbin başına bir ünite (rotor ~128 m, göbek ~100 m: 4,5–5 MW sınıfı); türbinler arası rotor çapının ~3,5 katı,
// sıralar arası ~5 katı (yaygın yerleşim aralıkları)
function windFarm(mw,sea,parts,yaw,sc=1){
  const n=Math.min(8,Math.max(1,Math.ceil(mw/5))),g=new THREE.Group(),cols=Math.min(4,n),nr=Math.ceil(n/cols),D=128*sc,sp=3.5*D,rs=5*D,rows=[];
  for(let i=0;i<n;i++){const t=turbine(sea,parts),c=i%cols,r=Math.floor(i/cols),cnt=Math.min(cols,n-r*cols);t.scale.setScalar(sc);
    t.position.set((c-(cnt-1)/2)*sp+(r%2?sp*.5:0),0,(r-(nr-1)/2)*rs);t.rotation.y=yaw;g.add(t);parts.yaws.push({name:t.name,base:yaw,cur:yaw});
    (rows[r]=rows[r]||[]).push(t.position);
    if(!sea){const cp=pad(26,26,M.gravel);cp.position.x=t.position.x;cp.position.z=t.position.z;g.add(cp);}}
  // servis yolları: her sıra boyunca ve sıraları birbirine bağlayan
  const road=(a,b)=>{const r=pad(Math.hypot(b.x-a.x,b.z-a.z)+20,6,M.road,.05);r.position.x=(a.x+b.x)/2;r.position.z=(a.z+b.z)/2;r.rotation.z=-Math.atan2(b.z-a.z,b.x-a.x);g.add(r);};
  if(!sea){rows.forEach(r=>{if(r.length>1)road(r[0],r[r.length-1]);});for(let r=1;r<rows.length;r++)road(rows[r-1][0],rows[r][0]);}
  if(sea&&n>=3){const p=new THREE.Group();[[-6,-4],[6,-4],[-6,4],[6,4]].forEach(([x,z])=>{const l=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,22,10),M.dark);l.position.set(x,9,z);p.add(l);});
    p.add(box(20,9,14,M.yellow,0,24,0),box(16,4,10,M.grey,0,30.5,0));p.position.set(0,0,(nr-1)/2*rs+sp*.6);g.add(p);}
  return g;
}

// ---- GES: ekvatora bakan eğik panel sıraları, ayaklar, invertör/trafo köşkü ----
// panel tonu ekipman kademesine göre: ekonomi açık mavi polikristal, premium koyu tek renk TOPCon
const PANEL_TINT={eco:0xC4D6FF,std:0xFFFFFF,pre:0x6A7380};
function solarFarm(mw,lat,parts,tier="std"){
  // ~1,1 ha/MW kare saha (sabit eğimli, iki dikey modüllü 4,6 m derinlikte masalar, sıra aralığı 9,5 m); ortadan geçen
  // servis yolu sıraları iki yarıya böler. Her yarı sıra ~26 m'lik masalara ayrılır: 3D görünümde her masa kendi
  // zeminine oturur ve yamaç boyunca eğilir (conformSite).
  const g=new THREE.Group(),side=Math.sqrt(mw*11000),pitch=9.5,rows=Math.max(4,Math.round(side/pitch)),L=Math.round(side-12),half=(L-8)/2;
  const tilt=25*RAD*(lat>=0?1:-1),D=rows*pitch,nt=Math.max(1,Math.round(half/26)),tl=half/nt-0.6,perT=Math.max(2,Math.round(tl/12)+1);
  const mat=M.panel.clone();mat.map=M.panel.map.clone();mat.map.repeat.set(Math.max(1,Math.round(tl/24)),1);mat.map.needsUpdate=true;mat.color.setHex(PANEL_TINT[tier]);
  const pg=new THREE.BoxGeometry(tl,.12,4.6),lg=new THREE.CylinderGeometry(.12,.12,1,6);
  const panels=new THREE.InstancedMesh(pg,mat,rows*2*nt),legs=new THREE.InstancedMesh(lg,M.frame,rows*2*nt*perT*2);
  panels.castShadow=panels.receiveShadow=true;legs.castShadow=true;panels.userData.span=tl/2;
  const m=new THREE.Matrix4(),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),tilt),q0=new THREE.Quaternion(),one=new THREE.Vector3(1,1,1);
  const tables=[];
  for(let i=0;i<rows;i++){const z=(i-(rows-1)/2)*pitch;
    for(const cx of [-(half/2+4),half/2+4])for(let t=0;t<nt;t++)tables.push([cx-half/2+(t+.5)*half/nt,z,i]);}
  let li=0;
  tables.forEach(([x,z],pi)=>{panels.setMatrixAt(pi,m.compose(new THREE.Vector3(x,1.9,z),q,one));
    for(let k=0;k<perT;k++)for(const dz of [-1.7,1.7]){const hh=1.9-dz*Math.sin(tilt);
      legs.setMatrixAt(li++,m.compose(new THREE.Vector3(x-tl/2+.5+k*(tl-1)/(perT-1),hh/2,z+dz),q0,new THREE.Vector3(1,hh,1)));}});
  g.add(pad(L+14,D+12,M.gravel),pad(7,D+12,M.road,.08),panels,legs);
  // güneş parıltısı: sıralar 12 banda ayrılır, üretim varken bantlar sırayla yanarak panellerin üstünden kayar
  const K=12,gg=new THREE.PlaneGeometry(tl,4.4);gg.rotateX(-Math.PI/2);
  const lift=new THREE.Vector3(0,.09,0).applyQuaternion(q);
  for(let k=0;k<K;k++){const r0=Math.floor(k*rows/K),r1=Math.floor((k+1)*rows/K);if(r1<=r0)continue;
    const band=tables.filter(t=>t[2]>=r0&&t[2]<r1),im=new THREE.InstancedMesh(gg,M.glint,band.length);im.userData.span=tl/2;
    band.forEach(([x,z],j)=>im.setMatrixAt(j,m.compose(new THREE.Vector3(x,1.9,z).add(lift),q,one)));
    im.name=`glint${parts.glints.length}`;g.add(im);parts.glints.push(im.name);}
  const nInv=Math.max(1,Math.round(mw/10));
  for(let b=0;b<nInv;b++){const z=(b-(nInv-1)/2)*(D/nInv);g.add(box(3,2.6,6,M.grey,0,1.3,z));
    parts.inv.push(ledSet(g,new THREE.BoxGeometry(.1,.5,.5),[1.56,2,z],{run:M.ledG,curt:M.ledR,off:M.ledO},`inv${b}`));}
  return g;
}

// ---- BESS: 40 ft konteyner sıraları, soğutma üniteleri, LED şeritleri, PCS ----
function bess(mw,parts){
  const g=new THREE.Group(),n=Math.min(24,Math.max(3,Math.ceil(mw/5)*3)),cols=Math.min(6,n),rows=Math.ceil(n/cols);
  for(let i=0;i<n;i++){const c=i%cols,r=Math.floor(i/cols),x=(c-(cols-1)/2)*15,z=(r-(rows-1)/2)*6;
    g.add(box(12.2,2.9,2.45,M.container,x,1.75,z),box(1.1,2.3,2.2,M.dark,x+6.7,1.45,z));
    const fan=new THREE.Group();fan.position.set(x+6.7,2.68,z);fan.add(box(1.9,.08,.3,M.frame),box(.3,.08,1.9,M.frame));fan.name=`fan${parts.fans.length}`;g.add(fan);parts.fans.push({name:fan.name,a:Math.random()*3});
    parts.leds.push(ledSet(g,new THREE.BoxGeometry(10,.22,.05),[x,2.6,z+1.25],{chg:M.ledG,dis:M.ledA,off:M.ledO},`led${i}`));}
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
  chute.rotation.x=-(Math.PI/2-Math.atan2(H,27));chute.position.set(0,H/2+.3,16.5);chute.name="chute";g.add(chute);
  const river=new THREE.Mesh(new THREE.PlaneGeometry(26,170),M.river.clone());river.material.map=M.river.map.clone();river.material.map.needsUpdate=true;
  river.rotation.x=-Math.PI/2;river.position.set(0,.25,30+85);river.receiveShadow=true;g.add(river);
  g.add(box(26,13,15,M.concrete,34,6.5,38),box(26,1,15,M.dark,34,13.5,38));
  parts.flows.push("chute");g.userData.rigid=true; // vadi modeli tek parça: araziye bir bütün olarak oturur
  // dolusavak dibinde su sıçraması (çalışırken)
  const sp=new THREE.Group();sp.name="spray";
  [[-5,3,34,3.4],[0,4,35,4.2],[5,3,34,3.4],[-2.5,6,37,3],[2.5,6,37,3]].forEach(([x,y,z,r])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),M.steam);m.position.set(x,y,z);sp.add(m);});
  g.add(sp);parts.drifts.push({name:"spray",ph:0,amp:1.2,sp:3.2,k:"hes"});
  return g;
}

// ---- JES: kuyu başları, yükseltilmiş buhar boruları, santral binası ve buhar çıkaran soğutma kuleleri ----
function geothermal(mw,parts){
  const g=new THREE.Group(),nw=Math.min(6,1+Math.ceil(mw/5)),nt=mw>10?3:2;
  g.add(pad(150,120,M.gravel,.05),box(34,13,18,M.concrete,0,6.5,0),box(34,1.2,18,M.dark,0,13.6,0));
  // soğutma kuleleri: hafif daralan beton gövde; üstte buhar bulutu (çalışırken görünür)
  for(let i=0;i<nt;i++){const x=-26+i*20,z=-34,t=new THREE.Mesh(new THREE.CylinderGeometry(6.2,8,20,28,1,true),M.concrete);t.position.set(x,10,z);t.castShadow=true;g.add(t);
    const st=new THREE.Group();st.name=`steam${parts.steams.length}`;
    [[0,25,0,6],[1.5,31,1,7.5],[-1,37,-1,8.5],[2,43,.5,9]].forEach(([dx,y,dz,r])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),M.steam);m.position.set(x+dx,y,z+dz);st.add(m);});
    g.add(st);parts.steams.push(st.name);parts.drifts.push({name:st.name,ph:i*1.7,amp:1.8,sp:.6});}
  // kuyu başları (vana ağacı) ve santrale giden yalıtımlı borular (ayaklar üstünde)
  for(let i=0;i<nw;i++){const a=(i/nw)*Math.PI*1.2+0.3,x=Math.cos(a)*62,z=24+Math.sin(a)*32;
    g.add(pad(10,10,M.concrete,.07),box(1.6,3.2,1.6,M.yellow,x,1.6,z),box(3.2,.8,.8,M.grey,x,2.8,z));
    const len=Math.hypot(x,z-9),pipe=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,len,10),M.frame);
    pipe.rotation.z=Math.PI/2;pipe.rotation.y=-Math.atan2(z-9,x);pipe.position.set(x/2,2.6,(z+9)/2);pipe.castShadow=true;g.add(pipe);
    for(let k=1;k<Math.floor(len/9);k++){const f=k*9/len;g.add(box(.4,2.4,.4,M.dark,x*(1-f),1.2,9+(z-9)*(1-f)));}}
  return g;
}

// ---- BES: kazan ve türbin binası, baca (çalışırken duman), talaş yığınları, biyogaz kubbeleri, konveyör ----
function biomass(mw,parts){
  const g=new THREE.Group(),nd=mw>10?3:2;
  g.add(pad(130,90,M.concrete,.05),box(22,26,18,M.concrete,0,13,0),box(22,1,18,M.dark,0,26.5,0),box(30,12,16,M.grey,26,6,0));
  const ch=new THREE.Mesh(new THREE.CylinderGeometry(1.4,2,48,16),M.white);ch.position.set(-14,24,-6);ch.castShadow=true;g.add(ch);
  g.add(box(3.4,1.2,3.4,M.beacon,-14,46.5,-6));
  const sm=new THREE.Group();sm.name=`smoke${parts.smokes.length}`;
  [[0,52,0,3],[1.5,57,.5,4],[3.5,62,1,5],[6,67,1.5,6]].forEach(([dx,y,dz,r])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),M.smoke);m.position.set(-14+dx,y,-6+dz);sm.add(m);});
  g.add(sm);parts.smokes.push(sm.name);parts.drifts.push({name:sm.name,ph:0,amp:1.4,sp:.5});
  // yakıt sahası: talaş yığınları ve kazana çıkan eğik konveyör
  [[-40,22,9],[-55,8,11],[-38,-8,8]].forEach(([x,z,r])=>{const c=new THREE.Mesh(new THREE.ConeGeometry(r,r*0.8,20),M.chips);c.position.set(x,r*0.4,z);c.castShadow=c.receiveShadow=true;g.add(c);});
  const cv=box(34,1,2.4,M.frame,-24,10,10);cv.rotation.z=0.5;g.add(cv);
  const ch2=new THREE.Group();ch2.position.set(-24,10.9,10);ch2.rotation.z=0.5;ch2.name=`chips${parts.belts.length}`;
  for(let k=-2;k<=2;k++)ch2.add(box(1.6,.8,1.6,M.chips,k*6.8,0,0));g.add(ch2);parts.belts.push(ch2.name);
  // biyogaz çürütücüler: beton silindir üstünde gaz kubbesi
  for(let i=0;i<nd;i++){const x=10+i*20,z=32;
    const tk=new THREE.Mesh(new THREE.CylinderGeometry(8,8,6,28),M.concrete);tk.position.set(x,3,z);tk.castShadow=true;g.add(tk);
    const dm=new THREE.Mesh(new THREE.SphereGeometry(8,28,14,0,Math.PI*2,0,Math.PI/2),M.membrane);dm.position.set(x,6,z);dm.castShadow=true;g.add(dm);}
  return g;
}

// ---- Deniz: yüzer gelgit türbini platformları (dönen çift rotor) ve dalga şamandıraları (inip kalkar) ----
function marine(mw,parts){
  const g=new THREE.Group(),np=Math.min(4,Math.max(1,Math.ceil(mw/5))),nb=6;
  for(let i=0;i<np;i++){const x=(i-(np-1)/2)*70,pl=new THREE.Group();pl.position.set(x,0,0);
    pl.add(box(44,2.6,3.2,M.yellow,0,1.1,-5),box(44,2.6,3.2,M.yellow,0,1.1,5),box(10,3,13,M.grey,0,3.2,0),box(4,4,4,M.white,0,6.2,0));
    const ring=new THREE.Mesh(new THREE.RingGeometry(9,24,32),M.foam);ring.rotation.x=-Math.PI/2;ring.scale.z=0.45;ring.position.y=.3;pl.add(ring);
    // akıntı yönünde (x ekseni) dönen iki rotor; kollar suya iner
    for(const z of [-11,11]){pl.add(box(1,7,1,M.dark,0,-1,z*0.7));
      const rot=new THREE.Group();rot.position.set(-3,-3.5,z);rot.name=`tide${parts.tides.length}`;
      const hub=new THREE.Mesh(new THREE.SphereGeometry(1.4,14,10),M.yellow);hub.scale.set(2,1,1);rot.add(hub);
      for(let b=0;b<3;b++){const bl=box(.4,8,1.1,M.white,0,4.2,0);const arm=new THREE.Group();arm.add(bl);arm.rotation.x=b*2*Math.PI/3;rot.add(arm);}
      pl.add(rot);parts.tides.push({name:rot.name,a:Math.random()*Math.PI,w:0});}
    const bc=new THREE.Mesh(new THREE.SphereGeometry(.8,10,8),M.beacon);bc.position.set(0,8.6,0);bc.name=`beacon_m${i}`;pl.add(bc);parts.beacons.push(bc.name);
    g.add(pl);}
  // dalga dönüştürücü şamandıralar
  for(let i=0;i<nb;i++){const b=new THREE.Group(),x=(i-(nb-1)/2)*28,z=48+(i%2)*14;b.position.set(x,0,z);b.name=`buoy${parts.buoys.length}`;
    const c=new THREE.Mesh(new THREE.CylinderGeometry(3,3.4,3,20),M.yellow);c.position.y=1;c.castShadow=true;b.add(c);
    b.add(box(1.4,2.4,1.4,M.dark,0,3.6,0));const top=new THREE.Mesh(new THREE.SphereGeometry(.6,8,6),M.beacon);top.position.y=5.1;b.add(top);
    g.add(b);parts.buoys.push({name:b.name,ph:i*1.3});}
  return g;
}

// ---- trafo merkezi: çit içinde iki trafo ve iki gergi direği ----
function substation(){
  const g=new THREE.Group();g.add(pad(32,24,M.gravel,.05),box(5,4,3.5,M.dark,-6,2,0),box(5,4,3.5,M.dark,4,2,0));
  [-12,12].forEach(x=>{g.add(box(.6,14,.6,M.frame,x,7,-6),box(.6,14,.6,M.frame,x,7,6),box(.5,.5,12.6,M.frame,x,13.6,0));});
  return g;
}

function hashYaw(id){let h=0;for(const c of id)h=(h*31+c.charCodeAt(0))|0;return ((Math.abs(h)%50)-25)*RAD;}

// türbin boyu ekipman kademesine göre (rotor çapı ve göbek yüksekliği birlikte ölçeklenir)
const TURBINE_SCALE={eco:0.82,std:1,pre:1.14};
export function buildSite(id,o,ps){
  if(!M)M=materials();
  const by={},top={};ps.forEach(p=>{by[p.k]=(by[p.k]||0)+p.mw;const q=tierOf(p);if(!top[p.k]||TIER_ORDER.indexOf(q)>TIER_ORDER.indexOf(top[p.k]))top[p.k]=q;});
  const root=new THREE.Scene(),parts={rotors:[],beacons:[],flows:[],leds:[],inv:[],yaws:[],steams:[],smokes:[],tides:[],buoys:[],glints:[],fans:[],drifts:[],belts:[]},groups=[];
  if(by.res)groups.push(windFarm(by.res,false,parts,hashYaw(id),TURBINE_SCALE[top.res]));
  if(by.off)groups.push(windFarm(by.off,true,parts,hashYaw(id),TURBINE_SCALE[top.off]));
  if(by.ges)groups.push(solarFarm(by.ges,o.lat,parts,top.ges));
  if(by.hes)groups.push(hydro(parts));
  if(by.jes)groups.push(geothermal(by.jes,parts));
  if(by.bes)groups.push(biomass(by.bes,parts));
  if(by.mar)groups.push(marine(by.mar,parts));
  if(by.batt)groups.push(bess(by.batt,parts));
  if(!o.sea&&(by.res||by.ges||by.batt||by.jes||by.bes))groups.push(substation());
  // grupları soldan sağa diz, sahayı merkeze al
  const bb=groups.map(gr=>new THREE.Box3().setFromObject(gr)),gap=35,total=bb.reduce((a,b)=>a+b.max.x-b.min.x,0)+gap*(groups.length-1);
  let x=-total/2;groups.forEach((gr,i)=>{const w=bb[i].max.x-bb[i].min.x;gr.position.x=x-bb[i].min.x;x+=w+gap;root.add(gr);});
  return {root,parts};
}



// --- Araziye oturtma (3D görünüm) ---
// f(x,z,exact): saha koordinatına göre yerel zemin yüksekliği (metre). Her nesne kendi zeminine iner; panel masaları
// iki ucunun yüksekliğine göre yamaç boyunca eğilir; instanced olmayan nesneler (türbin, bina) için exact=true
// verilir (tek noktadan ölçülen hassas yükseklik). Vadi modeli (HES) bir bütün olarak oturur.
export function conformSite(root,f){
  root.updateMatrixWorld(true);
  const m=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3(),qz=new THREE.Quaternion(),Z=new THREE.Vector3(0,0,1),bb=new THREE.Box3(),c0=new THREE.Vector3();
  for(const gr of root.children){
    if(gr.userData.rigid){gr.position.y+=f(gr.position.x,gr.position.z,true);continue;}
    for(const c of gr.children){
      if(c.isInstancedMesh){const sp=c.userData.span;
        for(let i=0;i<c.count;i++){c.getMatrixAt(i,m);m.decompose(p,q,s);const x=p.x+gr.position.x,z=p.z+gr.position.z;
          if(sp){const a=f(x-sp,z),b=f(x+sp,z);p.y+=(a+b)/2;q.premultiply(qz.setFromAxisAngle(Z,Math.atan2(b-a,2*sp)));}else p.y+=f(x,z);
          c.setMatrixAt(i,m.compose(p,q,s));}
        c.instanceMatrix.needsUpdate=true;c.boundingBox=c.boundingSphere=null;}
      else{bb.setFromObject(c).getCenter(c0);c.position.y+=f(c0.x,c0.z,true);}
    }
  }
}
// zemin alanının saydamlığı: geniş çakıl alanlar (GES zemini, türbin platformu) altındaki toprağı belli eder
export const padAlpha=mat=>mat.name==="gravel"?0.55:0.85;
// Zemin alanlarını modelden çıkarır: [{pts:[[x,z]×4], color:"#rrggbb", a}] (saha koordinatında köşeler)
export function takePads(root){
  root.updateMatrixWorld(true);const out=[],v=new THREE.Vector3(),rm=[];
  root.traverse(n=>{if(n.name!=="pad")return;const {width:w,height:h}=n.geometry.parameters;
    out.push({pts:[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([a,b])=>{v.set(a,b,0).applyMatrix4(n.matrixWorld);return [v.x,v.z];}),color:"#"+n.material.color.getHexString(),a:padAlpha(n.material)});rm.push(n);});
  rm.forEach(n=>n.parent.remove(n));return out;
}