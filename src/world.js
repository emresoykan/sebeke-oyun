// --- Gerçek dünya: ülke, arazi, kıyı ve şehir sorguları ---
// Veri: Natural Earth (kamu malı), scripts/build_geo.py ile src/data altına üretilir.
import countries from "./data/countries.json";
import terrain from "./data/terrain.json";
import coast from "./data/coast.json";
import cities from "./data/cities.json";
import { PROTECTED } from "./data/protected.js";
import { GHI, WS50 } from "./data/resource.js";
import { urbanAt } from "./urban.js";
import { MARKETS, COAST_KM, SHALLOW_KM, FLOAT_KM } from "./config.js";

const R=6371, rad=Math.PI/180;
export function km(lat1,lon1,lat2,lon2){const a=Math.sin((lat2-lat1)*rad/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin((lon2-lon1)*rad/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(a)));}

function bboxOf(polys){let a=180,b=90,c=-180,d=-90;polys.forEach(p=>p[0].forEach(([x,y])=>{if(x<a)a=x;if(y<b)b=y;if(x>c)c=x;if(y>d)d=y;}));return[a,b,c,d];}
function inRing(r,x,y){let ins=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const[xi,yi]=r[i],[xj,yj]=r[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)ins=!ins;}return ins;}
function inPolys(polys,x,y){return polys.some(p=>inRing(p[0],x,y)&&!p.slice(1).some(h=>inRing(h,x,y)));}

const C=countries.features.map(f=>({...f.properties,polys:f.geometry.coordinates,bb:bboxOf(f.geometry.coordinates)}));
const TR=terrain.map(t=>({...t,bb:bboxOf(t.p)}));
const inBB=(bb,x,y,m=0)=>x>=bb[0]-m&&x<=bb[2]+m&&y>=bb[1]-m&&y<=bb[3]+m;

export function countryAt(lon,lat){return C.find(c=>inBB(c.bb,lon,lat)&&inPolys(c.polys,lon,lat))||null;}
function terrainAt(lon,lat){const hit=t=>TR.some(r=>r.t===t&&inBB(r.bb,lon,lat)&&inPolys(r.p,lon,lat));return hit("m")?"m":hit("d")?"d":hit("f")?"f":null;}
// Natural Earth'te orman örtüsü yok; kuzey tayga kuşağı ve Güneydoğu Asya yağmur ormanları için kaba kural
function forestRule(a3,lat){return(lat>=50&&lat<=62&&["CAN","RUS","FIN","SWE"].includes(a3))||(Math.abs(lat)<8&&["IDN","MYS","BRN","PNG"].includes(a3));}
export function protectedAt(lat,lon){const p=PROTECTED.find(([,a,b,r])=>km(lat,lon,a,b)<=r);return p?p[0]:null;}

// Nokta ile çoklu çizgi arasındaki en kısa mesafe (km), yerel eşdikdörtgen yaklaşımla
function segKm(lat,lon,line){const kx=111.32*Math.cos(lat*rad),ky=110.57;let best=Infinity;
  for(let i=1;i<line.length;i++){const ax=(line[i-1][0]-lon)*kx,ay=(line[i-1][1]-lat)*ky,bx=(line[i][0]-lon)*kx,by=(line[i][1]-lat)*ky,dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy;
    const t=L?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/L)):0,x=ax+t*dx,y=ay+t*dy,d=Math.sqrt(x*x+y*y);if(d<best)best=d;}return best;}
const CO=coast.map(l=>({l,bb:bboxOf([[l]])}));
const degM=(k,lat)=>k/(111*Math.max(0.2,Math.cos(lat*rad)));
function coastKm(lon,lat){const m=degM(COAST_KM,lat);let best=Infinity;CO.forEach(c=>{if(inBB(c.bb,lon,lat,m))best=Math.min(best,segKm(lat,lon,c.l));});return best;}
function nearestCountry(lon,lat,maxKm){const m=degM(maxKm,lat);let best=null,bd=Infinity;
  C.forEach(c=>{if(!inBB(c.bb,lon,lat,m))return;c.polys.forEach(p=>{const d=segKm(lat,lon,p[0]);if(d<bd){bd=d;best=c;}});});return bd<=maxKm?best:null;}
