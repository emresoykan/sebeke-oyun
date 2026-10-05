// Matematik, profil ve biçimlendirme yardımcıları
import { CAL, TR_LAT } from "./calendar.js";
export const rnd=Math.random, clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export function gauss(){let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
// Güneş eğrisi (0-1): gün doğumu ve batımı mevsime göre değişir (Türkiye enlemi; takvim calendar.js'te).
// Üretimde 1,24 katsayısı: mevsimli eğrinin yıllık ortalaması eski sabit 13 saatlik eğriye denk gelsin diye
export const shape=h=>{const t=(h+0.5-CAL.rise)/CAL.len;return t>0&&t<1?Math.sin(Math.PI*t):0;};
export const prof=h=>0.8+0.25*Math.cos(Math.PI*(h-3)/12);
export const fmt$=x=>{const s=x<0?"−":"";x=Math.abs(x);return s+(x>=1e6?(x/1e6).toLocaleString("tr-TR",{maximumFractionDigits:2})+" M$":x>=1e3?(x/1e3).toLocaleString("tr-TR",{maximumFractionDigits:1})+" b$":Math.round(x)+" $");};
export const fmtP=x=>Math.round(x)+" $/MWh";
export const cssv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
export const dots=v=>{const n=Math.round(v*5);return "●".repeat(n)+"○".repeat(5-n);};
// Gün ışığı (0 gece – 1 tam gündüz): doğum/batım ve öğle yüksekliği mevsime göre; 3D sahne ve harita ortak kullanır
export const sunElevation=h=>{const t=(h+0.5-CAL.rise)/CAL.len;return t<0||t>1?-0.2:Math.sin(Math.PI*t)*(90-Math.abs(TR_LAT-CAL.decl))*Math.PI/180;};
export const daylight=h=>clamp((Math.sin(sunElevation(h))+0.05)/0.35,0,1);
