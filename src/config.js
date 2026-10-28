// Oyun sabitleri, piyasalar ve teknoloji tanımları
// SITE_LIMIT: bir sahadaki azami kurulu güç; SITE_MIN_KM: iki saha arasındaki asgari mesafe
export const SAVE_KEY="sebeke-world-v3", BLOCK=5, SITE_LIMIT=40, SITE_MIN_KM=20, GOAL=5e6, EFF=0.88, IMB=0.12;
// FLOAT_KM: yüzer rüzgârın kurulabildiği derin deniz bandının dış sınırı (kıyıya mesafe; derinlik verisi yok, sade kural)
export const COAST_KM=150, SHALLOW_KM=200, FLOAT_KM=350;
// Başlangıç nakdi: arazi + izinden sonra bir RES ve bir GES kurmaya yeter (eski 150 b$ ile RES için uzun süre beklemek gerekiyordu)
export const START_MONEY=250000, START_TOPUP=100000;
// Satın almayı geri alma süresi (ms) ve iflas: nakit art arda bu kadar gün sonu eksi kalırsa oyun biter
export const UNDO_MS=10000, BANKRUPT_DAYS=7;
// Ara zafer: portföy değeri WIN1'e ulaşınca "Bölgesel oyuncu" ekranı (hedef GOAL sürer)
export const WIN1=1e6;
// İlk projeye alım garantisi (YEKDEM benzeri taban fiyat): ilk yenilenebilir santralin kurulduğu saha, p $/MWh'nin altında
// kalan saatlerde farkı alır; süre ekonomik yıl cinsinden (oyunda ~5,8 gün/yıl). Bot ölçümü: scripts/econ_bot.cjs --s fit2
export const FIT={p:90,years:5};
// Fiyat modeli kalibrasyonu (Türkiye: EPİAŞ 2025 PTF ve güneş/rüzgâr üretimiyle karşılaştırıldı; ayrıntı README):
// lvl: baz fiyat düzeyi çarpanı; solar: güneşin öğle fiyatını düşürme derinliği ($/MWh, doygunluk 1'de);
// grow/capK: piyasanın güneş doygunluğu her gün grow kadar artar, başlangıç değerinin capK katında durur; wind: rüzgârın fiyat etkisi;
// heat: sıcak havada akşam (17–22) talebinin fiyatı artırma payı. Piyasa bazında REG[k].sk ve REG[k].wk güneş ve rüzgâr
// etkisini çarpar (Avrupa: ENTSO-E 2025 Almanya ve İspanya örnek günleriyle; docs/kalibrasyon.md)
export const PRICE={lvl:1.08,solar:30,grow:0.002,capK:1.2,wind:8,heat:0.35};
export const BASE=[2600,2450,2350,2300,2300,2400,2700,2950,3050,3000,2900,2850,2800,2800,2850,2950,3100,3300,3400,3400,3300,3150,2950,2750].map(x=>x/35);

export const REG={
  T:{n:"Türkiye",mult:1.00,s0:0.60,land:20000},
  E:{n:"Avrupa",mult:1.9,s0:0.70,land:40000,sk:2.5,wk:3}, // mult/sk/wk: ENTSO-E 2025 (DE, ES) kalibrasyonu
  N:{n:"Kuzey Amerika",mult:0.85,s0:0.50,land:25000},
  S:{n:"Güney Amerika",mult:0.90,s0:0.40,land:12000},
  F:{n:"Afrika",mult:1.05,s0:0.20,land:8000},
  M:{n:"Orta Doğu",mult:0.80,s0:0.50,land:10000},
  A:{n:"Asya",mult:0.95,s0:0.60,land:15000},
  O:{n:"Okyanusya",mult:1.00,s0:0.80,land:20000},
  G:{n:"Grönland"}, X:{n:"Antarktika"}
};
export const MARKETS=["T","E","N","S","F","M","A","O"];
export const TECH={
  ges:{n:"GES",long:"Güneş (GES)",capex:55000,opex:100,c:"--solar"},
  // RES: IRENA 2024 1.041 $/kW × 5 MW = 5,21 M$, GES ile aynı ölçek (1/63) → 83 b$ (önceden 140 b$, ölçek 1/37: rüzgâr
  // gerçeğe göre 1,7 kat pahalı kalıyordu)
  res:{n:"RES",long:"Rüzgâr karada (RES)",capex:83000,opex:250,c:"--wind"},
  off:{n:"Offshore",long:"Rüzgâr denizde (offshore RES)",capex:260000,opex:500,c:"--wind"},
  // yüzer rüzgâr (çift rotorlu V kule, tek nokta bağlama): yatırım sabit tabanlının ~1,9 katı (finance.js FIN.flo, varsayım),
  // aynı oyun ölçeğiyle (offshore 260 b$ ↔ 2.852 $/kW)
  flo:{n:"Yüzer RES",long:"Yüzer rüzgâr (çift rotor, derin deniz)",capex:490000,opex:690,c:"--wind"},
  hes:{n:"HES",long:"Hidroelektrik (HES)",capex:180000,opex:200,c:"--hydro"},
  batt:{n:"Batarya",long:"Batarya depolama (BESS) 5 MW / 10 MWh",capex:30000,opex:50,c:"--batt"},
  jes:{n:"JES",long:"Jeotermal (JES)",capex:320000,opex:1000,c:"--geo"},
  bes:{n:"Biyokütle",long:"Biyokütle ve biyogaz santrali",capex:150000,opex:400,c:"--bio"},
  mar:{n:"Deniz",long:"Deniz enerjisi (gelgit ve dalga)",capex:420000,opex:900,c:"--marine"}
};
// Üretim yapan teknolojiler (rapor ve günlük toplamlar için)
export const PROD=["ges","res","off","flo","hes","jes","bes","mar"];
// JES: rezervuar sürekli üretir (kapasite faktörü ~%90); ilk sondajda rezervuarın verimi belli olur (%55–110)
export const GEO_CF=0.92;
// BES: yakıt (tarım ve orman atığı, hayvan gübresi) maliyeti, $/MWh elektrik; yerel hammadde bolluğu düşürür
export const BIO_FUEL=34;
// Deniz enerjisi: gelişmekte olan teknoloji; 25 MW kurulu güçten sonra açılır ve üretimine yenilik desteği ödenir
export const MAR_UNLOCK=25, MAR_PREMIUM=60, FLO_UNLOCK=60;
export const TER_N={pl:"Ova",f:"Orman",m:"Dağlık",d:"Çöl",p:"Korunan alan",i:"Buz örtüsü"};
