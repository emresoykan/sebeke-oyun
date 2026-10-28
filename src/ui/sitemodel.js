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
  // PV modülü: 8 modül × 2 sıra (dikey yerleşim); çerçeve, hücreler, hücre araları ve baralar. Ekonomi: polikristal
  // (açık, benekli mavi), standart: monokristal PERC (koyu mavi), premium: TOPCon tam siyah. 1 doku döşemesi ≈ 9,1 × 4,6 m
  const moduleTex=kind=>{const C={eco:["#2C5597","#3D68AE","#6C88B8"],std:["#1B3868","#22437A","#3E5C8A"],pre:["#0E141C","#141B25","#2A3340"]}[kind];
    return tex(512,160,(g)=>{for(let m=0;m<8;m++)for(let r=0;r<2;r++){const x0=m*64,y0=r*80;
      g.fillStyle="#C7CDD2";g.fillRect(x0,y0,64,80);g.fillStyle=C[2];g.fillRect(x0+2,y0+2,60,76);
      for(let i=0;i<6;i++)for(let j=0;j<10;j++){g.fillStyle=kind==="eco"?`hsl(${214+Math.random()*12|0},${46+Math.random()*16|0}%,${30+Math.random()*12|0}%)`:C[(i*3+j)%9?0:1];
        g.fillRect(x0+2.6+i*10,y0+2.6+j*7.6,8.8,6.4);}
      if(kind!=="eco"){g.fillStyle="rgba(205,215,230,.16)";for(let b=1;b<5;b++)g.fillRect(x0+2+b*12,y0+2,1,76);}}},[1,1]);};
  const noiseTex=(cols,n,rep,sz=[2,6])=>tex(128,128,(g,w,h)=>{g.fillStyle=cols[0];g.fillRect(0,0,w,h);for(let i=0;i<n;i++){g.fillStyle=cols[1+(i%(cols.length-1))];g.globalAlpha=.25+Math.random()*.5;
    const r=sz[0]+Math.random()*(sz[1]-sz[0]);g.fillRect(Math.random()*w,Math.random()*h,r,r*(.6+Math.random()*.8));}g.globalAlpha=1;},rep);
  const clad=tex(128,64,(g,w,h)=>{g.fillStyle="#D9DCDD";g.fillRect(0,0,w,h);for(let x=0;x<w;x+=6){g.fillStyle="rgba(80,90,96,.16)";g.fillRect(x,0,2,h);}g.fillStyle="rgba(60,70,76,.22)";g.fillRect(0,h-3,w,3);},[1,1]);
  const tarp=tex(128,128,(g,w,h)=>{g.fillStyle="#5F7360";g.fillRect(0,0,w,h);for(let i=0;i<30;i++){g.fillStyle=`rgba(30,40,32,${.15+Math.random()*.2})`;g.fillRect(0,Math.random()*h,w,1+Math.random()*2);}
    for(let i=0;i<70;i++){g.fillStyle="#2B2F2D";g.beginPath();g.arc(Math.random()*w,Math.random()*h,2.2,0,6.3);g.fill();}},[2,1]);
  const std=(o)=>new THREE.MeshStandardMaterial(o);
  // yüzer GES modülleri: GES dokusunun ayrı kopyası (12 m'lik şamandıra sırasına göre döşenir)
  const fpvMat=(kind,r,mt)=>{const m=std({map:moduleTex(kind),roughness:r,metalness:mt});m.map.repeat.set(12/9.1,1);return m;};
  return {
    fpv:{eco:fpvMat("eco",.28,.15),std:fpvMat("std",.22,.2),pre:fpvMat("pre",.2,.2)},
    float:std({color:0xE3E6E1,roughness:.75}), lining:std({color:0x33383D,roughness:.8}),
    mirror:std({color:0xA8BCCB,roughness:.06,metalness:.85}), embank:std({color:0x7B8566,roughness:1}), glow:new THREE.MeshBasicMaterial({color:0xFFE6A0}),
    pv:{eco:std({map:moduleTex("eco"),roughness:.28,metalness:.15}),std:std({map:moduleTex("std"),roughness:.22,metalness:.2}),pre:std({map:moduleTex("pre"),roughness:.2,metalness:.2})},
    clad:std({map:clad,roughness:.6,metalness:.3}), tarp:std({map:tarp,roughness:.55,metalness:.05}),
    silage:std({map:noiseTex(["#B4A55A","#8E8240","#CDBE73","#6E6A3A"],900,[3,3],[1,4]),roughness:1}),
    pile:std({map:noiseTex(["#7B5A37","#5E4128","#9A7346","#4A3420"],1100,[4,4],[1,3]),roughness:1}),
    grass:std({color:0x5E8442,roughness:1,name:"grass"}), domeW:std({color:0xE9ECEE,roughness:.5,metalness:.05}), domeK:std({color:0x2D3236,roughness:.5,metalness:.1}),
    tankW:std({color:0xC8CCCB,roughness:.7,metalness:.1}),
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
    seaFoam:std({map:foam,roughness:.45,transparent:true,opacity:.4,depthWrite:false}),
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
// pts: kapalı çokgenin köşeleri [[x,z],…]; gate: kapı açıklığı (m), gateAt: kapının yakınında olacağı nokta [x,z]
function fencePoly(g,pts,gate=0,gateAt=null){
  const segs=[],posts=[];let gx=null;
  if(gate&&gateAt){let best=Infinity;pts.forEach(([x,z])=>{const d=Math.hypot(x-gateAt[0],z-gateAt[1]);if(d<best){best=d;gx=[x,z];}});}
  for(let k=0;k<pts.length;k++){const [ax,az]=pts[k],[bx,bz]=pts[(k+1)%pts.length],L=Math.hypot(bx-ax,bz-az);if(L<.5)continue;
    const n=Math.max(1,Math.round(L/6)),ry=-Math.atan2(bz-az,bx-ax);
    for(let i=0;i<n;i++){const t=(i+.5)/n,x=ax+(bx-ax)*t,z=az+(bz-az)*t;if(gx&&Math.hypot(x-gx[0],z-gx[1])<gate/2)continue;
      segs.push([x,1.1,z,L/n,1,1,ry]);posts.push([ax+(bx-ax)*i/n,1.25,az+(bz-az)*i/n]);}}
  g.add(inst(FENCE_GEO(),M.fence,segs),inst(POST_GEO(),M.dark,posts));
  if(gx)g.add(box(gate*.5,1.6,.15,M.yellow,gx[0]-gate*.25,.8,gx[1]+.4));
}
function fence(g,w,d,cx=0,cz=0,gate=0){
  const x0=cx-w/2,x1=cx+w/2,z0=cz-d/2,z1=cz+d/2;fencePoly(g,[[x0,z0],[x1,z0],[x1,z1],[x0,z1]],gate,gate?[cx,z1]:null);
}
// çokgen boyunca yol: her kenar bir döndürülmüş zemin şeridi (3D görünümde araziye serilir)
function roadPoly(g,pts,w,mat,y=.05){
  for(let k=0;k<pts.length;k++){const [ax,az]=pts[k],[bx,bz]=pts[(k+1)%pts.length],L=Math.hypot(bx-ax,bz-az);if(L<.5)continue;
    const r=pad(L+w*.9,w,mat,y);r.position.x=(ax+bx)/2;r.position.z=(az+bz)/2;r.rotation.z=-Math.atan2(bz-az,bx-ax);g.add(r);}
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
    const ring=new THREE.Mesh(new THREE.RingGeometry(3.4,9,32),M.seaFoam);ring.rotation.x=-Math.PI/2;ring.position.y=.3;g.add(ring);}
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
  const w=new THREE.Mesh(new THREE.PlaneGeometry(30,9),M.seaFoam);w.rotation.x=-Math.PI/2;w.position.set(-24,.2,0);b.add(w);g.add(b);
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

// ---- Yüzer RES: çift rotorlu V kule, üç sarı yüzer kolon, tek nokta bağlama ----
// Bir platformda iki türbin (~17 MW toplam); kuleler ortak bir düğümden V biçiminde dışa açılır, rotorlar birbirine
// çarpmasın diye göbekler ~185 m aralıklı. Platform ön kolondaki bağlama noktası çevresinde rüzgâra kendiliğinden döner
// (3D görünümde tüm platform döner). Yerel eksenler: rotorlar −x yönüne (rüzgâra) bakar, kuleler z boyunca açılır.
function floatUnit(parts,yaw,sc){
  const g=new THREE.Group(),H=128*sc,S=92*sc,k0=parts.rotors.length;
  // V kuleler (ortak düğümden dışa eğik, aşağıda kalın) ve iki gövde arasındaki gergi halatı
  for(const sd of [-1,1]){const A=new THREE.Vector3(0,8,0),B=new THREE.Vector3(0,H-3,sd*S),L=A.distanceTo(B);
    const tw=new THREE.Mesh(new THREE.CylinderGeometry(1.7*sc,3*sc,L,20),M.white);tw.position.copy(A).add(B).multiplyScalar(.5);
    tw.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());tw.castShadow=true;g.add(tw);}
  g.add(cylBetween([0,H-2,-S],[0,H-2,S],.25,M.steel,5));
  // yüzer gövde: orta düğüm, üç sarı kolon (su hattında koyu şerit), aralarında gri kirişler; kolonlardan kulelere gergiler
  const C=[[28,-64],[28,64],[-52,0]];
  g.add(cyl(4.5,4.5,16,M.yellow,0,1,0,20),cyl(4.6,4.6,1,M.dark,0,.2,0,20));
  C.forEach(([x,z])=>{g.add(cyl(6,6,14,M.yellow,x,1,z,24),cyl(6.1,6.1,1,M.dark,x,.2,z,24),cylBetween([0,3,0],[x,3,z],1.6,M.grey,12));
    const r=new THREE.Mesh(new THREE.RingGeometry(6.5,12,24),M.seaFoam);r.rotation.x=-Math.PI/2;r.position.set(x,.25,z);g.add(r);
    if(z)g.add(cylBetween([x,8,z],[0,H*.55,Math.sign(z)*S*.55],.22,M.steel,5));});
  // tek nokta bağlama: ön kolonda döner bağlantı, öne doğru açılan üç bağlama hattı
  g.add(cyl(2.4,2.4,3,M.dark,-52,8.5,0,12));[-1,0,1].forEach(d=>g.add(cylBetween([-56,0,0],[-90,-8,d*26],.3,M.dark,5))); // hatların görünen (yüzeye yakın) kısmı
  // makine daireleri ve rotorlar (kanatlar 61 m × 1,5 ≈ 91 m), uçak ikaz lambaları
  for(const sd of [-1,1]){const z=sd*S;g.add(box(16,5.6,5.6,M.white,4,H,z),box(3.2,1.4,3.6,M.white,10,H+3.4,z));
    const rotor=new THREE.Group();rotor.position.set(-5,H,z);rotor.scale.setScalar(1.5*sc);
    const hub=new THREE.Mesh(new THREE.SphereGeometry(2.3,20,14),M.white);hub.scale.set(1.6,1,1);hub.castShadow=true;rotor.add(hub);
    for(let i=0;i<3;i++){const b=new THREE.Mesh(bladeGeometry(),M.white);b.rotation.x=i*2*Math.PI/3;b.castShadow=true;rotor.add(b);}
    const k=parts.rotors.length;rotor.name=`rotor${k}`;g.add(rotor);parts.rotors.push({name:rotor.name,a:Math.random()*Math.PI,w:0,f:.92+Math.random()*.16});
    const bc=new THREE.Mesh(new THREE.SphereGeometry(1.1,10,8),M.beacon);bc.position.set(6,H+3.2,z);bc.name=`beacon${k}`;g.add(bc);parts.beacons.push(bc.name);}
  g.rotation.y=yaw;g.name=`tw${k0}`;parts.yaws.push({name:g.name,base:yaw,cur:yaw});
  return g;
}
function floatFarm(mw,parts,yaw,sc=1){
  const g=new THREE.Group(),n=Math.min(3,Math.max(1,Math.ceil(mw/17))),sp=620*sc;
  for(let i=0;i<n;i++){const u=floatUnit(parts,yaw,sc);u.position.x=(i-(n-1)/2)*sp;g.add(u);}
  boat(g,-(n-1)/2*sp+70,95,.4);
  return g;
}

