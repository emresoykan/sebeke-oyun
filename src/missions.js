// --- Görev zinciri ---
// Oyunun ilk yarım saatini yönlendiren sıralı görevler. Her görev bir sonraki adımı ve kısa bir piyasa dersini
// anlatır; tamamlanınca nakit ödül verir. S.mi: sıradaki görevin numarası.
import { SITE_LIMIT } from "./config.js";
import { S, save, addLog } from "./state.js";
import { netWorth } from "./sim.js";
import { fmt$ } from "./utils.js";
import { renderMission } from "./ui/mission.js";
import { celebrate } from "./ui/fx.js";
import { ob, TUT_N } from "./tutorial.js";

const mw=k=>S.plants.filter(p=>!k||p.k===k).reduce((a,p)=>a+p.mw,0);
const markets=()=>new Set(S.plants.map(p=>S.sites[p.t].mreg)).size;

// İlk 8 görev eğitimdir (tutorial.js): her biri tek bir eylem ister, ilgili kontrol vurgulanır (id: mission.js'teki
// vurgu ve kart düğmesi), açıklama eylemin nedenini söyler. d bir işlevse duruma göre (izin bekleniyor, gece) değişir.
const sites=()=>Object.values(S.sites);
const pending=()=>sites().find(o=>o.permit==="pending");
const night=()=>{const h=S.hour%24;return h<6||h>=19;};
export const MISSIONS=[
  {id:"pick",n:"Kaynak potansiyeli iyi bir yer seç",r:2000,ok:()=>!!ob().pick||sites().length>0,
    d:"Haritada güneşli bir ovaya ya da rüzgârlı bir kıyıya, tepeye dokun. Kaynak ne kadar iyiyse aynı santral o kadar çok elektrik üretir. Sol üstteki katman düğmesi potansiyeli gösterir."},
  {id:"land",n:"Araziyi satın al",r:4000,ok:()=>sites().length>0,
    d:"Paneldeki \"Araziyi satın al\" düğmesine bas. Santral ancak sana ait bir sahaya kurulur; zaman ilk araziyle işlemeye başlar."},
  {id:"permit",n:"İzin başvurusu yap",r:3000,ok:()=>sites().some(o=>o.permit!=="none"),
    d:()=>sites().length?"Sahanın panelinden çevre izni için başvur. İzin olmadan santral kurulamaz; inceleme birkaç gün sürer.":"Arazi alımı geri alındı. Haritada yeniden bir yer seçip araziyi satın al, sonra izne başvur."},
  {id:"tech",n:"İlk santral teknolojisini seç",r:2000,ok:()=>!!ob().tech||S.plants.length>0,
    d:()=>{const p=pending();if(p)return `İzin inceleniyor (yaklaşık ${p.days} gün). Beklerken üstteki hız düğmesine bas: 3x zamanı üç kat hızlandırır.`;
      if(!sites().some(o=>o.permit==="ok")&&sites().some(o=>o.permit==="rejected"))return "İzin reddedildi. Sahanın panelinden bir başvuru yolu seç ya da ova veya çölde yeni bir arazi al.";
      return "İzin çıktı. Panelde GES ya da RES sekmesini seç: güneş gündüz üretir, rüzgâr gece gündüz eser.";}},
  {id:"build",n:"Santrali kur",r:8000,ok:()=>S.plants.length>0,
    d:"Standart ekipmanlı +5 MW bloğu kur. Kurulduğu saatten itibaren üretip satmaya başlar."},
  {id:"run",n:"İlk üretimi gerçekleştir",r:4000,quiet:true,ok:()=>!!ob().prod,
    d:()=>night()&&S.plants.some(p=>p.k==="ges")&&!S.plants.some(p=>p.k==="res"||p.k==="off")?"Gece: GES güneş doğunca (06:00 civarı) üretmeye başlar. Hız düğmesiyle sabahı öne çekebilirsin.":
      S.plants.every(p=>p.k==="batt")?"Batarya elektrik üretmez, yalnızca depolar. İlk üretim için bir GES ya da RES bloğu kur.":"Zamanın akmasını izle: santralin hava uygun olduğu ilk saatte üretir."},
  {id:"sale",n:"Elektriği piyasaya sat",r:4000,quiet:true,ok:()=>!!ob().sale,
    d:"Üretimin o saatin piyasa fiyatından satılır. Fiyat sıfırsa güneş üretimi satılamaz; bir sonraki saati bekle."},
  {id:"report",n:"İlk günlük raporu incele",r:3000,ok:()=>!!ob().rep,
    d:()=>ob().repReady?"Gün kapandı. Rapor sekmesini aç: üretimini, gelirini ve giderlerini gör.":"Gün bitince (24:00) ilk raporun hazır olur. İstersen hızlandır."},
  {n:"Bir günü kârla kapat",d:"Gün sonu raporunda net gelire bak: satış geliri eksi dengesizlik ve işletme giderleri.",r:8000,ok:()=>S.last&&S.last.net>0&&S.plants.length>0},
  {n:"İlk kredili bloğunu kur",d:"Nakit yetmediğinde banka kredisiyle büyüyebilirsin: yatırımın bir kısmını banka karşılar, sen özsermaye payını ödersin. Santralin nakit akışı taksiti karşıladıkça (DSCR 1'in üstünde) kaldıraç büyümeyi hızlandırır; karşılamazsa fark nakitten çıkar. İzinli bir sahada \"Kredili\" düğmesiyle kur.",r:10000,ok:()=>(S.loanId||0)>0},
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
    // ilk üretim ve satışın ödülü ayrı balon yerine ilk satış kartında gösterilir (ui/firstsale.js)
    addLog(`Görev tamamlandı: ${m.n}. Ödül: ${fmt$(m.r)}.`);if(S.mi===TUT_N){addLog("İlk adımlar tamam. Bundan sonra GÖP masası gün başında açılır ve olay kartları çıkabilir.");
      celebrate("İlk adımlar tamam",`+${fmt$(m.r)} • GÖP masası ve olay kartları açıldı`);}
    else if(!m.quiet)celebrate(`Görev tamamlandı: ${m.n}`,`+${fmt$(m.r)}`);
    window.dispatchEvent(new CustomEvent("sebeke:mission",{detail:{i:S.mi-1}}));
  }
  if(done)save();
  renderMission();
}
// Eski kayıtlar: geçmişte tamamlanmış görevler ödülsüz geçilir
export function skipDone(){while(S.mi<MISSIONS.length&&MISSIONS[S.mi].ok())S.mi++;}
