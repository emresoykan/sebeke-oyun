// --- GÖP masası: gün başında saatlik üretim tahminine bakıp satış teklifi verilir ---
// Teklif (taahhüt) GÖP fiyatından satılır; gerçekleşen üretim saparsa fark dengesizlik fiyatından kapanır.
import { S, D, save } from "../state.js";
import { fmt$, fmtP, cssv } from "../utils.js";
import { CAL, fmtDate } from "../calendar.js";
import { applyDesk, deskSummary, deskDefaults, hasRenew, uncLabel, K_SHORT, K_SURP, FC_FEE } from "../market.js";
import { addLog } from "../state.js";
import { enqueue } from "./modal.js";
import { render } from "./hud.js";

const dlg=()=>document.getElementById("deskDlg");
const hasBatt=()=>S.plants.some(p=>p.k==="batt");

// force: oyuncu düğmeyle açtıysa otomatik moddayken de açılır
export function openDesk(force=false){
  if(!S.desk)S.desk=deskDefaults();
  if(!hasRenew()&&!(force&&hasBatt()))return;
  if(S.desk.auto&&!force)return;
  enqueue(done=>show(done));
}

function show(done){
  const d=dlg(),from=S.hour,mid=from>0,pre0=S.desk.fc==="pre";
  applyDesk(from);
  const opt=(name,v,l,sub,on)=>`<label class="dopt"><input type="radio" name="${name}" value="${v}" ${on?"checked":""}><span><b>${l}</b><small>${sub}</small></span></label>`;
  const fee=deskSummary().fee;
  d.innerHTML=`<div class="desk">
    <span class="evtag">Gün öncesi piyasası</span>
    <h3>GÖP masası <small>${fmtDate(CAL.date)}${mid?` • ${String(from).padStart(2,"0")}:00 sonrası`:""}</small></h3>
    <p class="dsub">${mid?"Gün içinde yaptığın değişiklik yalnızca kalan saatlere uygulanır (gün içi piyasada pozisyon düzeltmek gibi).":"Bugünün saatlik üretim tahmini hazır. Ne kadarını GÖP'te satacağını seç; gerçekleşen üretim teklifinden saparsa fark dengesizlik fiyatından kapanır."}</p>
    ${hasRenew()?`<canvas id="deskChart" role="img" aria-label="Saatlik üretim tahmini, belirsizlik bandı, teklif ve fiyat"></canvas>
    <div class="dleg"><span><i class="b"></i>Tahmin</span><span><i class="u"></i>Belirsizlik</span><span><i class="c"></i>Teklif</span><span><i class="p"></i>Fiyat</span></div>
    <div class="dstats" id="deskStats"></div>
    <label class="dslider">Teklif oranı <b id="ratioV"></b><input type="range" id="ratio" min="70" max="110" step="1" value="${Math.round(S.desk.ratio*100)}" aria-describedby="ratioHint"></label>
    <div class="dhint" id="ratioHint">Eksik üretim PTF'nin %${Math.round(K_SHORT*100)} fazlasıyla satın alınır, fazla üretim PTF'nin %${Math.round(K_SURP*100)} altından satılır. Ceza neredeyse simetrik olduğundan en iyi teklif çoğu gün tahmine yakındır: teklifi düşürmek eksik riskini azaltır ama fazlayı ucuza satarsın.</div>
    <fieldset><legend>Tahmin servisi</legend>
      ${opt("fc","std","Standart","Ücretsiz",S.desk.fc==="std")}
      ${opt("fc","pre","Premium","Hata yarıya iner • "+fmt$(fee||FC_FEE)+"/gün",S.desk.fc==="pre")}</fieldset>`:""}
    ${hasBatt()?`<fieldset><legend>Bataryanın görevi</legend>
      ${opt("batt","arb","Arbitraj","Ucuz saatte şarj, pahalı saatte deşarj",S.desk.batt==="arb")}
      ${opt("batt","bal","Dengeleme","Tahmin sapmasını karşılar, dengesizlik maliyetini düşürür",S.desk.batt==="bal")}
      ${opt("batt","off","Boşta","Çalışmaz",S.desk.batt==="off")}
      <div class="dhint">Hangisinin kârlı olduğu günün fiyat farkına ve tahmin belirsizliğine bağlı; dünün raporunda karşılaştır.</div></fieldset>`:""}
    <label class="dauto"><input type="checkbox" id="deskAuto" ${S.desk.auto?"checked":""}> Her gün bu ayarlarla otomatik gönder (masayı düğmeyle yine açabilirsin)</label>
    <div class="pact"><button class="pri" id="deskGo">${mid?"Güncelle":"Teklifi gönder"}</button></div></div>`;
  const upd=()=>{applyDesk(from);if(hasRenew())paint(from);};
  const r=d.querySelector("#ratio");
  if(r)r.oninput=()=>{S.desk.ratio=r.value/100;upd();};
  d.querySelectorAll('input[name="fc"]').forEach(i=>i.onchange=()=>{S.desk.fc=i.value;upd();});
  d.querySelectorAll('input[name="batt"]').forEach(i=>i.onchange=()=>{S.desk.batt=i.value;});
  d.querySelector("#deskAuto").onchange=e=>{S.desk.auto=e.target.checked;};
  const go=()=>{
    applyDesk(from);
    // premium servis gün içinde seçildiyse o günün ücreti bir kez alınır
    if(S.desk.fc==="pre"&&!pre0&&!D.st.fee){const f=deskSummary().fee;S.money-=f;D.st.fee=f;addLog(`Premium tahmin servisi alındı: ${fmt$(f)}.`);}
    save();d.close();render();done();
  };
  d.querySelector("#deskGo").onclick=go;
  d.oncancel=e=>{e.preventDefault();go();}; // Esc: mevcut ayarlarla gönder
  d.showModal();d.scrollTop=0;
  if(hasRenew())requestAnimationFrame(()=>paint(from));
}

