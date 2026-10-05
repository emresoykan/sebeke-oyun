// --- Haritada hava durumu: bulut örtüsü, yağmur ve fırtına bulutları, şimşek, rüzgâr okları, fırtına uyarı halkaları ---
// Bulutlar 6 km yükseklikte, tüm küreyi saran yarı saydam bir katmandır; doku her ~0,35 sn'de hava sistemlerinin o anki
// (iki oyun saati arasında ara değerli) konumundan yeniden çizilir. Bulutların gece tarafı karartılır. Yaklaşınca katman
// incelir, sahaların üstünü kapatmaz. Rüzgâr okları yalnızca bölge ölçeğine yaklaşınca, ekranın ortasındaki ızgarada çizilir.
import * as Cesium from "cesium";
import { S } from "../state.js";
import { sampleWx } from "../weather.js";
import { snap, frac } from "../wxsite.js";

const W=512,H=256,GW=96,GH=48,LAT0=85,CLOUD_H=6000,ARROW_H=3000,PREF="sebeke-wx-layer";
const reduced=matchMedia("(prefers-reduced-motion: reduce)");
let viewer=null,on=true,cv=[null,null],imgs=[null,null],cur=0,lastDraw=0,lastArrows=0,noise=null,ent=null,arrows=null,rings=[],alpha=1;
let cloudKey=null,arrowKey=null;const arrowMats={};
// sütun ve satır başına sabit ara değer tabloları (her çizimde yeniden hesaplanmaz)
const COL_I=new Int32Array(W),COL_J=new Int32Array(W),COL_F=new Float32Array(W),ROW_J=new Int32Array(H),ROW_F=new Float32Array(H),ROW_C=new Float32Array(H),COS=new Float32Array(W);
for(let x=0;x<W;x++){const gx=(x+0.5)/W*GW-0.5,i0=Math.floor(gx);COL_I[x]=(i0+GW)%GW;COL_J[x]=(i0+1)%GW;COL_F[x]=gx-i0;}
for(let y=0;y<H;y++){const gy=Math.min(GH-1.001,Math.max(0,(y+0.5)/H*GH-0.5)),j0=Math.floor(gy);ROW_J[y]=j0;ROW_F[y]=gy-j0;ROW_C[y]=Math.cos((LAT0-y/H*2*LAT0)*Math.PI/180);}
try{on=localStorage.getItem(PREF)!=="0";}catch(e){}

// Yatayda kendini tekrarlayan bulut dokusu (değer gürültüsü, 4 oktav)
function makeNoise(){
  const n=new Float32Array(W*H),rnd=(x,y,s)=>{const h=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return h-Math.floor(h);};
  for(let o=0,amp=0.5,cell=32;o<5;o++,amp*=0.55,cell/=2){const cx=W/cell,cy=H/cell;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const gx=x/cell,gy=y/cell,x0=Math.floor(gx),y0=Math.floor(gy),fx=gx-x0,fy=gy-y0,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
      const v=(i,j)=>rnd((x0+i)%cx,Math.min(y0+j,cy),o);
      n[y*W+x]+=amp*((v(0,0)*(1-sx)+v(1,0)*sx)*(1-sy)+(v(0,1)*(1-sx)+v(1,1)*sx)*sy);}}
  return n;
}
const lonOf=x=>x/W*360-180,latOf=y=>LAT0-y/H*2*LAT0;

