// --- Gün öncesi piyasası (GÖP) ve dengesizlik ---
// Gün başında her santral için o günün saatlik üretim tahmini yapılır. Tahmin gerçek üretimden sapar: hata rüzgârda
// güç eğrisinin dik bölgesinde (5-11 m/s) ve fırtınada, güneşte parçalı bulutlu havada büyür ve saatler arasında
// ilişkilidir. Oyuncu tahmini, teklif oranını, tahmin servisini ve bataryanın görevini GÖP masasında seçer; santraller
// teklif ettikleri miktarı (taahhüt) GÖP fiyatından satar. Gerçekleşen üretim taahhütten saparsa fark dengesizlik
// fiyatından kapanır: eksik üretim için PTF'nin %35 fazlası ödenir, fazla üretim PTF'nin %30 altından satılır.
// (Gerçek piyasada dengesizlik fiyatı PTF ile SMF'den türetilir; oran oyun dengesi için temsilîdir.)
import { S, D } from "./state.js";
import { clamp, gauss, shape } from "./utils.js";
import { eqOf } from "./equipment.js";
import { factor, salePrice } from "./mods.js";
import { siteWx } from "./wxsite.js";
import { sunRel, powerCurve } from "./weather.js";
import { CAL, noonAmp } from "./calendar.js";
import { spec } from "./profile.js";

export const K_SHORT=0.35, K_SURP=0.30;
export const RENEW=["ges","res","off"];
export const FC_FEE=4; // premium tahmin servisi: yenilenebilir MW başına günlük ücret ($)
export const deskDefaults=()=>({ratio:1,fc:"std",batt:"arb",auto:false});

// Bir santralin o saatteki gerçek üretimi (MWh), hava ve olay etkileriyle; tahmin ve tick aynı formülü kullanır
export function production(p,h){
  if(p.down)return {e:0,w:siteWx(S.sites[p.t],h)};
  const t=S.sites[p.t],q=eqOf(p),of=factor("out",t.mreg,p.k,h),w=siteWx(t,h);
  if(p.k==="ges")return {e:p.mw*t.solar*shape(h)*noonAmp(t.lat,CAL.decl)*sunRel(w,w.base)*1.24*q.perf*of*(t.snowDays>0?0.25:1),w};
  if(p.k==="res"||p.k==="off")return {e:p.mw*clamp(powerCurve(w.hub)*q.perf*of,0,1),w,v:w.hub};
  return {e:0,w};
}
// Saatlik tahmin hatası belirsizliği (σ, oran): rüzgârda güç eğrisinin dik bölgesi ve fırtına, güneşte parçalı bulut
function sigma(p,w){
  if(p.k==="ges")return 0.05+0.55*w.c*(1-w.c);
  const v=w.hub;return 0.12+(v>4.5&&v<11.5?0.16:0.05)+0.25*w.storm;
}

// tahmin hatasının genlik çarpanı: premium servis yarıya, tüccar uzmanlığı %35 azaltır
const fcK=()=>(S.desk.fc==="pre"?0.5:1)*(spec()==="trd"?0.65:1);
export const hasRenew=()=>S.plants.some(p=>RENEW.includes(p.k)&&p.fc);

// Gün başı: her yenilenebilir santral için gerçek üretim (gizli), tahmin ve belirsizlik; ardından teklif
export function dayAhead(){
  if(!S.desk)S.desk=deskDefaults();
  D.unc={};
  S.plants.forEach(p=>{
    if(!RENEW.includes(p.k))return;
    // hatanın şekli (ilişkili gürültü) gün başında bir kez çekilir; tahmin servisi yalnızca genliğini değiştirir
    p.fz=[];let z=0;for(let h=0;h<24;h++){z=0.75*z+0.66*gauss();p.fz.push(z);}
    p.sg=[];for(let h=0;h<24;h++)p.sg.push(sigma(p,production(p,h).w)*(0.75+0.5*h/23));
  });
  applyDesk();
}
// Teklif ayarlarını uygula: tahmin = gerçek × (1 + hata), taahhüt = tahmin × teklif oranı (sıfır fiyatlı GES saatleri hariç)
export function applyDesk(from=0){
  const d=S.desk,k=fcK();
  S.plants.forEach(p=>{
    if(!RENEW.includes(p.k)){p.fc=p.cm=null;return;}
    if(!p.fz)return; // gün ortasında kurulan santral: taahhüt yok, üretimi tahmin hatasız sayılır
    if(!p.fc)p.fc=Array(24).fill(0),p.cm=Array(24).fill(0);
    const t=S.sites[p.t],M=D[t.mreg];
    for(let h=from;h<24;h++){const e=production(p,h).e,f=clamp(e*(1+k*p.sg[h]*p.fz[h]),0,p.mw);p.fc[h]=f;
      p.cm[h]=p.k==="ges"&&salePrice(t.mreg,p.k,h,M.price[h])<=0?0:f*d.ratio;}
  });
}
// Masada gösterilecek özet: toplam tahmin, taahhüt, fiyat (seçili piyasa), beklenen GÖP geliri, belirsizlik
export function deskSummary(){
  const fc=Array(24).fill(0),cm=Array(24).fill(0),band=Array(24).fill(0),pw=Array(24).fill(0);let rev=0,mw=0,su=0,n=0;
  const k=fcK();
  S.plants.forEach(p=>{if(!RENEW.includes(p.k)||!p.fc)return;mw+=p.mw;const t=S.sites[p.t],M=D[t.mreg];
    for(let h=0;h<24;h++){fc[h]+=p.fc[h];cm[h]+=p.cm[h];band[h]+=p.fc[h]*p.sg[h]*k;pw[h]+=p.mw*M.price[h];
      rev+=p.cm[h]*salePrice(t.mreg,p.k,h,M.price[h]);if(p.fc[h]>0.05){su+=p.sg[h]*k;n++;}}});
  // fiyat: santrallerin kurulu gücüyle ağırlıklı ortalama piyasa fiyatı
  const price=pw.map(v=>mw?v/mw:0);
  return {fc,cm,band,price,rev,mw,unc:n?su/n:0,fee:Math.round(mw*FC_FEE)};
}
export const uncLabel=u=>u<0.1?"Düşük":u<0.2?"Orta":"Yüksek";
// Saatlik uzlaştırma: piyasa başına sapma (gerçek − taahhüt); dengeleme modundaki batarya sapmayı kapatır
export function settle(m,dev,pr,batts,st){
  let x=dev;
  if(S.desk&&S.desk.batt==="bal")for(const b of batts){const cap=b.mw*2,r=eqOf(b).rte||0.88;b.soc=b.soc||0;
    if(x<0){const e=Math.min(b.mw,b.soc*r,-x);b.soc-=e/r;x+=e;st.bBal+=e;}
    else if(x>0){const e=Math.min(b.mw,cap-b.soc,x);b.soc+=e;x-=e;st.bBal+=e;}}
  const cash=x>0?x*pr*(1-K_SURP):x*pr*(1+K_SHORT);
  if(x>0)st.surp+=x;else st.short-=x;
  return cash;
}
