// --- Görev zinciri ---
// Oyunun ilk yarım saatini yönlendiren sıralı görevler. Her görev bir sonraki adımı ve kısa bir piyasa dersini
// anlatır; tamamlanınca nakit ödül verir. S.mi: sıradaki görevin numarası.
import { SITE_LIMIT } from "./config.js";
import { S, save, addLog } from "./state.js";
import { netWorth } from "./sim.js";
import { fmt$ } from "./utils.js";
import { renderMission } from "./ui/mission.js";
import { celebrate } from "./ui/fx.js";

const mw=k=>S.plants.filter(p=>!k||p.k===k).reduce((a,p)=>a+p.mw,0);
const markets=()=>new Set(S.plants.map(p=>S.sites[p.t].mreg)).size;

export const MISSIONS=[
  {n:"İlk araziyi al",d:"Haritayı döndür ve güneşi ya da rüzgârı iyi bir ovaya dokun. Panelde kaynak puanlarına bakıp araziyi satın al.",r:5000,ok:()=>Object.keys(S.sites).length>0},
  {n:"İzin başvurusu yap",d:"Santral kurmadan önce çevre izni gerekir. Saha panelinden izin başvurusu yap; ova ve çöllerde ihtimal yüksektir.",r:3000,ok:()=>Object.values(S.sites).some(o=>o.permit!=="none")},
  {n:"İznin çıkmasını bekle",d:"İnceleme birkaç gün sürer. Beklerken alttaki Hız düğmesiyle zamanı hızlandırabilirsin. Reddedilirse tekrar başvur.",r:5000,ok:()=>Object.values(S.sites).some(o=>o.permit==="ok")},
  {n:"İlk santralini kur",d:"İzinli sahada bir teknoloji ve ekipman kademesi seç. Ekonomi ucuzdur ama az üretir ve sık arızalanır.",r:10000,ok:()=>S.plants.length>0},
  {n:"Bir günü kârla kapat",d:"Gün sonu raporunda net gelire bak: satış geliri eksi dengesizlik ve işletme giderleri.",r:8000,ok:()=>S.last&&S.last.net>0&&S.plants.length>0},
  {n:"Bir olay kartında karar ver",d:"Piyasa her gün aynı değil. Bir olay kartı çıktığında seçeneklerin etkisini tartıp karar ver.",r:8000,ok:()=>(S.evDone||0)>0},
  {n:"Rüzgârla çeşitlendir",d:"Güneş yalnızca gündüz üretir ve öğle fiyatını düşürür. Rüzgâr gece de üretir; ikisi birbirini dengeler. Bir RES kur.",r:15000,ok:()=>mw("res")+mw("off")>0},
  {n:"Batarya kur",d:"Batarya ucuz saatte şarj olup pahalı saatte satar (arbitraj). Fiyat farkı ne kadar büyükse kazanç o kadar yüksek.",r:15000,ok:()=>mw("batt")>0},
  {n:"İkinci bir piyasaya açıl",d:"Tek piyasaya bağlı kalmak fiyat riskini büyütür. Başka bir ülkede saha aç ve orada üretim yap.",r:25000,ok:()=>markets()>=2},
  {n:"25 MW kurulu güce ulaş",d:"Kapasiteni büyüt. Nakit kısıtlıysa ekonomi ekipmanla daha çok MW kurabilirsin.",r:25000,ok:()=>mw()>=25},
  {n:"Portföyünü 500 b$'a çıkar",d:"Portföy değeri: nakit, araziler ve santrallere yatırdığın tutarın toplamı.",r:30000,ok:()=>netWorth()>=5e5},
  {n:"Bir sahayı 40 MW'a doldur",d:`Bir sahaya en fazla ${SITE_LIMIT} MW kurulabilir. Saha sınırında premium ekipman MW başına en çok üretimi verir.`,r:40000,ok:()=>Object.keys(S.sites).some(id=>S.plants.filter(p=>p.t===id).reduce((a,p)=>a+p.mw,0)>=SITE_LIMIT)},
  {n:"Üç piyasada üretim yap",d:"Farklı piyasaların fiyatları farklı günlerde düşer; portföyü yaymak geliri dengeler.",r:50000,ok:()=>markets()>=3},
  {n:"Portföyünü 1 M$'a çıkar",d:"Büyük oyuncular arasına gir. Sonraki hedef: 5 M$ portföy.",r:75000,ok:()=>netWorth()>=1e6}
];

// Tamamlanan görevleri sırayla ödüllendir (aynı anda birden çok görev bitebilir)
export function checkMissions(){
  let done=false;
  while(S.mi<MISSIONS.length&&MISSIONS[S.mi].ok()){
    const m=MISSIONS[S.mi];S.money+=m.r;S.mi++;done=true;
    addLog(`Görev tamamlandı: ${m.n}. Ödül: ${fmt$(m.r)}.`);celebrate(`Görev tamamlandı: ${m.n}`,`+${fmt$(m.r)}`);
  }
  if(done)save();
  renderMission();
}
// Eski kayıtlar: geçmişte tamamlanmış görevler ödülsüz geçilir
export function skipDone(){while(S.mi<MISSIONS.length&&MISSIONS[S.mi].ok())S.mi++;}