function paint(from){
  const s=deskSummary(),cv=document.getElementById("deskChart");if(!cv)return;
  const dpr=window.devicePixelRatio||1,W=cv.clientWidth,H=cv.clientHeight;cv.width=W*dpr;cv.height=H*dpr;
  const x=cv.getContext("2d");x.scale(dpr,dpr);
  const padT=10,padB=18,padL=6,padR=6,cw=(W-padL-padR)/24,bot=H-padB,ph=bot-padT;
  const top=Math.max(1,...s.fc.map((v,h)=>v+s.band[h]),...s.cm),pmax=Math.max(10,...s.price)*1.1;
  const yE=v=>bot-v/top*ph,yP=v=>bot-v/pmax*ph;
  for(let h=0;h<24;h++){const bx=padL+h*cw+cw*.15,bw=cw*.7;
    x.globalAlpha=h<from?0.3:1;
    x.fillStyle="rgba(140,190,255,.28)";const lo=Math.max(0,s.fc[h]-s.band[h]),hi=s.fc[h]+s.band[h];x.fillRect(bx-1,yE(hi),bw+2,yE(lo)-yE(hi));
    x.fillStyle=cssv("--wind")||"#5BC0EB";x.fillRect(bx+bw*.2,yE(s.fc[h]),bw*.6,bot-yE(s.fc[h]));
    x.strokeStyle="#fff";x.lineWidth=2;x.beginPath();x.moveTo(bx,yE(s.cm[h]));x.lineTo(bx+bw,yE(s.cm[h]));x.stroke();}
  x.globalAlpha=1;x.strokeStyle=cssv("--solar")||"#F2C94C";x.lineWidth=2;x.setLineDash([4,3]);x.beginPath();
  s.price.forEach((p,h)=>{const px=padL+h*cw+cw/2;h?x.lineTo(px,yP(p)):x.moveTo(px,yP(p));});x.stroke();x.setLineDash([]);
  x.fillStyle="rgba(255,255,255,.8)";x.font="11px 'Bricolage Grotesque',system-ui,sans-serif";x.textAlign="center";
  [0,6,12,18,23].forEach(h=>x.fillText(String(h).padStart(2,"0"),padL+h*cw+cw/2,H-4));
  const tot=a=>a.reduce((q,v)=>q+v,0),u=s.unc;
  document.getElementById("ratioV").textContent="%"+Math.round(S.desk.ratio*100);
  document.getElementById("deskStats").innerHTML=`
    <div><small>Tahmini üretim</small><b>${tot(s.fc).toFixed(0)} MWh</b></div>
    <div><small>Teklif</small><b>${tot(s.cm).toFixed(0)} MWh</b></div>
    <div><small>Beklenen GÖP geliri</small><b>${fmt$(s.rev)}</b></div>
    <div><small>Tahmin belirsizliği</small><b>${uncLabel(u)} (±%${Math.round(u*100)})</b></div>
    <div><small>Ağırlıklı ort. fiyat</small><b>${fmtP(tot(s.price)/24)}</b></div>`;
}
