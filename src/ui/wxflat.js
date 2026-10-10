// --- Düz haritada hava durumu: bulut örtüsü, yağmur ve fırtına bulutları, şimşek, fırtına uyarı halkaları ---
// Bulut dokusu Web Mercator satırlarıyla (512x512) çizilir ve dünyayı kaplayan bir tuval kaynağı olarak haritaya verilir;
// yalnızca oyun saati değişince yeniden çizilir. Bulutların gece tarafı karartılır; yakınlaştıkça katman incelir.
import { S } from "../state.js";
import { sampleWx } from "../weather.js";
import { snap, frac } from "../wxsite.js";
import { CAL } from "../calendar.js";
import { FONT, MAXLAT } from "./mapstyle.js";

const W=512,H=512,GW=96,GH=64,PREF="sebeke-wx-layer";
const reduced=matchMedia("(prefers-reduced-motion: reduce)");
let map=null,on=true,cv=null,img=null,noise=null,cloudKey=null,lastDraw=0,flashT=null;
try{on=localStorage.getItem(PREF)!=="0";}catch(e){}
const fc=features=>({type:"FeatureCollection",features});
// Mercator: satır → enlem
const latOfY=y=>Math.atan(Math.sinh(Math.PI*(1-2*y/H)))*180/Math.PI,lonOf=x=>x/W*360-180;
const GLAT=Array.from({length:GH},(_,j)=>latOfY((j+0.5)/GH*H));
const COL_I=new Int32Array(W),COL_J=new Int32Array(W),COL_F=new Float32Array(W),ROW_J=new Int32Array(H),ROW_F=new Float32Array(H),ROW_C=new Float32Array(H),ROW_S=new Float32Array(H),COS=new Float32Array(W);
for(let x=0;x<W;x++){const gx=(x+0.5)/W*GW-0.5,i0=Math.floor(gx);COL_I[x]=(i0+GW)%GW;COL_J[x]=(i0+1)%GW;COL_F[x]=gx-i0;}
for(let y=0;y<H;y++){const gy=Math.min(GH-1.001,Math.max(0,(y+0.5)/H*GH-0.5)),j0=Math.floor(gy),la=latOfY(y+0.5)*Math.PI/180;ROW_J[y]=j0;ROW_F[y]=gy-j0;ROW_C[y]=Math.cos(la);ROW_S[y]=Math.sin(la);}

// Yatayda kendini tekrarlayan bulut dokusu (değer gürültüsü)
function makeNoise(){
  const n=new Float32Array(W*H),rnd=(x,y,s)=>{const h=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return h-Math.floor(h);};
  for(let o=0,amp=0.5,cell=32;o<5;o++,amp*=0.55,cell/=2){const cx=W/cell,cy=H/cell;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const gx=x/cell,gy=y/cell,x0=Math.floor(gx),y0=Math.floor(gy),fx=gx-x0,fy=gy-y0,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
      const v=(i,j)=>rnd((x0+i)%cx,Math.min(y0+j,cy),o);
      n[y*W+x]+=amp*((v(0,0)*(1-sx)+v(1,0)*sx)*(1-sy)+(v(0,1)*(1-sx)+v(1,1)*sx)*sy);}}
  return n;
}

function drawClouds(){
  const g=cv.getContext("2d");
  if(!on){g.clearRect(0,0,W,H);return;}
  const wx=snap(Math.min(S.hour,23),frac()),grid=new Float32Array(GW*GH*3);
  for(let j=0;j<GH;j++)for(let i=0;i<GW;i++){const w=sampleWx(wx,GLAT[j],(i+0.5)/GW*360-180),k=(j*GW+i)*3;grid[k]=w.c;grid[k+1]=w.rain;grid[k+2]=w.storm;}
  img=img||g.createImageData(W,H);const d=img.data;
  const hr=Math.min(S.hour,23)+frac(),sub=(12-(hr-3))*15,drift=Math.floor(((S.wx&&S.wx.t)||0)*1.5+hr*1.5)%W;
  for(let x=0;x<W;x++)COS[x]=Math.cos((lonOf(x)-sub)*Math.PI/180);
  const sd=Math.sin(CAL.decl*Math.PI/180),cd=Math.cos(CAL.decl*Math.PI/180);
  for(let y=0;y<H;y++){const j0=ROW_J[y],fy=ROW_F[y],cl=ROW_C[y]*cd,sl=ROW_S[y]*sd,r0=j0*GW*3,r1=(j0+1)*GW*3,nrow=y*W;
    for(let x=0;x<W;x++){
      const a0=r0+COL_I[x]*3,b0=r0+COL_J[x]*3,a1=r1+COL_I[x]*3,b1=r1+COL_J[x]*3,fx=COL_F[x],w00=(1-fx)*(1-fy),w10=fx*(1-fy),w01=(1-fx)*fy,w11=fx*fy;
      const cc=grid[a0]*w00+grid[b0]*w10+grid[a1]*w01+grid[b1]*w11,p=(nrow+x)*4;
      const det=cc*0.85+(noise[nrow+(x+drift)%W]-0.5)*1.1,a=(det-0.36)/0.22;
      if(a<=0.01){d[p+3]=0;continue;}
      const rn=grid[a0+1]*w00+grid[b0+1]*w10+grid[a1+1]*w01+grid[b1+1]*w11,sm=grid[a0+2]*w00+grid[b0+2]*w10+grid[a1+2]*w01+grid[b1+2]*w11;
      const cosz=sl+cl*COS[x],l=(cosz+0.3)/0.65,lit=0.25+0.75*(l<0?0:l>1?1:l);
      const dark=Math.min(1,rn*0.5+sm*0.45),cov=cc+rn*0.5;
      d[p]=(246-80*dark)*lit;d[p+1]=(247-72*dark)*lit;d[p+2]=(251-55*dark)*lit;d[p+3]=225*(a>1?1:a)*(0.7+0.3*(cov>1?1:cov));
    }}
  g.putImageData(img,0,0);
}
// tuval kaynağı yalnızca istenince yeniden yüklenir (sürekli çizim yok)
function refreshCanvas(){const s=map.getSource("clouds");if(!s)return;s.play();requestAnimationFrame(()=>requestAnimationFrame(()=>s.pause()));}