// ---- GES: ekvatora bakan eğik masalar; parsel sınırına uyan düzen, iç yollarla bloklar, blok başına inverter/trafo istasyonu ----
// Masa: iki dikey modül (4,6 m derinlik), ~26 m boy, 25° eğim, sıra aralığı 9,5 m (~1,1 ha/MW). Satır araları zemin olarak
// açık kalır (haritada uydu görüntüsündeki toprak görünür). Parsel kenarları tohumlu gürültüyle girintilidir, bir köşesi
// kesiktir; kesilen alan için saha büyütülür, kurulu güç korunur. 3D görünümde her masa kendi zeminine oturur ve yamaç
// boyunca eğilir (conformSite).
function solarFarm(mw,lat,parts,tier="std",seed=1){
  const g=new THREE.Group(),N=noise2(seed+3),pitch=9.5,tl=26,tilt=25*RAD*(lat>=0?1:-1);
  const sx=seed%2?1:-1,sz=(seed>>1)%2?1:-1;
  const inside=(x,z,hw)=>{const ux=x/hw,uz=z/hw,r=Math.pow(ux**4+uz**4,.25);
    if(sx*ux>.42&&sz*uz>.42&&sx*ux+sz*uz>1.02)return false; // kesik köşe (komşu parsel)
    return r<1-.11*N(ux*1.7+3,uz*1.7+7,3);};
  // önce masaları say, sonra hedef alana göre büyüt (bir kez düzeltme yeter)
  const lay=hw=>{const R=Math.max(4,Math.round(2*hw/pitch)),rows=[],ew=[],ns=[0];if(hw>190)ns.push(-hw/2,hw/2);
    const out=[];for(let i=0;i<R;i++){const z=(i-(R-1)/2)*pitch;if(i%13===12){ew.push(z);continue;}
      for(let x=-hw+tl/2;x<=hw-tl/2;x+=tl+1){if(ns.some(r=>Math.abs(x-r)<tl/2+4))continue;if(!inside(x-tl/2,z,hw)||!inside(x+tl/2,z,hw))continue;out.push([x,z,i]);}}
    return {tables:out,R,ew,ns};};
  let hw=Math.sqrt(mw*11000)/2,L=lay(hw);const want=mw*11000/(pitch*(tl+1));
  if(L.tables.length)hw*=Math.sqrt(want/L.tables.length);L=lay(hw);
  const {tables,R,ew,ns}=L,mat=M.pv[tier]||M.pv.std;mat.map.repeat.set(tl/9.1,1);
  const pg=new THREE.BoxGeometry(tl,.1,4.6),lg=new THREE.CylinderGeometry(.09,.09,1,5);
  const panels=new THREE.InstancedMesh(pg,mat,tables.length),legs=new THREE.InstancedMesh(lg,M.frame,tables.length*6);
  panels.castShadow=panels.receiveShadow=true;legs.castShadow=true;panels.userData.span=tl/2;
  const m=new THREE.Matrix4(),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),tilt),q0=new THREE.Quaternion(),one=new THREE.Vector3(1,1,1);
  let li=0;
  tables.forEach(([x,z],pi)=>{panels.setMatrixAt(pi,m.compose(new THREE.Vector3(x,1.9,z),q,one));
    for(let k=0;k<3;k++)for(const dz of [-1.6,1.6]){const hh=1.9-dz*Math.sin(tilt);legs.setMatrixAt(li++,m.compose(new THREE.Vector3(x-tl/2+1+k*(tl-2)/2,hh/2,z+dz),q0,new THREE.Vector3(1,hh,1)));}});
  g.add(panels,legs);
  // güneş parıltısı: sıralar 12 banda ayrılır, üretim varken bantlar sırayla yanarak panellerin üstünden kayar
  const K=12,gg=new THREE.PlaneGeometry(tl,4.4);gg.rotateX(-Math.PI/2);
  const lift=new THREE.Vector3(0,.08,0).applyQuaternion(q);
  for(let k=0;k<K;k++){const r0=Math.floor(k*R/K),r1=Math.floor((k+1)*R/K);if(r1<=r0)continue;
    const band=tables.filter(t=>t[2]>=r0&&t[2]<r1);if(!band.length)continue;const im=new THREE.InstancedMesh(gg,M.glint,band.length);im.userData.span=tl/2;
    band.forEach(([x,z],j)=>im.setMatrixAt(j,m.compose(new THREE.Vector3(x,1.9,z).add(lift),q,one)));
    im.name=`glint${parts.glints.length}`;g.add(im);parts.glints.push(im.name);}
  // parsel sınırı (masaların dış zarfı + pay): 72 yönde ışın, sınır ikiye bölme ile bulunur
  const edge=[];for(let a=0;a<72;a++){const t=a/72*Math.PI*2,c=Math.cos(t),sn=Math.sin(t);let lo=0,hi=hw*1.5;
    for(let it=0;it<18;it++){const mid=(lo+hi)/2;if(inside(c*mid,sn*mid,hw))lo=mid;else hi=mid;}edge.push([c*(lo+9),sn*(lo+9)]);}
  // iç yollar: kuzey-güney ana yol(lar) ve her 12 sırada bir doğu-batı yol; sınır boyunca çevre yolu ve çit
  const zMax=R*pitch/2+6;
  // yol, parselin içinde kalan aralık boyunca (4 m adımla taranır)
  const span=(f,lo,hi)=>{let a=null,b=null;for(let t=lo;t<=hi;t+=4)if(f(t)){if(a===null)a=t;b=t;}return a===null?null:[a-4,b+4];};
  ns.forEach(x=>{const r=span(z=>inside(x,z,hw),-hw*1.4,hw*1.4);if(r)g.add(padAt(6,r[1]-r[0],M.road,x,(r[0]+r[1])/2,.06));});
  ew.forEach(z=>{const r=span(x=>inside(x,z,hw),-hw*1.4,hw*1.4);if(r)g.add(padAt(r[1]-r[0],5,M.road,(r[0]+r[1])/2,z,.06));});
  roadPoly(g,edge,5,M.road,.05);
  const south=edge.reduce((a,p)=>p[1]>a[1]&&Math.abs(p[0])<hw*.3?p:a,[0,0]);
  fencePoly(g,edge.map(([x,z])=>{const k=1+6/Math.hypot(x,z);return [x*k,z*k];}),9,[0,south[1]+6]);
  // inverter/trafo istasyonları: her blok (iç yol kavşakları arası) ortasında, yol kenarında; beton taban, inverter kabini,
  // yağlı trafo (radyatörlü)
  const bz=[-zMax,...ew,zMax].sort((a,b)=>a-b),st=[];
  for(let b=0;b<bz.length-1;b++){const zc=(bz[b]+bz[b+1])/2;ns.forEach(x=>{if(inside(x,zc,hw))st.push([x,zc]);});}
  const nSt=Math.max(1,Math.min(st.length,Math.round(mw/3)));
  st.slice(0,nSt).forEach(([x,z],b)=>{const ox=x+4.6;g.add(padAt(6,15,M.concrete,ox,z+1,.1),box(2.6,2.7,6.2,M.white,ox,1.35,z),box(2.3,2.2,2.3,M.tankW,ox,1.1,z+5),
      box(.25,1.6,2,M.grey,ox-1.3,1,z+5),box(.25,1.6,2,M.grey,ox+1.3,1,z+5));
    parts.inv.push(ledSet(g,new THREE.BoxGeometry(.1,.5,.5),[ox+1.36,2.1,z],{run:M.ledG,curt:M.ledR,off:M.ledO},`inv${b}`));});
  // işletme alanı: parselin güneyinde, kapının önünde (bina, otopark, su tankı, yedek parça konteyneri, meteoroloji direği)
  const oz=south[1]+30,ox0=-30;
  g.add(padAt(7,oz-south[1]+6,M.road,0,(south[1]+oz)/2,.07),padAt(64,24,M.gravel,ox0+8,oz,.06),padAt(20,11,M.asphalt,ox0+22,oz,.08));
  building(g,15,9,4.2,ox0-8,oz,M.roofBlue,2);cars(g,[[ox0+16,oz-2.8,Math.PI/2],[ox0+20,oz-2.8,Math.PI/2],[ox0+24,oz+2.8,Math.PI/2]]);
  g.add(cyl(2.2,2.2,4.6,M.white,ox0+33,2.3,oz),box(12.2,2.9,2.45,M.container,ox0+12,1.45,oz+8.5));
  g.add(cyl(.08,.08,6,M.grey,ox0+38,3,oz-6,6),box(.8,.5,.8,M.white,ox0+38,6,oz-6),box(1.2,.05,.8,M.pv.std,ox0+38,5.2,oz-6));
  fence(g,70,30,ox0+8,oz,0);
  // güvenlik kamerası direkleri (çit boyunca seyrek)
  edge.filter((_,k)=>k%9===0).forEach(([x,z])=>{const k=1+6/Math.hypot(x,z);g.add(cyl(.12,.15,7,M.grey,x*k,3.5,z*k,6),box(.5,.35,.8,M.white,x*k,7,z*k));});
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
    {const wa=(1-ss(8,22,Math.abs(z)))*ss(50,58,d)*(1-ss(85,120,d));if(wa>0)y+=(Math.max(y,H+3)-y)*wa;} // barajın oturduğu yamaçlar
    // santral platformu, şalt sahası ve kuyruk suyu kanalı (yamaca oyulur)
    y+=(1-y)*rect(x,z,16,52,30,64,7);y+=(1.2-y)*rect(x,z,22,56,72,102,7);
    const tr=rect(x,z,6,34,52,60,4);y+=(-1.5-y)*tr;
    return y;};
  return {h,ax};
}
function hydro(parts,seed,fpv=0,tier="std",lat=40){
  const g=new THREE.Group(),C=120,H=HES_H,V=valleyOf(seed);
  // arazi ağı: ~4 m çözünürlük, köşe renkleri (bitki örtüsü, kaya, su seviyesi şeridi, göl tabanı) ve kenar saydamlığı
  const X0=-230,X1=230,Z0=-330,Z1=270,nx=115,nz=150,geo=new THREE.PlaneGeometry(X1-X0,Z1-Z0,nx,nz);geo.rotateX(-Math.PI/2);geo.translate((X0+X1)/2,0,(Z0+Z1)/2);
  const pos=geo.attributes.position,col=new Float32Array(pos.count*4),N=noise2(seed+7),c=new THREE.Color(),c2=new THREE.Color();
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),y=V.h(x,z);pos.setY(i,y);}
  geo.computeVertexNormals();const nrm=geo.attributes.normal;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),y=pos.getY(i),steep=1-nrm.getY(i),n=N(x/40,z/40),n2=N(x/9,z/9);
    if(z<0&&y<HES_W-.3)c.set(0x8A7E5C).lerp(c2.set(0x3F3D33),Math.min(1,(HES_W-y)/22)); // göl tabanı: derinleştikçe koyu
    else if(z<0&&y<HES_W+1.6)c.set(0xC2B596).lerp(c2.set(0xA39678),n2); // su seviyesi değişiminin bıraktığı açık şerit
    else if(z>=0&&y<.6)c.set(0x8F8877).lerp(c2.set(0x6F6A5C),n2); // nehir yatağı çakılı
    else{c.set(0x3E5A2B).lerp(c2.set(0x6E8048),ss(.35,.7,n)).lerp(c2.set(0x2F4524),ss(.55,.8,n2)*.5); // orman ve çayır
      if(steep>.45)c.lerp(c2.set(0x837C70),ss(.45,.7,steep)*.85);} // çok sarp yerde kaya
    const e=Math.min(x-X0,X1-x,z-Z0,Z1-z);col.set([c.r,c.g,c.b,ss(0,45,e)],i*4);}
  geo.setAttribute("color",new THREE.BufferAttribute(col,4));
  const terr=new THREE.Mesh(geo,M.terrain);terr.receiveShadow=terr.castShadow=true;terr.name="valley";terr.renderOrder=1;g.add(terr);
  // su düzlemleri: kenarlarda saydam (köşe rengi alfa); göl barajın memba yüzüne kadar, nehir mansapta
  const water=(z0,z1,y,mat,seg)=>{const w=new THREE.PlaneGeometry(X1-X0,z1-z0,seg,Math.round(seg*(z1-z0)/(X1-X0)));w.rotateX(-Math.PI/2);w.translate(0,y,(z0+z1)/2);
    const p=w.attributes.position,a=new Float32Array(p.count*4);for(let i=0;i<p.count;i++){const e=Math.min(p.getX(i)-X0,X1-p.getX(i),p.getZ(i)-Z0,Z1-p.getZ(i));a.set([1,1,1,ss(35,95,e)],i*4);}
    w.setAttribute("color",new THREE.BufferAttribute(a,4));const m=new THREE.Mesh(w,mat);m.receiveShadow=true;return m;};
  // su arazinin üstüne çizilir (ikisi de saydam: sıra sabit olmazsa su altındaki zemin suyun üstüne boyanıyordu)
  const lake=water(Z0,-3.6,HES_W,M.water,40);lake.name="lake";lake.renderOrder=2;g.add(lake);
  const riv=water(24,Z1,.15,M.river,40);riv.renderOrder=2;g.add(riv);
  if(fpv>0)floatingSolar(g,V,fpv,tier,lat); // yüzer GES baraj gölünde
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

