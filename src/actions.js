// --- Aksiyonlar ---
import { BLOCK, SITE_LIMIT, REG, TECH, UNDO_MS } from "./config.js";
import { describe, placeName } from "./world.js";
import { S, save, addLog } from "./state.js";
import { landCost, permitFee, permitDays } from "./rules.js";
import { siteMW, newDayHydro, planBio, awardAch } from "./sim.js";
import { locked } from "./rules.js";
import { capexOf, eqName, TIERS } from "./equipment.js";
import { checkMissions } from "./missions.js";
import { sfx } from "./ui/fx.js";
import { fmt$ } from "./utils.js";
import { rivalNear } from "./rivals.js";
import { render } from "./ui/hud.js";
import { renderPanel } from "./ui/panel.js";
import { drawMap } from "./ui/map.js";

function refresh(){awardAch();checkMissions();save();renderPanel();drawMap();render();}

// --- Geri alma: son satın alma (arazi veya +5 MW blok) kısa süre içinde tam iadeyle geri alınabilir ---
// Yalnızca en son satın alma geri alınır; arazide izin başvurusu yapıldıysa veya santral kurulduysa artık alınamaz.
// JES'te ilk blok sondajı yaptığı için geri alınamaz (sondaj sonucu öğrenilip para geri istenemez).
let U=null,uT=0;
function markUndo(u){U={...u,at:performance.now()};clearTimeout(uT);uT=setTimeout(()=>{U=null;renderPanel();},UNDO_MS);}
function undoValid(){
  if(!U||performance.now()-U.at>UNDO_MS)return false;const o=S.sites[U.id];if(!o)return false;
  if(U.kind==="land")return o.permit==="none"&&!S.plants.some(p=>p.t===U.id);
  const p=S.plants.find(x=>x.t===U.id&&x.k===U.k&&x.q===U.q);return !!p&&p.mw>=BLOCK;
}
// panel için: seçili sahada geri alınabilir bir satın alma varsa açıklaması
export function undoFor(id){return undoValid()&&U.id===id?U:null;}
export function undoLast(){
  if(!undoValid())return;const u=U;U=null;clearTimeout(uT);S.money+=u.c;
  if(u.kind==="land"){const o=S.sites[u.id];delete S.sites[u.id];S.sel={id:null,lat:o.lat,lon:o.lon};
    addLog(`${o.sea?"Deniz alanı tahsisi":"Arazi alımı"} geri alındı: ${placeName(o)}. ${fmt$(u.c)} iade edildi.`);}
  else{const i=S.plants.findIndex(x=>x.t===u.id&&x.k===u.k&&x.q===u.q),p=S.plants[i];p.mw-=BLOCK;p.cost=(p.cost||0)-u.c;if(p.mw<=0)S.plants.splice(i,1);
    addLog(`${placeName(S.sites[u.id])}: +${BLOCK} MW ${TECH[u.k].n} geri alındı. ${fmt$(u.c)} iade edildi.`);}
  refresh();window.dispatchEvent(new CustomEvent("sebeke:land"));
}

// Seçili noktada yeni saha aç (arazi satın al / deniz alanı kirala)
export function buyLand(){const t=describe(S.sel.lat,S.sel.lon),c=landCost(t);if(S.money<c||rivalNear(t.lat,t.lon))return;S.money-=c;
  const id="s"+(S.nextId++);S.sites[id]={...t,permit:"none"};S.sel={id,lat:t.lat,lon:t.lon};
  addLog(`${t.sea?"Deniz alanı tahsisi":"Arazi"} alındı: ${placeName(t)} (${REG[t.mreg].n} piyasası). Sıradaki adım: izin başvurusu.`);markUndo({kind:"land",id,c});refresh();window.dispatchEvent(new CustomEvent("sebeke:land"));}
export function applyPermit(id){const t=S.sites[id],c=permitFee(t);if(S.money<c)return;S.money-=c;const d=permitDays(t);delete t.why;Object.assign(t,{permit:"pending",days:d});addLog(`${placeName(t)}: izin başvurusu yapıldı, inceleme yaklaşık ${d} gün sürecek.`);refresh();}
// Santral kur: aynı sahada aynı teknoloji ve ekipman kademesi tek kayıtta birikir; yatırılan tutar (cost) portföy değerine girer
export function build(id,k,q="std"){const c=capexOf(k,q);if(S.money<c||siteMW(id)+BLOCK>SITE_LIMIT||locked(k))return;S.money-=c;
  const o=S.sites[id],drill=k==="jes"&&o.well==null;
  // JES: ilk kuyu sondajı rezervuarın verimini ortaya çıkarır (sondaj riski); sahadaki sonraki bloklar aynı rezervuarı kullanır
  if(k==="jes"&&o.well==null){o.well=+(0.55+Math.random()*0.55).toFixed(2);
    const r=o.well>=0.95?"beklenenden iyi":o.well>=0.8?"beklendiği gibi":o.well>=0.68?"beklenenden zayıf":"hayal kırıklığı";
    addLog(`${placeName(o)}: jeotermal sondaj tamamlandı, rezervuar ${r} (beklenenin %${Math.round(o.well*100)}'i). Sahadaki tüm JES blokları bu verimle üretir.`);}
  let p=S.plants.find(x=>x.t===id&&x.k===k&&x.q===q);
  if(p){p.mw+=BLOCK;p.cost=(p.cost||0)+c;}else{p={t:id,k,q,mw:BLOCK,soc:0,cost:c};S.plants.push(p);}
  if(k==="hes")newDayHydro(p);
  if(k==="bes")planBio(p,S.hour);
  sfx("build");
  addLog(`${placeName(S.sites[id])}: +${BLOCK} MW ${TECH[k].n} kuruldu (${eqName(k,q)}, ${TIERS[q].toLocaleLowerCase("tr-TR")}).`);
  if(drill){U=null;clearTimeout(uT);}else markUndo({kind:"build",id,k,q,c});
  refresh();}
