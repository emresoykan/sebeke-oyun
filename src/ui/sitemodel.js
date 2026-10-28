// --- Saha modelleri (yalnızca three.js): 3D görünüm (models.js) ve haritadaki tesis görüntüsü (siteimage.js) ortak kullanır ---
// Her saha gerçek boyutlu (metre) yerel koordinatlarla kurulur: x=doğu, y=yukarı, z=güney; saha koordinatı orijindedir.
// Ölçüler yaygın tesis düzenlerinden alınmış temsilî değerlerdir (belirli bir santralin kopyası değildir). Tekrarlanan
// parçalar (çit, panel masası, fan, araç) tek çizim çağrısında toplanır (InstancedMesh).
import * as THREE from "three";
import { tierOf, TIER_ORDER } from "../equipment.js";

const RAD=Math.PI/180;
let M=null;

// Durum LED'i: her durum için üst üste bir ağ; Cesium'da yalnızca biri görünür
function ledSet(g,geo,[x,y,z],mats,name){
  const names={};for(const [st,mat] of Object.entries(mats)){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.name=`${name}_${st}`;g.add(m);names[st]=m.name;}
  return names;
}

// ---- gürültü: tohumlu değer gürültüsü (0–1), fraktal toplam ----
function noise2(seed){
  const h=(i,j)=>{let n=(Math.imul(i,374761393)+Math.imul(j,668265263)+Math.imul(seed,1442695041))|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
  const s=t=>t*t*(3-2*t);
  const n=(x,y)=>{const i=Math.floor(x),j=Math.floor(y),fx=s(x-i),fy=s(y-j),a=h(i,j),b=h(i+1,j),c=h(i,j+1),d=h(i+1,j+1);return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy;};
  return (x,y,o=4)=>{let v=0,a=.5,f=1,t=0;for(let k=0;k<o;k++){v+=a*n(x*f+k*17.3,y*f-k*9.1);t+=a;a*=.5;f*=2.03;}return v/t;};
}
const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};

// ---- dokular (canvas ile üretilir, dış dosya yok) ----
function tex(w,h,draw,rep){const c=document.createElement("canvas");c.width=w;c.height=h;draw(c.getContext("2d"),w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.wrapS=t.wrapT=THREE.RepeatWrapping;if(rep)t.repeat.set(rep[0],rep[1]);return t;}
// gürültüden normal haritası (su dalgacıkları): yükseklik farklarından yüzey eğimi
function normalTex(size,scale,seed,rep){
  const N=noise2(seed),c=document.createElement("canvas");c.width=c.height=size;const g=c.getContext("2d"),img=g.createImageData(size,size),H=new Float32Array(size*size);
  for(let j=0;j<size;j++)for(let i=0;i<size;i++){const u=i/size,v=j/size;
    // kenarlar eşleşsin diye dört köşeden harmanlanır (döşenebilir doku)
    const f=(a,b)=>N(a*scale,b*scale,4);H[j*size+i]=f(u,v)*(1-u)*(1-v)+f(u-1,v)*u*(1-v)+f(u,v-1)*(1-u)*v+f(u-1,v-1)*u*v;}
  for(let j=0;j<size;j++)for(let i=0;i<size;i++){const at=(a,b)=>H[((b+size)%size)*size+(a+size)%size];
    const dx=(at(i+1,j)-at(i-1,j))*6,dy=(at(i,j+1)-at(i,j-1))*6,l=Math.hypot(dx,dy,1),k=(j*size+i)*4;
    img.data[k]=(-dx/l*.5+.5)*255;img.data[k+1]=(-dy/l*.5+.5)*255;img.data[k+2]=(1/l*.5+.5)*255;img.data[k+3]=255;}
  g.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep,rep);return t;
}
function materials(){
  const cells=tex(512,64,(g,w,h)=>{g.fillStyle="#0B1F3D";g.fillRect(0,0,w,h);g.strokeStyle="#6E88A8";g.lineWidth=1.5;
    for(let x=0;x<=w;x+=21){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}
    g.beginPath();g.moveTo(0,h/2);g.lineTo(w,h/2);g.stroke();g.strokeStyle="#C7D1DB";g.lineWidth=3;g.strokeRect(1.5,1.5,w-3,h-3);},[1,1]);
  const ribs=tex(128,32,(g,w,h)=>{g.fillStyle="#E6EAED";g.fillRect(0,0,w,h);for(let x=0;x<w;x+=4){g.fillStyle=(x/4)%2?"#D2D8DD":"#F3F5F7";g.fillRect(x,0,2,h);}g.fillStyle="#7F8A92";g.fillRect(0,h-2,w,2);},[3,1]);
  const foam=tex(64,256,(g,w,h)=>{g.fillStyle="#A9CFEA";g.fillRect(0,0,w,h);for(let i=0;i<260;i++){g.fillStyle=`rgba(255,255,255,${0.4+Math.random()*0.6})`;g.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*7,8+Math.random()*24);}},[1,3]);
  // beton: kalıp izleri (1,5 m'de bir yatay, 6 m'de bir dikey derz) ve hafif leke; UV metre cinsinden (repeat ile ölçeklenir)
  const formwork=tex(256,256,(g,w,h)=>{g.fillStyle="#C9C3B6";g.fillRect(0,0,w,h);for(let i=0;i<900;i++){g.fillStyle=`rgba(${90+Math.random()*60|0},${85+Math.random()*50|0},70,${Math.random()*.06})`;g.fillRect(Math.random()*w,Math.random()*h,4+Math.random()*30,2+Math.random()*30);}
    g.strokeStyle="rgba(90,86,78,.35)";g.lineWidth=1;for(let y=0;y<=h;y+=32){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}for(let x=0;x<=w;x+=128){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}},[1/12,1/6]);
  const roofTex=c=>tex(64,64,(g,w,h)=>{g.fillStyle=c;g.fillRect(0,0,w,h);for(let x=0;x<w;x+=4){g.fillStyle="rgba(0,0,0,.12)";g.fillRect(x,0,1,h);}},[1,1]);
  const std=(o)=>new THREE.MeshStandardMaterial(o);
  return {
    white:std({color:0xF2F4F5,roughness:.38,metalness:.08}), grey:std({color:0x80878D,roughness:.65,metalness:.25}),
    dark:std({color:0x2A3036,roughness:.6,metalness:.35}), yellow:std({color:0xF0BE2C,roughness:.5,metalness:.1}),
    panel:std({map:cells,roughness:.3,metalness:.25}), frame:std({color:0xB8C0C7,roughness:.35,metalness:.75}),
    gravel:std({color:0xB4AB97,roughness:1,name:"gravel"}), concrete:std({color:0xA8A6A0,roughness:.95}), road:std({color:0xC9BFA8,roughness:1}),
    asphalt:std({color:0x4F5459,roughness:.9}), wall:std({color:0xDCD7CB,roughness:.85}),
    roofBlue:std({map:roofTex("#4F6F93"),roughness:.6,metalness:.3}), roofGrey:std({map:roofTex("#8E959B"),roughness:.6,metalness:.4}),
    roofGreen:std({map:roofTex("#5D7A55"),roughness:.6,metalness:.3}), roofRed:std({map:roofTex("#9C4A38"),roughness:.7,metalness:.2}),
    glass:std({color:0x24323D,roughness:.15,metalness:.6}),
    fence:std({color:0xA3ABB0,roughness:.5,metalness:.6,transparent:true,opacity:.45}),
    container:std({map:ribs,roughness:.5,metalness:.15}), dam:std({map:formwork,roughness:.9}),
    chips:std({color:0x8A6A43,roughness:1}), membrane:std({color:0x5E7F3A,roughness:.55,metalness:.05}),
    steel:std({color:0x5B646C,roughness:.45,metalness:.7}), rust:std({color:0x7A5A42,roughness:.8,metalness:.3}),
    pondPad:std({color:0x3D7F8F,roughness:.2}),
    // su: köşe renginde saydamlık (kenarlarda uydu görüntüsüne karışır), gürültüden dalgacık normal haritası
    water:std({color:0x2B6A78,roughness:.08,metalness:.05,transparent:true,opacity:.86,vertexColors:true,normalMap:normalTex(256,6,7,14),normalScale:new THREE.Vector2(.45,.45),depthWrite:false}),
    terrain:std({vertexColors:true,roughness:.95,transparent:true}),
    river:std({color:0x3A7480,roughness:.1,metalness:.05,transparent:true,opacity:.9,vertexColors:true,normalMap:normalTex(256,9,11,20),normalScale:new THREE.Vector2(.6,.6),depthWrite:false}),
    foam:std({map:foam,roughness:.45,transparent:true,opacity:.95}),
    steam:new THREE.MeshBasicMaterial({color:0xFAFBFC,transparent:true,opacity:.93}), smoke:std({color:0x9AA0A6,roughness:1,transparent:true,opacity:.45}),
    glint:new THREE.MeshBasicMaterial({color:0xFFFFFF,transparent:true,opacity:.5,depthWrite:false}),
    beacon:new THREE.MeshBasicMaterial({color:0xFF2236}),
    ledG:new THREE.MeshBasicMaterial({color:0x3CC495}), ledA:new THREE.MeshBasicMaterial({color:0xF2A93B}),
    ledR:new THREE.MeshBasicMaterial({color:0xF06A7D}), ledO:new THREE.MeshBasicMaterial({color:0x39424A}),
    car:[0xF1F3F4,0xB9BEC3,0x2C4A73,0x8E2B2B,0x3A3F44].map(c=>std({color:c,roughness:.3,metalness:.6}))
  };
}

