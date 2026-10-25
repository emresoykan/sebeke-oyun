// Kare bazlı kurallar: izinli teknolojiler, arazi/izin maliyeti ve olasılıkları
import { REG, MAR_UNLOCK, SITE_LIMIT } from "./config.js";
import { spec } from "./profile.js";
import { S } from "./state.js";
import { fillRes } from "./world.js";
import { slopeCached } from "./slope.js";

// Arazi eğimi sınırları (%, sahanın 250 m çevresinin ortalaması). Mevzuatta tek bir sayı yok; yaygın saha geliştirme
// pratiğine göre yaklaşık değerler: sabit eğimli GES düz araziye (≤%10) kurulur, güneye bakan yamaçta ~%15'e kadar
// kabul edilir (sıralar birbirini gölgelemez, hafriyat makul kalır). Batarya, biyokütle ve jeotermal santral binası düz
// parsel ister. Rüzgâr türbinleri sırtlara kurulur: yol ve platform yapılabilecek ~%40'a kadar. HES vadide kurulur: sınır yok.
export const SLOPE={flat:10,south:15,res:40};
export const slopeOfSite=t=>t.slope!==undefined?t.slope:slopeCached(t.lat,t.lon);
// eğim nedeniyle kurulamayan teknoloji mi (ölçülmediyse veya ölçülemediyse kısıt yok)
export function tooSteep(k,t){
  const s=slopeOfSite(t);if(!s||t.sea)return false;
  if(k==="ges")return s.mean>(s.south?SLOPE.south:SLOPE.flat);
  if(k==="batt"||k==="bes"||k==="jes")return s.mean>SLOPE.flat;
  if(k==="res")return s.mean>SLOPE.res;
  return false;
}

// İzinli teknolojiler: HES dağlık bölgede, JES jeotermal kuşakta, BES hammaddesi olan karada, deniz enerjisi sığ denizde;
// arazi eğimi ölçüldüyse fazla eğimli yerde düz arazi isteyen teknolojiler çıkar
export const allowed=t=>baseAllowed(t).filter(k=>!tooSteep(k,t));
// eğim kuralı uygulanmadan önceki liste (panelde hangi teknolojinin eğim yüzünden düştüğünü söylemek için)
export function baseAllowed(t){
  fillRes(t);
  if(t.urban)return[];if(t.sea)return t.shallow?["off","mar"]:[];if(!t.mreg)return[];
  const a=["ges","res"];if(t.ter==="m")a.push("hes");if(t.geo>=0.3)a.push("jes");if(t.bio>=0.4)a.push("bes");a.push("batt");return a;
}
// Deniz enerjisi gelişmekte olan bir teknoloji: yeterli deneyim (kurulu güç) olmadan yatırım yapılamaz
export const totalMW=()=>S.plants.reduce((a,p)=>a+p.mw,0);
export const locked=k=>k==="mar"&&totalMW()<MAR_UNLOCK;
export function landCost(t){return t.sea?30000:REG[t.reg].land;}
export function permitFee(t){return t.sea?10000:5000;}
// küçültülmüş projede (Projeyi küçült seçeneği, t.cap) etki alanı daralır, onay ihtimali artar
export function permitProb(t){let p=t.sea?0.6:({p:0.03,f:0.3,m:0.7,d:0.95,pl:0.85})[t.ter];if(t.mreg==="E")p*=0.9;if(spec()==="reg"&&t.ter!=="p")p=Math.min(0.98,p+0.1);if(t.cap)p=Math.min(0.97,p*1.2+0.05);if(t.boost)p=Math.min(0.98,Math.max(0.01,p+t.boost));return p;}
// inceleme süresi aralığı (gün): 3–6 gün, ormanda, Avrupa'da ve denizde daha uzun
export function permitRange(t){const e=(t.ter==="f"?3:0)+(t.mreg==="E"?2:0)+(t.sea?2:0)-(spec()==="reg"?1:0);return [3+e,6+e];}
export function permitDays(t,[a,b]=permitRange(t)){return a+Math.floor(Math.random()*(b-a+1));}
// Sahanın kurulu güç sınırı (küçültülmüş projede SHRINK_MW)
export const SHRINK_MW=20;
export const siteCap=t=>t&&t.cap?t.cap:SITE_LIMIT;
// İzin reddinden sonra başvuru yolları: maliyet, süre aralığı ve onay ihtimali başvurudan önce görünür.
// Ek ÇED dosyayı güçlendirir (pahalı, biraz uzun); küçültme saha sınırını SHRINK_MW'a indirir; yerel ortak incelemeyi kısaltır.
export function permitOptions(t){
  const fee=permitFee(t),r=permitRange(t),p=permitProb(t),o=[
    {k:"n",l:"Normal başvuru",sub:"Aynı dosyayla yeniden başvur.",fee,d:r,p}];
  o.push({k:"ced",l:"Ek ÇED çalışması",sub:"Kuş, su ve toprak etüdüyle dosyayı güçlendir.",fee:fee*3,d:[r[0]+2,r[1]+2],p:optProb(t,"ced")});
  if(!t.cap)o.push({k:"small",l:"Projeyi küçült",sub:`Saha sınırı ${SHRINK_MW} MW'a iner; daha az arazi ve çevre etkisi.`,fee,d:r,p:permitProb({...t,cap:SHRINK_MW})});
  o.push({k:"local",l:"Yerel ortakla çalış",sub:"Yerel bir ortak dosyayı takip eder; inceleme kısalır, ihtimal değişmez.",fee:fee+10000,d:[Math.max(1,r[0]-2),Math.max(1,r[1]-3)],p});
  return o;
}
// başvuru sonuçlanırken onay ihtimali (inceleme sürerken olay kartlarının etkisi de girer)
export function optProb(t,k){const p=permitProb(t);return k==="ced"?Math.min(0.97,p*1.35+0.05):p;}
export function rejectWhy(t){if(t.sea)return"kuş göç yolu ve balıkçılık alanı gerekçesiyle";return({p:"korunan alan olduğu için ÇED olumsuz bulundu",f:"orman alanında ağaç kesimine izin verilmedi",m:"su kaynakları ve yaban hayatı gerekçesiyle"})[t.ter]||"ÇED raporu yetersiz bulundu";}
export function oddsTxt(p){return p>=0.85?"Yüksek":p>=0.6?"Orta":p>=0.25?"Düşük":"Çok düşük";}
export function ministry(t){return t.mreg==="T"?"Tarım ve Orman Bakanlığı / ÇED":"Çevre ve orman otoritesi";}
