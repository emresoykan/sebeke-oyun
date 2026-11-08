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
// İlk projeye alım garantisi (başlangıç desteği, oyun dengesi için; gerçek YEKDEM aşağıda): ilk yenilenebilir santralin
// kurulduğu saha, p $/MWh'nin altında kalan saatlerde farkı alır; süre ekonomik yıl cinsinden (oyunda ~5,8 gün/yıl).
// Bot ölçümü: scripts/econ_bot.cjs --s fit2
export const FIT={p:90,years:5};
// YEKDEM (Türkiye, yekdem.js): EPİAŞ YEKDEM fiyat tablosu, Ekim 2026 (ikincil kaynaktan; EPİAŞ'ın kendi tablosu bu oturumdan
// doğrulanamadı): GES ve karasal RES 289,74, rüzgâr/güneşle bütünleşik depolamadan verilen enerji 341,74 kuruş/kWh.
// Kur: EPİAŞ'ın 1 Ekim 2026 PTF dolar karşılığı (48,91 TL/$) → p 59,2 ve store 69,9 $/MWh. Başvuru her yıl 30 Kasım'a kadar
// (EPDK duyurusu, 19.10.2026). Gerçekte fiyat TL'dir ve her ay güncellenir; oyunda dolar cinsinden sabit.
// newDays: yeni sahanın o yıl için de katılabileceği süre (takvim günü; oyun kolaylığı)
export const YEKDEM={p:59.2,store:69.9,kinds:["ges","fpv","spv","res"],newDays:30,asOf:"Ekim 2026"};
// Piyasaya göre yatırım maliyeti (equipment.js capexOf: oyundaki kurulum bedeli; finance.js: proje ekonomisi). Katsayı: bölgenin
// IRENA 2024 ağırlıklı ortalama toplam kurulum maliyeti ÷ küresel ortalama. Yalnızca güneş ailesi (GES; yüzer GES ve deniz GES'i
// GES maliyetinden türetildiği için aynı katsayı): küresel 691, Avrupa 779, ABD 1.058, Çin 591, Afrika 1.093 $/kW (2024 doları;
// IRENA "Renewable Power Generation Costs in 2024", ikincil kaynaklar: pv magazine, PV Tech; rapor bu ortamdan açılamadı). Asya
// pazarı Çin'le (en büyük pazar; Hindistan 525), Kuzey Amerika ABD'yle temsil edildi. Türkiye, Güney Amerika, Orta Doğu ve
// Okyanusya için değer bulunamadı: küresel ortalama. Rüzgâr ve diğer teknolojilerde ülke değeri bulunamadı (Çin'de karada rüzgâr
// 1.000 $/kW'ın altında, kesin değer yok). Rakiplerin yatırımı değişmedi (fiyat kalibrasyonu korunur).
export const CAPEX_M={ges:{E:779/691,N:1058/691,A:591/691,F:1093/691}};
const SOLAR_FAM=["ges","fpv","spv"];
export const capexMul=(k,m)=>{const t=CAPEX_M[SOLAR_FAM.includes(k)?"ges":k];return (t&&t[m])||1;};
// Şebeke bağlantı kapasitesi (Türkiye; grid.js, docs/guncellemeler.md). quota: oyuncunun her takvim yılı kontenjan dışı
// yeni RES, GES ve deniz GES'i için alabileceği bağlantı kapasitesi (MW); 2026 lisanssız tahsisinde bir şirketin iletimden
// alabileceği üst sınır (75 MW; EPDK 14353, ikincil kaynak). close: kontenjanın kapandığı gün (2026'da iletimdeki 1.500 MW'ın
// 30 Eylül'de 38,3 MW'ı kalmıştı). store: depolamalı yolda üretim gücünün depolama gücüne oranı en çok 1 (RG 19.11.2022).
export const GRID={quota:75,close:[8,30],store:1,kinds:["res","ges","spv"]};
// YEKA (Türkiye; yeka.js, docs/guncellemeler.md). 2026 yarışmaları, ikincil kaynaklardan (Bakanlık duyurusu ve şartname bu
// ortamdan açılamadı): RES 2 Kasım (7 yarışma, 1.500 MWe), GES 3 Kasım (11 yarışma, 785 MWe); tavan 5,50 €c/kWh, hepsi taban
// fiyatta kapandı (ec: RES 3,50, GES 3,25 €c/kWh), kazananı MW başına katkı payı belirledi (fees: kaynaklarda tutarlı
// kazanan teklifler, bin €/MW). Sözleşme: imzadan sonra merch yıl serbest piyasa (RES 72, GES 60 ay), sonra years yıl yarışma
// fiyatından alım. sites: 2026 yarışmalarının illeri, gerçek kapasite (MWe) ve oyunda kırsal bir nokta; oyundaki saha sınırı
// gerçek kapasitenin üçte biri (5 MW'a yuvarlı, en az 10). Sabit fiyat oyuna oranıyla taşınır: gerçek fiyat ($; eur, FRED
// 23.10.2026) ÷ 2026 Ocak–Ekim PTF ortalaması (ref, EPİAŞ) × oyunun normal yıl fiyat düzeyi (lvl, EPİAŞ 2025 hedefi) →
// RES 58,2, GES 54,0 $/MWh. bids: oyuncunun seçebileceği katkı payları (bin €/MW).
export const YEKA={eur:1.1199,ref:44.74,lvl:66.4,years:20,bids:[20,45,90],
  res:{n:"RES",ec:3.50,merch:6,fees:[30,42,0,20,154,16,72],
    sites:[["Sivas",320,39.45,36.8],["Balıkesir-1",140,39.75,27.55],["Balıkesir-2",235,39.45,27.7],["Balıkesir-3",170,39.95,27.9],["Balıkesir-4",140,39.3,28.2],["Manisa",235,38.95,27.95],["Kütahya",260,39.3,29.6]]},
  ges:{n:"GES",ec:3.25,merch:5,fees:[22,91,16,36,36,64],
    sites:[["Ankara-1",40,39.5,32.4],["Ankara-2",30,39.3,33.0],["Malatya-1",55,38.25,38.0],["Diyarbakır",200,37.6,40.0],["Batman",25,37.85,41.0],["Elazığ",40,38.55,39.4],["Konya",110,37.6,32.9],["Kahramanmaraş-3",50,37.45,37.0],["Mardin-2",120,37.25,40.9],["Denizli",30,37.75,29.35]]}
};
for(const k of ["res","ges"])YEKA[k].p=Math.round(YEKA[k].ec*10*YEKA.eur/YEKA.ref*YEKA.lvl*10)/10; // oyundaki sabit fiyat ($/MWh)
// Hidrolojik yıl (Türkiye; hydro.js, docs/kalibrasyon.md "Hidrolojik yıl"). Su endeksi w = yılın HES kapasite faktörü ÷
// 2015–2025 ortalaması (%25,9; TEİAŞ yıllık üretim ÷ yıl sonu kurulu güç). hist: TEİAŞ 2015–2025; bilinmeyen yıllar bunlardan
// biri rastgele seçilerek belirlenir. known: gerçek yıllar (2026: Ocak–Eylül TEİAŞ, Ekim–Aralık 2025 düzeyinde varsayıldı;
// tahmin, yıl kapanınca güncellenecek). depth: w−1 = 1 iken en etkili ayda fiyattan düşülen tutar ($/MWh, piyasa çarpanından
// önce); mon: aylık ağırlık (Ocak…Aralık; ilkbaharda en yüksek); dry: kurak yılda etkinin payı (açığı gaz kapatır, fiyat az
// yükselir); hr: yağışlı yılda saatlik ağırlık (0…23). Aylık ağırlıklar ve derinlik EPİAŞ 2025 ile 2026'nın aylık TL fiyat
// oranına göre ayarlandı. Saatlik ağırlık: akşam (17–23) 2026 Mart–Haziran'ın saatlik TL fiyat düşüşünün gece düşüşüne oranından
// (saat 20'de ~0,25); öğle (9–16) 1,25, çünkü öğle fiyatı zaten tabana yakın ve TL farkı ölçülemiyor; 5 $/MWh altındaki saat
// payını tutturacak şekilde (docs/kalibrasyon.md "Saatlik dağılım").
export const HYDRO={
  hist:{2015:1.14,2016:1.11,2017:0.94,2018:0.93,2019:1.37,2020:1.11,2021:0.78,2022:0.93,2023:0.88,2024:1.02,2025:0.78},
  known:{2026:1.27},depth:160,dry:0.23,
  mon:[0.05,0.5,0.5,1,1.15,0.72,0.25,0.25,0.25,0.2,0.1,0.05],
  hr:[1,1,1,1,1,1,1,1,1,1.25,1.25,1.25,1.25,1.25,1.25,1.25,1.25,0.85,0.75,0.4,0.2,0.35,0.6,0.85]
};
// Fiyat modeli kalibrasyonu (Türkiye: EPİAŞ 2025 PTF ve güneş/rüzgâr üretimiyle karşılaştırıldı; ayrıntı README):
// lvl: baz fiyat düzeyi çarpanı; solar: güneşin öğle fiyatını düşürme derinliği ($/MWh, doygunluk 1'de);
// grow/capK: piyasanın güneş doygunluğu her gün grow kadar artar, başlangıç değerinin capK katında durur; wind: rüzgârın fiyat etkisi;
// heat: sıcak havada akşam (17–22) talebinin fiyatı artırma payı. Piyasa bazında REG[k].sk ve REG[k].wk güneş ve rüzgâr
// etkisini çarpar (Avrupa: ENTSO-E 2025 Almanya ve İspanya örnek günleriyle; docs/kalibrasyon.md)
export const PRICE={lvl:1.08,solar:30,grow:0.002,capK:1.2,wind:8,heat:0.35};
// Rüzgâr filosunun uzun dönem ortalama kapasite oranı (güç eğrisi, arıza payı düşülmeden; src/windfleet.js noktaları):
// fiyattaki rüzgâr endeksi bununla bölünür (ortalaması ~1). Yalnızca burada değeri olan piyasalarda filo endeksi kullanılır;
// diğerleri tek temsilî noktanın rüzgârıyla kalır. Ölçüm: scripts/calib_market.cjs (120 gün × 4 koşu: 0,21–0,23)
export const FLEET_CF={E:0.211};
export const BASE=[2600,2450,2350,2300,2300,2400,2700,2950,3050,3000,2900,2850,2800,2800,2850,2950,3100,3300,3400,3400,3300,3150,2950,2750].map(x=>x/35);