const box=(w,h,d,mat,x=0,y=0,z=0)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;return m;};
const cyl=(r1,r2,h,mat,x=0,y=0,z=0,seg=20)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg),mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;return m;};
// zemin alanı (çakıl, beton, yol): 3D görünümde modelden çıkarılıp araziye serilir (takePads)
const pad=(w,d,mat,y=0.06)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat);m.rotation.x=-Math.PI/2;m.position.y=y;m.receiveShadow=true;m.name="pad";return m;};
const padAt=(w,d,mat,x,z,y=0.06)=>{const p=pad(w,d,mat,y);p.position.x=x;p.position.z=z;return p;};
// tekrarlanan parça: list = [x,y,z, ölçek x,y,z, y ekseni dönüşü]; her örnek 3D görünümde kendi zeminine oturur
function inst(geo,mat,list){
  const im=new THREE.InstancedMesh(geo,mat,Math.max(1,list.length)),m=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();
  list.forEach(([x,y,z,sx=1,sy=1,sz=1,ry=0],i)=>im.setMatrixAt(i,m.compose(new THREE.Vector3(x,y,z),q.setFromEuler(e.set(0,ry,0)),new THREE.Vector3(sx,sy,sz))));
  if(!list.length)im.count=0;im.castShadow=im.receiveShadow=true;return im;
}
// iki nokta arasında silindir (boru, iletken)
function cylBetween(a,b,r,mat,seg=10){
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),L=A.distanceTo(B),m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,L,seg),mat);
  m.position.copy(A).add(B).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.sub(A).normalize());m.castShadow=true;return m;
}