// ---- BES (biyokütle ve biyogaz): kazan evi ve türbin salonu (katı yakıt), elektrostatik filtre, işaretli baca, kapalı yakıt
// deposu ve talaş yığınları, yakıt konveyörü, biyogaz çürütücüleri (beyaz çift membran kubbe ve koyu örtülü tanklar),
// brandalı silaj bunkerleri, gaz motoru konteynerleri, meşale, soğutma hücreleri, kantar, kamyonlar, beton avlu ve çim alanlar ----
// pile: düzensiz yığın (koninin köşeleri gürültüyle oynatılır)
function pile(r,h,seed){
  const geo=new THREE.ConeGeometry(r,h,28,4),p=geo.attributes.position,N=noise2(seed);
  for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),k=1+(N(x/6+seed,z/6)-.5)*.5*(1-(y+h/2)/h*.6);p.setX(i,x*k);p.setZ(i,z*k*1.25);p.setY(i,y*(.85+N(x/4,z/4+seed)*.3));}
  geo.computeVertexNormals();const m=new THREE.Mesh(geo,M.pile);m.position.y=h*.45;m.castShadow=m.receiveShadow=true;return m;
}
function biomass(mw,parts){
  const g=new THREE.Group(),nd=Math.min(6,2+Math.ceil(mw/5));
  // avlu, çim alanlar, iç yollar
  g.add(padAt(150,96,M.concrete,0,0,.05),padAt(60,18,M.grass,60,-58,.06),padAt(36,22,M.grass,-90,52,.06),padAt(220,7,M.asphalt,10,62,.07),padAt(7,70,M.asphalt,-60,20,.07));
  // kazan evi (yüksek), türbin salonu, elektrostatik filtre ve baca (üst kısmı kırmızı-beyaz işaretli); duman çalışırken
  g.add(box(24,30,22,M.clad,0,15,0),box(24.6,.8,22.6,M.roofGrey,0,30.4,0),box(36,14,20,M.clad,32,7,2),box(36.6,.7,20.6,M.roofBlue,32,14.3,2),box(34,1.2,.1,M.glass,32,10,12.05));
  g.add(box(14,16,12,M.grey,-20,8,6),box(10,6,8,M.steel,-20,19,6),cylBetween([-12,22,4],[-20,22,6],1.6,M.steel,12),cylBetween([-26,10,6],[-34,4,8],1.4,M.steel,12));
  const sx=-36,sz=8,sh=55;g.add(cyl(1.6,2.3,sh,M.white,sx,sh/2,sz,18));
  [sh-3,sh-9].forEach(y=>g.add(cyl(1.7,1.7,2.5,M.beacon,sx,y,sz,18)));
  const sm=new THREE.Group();sm.name=`smoke${parts.smokes.length}`;
  [[0,sh+4,0,3],[1.5,sh+9,.5,4],[3.5,sh+14,1,5],[6,sh+19,1.5,6]].forEach(([dx,y,dz,r])=>{const q=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),M.smoke);q.position.set(sx+dx,y,sz+dz);sm.add(q);});
  g.add(sm);parts.smokes.push(sm.name);parts.drifts.push({name:sm.name,ph:0,amp:1.4,sp:.5});
  // yakıt sahası: yarı açık yakıt deposu (çelik ayaklı çatı), talaş yığınları, yükleyiciler, kazana çıkan kapalı konveyör
  g.add(box(46,.6,22,M.roofGreen,-48,11,-34),inst(new THREE.BoxGeometry(.5,11,.5),M.steel,[-70,-58,-46,-34,-26].flatMap(x=>[[x,5.5,-44.5],[x,5.5,-23.5]])),box(46,3,.5,M.concrete,-48,1.5,-45));
  g.add(pile(9,6,3).translateX(-56).translateZ(-36),pile(7,5,5).translateX(-40).translateZ(-33));
  [[-55,-8,11,8,7],[-33,-10,8,6,9]].forEach(([x,z,r,h,sd])=>g.add(pile(r,h,sd).translateX(x).translateZ(z)));
  [[-46,4],[-20,-22]].forEach(([x,z],i)=>g.add(box(5,2.4,2.6,M.yellow,x,1.6,z),box(1.8,1.6,2.4,M.glass,x+1,3.2,z),box(1.2,.4,3,M.dark,x-3,.9,z)));
  const cv=box(38,2.2,2.6,M.clad,-24,11,-14);cv.rotation.z=.48;g.add(cv);
  const ch2=new THREE.Group();ch2.position.set(-24,12.4,-14);ch2.rotation.z=.48;ch2.name=`chips${parts.belts.length}`;
  for(let k=-2;k<=2;k++)ch2.add(box(1.6,.6,1.6,M.chips,k*6.8,0,0));g.add(ch2);parts.belts.push(ch2.name);
  // biyogaz çürütücüleri: beton tank (r 11 m), yarısı beyaz çift membran kubbe, yarısı koyu düz örtü; tankları bağlayan borular
  for(let i=0;i<nd;i++){const x=46+(i%3)*26,z=-32+Math.floor(i/3)*26;g.add(cyl(11,11,7,M.tankW,x,3.5,z,40),cyl(11.3,11.3,.5,M.grey,x,7.1,z,40));
    if(i%2===0){const d=new THREE.Mesh(new THREE.SphereGeometry(11,32,12,0,Math.PI*2,0,Math.PI/2),M.domeW);d.scale.y=.42;d.position.set(x,7.2,z);d.castShadow=true;g.add(d);}
    else g.add(cyl(10.6,10.6,.4,M.domeK,x,7.4,z,40));
    if(i>0)g.add(cylBetween([x-26+11,2,z],[x-11,2,z],.35,M.steel,6));}
  // silaj bunkerleri: üç bölme, beton yan duvarlar; ikisi brandalı (lastik ağırlıklı), biri açık (kesit yüzü)
  const bx=48,bz0=12;for(let k=0;k<4;k++)g.add(box(56,3.2,.6,M.concrete,bx+30,1.6,bz0+k*13));
  [[0,"tarp"],[1,"tarp"],[2,"silage"]].forEach(([k,t])=>{const z=bz0+6.5+k*13;const b=box(t==="silage"?36:52,t==="silage"?2.6:3.4,12,M[t],bx+30-(t==="silage"?8:2),t==="silage"?1.3:1.7,z);g.add(b);});
  // gaz motoru konteynerleri (yeşil, egzoz bacalı), meşale, gaz depolama
  [[20,40],[20,47]].forEach(([x,z])=>g.add(box(12.2,2.9,2.6,M.roofGreen,x,1.45,z),cyl(.3,.3,4,M.steel,x+4,4.5,z,8)));
  g.add(cyl(.4,.4,10,M.steel,-6,5,46,8),cyl(.8,.8,1.4,M.dark,-6,10.6,46,10));
  // soğutma hücreleri (dört fan), kül silosu, su tankı
  g.add(box(22,7,9,M.wall,34,3.5,-32+52),inst(new THREE.CylinderGeometry(2.4,2.4,.5,18),M.dark,[26,31.5,37,42.5].map(x=>[x-.5,7.3,20])));
  g.add(cyl(3,3,13,M.white,-6,8.5,-30),new THREE.Mesh(new THREE.ConeGeometry(3,3,20),M.white).translateX(-6).translateY(16.5).translateZ(-30),cyl(5,5,8,M.tankW,10,4,-38,28));
  // kantar ve kulübesi, yakıt kamyonları, idari bina ve otopark
  g.add(padAt(18,4,M.concrete,-30,62,.09),box(3,2.6,3,M.wall,-30,1.3,56.5));
  [[-72,62],[30,62]].forEach(([x,z])=>g.add(box(3,3,2.5,M.white,x+6.5,1.9,z),box(10,3.4,2.5,M.roofGreen,x-.5,2.1,z)));
  building(g,16,9,4,-92,30,M.roofRed,2);g.add(padAt(18,10,M.asphalt,-74,40,.08));cars(g,[[-80,40,0],[-76,40,0],[-72,40,0]]);
  fence(g,226,140,4,0,9);
  return g;
}

