// --- YEKDEM (Türkiye): Yenilenebilir Enerji Kaynakları Destekleme Mekanizması ---
// Gerçekte (YEKDEM Yönetmeliği; 7189 sayılı Cumhurbaşkanı Kararı; EPDK): lisanslı yenilenebilir santral her yıl 30 Kasım'a
// kadar başvurursa ertesi takvim yılı boyunca şebekeye verdiği enerjiyi YEKDEM fiyatından satar. Piyasa fiyatı daha
// yüksek olsa da bu fiyatı alır ve yıl içinde çıkamaz. Rüzgâr/güneşle bütünleşik depolamada depolanıp şebekeye verilen
// enerji daha yüksek fiyattan; şebekeden çekilip depolanan enerji kapsam dışı.
// Oyunda: Türkiye'deki GES (kara, yüzer, deniz üstü) ve kara RES sahaları (config.js YEKDEM). Sabit fiyat, satılan her MWh
// için satış fiyatıyla YEKDEM fiyatı arasındaki farkın ödenmesi ya da alınmasıyla uygulanır (nakit akışı aynı). Sahadaki
// bataryanın sahanın kendi üretiminden doldurduğu enerji ("yeşil" pay) boşaltılınca depolama fiyatını alır; bataryaya
// giden üretim şebekeye verilmemiş sayılır. Dengesizlik ve GÖP taahhüdü oyunun kendi kurallarıyla sürer.
// Basitleştirmeler: fiyat dolar cinsinden sabit (gerçekte TL, aylık güncellenir); 10 yıllık süre sınırı ve YEK belgesi
// yok; başlangıç desteği (alım garantisi, config.js FIT) süren saha o yıl katılamaz, ertesi yıl katılırsa destek biter.
// Oyun kolaylığı: sahanın ilk uygun santrali işletmeye girdiği yıl, ilk 30 takvim günü içinde o yıl için de katılabilir
// (gerçekte başvuru yalnızca ertesi yıl için). Proje ekonomisine (finance.js) katılmaz: ömür boyu getiri piyasa fiyatıyla kalır.
import { S, addLog } from "./state.js";
import { CAL, CAL_STEP, fmtDate } from "./calendar.js";
import { YEKDEM } from "./config.js";
import { placeName } from "./world.js";
import { news } from "./news.js";

const DAY=864e5;
export const yekYear=()=>CAL.date.getUTCFullYear();
const deadlineOf=y=>Date.UTC(y,10,30); // 30 Kasım (o gün dahil)
const fitOn=o=>!!(o&&o.fit&&S.dayNo<=o.fit.until);
const kindOk=k=>YEKDEM.kinds.includes(k);
const trn=x=>String(x).replace(".",","); // Türkçe ondalık

// sahada YEKDEM'e uygun, işletmede santral var mı (Türkiye, izinli saha)
export function yekEligible(id){const o=S.sites[id];return !!(o&&o.mreg==="T"&&o.permit==="ok"&&S.plants.some(p=>p.t===id&&kindOk(p.k)));}
// saha o yıl YEKDEM'de mi
export const yekOn=(id,y=yekYear())=>{const o=S.sites[id];return !!(o&&o.mreg==="T"&&o.yek&&o.yek[y]);};

// Panel için durum: bu yıl, ertesi yıl başvurusu, son başvuru tarihi, karşılaştırma için sahanın piyasadaki ortalama
// satış fiyatı (uygun santrallerin birikimli kaydı, finance.js acc)
export function yekStatus(id){
  const o=S.sites[id],y=yekYear(),now=CAL.date.getTime(),dl=deadlineOf(y);
  const newOk=o.yekNew!=null&&new Date(o.yekNew).getUTCFullYear()===y&&now-o.yekNew<=YEKDEM.newDays*DAY;
  let e=0,r=0;S.plants.forEach(p=>{if(p.t===id&&kindOk(p.k)&&p.ac){e+=p.ac.e;r+=p.ac.r;}});
  return {y,on:yekOn(id,y),next:!!(o.yek&&o.yek[y+1]),open:now<=dl,deadline:fmtDate(new Date(dl)),
    daysLeft:Math.max(0,Math.ceil((dl-now)/DAY/CAL_STEP)),canNow:!yekOn(id,y)&&newOk&&!fitOn(o),newOk,fit:fitOn(o),
    price:e>0?r/e:null,battery:S.plants.some(p=>p.t===id&&p.k==="batt")};
}
// ertesi yıl için başvur ya da başvuruyu geri çek (30 Kasım'a kadar)
export function yekApplyNext(id){
  if(!yekEligible(id))return false;const s=yekStatus(id);if(!s.open)return false;
  const o=S.sites[id];o.yek=o.yek||{};if(o.yek[s.y+1])delete o.yek[s.y+1];else o.yek[s.y+1]=1;
  addLog(`${placeName(o)}: ${s.y+1} YEKDEM başvurusu ${o.yek[s.y+1]?"yapıldı":"geri çekildi"}.`);return true;
}
// yeni saha: ilk uygun santralin işletmeye girdiği yıl için hemen katıl (yıl sonuna kadar çıkılamaz)
export function yekJoinNow(id){
  if(!yekEligible(id))return false;const s=yekStatus(id);if(!s.canNow)return false;
  const o=S.sites[id];o.yek=o.yek||{};o.yek[s.y]=1;
  addLog(`${placeName(o)}: ${s.y} yılının kalanı için YEKDEM'e katıldı; üretim ${trn(YEKDEM.p)} $/MWh sabit fiyattan satılır.`);return true;
}
// santral kurulunca (actions.js build): sahanın ilk uygun santralinin işletmeye girdiği tarih
export function yekBuilt(id,k){const o=S.sites[id];if(o&&o.mreg==="T"&&kindOk(k)&&o.yekNew==null)o.yekNew=CAL.date.getTime();}