export function nearestCity(lat,lon){let best=null,bd=Infinity;for(const c of cities){const d=km(lat,lon,c[2],c[3]);if(d<bd){bd=d;best=c;}}return{n:best[0],a3:best[1],km:bd};}

// Jeotermal kuşaklar (levha sınırları ve volkanik bölgeler, kaba): [enlem, boylam, yarıçap km, kaynak gücü]
const GEO_ZONES=[[38.0,28.4,190,1.0],[39.6,26.2,70,0.6],[38.7,30.5,90,0.5],[64.9,-18.7,260,1.0],[43.2,10.9,70,0.9],[40.8,14.1,50,0.6],
  [-0.8,36.3,260,0.95],[8.6,39.6,280,0.7],[-7.3,107.8,420,0.9],[1.5,99.3,420,0.8],[11.5,124.3,520,0.9],[-38.6,176.1,160,1.0],
  [38.8,-122.8,150,0.9],[33.0,-115.6,120,0.8],[39.6,-118.4,260,0.7],[19.8,-100.7,160,0.7],[13.4,-88.6,320,0.75],[10.6,-85.3,150,0.6],
  [39.0,140.8,420,0.7],[53.1,158.0,220,0.6],[-22.3,-68.2,320,0.5],[-1.0,-78.5,220,0.5],[36.7,24.4,70,0.5],[44.6,-110.6,150,0.6]];
// Güçlü gelgit kıyıları: [enlem, boylam, yarıçap km, gelgit gücü]; diğer sığ denizlerde zayıf (iç denizlerde neredeyse yok)
const TIDE_ZONES=[[45.3,-64.6,260,1.0],[51.3,-3.4,200,0.9],[58.7,-3.1,180,0.95],[48.7,-2.0,220,0.9],[37.2,126.4,260,0.8],[-16.0,124.0,420,0.85],
  [61.0,-150.5,250,0.8],[21.3,72.4,220,0.75],[-50.5,-68.8,320,0.75],[30.2,122.2,260,0.6],[65.0,36.0,260,0.55],[53.2,8.3,220,0.45],[-27.0,153.3,200,0.3]];
const zoneAt=(Z,lat,lon)=>Z.reduce((b,[a,o,r,v])=>{const d=km(lat,lon,a,o);return d<r?Math.max(b,v*(1-0.5*d/r)):b;},0);
export const geoAt=(lat,lon)=>+zoneAt(GEO_ZONES,lat,lon).toFixed(2);
export const tideAt=(lat,lon)=>{const v=zoneAt(TIDE_ZONES,lat,lon);return +Math.max(v,(Math.abs(lat)>25&&Math.abs(lat)<62?0.2:0.12)).toFixed(2);};
// Biyokütle hammaddesi: ova (tarım atığı) ve orman (orman atığı) bol, dağlık orta, çölde yok
const BIO={pl:0.8,f:0.9,m:0.45,d:0.1,p:0,i:0};
// Eski kayıtlardaki sahalarda yeni kaynak alanları yok: konumdan tamamlanır
export function fillRes(t){
  if(t.sea){if(t.shallow&&t.tide==null)t.tide=tideAt(t.lat,t.lon);}
  else{if(t.geo==null)t.geo=geoAt(t.lat,t.lon);if(t.bio==null)t.bio=BIO[t.ter]??0;}
  return t;
}