// ---- Deniz: yüzer gelgit türbini platformları ve dalga şamandıraları ----
// Gelgit platformu (yüzer, ikiz gövdeli): gövdeler su üstünde ~3 m bordayla, ortada güverte, kumanda kabini, sinyal
// direği ve bakım vinci; iki yanda suya inen bacak kollarının ucunda akıntıyla dönen rotorlar. Dalga dönüştürücü
// şamandıralar (noktasal emici): yüzen sarı gövdenin üstünde su yüzünden ~11 m yükselen direk, başlık, güneş paneli
// ve fener; dalgayla inip kalkar. Yükseklikler ve gölgeler yukarıdan bakan harita görüntüsünde de derinlik verir.
function marine(mw,parts){
  const g=new THREE.Group(),np=Math.min(4,Math.max(1,Math.ceil(mw/5))),nb=6;
  for(let i=0;i<np;i++){const x=(i-(np-1)/2)*70,pl=new THREE.Group();pl.position.set(x,0,0);
    // ikiz gövde (koyu su hattı şeridiyle), aralarında güverte
    for(const z of [-6,6]){pl.add(cyl(1.9,1.9,46,M.yellow,0,1.2,z,20).rotateZ(Math.PI/2),box(46,.5,3.9,M.dark,0,.1,z));}
    pl.add(box(30,.8,14,M.grey,0,3.2,0),box(30,.9,.12,M.frame,0,4.1,-6.9),box(30,.9,.12,M.frame,0,4.1,6.9));
    // kumanda kabini (pencere bandı), sinyal direği, bakım vinci
    pl.add(box(9,4.2,7,M.white,-6,5.7,0),box(9.1,1,7.1,M.glass,-6,6.6,0),box(9.6,.4,7.6,M.roofGrey,-6,8,0));
    pl.add(cyl(.18,.25,12,M.white,-9,12,0,8),box(2.4,.15,.15,M.white,-9,16.5,0));
    pl.add(cyl(.6,.6,5,M.yellow,8,6,0,10),cylBetween([8,8.2,0],[16,14,0],.4,M.yellow,8),cylBetween([16,14,0],[16,9,0],.06,M.dark,4));
    const ring=new THREE.Mesh(new THREE.RingGeometry(9,26,32),M.seaFoam);ring.rotation.x=-Math.PI/2;ring.scale.z=0.5;ring.position.y=.3;pl.add(ring);
    // bacak kolları: gövdeden dışa ve aşağı açılır; uçlarında akıntı yönünde (x ekseni) dönen rotorlar
    for(const z of [-11,11]){pl.add(cylBetween([0,2.4,z*.55],[0,-4,z*1.25],.7,M.yellow,10));
      const rot=new THREE.Group();rot.position.set(-3,-4.5,z*1.25);rot.name=`tide${parts.tides.length}`;
      const hub=new THREE.Mesh(new THREE.SphereGeometry(1.5,14,10),M.yellow);hub.scale.set(2.2,1,1);rot.add(hub);
      for(let b=0;b<3;b++){const bl=box(.4,8,1.1,M.white,0,4.2,0);const arm=new THREE.Group();arm.add(bl);arm.rotation.x=b*2*Math.PI/3;rot.add(arm);}
      pl.add(rot);parts.tides.push({name:rot.name,a:Math.random()*Math.PI,w:0});}
    const bc=new THREE.Mesh(new THREE.SphereGeometry(.6,10,8),M.beacon);bc.position.set(-9,18.4,0);bc.name=`beacon_m${i}`;pl.add(bc);parts.beacons.push(bc.name);
    // bağlama zincirleri (dört köşeden) ve akıntı yönünde köpük izi
    [[-22,-6],[22,-6],[-22,6],[22,6]].forEach(([a,b])=>pl.add(cylBetween([a,.4,b],[a*1.5,-6,b*2.6],.15,M.dark,5)));
    const wk=new THREE.Mesh(new THREE.PlaneGeometry(40,10),M.seaFoam);wk.rotation.x=-Math.PI/2;wk.position.set(44,.25,0);wk.material=M.seaFoam;pl.add(wk);
    g.add(pl);}
  // dalga dönüştürücü şamandıralar (yüzen gövde, direk, başlık, güneş paneli, fener)
  for(let i=0;i<nb;i++){const b=new THREE.Group(),x=(i-(nb-1)/2)*28,z=48+(i%2)*14;b.position.set(x,0,z);b.name=`buoy${parts.buoys.length}`;
    b.add(cyl(3.2,3.6,3.2,M.yellow,0,.9,0,24),cyl(3.3,3.3,.4,M.dark,0,.1,0,24),cyl(.7,.9,9,M.dark,0,6.8,0,12),box(2.6,2.2,2.6,M.white,0,12.1,0));
    const sp=box(2.2,.1,1.6,M.panel,0,13.3,0);sp.rotation.x=-.4;b.add(sp);
    const top=new THREE.Mesh(new THREE.SphereGeometry(.5,8,6),M.beacon);top.position.y=14.1;b.add(top);
    const fr=new THREE.Mesh(new THREE.RingGeometry(3.6,6.5,24),M.seaFoam);fr.rotation.x=-Math.PI/2;fr.position.y=.25;b.add(fr);
    g.add(b);parts.buoys.push({name:b.name,ph:i*1.3});}
  // saha sınırını gösteren sarı işaret şamandıraları ve bakım teknesi
  const ex=np*35+30;[[-ex,-30],[ex,-30],[-ex,80],[ex,80]].forEach(([x,z])=>{g.add(cyl(1.4,1.4,1.4,M.yellow,x,.6,z,12),new THREE.Mesh(new THREE.ConeGeometry(1,3.6,8),M.yellow).translateX(x).translateY(3.1).translateZ(z),box(1.6,.3,.3,M.dark,x,5.1,z));});
  boat(g,-ex+30,96,.2);
  return g;
}