// Saatlik uzlaştırma (sim.js tick). gen/val: saha başına YEKDEM'deki uygun üretim (MWh) ve satış değeri ($); ev: o saatin
// batarya olayları {p, e (MWh, depodan çekilen ya da depoya giren), c (doldurma mı), sb (olaydan önceki dolum), r (verim),
// pr (piyasa fiyatı)}. Batarya önce sahanın kendi üretiminden dolar ("yeşil" pay, p.gsoc); boşaltmada yeşil pay dolumdaki
// oranıyla çıkar. Dönen: nakde eklenecek fark ($; piyasa fiyatı YEKDEM'in üstündeyse eksi)
export function yekSettle(gen,val,ev){
  let x=0;const avail={...gen};
  for(const v of ev){const p=v.p;p.gsoc=Math.min(p.gsoc||0,v.sb); // dengeleme modunda harcanan dolum yeşil payı da azaltır
    if(v.c){const g=Math.min(v.e,avail[p.t]||0);avail[p.t]=(avail[p.t]||0)-g;p.gsoc+=g;}
    else{const gOut=v.sb>0?v.e*Math.min(1,p.gsoc/v.sb):0;p.gsoc-=gOut;x+=gOut*v.r*(YEKDEM.store-v.pr);}}
  for(const id in gen){const e=gen[id];if(e>0)x+=(avail[id]||0)*(YEKDEM.p-val[id]/e);}
  return x;
}
// batarya olayını kaydet: YEKDEM'deki sahada uzlaştırmaya girer, diğerlerinde yeşil pay sıfırlanır
export function yekBatt(ev,p,e,c,sb,r,pr,y){if(yekOn(p.t,y))ev.push({p,e,c,sb,r,pr});else if(p.gsoc)p.gsoc=0;}

// Gün başı (sim.js newDay): yeni takvim yılında başvurusu olan sahalar sabit fiyata geçer (başlangıç desteği biter);
// 1 Kasım'dan sonra, ertesi yıl için başvurusu olmayan uygun saha varsa bir kez hatırlatma
export function yekDay(){
  const y=yekYear(),now=CAL.date.getTime();
  if(S.yekY==null)S.yekY=y;
  else if(y>S.yekY){S.yekY=y;
    const on=Object.keys(S.sites).filter(id=>yekOn(id,y)&&yekEligible(id));
    on.forEach(id=>{const o=S.sites[id];if(fitOn(o)){o.fit.until=S.dayNo-1;addLog(`${placeName(o)}: YEKDEM'e geçtiği için başlangıç desteği (alım garantisi) sona erdi.`);}});
    if(on.length)news("🧾",`YEKDEM ${y}: Türkiye'deki ${on.length} sahan yıl boyunca ${trn(YEKDEM.p)} $/MWh sabit fiyattan satıyor.`);}
  if(now>=Date.UTC(y,10,1)&&now<=deadlineOf(y)&&S.yekRem!==y){
    const ids=Object.keys(S.sites).filter(id=>yekEligible(id)&&!yekOn(id,y+1));
    if(ids.length){S.yekRem=y;news("🗓️",`YEKDEM ${y+1} başvuruları 30 Kasım'a kadar: Türkiye'deki ${ids.length} sahan için saha panelinden karar ver (sabit ${trn(YEKDEM.p)} $/MWh ya da piyasa fiyatı).`);}}
}
