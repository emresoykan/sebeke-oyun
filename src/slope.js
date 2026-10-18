// --- Arazi eğimi: seçilen noktanın çevresindeki gerçek yükseklik verisinden ---
// Kaynak: AWS Open Data Terrain Tiles (terrarium kodlamalı PNG; Türkiye ve Avrupa'da büyük ölçüde SRTM/ EU-DEM, ~30 m).
// 12. yakınlık karoları (~30 m/piksel, 38° enlemde) indirilir; noktanın 250 m çevresindeki her pikselin eğimi
// komşu yükseklik farklarından hesaplanır. Sonuç: ortalama eğim (%), yamacın baktığı yön ve güneye bakıp bakmadığı.
// Karolar ve sonuçlar önbelleğe alınır. Ağ yoksa ölçüm yapılamaz (null): kural uygulanmaz, panel bunu söyler.
const Z=12, R_M=250, URL="https://s3.amazonaws.com/elevation-tiles-prod/terrarium";
const tiles=new Map(), results=new Map(), pending=new Map();
const key=(lat,lon)=>lat.toFixed(4)+","+lon.toFixed(4);

// eşzamanlı okuma: ölçüldüyse sonuç ({mean,aspect,south} veya ölçülemediyse null), henüz ölçülmediyse undefined
export const slopeCached=(lat,lon)=>results.get(key(lat,lon));

async function tile(x,y){
  const k=x+"/"+y;if(tiles.has(k))return tiles.get(k);
  const p=fetch(`${URL}/${Z}/${x}/${y}.png`).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.blob();}).then(createImageBitmap).then(b=>{
    const c=typeof OffscreenCanvas!=="undefined"?new OffscreenCanvas(256,256):Object.assign(document.createElement("canvas"),{width:256,height:256});
    const g=c.getContext("2d",{willReadFrequently:true});g.drawImage(b,0,0);const d=g.getImageData(0,0,256,256).data,e=new Float32Array(65536);
    for(let i=0;i<65536;i++)e[i]=d[i*4]*256+d[i*4+1]+d[i*4+2]/256-32768;return e;});
  tiles.set(k,p);if(tiles.size>48)tiles.delete(tiles.keys().next().value);
  p.catch(()=>tiles.delete(k));return p;
}

// noktanın çevresinin eğimi (Promise): {mean: ortalama eğim %, aspect: yamacın baktığı yön (kuzeyden saat yönünde °), south: güneye bakıyor mu}
export function slopeOf(lat,lon){
  const k=key(lat,lon);if(results.has(k))return Promise.resolve(results.get(k));if(pending.has(k))return pending.get(k);
  const p=Promise.race([measure(lat,lon),new Promise((_,j)=>setTimeout(()=>j(new Error("zaman aşımı")),8000))]).catch(e=>{console.warn("Arazi eğimi ölçülemedi:",e);return null;}).then(r=>{results.set(k,r);pending.delete(k);return r;});
  pending.set(k,p);return p;
}
async function measure(lat,lon){
  const n=2**Z,fx=(lon+180)/360*n*256,s=Math.sin(lat*Math.PI/180),fy=(0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*n*256;
  const px=40075016.7*Math.cos(lat*Math.PI/180)/(n*256),r=Math.ceil(R_M/px)+1; // piksel boyu (m) ve pencere yarıçapı (piksel)
  const x0=Math.floor(fx-r),x1=Math.floor(fx+r),y0=Math.floor(fy-r),y1=Math.floor(fy+r),need=new Map();
  for(let ty=Math.floor(y0/256);ty<=Math.floor(y1/256);ty++)for(let tx=Math.floor(x0/256);tx<=Math.floor(x1/256);tx++)need.set(tx+"/"+ty,tile(((tx%n)+n)%n,ty));
  const T=new Map();for(const [k,p] of need)T.set(k,await p);
  const el=(X,Y)=>{const tx=Math.floor(X/256),ty=Math.floor(Y/256);return T.get(tx+"/"+ty)[(Y-ty*256)*256+(X-tx*256)];};
  let sum=0,cnt=0,gx=0,gy=0;
  for(let Y=y0+1;Y<y1;Y++)for(let X=x0+1;X<x1;X++){
    if((X-fx)**2+(Y-fy)**2>(R_M/px)**2)continue;
    const dx=(el(X+1,Y)-el(X-1,Y))/(2*px),dy=(el(X,Y+1)-el(X,Y-1))/(2*px); // doğuya ve güneye doğru yükselme
    sum+=Math.hypot(dx,dy);gx+=dx;gy+=dy;cnt++;
  }
  if(!cnt)return null;
  // yamacın baktığı yön = en dik iniş yönü: doğu bileşeni -dx, kuzey bileşeni +dy (görüntüde y güneye artar)
  const aspect=((Math.atan2(-gx,gy)*180/Math.PI)+360)%360,net=Math.hypot(gx,gy)/cnt;
  const south=net>0.02&&(lat>=0?aspect>=135&&aspect<=225:aspect<=45||aspect>=315);
  return {mean:+(sum/cnt*100).toFixed(1),aspect:Math.round(aspect),south};
}