// su yüzeyi diski (göl ve hazneler): su malzemesi köşe rengi ister (saydamlık); burada tam opak
function waterDisk(r,y,seg=64){
  const geo=new THREE.CircleGeometry(r,seg);geo.rotateX(-Math.PI/2);geo.translate(0,y,0);
  geo.setAttribute("color",new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count*4).fill(1),4));
  const m=new THREE.Mesh(geo,M.water);m.receiveShadow=true;m.renderOrder=2;return m;
}
// halka set (hazne): profil noktaları [r,y] arası bantlar; iç şev, kret ve dış şev ayrı malzemeyle. Döndürme yüzeyinin hangi
// yüzü dışa bakacağı şevin yönüne bağlı: malzemenin çift yüzlü kopyası kullanılır
const DS=new WeakMap(),twoSided=m=>{let d=DS.get(m);if(!d){d=m.clone();d.side=THREE.DoubleSide;DS.set(m,d);}return d;};
function ringDam(prof,mats,seg=72){
  const g=new THREE.Group();
  for(let i=0;i<prof.length-1;i++){const geo=new THREE.LatheGeometry([new THREE.Vector2(...prof[i]),new THREE.Vector2(...prof[i+1])],seg);
    const m=new THREE.Mesh(geo,twoSided(mats[i]));m.castShadow=m.receiveShadow=true;g.add(m);}
  return g;
}
// zemine oturmayan (tek parça arazili) gruplarda yardımcıların çizdiği nesneleri dy kadar yükseltir
const lifted=(g,dy,draw)=>{const n0=g.children.length;draw();g.children.slice(n0).forEach(m=>m.position.y+=dy);};

// ---- Yüzer GES (baraj gölünde): HDPE şamandıralar üstünde alçak eğimli (12°) panel sıraları, panelsiz şamandıra şeritleri
// (bakım yolları), yüzer inverter platformları, kıyıya bağlama halatları ve kıyıya kablo. Ada, kıyıdan payla derin kalan göl
// hücrelerine membada bir merkezin çevresinde toplu yerleşir. Bir şamandıra sırası 12 m × 2,3 m modül (~5,8 kW); göl
// küçükse görüntü gölün en çok %60'ını kaplar (temsilî) ----
function floatingSolar(g,V,mw,tier,lat){
  const y0=HES_W,sx=12.5,sz=4,deep=(x,z)=>[[0,0],[-9,-6],[9,-6],[-9,6],[9,6]].every(([a,b])=>V.h(x+a,z+b)<y0-2.5);
  const slots=[];for(let z=-270;z<=-50;z+=sz)for(let x=-170;x<=170;x+=sx)if(deep(x,z))slots.push([x,z]);
  if(!slots.length)return;
  const cz=-140,cx=V.ax(cz),n=Math.min(Math.round(mw*1000/5.8),Math.round(slots.length*.6));
  const pick=slots.sort((a,b)=>Math.hypot(a[0]-cx,(a[1]-cz)*1.2)-Math.hypot(b[0]-cx,(b[1]-cz)*1.2)).slice(0,n);
  const pan=[],walk=[],tilt=12*RAD*(lat>=0?1:-1);
  pick.forEach(([x,z])=>(Math.round((z+270)/sz)%9===8||Math.round((x+170)/sx)%7===6?walk:pan).push([x,z]));
  g.add(inst(new THREE.BoxGeometry(sx-.3,.5,sz-.25),M.float,pick.map(([x,z])=>[x,y0+.2,z])));
  const pm=new THREE.InstancedMesh(new THREE.BoxGeometry(12,.06,2.3),M.fpv[tier]||M.fpv.std,Math.max(1,pan.length)),mt=new THREE.Matrix4(),
    q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),tilt),one=new THREE.Vector3(1,1,1);
  pan.forEach(([x,z],i)=>pm.setMatrixAt(i,mt.compose(new THREE.Vector3(x,y0+.78,z-.2),q,one)));pm.count=pan.length;pm.castShadow=pm.receiveShadow=true;g.add(pm);
  // yüzer inverter ve trafo platformları (5 MW başına bir), bakım şeritlerinin üstünde
  const ni=Math.max(1,Math.round(mw/5)),inv=walk.filter((_,i)=>i%Math.max(1,Math.floor(walk.length/ni))===0).slice(0,ni);
  inv.forEach(([x,z])=>g.add(box(8,.7,5,M.float,x,y0+.35,z),box(4.2,2.4,2.4,M.white,x-1.4,y0+1.9,z),box(2,2,2,M.tankW,x+2.4,y0+1.7,z)));
  // bağlama halatları: adanın 8 yönündeki en uç şamandıradan kıyıya; kablo ilk platformdan barajın yanındaki kıyıya
  const shore=(x,z,dx,dz)=>{for(let k=1;k<60;k++){const X=x+dx*k*4,Z=z+dz*k*4;if(V.h(X,Z)>y0)return [X,V.h(X,Z)+.4,Z];}return null;};
  for(let a=0;a<8;a++){const dx=Math.cos(a*Math.PI/4),dz=Math.sin(a*Math.PI/4);
    const e=pick.reduce((b,p)=>(p[0]-cx)*dx+(p[1]-cz)*dz>(b[0]-cx)*dx+(b[1]-cz)*dz?p:b,pick[0]),sh=shore(e[0],e[1],dx,dz);
    if(sh)g.add(cylBetween([e[0]+dx*6,y0+.3,e[1]+dz*2],sh,.14,M.dark,4));}
  if(inv[0]){const [x,z]=inv[0],sh=shore(x,z,0,1)||shore(x,z,1,0);if(sh)g.add(cylBetween([x,y0+.25,z],sh,.3,M.dark,6));}
}