// Bulut dokusunu çiz: kaba ızgarada hava alanı, piksel başına ara değer + doku gürültüsü + gece/gündüz gölgesi.
// Maliyetli olduğu için yalnızca oyun saati değişince ve en fazla ~1,2 sn'de bir çalışır.
function drawClouds(){
  const wx=snap(Math.min(S.hour,23),frac()),grid=new Float32Array(GW*GH*3);
  for(let j=0;j<GH;j++){const lat=LAT0-(j+0.5)/GH*2*LAT0;for(let i=0;i<GW;i++){const w=sampleWx(wx,lat,(i+0.5)/GW*360-180),k=(j*GW+i)*3;grid[k]=w.c;grid[k+1]=w.rain;grid[k+2]=w.storm;}}
  const c=cv[cur=1-cur],g=c.getContext("2d"),img=imgs[cur]||(imgs[cur]=g.createImageData(W,H)),d=img.data;
  const hr=Math.min(S.hour,23)+frac(),sub=(12-(hr-3))*15,drift=Math.floor(((S.wx&&S.wx.t)||0)*1.5+hr*1.5)%W;
  for(let x=0;x<W;x++)COS[x]=Math.cos((lonOf(x)-sub)*Math.PI/180);
  for(let y=0;y<H;y++){const j0=ROW_J[y],fy=ROW_F[y],cl=ROW_C[y],r0=j0*GW*3,r1=(j0+1)*GW*3,nrow=y*W;
    for(let x=0;x<W;x++){
      const a0=r0+COL_I[x]*3,b0=r0+COL_J[x]*3,a1=r1+COL_I[x]*3,b1=r1+COL_J[x]*3,fx=COL_F[x],w00=(1-fx)*(1-fy),w10=fx*(1-fy),w01=(1-fx)*fy,w11=fx*fy;
      const cc=grid[a0]*w00+grid[b0]*w10+grid[a1]*w01+grid[b1]*w11,p=(nrow+x)*4;
      const det=cc*0.85+(noise[nrow+(x+drift)%W]-0.5)*1.1,a=(det-0.36)/0.22;
      if(a<=0.01){d[p+3]=0;continue;}
      const rn=grid[a0+1]*w00+grid[b0+1]*w10+grid[a1+1]*w01+grid[b1+1]*w11,sm=grid[a0+2]*w00+grid[b0+2]*w10+grid[a1+2]*w01+grid[b1+2]*w11;
      const cosz=cl*COS[x],l=(cosz+0.3)/0.65,lit=0.13+0.87*(l<0?0:l>1?1:l); // geniş alacakaranlık bandı: seyrek yeniden çizimde gölge sıçramaz
      // uzaydan bakınca yağmur ve fırtına bulutlarının tepesi de parlaktır; yalnızca hafif gri-mavi gölge alır
      const dark=Math.min(1,rn*0.5+sm*0.45),cov=cc+rn*0.5;
      d[p]=(246-80*dark)*lit;d[p+1]=(247-72*dark)*lit;d[p+2]=(251-55*dark)*lit;d[p+3]=235*(a>1?1:a)*(0.7+0.3*(cov>1?1:cov));
    }}
  g.putImageData(img,0,0);
  // şimşek: güçlü fırtına hücrelerinin merkezinde ara sıra parlama (hareketi azalt açıksa yok)
  if(!reduced.matches)for(const s of wx.sys)if(s.type==="storm"&&s.age/s.life>0.25&&s.age/s.life<0.8&&Math.random()<0.3){
    const x=(s.lon+180)/360*W,y=(LAT0-s.lat)/(2*LAT0)*H,gr=g.createRadialGradient(x,y,0,x,y,6);
    gr.addColorStop(0,"rgba(235,240,255,0.95)");gr.addColorStop(1,"rgba(235,240,255,0)");g.fillStyle=gr;g.fillRect(x-6,y-6,12,12);}
}

// Ekran ortasındaki bölgede rüzgâr okları: uzunluk hıza, renk şiddete göre
const arrowColor=v=>v<5?"#9FD3FF":v<12?"#FFFFFF":v<20?"#FFD54A":"#FF5A5A";
const arrowMat=col=>arrowMats[col]||(arrowMats[col]=Cesium.Material.fromType("PolylineArrow",{color:Cesium.Color.fromCssColorString(col).withAlpha(0.85)}));
function drawArrows(force){
  const h=viewer.camera.positionCartographic.height;
  if(!on||h>2.6e6||h<3e3){if(arrows.length)arrows.removeAll();arrowKey=null;return;}
  const c=viewer.camera.pickEllipsoid(new Cesium.Cartesian2(viewer.canvas.clientWidth/2,viewer.canvas.clientHeight/2));if(!c)return;
  const g=Cesium.Cartographic.fromCartesian(c),lat0=Cesium.Math.toDegrees(g.latitude),lon0=Cesium.Math.toDegrees(g.longitude);
  const sp=Math.min(6,Math.max(0.04,h/111e3*0.2)),N=4;
  // kamera belirgin kaymadıysa ve saat aynıysa okları yeniden kurma
  const key=`${S.dayNo}:${S.hour}:${Math.round(lat0/sp*4)}:${Math.round(lon0/sp*4)}:${Math.round(Math.log2(h)*4)}`;
  if(!force&&key===arrowKey)return;arrowKey=key;arrows.removeAll();
  const wx=snap(Math.min(S.hour,23),frac());
  for(let j=-N;j<=N;j++)for(let i=-N;i<=N;i++){
    const lat=lat0+j*sp,lon=lon0+i*sp/Math.max(0.3,Math.cos(lat*Math.PI/180));if(Math.abs(lat)>80)continue;
    const w=sampleWx(wx,lat,lon);if(w.v<0.5)continue;
    const L=sp*(0.18+0.5*Math.min(1,w.v/16)),ux=w.u/w.v,uy=w.vv/w.v,cl=Math.max(0.2,Math.cos(lat*Math.PI/180));
    const a=Cesium.Cartesian3.fromDegrees(lon-ux*L/2/cl,lat-uy*L/2,ARROW_H),b=Cesium.Cartesian3.fromDegrees(lon+ux*L/2/cl,lat+uy*L/2,ARROW_H);
    arrows.add({positions:[a,b],width:9,material:arrowMat(arrowColor(w.v))});
  }
}

