// --- Hava durumunun oyuna bağlanması ---
// Gün başında 24 saatlik tahmin (D.wxf: saat başına hava sistemlerinin anlık görüntüsü) üretilir; fiyatlar piyasaların
// temsilî noktasındaki tahmine, santral üretimi sahanın kendi havasına göre hesaplanır.
import { S, D } from "./state.js";
import { sampleWx, siteBase, lerpWx, isCold } from "./weather.js";
import { prof } from "./utils.js";

// Her piyasanın fiyatını belirleyen temsilî nokta (enlem, boylam)
export const MREF={T:[39,35],E:[50,10],N:[39,-95],S:[-15,-55],F:[5,20],M:[27,45],A:[32,105],O:[-27,135]};

// Oyun saati → harita animasyonu: son tick zamanı ve tick süresi (main.js ayarlar)
export const clock={at:0,ms:500,paused:false};
export const frac=()=>clock.paused?0:Math.min(1,(performance.now()-clock.at)/clock.ms);

// Saatteki hava durumu anlık görüntüsü; f verilirse bir sonraki saate doğru ara değer
export function snap(h=S.hour,f=0){const W=D.wxf;if(!W)return S.wx;const a=W[Math.min(h,24)];if(!f||!W[h+1])return a;return lerpWx(a,W[h+1],f);}
// Bir sahada (veya herhangi bir noktada) o saatteki hava
// hub: türbin göbek yüksekliğindeki rüzgâr (gece-gündüz döngüsüyle; üretim bu hızdan hesaplanır)
const hub=(w,h)=>w.v*prof(h)/0.85;
// snow: yağış soğuk bölgede kar olarak düşer
export function siteWx(t,h=S.hour){const b=siteBase(t),hh=Math.min(h,23),w=sampleWx(snap(hh),t.lat,t.lon,b);return {...w,hub:hub(w,hh),base:b,snow:w.rain>0.25&&isCold(t.lat,t.ter==="m")};}
// Gelecek saatlerin tahmini: [ {h, w} ]
export function siteForecast(t,from=S.hour,step=3,n=8){const b=siteBase(t),out=[];for(let i=0;i<n;i++){const h=from+i*step;if(h>23)break;{const w=sampleWx(snap(h),t.lat,t.lon,b);w.hub=hub(w,h);w.snow=w.rain>0.25&&isCold(t.lat,t.ter==="m");out.push({h,w});}}return out;}
