// Kare bazlı kurallar: izinli teknolojiler, arazi/izin maliyeti ve olasılıkları
import { REG } from "./config.js";

export function allowed(t){if(t.sea)return t.shallow?["off"]:[];if(!t.mreg)return[];const a=["ges","res","batt"];if(t.ter==="m")a.splice(2,0,"hes");return a;}
export function landCost(t){return t.sea?30000:REG[t.reg].land;}
export function permitFee(t){return t.sea?10000:5000;}
export function permitProb(t){let p=t.sea?0.6:({p:0.03,f:0.3,m:0.7,d:0.95,pl:0.85})[t.ter];if(t.mreg==="E")p*=0.9;return p;}
export function permitDays(t){return 3+Math.floor(Math.random()*4)+(t.ter==="f"?3:0)+(t.mreg==="E"?2:0)+(t.sea?2:0);}
export function rejectWhy(t){if(t.sea)return"kuş göç yolu ve balıkçılık alanı gerekçesiyle";return({p:"korunan alan olduğu için ÇED olumsuz bulundu",f:"orman alanında ağaç kesimine izin verilmedi",m:"su kaynakları ve yaban hayatı gerekçesiyle"})[t.ter]||"ÇED raporu yetersiz bulundu";}
export function oddsTxt(p){return p>=0.85?"Yüksek":p>=0.6?"Orta":p>=0.25?"Düşük":"Çok düşük";}
export function ministry(t){return t.mreg==="T"?"Tarım ve Orman Bakanlığı / ÇED":"Çevre ve orman otoritesi";}
