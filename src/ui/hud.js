// --- Grafik ve göstergeler ---
import { wp } from "../perfmark.js";
import { GOAL, WIN1, REG, MARKETS, BANKRUPT_DAYS } from "../config.js";
import { S, D, save, selSite } from "../state.js";
import { clamp, shape, fmt$, fmtP, cssv } from "../utils.js";
import { netWorth, dayNet } from "../sim.js";
import { updateButtons } from "./panel.js";
import { setGameClock } from "./map.js";
import { CAL, fmtDate, seasonOf } from "../calendar.js";
import { hasRenew } from "../market.js";
import { renderFin } from "./finview.js";
import { proOn, inTutorial } from "../tutorial.js";

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
    [["s","--solar"],["w","--wind"],["h","--hydro"],["j","--geo"],["o","--bio"],["m","--marine"]].forEach(([q,c])=>{const v=(g[q]||0)*sc;x.fillStyle=cssv(c);x.fillRect(bx,y-v,bw,v);y-=v;});
    if(g.b>0){const v=g.b*sc;x.fillStyle=cssv("--batt");x.fillRect(bx,y-v,bw,v);}
    if(g.b<0){const v=-g.b*sc;x.strokeStyle=cssv("--batt");x.lineWidth=2;x.strokeRect(bx+1,bot-v+1,bw-2,Math.max(0,v-2));}}
  x.strokeStyle="rgba(255,255,255,.95)";x.lineWidth=2.5;x.beginPath();
  M.price.forEach((p,h)=>{const px=padL+h*cw+cw/2,py=bot-(p/CAP)*ph;h?x.lineTo(px,py):x.moveTo(px,py);});x.stroke();
  if(S.hour<24){x.fillStyle="rgba(0,0,0,.18)";x.fillRect(padL+S.hour*cw,padT-10,W-padR-(padL+S.hour*cw),ph+10);}
  const hc=Math.min(S.hour,23);x.fillStyle="#fff";x.beginPath();x.arc(padL+hc*cw+cw/2,bot-(M.price[hc]/CAP)*ph,5,0,Math.PI*2);x.fill();
  x.fillStyle="rgba(255,255,255,.85)";x.font="11px 'Bricolage Grotesque',system-ui,sans-serif";x.textAlign="center";
  [0,6,12,18,23].forEach(h=>x.fillText(String(h).padStart(2,"0"),padL+h*cw+cw/2,H-5));
}
export function render(){const t=performance.now();renderImpl();wp("render (üst bilgi, grafik)",t);}
function renderImpl(){
  const h=Math.min(S.hour,23),k=selMarket(),M=D[k],st=D.st;
  document.getElementById("cash").textContent=fmt$(S.money);
  const sn=seasonOf(CAL.date);const dl=document.getElementById("dayLbl");dl.textContent=`${sn.i} ${fmtDate(CAL.date)}`;document.getElementById("dayNo").textContent=`Gün ${S.dayNo}`;
  document.getElementById("clockTop").textContent=String(S.hour%24).padStart(2,"0")+":00";
  document.getElementById("clock").textContent=REG[k].n+" piyasası • "+String(S.hour%24).padStart(2,"0")+":00";
  document.getElementById("sky").style.background=skyColor(S.hour);
  document.getElementById("roPrice").textContent=fmtP(M.price[h]);
  let g=0;if(S.hour>0)MARKETS.forEach(q=>{const x=D[q].gen[S.hour-1];g+=x.s+x.w+x.h+(x.j||0)+(x.o||0)+(x.m||0)+Math.max(0,x.b);});
  document.getElementById("roGen").textContent=g.toLocaleString("tr-TR",{minimumFractionDigits:1,maximumFractionDigits:1})+" MW";
  const net=dayNet(st),r=document.getElementById("roRev");r.textContent=fmt$(net);r.className=net<0?"neg":"pos";
  document.getElementById("roCap").textContent=S.plants.reduce((a,p)=>a+p.mw,0)+" MW";
  const nw=netWorth();document.getElementById("nw").textContent=fmt$(nw);document.getElementById("goalBar").style.width=clamp(nw/GOAL*100,0,100)+"%";
  if(nw>=GOAL&&!S.won){S.won=true;S.win1=1;save();setTimeout(()=>showWin(nw),50);}
  else if(nw>=WIN1&&!S.win1&&!S.won){S.win1=1;save();setTimeout(()=>showWin(nw,true),50);}
  const cb=document.getElementById("captureBox");if(cb&&cb.hidden===proOn())cb.hidden=!proOn(); // capture oranı ilk satıştan sonra
  document.getElementById("deskBtn").disabled=!(hasRenew()||S.plants.some(p=>p.k==="batt"));
  updateButtons();drawChart();setGameClock(S.hour);
}
// Kazanma ekranı: hedefe ulaşınca özet; oyuncu devam edebilir ya da yeni oyuna başlayabilir
// mid: ara zafer (WIN1, "Bölgesel oyuncu"): yalnızca devam düğmesi, büyük hedef hatırlatılır
function showWin(nw,mid=false){
  const d=document.getElementById("winDlg");if(!d||d.open)return;
  const mw=S.plants.reduce((a,p)=>a+p.mw,0),cell=(k,v)=>`<div><small>${k}</small><b>${v}</b></div>`;
  d.innerHTML=(mid?`<h3>Bölgesel oyuncu oldun</h3><p>Portföy değerin ${fmt$(nw)} oldu: ilk milyon doları geçtin. Büyük hedef ${fmt$(GOAL)} portföy; yeni piyasalar ve kredili büyüme seni oraya taşır.</p>`
    :`<h3>Tebrikler, hedefe ulaştın</h3><p>Portföy değerin ${fmt$(nw)} oldu. Oynamaya devam edebilir ya da yeni bir oyuna başlayabilirsin.</p>`)+`
    <div class="winstats">${cell("Süre",`${S.dayNo} gün`)}${cell("Kurulu güç",`${mw} MW`)}${cell("Toplam üretim",`${Math.round(S.stats.mwh).toLocaleString("tr-TR")} MWh`)}${cell("Toplam net kazanç",fmt$(S.stats.net))}${cell("Saha",Object.keys(S.sites).length)}${cell("Rozet",S.ach.length)}</div>
    <div class="dlgbtns">${mid?"":`<button data-v="new">Yeni oyun</button>`}<button data-v="go" class="pri">${mid?"Devam et: 5 M$ hedefi":"Devam et"}</button></div>`;
  d.querySelector('[data-v="go"]').onclick=()=>d.close();
  d.querySelector('[data-v="new"]')?.addEventListener("click",()=>{d.close();window.dispatchEvent(new CustomEvent("sebeke:reset"));});
  window.dispatchEvent(new CustomEvent("sebeke:hold"));d.addEventListener("close",()=>window.dispatchEvent(new CustomEvent("sebeke:release")),{once:true});
  d.showModal();d.querySelector('[data-v="go"]').focus();
}
// İflas ekranı: oyun durur; kayıt dosyası yüklenebilir ya da yeni oyuna başlanır
export function showLose(){
  const d=document.getElementById("winDlg");if(!d)return;if(d.open)d.close();
  const mw=S.plants.reduce((a,p)=>a+p.mw,0),cell=(k,v)=>`<div><small>${k}</small><b>${v}</b></div>`;
  d.innerHTML=`<h3>Şirket iflas etti</h3><p>Nakit ${BANKRUPT_DAYS} gün üst üste eksi kaldı (son durum ${fmt$(S.money)}). Kayıtlı bir oyunu yükleyebilir ya da yeni bir oyuna başlayabilirsin.</p>
    <div class="winstats">${cell("Süre",`${S.dayNo} gün`)}${cell("Kurulu güç",`${mw} MW`)}${cell("Toplam üretim",`${Math.round(S.stats.mwh).toLocaleString("tr-TR")} MWh`)}${cell("Toplam net kazanç",fmt$(S.stats.net))}</div>
    <div class="dlgbtns"><button data-v="load">Kayıt yükle</button><button data-v="new" class="pri">Yeni oyun</button></div>`;
  d.querySelector('[data-v="load"]').onclick=()=>window.dispatchEvent(new CustomEvent("sebeke:import"));
  d.querySelector('[data-v="new"]').onclick=()=>window.dispatchEvent(new CustomEvent("sebeke:reset",{detail:{force:true}}));
  d.oncancel=e=>e.preventDefault();
  window.dispatchEvent(new CustomEvent("sebeke:hold"));d.showModal();d.querySelector('[data-v="new"]').focus();
}
export function renderLog(){const el=document.getElementById("log");if(!S.log.length)return;el.innerHTML=S.log.map(l=>`<li>${l}</li>`).join("");}
// rapordaki "Uzman ayrıntıları" (dengesizlik, tahmin, kredi) açık mı: yeniden çizimde korunur
let repOpen=false;
export function renderReport(){
  renderFin();
  const L=S.last;if(!L)return;
  const rows=[["ges","GES"],["res","RES karada"],["off","RES offshore"],["hes","HES"],["jes","JES"],["bes","Biyokütle"],["mar","Deniz (destek dahil)"]].map(([k,n])=>L.E[k]>0?`<tr><td>${n}</td><td>${L.E[k].toFixed(0)} MWh</td><td>${fmt$(L.R[k])}</td><td>${fmtP(L.R[k]/L.E[k])}</td></tr>`:"").join("");
  let note;
  if(L.curt>0)note=`Bir piyasada öğle fiyatı sıfıra düştü ve ${L.curt.toFixed(0)} MWh güneş üretimi satılamadı. Bu saatlerde batarya neredeyse bedavaya şarj olur.`;
  else if(L.imb>0.06*(L.R.ges+L.R.res+L.R.off))note=`Tahmin hatası %${Math.round(L.err*100)} oldu: ${L.short.toFixed(0)} MWh eksik üretimi PTF'nin %35 fazlasıyla aldın, ${L.surp.toFixed(0)} MWh fazlayı %30 ucuza sattın. Premium tahmin servisi, dengelemedeki batarya veya daha temkinli bir teklif oranı bu maliyeti düşürür.`;
  else if(L.E.bes>0&&L.fuel>0)note=`Biyokütle santrali yalnızca fiyat yakıt maliyetini aştığında çalıştı: ${L.E.bes.toFixed(0)} MWh için ${fmt$(L.fuel)} yakıt yaktın. Ucuz saatlerde durması marjinal maliyet mantığıdır; fiyat düşükse çalışmamak kâr ettirir.`;
  else if(L.E.jes>0)note=`JES hava ve saatten bağımsız, gece gündüz aynı güçle üretir; bu yüzden tahmin hatası ve dengesizlik maliyeti yoktur. Bedeli yüksek yatırım ve sondaj riskidir.`;
  else if(L.E.mar>0)note=`Deniz enerjisinin gelgit kısmı günler öncesinden hesaplanabilir; yüksek maliyetini yenilik desteği (MWh başına +60 $) dengeler. Dalga kısmı ise havaya bağlıdır.`;
  else if(L.E.hes>0)note=`HES suyunu en pahalı saatlere sakladığı için birim başına en yüksek fiyatı yakalar. Ama su miktarı her gün değişir; kurak günlerde üretim düşer.`;
  else if(L.E.ges>0&&L.sRate<0.75)note=`Güneşin kazandığı ortalama fiyat, kurulu olduğu piyasaların ortalamasının %${Math.round(L.sRate*100)}'i. Güneşi farklı piyasalara yaymak veya batarya eklemek bu kaybı azaltır.`;
  else if(L.imb>0)note=`Tahmin sapmaları ${fmt$(L.imb)} dengesizlik maliyeti yarattı. GÖP masasında teklifini belirsizliğe göre ayarlayabilirsin.`;
  else note=`Farklı piyasalarda kurulum yapmak, tek bir piyasanın fiyat düşüşüne karşı portföyünü korur.`;
  // eğitimdeki ilk rapor: tablonun nasıl okunacağı
  if(inTutorial()&&rows)note=`Üretim × o saatin fiyatı = piyasa değeri. Ondan işletme gideri ve tahmin sapmasının maliyeti düşülünce gün sonu net gelir çıkar. ${note}`;
  const xrows=`<tr><td>Dengesizlik${L.err?` <small class="mut">tahmin hatası %${Math.round(L.err*100)}</small>`:""}</td><td>${L.short!=null&&(L.short||L.surp)?`−${L.short.toFixed(0)} / +${L.surp.toFixed(0)} MWh`:""}</td><td class="neg">−${fmt$(L.imb)}</td><td></td></tr>
  ${L.bBal>0?`<tr><td>Batarya dengeleme</td><td>${L.bBal.toFixed(0)} MWh</td><td></td><td></td></tr>`:""}
  ${L.fee>0?`<tr><td>Tahmin servisi</td><td></td><td class="neg">−${fmt$(L.fee)}</td><td></td></tr>`:""}`;
  document.getElementById("report").innerHTML=`<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:6px"><span>Gün ${L.dayNo}</span><span>Net: <b class="${L.net<0?"neg":"pos"}">${fmt$(L.net)}</b></span></div>
  <div style="overflow-x:auto"><table><tr><th>Santral</th><th>Üretim</th><th>Piyasa değeri</th><th>Ort. fiyat</th></tr>${rows||'<tr><td colspan="4" style="text-align:left;color:var(--muted)">Henüz üretim yok.</td></tr>'}
  ${L.fuel>0?`<tr><td>Biyokütle yakıtı</td><td></td><td class="neg">−${fmt$(L.fuel)}</td><td></td></tr>`:""}
  ${L.fit>0?`<tr><td>Alım garantisi desteği <small class="mut">taban fiyatla piyasa farkı</small></td><td></td><td class="pos">+${fmt$(L.fit)}</td><td></td></tr>`:""}
  ${L.bNet||S.plants.some(p=>p.k==="batt")?`<tr><td>Batarya (BESS) arbitrajı</td><td></td><td>${fmt$(L.bNet)}</td><td></td></tr>`:""}
  <tr><td>Tahmin ve dengesizlik</td><td></td><td class="neg">−${fmt$(L.imb+(L.fee||0))}</td><td></td></tr>
  <tr><td>İşletme gideri</td><td></td><td class="neg">−${fmt$(L.opex)}</td><td></td></tr>
  ${L.loan&&L.loan.paid>0?`<tr><td>Kredi taksiti <small class="mut">faiz ${fmt$(L.loan.int)}</small></td><td></td><td class="neg">−${fmt$(L.loan.paid)}</td><td></td></tr>`:""}</table></div><div class="note">${note}</div>
  <details class="expert" id="repX"${repOpen?" open":""}><summary>Uzman ayrıntıları: dengesizlik ve tahmin</summary>
  <p class="mut">GÖP'te bir gün önceden satış teklifi verilir; gerçekleşen üretim tekliften saparsa eksik ya da fazla miktar dengesizlik fiyatından kapanır. Tahmin hatası ne kadar küçükse maliyet o kadar düşer.</p>
  <div style="overflow-x:auto"><table><tr><th>Kalem</th><th>Miktar</th><th>Tutar</th><th></th></tr>${xrows}</table></div></details>`;
  const rx=document.getElementById("repX");if(rx)rx.ontoggle=()=>{repOpen=rx.open;};
  const tr=document.getElementById("trend");tr.innerHTML="";S.hist.forEach(v=>{const d=document.createElement("div");d.style.height=clamp(v,0,1.2)/1.2*100+"%";d.title=Math.round(v*100)+"%";tr.appendChild(d);});
}