export const REG={
  T:{n:"Türkiye",mult:0.92,s0:0.60,land:20000}, // mult: ilk oyun yılı (120 gün) EPİAŞ 2025 ortalamasına (66,4 $/MWh) eşit (docs/kalibrasyon.md)
  E:{n:"Avrupa",mult:1.62,s0:0.70,land:40000,sk:3.7,wk:1.7}, // mult/sk/wk: ENTSO-E 2025 (DE, ES) kalibrasyonu, rüzgâr filo endeksiyle (29.10.2026)
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
  mar:{n:"Deniz",long:"Deniz enerjisi (gelgit ve dalga)",capex:420000,opex:900,c:"--marine"},
  // Aşağıdakiler aynı ölçekle (≈1/63) finance.js FIN değerlerinden: yüzer GES 831 $/kW, pompaj 2.015 $/kW, elektrolizör
  // 2.000 $/kW, CSP 3.677 $/kW. İşletme giderleri FIN'deki varsayımlardan, mevcut teknolojilerdeki oyun oranıyla
  // (GES'te ~8,3, rüzgâr ve bataryada ~6,2 × $/kW-yıl)
  // yüzer GES: baraj gölüne kurulur (sahada HES olmalı); su paneli soğutur
  fpv:{n:"Yüzer GES",long:"Yüzer güneş (baraj gölünde)",capex:66000,opex:115,c:"--solar"},
  // deniz üstü GES: sığ kıyı denizinde çelik kazıklar üstünde kafes platformlar (finance.js FIN.spv: 961 $/kW)
  spv:{n:"Deniz GES",long:"Deniz üstü güneş (kazıklı platform, sığ kıyı)",capex:76000,opex:165,c:"--solar"},
  // pompaj depolamalı HES: 5 MW / 50 MWh (10 saat); ucuz saatte suyu üst hazneye basar, pahalı saatte türbinden geçirir
  phs:{n:"Pompaj HES",long:"Pompaj depolamalı HES 5 MW / 50 MWh",capex:160000,opex:125,c:"--hydro"},
  // elektrolizör: şebekeden elektrik alır, hidrojeni sabit fiyattan satar (H2)
  h2:{n:"Hidrojen",long:"Yeşil hidrojen (elektrolizör)",capex:160000,opex:300,c:"--h2"},
  // yoğunlaştırılmış güneş: heliostat alanı ve kule; erimiş tuz deposu ısıyı akşama taşır (CSP)
  csp:{n:"CSP",long:"Yoğunlaştırılmış güneş (kule, erimiş tuz)",capex:290000,opex:460,c:"--csp"}
};
// Üretim yapan teknolojiler (rapor ve günlük toplamlar için)
export const PROD=["ges","res","off","flo","hes","jes","bes","mar","fpv","spv","csp"];
// Depolama: ucuz saatte şebekeden alır, pahalı saatte geri satar (kurulu güç saha sınırına sayılır, üretim sayılmaz)
export const STORE=["batt","phs"];
// JES: rezervuar sürekli üretir (kapasite faktörü ~%90); ilk sondajda rezervuarın verimi belli olur (%55–110)
export const GEO_CF=0.92;
// BES: yakıt (tarım ve orman atığı, hayvan gübresi) maliyeti, $/MWh elektrik; yerel hammadde bolluğu düşürür
export const BIO_FUEL=34;
// Deniz enerjisi: gelişmekte olan teknoloji; 25 MW kurulu güçten sonra açılır ve üretimine yenilik desteği ödenir
export const MAR_UNLOCK=25, MAR_PREMIUM=60, FLO_UNLOCK=60;
// Yüzer GES: su yüzeyi panelleri soğutur; üretime çarpan (varsayım: yayınlarda %2–10 arası kazanç anlatılıyor, doğrulanmadı)
export const FPV_COOL=1.04;
// Deniz üstü GES: üretime çarpan. Çin'de iki kazıklı projenin tasarım üretimi (Kenli HG14 1.346, Zhaoyuan HG30 1.287 kWh/kWp)
// Shandong'daki kara GES'lerinin 2024 gerçekleşen 1.269 saatinin %1–6 üstünde (tasarım ile gerçekleşen kıyası: varsayım);
// oyunda %4. Kıyıya uzaklık sınırı: gerçek projeler 2–8 km açıkta ve 1–11 m derinlikte; oyunda derinlik verisi yok ve kıyı
// çizgisi kaba, kıyıdan en çok 20 km (varsayım)
export const SPV_GAIN=1.04, SPV_KM=20;
// GES türlerinin üretim çarpanı (aynı panele göre)
export const PV_GAIN={fpv:FPV_COOL,spv:SPV_GAIN};
// Pompaj HES: depo süresi (saat, kurulu güçte); NREL ATB sınıfları 8–12 saat, oyunda 10
export const PHS_H=10;
// Yeşil hidrojen (varsayımlar, kaynakla doğrulanmadı): elektrolizör sistemi kg başına 55 kWh elektrik harcar (standart
// kademe); hidrojen uzun dönem alım anlaşmasıyla 5 $/kg'dan satılır. Başabaş elektrik fiyatı ≈ 5 × 1000 / 55 ≈ 91 $/MWh
export const H2={kwh:55,price:5};
// CSP: güneş çarpanı (heliostat alanının topladığı ısı ÷ türbin gücü; tipik 2–3) ve erimiş tuz deposu (saat). SM, oyunda
// çölde kapasite faktörü IRENA 2024 dünya ortalamasına (%41) yakın çıkacak şekilde ayarlandı (scripts/test_newtech.cjs)
export const CSP={sm:2.0,h:10};
export const TER_N={pl:"Ova",f:"Orman",m:"Dağlık",d:"Çöl",p:"Korunan alan",i:"Buz örtüsü"};
