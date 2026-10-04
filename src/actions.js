// --- Aksiyonlar ---
import { BLOCK, SITE_LIMIT, REG, TECH } from "./config.js";
import { describe, placeName } from "./world.js";
import { S, save, addLog } from "./state.js";
import { landCost, permitFee, permitDays } from "./rules.js";
import { siteMW, newDayHydro } from "./sim.js";
import { render } from "./ui/hud.js";
import { renderPanel } from "./ui/panel.js";
import { drawMap } from "./ui/map.js";

function refresh(){save();renderPanel();drawMap();render();}

// Seçili noktada yeni saha aç (arazi satın al / deniz alanı kirala)
export function buyLand(){const t=describe(S.sel.lat,S.sel.lon),c=landCost(t);if(S.money<c)return;S.money-=c;
  const id="s"+(S.nextId++);S.sites[id]={...t,permit:"none"};S.sel={id,lat:t.lat,lon:t.lon};
  addLog(`${t.sea?"Deniz alanı tahsisi":"Arazi"} alındı: ${placeName(t)} (${REG[t.mreg].n} piyasası). Sıradaki adım: izin başvurusu.`);refresh();}
export function applyPermit(id){const t=S.sites[id],c=permitFee(t);if(S.money<c)return;S.money-=c;const d=permitDays(t);delete t.why;Object.assign(t,{permit:"pending",days:d});addLog(`${placeName(t)}: izin başvurusu yapıldı, inceleme yaklaşık ${d} gün sürecek.`);refresh();}
export function build(id,k){const c=TECH[k].capex;if(S.money<c||siteMW(id)+BLOCK>SITE_LIMIT)return;S.money-=c;
  const ex=S.plants.find(p=>p.t===id&&p.k===k);if(ex)ex.mw+=BLOCK;else S.plants.push({t:id,k,mw:BLOCK,soc:0});
  if(k==="hes")newDayHydro(S.plants.find(p=>p.t===id&&p.k==="hes"));
  refresh();}
