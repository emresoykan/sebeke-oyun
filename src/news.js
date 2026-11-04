// --- Haber bandı verisi: rakip hamleleri, hava uyarıları, fiyat rekorları, olaylar, mevsim ---
// Haberler S.news'te saklanır (son 14); arayüz "sebeke:news" olayıyla güncellenir. DOM'a bağımlı değildir.
import { S } from "./state.js";
import { CAL, fmtDate } from "./calendar.js";
import { REAL_NEWS } from "./data/realnews.js";

export function news(i,t,kind="info"){
  if(!S.news)S.news=[];
  S.news.unshift({d:S.dayNo,i,t,kind});S.news=S.news.slice(0,14);
  if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("sebeke:news"));
}

// Gerçek dünyadan haberler (data/realnews.js): oyun takvimi tarihi geçince bir kez (S.rn: gösterilenler)
export function realNews(){
  const seen=S.rn||(S.rn=[]),now=CAL.date.getTime();
  for(const n of REAL_NEWS){const d=Date.parse(n.d);if(seen.includes(n.id)||now<d)continue;seen.push(n.id);
    news(n.i,`Gerçek dünyadan (${fmtDate(new Date(d))}): ${n.t}`,"real");}
}