// ---- ortak ayrıntılar ----
// tel çit: 6 m'lik yarı saydam panel ve direkler (yukarıdan gölgesiyle seçilir); dikdörtgen, gate: güney kenarda kapı açıklığı (m)
const FENCE_GEO=()=>new THREE.BoxGeometry(1,2.2,.08),POST_GEO=()=>new THREE.BoxGeometry(.2,2.5,.2);
function fence(g,w,d,cx=0,cz=0,gate=0){
  const segs=[],posts=[],x0=cx-w/2,x1=cx+w/2,z0=cz-d/2,z1=cz+d/2;
  const add=(ax,az,bx,bz)=>{const L=Math.hypot(bx-ax,bz-az),n=Math.max(1,Math.round(L/6)),ry=-Math.atan2(bz-az,bx-ax);
    for(let i=0;i<n;i++){const t=(i+.5)/n,x=ax+(bx-ax)*t,z=az+(bz-az)*t;if(gate&&az===z1&&bz===z1&&Math.abs(x-cx)<gate/2)continue;
      segs.push([x,1.1,z,L/n,1,1,ry]);posts.push([ax+(bx-ax)*i/n,1.25,az+(bz-az)*i/n]);}};
  add(x0,z0,x1,z0);add(x1,z0,x1,z1);add(x1,z1,x0,z1);add(x0,z1,x0,z0);
  g.add(inst(FENCE_GEO(),M.fence,segs),inst(POST_GEO(),M.dark,posts));
  if(gate)g.add(box(gate*.5,1.6,.15,M.yellow,cx-gate*.25,.8,z1+.6));
}
// binek araçlar: list = [x,z,dönüş]; renkler sırayla
function cars(g,list){
  const by=M.car.map(()=>[]),cab=[];
  list.forEach(([x,z,ry=0],i)=>{by[i%M.car.length].push([x,.75,z,1,1,1,ry]);cab.push([x+Math.cos(ry)*.3,1.55,z-Math.sin(ry)*.3,1,1,1,ry]);});
  by.forEach((l,i)=>{if(l.length)g.add(inst(new THREE.BoxGeometry(4.5,1,1.85),M.car[i],l));});
  g.add(inst(new THREE.BoxGeometry(2.4,.7,1.65),M.glass,cab));
}
// bina: duvar, çatı (kenar payıyla), çatıda klima üniteleri
function building(g,w,d,h,x,z,roof=M.roofGrey,units=2){
  g.add(box(w,h,d,M.wall,x,h/2,z),box(w+.6,.45,d+.6,roof,x,h+.2,z));
  for(let i=0;i<units;i++)g.add(box(1.4,.9,1,M.grey,x-w/4+i*w/(2*Math.max(1,units-1)||0),h+.85,z-d/5));
  g.add(box(Math.min(w*.6,6),1.1,.06,M.glass,x,h*.55,z+d/2+.04)); // pencere bandı (güney cephe)
}
// enerji nakil hattı direği (kafes, üç travers); yükseklik h, travers uçlarının yerleri döner
function pylon(g,x,y0,z,h=30){
  const t=new THREE.Group();t.position.set(x,y0,z);
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.5,3.2,h,4,1),M.steel);body.rotation.y=Math.PI/4;body.position.y=h/2;body.castShadow=true;t.add(body);
  const arms=[[h*.95,5],[h*.8,7],[h*.65,6]];
  arms.forEach(([y,w])=>t.add(box(w*2,.5,.6,M.steel,0,y,0)));
  g.add(t);return arms.flatMap(([y,w])=>[[x-w+.3,y0+y-1.2,z],[x+w-.3,y0+y-1.2,z]]).slice(0,3);
}
function wires(g,A,B){for(let i=0;i<Math.min(A.length,B.length);i++)g.add(cylBetween(A[i],B[i],.12,M.dark,5));}

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
    g.add(box(1.2,10,1.2,M.yellow,0,base-6,4)); // tekne yanaşma merdiveni
    const ring=new THREE.Mesh(new THREE.RingGeometry(3.4,9,32),M.foam);ring.rotation.x=-Math.PI/2;ring.position.y=.3;g.add(ring);}
  else g.add(cyl(9.5,10,.6,M.concrete,0,.3,0,28)); // temel
  const tower=new THREE.Mesh(new THREE.CylinderGeometry(1.5,2.7,100,24),M.white);tower.position.y=base+50;tower.castShadow=true;g.add(tower);
  g.add(box(.9,2.2,.15,M.dark,0,base+1.6,2.68)); // kule kapısı
  g.add(box(12,4.2,4.4,M.white,2.8,top+2,0),box(3.2,1.3,3.6,M.white,7.4,top+4.7,0)); // gövde ve soğutucu
  g.add(cyl(.07,.07,2.4,M.grey,6.2,top+5.6,1.2,6),box(.9,.12,.12,M.grey,6.2,top+6.8,1.2)); // anemometre ve rüzgâr gülü
  const rotor=new THREE.Group();rotor.position.set(-3.8,top+2,0);
  const hub=new THREE.Mesh(new THREE.SphereGeometry(2.3,20,14),M.white);hub.scale.set(1.6,1,1);hub.castShadow=true;rotor.add(hub);
  for(let i=0;i<3;i++){const b=new THREE.Mesh(bladeGeometry(),M.white);b.rotation.x=i*2*Math.PI/3;b.castShadow=true;rotor.add(b);}
  const k=parts.rotors.length;rotor.name=`rotor${k}`;g.add(rotor);g.name=`tw${k}`;
  const bc=new THREE.Mesh(new THREE.SphereGeometry(1.1,10,8),M.beacon);bc.position.set(4,top+4.6,0);bc.name=`beacon${k}`;g.add(bc);
  parts.rotors.push({name:rotor.name,a:Math.random()*Math.PI,w:0,f:.92+Math.random()*.16});parts.beacons.push(bc.name);
  return g;
}
// mürettebat transfer teknesi (açık deniz bakımı): çift gövde, kabin, köpük izi
function boat(g,x,z,ry=0){
  const b=new THREE.Group();b.position.set(x,0,z);b.rotation.y=ry;
  b.add(box(22,2.2,2.6,M.white,0,.9,-2.6),box(22,2.2,2.6,M.white,0,.9,2.6),box(16,.6,7.6,M.grey,1,2.1,0),box(8,3,6.4,M.white,2,3.9,0),box(8.1,1,6.5,M.glass,2,4.6,0));
  const w=new THREE.Mesh(new THREE.PlaneGeometry(30,9),M.foam);w.rotation.x=-Math.PI/2;w.position.set(-24,.2,0);b.add(w);g.add(b);
}
// ~5 MW'lık türbin başına bir ünite (rotor ~128 m, göbek ~100 m: 4,5–5 MW sınıfı); türbinler arası rotor çapının ~3,5 katı,
// sıralar arası ~5 katı (yaygın yerleşim aralıkları)
function windFarm(mw,sea,parts,yaw,sc=1){
  const n=Math.min(8,Math.max(1,Math.ceil(mw/5))),g=new THREE.Group(),cols=Math.min(4,n),nr=Math.ceil(n/cols),D=128*sc,sp=3.5*D,rs=5*D,rows=[],kiosk=[];
  for(let i=0;i<n;i++){const t=turbine(sea,parts),c=i%cols,r=Math.floor(i/cols),cnt=Math.min(cols,n-r*cols);t.scale.setScalar(sc);
    t.position.set((c-(cnt-1)/2)*sp+(r%2?sp*.5:0),0,(r-(nr-1)/2)*rs);t.rotation.y=yaw;g.add(t);parts.yaws.push({name:t.name,base:yaw,cur:yaw});
    (rows[r]=rows[r]||[]).push(t.position);
    // vinç platformu (kurulumda ana vincin durduğu sıkıştırılmış alan) ve kule dibindeki trafo köşkü
    if(!sea){g.add(padAt(26,26,M.gravel,t.position.x,t.position.z),padAt(22,40,M.gravel,t.position.x+24,t.position.z+4));kiosk.push([t.position.x+11,1.3,t.position.z+7]);}}
  if(kiosk.length)g.add(inst(new THREE.BoxGeometry(2.6,2.6,3.2),M.wall,kiosk));
  // servis yolları: her sıra boyunca ve sıraları birbirine bağlayan; sahadan dışarı (trafo merkezine) çıkan yol
  const road=(a,b)=>{const r=pad(Math.hypot(b.x-a.x,b.z-a.z)+20,6,M.road,.05);r.position.x=(a.x+b.x)/2;r.position.z=(a.z+b.z)/2;r.rotation.z=-Math.atan2(b.z-a.z,b.x-a.x);g.add(r);};
  if(!sea){rows.forEach(r=>{if(r.length>1)road(r[0],r[r.length-1]);});for(let r=1;r<rows.length;r++)road(rows[r-1][0],rows[r][0]);
    const e=rows[0][rows[0].length-1];road(e,{x:e.x+sp*.55,z:e.z});
    // rüzgâr ölçüm direği (kafes, ~göbek yüksekliğinde) ve kolları
    const mx=rows[0][0].x-sp*.45,mz=rows[0][0].z+40;g.add(new THREE.Mesh(new THREE.CylinderGeometry(.35,.6,100*sc,4),M.steel).translateX(mx).translateY(50*sc).translateZ(mz));
    [.95,.7,.45].forEach(f=>g.add(box(6,.2,.2,M.steel,mx+3,100*sc*f,mz)));g.add(padAt(12,12,M.gravel,mx,mz));}
  if(sea&&n>=3){const p=new THREE.Group();[[-6,-4],[6,-4],[-6,4],[6,4]].forEach(([x,z])=>{const l=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,22,10),M.dark);l.position.set(x,9,z);p.add(l);});
    p.add(box(20,9,14,M.yellow,0,24,0),box(16,4,10,M.grey,0,30.5,0),box(6,.4,6,M.white,-4,32.7,0));p.position.set(0,0,(nr-1)/2*rs+sp*.6);g.add(p);}
  if(sea)boat(g,rows[0][0].x+30,rows[0][0].z+22,.3);
  return g;
}

