// --- Türkiye çevresinde ayrıntılı kıyı (Natural Earth 1:10m; scripts/build_coast_tr.py → data/coast-tr.json) ---
// Oyunun dünya haritası 1:50m kıyısını kullanır; Türkiye kıyılarında bu çizgi ayrıntılı kıyıdan ortanca ~2 km sapar ve kıyıya
// yakın deniz sahaları haritada karada görünürdü. Yükseklik karolarıyla (AWS terrarium z12) yapılan doğrulamada (05.11.2026,
// ~230 nokta) 1:50m kıyı 1–2 km bantta noktaların %37'sini yanlış sınıfladı; 1:10m kıyı 1 km'den uzakta hiç, 0,5–1 km'de %5,
// 0,5 km içinde %29–42 yanlış sınıfladı. Bu yüzden kutu içinde kara/deniz kararı ve kıyıya uzaklık buradan gelir; kıyıya
// SHORE_KM'den yakın şeritte saha açılmaz (veri çözünürlüğü payı; gerçekte de kıyı kenar çizgisinden itibaren 100 m'lik sahil
// şeridinde yapılaşma yasak, 3621 sayılı Kıyı Kanunu). DOM'a bağımlı değildir.
import C from "./data/coast-tr.json";

export const SHORE_KM=1;
const [X0,Y0,X1,Y1]=C.bb,BAND=0.05,CELL=0.1,M=0.02; // kutu kenarındaki kırpma kenarlarından uzak dur
const rings=C.rings.map(r=>{const p=[];for(let i=0;i<r.length;i+=2)p.push([r[i],r[i+1]]);return p;});
const onBox=(a,b)=>(a[0]===b[0]&&(a[0]===X0||a[0]===X1))||(a[1]===b[1]&&(a[1]===Y0||a[1]===Y1));
// kara içi testi için enlem bantları; uzaklık için hücre ızgarası (kutu kenarı kırpma kenarları hariç)
const bands=[],cells=new Map(),NB=Math.ceil((Y1-Y0)/BAND);for(let i=0;i<NB;i++)bands.push([]);
rings.forEach(r=>{for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length];if(a[1]===b[1])continue;
  const s=[a,b],lo=Math.max(0,Math.floor((Math.min(a[1],b[1])-Y0)/BAND)),hi=Math.min(NB-1,Math.floor((Math.max(a[1],b[1])-Y0)/BAND));
  for(let k=lo;k<=hi;k++)bands[k].push(s);}
  for(let i=0;i<r.length;i++){const a=r[i],b=r[(i+1)%r.length];if(onBox(a,b))continue;
    const cx0=Math.floor((Math.min(a[0],b[0])-X0)/CELL),cx1=Math.floor((Math.max(a[0],b[0])-X0)/CELL),cy0=Math.floor((Math.min(a[1],b[1])-Y0)/CELL),cy1=Math.floor((Math.max(a[1],b[1])-Y0)/CELL);
    for(let x=cx0;x<=cx1;x++)for(let y=cy0;y<=cy1;y++){const k=x*1000+y;if(!cells.has(k))cells.set(k,[]);cells.get(k).push([a,b]);}}});

export const inTR=(lon,lat)=>lon>X0+M&&lon<X1-M&&lat>Y0+M&&lat<Y1-M;
// ayrıntılı kıyıya göre kara mı (kutu dışında null)
export function landTR(lon,lat){
  if(!inTR(lon,lat))return null;let ins=false;
  for(const [a,b] of bands[Math.floor((lat-Y0)/BAND)]||[])if((a[1]>lat)!==(b[1]>lat)&&lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])ins=!ins;
  return ins;
}
function segKm(lat,lon,a,b){const sx=111.32*Math.cos(lat*Math.PI/180),sy=110.57,ax=(a[0]-lon)*sx,ay=(a[1]-lat)*sy,bx=(b[0]-lon)*sx,by=(b[1]-lat)*sy,dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy;
  const t=L?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/L)):0;return Math.hypot(ax+t*dx,ay+t*dy);}
// ayrıntılı kıyıya uzaklık (km; maxKm'den uzaksa Infinity, kutu dışında null)
export function coastKmTR(lon,lat,maxKm=25){
  if(!inTR(lon,lat))return null;const rx=Math.ceil(maxKm/(111.32*Math.cos(lat*Math.PI/180))/CELL),ry=Math.ceil(maxKm/110.57/CELL);
  const cx=Math.floor((lon-X0)/CELL),cy=Math.floor((lat-Y0)/CELL);let best=Infinity;
  for(let x=cx-rx;x<=cx+rx;x++)for(let y=cy-ry;y<=cy+ry;y++){const L=cells.get(x*1000+y);if(L)for(const [a,b] of L)best=Math.min(best,segKm(lat,lon,a,b));}
  return best<=maxKm?best:Infinity;
}
// Eski kayıtlardaki saha: istenen tarafta (deniz ya da kara) ve kıyıya en az SHORE_KM + 0,2 km uzaktaki en yakın nokta
// (çevresinde 250 m adımlarla 8 km'ye kadar, 24 yön). Bulunamazsa null.
export function nearestValid(lon,lat,wantSea,ok=()=>true){
  if(landTR(lon,lat)===null)return null;const kx=111.32*Math.cos(lat*Math.PI/180),ky=110.57;
  const good=(x,y)=>landTR(x,y)===!wantSea&&coastKmTR(x,y,SHORE_KM+1)>=SHORE_KM+0.2&&ok(x,y);
  if(good(lon,lat))return {lon,lat,km:0};
  for(let r=0.25;r<=8;r+=0.25)for(let i=0;i<24;i++){const a=i/24*2*Math.PI,x=lon+Math.cos(a)*r/kx,y=lat+Math.sin(a)*r/ky;
    if(good(x,y))return {lon:+x.toFixed(4),lat:+y.toFixed(4),km:r};}
  return null;
}