// ---- Pompaj depolamalı HES: tepede asfalt kaplamalı halka setli üst hazne (içinde su alma kulesi), yamaçtan beton mesnetler
// üstünde inen iki cebri boru ve denge bacası, eteğinde santral binası, trafolar ve kuyruk suyu kanalı, setle çevrili alt
// hazne, şalt sahası ve enerji nakil hattı. Arazi ağı HES vadisi gibi tek parça (araziye bir bütün olarak oturur). Hazne
// büyüklüğü depo enerjisine göre ölçeklenir; düşü görselde ~120 m (gerçek santrallerde çoğu 200–600 m) ----
function pumped(mw,parts,seed){
  const g=new THREE.Group(),N=noise2(seed+21),Hh=120,R=Math.min(125,58*Math.sqrt(mw/5)),RL=R*1.12;
  const U=[0,-150-R*.4],L=[10,175+RL*.3],zP=L[1]-RL-48,X0=-260,X1=260,Z0=U[1]-R-80,Z1=L[1]+RL+70;
  const h=(x,z)=>{const du=Math.hypot((x-U[0])/1.25,z-U[1]),dl=Math.hypot((x-L[0])/1.2,z-L[1]);
    let y=Hh*ss(150,-110,z)+(N(x/90,z/90)-.5)*28+(N(x/22,z/22)-.5)*3;
    y+=(Hh-3-y)*(1-ss(R+32,R+75,du));y+=(-.5-y)*(1-ss(RL+26,RL+62,dl));
    const pd=Math.max(L[0]-34-x,x-L[0]-92,Math.abs(z-zP)-28,0);y+=(1-y)*(1-ss(0,14,pd)); // santral ve şalt sahası platformu
    return y;};
  const nx=104,nz=Math.round(nx*(Z1-Z0)/(X1-X0)),geo=new THREE.PlaneGeometry(X1-X0,Z1-Z0,nx,nz);geo.rotateX(-Math.PI/2);geo.translate((X0+X1)/2,0,(Z0+Z1)/2);
  const pos=geo.attributes.position,col=new Float32Array(pos.count*4),c=new THREE.Color(),c2=new THREE.Color(),N2=noise2(seed+5);
  for(let i=0;i<pos.count;i++)pos.setY(i,h(pos.getX(i),pos.getZ(i)));
  geo.computeVertexNormals();const nrm=geo.attributes.normal;
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),steep=1-nrm.getY(i),n=N2(x/40,z/40);
    c.set(0x4A6532).lerp(c2.set(0x7A8A4E),ss(.3,.75,n)).lerp(c2.set(0x34492A),ss(.6,.85,N2(x/11,z/11))*.5);
    if(steep>.4)c.lerp(c2.set(0x8A8274),ss(.4,.65,steep)*.85);
    const e=Math.min(x-X0,X1-x,z-Z0,Z1-z);col.set([c.r,c.g,c.b,ss(0,45,e)],i*4);}
  geo.setAttribute("color",new THREE.BufferAttribute(col,4));
  const terr=new THREE.Mesh(geo,M.terrain);terr.receiveShadow=terr.castShadow=true;terr.renderOrder=1;g.add(terr);
  // üst hazne: iç şev asfalt kaplama, kret yolu, dış şev çimli kaya dolgu; su kretin ~3 m altında
  const up=ringDam([[R-16,Hh-8],[R+4,Hh+12],[R+12,Hh+12],[R+40,Hh-4]],[M.lining,M.asphalt,M.embank]);up.position.set(U[0],0,U[1]);up.scale.x=1.25;g.add(up);
  const wu=waterDisk(R+1.5,Hh+9);wu.position.set(U[0],0,U[1]);wu.scale.x=1.25;g.add(wu);
  const iz=U[1]+R-16;g.add(cyl(4.5,4.5,16,M.dam,0,Hh+6,iz,20),cyl(5,5,1,M.roofGrey,0,Hh+14.5,iz,20),box(3,1,20,M.dam,0,Hh+12,iz+11));
  // cebri borular (iki hat) ve beton mesnetler; üstte vana evi ve denge bacası
  const z0=U[1]+R+44,K=16,pts=x=>Array.from({length:K+1},(_,k)=>{const z=z0+(zP-14-z0)*k/K;return [x,h(x,z)+2.2,z];});
  for(const x of [-3.2,3.2]){const P=pts(x);for(let k=0;k<K;k++)g.add(cylBetween(P[k],P[k+1],1.5,M.rust,14));
    P.forEach((p,k)=>{if(k%2===0)g.add(box(4,2.6,4,M.concrete,x,p[1]-1.6,p[2]));});}
  const y0=h(0,z0);lifted(g,y0,()=>building(g,12,9,6,0,z0-6,M.roofGrey,1));
  g.add(cyl(5,5,22,M.dam,14,h(14,z0+10)+11,z0+10,24));
  // santral binası (iki tersinir ünite), trafolar, kuyruk suyu kanalı
  g.add(box(32,17,20,M.dam,L[0],1+8.5,zP),box(32.6,.8,20.6,M.roofGrey,L[0],18.4,zP),box(30,1.4,.1,M.glass,L[0],12,zP+10.05),box(7,8,.3,M.steel,L[0]-8,5,zP+10.1));
  lifted(g,1,()=>{transformer(g,L[0]+24,zP-6);transformer(g,L[0]+24,zP+6);});
  g.add(padAt(12,RL*.4+30,M.pondPad,L[0],zP+10+(RL*.4+30)/2,1.1));
  // alt hazne: alçak set, su zeminin biraz üstünde
  const lo=ringDam([[RL-12,-6],[RL+3,4],[RL+10,4],[RL+26,-.5]],[M.lining,M.asphalt,M.embank]);lo.position.set(L[0],0,L[1]);lo.scale.x=1.2;g.add(lo);
  const wl=waterDisk(RL+.5,1.5);wl.position.set(L[0],0,L[1]);wl.scale.x=1.2;g.add(wl);
  // şalt sahası, kontrol binası, enerji nakil hattı
  const sx=L[0]+62,sz=zP;g.add(padAt(30,26,M.gravel,sx,sz,1.1));
  [-8,8].forEach(dz=>g.add(box(.6,13,.6,M.steel,sx-10,7.5,sz+dz),box(.6,13,.6,M.steel,sx+10,7.5,sz+dz)));g.add(box(20.6,.5,.5,M.steel,sx,14,sz-8),box(20.6,.5,.5,M.steel,sx,14,sz+8));
  lifted(g,1,()=>{fence(g,32,28,sx,sz,6);building(g,12,7,4,sx+28,sz+16,M.roofBlue,1);});
  const t1=pylon(g,sx+40,h(sx+40,sz),sz,30),t2=pylon(g,sx+110,h(sx+110,sz-30),sz-30,30);wires(g,[[sx+10,13,sz-5],[sx+10,13,sz],[sx+10,13,sz+5]],t1);wires(g,t1,t2);
  g.userData.rigid=true;
  return g;
}

