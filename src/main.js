// Giriş noktası: oyun döngüsü, kontroller ve ilk yükleme
import { S, setS, fresh, load, save } from "./state.js";
import { newDay, tick } from "./sim.js";
import { initMap, drawMap } from "./ui/map.js";
import { renderPanel } from "./ui/panel.js";
import { render, renderLog, renderReport, drawChart } from "./ui/hud.js";
import { initProfile } from "./ui/profile.js";
import { skipDone } from "./missions.js";
import { renderMission } from "./ui/mission.js";
import { initSound } from "./ui/fx.js";
import { clock } from "./wxsite.js";
import { initWeatherToggle } from "./ui/weatherLayer.js";
import { openDesk } from "./ui/desk.js";

let timer=null, speed=1, paused=false, held=false; // held: olay kartı açıkken oyun bekler

function loop(){clearInterval(timer);clock.ms=500/speed;clock.paused=paused||held;clock.at=performance.now();if(!paused&&!held)timer=setInterval(tick,500/speed);}
window.addEventListener("sebeke:hold",()=>{held=true;loop();});
window.addEventListener("sebeke:release",()=>{held=false;loop();});
initSound(document.getElementById("soundBtn"));initWeatherToggle(document.getElementById("wxBtn"));
document.getElementById("pauseBtn").onclick=e=>{paused=!paused;e.target.textContent=paused?"Devam et":"Duraklat";loop();};
document.getElementById("speedBtn").onclick=e=>{speed=speed===1?3:speed===3?8:1;e.target.textContent="Hız: "+speed+"x";loop();};
document.getElementById("deskBtn").onclick=()=>openDesk(true);
document.getElementById("resetBtn").onclick=()=>{if(confirm("Tüm ilerleme silinsin mi?")){setS(fresh());save();newDay();location.reload();}};
window.addEventListener("resize",drawChart);

// ilk açılışta oyun, oyuncu şirketini kurduktan sonra başlar
setS(load());if(S.mi==null){S.mi=0;skipDone();}S.hour=0;newDay();renderMission();initMap();drawMap();renderPanel();renderLog();renderReport();render();initProfile(()=>{loop();openDesk();});
