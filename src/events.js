// --- Olay kartları ---
// Gün başında, oyuncunun santrali varsa belirli olasılıkla bir olay çıkar; oyun durur, oyuncu seçeneklerden birini seçer.
// Olaylar gerçek piyasa olgularından esinlenir (kuraklık, gaz şoku, şebeke kısıtı, tatil günü fiyat çöküşü...);
// her kartta kısa bir "piyasa notu" vardır. Sayılar oyun dengesi için temsilidir.
import { news } from "./news.js";
import { REG, TECH, MARKETS } from "./config.js";
import { placeName } from "./world.js";
import { S, D, save, addLog } from "./state.js";
import { addMod } from "./mods.js";
import { rnd, fmt$ } from "./utils.js";
import { showEvent } from "./ui/eventcard.js";
import { render } from "./ui/hud.js";
import { renderPanel } from "./ui/panel.js";
import { checkMissions } from "./missions.js";
import { CAL, seasonOf } from "./calendar.js";
import { applyDesk } from "./market.js";

const RENEW=["ges","res","off","hes"];
const mwOf=(k,m)=>S.plants.filter(p=>(!k||p.k===k)&&(!m||S.sites[p.t].mreg===m)).reduce((a,p)=>a+p.mw,0);
const has=k=>S.plants.some(p=>p.k===k);
// oyuncunun en çok kurulu gücü olan piyasa
const mainMkt=()=>MARKETS.reduce((b,k)=>mwOf(null,k)>mwOf(null,b)?k:b,MARKETS[0]);
const mName=m=>REG[m].n;
const pay=c=>{S.money-=c;};
// w: etkinin kaç gün sonra başlayacağı (0 = bugün)
const mod=(o)=>addMod({d:1,...o});

