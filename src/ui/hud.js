// --- Grafik ve göstergeler ---
import { GOAL, REG, MARKETS } from "../config.js";
import { S, D, save, selSite } from "../state.js";
import { clamp, shape, fmt$, fmtP, cssv, daylight } from "../utils.js";
import { netWorth } from "../sim.js";
import { updateButtons } from "./panel.js";
import { setDaylight } from "./map.js";

function skyColor(h){const st=[[0,"#1B2A4A"],[5,"#2A3A63"],[7,"#E59A6B"],[9,"#7FB3D9"],[13,"#9CCAE9"],[17,"#6E9CC9"],[19,"#D9845F"],[21,"#2D3B66"],[24,"#1B2A4A"]];
  let a=st[0],b=st[st.length-1];for(let i=0;i<st.length-1;i++)if(h>=st[i][0]&&h<=st[i+1][0]){a=st[i];b=st[i+1];break;}
  const t=(h-a[0])/((b[0]-a[0])||1),m=i=>Math.round(parseInt(a[1].substr(i,2),16)*(1-t)+parseInt(b[1].substr(i,2),16)*t);return`rgb(${m(1)},${m(3)},${m(5)})`;}
function selMarket(){return selSite().mreg||"T";}
export function drawChart(){
  const cv=document.getElementById("chart"),dpr=window.devicePixelRatio||1,W=cv.clientWidth,H=cv.clientHeight;
  cv.width=W*dpr;cv.height=H*dpr;const x=cv.getContext("2d");x.scale(dpr,dpr);
  const k=selMarket(),M=D[k],CAP=110*REG[k].mult,padT=34,padB=20,padL=8,padR=8,cw=(W-padL-padR)/24,bot=H-padB,ph=bot-padT;
  const mw=Math.max(5,S.plants.filter(p=>S.sites[p.t].mreg===k).reduce((a,p)=>a+p.mw,0)),sc=(ph*0.55)/mw;
  for(let h=0;h<S.hour;h++){const g=M.gen[h],bx=padL+h*cw+cw*.15,bw=cw*.7;let y=bot;
    [["s","--solar"],["w","--wind"],["h","--hydro"]].forEach(([q,c])=>{const v=g[q]*sc;x.fillStyle=cssv(c);x.fillRect(bx,y-v,bw,v);y-=v;});
    if(g.b>0){const v=g.b*sc;x.fillStyle=cssv("--batt");x.fillRect(bx,y-v,bw,v);}
    if(g.b<0){const v=-g.b*sc;x.strokeStyle=cssv("--batt");x.lineWidth=2;x.strokeRect(bx+1,bot-v+1,bw-2,Math.max(0,v-2));}}
  x.strokeStyle="rgba(255,255,255,.95)";x.lineWidth=2.5;x.beginPath();
  M.price.forEach((p,h)=>{const px=padL+h*cw+cw/2,py=bot-(p/CAP)*ph;h?x.lineTo(px,py):x.moveTo(px,py);});x.stroke();
  if(S.hour<24){x.fillStyle="rgba(0,0,0,.18)";x.fillRect(padL+S.hour*cw,padT-10,W-padR-(padL+S.hour*cw),ph+10);}
  const hc=Math.min(S.hour,23);x.fillStyle="#fff";x.beginPath();x.arc(padL+hc*cw+cw/2,bot-(M.price[hc]/CAP)*ph,5,0,Math.PI*2);x.fill();
  x.fillStyle="rgba(255,255,255,.85)";x.font="11px 'Bricolage Grotesque',system-ui,sans-serif";x.textAlign="center";
  [0,6,12,18,23].forEach(h=>x.fillText(String(h).padStart(2,"0"),padL+h*cw+cw/2,H-5));
}
export function render(){
  const h=Math.min(S.hour,23),k=selMarket(),M=D[k],st=D.st;
  document.getElementById("cash").textContent=fmt$(S.money);
  document.getElementById("dayLbl").textContent="Gün "+S.dayNo;
  document.getElementById("clockTop").textContent=String(S.hour%24).padStart(2,"0")+":00";
  document.getElementById("clock").textContent=REG[k].n+" piyasası • "+String(S.hour%24).padStart(2,"0")+":00";
  document.getElementById("sky").style.background=skyColor(S.hour);
  document.getElementById("roPrice").textContent=fmtP(M.price[h]);
  let g=0;if(S.hour>0)MARKETS.forEach(q=>{const x=D[q].gen[S.hour-1];g+=x.s+x.w+x.h+Math.max(0,x.b);});
  document.getElementById("roGen").textContent=g.toFixed(1)+" MW";
  const net=st.R.ges+st.R.res+st.R.off+st.R.hes-st.imb+st.bNet-st.opex,r=document.getElementById("roRev");r.textContent=fmt$(net);r.className=net<0?"neg":"pos";
  document.getElementById("roCap").textContent=S.plants.reduce((a,p)=>a+p.mw,0)+" MW";
  const nw=netWorth();document.getElementById("nw").textContent=fmt$(nw);document.getElementById("goalBar").style.width=clamp(nw/GOAL*100,0,100)+"%";
  if(nw>=GOAL&&!S.won){S.won=true;save();setTimeout(()=>alert("Tebrikler: 5 M$ portföy değerine ulaştın. Oynamaya devam edebilirsin."),50);}
  updateButtons();drawChart();setDaylight(daylight(h));
}
export function renderLog(){const el=document.getElementById("log");if(!S.log.length)return;el.innerHTML=S.log.map(l=>`<li>${l}</li>`).join("");}
export function renderReport(){
  const L=S.last;if(!L)return;
  const rows=[["ges","GES"],["res","RES karada"],["off","RES offshore"],["hes","HES"]].map(([k,n])=>L.E[k]>0?`<tr><td>${n}</td><td>${L.E[k].toFixed(0)} MWh</td><td>${fmt$(L.R[k])}</td><td>${fmtP(L.R[k]/L.E[k])}</td></tr>`:"").join("");
  let note;
  if(L.curt>0)note=`Bir piyasada öğle fiyatı sıfıra düştü ve ${L.curt.toFixed(0)} MWh güneş üretimi satılamadı. Bu saatlerde batarya neredeyse bedavaya şarj olur.`;
  else if(L.E.hes>0)note=`HES suyunu en pahalı saatlere sakladığı için birim başına en yüksek fiyatı yakalar. Ama su miktarı her gün değişir; kurak günlerde üretim düşer.`;
  else if(L.E.ges>0&&L.sRate<0.75)note=`Güneşin kazandığı ortalama fiyat, kurulu olduğu piyasaların ortalamasının %${Math.round(L.sRate*100)}'i. Güneşi farklı piyasalara yaymak veya batarya eklemek bu kaybı azaltır.`;
  else if(L.imb>0)note=`Rüzgâr tahmin sapmaları ${fmt$(L.imb)} dengesizlik maliyeti yarattı. Offshore daha istikrarlı üretir ama kurulumu pahalıdır.`;
  else note=`Farklı piyasalarda kurulum yapmak, tek bir piyasanın fiyat düşüşüne karşı portföyünü korur.`;
  document.getElementById("report").innerHTML=`<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:6px"><span>Gün ${L.dayNo}</span><span>Net: <b class="${L.net<0?"neg":"pos"}">${fmt$(L.net)}</b></span></div>
  <div style="overflow-x:auto"><table><tr><th>Santral</th><th>Üretim</th><th>Gelir</th><th>Ort. fiyat</th></tr>${rows||'<tr><td colspan="4" style="text-align:left;color:var(--muted)">Henüz üretim yok.</td></tr>'}
  <tr><td>Batarya arbitrajı</td><td></td><td>${fmt$(L.bNet)}</td><td></td></tr>
  <tr><td>Dengesizlik</td><td></td><td class="neg">−${fmt$(L.imb)}</td><td></td></tr>
  <tr><td>İşletme gideri</td><td></td><td class="neg">−${fmt$(L.opex)}</td><td></td></tr></table></div><div class="note">${note}</div>`;
  const tr=document.getElementById("trend");tr.innerHTML="";S.hist.forEach(v=>{const d=document.createElement("div");d.style.height=clamp(v,0,1.2)/1.2*100+"%";d.title=Math.round(v*100)+"%";tr.appendChild(d);});
}
