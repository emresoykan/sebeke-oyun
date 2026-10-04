// --- Aksiyonlar ---
import { BLOCK, SITE_LIMIT, REG, TECH } from "./config.js";
import { describe, placeName } from "./world.js";
import { S, save, addLog } from "./state.js";
import { landCost, permitFee, permitDays } from "./rules.js";
import { siteMW, newDayHydro, awardAch } from "./sim.js";
import { capexOf, eqName, TIERS } from "./equipment.js";
import { render } from "./ui/hud.js";
import { renderPanel } from "./ui/panel.js";
import { drawMap } from "./ui/map.js";

function refresh(){awardAch();save();renderPanel();drawMap();render();}

// Seçili noktada yeni saha aç (arazi satın al / deniz alanı kirala)
export function buyLand(){const t=describe(S.sel.lat,S.sel.lon),c=landCost(t);if(S.money<c)return;S.money-=c;
  const id="s"+(S.nextId++);S.sites[id]={...t,permit:"none"};S.sel={id,lat:t.lat,lon:t.lon};
  addLog(`${t.sea?"Deniz alanı tahsisi":"Arazi"} alındı: ${placeName(t)} (${REG[t.mreg].n} piyasası). Sıradaki adım: izin başvurusu.`);refresh();}
export function applyPermit(id){const t=S.sites[id],c=permitFee(t);if(S.money<c)return;S.money-=c;const d=permitDays(t);delete t.why;Object.assign(t,{permit:"pending",days:d});addLog(`${placeName(t)}: izin başvurusu yapıldı, inceleme yaklaşık ${d} gün sürecek.`);refresh();}
// Santral kur: aynı sahada aynı teknoloji ve ekipman kademesi tek kayıtta birikir; yatırılan tutar (cost) portföy değerine girer
export function build(id,k,q="std"){const c=capexOf(k,q);if(S.money<c||siteMW(id)+BLOCK>SITE_LIMIT)return;S.money-=c;
  let p=S.plants.find(x=>x.t===id&&x.k===k&&x.q===q);
  if(p){p.mw+=BLOCK;p.cost=(p.cost||0)+c;}else{p={t:id,k,q,mw:BLOCK,soc:0,cost:c};S.plants.push(p);}
  if(k==="hes")newDayHydro(p);
  addLog(`${placeName(S.sites[id])}: +${BLOCK} MW ${TECH[k].n} kuruldu (${eqName(k,q)}, ${TIERS[q].toLocaleLowerCase("tr-TR")}).`);
  refresh();}