// ---- GES: ekvatora bakan eğik panel sıraları, ayaklar, inverter/trafo istasyonları, çevre yolu, çit, işletme binası ----
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
  // inverter/trafo istasyonları (~10 MW'a bir): beton taban, inverter kabini, yağlı trafo
  const nInv=Math.max(1,Math.round(mw/10));
  for(let b=0;b<nInv;b++){const z=(b-(nInv-1)/2)*(D/nInv);g.add(padAt(6,14,M.concrete,0,z+2,.1),box(3,2.6,6,M.grey,0,1.3,z),box(2.4,2.3,2.4,M.dark,0,1.15,z+4.8),box(2.8,.2,2.8,M.grey,0,2.4,z+4.8));
    parts.inv.push(ledSet(g,new THREE.BoxGeometry(.1,.5,.5),[1.56,2,z],{run:M.ledG,curt:M.ledR,off:M.ledO},`inv${b}`));}
  // çevre yolu, işletme alanı (güneyde: bina, otopark, su tankı, yedek parça konteyneri, meteoroloji direği), çit ve kapı
  const zs=D/2+6,ex=L/2+7,oz=zs+22;
  g.add(padAt(L+24,5,M.road,0,-(zs+2.5),.05),padAt(L+24,5,M.road,0,zs+2.5,.05),padAt(5,D+12,M.road,-(ex+2.5),0,.05),padAt(5,D+12,M.road,ex+2.5,0,.05),
    padAt(7,40,M.road,0,zs+20,.08),padAt(22,13,M.asphalt,-L/2+38,oz,.09),padAt(40,22,M.gravel,-L/2+20,oz,.07));
  building(g,16,9,4.2,-L/2+14,oz,M.roofBlue,2);
  cars(g,[[-L/2+31,oz-3,Math.PI/2],[-L/2+35,oz-3,Math.PI/2],[-L/2+39,oz+3,Math.PI/2]]);
  g.add(cyl(2.4,2.4,5,M.white,-L/2+54,2.5,oz),box(12.2,2.9,2.45,M.container,-L/2+68,1.45,oz));
  g.add(cyl(.08,.08,6,M.grey,L/2-8,3,oz,6),box(.8,.5,.8,M.white,L/2-8,6,oz));
  fence(g,L+30,D+12+60,0,(zs+44-(zs-6+12))/2,9);
  // köşelerde güvenlik kamerası direkleri
  const fz0=-(D/2+12),fz1=zs+44;[[-(L/2+14),fz0],[L/2+14,fz0],[-(L/2+14),fz1],[L/2+14,fz1]].forEach(([x,z])=>g.add(cyl(.12,.15,7,M.grey,x,3.5,z,6),box(.5,.35,.8,M.white,x,7,z)));
  return g;
}

// ---- BESS: 40 ft konteyner sıraları, soğutma üniteleri, LED şeritleri, PCS ve trafo skidleri, yangın suyu tankı ----
function bess(mw,parts){
  const g=new THREE.Group(),n=Math.min(24,Math.max(3,Math.ceil(mw/5)*3)),cols=Math.min(6,n),rows=Math.ceil(n/cols),W=cols*15,Dd=rows*6;
  for(let i=0;i<n;i++){const c=i%cols,r=Math.floor(i/cols),x=(c-(cols-1)/2)*15,z=(r-(rows-1)/2)*6;
    g.add(box(12.2,2.9,2.45,M.container,x,1.75,z),box(1.1,2.3,2.2,M.dark,x+6.7,1.45,z));
    const fan=new THREE.Group();fan.position.set(x+6.7,2.68,z);fan.add(box(1.9,.08,.3,M.frame),box(.3,.08,1.9,M.frame));fan.name=`fan${parts.fans.length}`;g.add(fan);parts.fans.push({name:fan.name,a:Math.random()*3});
    parts.leds.push(ledSet(g,new THREE.BoxGeometry(10,.22,.05),[x,2.6,z+1.25],{chg:M.ledG,dis:M.ledA,off:M.ledO},`led${i}`));}
  g.add(pad(W+6,Dd+10,M.concrete,.07),box(4,3,3,M.grey,-W/2-4,1.5,0));
  // her sıranın ucunda güç dönüştürücü (PCS) ve orta gerilim trafosu
  for(let r=0;r<rows;r++){const z=(r-(rows-1)/2)*6;g.add(box(5,2.6,2.3,M.wall,W/2+5,1.3,z),box(2.2,2.3,2.2,M.dark,W/2+9.5,1.15,z));}
  g.add(padAt(W+40,Dd+40,M.gravel,4,4,.05));
  building(g,12,7,3.8,-W/2-12,Dd/2+12,M.roofBlue,1);cars(g,[[-W/2+4,Dd/2+14,0],[-W/2+10,Dd/2+14,0]]);
  g.add(cyl(3.6,3.6,6,M.white,W/2+12,3,Dd/2+12,24),cyl(3.7,3.7,.3,M.grey,W/2+12,6.1,Dd/2+12,24));
  fence(g,W+44,Dd+44,4,4,8);
  return g;
}