// Bir noktanın oyun özellikleri (eski kare nesnesiyle aynı alanlar + ülke/şehir bilgisi)
// --- Güneş ve rüzgâr kaynağı: NASA POWER uzun dönem yıllık ortalamaları (src/data/resource.js, CC BY 4.0) ---
// Izgara bayt dizisi olarak gömülüdür; nokta değeri çift doğrusal aradeğerlemeyle okunur (boylamda dünya etrafında sarar).
function decode(g){const b=atob(g.b64),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return {...g,a};}
const GG=decode(GHI),WG=decode(WS50);
function sample(g,lat,lon){
  const y=Math.max(0,Math.min(g.rows-1.001,(lat-g.lat0)/g.dlat)),x=((lon-g.lon0)/g.dlon%g.cols+g.cols)%g.cols;
  const i=Math.floor(y),j=Math.floor(x),fy=y-i,fx=x-j,j2=(j+1)%g.cols,v=(r,c)=>g.a[r*g.cols+c];
  return g.step*((v(i,j)*(1-fx)+v(i,j2)*fx)*(1-fy)+(v(i+1,j)*(1-fx)+v(i+1,j2)*fx)*fy);
}
// Yatay ışınım (kWh/m²/gün) ve 100 m göbek yüksekliğinde ortalama rüzgâr (50 m verisinden, yüzey pürüzlülüğü üssü 0,14)
export const ghiAt=(lat,lon)=>sample(GG,lat,lon)*24/1000;
export const wind100At=(lat,lon)=>sample(WG,lat,lon)*1.102;
// Güneş puanı yıllık ışınımla orantılı (GES üretimi de öyle): 9 kWh/m²/gün = 1. Türkiye ortalaması eski modelle aynı kalır
// (Konya ~4,9 → 0,55); çöller daha yüksek, bulutlu kuzey daha düşük çıkar.
const sunOf=(lat,lon)=>Math.max(0.12,Math.min(1,ghiAt(lat,lon)/9));
// Rüzgâr puanı oyunun hava modelindeki ortalama göbek hızına çevrilir: hız = 4 + 8,5 × puan (weather.js siteBase).
// 0,5°'lik veri sırt ve boğazlardaki yerel hızlanmayı ortalar; dağlık arazide +0,8 m/s, kıyıda +0,3 m/s eklenir, ormanda
// pürüzlülük nedeniyle 0,5 m/s düşülür. Karada hız ayrıca ülkeye (yoksa piyasaya) göre bir katsayıyla çarpılır; katsayı,
// oyunun o ülkedeki rüzgâr santrali filosunun yıllık kapasite faktörünü 2025 gerçekleşmesine eşitler (docs/kalibrasyon.md):
//  TUR (T): işletmedeki santrallerin il dağılımı (EPDK) ile TEİAŞ (~%33). Santraller hücre ortalamasından rüzgârlı sırt ve
//      tepelere kurulur; veri bunu ortaladığı için katsayı 1'in biraz üstünde.
//  DEU: ENTSO-E aylık üretim ve kurulu güç (~%20); ESP: ENTSO-E (~%20,5). Veri bu ülkelerde gerçeğin üstünde kalıyor.
//  Avrupa'nın diğer ülkeleri DEU ve ESP ortalaması; diğer piyasalar kalibre edilmedi (1).
export const LAND_K={T:1.02,E:0.83}, LAND_KC={DEU:0.73,ESP:0.925};
const landK=(m,a3)=>LAND_KC[a3]??LAND_K[m]??1;
const windScore=v=>Math.max(0.05,Math.min(0.95,(v-4)/8.5));
const windOf=(lat,lon,ter,coastNear,m,a3)=>windScore(landK(m,a3)*(wind100At(lat,lon)+(ter==="m"?0.8:0)+(coastNear?0.3:0)-(ter==="f"?0.5:0)));
// Deniz: SEA_K aynı yöntemle; E: Almanya deniz üstü rüzgârı (ENTSO-E 2025, ~%31). Diğer piyasalarda veri yok (1).
export const SEA_K={E:0.725};
const seaWindOf=(lat,lon,m)=>windScore((SEA_K[m]??1)*wind100At(lat,lon));
function landTer(c,lat,lon){const park=protectedAt(lat,lon);return {park,ter:(c.m==="G"||c.m==="X")?"i":park?"p":(terrainAt(lon,lat)||(forestRule(c.a3,lat)?"f":"pl"))};}
// Potansiyel haritası için: şehir araması olmadan yalnızca puanlar. Kurulamayan yer (buz örtüsü, Antarktika, derin deniz,
// piyasa dışı) null döner. Korunan alanlarda puan döner ama p=1 işaretlenir (izin neredeyse çıkmaz).
export function potentialAt(lat,lon){
  lon=((lon+540)%360)-180;lat=Math.max(-89.9,Math.min(89.9,lat));
  const c=countryAt(lon,lat);
  if(c){if(c.m==="G"||c.m==="X"||!MARKETS.includes(c.m)||urbanAt(lat,lon)===true)return null;const {park,ter}=landTer(c,lat,lon);
    return {s:sunOf(lat,lon),w:windOf(lat,lon,ter,coastKm(lon,lat)<=COAST_KM,c.m,c.a3),p:park?1:0};}
  const n=nearestCountry(lon,lat,SHALLOW_KM)||(Math.abs(lat)<66?nearestCountry(lon,lat,FLOAT_KM):null); // derin bant: yalnızca yüzer rüzgâr
  return n&&MARKETS.includes(n.m)&&Math.abs(lat)<66&&urbanAt(lat,lon)!==true?{s:0,w:seaWindOf(lat,lon,n.m),p:0}:null;
}

