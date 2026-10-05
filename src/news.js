// --- Haber bandı verisi: rakip hamleleri, hava uyarıları, fiyat rekorları, olaylar, mevsim ---
// Haberler S.news'te saklanır (son 14); arayüz "sebeke:news" olayıyla güncellenir. DOM'a bağımlı değildir.
import { S } from "./state.js";

export function news(i,t,kind="info"){
  if(!S.news)S.news=[];
  S.news.unshift({d:S.dayNo,i,t,kind});S.news=S.news.slice(0,14);
  if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("sebeke:news"));
}