// ---- HES: vadiyi kapatan beton ağırlık barajı, dolu baraj gölü, dolusavak, cebri borular, santral binası, şalt sahası ----
// Vadi bir arazi ağıyla çizilir: tohumlu gürültüyle kıvrılan vadi ekseni, baraj yerinde dar boğaz, membada genişleyen
// havza ve yan dereler. Göl düz bir su düzlemidir; araziyle kesiştiği yerde kendiliğinden doğal bir kıyı çizgisi oluşur.
// Kıyıda su seviyesi değişiminin bıraktığı açık renkli şerit, su altında derinleştikçe koyulaşan taban, mansapta kendi
// yatağında akan nehir. Arazi kenarlarda saydamlaşarak uydu görüntüsüne karışır.
const HES_H=42,HES_W=HES_H-3; // baraj yüksekliği ve göl seviyesi (m)
function valleyOf(seed){
  const N=noise2(seed),N2=noise2(seed+101),ph=(seed%97)/97*6.28,H=HES_H;
  const ax=z=>z<0?26*Math.sin(z/95+ph)*ss(-10,-140,z):14*Math.sin(z/70+ph)*ss(30,120,z);
  const wd=z=>z<-25?1+1.5*ss(-25,-150,z):z>35?1+.35*ss(35,110,z):1;
  const inlets=[[-125,1,.45,26],[-215,-1,.6,30],[-60,-1,.3,18]];
  const rect=(x,z,x0,x1,z0,z1,e)=>{const dx=Math.max(x0-x,0,x-x1),dz=Math.max(z0-z,0,z-z1);return 1-ss(0,e,Math.hypot(dx,dz));};
  const h=(x,z)=>{
    const a=ax(z),d=Math.abs(x-a),u=d/wd(z);
    let y=-2+(H+16)*ss(10,72,u)+Math.max(0,u-72)*.32+(N(x/70,z/70)-.5)*2*(3+11*ss(20,90,u))+(N2(x/18,z/18)-.5)*2.2*ss(15,40,u);
    for(const [zi,s,k,A] of inlets){const side=s*(x-a);if(side<=0||z>-20)continue;const dl=(z-zi)-k*side;y-=A*Math.exp(-dl*dl/(2*20*20))*ss(0,30,side)*(1-ss(130,210,side));}
    if(Math.abs(z)<16&&d>56)y=Math.max(y,H+3+(d-56)*.2); // barajın oturduğu yamaçlar
    // santral platformu, şalt sahası ve kuyruk suyu kanalı (yamaca oyulur)
    y+=(1-y)*rect(x,z,16,52,30,64,7);y+=(1.2-y)*rect(x,z,22,56,72,102,7);
    const tr=rect(x,z,6,34,52,60,4);y+=(-1.5-y)*tr;
    return y;};
  return {h,ax};
}
function hydro(parts,seed){
  const g=new THREE.Group(),C=120,H=HES_H,V=valleyOf(seed);
  // arazi ağı: ~4 m çözünürlük, köşe renkleri (bitki örtüsü, kaya, su seviyesi şeridi, göl tabanı) ve kenar saydamlığı
  const X0=-230,X1=230,Z0=-330,Z1=270,nx=115,nz=150,geo=new THREE.PlaneGeometry(X1-X0,Z1-Z0,nx,nz);geo.rotateX(-Math.PI/2);geo.translate((X0+X1)/2,0,(Z0+Z1)/2);
  const pos=geo.attributes.position,col=new Float32Array(pos.count*4),N=noise2(seed+7),c=new THREE.Color(),c2=new THREE.Color();
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),y=V.h(x,z);pos.setY(i,y);}
  geo.computeVertexNormals();const nrm=geo.attributes.normal;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),y=pos.getY(i),steep=1-nrm.getY(i),n=N(x/40,z/40),n2=N(x/9,z/9);
    if(z<0&&y<HES_W-.3)c.set(0x8A7E5C).lerp(c2.set(0x3F3D33),Math.min(1,(HES_W-y)/22)); // göl tabanı: derinleştikçe koyu
    else if(z<0&&y<HES_W+3)c.set(0xC2B596).lerp(c2.set(0xA39678),n2); // su seviyesi değişiminin bıraktığı açık şerit
    else if(z>=0&&y<.6)c.set(0x8F8877).lerp(c2.set(0x6F6A5C),n2); // nehir yatağı çakılı
    else{c.set(0x3E5A2B).lerp(c2.set(0x6E8048),ss(.35,.7,n)).lerp(c2.set(0x2F4524),ss(.55,.8,n2)*.5); // orman ve çayır
      if(steep>.32)c.lerp(c2.set(0x837C70),ss(.32,.55,steep));} // sarp yerde kaya
    const e=Math.min(x-X0,X1-x,z-Z0,Z1-z);col.set([c.r,c.g,c.b,ss(0,45,e)],i*4);}
  geo.setAttribute("color",new THREE.BufferAttribute(col,4));
  const terr=new THREE.Mesh(geo,M.terrain);terr.receiveShadow=terr.castShadow=true;terr.name="valley";g.add(terr);
  // su düzlemleri: kenarlarda saydam (köşe rengi alfa); göl barajın memba yüzüne kadar, nehir mansapta
  const water=(z0,z1,y,mat,seg)=>{const w=new THREE.PlaneGeometry(X1-X0,z1-z0,seg,Math.round(seg*(z1-z0)/(X1-X0)));w.rotateX(-Math.PI/2);w.translate(0,y,(z0+z1)/2);
    const p=w.attributes.position,a=new Float32Array(p.count*4);for(let i=0;i<p.count;i++){const e=Math.min(p.getX(i)-X0,X1-p.getX(i),p.getZ(i)-Z0,Z1-p.getZ(i));a.set([1,1,1,ss(0,45,e)],i*4);}
    w.setAttribute("color",new THREE.BufferAttribute(a,4));const m=new THREE.Mesh(w,mat);m.receiveShadow=true;return m;};
  const lake=water(Z0,-3.6,HES_W,M.water,40);lake.name="lake";g.add(lake);
  g.add(water(24,Z1,.15,M.river,40));
  // baraj gövdesi: memba yüzü dik, mansap yüzü eğik (ağırlık barajı profili), kalıp izli beton
  const prof=new THREE.Shape();prof.moveTo(-4,0);prof.lineTo(-4,H);prof.lineTo(3,H);prof.lineTo(30,0);prof.closePath();
  const dg=new THREE.ExtrudeGeometry(prof,{depth:C,bevelEnabled:false});dg.translate(0,-2,-C/2);dg.rotateY(-Math.PI/2);
  const dam=new THREE.Mesh(dg,M.dam);dam.castShadow=dam.receiveShadow=true;g.add(dam);
  // kret yolu ve korkuluklar; dolusavak ayakları, kapaklar ve kapak vinci köprüsü
  g.add(box(C,.5,6.4,M.asphalt,0,H-1.75,-.5),box(C,1.1,.35,M.wall,0,H-.95,-3.6),box(C,1.1,.35,M.wall,0,H-.95,2.6));
  [-9,-3,3,9].forEach(x=>g.add(box(1.6,6,8,M.dam,x,H+1,-.5)));[-6,0,6].forEach(x=>g.add(box(4.4,3.2,.5,M.steel,x,H-.6,-3.7)));
  g.add(box(20,1,2.6,M.yellow,0,H+4.2,-2.4));
  // dolusavak köpüğü (çalışırken akar) ve dipte enerji kırıcı havuz
  const len=Math.hypot(27,H),chute=new THREE.Mesh(new THREE.PlaneGeometry(16,len),M.foam.clone());
  chute.material.map=M.foam.map.clone();chute.material.map.needsUpdate=true;
  chute.rotation.x=-(Math.PI/2-Math.atan2(H,27));chute.position.set(0,(H-2)/2+.3,16.5);chute.name="chute";g.add(chute);
  g.add(padAt(22,14,M.concrete,0,36,-.4));
  parts.flows.push("chute");g.userData.rigid=true; // vadi modeli tek parça: araziye bir bütün olarak oturur
  // su alma yapısı (göl içinde kule ve krete köprü), mansap yüzünde iki cebri boru, santral binası
  g.add(box(9,H+6,9,M.dam,26,(H+6)/2-2,-15),box(10,1,10,M.roofGrey,26,H+4.5,-15),box(3,1,10,M.dam,26,H-1.5,-8.5));
  [22,28].forEach(x=>{g.add(cylBetween([x,H-16,13],[x+4,6,37],1.5,M.rust,16));});
  const pz=44;g.add(box(28,12,15,M.dam,34,1+6,pz),box(28.6,.8,15.6,M.roofGrey,34,13.4,pz),box(26,1.4,.1,M.glass,34,9,pz+7.55),box(6,7,.3,M.steel,26,4.5,pz+7.6));
  g.add(padAt(36,34,M.concrete,34,47,1.05));
  // köpüklü kuyruk suyu (santral çıkışı), sıçrama (çalışırken)
  const tw=new THREE.Mesh(new THREE.PlaneGeometry(26,7),M.foam);tw.rotation.x=-Math.PI/2;tw.position.set(20,.25,56);g.add(tw);
  const sp=new THREE.Group();sp.name="spray";
  [[-5,1,34,3.4],[0,2,35,4.2],[5,1,34,3.4],[-2.5,4,37,3],[2.5,4,37,3]].forEach(([x,y,z,r])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),M.steam);m.position.set(x,y,z);sp.add(m);});
  g.add(sp);parts.drifts.push({name:"spray",ph:0,amp:1.2,sp:3.2,k:"hes"});
  // şalt sahası: iki güç trafosu, portal direkler, baralar; çit; çıkan enerji nakil hattı
  const sz=87;g.add(padAt(34,30,M.gravel,39,sz,1.25),box(5,4.2,3.6,M.dark,32,3.3,sz),box(5,4.2,3.6,M.dark,42,3.3,sz),cyl(.25,.25,3,M.grey,32,6.8,sz,8),cyl(.25,.25,3,M.grey,42,6.8,sz,8));
  [30,48].forEach(x=>{g.add(box(.6,14,.6,M.steel,x,8.2,sz-8),box(.6,14,.6,M.steel,x,8.2,sz+8),box(.5,.5,16.6,M.steel,x,15,sz));});
  const top=[[30,14.4,sz-5],[30,14.4,sz],[30,14.4,sz+5]];fence(g,38,34,39,sz);
  building(g,10,6,4,52,sz-24,M.roofRed,1);
  const y1=V.h(40,150),y2=V.h(40,225),t1=pylon(g,40,y1,150,32),t2=pylon(g,40,y2,225,32);
  wires(g,top.map(([x,y,z],i)=>[48,y,z]),t1);wires(g,t1,t2);
  return g;
}

