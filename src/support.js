// --- Destek mekanizmaları: depolamaya kapasite ödemesi, yeşil hidrojene üretim desteği, deniz üstü rüzgâra fark sözleşmesi ---
// Gerçek mekanizmalardan, piyasaya göre (oyunda yalnızca kaynağı bulunan piyasalarda). Ödemeler gerçek ölçekte günlüktür
// (satış geliri gibi): yıllık tutar ÷ 365 her oyun günü. Kurlar FRED, 23.10.2026: 1 £ = 1,3375 $, 1 € = 1,1199 $.
//
// Kapasite ödemesi (batarya ve pompaj HES): sistem operatörü, zirvede kullanılabilecek güç için yıllık ödeme yapar;
// tesisin gücü süresine göre bir katsayıyla indirilir (kısa süreli depolama zirveyi daha az güvenceye alır).
//  Avrupa: Büyük Britanya kapasite piyasası T-4 açık artırması (Mart 2025, 2028/29 teslim) £60/kW-yıl ≈ 80,3 $/kW-yıl
//   (ikincil kaynaklar: Modo Energy, Montel; sonuç geçici olarak duyuruldu).
//  Kuzey Amerika: PJM 2026/27 temel açık artırması 329,17 $/MW-gün (UCAP, PJM raporu) ≈ 120,1 $/kW-yıl.
//  Katsayılar: 2 saatlik batarya %20,94 (GB T-4 2028/29, Modo Energy); 10 saatlik pompaj HES %90 (varsayım: güncel değer
//  doğrulanamadı; eski GB yönteminde pompaj %96). PJM kendi akreditasyon yöntemini kullanır; GB katsayıları orada da
//  uygulanır (varsayım). Türkiye: kapasite mekanizması (2018 yönetmeliği) var ama depolamaya ilişkin hüküm bulunamadı:
//  oyunda ödeme yok; diğer piyasalar için veri toplanmadı.
//  Koşul: tesis o gün kullanılabilir olmalı (arızalıyken ve GÖP masasında batarya "boşta"yken ödeme yok); gerçekte zirve
//  saatlerinde hazır olmama cezası da vardır (basitleştirme).
//
// Yeşil hidrojen üretim desteği (kg başına, ilk kurulumdan itibaren 10 ekonomik yıl):
//  Avrupa: Avrupa Hidrojen Bankası ilk ihalesi (Nisan 2024) kazanan primler €0,37–0,48/kg, ortalama ~€0,40 ≈ 0,45 $/kg
//   (IEA, Bruegel). Gerçekte rekabetçi ihale ve bütçe sınırı var; oyunda ortalama primle kazanılmış sayılır.
//  Kuzey Amerika: ABD 45V vergi kredisi en çok 3 $/kg (yaşam döngüsü emisyonu en düşük sınıf), 10 yıl; 2025 yasasıyla
//   inşaatına 1 Ocak 2028'den önce başlanan tesisler (CRS). Oyunda takvim tarihi 2028'e gelmeden kurulan elektrolizör alır.
//  Türkiye: hidrojen stratejisi hedefleri var (2030'da 2 GW elektrolizör), yürürlükte üretim desteği bulunamadı.
//  Yeşil koşulu: destek yalnızca aynı sahadaki rüzgâr, güneş ve deniz santrallerinin o saatteki üretimiyle karşılanan
//  elektrikten üretilen hidrojene ödenir (saatlik eşleşme). Gerçek kurallar daha esnek: AB 2029 sonuna kadar aylık, sonra
//  saatlik eşleşme ve sözleşmeyle şebekeden yeşil elektrik kabul eder; 45V da sertifikayla şebeke elektriği kabul eder.
//
// Deniz üstü rüzgâra fark sözleşmesi (CfD; sabit tabanlı offshore RES, ilk bloğun kurulumundan itibaren 20 ekonomik yıl):
//  Avrupa: Britanya CfD 7. tahsis turu (AR7, sonuç 14 Ocak 2026): sabit tabanlı offshore 8,2 GW, £91,20/MWh (2024
//   fiyatlarıyla, TÜFE'ye endeksli; İskoç proje £89,49), 20 yıl (ikincil kaynaklar: Westwood, Carbon Brief, Energy UK; gov.uk
//   sonuç sayfası açılamadı). ≈ 122,0 $/MWh. İki yönlü: piyasa fiyatı sözleşme fiyatının altındaysa fark ödenir, üstündeyse
//   üretici farkı geri öder (saatlik, gün öncesi fiyatına göre). Gerçekte rekabetçi ihale ve bütçe sınırı var; oyunda ihale
//   fiyatıyla kazanılmış sayılır. Fiyat doğrudan alındı (kapasite ödemesi gibi, oranla değil): fark sözleşmesi fiyatı maliyete
//   göre belirlenir, oyunun yatırım maliyetleri de gerçek değerlerdir. Fark proje gelirine (ac) katılır: proje ekonomisi destekli
//   getiriyi gösterir (25 yıllık ömrün son 5 yılı da sözleşme fiyatıyla sayılır; basitleştirme).
//  Yüzer RES'e verilmedi: AR7 yüzer fiyatı £216,49/MWh (≈ 289,6 $/MWh) iki küçük, erken proje (192,5 MW) içindi. Oyundaki
//   yüzer RES maliyeti ticari ölçek tahmini (5.355 $/kW, LCOE ~197–234 $/MWh; finance.js'teki kıyasla aralıkta): bu fiyat
//   gerçekte olmayan bir kârlılık verirdi.
//  Almanya: Ağustos 2025 ihalesine teklif gelmedi; iki yönlü CfD'li yasa taslağı (2 Eylül 2026) henüz yasalaşmadı.
//  Türkiye: ilk deniz üstü YEKA 2027'nin ilk çeyreğine planlandı (taslak: 1.000 MW, 7–11 ABD sent/kWh, %25 yerlilik; haber
//   kaynakları); oyunda henüz destek yok. Diğer piyasalar için veri toplanmadı.
import { S } from "./state.js";
import { CAL } from "./calendar.js";
import { ECON_YEAR } from "./loans.js";

