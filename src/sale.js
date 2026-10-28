// --- Saha satışı: portföydeki bir sahanın alıcı teklifi ---
// Alıcı (kurgusal bir altyapı fonu) sahayı gelir yöntemiyle değerler: her santral kaydının oyunda gerçekleşen günlük
// nakit akışı (satış geliri − yakıt − işletme gideri; loans.js histCFADS ile aynı tanım) bir ekonomik yıla çevrilir ve
// santral ömrü boyunca alıcının iskonto oranıyla bugüne indirgenir. Oyunda yatırımlar gerçeğin ~1/63'ü olduğundan
// 1 ekonomik yıl ≈ ECON_YEAR (5,8) oyun günü sayılır (loans.js); böylece değerin yatırıma oranı gerçek dünyadakiyle aynı kalır.
//   değer = max(0, günlük nakit akışı) × ECON_YEAR × anüite(iskonto, ömür)
// Basitleştirmeler: ömür santralin yaşına göre kısaltılmaz (oyunda santraller eskimez; proje ekonomisi tablosuyla aynı);
// alım garantisi ve dengesizlik maliyeti katılmaz (proje ekonomisi kaydı ac'de yoklar).
// Oyun dengesi varsayımları (gerçek piyasa verisi değildir; SALE): alıcının iskonto oranı oyuncunun WACC ayarından
// bağımsızdır (aksi halde oyuncu kendi teklifini şişirebilirdi); alıcı en az bir ekonomik yıllık (6 oyun günü) işletme
// geçmişi ister, yoksa yatırım bedelinin %90'ını verir; değer yatırım bedelinin %20'si ile 1,3 katı arasında tutulur; işlem
// masrafı %5. Geçmiş şartı ve üst sınır, kur-sat döngüsünün santrali işletmekten çok daha kârlı olmasını önler. Santralsiz sahada izinli arazi
// (inşaata hazır proje) arazi bedelinin 1,2 katına, izinsiz arazi 0,85 katına alınır. Sahaya bağlı krediler satış
// bedelinden kapanır. Satış kârı ya da zararı, bedelin defter değerinden (portföy değerine giren arazi + yatırım) farkıdır.
import { S } from "./state.js";
import { TECH, BLOCK } from "./config.js";
import { FIN } from "./finance.js";
import { EQUIP, tierOf } from "./equipment.js";
import { landCost } from "./rules.js";
import { ECON_YEAR } from "./loans.js";

export const SALE={wacc:0.10,fee:0.05,track:6,young:0.9,floor:0.2,cap:1.3,rtb:1.2,raw:0.85};
const annuity=(r,n)=>r>0?(1-(1+r)**-n)/r:n;
export const bookOf=p=>p.cost??TECH[p.k].capex*p.mw/BLOCK;

// Bir santral kaydının alıcı değeri. how: income (gelir yöntemi), young (veri az), batt (batarya gelir kaydı yok),
// cap / floor (sınıra takıldı)
export function plantValue(p){
  const book=bookOf(p),a=p.ac;
  if(!a||a.h<SALE.track*24||a.cap<=0)return {book,v:book*SALE.young,how:"young",hours:a?a.h:0};
  // dengeleme ya da kapalı modda batarya arbitraj geliri kaydetmez: değeri gelirden ölçülemez
  if(p.k==="batt"&&a.r<=0)return {book,v:book*SALE.young,how:"batt"};
  const opexDay=TECH[p.k].opex*EQUIP[p.k][tierOf(p)].opex*p.mw/BLOCK,cf=(a.r-(a.f||0))/a.cap*24*p.mw-opexDay;
  const ev=Math.max(0,cf)*ECON_YEAR*annuity(SALE.wacc,FIN[p.k].life),lo=book*SALE.floor,hi=book*SALE.cap;
  return {book,v:Math.min(hi,Math.max(lo,ev)),cf,ev,how:ev>hi?"cap":ev<lo?"floor":"income"};
}

// Sahanın teklifi: bedel (masraf sonrası), kalan kredi, nakde geçecek tutar, defter değeri ve kâr/zarar
export function saleOffer(id){
  const o=S.sites[id];if(!o)return null;
  const ps=S.plants.filter(p=>p.t===id),land=landCost(o);
  const landV=ps.length?land:land*(o.permit==="ok"?SALE.rtb:SALE.raw);
  const items=ps.map(p=>({p,...plantValue(p)}));
  const gross=landV+items.reduce((a,x)=>a+x.v,0),fee=gross*SALE.fee,price=Math.round((gross-fee)/100)*100;
  const debt=(S.loans||[]).filter(L=>L.t===id).reduce((a,L)=>a+L.bal,0);
  const book=land+items.reduce((a,x)=>a+x.book,0);
  return {id,land,landV,items,gross,fee,price,debt,net:price-debt,book,gain:price-book,ok:S.money+price-debt>=0};
}