// ---- JES: kuyu başları, buhar boruları, separatörler, santral binası, soğutma kuleleri, hava soğutmalı kondenser, reenjeksiyon havuzu ----
function geothermal(mw,parts){
  const g=new THREE.Group(),nw=Math.min(6,1+Math.ceil(mw/5)),nt=mw>10?3:2;
  g.add(pad(150,120,M.gravel,.05),box(34,13,18,M.dam,0,6.5,0),box(34.6,1.2,18.6,M.roofGrey,0,13.6,0),box(30,1.4,.1,M.glass,0,9,9.05));
  // soğutma kuleleri: hafif daralan beton gövde; üstte buhar bulutu (çalışırken görünür)
  for(let i=0;i<nt;i++){const x=-26+i*20,z=-34,t=new THREE.Mesh(new THREE.CylinderGeometry(6.2,8,20,28,1,true),M.concrete);t.position.set(x,10,z);t.castShadow=true;g.add(t);
    const st=new THREE.Group();st.name=`steam${parts.steams.length}`;
    [[0,25,0,6],[1.5,31,1,7.5],[-1,37,-1,8.5],[2,43,.5,9]].forEach(([dx,y,dz,r])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),M.steam);m.position.set(x+dx,y,z+dz);st.add(m);});
    g.add(st);parts.steams.push(st.name);parts.drifts.push({name:st.name,ph:i*1.7,amp:1.8,sp:.6});}
  // hava soğutmalı kondenser (ikili çevrim santrallerinde yaygın): ayaklar üstünde güverte ve 5×3 fan
  const ax=48,az=-14,legs=[],fans=[];
  for(let i=0;i<4;i++)for(let j=0;j<3;j++)legs.push([ax-18+i*12,6,az-9+j*9]);
  for(let i=0;i<5;i++)for(let j=0;j<3;j++)fans.push([ax-16+i*8,12.9,az-8+j*8]);
  g.add(inst(new THREE.CylinderGeometry(.45,.45,12,8),M.steel,legs),box(42,1.2,26,M.grey,ax,12.4,az),inst(new THREE.CylinderGeometry(3.4,3.4,.6,20),M.dark,fans),inst(new THREE.CylinderGeometry(.6,.6,.8,8),M.white,fans.map(([x,y,z])=>[x,y+.3,z])));
  // iki yatay separatör (buhar ile tuzlu suyu ayırır) ve ayakları
  [[-46,10],[-46,18]].forEach(([x,z])=>{const s=new THREE.Mesh(new THREE.CylinderGeometry(1.9,1.9,13,18),M.white);s.rotation.z=Math.PI/2;s.position.set(x,3.4,z);s.castShadow=true;g.add(s,box(.8,2,2.6,M.steel,x-4,1,z),box(.8,2,2.6,M.steel,x+4,1,z));});
  // kuyu başları (vana ağacı) ve santrale giden yalıtımlı borular (ayaklar üstünde)
  for(let i=0;i<nw;i++){const a=(i/nw)*Math.PI*1.2+0.3,x=Math.cos(a)*62,z=24+Math.sin(a)*32;
    g.add(pad(10,10,M.concrete,.07),box(1.6,3.2,1.6,M.yellow,x,1.6,z),box(3.2,.8,.8,M.grey,x,2.8,z));
    const len=Math.hypot(x,z-9),pipe=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,len,10),M.frame);
    pipe.rotation.z=Math.PI/2;pipe.rotation.y=-Math.atan2(z-9,x);pipe.position.set(x/2,2.6,(z+9)/2);pipe.castShadow=true;g.add(pipe);
    for(let k=1;k<Math.floor(len/9);k++){const f=k*9/len;g.add(box(.4,2.4,.4,M.dark,x*(1-f),1.2,9+(z-9)*(1-f)));}}
  g.children.filter(c=>c.name==="pad"&&c!==g.children[0]).forEach((p,i)=>{const a=(i/nw)*Math.PI*1.2+0.3;p.position.x=Math.cos(a)*62;p.position.z=24+Math.sin(a)*32;});
  // reenjeksiyon havuzu, kontrol binası, otopark, çit
  g.add(padAt(30,18,M.pondPad,-52,-40,.09),padAt(34,22,M.concrete,-52,-40,.07));
  building(g,14,8,4,-20,46,M.roofBlue,2);g.add(padAt(18,10,M.asphalt,0,46,.09));cars(g,[[-4,46,0],[0,46,0],[4,46,0]]);
  fence(g,160,128,0,0,10);
  return g;
}

