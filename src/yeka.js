// --- YEKA (Türkiye): Yenilenebilir Enerji Kaynak Alanı yarışmaları ---
// Gerçekte: Bakanlık belirli illerde saha ve şebeke bağlantı kapasitesi için yarışma açar. 2026'da RES (2 Kasım) ve GES
// (3 Kasım) yarışmalarının hepsi taban fiyatta kapandı; kazananı MW başına katkı payı belirledi. Kazanan imzadan sonra RES'te
// 72, GES'te 60 ay serbest piyasada satar, ardından 20 yıl yarışma fiyatından (YEKDEM kapsamında) satar.
// Oyunda: her yıl 2 Kasım'dan sonra bir kez (eğitim bittiyse ve santralin varsa) bir YEKA kartı çıkar: RES ya da GES,
// 2026 yarışmalarının illerinden biri. Fiyat taban fiyattır; oyuncu yalnızca katkı payını seçer. Rakibin en iyi teklifi 2026'nın
// gerçek kazanan katkı paylarından biridir; ondan yüksek teklif kazanır. Kazanınca izni hazır, sınırı yarışmaya göre bir saha
// gelir. Serbest piyasa dönemi ve sabit fiyat süresi ekonomik yılla ölçülür (loans.js ECON_YEAR, başlangıç desteği gibi);
// katkı payı yatırım maliyetiyle aynı ölçekte (gerçek tutar × ECON_YEAR/365). Sabit fiyat oranla taşınır (config.js YEKA).
// Basitleştirmeler: başvuru ve teminat yok, yapım yükümlülüğü yok, katkı payı kazanınca bir kerede ödenir; YEKA sahası
// YEKDEM'e ayrıca başvuramaz; sözleşme yalnızca yarışmanın teknolojisine (RES ya da GES) uygulanır.
import { S, D, addLog, save } from "./state.js";
import { CAL, fmtDate } from "./calendar.js";
import { YEKA, SITE_MIN_KM } from "./config.js";
import { ECON_YEAR } from "./loans.js";
import { describe, km } from "./world.js";
import { rivalSites } from "./rivals.js";
import { fullOn } from "./tutorial.js";
import { rnd, fmt$ } from "./utils.js";
import { news } from "./news.js";
import { showEvent } from "./ui/eventcard.js";

const trn=(x,d=1)=>x.toFixed(d).replace(".",",");
export const yekaPrice=k=>YEKA[k].p; // $/MWh (config.js)
export const yekaCap=mw=>Math.max(10,Math.round(mw/3/5)*5);
const feeGame=(kEur,mw)=>Math.round(kEur*1000*YEKA.eur*mw*ECON_YEAR/365); // oyun $
// rakibin en iyi teklifinden yüksek teklif kazanır (rakip: 2026'nın gerçek kazanan katkı paylarından biri)
export const winOdds=(k,bid)=>YEKA[k].fees.filter(f=>f<bid).length/YEKA[k].fees.length;

// sahada bu saat YEKA sabit fiyatı geçerli mi (yarışmanın teknolojisi, serbest piyasa döneminden sonra, süre içinde)
export const yekaOn=(t,k)=>!!(t&&t.yeka&&t.yeka.k===k&&S.dayNo>=t.yeka.from&&S.dayNo<=t.yeka.until);
// saatlik uzlaştırma (sim.js): saha başına sabit fiyattaki üretim (MWh) ve piyasadaki satış değeri ($) → nakde eklenecek fark
export function yekaSettle(gen,val){let x=0;for(const id in gen){const t=S.sites[id];if(t&&t.yeka)x+=gen[id]*t.yeka.p-val[id];}return x;}

// panel için durum
export function yekaStatus(t){
  const y=t.yeka,now=S.dayNo;if(!y)return null;
  return {...y,phase:now<y.from?"merch":now<=y.until?"fixed":"done",daysToFix:Math.max(0,y.from-now),daysLeft:Math.max(0,y.until-now+1),fixDays:y.until-y.from+1};
}

// yarışma sahası: 2026 listesinden, oyuncunun ya da rakiplerin sahasına SITE_MIN_KM'den yakın olmayan biri
function pickSite(k){
  const taken=[...Object.values(S.sites).map(o=>[o.lat,o.lon]),...rivalSites().map(x=>[x.s.lat,x.s.lon])];
  const free=YEKA[k].sites.filter(([,,la,lo])=>taken.every(([a,b])=>km(la,lo,a,b)>=SITE_MIN_KM));
  return free.length?free[Math.floor(rnd()*free.length)]:null;
}

// kazanınca: izni hazır saha ve sözleşme
function award(k,s,bid,y){
  const [nm,mw,la,lo]=s,cap=yekaCap(mw),fee=feeGame(bid,cap),id="s"+(S.nextId++);S.money-=fee;
  const from=S.dayNo+Math.round(YEKA[k].merch*ECON_YEAR),until=from+Math.round(YEKA.years*ECON_YEAR)-1;
  S.sites[id]={...describe(la,lo),permit:"ok",cap,yeka:{k,p:yekaPrice(k),from,until,fee,bid,y,n:`${YEKA[k].n}-${y} ${nm}`}};
  return {id,cap,fee};
}

