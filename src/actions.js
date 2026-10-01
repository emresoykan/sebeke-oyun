// --- Aksiyonlar ---
import { BLOCK, TILE_LIMIT, REG, TECH } from "./config.js";
import { T } from "./world.js";
import { S, save, addLog } from "./state.js";
import { landCost, permitFee, permitDays } from "./rules.js";
import { tileMW, newDayHydro } from "./sim.js";
import { render } from "./ui/hud.js";
import { renderPanel } from "./ui/panel.js";
import { drawMap } from "./ui/map.js";

export function buyLand(i){const t=T[i],c=landCost(t);if(S.money<c)return;S.money-=c;S.tiles[i]={permit:"none"};addLog(`${t.sea?"Deniz alanı tahsisi":"Arazi"} alındı (${REG[t.mreg].n}). Sıradaki adım: izin başvurusu.`);save();renderPanel();drawMap();render();}
export function applyPermit(i){const t=T[i],c=permitFee(t);if(S.money<c)return;S.money-=c;const d=permitDays(t);S.tiles[i]={permit:"pending",days:d};addLog(`İzin başvurusu yapıldı, inceleme yaklaşık ${d} gün sürecek.`);save();renderPanel();drawMap();render();}
export function build(i,k){const c=TECH[k].capex;if(S.money<c||tileMW(i)+BLOCK>TILE_LIMIT)return;S.money-=c;
  const ex=S.plants.find(p=>p.t==i&&p.k===k);if(ex)ex.mw+=BLOCK;else S.plants.push({t:i,k,mw:BLOCK,soc:0});
  if(k==="hes")newDayHydro(S.plants.find(p=>p.t==i&&p.k==="hes"));
  save();renderPanel();drawMap();render();}