// ---- BES: kazan ve türbin binası, baca (çalışırken duman), yakıt deposu, talaş yığınları, konveyör, biyogaz kubbeleri,
// kül silosu, soğutma hücreleri, gaz meşalesi, kantar ve yakıt kamyonları ----
function biomass(mw,parts){
  const g=new THREE.Group(),nd=mw>10?3:2;
  g.add(pad(130,90,M.concrete,.05),box(22,26,18,M.dam,0,13,0),box(22.6,1,18.6,M.roofGrey,0,26.5,0),box(30,12,16,M.wall,26,6,0),box(30.6,.6,16.6,M.roofGrey,26,12.3,0));
  const ch=new THREE.Mesh(new THREE.CylinderGeometry(1.4,2,48,16),M.white);ch.position.set(-14,24,-6);ch.castShadow=true;g.add(ch);
  g.add(box(3.4,1.2,3.4,M.beacon,-14,46.5,-6),cyl(2.1,2.1,1.2,M.beacon,-14,40,-6,16));
  const sm=new THREE.Group();sm.name=`smoke${parts.smokes.length}`;
  [[0,52,0,3],[1.5,57,.5,4],[3.5,62,1,5],[6,67,1.5,6]].forEach(([dx,y,dz,r])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),M.smoke);m.position.set(-14+dx,y,-6+dz);sm.add(m);});
  g.add(sm);parts.smokes.push(sm.name);parts.drifts.push({name:sm.name,ph:0,amp:1.4,sp:.5});
  // yakıt sahası: kapalı yakıt deposu, talaş yığınları ve kazana çıkan eğik konveyör
  g.add(box(34,10,18,M.wall,-40,5,-30),box(34.6,.6,18.6,M.roofGreen,-40,10.3,-30));
  [[-40,22,9],[-55,8,11],[-38,-8,8]].forEach(([x,z,r])=>{const c=new THREE.Mesh(new THREE.ConeGeometry(r,r*0.8,20),M.chips);c.position.set(x,r*0.4,z);c.castShadow=c.receiveShadow=true;g.add(c);});
  const cv=box(34,1,2.4,M.frame,-24,10,10);cv.rotation.z=0.5;g.add(cv);
  const ch2=new THREE.Group();ch2.position.set(-24,10.9,10);ch2.rotation.z=0.5;ch2.name=`chips${parts.belts.length}`;
  for(let k=-2;k<=2;k++)ch2.add(box(1.6,.8,1.6,M.chips,k*6.8,0,0));g.add(ch2);parts.belts.push(ch2.name);
  // biyogaz çürütücüler: beton silindir üstünde gaz kubbesi; yanında gaz meşalesi
  for(let i=0;i<nd;i++){const x=10+i*20,z=32;
    const tk=new THREE.Mesh(new THREE.CylinderGeometry(8,8,6,28),M.concrete);tk.position.set(x,3,z);tk.castShadow=true;g.add(tk);
    const dm=new THREE.Mesh(new THREE.SphereGeometry(8,28,14,0,Math.PI*2,0,Math.PI/2),M.membrane);dm.position.set(x,6,z);dm.castShadow=true;g.add(dm);}
  g.add(cyl(.35,.35,11,M.steel,60,5.5,40,8),cyl(.7,.7,1.2,M.dark,60,11.5,40,10));
  // kül silosu, soğutma hücreleri (üç fan), kantar ve kulübesi, yakıt kamyonları, idari bina ve otopark
  g.add(cyl(3,3,13,M.white,48,8,-30),new THREE.Mesh(new THREE.ConeGeometry(3,3,20),M.white).translateX(48).translateY(16).translateZ(-30),box(20,7,8,M.wall,22,3.5,-32));
  g.add(inst(new THREE.CylinderGeometry(2.6,2.6,.5,18),M.dark,[[16,7.3,-32],[22,7.3,-32],[28,7.3,-32]]));
  g.add(padAt(150,7,M.asphalt,0,58,.05),padAt(18,4,M.concrete,44,51,.09),box(3,2.6,3,M.wall,56,1.3,51));
  [[-22,58],[14,58]].forEach(([x,z])=>g.add(box(3,3,2.5,M.white,x+6.5,1.9,z),box(10,3.4,2.5,M.roofGreen,x-.5,2.1,z)));
  building(g,16,8,4,-50,40,M.roofBlue,2);cars(g,[[-34,36,0],[-30,36,0]]);
  fence(g,140,100,0,0,9);
  return g;
}

