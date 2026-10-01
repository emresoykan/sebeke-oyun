// Giriş noktası: oyun döngüsü, kontroller ve ilk yükleme
import { S, setS, fresh, load, save } from "./state.js";
import { newDay, tick } from "./sim.js";
import { initMap, drawMap } from "./ui/map.js";
import { renderPanel } from "./ui/panel.js";
import { render, renderLog, renderReport, drawChart } from "./ui/hud.js";

let timer=null, speed=1, paused=false;

function loop(){clearInterval(timer);if(!paused)timer=setInterval(tick,500/speed);}
document.getElementById("pauseBtn").onclick=e=>{paused=!paused;e.target.textContent=paused?"Devam et":"Duraklat";loop();};
document.getElementById("speedBtn").onclick=e=>{speed=speed===1?3:speed===3?8:1;e.target.textContent="Hız: "+speed+"x";loop();};
document.getElementById("resetBtn").onclick=()=>{if(confirm("Tüm ilerleme silinsin mi?")){setS(fresh());save();newDay();location.reload();}};
window.addEventListener("resize",drawChart);

setS(load());S.hour=0;newDay();initMap();drawMap();renderPanel();renderLog();renderReport();render();loop();
