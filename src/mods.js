// --- Geçici etkiler (olay kartlarından) ---
// S.mods: [{t:tür, m:piyasa|null, k:[teknolojiler]|null, v:değer, d:kalan gün, w:başlamadan önce beklenecek gün,
//          h:[başlangıç,bitiş] saat aralığı|null, label: arayüzde gösterilecek ad}]
//   price: fiyat çarpanı   out: üretim çarpanı   fix: sabit satış fiyatı ($/MWh, ikili anlaşma)
//   bonus: üretime ek destek ($/MWh)   capex: kurulum maliyeti çarpanı   risk: arıza olasılığı çarpanı
// Etkiler gün başında fiyatlara, saatlik tick'te üretim ve gelire uygulanır; her gün sonunda süreleri bir azalır.
import { S, D } from "./state.js";
import { EFF } from "./config.js";

const hit=(x,m,k,h)=>!(x.w>0)&&(!x.m||x.m===m)&&(!x.k||!k||x.k.includes(k))&&(!x.h||h==null||(h>=x.h[0]&&h<=x.h[1]));
export const mods=(t,m,k,h)=>(S.mods||[]).filter(x=>x.t===t&&hit(x,m,k,h));
export const factor=(t,m,k,h)=>mods(t,m,k,h).reduce((a,x)=>a*x.v,1);
// Yeni etki ekle; bugün başlayan fiyat etkisi bugünün kalan saatlerine hemen uygulanır
export function addMod(o){
  if(!S.mods)S.mods=[];const x={m:null,k:null,h:null,w:0,...o};S.mods.push(x);
  if(x.t==="price"&&!x.w)Object.keys(D).forEach(k=>{const M=D[k];if(!M||!M.price)return;
    let ch=false;for(let h=S.hour;h<24;h++)if(hit(x,k,null,h)){M.price[h]*=x.v;ch=true;}
    if(ch){M.avg=M.price.reduce((a,b)=>a+b,0)/24;M.plan=battPlan(M.price);}});
}
// Gün sonu: bekleyen etkiler bir gün yaklaşır, etkin olanların süresi bir azalır
export function ageMods(){S.mods=(S.mods||[]).filter(x=>x.w>0?(x.w--,true):--x.d>0);}

// Satış fiyatı: ikili anlaşma varsa sabit fiyat, yoksa spot; destek primi eklenir
export function salePrice(m,k,h,pr){const f=mods("fix",m,k,h)[0];return (f?f.v:pr)+mods("bonus",m,k,h).reduce((a,x)=>a+x.v,0);}

// Yeni günün fiyatlarına etkin fiyat etkilerini uygula, günlük ortalamayı ve batarya planını kur
export function priceMods(k,M){
  for(let h=0;h<24;h++)M.price[h]*=factor("price",k,null,h);
  M.avg=M.price.reduce((a,b)=>a+b,0)/24;M.plan=battPlan(M.price);
}
// Batarya: en ucuz iki saatte şarj, en pahalı iki saatte deşarj (kâr verimi karşılıyorsa)
export function battPlan(price){
  const idx=[...Array(24).keys()].sort((a,b)=>price[a]-price[b]),ch=idx.slice(0,2),dis=idx.slice(-2),plan=Array(24).fill(0);
  if((price[dis[0]]+price[dis[1]])*EFF>(price[ch[0]]+price[ch[1]])*1.05){ch.forEach(h=>plan[h]=1);dis.forEach(h=>plan[h]=-1);}
  return plan;
}
// Etkin olayların kısa listesi (arayüz için)
export const activeMods=()=>(S.mods||[]).filter(x=>x.label&&!(x.w>0));
