// Giriş noktası: oyun döngüsü, kontroller ve ilk yükleme
import { S, setS, fresh, load, save, clearSelCache } from "./state.js";
import { newDay, tick } from "./sim.js";
import { initMap, drawMap, initMap3DUI } from "./ui/map.js";
import { renderPanel } from "./ui/panel.js";
import { render, renderLog, renderReport, drawChart } from "./ui/hud.js";
import { initProfile } from "./ui/profile.js";
import { skipDone } from "./missions.js";
import { renderMission } from "./ui/mission.js";
import { initSound } from "./ui/fx.js";
import { clock } from "./wxsite.js";
import { initWeatherToggle } from "./ui/wxflat.js";
import { openDesk } from "./ui/desk.js";
import { initTicker } from "./ui/ticker.js";
import { initAmbient } from "./ui/ambient.js";
import { initGfxToggle } from "./ui/quality.js";
import { initLeague } from "./league.js";
import { initLeagueUI } from "./ui/league.js";
import { initFeedback } from "./ui/feedback.js";
import { initSheet, collapseSheet, confirmBox } from "./ui/sheet.js";
import { initSaveFile } from "./ui/savefile.js";
import { initCloud } from "./cloud.js";
import { initCloudUI } from "./ui/cloud.js";
import { loadUrban } from "./urban.js";
import { initGuide, restartGuide } from "./ui/guide.js";
import { showLose } from "./ui/hud.js";

let timer=null, speed=1, paused=false, held=false; // held: olay kartı açıkken oyun bekler

// Zaman ilk arazi alınana kadar işlemez: oyuncu haritayı incelerken gün ilerlemez
const waiting=()=>!Object.keys(S.sites).length;
function loop(){const stop=paused||held||waiting();clearInterval(timer);clock.ms=500/speed;clock.paused=stop;clock.at=performance.now();if(!stop)timer=setInterval(tick,500/speed);}
window.addEventListener("sebeke:land",loop);
window.addEventListener("sebeke:hold",()=>{held=true;loop();});
window.addEventListener("sebeke:release",()=>{held=false;loop();});
initSound(document.getElementById("soundBtn"));initAmbient();initGfxToggle(document.getElementById("gfxBtn"));initLeagueUI(document.getElementById("leagueBtn"));initWeatherToggle(document.getElementById("wxBtn"));initMap3DUI();
const pauseBtn=document.getElementById("pauseBtn"),speedBtn=document.getElementById("speedBtn");
const ICON={pause:'<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor"/><rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor"/></svg>',
  play:'<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 2.2v11.6a.6.6 0 0 0 .9.5l9.2-5.8a.6.6 0 0 0 0-1L4.9 1.7a.6.6 0 0 0-.9.5z" fill="currentColor"/></svg>'};
function setPaused(v){paused=v;pauseBtn.innerHTML=paused?ICON.play:ICON.pause;pauseBtn.setAttribute("aria-pressed",String(paused));pauseBtn.setAttribute("aria-label",paused?"Devam et":"Duraklat");loop();}
function setSpeed(v){speed=v;speedBtn.textContent=speed+"x";speedBtn.setAttribute("aria-label",`Oyun hızı: ${speed}x`);loop();}
pauseBtn.onclick=()=>setPaused(!paused);pauseBtn.innerHTML=ICON.pause;
speedBtn.onclick=()=>setSpeed(speed===1?3:speed===3?8:1);
document.getElementById("deskBtn").onclick=()=>openDesk(true);
// iflas ekranındaki "Yeni oyun" onay sormaz (sebeke:reset, detail.force)
async function reset(e){const force=e instanceof CustomEvent&&e.detail&&e.detail.force===true;
  if(force||await confirmBox("Yeniden başla","Tüm ilerleme silinsin mi? Bu işlem geri alınamaz.","Sil",true)){setS(fresh());save();newDay();location.reload();}}
document.getElementById("resetBtn").onclick=reset;
initSaveFile(document.getElementById("saveExport"),document.getElementById("saveImport"));initFeedback(document.getElementById("fbBtn"));
initCloudUI();initCloud();
// yerleşim alanları arka planda yüklenir; gelince seçili noktanın paneli yenilenir
loadUrban().then(ok=>{if(ok){clearSelCache();renderPanel();}});
document.getElementById("guideBtn").onclick=()=>{restartGuide();collapseSheet();};
window.addEventListener("sebeke:reset",reset);
// Klavye: boşluk duraklatır, 1/3/8 hız, Esc mobilde kartı küçültür
document.addEventListener("keydown",e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||document.querySelector("dialog[open]")||e.target.closest("input,textarea,select,[contenteditable]"))return;
  // odak bir düğmedeyken boşluk o düğmeye basar (tarayıcı davranışı); diğer kısayollar yine çalışır
  if(e.key===" "){if(e.target.closest("button,a"))return;e.preventDefault();setPaused(!paused);}
  else if(e.key==="1"||e.key==="3"||e.key==="8")setSpeed(+e.key);
  else if(e.key==="Escape"&&!document.body.classList.contains("view3d"))collapseSheet();
});
// mobilde görev açıklaması dokununca açılır/kapanır
const mis=document.getElementById("mission");mis.onclick=()=>mis.setAttribute("aria-expanded",String(mis.classList.toggle("open")));
initSheet({onTab:t=>{if(t==="piyasa")drawChart();}});
window.addEventListener("resize",drawChart);

// ilk açılışta oyun, oyuncu şirketini kurduktan sonra başlar
setS(load());if(S.mi==null){S.mi=0;skipDone();}S.hour=0;newDay();renderMission();initMap();drawMap();renderPanel();renderLog();renderReport();render();initTicker();initProfile(()=>{if(S.over){showLose();return;}loop();initGuide();openDesk();initLeague();});