// ---- Yeşil hidrojen: konteyner tipi elektrolizör yığınları (üstte iki fanlı kuru soğutucu), doğrultucu kabinleri ve trafolar,
// gaz arıtma kolonları ve kompresör binası, boru köprüsü, yatay basınçlı hidrojen tankları, su arıtma tankları, havalandırma
// bacası (elektrolizör çalışırken buhar), tüp treyler dolum alanı ve tırlar, ana trafo, idari bina, çit ----
function electrolyser(mw,parts){
  const g=new THREE.Group(),n=Math.min(8,Math.max(1,Math.ceil(mw/5))),W=n*16,fans=[];
  g.add(pad(W+120,120,M.gravel,.05),padAt(W+12,40,M.concrete,0,-10,.07));
  for(let i=0;i<n;i++){const x=(i-(n-1)/2)*16;
    g.add(box(12.2,2.9,2.45,M.container,x,1.6,-18),box(12.2,2.9,2.45,M.clad,x,1.6,-13.5),box(11,1.1,3,M.grey,x,3.7,-18));
    fans.push([x-2.8,4.4,-18],[x+2.8,4.4,-18]);
    g.add(box(4,2.6,2.4,M.wall,x-3.4,1.4,-3),box(2.4,2.4,2.2,M.dark,x+3,1.3,-3));}
  g.add(inst(new THREE.CylinderGeometry(1.2,1.2,.3,16),M.dark,fans));
  // boru köprüsü: konteynerlerden arıtmaya
  const rx=W/2+8;g.add(inst(new THREE.BoxGeometry(.4,5,.4),M.steel,Array.from({length:n+2},(_,k)=>[-W/2+k*16,2.5,-8])),box(W+18,.4,1.6,M.steel,9,5,-8));
  [-.4,.4].forEach(dz=>g.add(cylBetween([-W/2,5.5,-8+dz],[rx+10,5.5,-8+dz],.22,M.frame,8)));
  // arıtma kolonları ve kompresör binası
  [[rx+6,-22],[rx+12,-22]].forEach(([x,z])=>g.add(cyl(1.3,1.3,10,M.white,x,5,z,16),cyl(1.4,1.4,.6,M.grey,x,10.2,z,16)));
  building(g,20,12,7,rx+22,-8,M.roofGrey,3);
  // yatay hidrojen tankları (beyaz basınçlı kaplar, beton eğerler üstünde)
  const nt=Math.min(6,1+n);for(let j=0;j<nt;j++){const x=-W/2+6+j*9,z=24,t=new THREE.Mesh(new THREE.CylinderGeometry(2.1,2.1,18,22),M.white);
    t.rotation.x=Math.PI/2;t.position.set(x,3,z);t.castShadow=t.receiveShadow=true;g.add(t);
    [-6,6].forEach(dz=>g.add(box(3.2,1.4,1.2,M.concrete,x,.7,z+dz)));}
  // su arıtma: iki tank ve küçük bina
  g.add(cyl(3,3,7,M.tankW,-W/2-18,3.5,-20,24),cyl(3,3,7,M.tankW,-W/2-18,3.5,-8,24));building(g,9,6,3.6,-W/2-30,-14,M.roofBlue,1);
  // havalandırma bacası ve buhar (oksijen ve su buharı; elektrolizör çalışırken)
  const vx=rx+4,vz=8;g.add(cyl(.45,.55,20,M.steel,vx,10,vz,10));
  const pl=new THREE.Group();pl.name="h2vent";[[0,22,0,2.2],[.8,25,.4,2.8],[1.8,28.5,.6,3.4]].forEach(([dx,y,dz,r])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),M.steam);m.position.set(vx+dx,y,vz+dz);pl.add(m);});
  g.add(pl);parts.toggles.push({n:pl.name,k:"h2",f:"run"});parts.drifts.push({name:pl.name,ph:.4,amp:1.2,sp:.7});
  // tüp treyler dolum alanı: iki tır (çekici ve tüp demeti)
  const lx=rx+30;g.add(padAt(34,24,M.asphalt,lx,30,.08));
  [24,36].forEach(z=>{g.add(box(3,3,2.5,M.white,lx-9,1.9,z),box(13,.6,2.5,M.steel,lx+1,1.3,z),
    inst(new THREE.CylinderGeometry(.5,.5,12.5,10).rotateZ(Math.PI/2),M.frame,[[-.7,2.2],[.7,2.2],[-.7,3.3],[.7,3.3]].map(([dz,y])=>[lx+1,y,z+dz])));});
  transformer(g,-W/2-14,10);building(g,14,8,4,-W/2-30,22,M.roofBlue,2);cars(g,[[-W/2-20,34,0],[-W/2-16,34,0]]);
  fence(g,W+124,124,0,0,10);
  return g;
}

// ---- CSP (kule): merkezi beton kule ve tepesinde alıcı (gündüz parlar), çevresinde halka halka heliostatlar (alan kutup
// yönünde daha geniş: o yandaki aynalar güneşi kuleye daha verimli yansıtır), her ayna öğle güneşini kuleye yansıtacak açıda
// (normal = güneş ve kule yönlerinin açıortayı). Kulenin dibinde sıcak ve soğuk erimiş tuz tankları, buhar üreteci, türbin
// salonu, hava soğutmalı kondenser; ekvator yönündeki koridorda yol, şalt sahası ve enerji nakil hattı. Ayna alanı ~9.000
// m²/MW (güneş çarpanı 2, 10 saat depo; temsilî), 8 × 8 m heliostat ----
function cspPlant(mw,lat,parts){
  const g=new THREE.Group(),H=Math.round(80+45*Math.sqrt(mw/10)),hs=8,nH=Math.min(3600,Math.round(mw*140)),pole=lat>=0?-1:1,eq=-pole;
  const cand=[];let r=Math.max(95,H*.8),ring=0;
  while(cand.length<nH*2.2&&ring<240){const n=Math.floor(2*Math.PI*r/(hs*1.55)),off=(ring%2)*.5;
    for(let i=0;i<n;i++){const a=(i+off)/n*2*Math.PI,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.abs(x)<12&&z*eq>0)continue; // ekvator yönünde koridor
      cand.push([x,z,r*(1-.35*z*pole/r)]);}
    r+=hs*1.18+r*.012;ring++;}
  const hel=cand.sort((a,b)=>a[2]-b[2]).slice(0,nH);
  // alanın dış çizgisi: 48 yönde en uzak heliostat (koridor yönü komşulardan), komşularla genişletilir; yol ve çit bunu izler
  const NB=48,rb=Array(NB).fill(0);hel.forEach(([x,z])=>{const i=((Math.round(Math.atan2(z,x)/(2*Math.PI)*NB)%NB)+NB)%NB;rb[i]=Math.max(rb[i],Math.hypot(x,z));});
  for(let i=0;i<NB;i++)if(!rb[i])rb[i]=Math.max(rb[(i+NB-1)%NB],rb[(i+1)%NB]);
  const out=rb.map((_,i)=>Math.max(rb[(i+NB-1)%NB],rb[i],rb[(i+1)%NB])),edge=d=>out.map((r,i)=>[Math.cos(i/NB*2*Math.PI)*(r+d),Math.sin(i/NB*2*Math.PI)*(r+d)]);
  const rMax=out[eq>0?NB/4:3*NB/4];
  const el=(90-Math.min(75,Math.abs(lat)))*RAD,S=new THREE.Vector3(0,Math.sin(el),eq*Math.cos(el)),Rc=new THREE.Vector3(0,H+8,0),up=new THREE.Vector3(0,1,0);
  const mir=new THREE.InstancedMesh(new THREE.BoxGeometry(hs,.15,hs),M.mirror,hel.length),mt=new THREE.Matrix4(),q=new THREE.Quaternion(),one=new THREE.Vector3(1,1,1),P=new THREE.Vector3(),T=new THREE.Vector3();
  hel.forEach(([x,z],i)=>{P.set(x,4.6,z);T.copy(Rc).sub(P).normalize().add(S).normalize();mir.setMatrixAt(i,mt.compose(P,q.setFromUnitVectors(up,T),one));});
  mir.castShadow=mir.receiveShadow=true;g.add(mir,inst(new THREE.CylinderGeometry(.28,.34,4.4,6),M.grey,hel.map(([x,z])=>[x,2.2,z])));
  // kule, alıcı (parlayan kabuk), tepe başlığı ve uçak ikaz lambası
  g.add(cyl(7,10,H,M.dam,0,H/2,0,28),cyl(9,9,20,M.dark,0,H+10,0,28),cyl(7.5,7.5,6,M.dam,0,H+23,0,24));
  const gl=cyl(9.3,9.3,17,M.glow,0,H+10,0,28);gl.castShadow=false;gl.name="cspglow";g.add(gl);parts.toggles.push({n:"cspglow",k:"csp",f:"sun"});
  const bc=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),M.beacon);bc.position.set(0,H+27,0);bc.name="beacon_csp";g.add(bc);parts.beacons.push(bc.name);
  // güç bloğu (iç boşlukta, ekvator yönünde): tuz tankları, buhar üreteci, türbin salonu, kondenser
  const Rt=Math.min(15,8+3*Math.sqrt(mw/5)),zs=eq*30;
  g.add(padAt(110,60,M.concrete,0,eq*38,.07),cyl(Rt,Rt,13,M.frame,-24,6.5,zs,32),cyl(Rt+.3,Rt+.3,.6,M.grey,-24,13.2,zs,32),cyl(Rt,Rt,12,M.tankW,24,6,zs,32),cyl(Rt+.3,Rt+.3,.6,M.grey,24,12.3,zs,32));
  g.add(box(8,18,8,M.white,0,9,eq*30),box(30,13,16,M.clad,0,6.5,eq*58),box(30.6,.7,16.6,M.roofBlue,0,13.3,eq*58));
  const ax=-46,az=eq*52,legs=[],fans=[];for(let i=0;i<3;i++)for(let j=0;j<2;j++)legs.push([ax-10+i*10,5,az-5+j*10]);
  for(let i=0;i<4;i++)for(let j=0;j<2;j++)fans.push([ax-10.5+i*7,10.6,az-3.5+j*7]);
  g.add(inst(new THREE.CylinderGeometry(.4,.4,10,8),M.steel,legs),box(30,1,16,M.grey,ax,10.2,az),inst(new THREE.CylinderGeometry(3,3,.5,18),M.dark,fans));
  [-1,1].forEach(s=>g.add(cylBetween([s*24,10,zs],[s*4,10,zs],.5,M.frame,8)));g.add(cylBetween([0,14,eq*10],[0,H-6,0],.6,M.frame,8));
  // ekvator yönünde yol, alan çevre yolu, şalt sahası, nakil hattı, idari bina, çit
  const zr=eq*(rMax+30);g.add(padAt(7,rMax-30,M.road,0,eq*(rMax+90)/2,.06));roadPoly(g,edge(10),5,M.road,.05);
  const sw=[26,zr];g.add(padAt(30,24,M.gravel,sw[0],sw[1],.06));transformer(g,sw[0]-5,sw[1]);transformer(g,sw[0]+6,sw[1]);fence(g,32,26,sw[0],sw[1],0);
  const t1=pylon(g,26,0,zr+eq*60,30),t2=pylon(g,26,0,zr+eq*140,30);wires(g,[[30,8,zr],[26,8,zr],[22,8,zr]],t1);wires(g,t1,t2);
  building(g,14,8,4,-26,zr,M.roofBlue,2);cars(g,[[-40,zr+eq*8,0],[-36,zr+eq*8,0]]);
  fencePoly(g,edge(18),10,[0,eq*(rMax+18)]);
  return g;
}

