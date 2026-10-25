// --- İlk oturum eğitimi ---
// Görev zincirinin ilk TUT_N görevi (missions.js) oyuncuyu yer seçiminden ilk satışa ve ilk günlük rapora götürür.
// S.ob eğitimin kalıcı durumudur (kayda girer, sayfa yenilenince kaldığı yerden sürer):
//   pick: iyi bir yer seçildi • tech: izinli sahada teknoloji sekmesi seçildi • prod / sale: ilk üretim ve ilk satış
//   rep: ilk günlük rapor açıldı • g: ilk izin kolaylığı kullanıldı • first: ilk satış saatinin özeti (sonuç kartı)
//   card: sonuç kartı gösterildi
// İleri düzey araçlar aşamalı açılır: kredi, proje ekonomisi (LCOE, NPV, IRR, PPA) ve capture oranı ilk satıştan sonra;
// GÖP masası ve olay kartlarının kendiliğinden açılması eğitim bitince.
import { S } from "./state.js";
import { allowed, permitProb } from "./rules.js";
import { rivalNear } from "./rivals.js";
import { expectedCF, windSpeedOf, windClass, wxLabel } from "./weather.js";
import { fillRes } from "./world.js";
import { siteWx } from "./wxsite.js";
import { shape } from "./utils.js";

export const TUT_N=8;
export const ob=()=>S.ob||(S.ob={});
export const inTutorial=()=>(S.mi||0)<TUT_N;
export const proOn=()=>!!ob().sale;
export const fullOn=()=>!inTutorial();

// İlk proje için uygun yer mi: karada, kurulabilir GES ya da RES, izin ihtimali en az orta (ova, çöl, dağ) ve güneşi
// ya da rüzgârı en az ●●● (Türkiye ortalaması düzeyi). owned: satın alınmış saha (rakip yakınlığına bakılmaz)
export function spotCheck(t,owned=false){
  if(!t||t.reg==="X"||t.reg==="G"||!t.mreg)return {ok:false,why:"Burada santral kurulamaz."};
  if(t.sea)return {ok:false,why:"Deniz projeleri pahalıdır ve izni zor çıkar; ilk projen için karada bir yer seç."};
  if(t.urban)return {ok:false,why:"Yerleşim alanında arazi satılmaz; şehrin dışına bak."};
  if(!owned&&rivalNear(t.lat,t.lon))return {ok:false,why:"Rakip bir sahaya çok yakın."};
  fillRes(t);const ks=allowed(t);
  if(!ks.includes("ges")&&!ks.includes("res"))return {ok:false,why:"Arazi GES ve RES için fazla eğimli."};
  if(permitProb(t)<0.6)return {ok:false,low:true,why:t.ter==="p"?"Korunan alan: burada izin neredeyse hiç verilmez.":t.ter==="f"?"Orman alanı: izin ihtimali düşük, başvurun reddedilebilir.":"İzin ihtimali düşük."};
  const sun=ks.includes("ges")&&t.solar>=0.5,wind=ks.includes("res")&&windClass(expectedCF(windSpeedOf(t)))>=3;
  if(!sun&&!wind)return {ok:false,why:"Güneş ve rüzgâr burada zayıf: en az ●●● olan bir yer ara."};
  return {ok:true,sun,wind};
}
// İlk izin kolaylığı: ilk santral kurulana kadar, uygun ilk sahanın ilk başvurusu onaylanır (oyuncuya söylenmez)
export const easyPermit=t=>!ob().g&&(S.mi||0)<5&&spotCheck(t,true).ok;

// Saatlik tick sonrası (sim.js): ilk üretim ve ilk satış kaydı. live: saha başına son saatin üretimi ve geliri (sim.js LIVE).
// Yeni bir ilk gerçekleştiyse true döner (görevler denetlensin)
export function noteHour(h,live){
  const o=ob();if(o.sale)return false;
  let best=null,mw=0,r=0;
  for(const id in live){const x=live[id];if(x.mw>0){mw+=x.mw;r+=x.r;if(!best||x.mw>live[best].mw)best=id;}}
  if(mw<0.05)return false;
  const was=o.prod;o.prod=1;
  if(r>0.5){o.sale=1;o.first=summary(best,h,mw,r,live[best].mw);}
  return !was||o.sale;
}
// İlk satış saatinin özeti: üretim, fiyat, gelir ve havanın etkisi (üretimin en çok olduğu sahadan)
function summary(id,h,mw,r,own){
  const t=S.sites[id],ps=S.plants.filter(p=>p.t===id&&!p.down),w=siteWx(t,h),night=shape(h)===0,l=wxLabel(w,night);
  const gen=ps.filter(p=>p.k!=="batt").reduce((a,p)=>a+p.mw,0)||1,f=Math.round(Math.min(1,own/gen)*100);
  const ks=new Set(ps.map(p=>p.k));let fx;
  if(ks.has("res")||ks.has("off"))fx=`Türbin yüksekliğinde rüzgâr ${w.hub.toFixed(0)} m/s esti: santral kapasitesinin %${f} kadarıyla üretti. Rüzgâr hızlandıkça üretim artar, 25 m/s üstünde türbinler durur.`;
  else if(ks.has("ges"))fx=`${l.t}: paneller kapasitenin %${f} kadarıyla üretti. ${w.c>0.4?"Bulutlar ışığı azaltıp üretimi düşürdü; açık havada daha çok üretir.":(h<12?"Güneş yükseldikçe üretim öğleye kadar artar.":"Güneş alçaldıkça üretim akşama doğru azalır.")}`;
  else fx=`${l.t}: santral kapasitesinin %${f} kadarıyla üretti.`;
  return {id,h,mwh:+mw.toFixed(2),price:Math.round(r/mw),rev:Math.round(r),wx:`${l.i} ${l.t}`,fx};
}