// Fırtına hücrelerine kesikli uyarı halkası ve etiket
function drawRings(){
  const wx=snap(Math.min(S.hour,23),frac()),storms=wx.sys.filter(s=>s.type==="storm"&&s.age/s.life>0.15&&s.age/s.life<0.9);
  rings.forEach((e,i)=>{const s=storms[i];e.show=!!s&&on;if(!s)return;
    const pts=[];for(let k=0;k<=40;k++){const a=k/40*Math.PI*2,dl=s.r*0.75*Math.sin(a)/111.2,dn=s.r*0.75*Math.cos(a)/(111.2*Math.max(0.2,Math.cos(s.lat*Math.PI/180)));pts.push(s.lon+dn,s.lat+dl);}
    e.polyline.positions=Cesium.Cartesian3.fromDegreesArrayHeights(pts.flatMap((v,k)=>k%2?[v,ARROW_H]:[v]));
    e.position=Cesium.Cartesian3.fromDegrees(s.lon,s.lat+s.r*0.75/111.2,ARROW_H);});  // etiket halkanın kuzey kenarında
}

function update(){
  const now=performance.now(),h=viewer.camera.positionCartographic.height;
  // yaklaştıkça bulut katmanı incelir: 150 km altında yarı saydam, 15 km altında görünmez
  alpha=on?(h<1.5e4?0:h<1.5e5?0.15+0.4*(h-1.5e4)/1.35e5:h<6e5?0.55+0.45*(h-1.5e5)/4.5e5:1):0;
  ent.show=alpha>0.01;
  // bulutlar yalnızca oyun saati değişince (duraklatılmışken hiç) ve en fazla ~1,2 sn'de bir yeniden çizilir
  const key=`${S.dayNo}:${S.hour}`;
  if(on&&key!==cloudKey&&now-lastDraw>1200){cloudKey=key;lastDraw=now;drawClouds();drawRings();}
  if(now-lastArrows>400){lastArrows=now;drawArrows(false);}
}

export function initWeatherLayer(v){
  viewer=v;noise=makeNoise();cv=[0,1].map(()=>{const c=document.createElement("canvas");c.width=W;c.height=H;return c;});
  ent=viewer.entities.add({rectangle:{coordinates:Cesium.Rectangle.fromDegrees(-180,-LAT0,180,LAT0),height:CLOUD_H,
    material:new Cesium.ImageMaterialProperty({image:new Cesium.CallbackProperty(()=>cv[cur],false),transparent:true,
      color:new Cesium.CallbackProperty(()=>Cesium.Color.WHITE.withAlpha(alpha),false)})}});
  arrows=viewer.scene.primitives.add(new Cesium.PolylineCollection());
  for(let i=0;i<5;i++)rings.push(viewer.entities.add({show:false,position:Cesium.Cartesian3.fromDegrees(0,0),
    polyline:{positions:[],width:2.5,material:new Cesium.PolylineDashMaterialProperty({color:Cesium.Color.fromCssColorString("#FF6B6B"),dashLength:18})},
    label:{text:"⛈ Fırtına",font:"600 13px 'Bricolage Grotesque',system-ui,sans-serif",fillColor:Cesium.Color.WHITE,outlineColor:Cesium.Color.BLACK,outlineWidth:3,
      style:Cesium.LabelStyle.FILL_AND_OUTLINE,horizontalOrigin:Cesium.HorizontalOrigin.CENTER,verticalOrigin:Cesium.VerticalOrigin.BOTTOM,pixelOffset:new Cesium.Cartesian2(0,-4),
      disableDepthTestDistance:Number.POSITIVE_INFINITY,distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,7e6)}}));
  drawClouds();viewer.scene.preRender.addEventListener(update);
}

export function initWeatherToggle(btn){
  const lbl=()=>{btn.textContent=on?"Hava katmanı: açık":"Hava katmanı: kapalı";btn.setAttribute("aria-pressed",on);};
  lbl();btn.onclick=()=>{on=!on;try{localStorage.setItem(PREF,on?"1":"0");}catch(e){}lbl();rings.forEach(e=>e.show=false);cloudKey=null;if(arrows)drawArrows(true);};
}