// ---- trafo merkezi: iki güç trafosu (radyatör bankları, genleşme tankı, buşingler) ve aralarında yangın duvarı, çelik
// portallar, boru baralar, ayırıcılar ve ölçü trafoları, çakıl saha, kontrol binası, çit ve çıkan enerji nakil hattı ----
function transformer(g,x,z){
  g.add(padAt(9,8,M.concrete,x,z,.09),box(5.2,3.6,3.4,M.tankW,x,2.1,z),box(5.4,.3,3.6,M.grey,x,4,z));
  // radyatör bankları iki yanda (ince dikey levhalar)
  const fins=[];for(const sd of [-1,1])for(let k=0;k<9;k++)fins.push([x-2.2+k*.55,2.1,z+sd*2.35]);
  g.add(inst(new THREE.BoxGeometry(.12,3,1.2),M.grey,fins));
  const c=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,3.6,14),M.tankW);c.rotation.z=Math.PI/2;c.position.set(x-1,4.9,z-1.1);c.castShadow=true;g.add(c);
  [-1.4,0,1.4].forEach(dx=>g.add(cyl(.18,.28,2.8,M.white,x+dx,5.5,z+.6,8),cyl(.32,.32,.12,M.white,x+dx,5.0,z+.6,8),cyl(.32,.32,.12,M.white,x+dx,5.8,z+.6,8)));
}
function substation(g0){
  const g=g0||new THREE.Group();g.add(pad(40,34,M.gravel,.05));
  transformer(g,-7,4);transformer(g,7,4);g.add(box(.5,5.5,7,M.concrete,0,2.75,4)); // yangın duvarı
  // çelik portallar ve boru baralar; portal ile trafo arasında ayırıcılar ve ölçü trafoları
  [-16,16].forEach(x=>{g.add(box(.7,15,.7,M.steel,x,7.5,-10),box(.7,15,.7,M.steel,x,7.5,-2),box(.6,.6,8.7,M.steel,x,14.7,-6));});
  [-9,-6,-3].forEach(z=>g.add(cyl(.12,.12,32,M.frame,0,12.5,z+0,8).rotateZ(Math.PI/2)));
  const iso=[];[-7,7].forEach(x=>[-1.4,0,1.4].forEach(dx=>{iso.push([x+dx,2.2,-4.5],[x+dx,2.2,-8]);}));
  g.add(inst(new THREE.CylinderGeometry(.16,.22,4.4,8),M.white,iso),inst(new THREE.BoxGeometry(.25,.25,3.6),M.frame,[-7,7].flatMap(x=>[-1.4,0,1.4].map(dx=>[x+dx,4.5,-6.2]))));
  building(g,12,6,3.8,0,-22,M.roofGrey,1);g.add(padAt(14,6,M.asphalt,18,-22,.08));cars(g,[[16,-22,0],[20,-22,0]]);
  fencePoly(g,[[-22,-28],[24,-28],[24,19],[-22,19]],6,[0,19]);
  // çıkan enerji nakil hattı: güneye iki direk
  const t1=pylon(g,0,0,56,30),t2=pylon(g,0,0,132,30);wires(g,[[16,14.4,-9],[16,14.4,-6],[16,14.4,-3]],t1);wires(g,t1,t2);
  return g;
}

function hashYaw(id){let h=0;for(const c of id)h=(h*31+c.charCodeAt(0))|0;return ((Math.abs(h)%50)-25)*RAD;}
const seedOf=id=>{let h=7;for(const c of String(id))h=(h*131+c.charCodeAt(0))|0;return Math.abs(h)%100000;};

// türbin boyu ekipman kademesine göre (rotor çapı ve göbek yüksekliği birlikte ölçeklenir)
const TURBINE_SCALE={eco:0.82,std:1,pre:1.14};
// face: harita görüntüsü için türbinlerin hepsi tam güneye (kameraya) döner: tepeden bakan eğik görüntüde rotor diski
// çizgi yerine simetrik bir elips görünür (rastgele ±25° sapma diski kayık bir elipse çeviriyordu). 3D görünümde (face
// yok) sahaya özgü yön kalır ve türbinler rüzgâra döner.
export function buildSite(id,o,ps,face=false){
  if(!M)M=materials();
  const by={},top={};ps.forEach(p=>{by[p.k]=(by[p.k]||0)+p.mw;const q=tierOf(p);if(!top[p.k]||TIER_ORDER.indexOf(q)>TIER_ORDER.indexOf(top[p.k]))top[p.k]=q;});
  const root=new THREE.Scene(),parts={rotors:[],beacons:[],flows:[],leds:[],inv:[],yaws:[],steams:[],smokes:[],tides:[],buoys:[],glints:[],fans:[],drifts:[],belts:[],toggles:[]},groups=[];
  // userData.k: rüzgâr grubunun teknolojisi (haritadaki dönen pervaneler hızını RES ve offshore için ayrı alır)
  const yaw=face?-Math.PI/2:hashYaw(id);
  if(by.res){const g=windFarm(by.res,false,parts,yaw,TURBINE_SCALE[top.res]);g.userData.k="res";groups.push(g);}
  if(by.off){const g=windFarm(by.off,true,parts,yaw,TURBINE_SCALE[top.off]);g.userData.k="off";groups.push(g);}
  if(by.flo){const g=floatFarm(by.flo,parts,yaw,TURBINE_SCALE[top.flo]);g.userData.k="flo";groups.push(g);}
  if(by.ges)groups.push(solarFarm(by.ges,o.lat,parts,top.ges,seedOf(id)));
  if(by.csp)groups.push(cspPlant(by.csp,o.lat,parts));
  if(by.hes)groups.push(hydro(parts,seedOf(id),by.fpv||0,top.fpv,o.lat));
  if(by.phs)groups.push(pumped(by.phs,parts,seedOf(id)));
  if(by.h2)groups.push(electrolyser(by.h2,parts));
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