// kart: yılın yarışması (yalnızca bir kez); çıkmazsa false
export function yekaCard(k=rnd()<0.5?"res":"ges"){
  const y=CAL.date.getUTCFullYear(),s=pickSite(k);if(!s)return false;
  const [nm,mw]=s,cap=yekaCap(mw),P=yekaPrice(k),T=YEKA[k],merchD=Math.round(T.merch*ECON_YEAR),fixD=Math.round(YEKA.years*ECON_YEAR);
  const real=T.ec*10*YEKA.eur,avg=D.T?D.T.avg:null,title=`YEKA ${T.n}-${y}: ${nm}`;
  const text=`Bakanlık ${nm} için ${mw} MWe'lık bir ${k==="res"?"rüzgâr":"güneş"} sahası ve şebeke bağlantı kapasitesi tahsis ediyor (oyunda ${cap} MW). Teklifler 5,50 €c/kWh tavandan iner; 2026'da bütün yarışmalar taban fiyatta (${trn(T.ec,2)} €c/kWh) kapandı, kazananı MW başına katkı payı belirledi. Kazanırsan izni hazır sahayı alırsın (bağlantı kontenjanına sayılmaz): ${T.merch} ekonomik yıl (~${merchD} gün) serbest piyasada satarsın, sonra ${YEKA.years} yıl (~${fixD} gün) ${trn(P)} $/MWh sabit fiyat${avg!=null?`; bugün Türkiye ortalaması ${trn(avg)} $/MWh`:""}.${y>2026?" Koşullar 2026 yarışmalarındaki gibi varsayıldı.":""}`;
  const learn=`YEKA'da devlet sahayı ve bağlantı kapasitesini hazırlar, yatırımcılar yarışır. 2026'da RES (1.500 MWe) ve GES (785 MWe) yarışmalarının hepsi taban fiyatta kapandı; rekabet MW başına katkı payına kaydı (RES 0–154, GES 16–91 bin €/MW). Kazananlar şebeke kapasitesi ve 20 yıllık avro geliri için ödedi. Gerçek fiyat ${trn(real)} $/MWh, 2026 piyasa ortalamasının %${Math.round(real/YEKA.ref*100)}'i; oyunda kur olmadığı ve şebeke kıtlığı yalnızca oyuncunun bağlantı kontenjanıyla sınırlı olduğu için sabit fiyat aynı oranla oyunun fiyat düzeyine taşındı.`;
  const opts=YEKA.bids.map((b,i)=>{const fee=feeGame(b,cap);return {l:`${["Düşük","Orta","Yüksek"][i]} teklif: ${b} bin €/MW (${fmt$(fee)})`,c:fee,
    e:`2026'nın kazanan tekliflerine göre kazanma ihtimali ~%${Math.round(winOdds(k,b)*100)}. Katkı payı yalnızca kazanırsan ödenir.`,
    run:()=>{const r=T.fees[Math.floor(rnd()*T.fees.length)];
      if(b>r){const a=award(k,s,b,y);news("🏆",`${title}: yarışmayı kazandın (${b} bin €/MW). ${a.cap} MW'lık sahanın izni hazır.`,"event");
        return `Kazandın: rakibin en iyi teklifi ${r} bin €/MW'tı. ${fmt$(a.fee)} katkı payı ödendi; ${nm} sahası haritada, izni hazır (${a.cap} MW). ${T.merch} yıl serbest piyasa, sonra ${trn(P)} $/MWh.`;}
      news("📰",`${title}: yarışmayı ${r} bin €/MW katkı payıyla bir rakip kazandı.`,"event");
      return `Kaybettin: rakip ${r} bin €/MW teklif etti. Katkı payı ödenmedi.`;}};});
  opts.push({l:"Katılma",e:"Değişiklik yok.",run:()=>"Bu yılki YEKA yarışmasına girmedin."});
  showEvent({tag:"Yarışma",title,text,learn,opts},i=>{const r=opts[i].run();addLog(`${title}: ${opts[i].l}. ${r}`);save();
    window.dispatchEvent(new CustomEvent("sebeke:yeka"));return r;});
  return true;
}

// Gün başı (sim.js newDay): her yıl 2 Kasım'dan (2026 RES yarışmasının tarihi) yıl sonuna kadar, koşullar uygunsa bir kez
export function yekaDay(){
  const y=CAL.date.getUTCFullYear(),now=CAL.date.getTime();
  if(S.yekaY===y||now<Date.UTC(y,10,2)||!fullOn()||!S.plants.length)return;
  if(yekaCard())S.yekaY=y;
}
