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
//  Avrupa (bütün Avrupa piyasaları; ilk ihalenin 7 kazananı İspanya, Portekiz ve İskandinavya'dan): Avrupa Hidrojen Bankası ilk ihalesi (Nisan 2024) kazanan primler €0,37–0,48/kg, ortalama ~€0,40 ≈ 0,45 $/kg
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
//
// Almanya piyasa primi (EEG Marktprämie; kara GES ve kara RES, ilk bloğun kurulumundan itibaren 20 ekonomik yıl):
//  Ödül değeri (anzulegender Wert): BNetzA ihale sonuçlarının hacim ağırlıklı ortalaması. Güneş birinci segment (arazi GES),
//   1 Temmuz 2026 turu 4,79 ct/kWh (basın bülteni 18.08.2026; teklifler 4,38–4,97); kara rüzgârı, 1 Ağustos 2026 turu
//   4,79 ct/kWh (basın bülteni 17.09.2026; tavan 7,25). İkisinin eşit çıkması rastlantı. 47,9 €/MWh ≈ 53,6 $/MWh.
//  Kayan, tek yönlü prim: santral elektriğini piyasada satar; ay sonunda üretimine prim = max(0, ödül değeri − teknolojinin
//   o ayki piyasa değeri) ödenir. Piyasa değeri (Monatsmarktwert) o ayın saatlik fiyatlarının ülkedeki güneş ya da rüzgâr
//   üretimiyle ağırlıklı ortalamasıdır: oyunda Avrupa piyasasının saatlik fiyatı, piyasanın güneş profili (sunP) ve rüzgâr
//   filosu (fleet) ile. Piyasa değeri ödülün üstündeyse prim yok, geri ödeme de yok (fark sözleşmesinden farkı bu).
//  Negatif fiyatlı saatlerdeki üretime prim ödenmez (2025'ten beri yeni santraller; EEG §51). Oyunda santraller o saatlerde
//   zaten üretmez. Gerçekte bu saatler destek süresinin sonuna eklenir (§51a); oyunda eklenmez.
//  Yalnızca Almanya'daki sahalar (saha ülkesi DEU). Rüzgârda saha kalitesine göre düzeltme (Referenzertragsmodell)
//   uygulanmaz. Gerçekte ihaleyle kazanılır; oyunda ortalama ödül değeriyle kazanılmış sayılır. Başlangıç desteği (alım
//   garantisi) sürerken prim birikmez: iki destek üst üste binmez.
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
  R:{kg:0.40*FX.eur,years:10,src:"Avrupa Hidrojen Bankası ilk ihalesi, ortalama ~€0,40/kg prim"},
  L:{kg:0.40*FX.eur,years:10,src:"Avrupa Hidrojen Bankası ilk ihalesi, ortalama ~€0,40/kg prim"},
  K:{kg:0.40*FX.eur,years:10,src:"Avrupa Hidrojen Bankası ilk ihalesi, ortalama ~€0,40/kg prim (kazananlar arasında İskandinav projeler var)"},
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

export const EEG={years:20,
  ges:{aw:Math.round(47.9*FX.eur*10)/10,src:"BNetzA güneş ihalesi (1 Temmuz 2026), ortalama ödül 4,79 ct/kWh"},
  res:{aw:Math.round(47.9*FX.eur*10)/10,src:"BNetzA kara rüzgârı ihalesi (1 Ağustos 2026), ortalama ödül 4,79 ct/kWh"}};
// kurulumda piyasa primi hakkı: {aw: ödül değeri $/MWh, until: son oyun günü} ya da null (Almanya dışı ya da bu teknolojide yok)
export function eegGrant(t,k){if(!t||t.mreg!=="E"||t.a3!=="DEU"||!EEG[k])return null;return {aw:EEG[k].aw,until:S.dayNo+Math.round(EEG.years*ECON_YEAR)};}
export const eegOn=p=>!!(p.eeg&&S.dayNo<=p.eeg.until);
// eski kayıtlar (sim.js newDay): hakkı hiç belirlenmemiş uygun santral bugünden başlar
export function eegMigrate(){S.plants.forEach(p=>{if(p.eeg===undefined&&EEG[p.k]&&S.sites[p.t])p.eeg=eegGrant(S.sites[p.t],p.k);});}
const monthKey=()=>CAL.date.getUTCFullYear()*12+CAL.date.getUTCMonth();
const eegAcc=()=>S.eeg&&S.eeg.mo!=null?S.eeg:(S.eeg={mo:monthKey(),s:[0,0],w:[0,0]});
// gün sonu: Avrupa piyasasının bugünkü saatlik fiyatları ayın piyasa değeri birikimine eklenir (güneş profili ve rüzgâr filosu ağırlığı)
export function eegDay(M){const z=eegAcc();M.price.forEach((x,h)=>{const s=M.sunP?M.sunP[h]||0:0,w=M.fleet?M.fleet[h]||0:1;z.s[0]+=x*s;z.s[1]+=s;z.w[0]+=x*w;z.w[1]+=w;});}
// teknolojinin piyasa değeri ($/MWh): biriken ay (varsayılan) ya da verilen birikim; veri yoksa null
export const eegMV=(k,z=S.eeg)=>{const a=z&&(k==="ges"?z.s:z.w);return a&&a[1]>0?a[0]/a[1]:null;};
// ay değiştiyse biten ayı kapatır: her santralin biriken uygun üretimine prim. Dönüş: [{p,q: MWh,mv,x: $}] (ödeme sim.js'te)
// ya da null (ay sürüyor). Son ayın özeti S.eegLast'te (panel)
export function eegSettle(){
  const z=eegAcc();if(z.mo===monthKey())return null;
  const mv={ges:eegMV("ges",z),res:eegMV("res",z)},out=[];
  S.plants.forEach(p=>{const q=p.eegE||0;if(!q)return;p.eegE=0;const v=mv[p.k];if(v==null||!p.eeg)return;
    out.push({p,q,mv:v,x:q*Math.max(0,p.eeg.aw-v)});});
  S.eegLast={mo:z.mo,mv};S.eeg={mo:monthKey(),s:[0,0],w:[0,0]};
  return out;
}