export const FX={gbp:1.3375,eur:1.1199};
export const CAP={
  E:{kw:60*FX.gbp,src:"Büyük Britanya kapasite piyasası T-4 (2028/29 teslim) £60/kW-yıl"},
  N:{kw:329.17*365/1000,src:"PJM 2026/27 kapasite açık artırması 329,17 $/MW-gün"}
};
export const DERATE={batt:0.2094,phs:0.9};
export const CFD={E:{k:"off",p:Math.round(91.20*FX.gbp*10)/10,years:20,src:"Britanya CfD 7. tur (Ocak 2026), sabit tabanlı offshore £91,20/MWh"}};
export const H2SUB={
  E:{kg:0.40*FX.eur,years:10,src:"Avrupa Hidrojen Bankası ilk ihalesi, ortalama ~€0,40/kg prim"},
  I:{kg:0.40*FX.eur,years:10,src:"Avrupa Hidrojen Bankası ilk ihalesi, ortalama ~€0,40/kg prim"},
  N:{kg:3,years:10,until:Date.UTC(2028,0,1),src:"ABD 45V vergi kredisi, en çok 3 $/kg (inşaata 2028'den önce başlanmalı)"}
};
// bir depolama santralinin günlük kapasite ödemesi ($); bu piyasada mekanizma yoksa 0
export const capDay=(m,k,mw)=>CAP[m]&&DERATE[k]?CAP[m].kw*DERATE[k]*mw*1000/365:0;
// kurulumda hidrojen desteği hakkı: {kg: $/kg, until: son oyun günü} ya da null (piyasada yok, süresi geçmiş)
export function h2Grant(m){
  const s=H2SUB[m];if(!s||(s.until&&CAL.date.getTime()>=s.until))return null;
  return {kg:s.kg,until:S.dayNo+Math.round(s.years*ECON_YEAR)};
}
// santralin bugünkü hidrojen desteği ($/kg; hak yoksa ya da süresi dolduysa 0)
export const h2Rate=p=>p.h2s&&S.dayNo<=p.h2s.until?p.h2s.kg:0;
// kurulumda fark sözleşmesi hakkı: {p: $/MWh, until: son oyun günü} ya da null (piyasada ya da bu teknolojide yok)
export function cfdGrant(m,k){const s=CFD[m];if(!s||s.k!==k)return null;return {p:s.p,until:S.dayNo+Math.round(s.years*ECON_YEAR)};}
// santralin bugünkü sözleşme fiyatı ($/MWh) ya da null
export const cfdRate=p=>p.cfd&&S.dayNo<=p.cfd.until?p.cfd.p:null;
// eski kayıtlar (sim.js newDay): sözleşmesi hiç belirlenmemiş uygun santral bugünden başlar
export function cfdMigrate(){S.plants.forEach(p=>{if(p.cfd===undefined&&p.k==="off"&&S.sites[p.t])p.cfd=cfdGrant(S.sites[p.t].mreg,p.k);});}
