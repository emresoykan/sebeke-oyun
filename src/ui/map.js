// --- Harita çizimi ---
import { COLS, ROWS, TS, TECH } from "../config.js";
import { T } from "../world.js";
import { S } from "../state.js";
import { cssv } from "../utils.js";
import { render } from "./hud.js";
import { renderPanel } from "./panel.js";

const mapCv=document.getElementById("map");
export function drawMap(){
  const dpr=window.devicePixelRatio||1,W=COLS*TS,H=ROWS*TS;
  mapCv.width=W*dpr;mapCv.height=H*dpr;mapCv.style.width=W+"px";mapCv.style.height=H+"px";
  const x=mapCv.getContext("2d");x.scale(dpr,dpr);
  const col={pl:"#9DB77A",f:"#3F7A4A",m:"#A39177",d:"#E2C98B",p:"#2E6B3B",i:"#EEF3F6"};
  T.forEach(t=>{
    const X=t.c*TS,Y=t.r*TS;
    x.fillStyle=t.sea?(t.shallow?"#5E8FB8":"#1E4E79"):col[t.ter];x.fillRect(X,Y,TS,TS);
    if(t.ter==="p"){x.strokeStyle="#C2364A";x.lineWidth=2;x.strokeRect(X+1,Y+1,TS-2,TS-2);}
    if(t.reg==="T"){x.fillStyle="rgba(194,54,74,.85)";x.fillRect(X,Y+TS-3,TS,3);}
  });
  x.strokeStyle="rgba(0,0,0,.08)";x.lineWidth=1;
  for(let c=0;c<=COLS;c++){x.beginPath();x.moveTo(c*TS+.5,0);x.lineTo(c*TS+.5,H);x.stroke();}
  for(let r=0;r<=ROWS;r++){x.beginPath();x.moveTo(0,r*TS+.5);x.lineTo(W,r*TS+.5);x.stroke();}
  Object.entries(S.tiles).forEach(([i,o])=>{
    const t=T[i],X=t.c*TS,Y=t.r*TS;
    x.lineWidth=2;
    if(o.permit==="ok"){x.strokeStyle="#fff";x.setLineDash([]);}
    else if(o.permit==="pending"){x.strokeStyle="#F2C94C";x.setLineDash([3,2]);}
    else if(o.permit==="rejected"){x.strokeStyle="#F06A7D";x.setLineDash([]);x.beginPath();x.moveTo(X+4,Y+4);x.lineTo(X+TS-4,Y+TS-4);x.moveTo(X+TS-4,Y+4);x.lineTo(X+4,Y+TS-4);x.stroke();}
    else{x.strokeStyle="#fff";x.setLineDash([2,2]);}
    x.strokeRect(X+1.5,Y+1.5,TS-3,TS-3);x.setLineDash([]);
    const ks=[...new Set(S.plants.filter(p=>p.t==i).map(p=>p.k))];
    ks.forEach((k,j)=>{x.fillStyle=cssv(TECH[k].c);x.beginPath();x.arc(X+5+(j%2)*8,Y+5+Math.floor(j/2)*8,3.2,0,Math.PI*2);x.fill();});
  });
  const s=T[S.sel];x.strokeStyle="#000";x.lineWidth=3;x.strokeRect(s.c*TS+1,s.r*TS+1,TS-2,TS-2);x.strokeStyle="#fff";x.lineWidth=1.5;x.strokeRect(s.c*TS+1,s.r*TS+1,TS-2,TS-2);
}
export function bindMap(){
  mapCv.addEventListener("click",e=>{const b=mapCv.getBoundingClientRect(),c=Math.floor((e.clientX-b.left)/TS),r=Math.floor((e.clientY-b.top)/TS);
    if(c<0||c>=COLS||r<0||r>=ROWS)return;S.sel=r*COLS+c;renderPanel();drawMap();render();});
}
