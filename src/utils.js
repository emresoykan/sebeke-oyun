// Matematik, profil ve biçimlendirme yardımcıları
export const rnd=Math.random, clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export function gauss(){let u=0,v=0;while(!u)u=rnd();while(!v)v=rnd();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
export const shape=h=>(h>=6&&h<=19)?Math.max(0,Math.sin(Math.PI*(h-6+0.5)/14)):0;
export const prof=h=>0.8+0.25*Math.cos(Math.PI*(h-3)/12);
export const fmt$=x=>{const s=x<0?"−":"";x=Math.abs(x);return s+(x>=1e6?(x/1e6).toLocaleString("tr-TR",{maximumFractionDigits:2})+" M$":x>=1e3?(x/1e3).toLocaleString("tr-TR",{maximumFractionDigits:1})+" b$":Math.round(x)+" $");};
export const fmtP=x=>Math.round(x)+" $/MWh";
export const cssv=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
export const dots=v=>{const n=Math.round(v*5);return "●".repeat(n)+"○".repeat(5-n);};