// ---- Deniz: yüzer gelgit türbini platformları (dönen çift rotor), dalga şamandıraları (inip kalkar), işaret şamandıraları ----
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
    // bağlama zincirleri (dört köşeden)
    [[-20,-9],[20,-9],[-20,9],[20,9]].forEach(([a,b])=>pl.add(cylBetween([a*.9,0,b*.6],[a*1.5,-6,b*1.8],.15,M.dark,5)));
    g.add(pl);}
  // dalga dönüştürücü şamandıralar
  for(let i=0;i<nb;i++){const b=new THREE.Group(),x=(i-(nb-1)/2)*28,z=48+(i%2)*14;b.position.set(x,0,z);b.name=`buoy${parts.buoys.length}`;
    const c=new THREE.Mesh(new THREE.CylinderGeometry(3,3.4,3,20),M.yellow);c.position.y=1;c.castShadow=true;b.add(c);
    b.add(box(1.4,2.4,1.4,M.dark,0,3.6,0));const top=new THREE.Mesh(new THREE.SphereGeometry(.6,8,6),M.beacon);top.position.y=5.1;b.add(top);
    g.add(b);parts.buoys.push({name:b.name,ph:i*1.3});}
  // saha sınırını gösteren sarı işaret şamandıraları ve bakım teknesi
  const ex=np*35+30;[[-ex,-30],[ex,-30],[-ex,80],[ex,80]].forEach(([x,z])=>g.add(new THREE.Mesh(new THREE.ConeGeometry(1.2,4,8),M.yellow).translateX(x).translateY(2).translateZ(z)));
  boat(g,-ex+30,96,.2);
  return g;
}

// ---- trafo merkezi: çit içinde iki güç trafosu (radyatörlü), portal direkler, baralar, kontrol binası ve çıkan hat ----
function substation(g0){
  const g=g0||new THREE.Group();g.add(pad(32,24,M.gravel,.05),box(5,4,3.5,M.dark,-6,2,0),box(5,4,3.5,M.dark,4,2,0));
  [-6,4].forEach(x=>{for(let k=-1;k<=1;k++)g.add(box(.25,3,1.2,M.grey,x+3,1.8,k*1.3));g.add(cyl(.22,.22,2.6,M.white,x-1.5,5.2,-1,8),cyl(.22,.22,2.6,M.white,x+1.5,5.2,-1,8));});
  [-12,12].forEach(x=>{g.add(box(.6,14,.6,M.frame,x,7,-6),box(.6,14,.6,M.frame,x,7,6),box(.5,.5,12.6,M.frame,x,13.6,0));});
  [-4,0,4].forEach(z=>g.add(box(24,.25,.25,M.frame,0,12.8,z)));
  building(g,10,5,3.6,0,-19,M.roofGrey,1);fence(g,36,44,0,-6,6);
  // çıkan enerji nakil hattı: güneye iki direk
  const t1=pylon(g,0,0,52,30),t2=pylon(g,0,0,128,30);wires(g,[[12,13.4,-4],[12,13.4,0],[12,13.4,4]],t1);wires(g,t1,t2);
  return g;
}

function hashYaw(id){let h=0;for(const c of id)h=(h*31+c.charCodeAt(0))|0;return ((Math.abs(h)%50)-25)*RAD;}
const seedOf=id=>{let h=7;for(const c of String(id))h=(h*131+c.charCodeAt(0))|0;return Math.abs(h)%100000;};

// türbin boyu ekipman kademesine göre (rotor çapı ve göbek yüksekliği birlikte ölçeklenir)
const TURBINE_SCALE={eco:0.82,std:1,pre:1.14};
// face: türbinler güneye (±25°) döner; tepeden bakan harita görüntüsünde rotor diski çizgi yerine elips görünür
export function buildSite(id,o,ps,face=false){
  if(!M)M=materials();
  const by={},top={};ps.forEach(p=>{by[p.k]=(by[p.k]||0)+p.mw;const q=tierOf(p);if(!top[p.k]||TIER_ORDER.indexOf(q)>TIER_ORDER.indexOf(top[p.k]))top[p.k]=q;});
  const root=new THREE.Scene(),parts={rotors:[],beacons:[],flows:[],leds:[],inv:[],yaws:[],steams:[],smokes:[],tides:[],buoys:[],glints:[],fans:[],drifts:[],belts:[]},groups=[];
  // userData.k: rüzgâr grubunun teknolojisi (haritadaki dönen pervaneler hızını RES ve offshore için ayrı alır)
  const yaw=hashYaw(id)-(face?Math.PI/2:0);
  if(by.res){const g=windFarm(by.res,false,parts,yaw,TURBINE_SCALE[top.res]);g.userData.k="res";groups.push(g);}
  if(by.off){const g=windFarm(by.off,true,parts,yaw,TURBINE_SCALE[top.off]);g.userData.k="off";groups.push(g);}
  if(by.ges)groups.push(solarFarm(by.ges,o.lat,parts,top.ges));
  if(by.hes)groups.push(hydro(parts,seedOf(id)));
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