export function describe(lat,lon){
  lon=((lon+540)%360)-180;lat=Math.max(-89.9,Math.min(89.9,lat));
  const t={lat:+lat.toFixed(3),lon:+lon.toFixed(3)},c=countryAt(lon,lat);
  if(c){
    t.reg=c.m;t.sea=false;t.country=c.n;t.a3=c.a3;
    const {park,ter}=landTer(c,lat,lon);if(park)t.park=park;t.ter=ter;
    t.mreg=MARKETS.includes(c.m)?c.m:null;
    const coastNear=coastKm(lon,lat)<=COAST_KM;
    t.solar=sunOf(lat,lon);t.wind=windOf(lat,lon,t.ter,coastNear,c.m,c.a3);
    t.hydro=t.ter==="m"?0.8:0;
    t.geo=t.ter==="i"?0:geoAt(lat,lon);t.bio=BIO[t.ter]??0;
  }else{
    t.reg=null;t.sea=true;const n=nearestCountry(lon,lat,SHALLOW_KM);
    t.shallow=!!n&&MARKETS.includes(n.m)&&Math.abs(lat)<66;
    if(t.shallow){t.mreg=n.m;t.country=n.n;t.a3=n.a3;t.wind=seaWindOf(lat,lon,n.m);t.solar=0;t.hydro=0;t.tide=tideAt(lat,lon);}
    // derin deniz bandı (kıyıya SHALLOW_KM–FLOAT_KM): sabit temel kurulamaz, yalnızca yüzer rüzgâr
    else if(Math.abs(lat)<66){const d=nearestCountry(lon,lat,FLOAT_KM);if(d&&MARKETS.includes(d.m)){t.deep=true;t.mreg=d.m;t.country=d.n;t.a3=d.a3;t.wind=seaWindOf(lat,lon,d.m);t.solar=0;t.hydro=0;}}
  }
  const ct=nearestCity(lat,lon);t.city=ct.n;t.cityKm=Math.round(ct.km);
  // yerleşim alanı: kentsel alan poligonu (urban.js) ya da büyük bir şehrin merkezine 2 km'den yakın; arazi satın alınamaz.
  // Kaba kıyı çizgisinin denize düşürdüğü kıyı kent dokusu da (ör. İstanbul'un boğaz kıyısı) kapsanır.
  if(urbanAt(lat,lon)===true||(!t.sea&&ct.km<2))t.urban=true;
  return t;
}
// Yer arama için: şehirler (nüfusa göre sıralı) ve ülkeler (en büyük kara parçasının kutusunun ortası ve genişliği)
export const cityList=()=>cities;
export function countryList(){
  return C.map(c=>{let bb=null,ba=-1;c.polys.forEach(p=>{const b=bboxOf([p]),a=(b[2]-b[0])*(b[3]-b[1]);if(a>ba){ba=a;bb=b;}});
    return {n:c.n,a3:c.a3,lat:(bb[1]+bb[3])/2,lon:(bb[0]+bb[2])/2,span:Math.max(bb[2]-bb[0],bb[3]-bb[1])};});
}
// Bildirim ve panel metinleri için kısa yer adı
export function placeName(t){return t.sea?`${t.city} açıkları${t.country?" ("+t.country+")":""}`:`${t.city} yakını, ${t.country}`;}
