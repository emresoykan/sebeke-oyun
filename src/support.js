// --- Destek mekanizmaları: depolamaya kapasite ödemesi, yeşil hidrojene üretim desteği ---
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
import { S } from "./state.js";
import { CAL } from "./calendar.js";
import { ECON_YEAR } from "./loans.js";

export const FX={gbp:1.3375,eur:1.1199};
export const CAP={
  E:{kw:60*FX.gbp,src:"Büyük Britanya kapasite piyasası T-4 (2028/29 teslim) £60/kW-yıl"},
  N:{kw:329.17*365/1000,src:"PJM 2026/27 kapasite açık artırması 329,17 $/MW-gün"}
};
export const DERATE={batt:0.2094,phs:0.9};
export const H2SUB={
  E:{kg:0.40*FX.eur,years:10,src:"Avrupa Hidrojen Bankası ilk ihalesi, ortalama ~€0,40/kg prim"},
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