// Fırtına hücreleri: kesikli halka, kuzey kenarında etiket, merkezde şimşek parlaması
function drawStorms(){
  const wx=snap(Math.min(S.hour,23),frac()),storms=on?wx.sys.filter(s=>s.type==="storm"&&s.age/s.life>0.15&&s.age/s.life<0.9):[];
  const ring=s=>{const pts=[];for(let k=0;k<=48;k++){const a=k/48*2*Math.PI;pts.push([s.lon+s.r*0.75*Math.cos(a)/(111.32*Math.max(0.2,Math.cos(s.lat*Math.PI/180))),s.lat+s.r*0.75*Math.sin(a)/110.57]);}return pts;};
  map.getSource("storm-rings").setData(fc(storms.map(s=>({type:"Feature",properties:{},geometry:{type:"LineString",coordinates:ring(s)}}))));
  map.getSource("storm-labels").setData(fc(storms.map(s=>({type:"Feature",properties:{},geometry:{type:"Point",coordinates:[s.lon,s.lat+s.r*0.75/110.57]}}))));
  const flash=reduced.matches?[]:storms.filter(s=>s.age/s.life>0.25&&s.age/s.life<0.8&&Math.random()<0.35);
  map.getSource("lightning").setData(fc(flash.map(s=>({type:"Feature",properties:{},geometry:{type:"Point",coordinates:[s.lon,s.lat]}}))));
  if(flash.length){map.setPaintProperty("lightning","circle-opacity",0.9);clearTimeout(flashT);flashT=setTimeout(()=>map.setPaintProperty("lightning","circle-opacity",0),180);}
}

function update(force){
  const key=`${S.dayNo}:${S.hour}`,now=performance.now();
  if(force||(key!==cloudKey&&now-lastDraw>1200)){cloudKey=key;lastDraw=now;drawClouds();refreshCanvas();drawStorms();}
}

export function initWeatherLayer(m){
  map=m;noise=makeNoise();cv=document.createElement("canvas");cv.width=W;cv.height=H;drawClouds();
  const before="labels-start";
  map.addSource("clouds",{type:"canvas",canvas:cv,animate:false,coordinates:[[-180,MAXLAT],[180,MAXLAT],[180,-MAXLAT],[-180,-MAXLAT]]});
  map.addLayer({id:"clouds",type:"raster",source:"clouds",layout:{visibility:on?"visible":"none"},paint:{"raster-fade-duration":0,"raster-resampling":"linear",
    "raster-opacity":["interpolate",["linear"],["zoom"],2,0.9,4,0.5,5,0.2,6,0]}},before);
  ["storm-rings","storm-labels","lightning"].forEach(id=>map.addSource(id,{type:"geojson",data:fc([])}));
  map.addLayer({id:"lightning",type:"circle",source:"lightning",paint:{"circle-radius":16,"circle-color":"#EAF0FF","circle-blur":0.9,"circle-opacity":0}},before);
  map.addLayer({id:"storm-rings",type:"line",source:"storm-rings",paint:{"line-color":"#FF6B6B","line-width":2.2,"line-dasharray":[3,2]}},before);
  map.addLayer({id:"storm-labels",type:"symbol",source:"storm-labels",maxzoom:9,layout:{"text-field":"Fırtına","text-font":FONT.m,"text-size":13,"text-anchor":"bottom","text-offset":[0,-0.3],"text-allow-overlap":true},
    paint:{"text-color":"#FFFFFF","text-halo-color":"#5A0A12","text-halo-width":1.6}},before);
  update(true);
  setInterval(()=>update(false),400);
}

export function initWeatherToggle(btn){
  const lbl=()=>{btn.textContent=on?"Hava katmanı: açık":"Hava katmanı: kapalı";btn.setAttribute("aria-pressed",on);};
  lbl();btn.onclick=()=>{on=!on;try{localStorage.setItem(PREF,on?"1":"0");}catch(e){}lbl();
    if(map){map.setLayoutProperty("clouds","visibility",on?"visible":"none");update(true);}
    window.dispatchEvent(new CustomEvent("sebeke:wx",{detail:on}));};
}
