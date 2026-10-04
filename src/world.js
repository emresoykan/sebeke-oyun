// --- Gerçek dünya: ülke, arazi, kıyı ve şehir sorguları ---
// Veri: Natural Earth (kamu malı), scripts/build_geo.py ile src/data altına üretilir.
import countries from "./data/countries.json";
import terrain from "./data/terrain.json";
import coast from "./data/coast.json";
import cities from "./data/cities.json";
import { PROTECTED } from "./data/protected.js";
import { MARKETS, COAST_KM, SHALLOW_KM } from "./config.js";

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

// Bir noktanın oyun özellikleri (eski kare nesnesiyle aynı alanlar + ülke/şehir bilgisi)
export function describe(lat,lon){
  lon=((lon+540)%360)-180;lat=Math.max(-89.9,Math.min(89.9,lat));
  const t={lat:+lat.toFixed(3),lon:+lon.toFixed(3)},c=countryAt(lon,lat);
  if(c){
    t.reg=c.m;t.sea=false;t.country=c.n;t.a3=c.a3;
    const park=protectedAt(lat,lon);if(park)t.park=park;
    t.ter=(c.m==="G"||c.m==="X")?"i":park?"p":(terrainAt(lon,lat)||(forestRule(c.a3,lat)?"f":"pl"));
    t.mreg=MARKETS.includes(c.m)?c.m:null;
    const coastNear=coastKm(lon,lat)<=COAST_KM;
    t.solar=Math.max(0.15,Math.min(1,Math.min(1,Math.max(0.2,1.05-Math.abs(lat)/75))+(t.ter==="d"?0.15:0)-(t.ter==="f"?0.15:0)));
    t.wind=Math.max(0.15,Math.min(0.95,0.35+(Math.abs(lat)>=40?0.25:0)+(coastNear?0.12:0)+(t.ter==="m"?0.08:0)-(t.ter==="f"?0.1:0)));
    t.hydro=t.ter==="m"?0.8:0;
  }else{
    t.reg=null;t.sea=true;const n=nearestCountry(lon,lat,SHALLOW_KM);
    t.shallow=!!n&&MARKETS.includes(n.m)&&Math.abs(lat)<66;
    if(t.shallow){t.mreg=n.m;t.country=n.n;t.wind=0.7+(Math.abs(lat)>=40?0.15:0);t.solar=0;t.hydro=0;}
  }
  const ct=nearestCity(lat,lon);t.city=ct.n;t.cityKm=Math.round(ct.km);
  return t;
}
// Bildirim ve panel metinleri için kısa yer adı
export function placeName(t){return t.sea?`${t.city} açıkları${t.country?" ("+t.country+")":""}`:`${t.city} yakını, ${t.country}`;}
