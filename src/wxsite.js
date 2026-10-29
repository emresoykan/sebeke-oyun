// --- Hava durumunun oyuna bağlanması ---
// Gün başında 24 saatlik tahmin (D.wxf: saat başına hava sistemlerinin anlık görüntüsü) üretilir; fiyatlar piyasaların
// temsilî noktasındaki tahmine, santral üretimi sahanın kendi havasına göre hesaplanır.
import { S, D } from "./state.js";
import { sampleWx, siteBase, lerpWx, isCold, powerCurve } from "./weather.js";
import { describe } from "./world.js";
import { WFLEET } from "./windfleet.js";
import { prof } from "./utils.js";

// Her piyasanın fiyatını belirleyen temsilî nokta (enlem, boylam)
export const MREF={T:[39,35],E:[50,10],N:[39,-95],S:[-15,-55],F:[5,20],M:[27,45],A:[32,105],O:[-27,135]};

// Piyasanın rüzgâr filosu: o saatte filonun güç eğrisinden ortalama kapasite oranı (0–1), noktaların ağırlığıyla. Fiyattaki
// rüzgâr etkisi bundan hesaplanır (sim.js): rüzgâr filonun bulunduğu bölgelerde estiğinde fiyat düşer, bir santralin
// üretimi de bu bölgelerin havasıyla birlikte hareket eder (gerçekte rüzgârın yakalama oranı 1'in altında kalır).
// Filosu tanımlı olmayan piyasada null (tek temsilî nokta kullanılır).
const FLEET=new Map();
function fleetOf(k){if(!WFLEET[k])return null;if(!FLEET.has(k))FLEET.set(k,WFLEET[k].map(([la,lo,w])=>({t:describe(la,lo),w})).filter(x=>x.t&&x.t.wind!=null));return FLEET.get(k);}
export function fleetWind(k,h){const F=fleetOf(k);if(!F||!F.length)return null;let s=0,W=0;for(const {t,w} of F){s+=w*powerCurve(siteWx(t,h).hub);W+=w;}return s/W;}

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
