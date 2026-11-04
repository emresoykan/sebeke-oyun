// --- Şebeke bağlantı kapasitesi (Türkiye) ---
// Gerçekte: yeni RES ve GES için bağlantı kapasitesi kıt. 2026'da lisanssız üretime 3.500 MW açıldı (dağıtım 2.000, iletim
// 1.500 MW; EPDK 14353, 26.02.2026; TEİAŞ duyurusu 2 Mart 2026); bir şirket iletimden en çok 75 MW alabildi (ikincil kaynak).
// İletimdeki 1.500 MW'ın 30 Eylül'de 38,3 MW'ı kalmıştı. Lisanslı yeni kapasite büyük ölçüde YEKA ve depolamalı ön lisansla
// dağıtılıyor: üretim gücü, taahhüt edilen depolama gücünü aşamaz (RG 19.11.2022).
// Oyunda: Türkiye'de yeni RES, GES ve deniz GES'i için oyuncunun her takvim yılı 75 MW serbest kontenjanı var (config.js
// GRID); kontenjan 30 Eylül'den sonra kapanır, 1 Ocak'ta yenilenir. Sahada boşta batarya varsa blok önce ona bağlanır
// (depolamalı: üretim gücü sahadaki bataryanın gücünü aşamaz; kontenjan başka sahalara kalır), yoksa kontenjandan düşer;
// ikisi de yetmezse kurulamaz, YEKA'ya girilebilir. Kontenjana sayılmayanlar: ilk proje
// (başlangıç desteğinin sahası), YEKA sahasının kendi teknolojisi, yüzer GES (HES'in bağlantısını paylaşır), diğer
// teknolojiler. Rakipler sınırlanmaz (kapasitelerini önceki tahsislerden, YEKA'dan ve depolamalı lisanslardan aldıkları
// varsayıldı); diğer piyasalarda sınır yok. Kurulmuş santraller sayılmaz: sınır yalnızca yeni bloklara uygulanır.
import { S } from "./state.js";
import { CAL } from "./calendar.js";
import { GRID, BLOCK } from "./config.js";
import { news } from "./news.js";

const yearNow=()=>CAL.date.getUTCFullYear();
// yılın kaydı: yeni takvim yılında kullanılan kontenjan sıfırlanır
function gy(){const y=yearNow();if(!S.grid||S.grid.y!==y)S.grid={y,used:0};return S.grid;}
export const gridOpen=()=>CAL.date.getTime()<Date.UTC(yearNow(),GRID.close[0],GRID.close[1]+1); // kapanış günü dahil
// kalan serbest kontenjan (MW)
export const gridLeft=()=>gridOpen()?Math.max(0,GRID.quota-gy().used):0;
const mwOn=(id,k)=>S.plants.reduce((a,p)=>a+(p.t===id&&p.k===k?p.mw:0),0);
// sahadaki bataryanın henüz depolamalı üretime bağlanmamış gücü (MW)
export const gridStore=id=>Math.max(0,mwOn(id,"batt")*GRID.store-((S.sites[id]&&S.sites[id].depMW)||0));
// bu blok kontenjana tabi mi (değilse null): Türkiye, RES/GES/deniz GES; ilk proje ve YEKA sahasının kendi teknolojisi hariç
export function gridScope(id,k){
  const o=S.sites[id];if(!o||o.mreg!=="T"||!GRID.kinds.includes(k))return false;
  if(!S.fitDone||o.fit)return false; // ilk yenilenebilir proje (eğitim) ve başlangıç desteğinin sahası
  if(o.yeka&&o.yeka.k===k)return false;
  return true;
}
// blok nasıl bağlanır: "store" (depolamalı, önce), "quota" (serbest kontenjan), "none" (bağlanamaz), null (sınır yok)
export function gridWay(id,k,mw=BLOCK){
  if(!gridScope(id,k))return null;
  return gridStore(id)>=mw?"store":gridLeft()>=mw?"quota":"none";
}
export const gridBlock=(id,k)=>gridWay(id,k)==="none"?"grid":null;
// kurulumda (actions.js build): kontenjandan ya da depolamadan düş
export function gridUse(id,k,mw=BLOCK){
  const w=gridWay(id,k,mw);if(w==="quota")gy().used+=mw;else if(w==="store"){const o=S.sites[id];o.depMW=(o.depMW||0)+mw;}
  return w;
}
// Gün başı (sim.js newDay): yeni yılda kontenjan haberi; 30 Eylül'den sonra kapanış haberi (her biri yılda bir kez)
export function gridDay(){
  const y=yearNow(),g=gy();
  if(S.gridNewsY!==y){S.gridNewsY=y;if(gridOpen())news("🔌",`Bağlantı kapasitesi ${y}: Türkiye'de yeni RES ve GES için ${GRID.quota} MW serbest kontenjanın var (${GRID.close[1]} Eylül'e kadar). Fazlası için sahaya aynı güçte batarya kur ya da YEKA'ya gir.`);}
  if(!gridOpen()&&S.gridCloseY!==y){S.gridCloseY=y;news("🔌",`Bağlantı kapasitesi ${y}: serbest kontenjan kapandı (${g.used} MW kullandın). Yıl sonuna kadar Türkiye'de yeni RES ve GES ancak depolamalı ya da YEKA ile kurulur.`);}
}