export const EVENTS=[
  {id:"drought",tag:"Hava",title:"Kuraklık alarmı",ok:()=>true,
    text:m=>`Yağışlar ortalamanın çok altında kaldı, barajlar boşalıyor. ${mName(m)} piyasasında hidro üretim düşünce açığı daha pahalı gaz santralleri kapatıyor.`,
    learn:"Kurak dönemlerde HES üretimi düşer ve fiyatlar yükselir. Hidro üretim ile elektrik fiyatı arasında güçlü ters ilişki vardır.",
    opts:m=>has("hes")?[
      {l:"Suyu idareli kullan",e:"HES 4 gün %60 kapasiteyle çalışır, fiyatlar 4 gün %15 yüksek.",run:()=>{mod({t:"out",m,k:["hes"],v:0.6,d:4,label:"Kuraklık: HES kısıtlı"});mod({t:"price",m,v:1.15,d:4,label:"Kuraklık: fiyatlar yüksek"});return "Rezervuar korundu; HES daha az ama yüksek fiyattan üretecek.";}},
      {l:"Tam güç üret",e:"Bugün HES tam güç, sonraki 3 gün baraj boş (%30). Fiyatlar 4 gün %15 yüksek.",run:()=>{mod({t:"out",m,k:["hes"],v:0.3,d:3,w:1,label:"Kuraklık: baraj boşaldı"});mod({t:"price",m,v:1.15,d:4,label:"Kuraklık: fiyatlar yüksek"});return "Bugün su bol, ama önümüzdeki günlerde baraj kuruyacak.";}}
    ]:[{l:"Fiyat artışından yararlan",e:"Fiyatlar 4 gün %15 yüksek.",run:()=>{mod({t:"price",m,v:1.15,d:4,label:"Kuraklık: fiyatlar yüksek"});return "HES'in yok; kuraklık senin GES ve RES gelirini artıracak.";}}]},

  {id:"storm",tag:"Hava",title:"Fırtına uyarısı",ok:()=>has("res")||has("off"),
    text:()=>`Meteoroloji 90 km/s'yi aşan rüzgâr bekliyor. Türbinler kesme hızını aşarsa kendini durdurur; çalışmaya devam etmek daha çok üretim ama kanat ve dişli kutusu hasarı riski demek.`,
    learn:"Türbinler belirli bir rüzgâr hızının üstünde (kesme hızı) güvenlik için durur. Sigorta, düşük olasılıklı ama pahalı hasarlara karşı korur.",
    opts:()=>{const ins=Math.max(1500,Math.round(S.plants.filter(p=>p.k==="res"||p.k==="off").reduce((a,p)=>a+(p.cost||0),0)*0.006/100)*100);return [
      {l:"Türbinleri güvenli moda al",e:"Bugün rüzgâr üretimi yok, hasar riski yok.",run:()=>{mod({t:"out",k:["res","off"],v:0,label:"Fırtına: türbinler durduruldu"});return "Türbinler güvenle durduruldu.";}},
      {l:"Çalışmaya devam et",e:"Bugün üretim %30 fazla; %35 ihtimalle bir rüzgâr santrali 3 gün arızalı.",run:()=>{mod({t:"out",k:["res","off"],v:1.3,label:"Fırtına: yüksek rüzgâr"});
        if(rnd()<0.35){const ps=S.plants.filter(p=>p.k==="res"||p.k==="off"),p=ps[Math.floor(rnd()*ps.length)];p.down=3;S.stats.outages++;return `Riskli karar pahalıya patladı: ${placeName(S.sites[p.t])} ${TECH[p.k].n} 3 gün arızalı.`;}
        return "Şans yanındaydı: fırtına bol üretim getirdi, hasar yok.";}},
      {l:`Sigorta yaptır ve devam et (${fmt$(ins)})`,c:ins,e:"Bugün üretim %30 fazla, hasar sigortalı.",run:()=>{pay(ins);mod({t:"out",k:["res","off"],v:1.3,label:"Fırtına: yüksek rüzgâr"});return "Sigortalı üretim: fırtınadan kazançlı çıktın.";}}];}},

  {id:"holiday",tag:"Piyasa",title:"Bayram tatili: öğle fiyatı çöküyor",ok:()=>has("ges"),
    text:m=>`Uzun tatil nedeniyle sanayi talebi düştü, ${mName(m)} piyasasında öğle saatlerinde güneş üretimi talebi aşıyor. Önümüzdeki 2 gün 10:00–15:00 arası fiyatlar sıfıra yakın olacak.`,
    learn:"Güneş kurulumu arttıkça öğle fiyatları düşer (kanibalizasyon). GES'in yakaladığı ortalama fiyat (capture price) piyasa ortalamasının altında kalır. İkili anlaşma bu riski sabitler.",
    opts:m=>{const fix=Math.round(32*REG[m].mult);return [
      {l:"Spotta kal",e:"2 gün öğle fiyatları %85 düşük.",run:()=>{mod({t:"price",m,v:0.15,d:2,h:[10,15],label:"Tatil: öğle fiyatı çöktü"});return "Spot fiyatta kaldın; öğle üretimi düşük fiyattan satılacak.";}},
      {l:`2 günlük ikili anlaşma: GES ${fix} $/MWh`,e:`GES üretimin 2 gün boyunca saat fark etmeksizin ${fix} $/MWh'ten satılır.`,run:()=>{mod({t:"price",m,v:0.15,d:2,h:[10,15],label:"Tatil: öğle fiyatı çöktü"});mod({t:"fix",m,k:["ges"],v:fix,d:2,label:`İkili anlaşma: GES ${fix} $/MWh`});return "Anlaşma imzalandı; fiyat çöküşü GES gelirini etkilemeyecek.";}}];}},

  {id:"gas",tag:"Piyasa",title:"Doğal gaz fiyat şoku",ok:()=>true,
    text:()=>`Bir boru hattındaki arıza gaz arzını daralttı, gaz fiyatları sıçradı. Gaz santralleri çoğu saatte fiyatı belirlediği için elektrik fiyatları da yükseliyor.`,
    learn:"Marjinal fiyatlama: piyasa fiyatını o saatte çalışan en pahalı santral belirler. Yakıt maliyeti olmayan yenilenebilir üretici, gaz pahalanınca daha çok kazanır.",
    opts:()=>{const m=mainMkt(),fix=Math.round(D[m].avg*1.2);return [
      {l:"Spot satışa devam",e:"Tüm piyasalarda fiyatlar 4 gün %30 yüksek.",run:()=>{mod({t:"price",v:1.3,d:4,label:"Gaz şoku: fiyatlar yüksek"});return "Yüksek spot fiyatlardan yararlanacaksın.";}},
      {l:`Sanayi müşterisiyle 7 günlük anlaşma (${fix} $/MWh)`,e:`${mName(m)} üretimin 7 gün ${fix} $/MWh sabit fiyattan satılır; fiyatlar 4 gün %30 yüksek.`,run:()=>{mod({t:"price",v:1.3,d:4,label:"Gaz şoku: fiyatlar yüksek"});mod({t:"fix",m,k:RENEW,v:fix,d:7,label:`Sanayi anlaşması: ${fix} $/MWh`});return "Fiyatı kilitledin: şok bitince de bu fiyattan satacaksın.";}}];}},

  {id:"forward",tag:"Piyasa",title:"Vadeli satış teklifi",ok:()=>S.plants.length>0,
    text:m=>`Bir enerji tedarikçisi, ${mName(m)} piyasasındaki önümüzdeki 5 günlük üretiminin tamamını bugünkü ortalama fiyatın %5 üstünden almayı teklif ediyor.`,
    learn:"Vadeli satış (hedge) fiyat riskini karşı tarafa devreder. Fiyatlar düşerse kazanırsın, yükselirse fırsatı kaçırırsın; amaç tahmin değil, gelirin öngörülebilir olmasıdır.",
    opts:m=>{const fix=Math.round(D[m].avg*1.05),drift=0.8+rnd()*0.45; // piyasanın gizli yönü
      const go=()=>{mod({t:"price",m,v:drift,d:5,w:1});};return [
      {l:`Kabul et (${fix} $/MWh)`,e:"5 gün tüm üretimin sabit fiyattan satılır.",run:()=>{go();mod({t:"fix",m,k:RENEW,v:fix,d:5,label:`Vadeli satış: ${fix} $/MWh`});return drift<1?"İyi zamanlama: fiyatlar düşüş eğiliminde, sabit fiyat seni koruyacak.":"Fiyatlar yükseliş eğiliminde; sabit fiyat bu kez fırsat kaçırtabilir. Öngörülebilirliğin bedeli.";}},
      {l:"Reddet, spotta kal",e:"Fiyat riski sende kalır.",run:()=>{go();return drift<1?"Fiyatlar düşüş eğiliminde; spotta kalmak bu kez pahalıya mal olabilir.":"Fiyatlar yükseliş eğiliminde; spotta kalmak kazandırabilir.";}}];}},

  {id:"capex",tag:"Tedarik",title:"Ekipman fiyat artışı",ok:()=>true,
    text:()=>`Tedarik zincirindeki aksama ve kur artışı nedeniyle türbin, panel ve batarya fiyatlarının yarından itibaren %15 artması bekleniyor. Bugün hâlâ eski fiyattan kurulum yapabilirsin.`,
    learn:"Yatırım maliyeti (CAPEX) döngüseldir: kur, hammadde ve navlun fiyatları proje getirisini doğrudan etkiler. Uzun dönem tedarik anlaşmaları fiyat riskini sınırlar.",
    opts:()=>[
      {l:"Zammı kabul et",e:"Yarından itibaren 6 gün kurulum %15 pahalı.",run:()=>{mod({t:"capex",v:1.15,d:6,w:1,label:"Ekipman zammı: kurulum %15 pahalı"});return "Bugün kurduğun her şey eski fiyattan; yarından itibaren zamlı.";}},
      {l:"Tedarik anlaşması yap (6 b$)",c:6000,e:"6 b$ öde, zamdan muaf ol.",run:()=>{pay(6000);return "Uzun dönem tedarik anlaşması imzalandı; fiyatların sabit.";}}
    ]},

  {id:"curtail",tag:"Şebeke",title:"Şebeke kısıt talimatı",ok:()=>has("res")||has("ges"),
    text:m=>`${mName(m)} piyasasında bölgedeki iletim hattı kapasitesi yetmiyor. Sistem operatörü rüzgâr ve güneş santrallerine 2 gün üretimi düşürme talimatı verdi.`,
    learn:"Şebeke kısıtı: ürettiğin her MWh'i satamayabilirsin. İletim kapasitesi, yenilenebilir yatırımlarında konum seçiminin en önemli kriterlerinden biridir.",
    opts:m=>{const o=[{l:"Talimata uy",e:"RES ve GES 2 gün %60 kapasiteyle çalışır.",run:()=>{mod({t:"out",m,k:["res","ges"],v:0.6,d:2,label:"Şebeke kısıtı: üretim %60"});return "Talimata uydun; üretim geçici olarak kısıldı.";}}];
      if(mwOf("batt",m))o.push({l:"Fazlayı bataryada depola",e:"Bataryan kısıntının bir kısmını emer: RES ve GES 2 gün %80.",run:()=>{mod({t:"out",m,k:["res","ges"],v:0.8,d:2,label:"Şebeke kısıtı: üretim %80"});return "Batarya kısıntının etkisini yarıya indirdi.";}});
      return o;}},

  {id:"dust",tag:"Hava",title:"Toz fırtınası",ok:()=>has("ges"),
    text:()=>`Güneyden gelen toz bulutu panelleri kapladı, ışık geçirgenliği belirgin şekilde düştü.`,
    learn:"Kirlenme kaybı (soiling): panel temizliğinin maliyeti ile üretim kaybı karşılaştırılarak karar verilir. Kurak bölgelerde bu kayıp yıllık üretimin birkaç yüzdesine ulaşabilir.",
    opts:()=>{const c=Math.max(800,Math.round(mwOf("ges")*400/100)*100);return [
      {l:`Temizlik ekibi gönder (${fmt$(c)})`,c,e:"Üretim kaybı yok.",run:()=>{pay(c);return "Paneller temizlendi.";}},
      {l:"Yağmuru bekle",e:"GES 3 gün %75 kapasiteyle çalışır.",run:()=>{mod({t:"out",k:["ges"],v:0.75,d:3,label:"Toz: GES %75"});return "Yağmur gelene kadar paneller tozlu kalacak.";}}];}},

  {id:"locals",tag:"Mevzuat",title:"Yerel halk tepkisi",ok:()=>Object.values(S.sites).some(o=>o.permit==="pending"),
    text:()=>{const o=Object.values(S.sites).find(o=>o.permit==="pending");return `${placeName(o)} yakınındaki bir köy derneği, projenin gürültü ve görüntü kirliliği yaratacağını söyleyerek itiraz dilekçesi verdi.`;},
    learn:"Sosyal lisans: yerel paydaşların desteği izin sürecini hızlandırır; tepki ise projeyi geciktirebilir, hatta durdurabilir.",
    opts:()=>{const ps=Object.values(S.sites).filter(o=>o.permit==="pending");return [
      {l:"Köye yatırım yap (6 b$)",c:6000,e:"Bekleyen izinler 2 gün kısalır, onay ihtimali artar.",run:()=>{pay(6000);ps.forEach(o=>{o.days=Math.max(1,o.days-2);o.boost=(o.boost||0)+0.1;});return "Köy derneğiyle anlaşıldı; itiraz geri çekildi.";}},
      {l:"İtirazı görmezden gel",e:"Bekleyen izinler 3 gün uzar, onay ihtimali düşer.",run:()=>{ps.forEach(o=>{o.days+=3;o.boost=(o.boost||0)-0.1;});return "İtiraz dosyaya girdi; inceleme uzayacak.";}}];}},

  {id:"heat",tag:"Piyasa",title:"Sıcak hava dalgası",ok:()=>true,
    text:m=>`${mName(m)} piyasasında klima kullanımı akşam saatlerinde talep rekoru kırdırıyor. 3 gün boyunca 17:00–22:00 arası fiyatlar çok yüksek olacak.`,
    learn:"Talep pikleri akşam, güneş batarken yaşanır. Bu saatlerde üretebilen batarya ve HES en yüksek fiyatı yakalar.",
    opts:m=>[
      {l:"Planlı bakımı ertele, tam güç",e:"3 gün arıza riski yok; sonraki 4 gün iki kat.",run:()=>{mod({t:"price",m,v:1.5,d:3,h:[17,22],label:"Sıcak hava: akşam fiyatı yüksek"});mod({t:"risk",v:0,d:3,label:"Bakım ertelendi"});mod({t:"risk",v:2,d:4,w:3,label:"Ertelenen bakım: arıza riski 2 kat"});return "Bakım ertelendi; pik günlerde santrallerin tam güçte.";}},
      {l:"Bakımı planlandığı gibi yap",e:"Arıza riski değişmez.",run:()=>{mod({t:"price",m,v:1.5,d:3,h:[17,22],label:"Sıcak hava: akşam fiyatı yüksek"});return "Bakım takvimi korundu.";}}
    ]},

  {id:"incentive",tag:"Mevzuat",title:"Yeni destek programı",ok:()=>true,
    text:m=>`${mName(m)} piyasasında yenilenebilir üretimi desteklemek için kısa süreli bir prim programı açıldı: başvuranlar 7 gün boyunca ürettikleri her MWh için ek prim alacak.`,
    learn:"Destek mekanizmaları (alım garantisi, prim, fark sözleşmesi) gelir belirsizliğini azaltır. Başvuru maliyeti ve destek süresi getiriye karşı tartılmalıdır.",
    opts:m=>{const b=Math.round(8*REG[m].mult);return [
      {l:"Başvur (5 b$)",c:5000,e:`7 gün GES, RES ve HES üretimine +${b} $/MWh.`,run:()=>{pay(5000);mod({t:"bonus",m,k:RENEW,v:b,d:7,label:`Destek primi: +${b} $/MWh`});return "Başvurun kabul edildi.";}},
      {l:"Başvurma",e:"Değişiklik yok.",run:()=>"Programa katılmadın."}];}},

  {id:"trafo",tag:"Operasyon",title:"Trafo arızası",ok:()=>S.plants.length>0,
    text:()=>`Sahalarından birinin trafo merkezinde aşırı ısınma tespit edildi. Acil müdahale pahalı; beklemek sahanın birkaç gün durması demek.`,
    learn:"Tek bağlantı noktası (trafo, iletim hattı) bütün sahayı durdurabilir. Yedekli tasarım ve kritik yedek parça stoğu bu riski azaltır.",
    opts:()=>{const id=S.plants[Math.floor(rnd()*S.plants.length)].t,nm=placeName(S.sites[id]);return [
      {l:"Acil onarım (8 b$)",c:8000,e:`${nm} durmadan çalışmaya devam eder.`,run:()=>{pay(8000);return `${nm} trafosu aynı gün onarıldı.`;}},
      {l:"Normal onarım",e:`${nm} sahasındaki tüm santraller 2 gün durur.`,run:()=>{S.plants.filter(p=>p.t===id).forEach(p=>p.down=Math.max(p.down||0,2));S.stats.outages++;return `${nm} 2 gün devre dışı.`;}}];}}
];

