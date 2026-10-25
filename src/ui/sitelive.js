// --- Yakında saha sınırı ve canlı üretim (Apple haritası ve MapLibre ortak) ---
// Sınır, 40 MW'lık bir sahanın kabaca kapladığı alandır: sitemodel.js'te tam dolu RES dizilimi (8 türbin, iki sıra)
// ~1,6 × 0,7 km, 40 MW GES ~0,7 km kare tutar. Boş sahada bu varsayılan dikdörtgen çizilir; tesis görüntüsü daha
// genişse sınır onu içine alacak kadar büyür.
import { S, D } from "../state.js";
import { SITE_LIMIT } from "../config.js";
import { LIVE } from "../sim.js";

export const BND=[-900,900,-500,500]; // doğu en az/en çok, kuzey en az/en çok (metre, saha koordinatına göre)
export function bndOf(img){
  const [e0,e1,n0,n1]=BND;if(!img)return BND;
  return [Math.min(e0,img.east[0]-40),Math.max(e1,img.east[1]+40),Math.min(n0,img.north[0]-40),Math.max(n1,img.north[1]+40)];
}
export const occText=mw=>`${mw}/${SITE_LIMIT} MW • ${mw?(mw<SITE_LIMIT?`${SITE_LIMIT-mw} MW boş`:"dolu"):"boş saha"}`;
const f1=v=>v.toLocaleString("tr-TR",{maximumFractionDigits:1,minimumFractionDigits:v>0&&v<10?1:0});
// Son oyun saatinde sahanın ürettiği güç ve ortalama satış fiyatı (sim.js LIVE); santral yoksa boş metin
export function liveText(id){
  if(!S.plants.some(p=>p.t===id))return "";
  const o=LIVE[id];
  if(!o||Math.abs(o.mw)<0.05){const t=S.sites[id],M=t&&D[t.mreg],h=(S.hour+23)%24;return M?`Şu an üretim yok • piyasa ${Math.round(M.price[h])} $/MWh`:"Şu an üretim yok";}
  if(o.mw<0)return `Şarj ediyor ${f1(-o.mw)} MW • ${Math.round(o.r/o.mw)} $/MWh`;
  return `Şu an ${f1(o.mw)} MW üretiyor • ${Math.round(o.r/o.mw)} $/MWh`;
}
