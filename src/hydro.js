// --- Hidrolojik yıl (Türkiye) ---
// Gerçekte: HES üretimi yıldan yıla yağışa ve kara göre büyük oynar (TEİAŞ: kapasite faktörü 2015–2025 arasında %20 ile %36).
// Yağışlı yılda bol su, talebin düşük, güneşin güçlü olduğu ilkbaharda fiyatı sıfıra yaklaştırır: 2026 Nisan–Mayıs PTF
// ortalaması 20,7 ve 13,0 $/MWh, HES üretimi 2025'in %58–59 üstünde (EPİAŞ, TEİAŞ). Kurak yılda açığı gaz kapatır; fiyat
// etkisi küçük kalır (2024 ve 2025 ilkbaharı). Yazın ve sonbaharda fazla su fiyatı az etkiler.
// Oyunda: her takvim yılının bir su endeksi var (w, config.js HYDRO). Bilinen gerçek yıllar HYDRO.known; sonraki her yıl
// 1 Ocak'ta TEİAŞ 2015–2025 yıllarından biri rastgele seçilerek belirlenir. Bu yüzden ertesi yılın YEKDEM kararı (30 Kasım)
// hidroloji bilinmeden verilir. Türkiye piyasasında saatlik fiyattan aylık ağırlıkla depth × (w − 1) düşülür (kurak yılda
// dry payıyla eklenir; sıfırın altına inmez); Türkiye'deki HES'lerin su bütçesi w ile çarpılır.
import { S, addLog } from "./state.js";
import { CAL } from "./calendar.js";
import { HYDRO } from "./config.js";
import { rnd } from "./utils.js";
import { news } from "./news.js";

const yearNow=()=>CAL.date.getUTCFullYear();
const HIST=Object.entries(HYDRO.hist).map(([y,w])=>({y:+y,w}));
const pct=w=>Math.round(Math.abs(w-1)*100);

// yılın su endeksi: bilinen gerçek yıl, kayıtta duran ya da (yılı gelmişse) şimdi seçilen geçmiş yıl
export function hydOf(y=yearNow()){
  const H=S.hyd||(S.hyd={});if(H[y])return H[y];
  if(HYDRO.known[y]!=null)return H[y]={w:HYDRO.known[y],real:1};
  if(y>yearNow())return null; // gelecek yıl henüz belli değil
  const h=HIST[Math.floor(rnd()*HIST.length)];return H[y]={w:h.w,ref:h.y};
}
export const hydW=(y=yearNow())=>{const h=hydOf(y);return h?h.w:1;};
// sınıf: kurak, normal, yağışlı, çok yağışlı
export function hydClass(w){
  return w<0.9?{k:"dry",n:"kurak",i:"🏜️"}:w<=1.1?{k:"norm",n:"normal",i:"💧"}:w<1.25?{k:"wet",n:"yağışlı",i:"🌧️"}:{k:"vwet",n:"çok yağışlı",i:"🌊"};
}
// geçmiş yılların sınıf dağılımı (panel: ertesi yılın riski için)
export function hydOdds(){const c={};HIST.forEach(h=>{const n=hydClass(h.w).n;c[n]=(c[n]||0)+1;});return {c,n:HIST.length,first:HIST[0].y,last:HIST[HIST.length-1].y};}

// Türkiye piyasasında saatlik fiyattan düşülecek tutar ($/MWh, piyasa çarpanından önce; eksi ise fiyat artar)
export function hydShift(d=CAL.date){
  const w=hydW(d.getUTCFullYear()),x=w-1;
  return HYDRO.depth*HYDRO.mon[d.getUTCMonth()]*(x<0?x*HYDRO.dry:x);
}
// Türkiye'deki HES'lerin su bütçesi çarpanı
export const hydVol=()=>hydW();

// kısa açıklama (haber, panel)
export function hydText(y=yearNow()){
  const h=hydOf(y);if(!h)return null;const c=hydClass(h.w);
  const vol=h.w>=1?`ortalamanın %${pct(h.w)} üstünde`:`ortalamanın %${pct(h.w)} altında`;
  const src=h.real?"gerçek yıl, TEİAŞ":`${h.ref} gibi`;
  const eff=c.k==="dry"?"ilkbahar fiyatları biraz yüksek":c.k==="norm"?"fiyatlara etkisi küçük":"ilkbaharda Türkiye'de fiyatlar düşük, öğle saatleri sıfıra yakın";
  return {c,t:`${c.n} bir yıl (${src}). HES'lere ${vol} su gelir; ${eff}.`};
}

// Gün başı (sim.js newDay): oyunun başında ve her yeni takvim yılında yılın hidrolojisi haber olur
export function hydDay(){
  const y=yearNow();if(S.hydY===y)return;S.hydY=y;
  const x=hydText(y);if(!x)return;
  news(x.c.i,`Hidroloji ${y}: ${x.t}`);addLog(`Hidroloji ${y}: ${x.t}`);
}