// Gün başında olay çıkar mı? İlk santralden sonraki ilk gün başında ilk olay garantilidir.
export function maybeEvent(){
  if(!S.plants.length||S.dayNo<3)return;
  if(S.evCool>0){S.evCool--;return;}
  if(S.evDone>0&&rnd()>0.45)return;
  const recent=S.evHist||[],pool=EVENTS.filter(e=>e.ok()&&!recent.includes(e.id));if(!pool.length)return;
  // mevsime göre olasılık: yazın kuraklık, sıcak hava ve toz; kışın fırtına
  const sk=seasonOf(CAL.date).k,W={sum:{drought:2.5,heat:2.5,dust:2,storm:0.6},win:{storm:2,drought:0.2,heat:0.1,dust:0.4},spr:{drought:0.5,heat:0.5},aut:{storm:1.4,heat:0.5}}[sk];
  const wt=e=>W[e.id]??1,tot=pool.reduce((a,e)=>a+wt(e),0);let r=rnd()*tot,ev=pool[pool.length-1];for(const e of pool){r-=wt(e);if(r<=0){ev=e;break;}}
  const m=mainMkt(),opts=ev.opts(m);
  S.evHist=[ev.id,...recent].slice(0,4);
  showEvent({tag:ev.tag,title:ev.title,text:ev.text(m),learn:ev.learn,opts},i=>{
    const r=opts[i].run();S.evDone=(S.evDone||0)+1;S.evCool=1;applyDesk(S.hour); // olayın etkisi tahmine ve teklife yansısın
    addLog(`${ev.title}: ${opts[i].l}. ${r}`);news("📰",`${ev.title}: ${opts[i].l}.`,"event");checkMissions();save();renderPanel();render();
    return r;
  });
}
