# Fiyat ve rüzgâr üretimi kalibrasyonu: Türkiye (EPİAŞ, TEİAŞ 2025) ve Avrupa (ENTSO-E 2025)

## Amaç
Oyunun piyasa modeli (`src/sim.js`, `PRICE` sabitleri `src/config.js`) saatlik fiyatı baz eğri, mevsimsel talep, güneş ve rüzgâr arzı ile üretir. Proje ekonomisi modülü (LCOE, NPV, IRR) üretimi ve satış fiyatını bu modelden aldığı için modelin gerçek piyasaya yakın olması gerekir. Bu not, Türkiye piyasasının 2025 verisiyle karşılaştırmayı ve yapılan ayarı kaydeder.

## Veri
| Gösterge | Kaynak | Dönem | Birim |
|---|---|---|---|
| Ortalama PTF | EPİAŞ Şeffaflık Platformu, GÖP PTF (`/markets/dam/data/mcp`) | 2025, 8.760 saat | USD/MWh (EPİAŞ'ın yayımladığı USD karşılığı) |
| Rüzgâr fiyat oranı | EPİAŞ PTF × ulusal rüzgâr üretim profili (EPİAŞ gerçek zamanlı üretim) | 2025, tam yıl | oran |
| Güneş fiyat oranı | EPİAŞ PTF × gerçek zamanlı üretim `sun` sütunu | 2025'ten 7 gün (15 Ocak, 15 Mart, 15 Nisan, 15 Mayıs, 1 Haziran, 15 Temmuz, 15 Ekim) | oran |

Fiyat oranı (capture rate) = Σ(fiyat × üretim) ÷ Σ üretim ÷ ortalama fiyat. Güneş hesabı: `scripts/calib_tr_solar.py`.

## Sonuç
Oyun değerleri: Türkiye piyasasında bir GES (Konya) ve bir RES (Çanakkale) ile 365 oyun günü simülasyonu; tarih oyunun takvimiyle 20 Mart'ta başlar.

| Gösterge | Gerçek (2025) | Oyun, önce | Oyun, sonra |
|---|---|---|---|
| Ortalama PTF | 66,4 $/MWh | 43,7 $/MWh | 65,8 $/MWh |
| Güneş fiyat oranı | ~%75 (örnek günler) | %60 | %74 |
| Rüzgâr fiyat oranı | %99 | %103 | %99 |
| Öğle fiyatı, 11–14 ortalaması | 33–50 $/MWh (örnek günler) | 4–9 $/MWh | 41–44 $/MWh |
| GES kapasite faktörü (Konya) | — | %8,2 (kısıntı nedeniyle) | %21,4 |

> **30.10.2026:** Bu tablodaki oyun değerleri 365 oyun gününün ortalamasıdır. Oyunda bir yıl 120 gün sürdüğü için bu yaklaşık üç takvim yılı eder. Türkiye'nin fiyat düzeyi artık ilk oyun yılına göre ayarlı (Avrupa'yla aynı tanım): aşağıdaki "Türkiye fiyat düzeyi: ilk oyun yılı" bölümü.

## Neden sapıyordu
- Piyasanın güneş doygunluğu her gün 0,012 artıp ~3 ayda 1,6 tavanına ulaşıyordu; sonrasında öğle fiyatı neredeyse her gün sıfıra iniyordu.
- Sıfır fiyatlı saatlerde GES üretimi satılamadığı için kısılıyor, yıllık kapasite faktörü %8'e düşüyordu.
- Baz fiyat düzeyi gerçeğin altındaydı.

## Yapılan ayar (`PRICE`, `src/config.js`)
| Parametre | Önce | Sonra | Anlamı |
|---|---|---|---|
| `lvl` | 1,00 | 1,08 | Baz fiyat düzeyi çarpanı |
| `solar` | 57 | 30 | Güneşin öğle fiyatını düşürme derinliği ($/MWh, doygunluk 1'de) |
| `grow` | 0,012/gün | 0,002/gün | Güneş doygunluğunun günlük artışı |
| `capK` | tavan 1,6 | başlangıcın 1,2 katı | Doygunluk tavanı (Türkiye: 0,60 → en çok 0,72) |
| `wind` | 10 | 8 | Rüzgârın fiyatı düşürme etkisi |

Eski kayıtlarda tavanı aşmış doygunluk değerleri fiyat hesabında yeni tavana indirgenir.

## Sınırlamalar
- Güneş oranı yalnızca 7 güne dayanır; günlük oran %18 ile %110 arasında değişti (hafta sonu ve bayram günleri çok düşük). Yıllık değer için daha fazla gün gerekir; sonuç "~%75, belirsizliği yüksek" diye okunmalıdır. (30.10.2026'da her aydan bir güne, 12 güne genişletildi: oran 0,84. Aşağıdaki bölüm.)
- EPİAŞ gerçek zamanlı üretimindeki güneş yalnızca lisanslı santralleri kapsar (öğlen ~2–3 GW). Lisanssız güneş tüketim tarafında görünür. Profilin şekli temsilîdir, mutlak üretim değildir.
- Fiyatlar EPİAŞ'ın USD karşılıklarıdır; kur hareketi dolar fiyatını etkiler.
- Oyunun piyasası tek bir temsilî noktanın havasıyla çalışır, Türkiye geneli değildir. Oyun yılı ilkbaharda başlar; aylık karşılaştırma yapılmadı.

# Avrupa (ENTSO-E 2025)

## Veri
ENTSO-E Şeffaflık Platformu: gün öncesi fiyatlar ve gerçekleşen üretim (güneş, karada rüzgâr), Almanya-Lüksemburg (DE_LU) ve İspanya (ES) teklif bölgeleri. Yıllık sorgular zaman aşımına uğradığı için 2025'te her ayın 15'i (12 gün) tek tek sorgulandı; günlük baz fiyat, capture fiyatı ve üretim `scripts/calib_eu.py` içinde. Fiyatlar EUR/MWh; oyunla karşılaştırmada EUR/USD ≈ 1,116 alındı (EPİAŞ'ın aynı dönemdeki örnek günlerde yayımladığı USD/EUR fiyat oranlarının ortalaması; resmî yıllık kur değildir).

Oyunun Avrupa piyasası tek bir piyasadır; hedef olarak Almanya ve İspanya'nın basit ortalaması kullanıldı.

## Sonuç
Oyun değerleri: Avrupa piyasasında bir GES (İspanya iç kesim) ve bir RES (Kuzey Almanya) ile 365 oyun günü.

| Gösterge | Almanya | İspanya | Hedef (ortalama) | Oyun, önce | Oyun, sonra |
|---|---|---|---|---|---|
| Ortalama fiyat | 95,3 €/MWh (~106 $) | 64,9 €/MWh (~72 $) | ~89 $/MWh | 84,6 $/MWh | 87,9 $/MWh |
| Güneş fiyat oranı (piyasa) | %45 | %56 | ~%50 | %89 | %53 |
| Rüzgâr fiyat oranı | %74 | %92 | ~%83 | %94 | %90 |

"Piyasa" güneş oranı, oyunda sıfır fiyat yüzünden kısılan üretimi de sıfır fiyattan satılmış sayar (gerçek veride üretim negatif ve sıfır fiyatlı saatlerde de sayılır). Oyuncunun santrali sıfır fiyatta üretimi kıstığı için kendi gerçekleşen oranı daha yüksektir (%70).

## Yapılan ayar (`REG.E`, `src/config.js`)
| Parametre | Önce | Sonra | Anlamı |
|---|---|---|---|
| `mult` | 1,15 | 1,9 | Avrupa fiyat düzeyi çarpanı |
| `sk` | 1 | 2,5 | Güneşin öğle fiyatını düşürme etkisi çarpanı (Türkiye'ye göre) |
| `wk` | 1 | 3 | Rüzgârın fiyatı düşürme etkisi çarpanı |

## Sınırlamalar
- 12 örnek gün; tek günlük değerler çok oynak (Almanya'da baz fiyat 8,8 ile 222 €/MWh arasında, güneş oranı −%57 ile %137 arasında). Sonuçlar yön ve büyüklük göstergesidir, yıllık kesin değer değildir.
- Oyunda fiyat tabanı 0'dır ve santral sıfır fiyatta üretimi kısar; gerçek piyasada negatif fiyat vardır ve destekli santraller üretmeye devam eder. Bu yüzden oyunda Avrupa GES kısıntısı yüksektir (yıllık üretimin ~%20–25'i, kapasite faktörü ~%17). (11.11.2026: Avrupa ve İberya'da negatif fiyat eklendi; "Negatif fiyat" bölümü.)
- Avrupa tek piyasa olarak modellenir; ülkeler arası fark (Almanya'da yüksek fiyat ve güçlü rüzgâr etkisi, İspanya'da düşük fiyat ve güçlü güneş etkisi) ortalamada kaybolur. (11.11.2026: İspanya ve Portekiz ayrı piyasa oldu; "Avrupa ikiye ayrıldı" bölümü.)
- Kur dönüşümü yaklaşıktır.
- Koşudan koşuya oynaklık: aynı ayarla yapılan 365 günlük simülasyonlar oyunun hava modeli ve rastgelelik nedeniyle farklı sonuç verir. Avrupa'da dört koşuda ortalama fiyat 77,9–90,7 $/MWh, piyasa güneş oranı %50–57, rüzgâr oranı %85–90 çıktı; Türkiye'de dört koşuda 65,8–66,8 $/MWh, güneş %73–74, rüzgâr %95–99. Ölçüm script'i: `scripts/sim_year.cjs`.

# Rüzgâr üretimi (TEİAŞ, EPDK, ENTSO-E 2025)

## Neden
Panelde rüzgâr çoğu yerde ●●○○○ ya da ●○○○○ görünüyordu. Puan ölçeği 4–12,5 m/s arasına yayılmıştı; 4–5 puan neredeyse yalnızca açık denizde çıkıyordu. Üretim tarafı ise ülkeye göre farklı yönde sapıyordu:
- Türkiye'de santrallerin bulunduğu illerde oyunun filo kapasite faktörü (KF) %28'di; gerçek değer %33.
- Almanya'da oyunda tipik bir saha %45 KF verirken gerçek filo %20'ydi.
- Almanya'da en rüzgârlı mevsim oyunda yazdı; gerçekte kış.

## Veri
| Gösterge | Kaynak | Dönem |
|---|---|---|
| Türkiye rüzgâr üretimi | TEİAŞ aylık üretim raporu (GWh) | 2025, 12 ay |
| Türkiye kurulu güç | TEİAŞ yıl sonu kurulu güç (MW): 12.871 (2024), 14.792 (2025) | 2024–2025 |
| Türkiye santral dağılımı | EPDK üretim lisansları, işletmedeki 308 RES'in il bazında mekanik kurulu gücü (~15.960 MWm) | Ekim 2026 sorgusu |
| Almanya kara ve deniz | ENTSO-E gerçekleşen üretim (A75) aylık toplam; kurulu güç (A68) 63,4 GW kara, 9,2 GW deniz | Ocak–Ekim 2025, Aralık 2024 |
| İspanya kara | ENTSO-E A75 aylık toplam; kurulu güç (A68) 30,9 GW | 2025, 12 ay |

Hesap: `scripts/calib_wind.py`. Almanya'nın Kasım sorgusu zaman aşımına uğradı; Ekim ile Aralık ortalaması alındı (tahmin). Kurulu güç 2025 başı değeridir; yıl içi artış bilinmediği için Almanya ve İspanya KF'si hafifçe yüksek çıkabilir. Türkiye'de ay içi kurulu güç iki yıl sonu arasında doğrusal varsayıldı. Yıl sonu değerleriyle aralık %30,7–35,3'tür.

## Yapılan değişiklik
1. **Güç eğrisi** (`weather.js`): Tam güç 12 m/s yerine 11 m/s'de. Oyundaki standart türbin (150 m rotor) gibi büyük rotorlu modern bir türbine uygun; 3 m/s'de devreye girer, 25 m/s'de durur.
2. **Saha hızı katsayısı** (`world.js`, `LAND_K`, `LAND_KC`, `SEA_K`): NASA POWER'ın ~50 km'lik verisi ülkeden ülkeye farklı sapıyor. Katsayı, oyunun filo KF'sini gerçekleşmeye eşitleyecek şekilde seçildi. Türkiye'de santraller hücre ortalamasından rüzgârlı sırtlara kurulduğu için katsayı 1'in üstünde; Almanya ve İspanya'da veri gerçeğin üstünde kaldığı için 1'in altında.
3. **Aylık hız çarpanı** (`weather.js`, `WIND_MONTH`): Türkiye, Almanya ve İspanya için 2025 aylık KF'sinden (3 aylık yumuşatma). Yıllık ortalaması 1'dir; Avrupa'nın diğer ülkeleri Almanya ve İspanya ortalamasını kullanır. Oyunun hava modeli kış alçak basınçlarını Akdeniz'e kaydırdığı için Almanya'nın kışı sakin çıkıyordu; çarpan bunu üretim tarafında düzeltir. Hava görünümü değişmedi.
4. **Gösterge**: Panelde rüzgâr noktası artık beklenen KF sınıfıdır (●●●○○ = %27–34, Türkiye filo ortalaması ~%33 bu sınıfta). Yanında yıllık ortalama göbek hızı ve tahmini KF yazar. Potansiyel haritası aynı sınıfları kullanır. Tahmin, oyunun saatlik rüzgâr dağılımına uyan Weibull eğrisinden (k=2,2) hesaplanır; 365 günlük simülasyonlarla karşılaştırmada hata ~3 puan.
5. Rakipler beklenen KF'si %27'nin altındaki sahalara RES kurmaz (eski seçiciliğe denk).
6. Eski kayıtlarda sahaların rüzgâr değeri bir kez yeniden hesaplanır (`resV` 3).

| Katsayı | Değer |
|---|---|
| Türkiye kara | 1,02 |
| Almanya kara | 0,73 |
| İspanya kara | 0,925 |
| Avrupa'nın diğer ülkeleri, kara | 0,83 |
| Almanya deniz (Avrupa denizleri) | 0,725 |
| Diğer piyasalar | 1 (kalibre edilmedi) |

## Sonuç
Oyun değerleri `scripts/wind_fleet.cjs` ile 365 günlük koşuların ortalamasıdır. Hava modeli her koşuda başka tohumla başladığı için tek yıl ±%10 sapar.

| Filo | Gerçek 2025 | Oyun, önce | Oyun, sonra | Koşu |
|---|---|---|---|---|
| Türkiye kara | %32,8 | %27 | %32,6 | 3 |
| Almanya kara | %20,2 | ~%45 | %20,2 | 2 |
| İspanya kara | %20,5 | — | %21,8 | 2 |
| Almanya deniz | %31,2 | — | %31,7 | 2 |

Türkiye'de oyunun aylık KF'si gerçekle aynı yönde: en rüzgârlı ay Ağustos, en sakin ay Ekim. Tek yıl verisine dayandığı için aylık değerlerin belirsizliği yüksektir.

**Proje ekonomisine etkisi** (5 MW RES, %10 WACC, `scripts/sim_year.cjs`):
- Çanakkale: KF %45–48, IRR %20,5–22,2. Türkiye'nin en rüzgârlı sahalarından biri; filo ortalaması (%33) aynı fiyatla IRR ~%13,5 verir.
- Kuzey Almanya: KF %37–41'den %23–24'e düştü; IRR %19–22'den %11–12'ye indi.

## Sınırlamalar
- Hedefler tek yıla (2025) dayanır. Rüzgâr yıldan yıla değişir; 2025'in uzun dönem ortalamasından sapması ölçülmedi.
- Filo ortalaması eski ve yeni türbinleri birlikte içerir; oyundaki santral yeni bir türbindir. Almanya'da filo yaşlı olduğu için yeni bir santralin gerçek KF'si %20'den yüksek olabilir.
- Gerçek filo üretimi kısıntı ve iz kayıplarını içerir; oyunda bunlar ayrı modellenmez, katsayıya dahildir.
- Almanya ve İspanya'nın bölge ağırlıkları yaklaşıktır (yayımlanmış bir kaynakla doğrulanmadı). Türkiye'de ilin en rüzgârlı noktası seçildi; ortanca nokta seçilseydi katsayı daha yüksek çıkardı.
- Avrupa rüzgâr fiyat oranı yeni modelle %91–94 çıkıyordu (hedef ~%83: Almanya %74, İspanya %92, 12 örnek gün). Fiyattaki rüzgâr etkisi bölgesel yapılarak giderildi: aşağıdaki "Avrupa rüzgârının fiyat etkisi" bölümü.
- Deniz üstünde yalnızca Almanya kalibre edildi (Türkiye için karşılaştırılacak deniz üstü filo verisi yok); Avrupa dışındaki piyasalar kalibre edilmedi.

# Avrupa rüzgârının fiyat etkisi: filo bölgeleri (29.10.2026)

## Neden
Fiyattaki rüzgâr etkisi piyasanın tek temsilî noktasının (Avrupa: 50°K 10°D) rüzgâr hızından hesaplanıyordu. Santralin üretimi ise kendi sahasının havasından geliyor. Gerçekte rüzgâr bölge genelinde birlikte eser; filo çok ürettiğinde fiyat düşer ve tek bir santralin yakalama oranı 1'in altında kalır. Oyunda Avrupa'nın rüzgâr oranı 0,97 çıkıyordu (gerçek ~0,90).

Not: Teknoloji ekonomisi denetiminin ilk sürümünde ölçüm betiği günün piyasa verisini her gün yeniden okumuyordu (`D` nesnesini başta bir kez yakalıyordu). Bu yüzden "Avrupa fiyatı koşudan koşuya 58–124 $/MWh oynuyor" diye yanlış bir bulgu yazıldı. Betik düzeltildi; doğru ölçümde koşular arası fark ±%6. Aşağıdaki tüm değerler düzeltilmiş betikle ölçüldü.

## Veri
ENTSO-E gün öncesi fiyatlar ve gerçekleşen üretim, 2025. Çeyreklik sorgular üretim ağırlıklı olarak yıla toplandı. Kur: 1,1306 $/€ (FRED AEXUSEU, 2025).

| Gösterge | Almanya (DE_LU) | İspanya (ES) |
|---|---|---|
| Baz yük fiyatı | 89,3 €/MWh (~101 $) | 65,5 €/MWh (~74 $) |
| Rüzgâr yakalama oranı | %86,6 | %96,5 |
| Güneş yakalama oranı | %51,6 | %55,2 |

İspanya'nın 2. çeyreğinde üretim verisinin %1,6'sı eksik.

Hedefler (Avrupa tek piyasa): fiyat ~88 $/MWh (iki ülkenin ortalaması), rüzgâr oranı ~0,90 (üretim ağırlıklı; aralık 0,87–0,96), güneş oranı ~0,53.

## Yöntem
- **Filo noktaları** (`src/windfleet.js`, üreten `scripts/gen_windfleet.cjs`): rüzgâr kalibrasyonundaki bölgeler ve ağırlıklar (`scripts/wind_fleet.cjs`).
  - Avrupa: Almanya'nın 8 eyaleti ve 5 deniz üstü kümesi, İspanya'nın 11 bölgesi; ağırlıklar yaklaşık GW.
  - Türkiye: EPDK il dağılımı. Kuzey Amerika: ABD'nin 10 rüzgâr bölgesi; ağırlıklar yaklaşık, doğrulanmadı.
- **Endeks** (`wxsite.js` `fleetWind`): her saat, noktaların oyun havasındaki göbek hızından güç eğrisiyle kapasite oranı, ağırlıklı ortalama. Fiyattaki rüzgâr girdisi = endeks ÷ uzun dönem ortalaması (`FLEET_CF`), 0–3 aralığında.
- **Kapsam:** yalnızca Avrupa'da açık. Türkiye'de rüzgâr oranı zaten hedefe yakın (oyun 0,96, EPİAŞ 0,99); Kuzey Amerika için hedef veri yok. İkisi tek temsilî noktayla kalır; filo endeksi yalnızca ölçüm için hesaplanır.
- **Yeni Avrupa ayarı** (`REG.E`): filo endeksi tek noktadan daha geniş dalgalandığı için rüzgâr katsayısı düşürüldü; güneş katsayısı ve fiyat düzeyi yeniden ayarlandı.

| Parametre | Önce | Sonra |
|---|---|---|
| `mult` | 1,9 | 1,62 |
| `sk` | 2,5 | 3,7 |
| `wk` | 3 | 1,7 |
| `FLEET_CF.E` | – | 0,211 (ölçülen filo ortalaması 0,21–0,23) |

## Sonuç
`scripts/calib_market.cjs`, 120 oyun günü (bir takvim yılı) × 4 koşu. Oyun normal (rakipler yatırım yapar), olay kartları kapalı. Oranlar filo düzeyindedir (bölge üretimiyle ağırlıklı, sıfır fiyatlı saatler dahil), ENTSO-E'nin ölçtüğüyle aynı tanım.

| Avrupa | Gerçek 2025 | Önce | Sonra |
|---|---|---|---|
| Ortalama fiyat | ~88 $/MWh | 94,5 (88,4–99,8) | 89,5 (86,1–95,7) |
| Rüzgâr oranı | ~0,90 (0,87–0,96) | 0,97 (0,95–0,98) | 0,88 (0,87–0,91) |
| Güneş oranı | ~0,53 | 0,54 (0,49–0,57) | 0,55 (0,50–0,58) |
| Rüzgâr filosu KF | DE kara %20,2, ES %20,5 | 0,21 | 0,21–0,23 |

Aynı koşularda Türkiye: fiyat 72,1 $/MWh (70,6–73,2), rüzgâr oranı 0,96, güneş oranı 0,85, filo KF 0,33. Kuzey Amerika: 64,5 $/MWh, rüzgâr 0,98, güneş 0,90, filo KF 0,38. Bu iki piyasa değişmedi.

## Sınırlamalar
- Avrupa tek piyasa: Almanya ve İspanya'nın ayrı fiyat bölgeleri bir arada. Filo ağırlıkları Almanya ağırlıklı olduğu için İspanya'daki bir santralin oyundaki oranı gerçekteki %96,5'ten düşük çıkabilir. (11.11.2026: giderildi; "Avrupa ikiye ayrıldı" bölümü.)
- Filo ağırlıkları yaklaşık (Almanya, İspanya); Kuzey Amerika'nınkiler doğrulanmadı.
- Hedefler tek yıla (2025) dayanır.
- **Düzeltme (30.10.2026):** Bu maddenin ilk sürümünde Türkiye'nin oyundaki fiyatı (72 $/MWh) ile ilk kalibrasyon (65,8) arasında "~%8'lik kayma" olduğu yazıyordu. Kayma yoktu: ilk kalibrasyon 365 oyun gününün (üç takvim yılı) ortalamasıydı, buradaki ölçüm ise ilk 120 günün. Türkiye de ilk oyun yılına göre yeniden ayarlandı (aşağıdaki bölüm).

# Türkiye fiyat düzeyi: ilk oyun yılı (30.10.2026)

## Neden
- Avrupa ilk oyun yılına (120 gün) göre ayarlıydı, Türkiye ise 365 oyun gününün ortalamasına. Oyunda bir yıl 120 gün sürdüğü için 365 gün yaklaşık üç takvim yılı eder; iki piyasa farklı tanımla kalibre edilmişti.
- Oyunda fiyat yıllar içinde düşer: rakipler her yıl santral kurar (Türkiye'de yıl ortalaması ilk yıl ~0,2–0,3 GW, üçüncü yıl ~1,3–1,4 GW) ve güneş doygunluğu ilk ~60 günde tavanına çıkar. Bu yüzden 365 günlük ortalama ilk yılın altında kalır.
- Değişiklikten önceki ölçüm (`REG.T.mult` 1,00; 360 gün × 3 koşu): 1. yıl 72,8, 2. yıl 66,3, 3. yıl 56,8 $/MWh. Üç yılın ortalaması 65,3; ilk kalibrasyonun 65,8'iyle uyumlu. Model kaymamıştı, ama oyuncu ilk yılda EPİAŞ 2025 ortalamasının ~%9 üstünde fiyat görüyordu (birleşik tahmin 72,2 $/MWh).
- **Düzeltme:** Ekonomi denetiminde ve yukarıdaki "Avrupa rüzgârının fiyat etkisi" bölümünde bu fark "~%8'lik kayma" diye yazılmıştı. Yanlıştı: karşılaştırılan iki ölçüm farklı dönemleri kapsıyordu (ilk 120 gün ile 365 gün).

## Veri
- **Hedef fiyat:** EPİAŞ PTF 2025 yıllık ortalaması 66,42 USD/MWh (EPİAŞ'ın USD karşılığı; 18.10.2026 kalibrasyonunda alındı).
- **Güneş oranı:** EPİAŞ PTF × gerçek zamanlı üretim `sun` sütunu, 2025'te 12 gün (her ayın 15'i; Haziran için 1 Haziran). Bu çalışmada eklenen günler: 15 Şubat, 15 Ağustos, 15 Eylül, 15 Kasım, 15 Aralık (EPİAŞ Şeffaflık Platformu, MCP üzerinden).
  - Oran 0,841 (örnek günlerin baz ortalamasına göre; yıllık baza göre 0,852). Günlük oran 0,18 ile 1,10 arasında, ortanca 0,91.
  - Eski 7 günlük değer (0,77) bir pazarın (1 Haziran: öğle fiyatı ~1 $/MWh) ve bir cumartesinin (15 Mart) ağırlığını taşıyordu.
  - Hesap: `scripts/calib_tr_solar.py`.
- **Rüzgâr oranı:** EPİAŞ tam yıl 0,99 (18.10.2026).
- ENTSO-E'de Türkiye gün öncesi fiyatı yok (sorgu boş döndü); Avrupa'daki gibi tam yıl, üretim ağırlıklı bir hesap yapılamadı.

## Yapılan değişiklik
- `REG.T.mult` 1,00 → 0,92. Çarpan bütün saatlik fiyatları orantılı ölçekler: güneş ve rüzgâr oranları değişmez, diğer piyasalar etkilenmez. Çarpanı kullanan iki olay kartının (sabit fiyat teklifleri) tutarları ve fiyat grafiğinin üst sınırı da aynı oranda küçülür.
- Çarpan beş ölçüm grubunun (18 koşu: çarpan 1,00, 0,91 ve 0,93 ile `calib_market.cjs` 120 gün × 4 ve yıl yıl ölçüm 360 gün × 3) birleşik tahmininden seçildi: çarpan 1,00 iken ilk yıl fiyatı ~72,2 $/MWh, 66,4 ÷ 72,2 = 0,92. Tek bir koşu grubunun ortalaması ±%1,5 oynuyor (0,91 ile 65,2; 0,93 ile 67,7).

## Sonuç
`scripts/calib_market.cjs`, 120 oyun günü (ilk oyun yılı) × 4 koşu; rakipler açık, olay kartları kapalı.

| Türkiye, ilk oyun yılı | Gerçek 2025 (EPİAŞ) | Önce (çarpan 1,00) | Sonra (çarpan 0,92) |
|---|---|---|---|
| Ortalama fiyat | 66,4 $/MWh | 72,1 (70,6–73,2) | 66,2 (64,6–67,5) |
| Güneş oranı (filo) | ~0,84 (12 örnek gün) | 0,85 | 0,85 (0,84–0,85) |
| Rüzgâr oranı (filo) | 0,99 | 0,96 | 0,97 (0,95–0,98) |

Oyun yıllarına göre ortalama fiyat ($/MWh): iki ölçüm grubunun (360 gün × 3 koşu, çarpan 1,00 ve 0,91) çarpan 0,92'ye orantılı ölçeklenmiş ortalaması.

| Oyun yılı | Önce (1,00) | Sonra (0,92) | Rakiplerin Türkiye'deki kurulu gücü, yıl ortalaması |
|---|---|---|---|
| 1 | 72,8 | ~66 | 0,2–0,3 GW |
| 2 | 66,3 | ~60 | 0,6–1,0 GW |
| 3 | 56,8 | ~52 | 1,3–1,4 GW |

09.11.2026'da yeniden ölçüldü; güncel değerler "Günlük fiyat şekli ve azami fiyat" bölümünde, "Çok yıllı fiyat yolu".

## Sınırlamalar
- Sonraki yıllardaki düşüş oyunun kendi davranışıdır (rakip yatırımı, güneş doygunluğu); gerçek piyasa için tahmin değildir. Gerçekte fiyatı gaz fiyatı, kur ve talep de belirler.
- Hedef tek yıla (2025) dayanır; 2026 ortalaması kullanılmadı. 2026'nın ilk on ayıyla karşılaştırma: aşağıdaki "Türkiye 2026 kontrolü" bölümü.
- Güneş hedefi 12 güne dayanır; günler arasındaki fark büyük. (09.11.2026: tam yıl ölçüldü, 0,834; aşağıda "Günlük fiyat şekli".)
- Vaka çalışması sayfaları (`public/vaka/`, `public/case-study/`) 18.10.2026 model sürümüyle ve 365 gün üzerinden üretilmişti. 30.10.2026'da güncel modelle ve ilk oyun yılı üzerinden yeniden üretildi: piyasa karşılaştırması bu bölümdeki ve bölgesel rüzgâr bölümündeki kalibrasyon koşularından, proje ekonomisi `scripts/sim_year.cjs` ile (120 gün × 8 koşu, piyasa başına; olay kartları kapalı).
- 08.11.2026: GES yatırım maliyeti piyasaya bağlandı (Avrupa 779 $/kW, `config.js` `CAPEX_M`). Vaka çalışmasının Avrupa proje satırları 8 yeni koşuyla yenilendi: Avrupa GES IRR'ı %10,7–13,3 (önce %12,5–15,2). Aynı koşular 691 $/kW ile %12,4–15,3 verir; düşüşün tamamı maliyettendir (koşu başına 1,7–2,0 puan). Türkiye'de 8 yeni koşu eski aralıklarda kaldı (ortalama fiyat 66,2 $/MWh; GES IRR %11,8–13,6, RES %15,7–22,4); Türkiye satırları korundu.

# Türkiye 2026 kontrolü: Ocak–Ekim (04.11.2026)

## Neden
Türkiye'nin fiyat düzeyi EPİAŞ 2025 ortalamasına (66,4 $/MWh) ayarlı. Haftalık güncelleme sürecinde (`docs/guncellemeler.md`) fiyat kalibrasyonu çeyrekte bir tam veriyle denetlenir. Bu ilk denetim: 2026'nın ilk on ayı 2025'in aynı dönemiyle karşılaştırıldı.

## Veri
- **Fiyat:** EPİAŞ Şeffaflık Platformu, GÖP PTF (`/markets/dam/data/mcp`), saatlik; EPİAŞ'ın yayımladığı USD ve TL karşılıkları (MCP üzerinden, 04.11.2026). Aylık değerler saatlik basit ortalamadır.
- **Hidroelektrik üretimi:** TEİAŞ aylık ve yıllık elektrik istatistikleri (MCP üzerinden, 04.11.2026). 2026 Ekim verisi henüz yok.
- Güneş üretimi ve tüketim TEİAŞ'ta iki yıl arasında belirgin değişmedi; ayrıntılı ay ay karşılaştırma yapılmadı.

| Ay | PTF 2025 ($/MWh) | PTF 2026 ($/MWh) | Değişim | Hidro 2025 (GWh) | Hidro 2026 (GWh) | Değişim |
|---|---|---|---|---|---|---|
| Ocak | 70,8 | 67,2 | −%5 | 4.830 | 4.244 | −%12 |
| Şubat | 68,7 | 47,7 | −%31 | 4.192 | 8.238 | +%97 |
| Mart | 59,1 | 36,8 | −%38 | 5.396 | 10.610 | +%97 |
| Nisan | 64,6 | 20,7 | −%68 | 7.325 | 11.666 | +%59 |
| Mayıs | 63,6 | 13,0 | −%80 | 7.410 | 11.719 | +%58 |
| Haziran | 56,0 | 26,9 | −%52 | 4.816 | 10.549 | +%119 |
| Temmuz | 74,0 | 57,6 | −%22 | 5.693 | 9.101 | +%60 |
| Ağustos | 72,2 | 61,0 | −%16 | 4.489 | 9.091 | +%103 |
| Eylül | 66,2 | 56,6 | −%15 | 3.261 | 8.268 | +%154 |
| Ekim | 65,7 | 59,3 | −%10 | — | — | — |
| **Ocak–Ekim** | **66,1** | **44,7** | **−%32** | 47.412 (Oca–Eyl) | 83.486 (Oca–Eyl) | +%76 |

Nisan ve Mayıs 2026'da saatlik fiyatın ortancası 8,1 ve 4,2 $/MWh'ti: öğle saatlerinin çoğu sıfıra yakındı.

Kur ayrımı (aynı veri, TL karşılığı):

| Dönem | TL/MWh 2025 | TL/MWh 2026 | TL'de değişim | $/MWh 2025 | $/MWh 2026 | Dolarda değişim | Ortalamaların oranından kur (TL/$) |
|---|---|---|---|---|---|---|---|
| Ocak–Ekim | 2.567,6 | 2.066,2 | −%19,5 | 66,1 | 44,7 | −%32,3 | 38,8 → 46,2 (+%19) |
| Temmuz–Ekim | 2.844,2 | 2.819,5 | −%0,9 | 69,6 | 58,6 | −%15,7 | 40,9 → 48,1 (+%18) |

Yıllık hidroelektrik (TEİAŞ). Kapasite faktörü = üretim ÷ (yıl sonu kurulu güç × 8.760 saat); hidro kurulu gücü 2015–2025 arasında 25,9 GW'tan 32,3 GW'a çıktığı için yıllar arası karşılaştırma bununla yapılır.

| Yıl | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 (tahmin) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Üretim (TWh) | 67,1 | 67,2 | 58,2 | 59,9 | 88,8 | 78,1 | 55,9 | 66,8 | 64,0 | 74,9 | 57,4 | ~93 |
| Kapasite faktörü | %29,6 | %28,8 | %24,4 | %24,2 | %35,6 | %28,8 | %20,3 | %24,2 | %22,9 | %26,6 | %20,3 | ~%33 |

On bir yılın ortalaması 67,1 TWh, kapasite faktörü %25,9. 2026 tahmini: Ocak–Eylül 83,5 TWh, Ekim–Aralık 2025 düzeyinde (10,0 TWh) sürerse; kurulu güç 2025 sonu değeriyle.

Yıllık PTF ortalaması (EPİAŞ, $/MWh): 2023 96,6; 2024 68,1; 2025 66,4. TCMB TÜFE bazlı reel efektif döviz kuru (2025=100; artış TL'nin reel değer kazancı): 2023 83,1; 2024 93,0; 2025 100,0; 2026 Ocak–Ekim 105,1 (EVDS `TP.RK.T1.Y`, yıllık ortalama).

## Bulgular
- **Düzey:** 2026'nın ilk on ayında PTF 44,7 $/MWh. Oyunun ilk yılı (66,2) ve EPİAŞ 2025 (66,4) bunun ~%48 üstünde.
- **Düşüşün iki bileşeni:** Dolardaki %32'lik düşüşün yaklaşık yarısı TL fiyatın düşmesinden (−%19,5), kalanı kurdan geliyor: TL dolara karşı ~%19 değer kaybetti (0,805 × 0,841 ≈ 0,677).
  - Mart–Haziran: TL fiyat da çöktü; dolardaki düşüş −%38 ile −%80 arasında. Hidroelektrik üretimi aynı aylarda 2025'in %58–119 üstündeydi.
  - Temmuz–Ekim: TL fiyat neredeyse aynı (−%0,9); dolardaki −%16'nın tamamına yakını kur. Hidro bu aylarda da 2025'in çok üstündeydi ama fiyatı ilkbahardaki kadar düşürmedi (yaz talebi olası bir açıklama; ayrıştırılmadı).
- **Hidroloji:** 2026'nın ilk dokuz ayındaki 83,5 TWh, on bir yılın tam yıl ortalamasını (67,1) şimdiden aşıyor. Yıl ~93 TWh ile kapanırsa üretimde rekor, kurulu güce göre (kapasite faktörü ~%33) 2019'dan (%35,6) sonra en yağışlı yıl olur (**tahmin**). Karşılaştırma yılı 2025 ise 2021'le birlikte on bir yılın en kurak yılıydı (%20,3); ay ay değişimler bu yüzden büyük görünüyor.
- **Hidroloji tek başına yetmiyor:** 2024 ortalamanın biraz üstündeydi (%26,6) ama PTF 68,1 $/MWh ile 2025'ten yüksekti. Dolar fiyatını hidrolojinin yanı sıra TL fiyatın kura ve enflasyona göre seyri belirliyor. TL 2023'ten beri reel olarak değer kazanıyor (reel efektif kur 83 → 105). 2024'te TL fiyat bununla birlikte yükseldi ve dolar fiyatı korundu; 2026'da TL fiyat nominal olarak düştü. Bunun hidrolojiden mi, tarife ve fiyat limitinden mi geldiği bu kontrolde ayrıştırılmadı.
- **YEKDEM:** 2026 gibi bir yılda YEKDEM'in sabit fiyatı (oyunda 59,2 $/MWh) piyasa ortalamasının çok üstünde kalır. Oyunun ilk yılında (~66 $/MWh) bu karar sahaya göre değişiyor (README, YEKDEM bölümü).

## Karar
- **Kalibrasyon değişmedi** (`REG.T.mult` 0,92; hedef EPİAŞ 2025, 66,4 $/MWh). Gerekçe:
  - 2026, kurulu güce göre 2019'dan sonra en yağışlı yıl olma yolunda; karşılaştırma yılı 2025 en kuraklardandı. Fiyat düzeyini uç bir yıla ayarlamak tipik yılı temsil etmez.
  - Düşüşün yarısı kurdan geliyor. Oyunda kur yok; TL fiyatın kura yetişip yetişmeyeceği (tarife kararları) belirsiz.
  - 2026'nın tam yıl ortalaması ~47 $/MWh civarında kapanabilir (Kasım–Aralık ~60 $/MWh varsayımıyla; **tahmin**). Yıl kapanınca 2023–2026 ortalaması ya da hidrolojiye göre ağırlıklı bir hedef yeniden değerlendirilebilir.
- **Öneri:** Oyuna "hidrolojik yıl" değişkenliği. Her takvim yılı kurak, normal ya da yağışlı olur. Dağılım TEİAŞ 2015–2025 hidro kapasite faktöründen (%20–36); fiyat etkisi ağırlıkla ilkbahar aylarında (2026: Mart–Haziran). Böylece YEKDEM kararı gerçekteki gibi bir risk kararına döner. **Uygulandı (04.11.2026):** aşağıdaki "Hidrolojik yıl" bölümü.

## Sınırlamalar
- Gaz fiyatı (BOTAŞ santral tarifesi), azami fiyat limiti ve tüketim incelenmedi. En yüksek saatlik PTF 2025'te 3.400, 2026'da 4.500 TL/MWh'ti; bunların o yılların fiyat limiti olduğu ayrıca doğrulanmadı.
- Kur, TL ve USD ortalamalarının oranından türetildi; resmî ortalama kur değil.
- Kapasite faktörü yıl sonu kurulu güçle hesaplandı; kurulu gücün arttığı yıllarda biraz düşük çıkar. Barajlardaki su, üretimin yıl içine dağılımını da değiştirir; üretim yağışın birebir ölçüsü değildir.
- Ekim 2026 hidro verisi yok; yıl sonu hidro değeri tahmindir.

# Hidrolojik yıl (04.11.2026)

## Neden
2026 kontrolünde (yukarıda) Türkiye'nin ilkbahar fiyatlarının çok yağışlı bir yılda çöktüğü görüldü. Oyunda her yıl aynı fiyat düzeyiyle başlıyordu; YEKDEM kararı (sabit fiyat ya da piyasa) bu yüzden risk taşımıyordu. Fiyat düzeyini uç bir yıla ayarlamak yerine yılın hidrolojisi ayrı bir değişken olarak eklendi (`src/hydro.js`, `config.js` `HYDRO`).

## Veri
- **Su endeksi:** w = yılın HES kapasite faktörü ÷ 2015–2025 ortalaması (%25,9). Kaynak TEİAŞ yıllık hidro üretimi ve yıl sonu kurulu gücü (yukarıdaki tablo). 2015–2025: 1,14; 1,11; 0,94; 0,93; 1,37; 1,11; 0,78; 0,93; 0,88; 1,02; 0,78. 2026: 1,27 (**tahmin**: Ocak–Eylül TEİAŞ, Ekim–Aralık 2025 düzeyinde varsayıldı).
- **Fiyat etkisi (hedef):** EPİAŞ PTF, TL, aylık ortalama; 2026 (w ~1,27) ÷ 2025 (w 0,78). TL kullanıldı çünkü oyunda kur yok.

| Ay | 2025 (TL/MWh) | 2026 (TL/MWh) | Oran | Hidro değişimi | Hedef oran (÷ 1,15) |
|---|---|---|---|---|---|
| Ocak | 2.508,8 | 2.894,9 | 1,15 | −%12 | 1,00 |
| Şubat | 2.478,3 | 2.078,2 | 0,84 | +%97 | 0,73 |
| Mart | 2.183,8 | 1.620,3 | 0,74 | +%97 | 0,65 |
| Nisan | 2.452,7 | 921,1 | 0,38 | +%59 | 0,33 |
| Mayıs | 2.458,2 | 590,9 | 0,24 | +%58 | 0,21 |
| Haziran | 2.202,2 | 1.240,2 | 0,56 | +%119 | 0,49 |
| Temmuz–Ekim | 2.844,2 | 2.819,5 | 0,99 | +%60–154 (Tem–Eyl) | 0,86 |

- **Yorum:** Ocak'ta hidro 2025'ten az olduğu hâlde TL fiyat %15 yüksekti. Bu hidrolojiden bağımsız nominal artış sayıldı ve oranlar 1,15'e bölündü. Bölen tek aya dayanır; ±%5 oynaması hedef oranları aynı ölçüde kaydırır.
- **Etki doğrusal değil:** 2024 Nisan–Mayıs'ta hidro 2025'in %11 üstündeydi, dolar fiyatı %8 düşüktü (59,2'ye karşı 64,1 $/MWh; kur etkisi ayrılmadı). 2026'da hidro %59 fazlaydı, fiyat %74 düştü. Küçük fazlalık fiyatı az etkiliyor; büyük fazlalık talebin düşük ve güneşin güçlü olduğu aylarda fiyatı sıfıra itiyor.
- **Kurak yıl:** 2025 (w 0,78) ile 2024'ün (w 1,02) yıllık dolar fiyatı birbirine yakın (66,4 ve 68,1 $/MWh). Açığı gaz kapattığı için kurak yılın fiyatı az yükseltmesi beklenir; ayrı bir hedef çıkarılamadı.

## Model
- Türkiye piyasasında her saatin fiyatından, piyasa çarpanından önce `depth × mon[ay] × (w − 1)` düşülür (08.11.2026'dan beri yağışlı yılda saatlik ağırlıkla çarpılır; aşağıda "Saatlik dağılım"). Kurak yılda (w < 1) aynı terim `dry` payıyla (0,25) fiyata eklenir. Fiyat sıfırın altına inmez; bu sınır etkiyi doğal olarak doğrusal olmayan yapar.
- `depth` 150 $/MWh, aylık ağırlık Ocak…Aralık: 0,05; 0,5; 0,5; 1; 1,15; 0,72; 0,25; 0,25; 0,25; 0,2; 0,1; 0,05. Kasım ve Aralık için gerçek hedef yok (2026 verisi henüz yok); kışın düşük tutuldu.
- Türkiye'deki HES'lerin günlük su bütçesi w ile çarpılır (2026'da ×1,27).
- **Yıllar:** 2026 gerçek yıldır (`HYDRO.known`). Sonraki her yıl 1 Ocak'ta 2015–2025'ten biri eşit olasılıkla seçilir. Seçim kayda yazılır; o güne kadar bilinmez, bu yüzden YEKDEM başvurusu (30 Kasım) hidroloji bilinmeden yapılır. Dağılım: 3 kurak (w < 0,9), 4 normal, 3 yağışlı, 1 çok yağışlı (w ≥ 1,25).
- **Eşit fiyatlı saatler:** Yağışlı ilkbaharda birçok saat sıfır fiyata iner. Batarya planı eşit fiyatta güneşli saati önce seçer, böylece sahadaki GES'in üretimiyle dolar (`mods.js` `battPlan`).

## Sonuç
`scripts/calib_hydro.cjs`, 120 oyun günü × 6 koşu (iki ölçüm grubu); bütün yıllara aynı w verildi; rakipler açık, olay kartları kapalı. Fiyat $/MWh.

| Ay | w 0,78 (kurak, 2025 gibi) | w 1 (normal) | w 1,27 (2026) | Oyun oranı 1,27 ÷ 0,78 | Hedef oran |
|---|---|---|---|---|---|
| Ocak | 76,3 | 75,4 | 73,3 | 0,96 | 1,00 |
| Şubat | 73,3 | 71,1 | 51,9 | 0,71 | 0,73 |
| Mart | 66,5 | 62,5 | 45,6 | 0,69 | 0,65 |
| Nisan | 62,5 | 56,3 | 18,5 | 0,30 | 0,33 |
| Mayıs | 63,2 | 53,9 | 11,8 | 0,19 | 0,21 |
| Haziran | 66,8 | 61,2 | 34,8 | 0,52 | 0,49 |
| Temmuz | 73,3 | 71,8 | 62,6 | 0,85 | 0,86 (Tem–Eki) |
| Ağustos | 73,8 | 74,2 | 64,0 | 0,87 | |
| Eylül | 66,7 | 65,7 | 56,0 | 0,84 | |
| Ekim | 66,2 | 65,0 | 58,9 | 0,89 | |
| Kasım | 71,3 | 70,1 | 67,0 | 0,94 | — |
| Aralık | 75,2 | 75,7 | 73,0 | 0,97 | — |
| **Yıl** | **69,6** (68,9–70,3) | **66,9** (66,3–67,8) | **51,3** (50,0–52,7) | 0,74 | |
| Çanakkale RES, ortalama satış fiyatı | 68,3 | 65,2 | 49,1 | | |
| Konya GES, ortalama satış fiyatı (3 koşu) | 59,9 | 56,6 | 40,2 | | |

- **Taban düzey değişmedi:** w = 1 iken model öncekiyle aynıdır (fark terimi sıfır, HES suyu ×1). Normal yılda 66,9 $/MWh; önceki kalibrasyon 66,2 (64,6–67,5), EPİAŞ 2025 66,4. Fark koşudan koşuya oynama içinde.
- **Kurak yıl** yıllık ortalamayı ~%4 yükseltiyor. **2026 gibi çok yağışlı yıl** ~%23 düşürüyor; Nisan'da saatlerin %10'u, Mayıs'ta %34'ü 5 $/MWh'in altında.
- **Yeni oyunun ilk yılı** 20 Mart 2026'da başlar ve gerçek 2026'yı yaşar (w 1,27); 2027'nin Ocak–Mart'ı yıl başında seçilen yıla göredir. Bu yüzden ilk yılın Türkiye ortalaması ~51 $/MWh civarındadır, normal yılda ~67. Gerçekte 2026 Ocak–Ekim ortalaması 44,7 $/MWh; farkın bir kısmı kurdur (oyunda kur yok; yukarıdaki 2026 kontrolü).
- **YEKDEM (59,2 $/MWh)** artık yıla bağlı bir karar:
  - Çanakkale RES'i normal ve kurak yılda piyasada daha çok kazanır (65,2 ve 68,3), çok yağışlı yılda YEKDEM'de (piyasada 49,1).
  - Konya GES'i normal yılda YEKDEM'de biraz daha iyi (piyasada 56,6), kurak yılda başa baş (59,9), çok yağışlı yılda YEKDEM açık ara önde (piyasada 40,2).

## Sınırlamalar
- Hedef tek bir yıl çiftine (2025 kurak, 2026 çok yağışlı) dayanır. Ara değerler (normal, yağışlı) modelin doğrusal olmayan yapısından gelir; gerçek veriyle ayrıca sınanmadı.
- ~~Etki bütün saatlerde aynı tutardır.~~ 08.11.2026'da giderildi: aşağıda "Saatlik dağılım".
- Su endeksi yıllıktır; gerçekte yağış ve kar erimesi yıl içinde değişir (2026 Ocak'ı kuraktı, Şubat'tan sonra çok yağışlıydı).
- 09.11.2026'da taban fiyat şekli değişti (aşağıda "Günlük fiyat şekli ve azami fiyat"); Mayıs ağırlığı 1,15'ten 1,45'e çıktı. Yukarıdaki tablolar önceki ölçümdür; güncel sayılar o bölümde.
- 2026 değeri tahmindir; TEİAŞ yıllık verisi yayımlanınca güncellenecek.
- Kalibrasyon koşuları (`calib_market.cjs`) ve vaka çalışması (`sim_year.cjs`) bütün yıllar için w = 1 (normal yıl) kullanır: taban düzey ve proje ekonomisi önceki modelle aynıdır.

# Hidrolojik yıl: saatlik dağılım (08.11.2026)

## Neden
İlk modelde yağışlı yılın fiyat etkisi bütün saatlerde aynı tutardı. EPİAŞ'ın saatlik verisi gerçeğin böyle olmadığını gösterdi: 2026 ilkbaharında öğle ve gece saatleri sıfıra indi, akşam zirvesi ise bir yıl öncesine yakın kaldı. Oyunda akşam fiyatı fazla düşüyor, sıfıra inen saat payı az kalıyor, günlük fiyat farkı yağışlı yılda büyüyeceği yerde küçülüyordu. Bu, bataryanın ve akşam üreten santrallerin yağışlı yıldaki değerini olduğundan düşük gösteriyordu.

## Veri
EPİAŞ PTF, saatlik, TL; 2025 (kurak, w 0,78) ve 2026 (çok yağışlı, w ~1,27) Mart–Haziran, her yıl 2.928 saat. Oranlar 2026 ÷ 2025 ÷ 1,15 (hidrolojiden bağımsız nominal artış, yukarıdaki "Hidrolojik yıl" bölümü).

| Ay | Gece 0–6 | Öğle 10–15 | Akşam 19–21 | Gün | 5 $/MWh altındaki saatler, 2025 → 2026 | Günlük en yüksek–en düşük farkı |
|---|---|---|---|---|---|---|
| Mart | 0,58 | 0,58 | 0,84 | 0,65 | %5 → %14 | 1,11 |
| Nisan | 0,23 | 0,09 | 0,83 | 0,33 | %3 → %32 | 1,42 |
| Mayıs | 0,10 | 0,03 | 0,64 | 0,21 | %5 → %58 | 1,00 |
| Haziran | 0,40 | 0,21 | 0,88 | 0,49 | %12 → %26 | 1,18 |

- **Saat başına düşüş (TL/MWh, 2025 × 1,15 − 2026):** gece (0–6) ayına göre ~1.150 (Mart) ile ~2.900 (Mayıs) arası; saat 20'de 210–1.055. Gece düşüşüne oranı, dört ayın ortalaması: saat 17: 0,87; 18: 0,83; 19: 0,46; 20: 0,25; 21: 0,41; 22: 0,61; 23: 0,85.
- **Öğle:** 2026'da öğle saatlerinin %35'i (Mart) ile %97'si (Mayıs) 5 $/MWh'in altında. Fiyat tabana dayandığı için TL farkı öğlenin gerçek etkisini ölçmez.
- **Günlük fark ortalamaya göre:** 2025'te ortalama fiyatın 0,88–1,17 katı, 2026'da 1,55 (Mart) ile 4,88 (Mayıs) katı. Dolar olarak 2026'da 57–79 $/MWh.

## Model
- Yağışlı yılda (w > 1) saatlik terim `depth × mon[ay] × (w − 1) × hr[saat]` olur (`config.js` `HYDRO.hr`, `hydro.js` `hydShift`). Kurak yılda saatlik ağırlık yok: açığı gaz kapatır, bütün saatlere eşit küçük artış (ayrı bir saatlik hedef yok).
- **Ağırlıklar:** gece ve sabah (0–8) 1; öğle (9–16) 1,25; akşam 17: 0,85, 18: 0,75, 19: 0,4, 20: 0,2, 21: 0,35, 22: 0,6, 23: 0,85. Akşam ağırlıkları verideki orandan, biraz aşağı yuvarlanarak alındı. Öğle ağırlığı doğrudan ölçülemediği için 5 $/MWh altındaki saat payını tutturacak şekilde seçildi.
- **Derinlik** 150'den 160'a çıktı: akşam ağırlığı düştüğü için aylık ortalama oranlar aynı kalsın diye. Kurak yılın payı 0,25'ten 0,23'e indi; kurak yılın etkisi (derinlik × pay) aynı kaldı (37,5'e karşı 36,8).
- **Denenen iki ayar** (`calib_hydro.cjs` 7. ve 8. bağımsız değişkeni koda dokunmadan ayar dener): öğle ağırlığı 1, derinlik 165 aylık oranları tutturdu ama Nisan'da 5 $/MWh altındaki saat payı %23'te kaldı (hedef %32), Haziran'ın öğle oranı 0,31 oldu (hedef 0,21). Seçilen ayar ikisinde de hedefe daha yakın.

## Sonuç
`scripts/calib_hydro.cjs`, 120 oyun günü × 3 koşu, her su endeksi için; bütün yıllara aynı w; rakipler açık, olay kartları kapalı. Oranlar w 1,27 ÷ w 0,78; parantezde EPİAŞ hedefi.

| Ay | Gece | Öğle | Akşam | Gün | 5 $/MWh altı (w 1,27) | Akşam ÷ gün (w 1,27) | Günlük fark |
|---|---|---|---|---|---|---|---|
| Mart | 0,61 (0,58) | 0,47 (0,58) | 0,90 (0,84) | 0,66 (0,65) | %1 (%14) | 1,74 (1,70) | 1,42 (1,11) |
| Nisan | 0,20 (0,23) | 0,01 (0,09) | 0,75 (0,83) | 0,30 (0,33) | %31 (%32) | 3,20 (3,47) | 1,65 (1,42) |
| Mayıs | 0,08 (0,10) | 0,00 (0,03) | 0,69 (0,64) | 0,23 (0,21) | %53 (%58) | 4,12 (4,22) | 1,36 (1,00) |
| Haziran | 0,48 (0,40) | 0,19 (0,21) | 0,84 (0,88) | 0,51 (0,49) | %5 (%26) | 2,25 (2,70) | 1,59 (1,18) |

- **Önceki modele göre:** Nisan'da akşam oranı 0,40'tan 0,75'e çıktı (hedef 0,83); 5 $/MWh altındaki saat payı %11'den %31'e (hedef %32); günlük fark yağışlı yılda artık küçülmüyor, büyüyor (önceki 0,89, şimdi 1,65).
- **Yıllık ortalama korundu:** kurak yıl 70,2, normal yıl 66,6, w 1,27 51,1 $/MWh (önce 69,6; 66,9; 51,3; fark koşudan koşuya oynama içinde). Normal yılda model değişmedi (fark terimi sıfır); kalibrasyon ve vaka çalışması etkilenmez.
- **Santrallerin ortalama satış fiyatı (kurak / normal / w 1,27):** Konya GES 60,5 / 55,4 / 40,8 (önce 59,9 / 56,6 / 40,2); Çanakkale RES 68,2 / 65,2 / 49,1 (önce 68,3 / 65,2 / 49,1). YEKDEM kararı (59,2 $/MWh) için önceki sonuç değişmedi.
- **Günlük fark dolar olarak gerçeğe yakın:** w 1,27'de Mart–Haziran 61–77 $/MWh (gerçek 2026: 57–79); ortalamanın 1,39–4,53 katı (gerçek 1,55–4,88).

## Sınırlamalar
- **Günlük farkın artışı gerçekte olduğundan büyük** (Nisan 1,65'e karşı 1,42). Neden: oyunun Mart–Haziran'daki günlük farkı gerçekten dar (ortalama fiyatın 0,64–0,76 katı; gerçek 2025'te 0,88–1,17). 09.11.2026'da giderildi: Nisan'da oran 1,44. Aşağıdaki "Günlük fiyat şekli" bölümüne bakın; yıl genelinde fark düzeyi zaten yakındı, dağılım yanlıştı.
- **Mart ve Haziran'da sıfır saat az** (%1 ve %5; gerçek %14 ve %26). Oyunda bu aylarda öğle fiyatı tabana inmeden kalıyor. Öğle ağırlığını artırmak Nisan–Mayıs'ı aşırı düşürür; aylık öğle ağırlığı ayrı ayarlanmadı.
- **Mayıs akşamı az düşüyor** (0,69'a karşı 0,64). Saatlik ağırlık bütün aylarda aynı.
- Hedef yine tek yıl çiftine dayanır; yağışlı (w 1,1–1,25) yılların saatlik dağılımı gerçek veriyle sınanmadı. Kurak yılın saatlik etkisi ölçülmedi.

# Günlük fiyat şekli ve azami fiyat (09.11.2026)

## Neden
"Saatlik dağılım" bölümünde oyunun normal yıldaki günlük farkının dar olduğu yazılmıştı (ortalama fiyatın 0,64–0,76 katı; gerçekte 0,88–1,17). Bu karşılaştırma yalnızca Mart–Haziran'a dayanıyordu. Tam yıl ölçümü tabloyu değiştirdi: yıllık ortalama günlük en yüksek–en düşük farkı oyunda 44,7, EPİAŞ 2025'te 48,6 $/MWh (−%8). Sorun düzey değil, mevsimsel dağılımdı: oyunda her ay 41–49 $/MWh; gerçekte ilkbahar ve sonbaharda 51–66, yaz ve kışta 31–40. Ayrıca Türkiye'nin güneş fiyat oranı hedefi yalnızca 12 örnek güne dayanıyordu.

## Veri
- **EPİAŞ PTF, saatlik, USD ve TL:** 2024 (8.784 saat), 2025 (8.760 saat). 2026 Ocak–Ekim için günlük fark istatistiği (BESS aracı, aynı EPİAŞ serisi).
- **EPİAŞ gerçek zamanlı üretim, saatlik:** 2024 ve 2025, lisanslı güneş ve rüzgâr (2025'te güneş 7,73 TWh).

| | 2024 | 2025 | 2026 Ocak–Ekim |
|---|---|---|---|
| Ortalama fiyat ($/MWh) | 68,1 | 66,4 | 44,7 |
| Günlük en yüksek–en düşük farkı ($/MWh) | 47,4 | 48,7 | 62,2 |
| Güneş fiyat oranı (lisanslı, tam yıl) | 0,911 | 0,834 | — |
| Rüzgâr fiyat oranı | 0,969 | 0,986 | — |
| En yüksek PTF (TL/MWh) | 2.700, sonra 3.000 | 3.000, Nisan'dan 3.400 | 3.400, Nisan'dan 4.500 |
| En yüksek fiyattaki saat payı | %13,3 | %17,7 | Nisan–Haziran %0,3–2,9 |

- **Güneş hedefi doğrulandı:** 2025 tam yılı 0,834. 12 örnek günden çıkan ~0,84 bununla tutarlı. 2024'te 0,911'di; tek yılda 8 puanlık düşüş, güneş kurulu gücünün hızlı artışıyla tutarlı (yorum; ayrıca ölçülmedi). Oyunun ilk yılı için 2025 hedef alındı.
- **Aylık fark yıldan yıla çok değişiyor:** Ocak 2024'te 53, 2025'te 36,6; Mayıs 48,8 ve 65,2 $/MWh. İki yılda da tekrar eden özellikler: yaz düşük (38–42), Nisan ve Ekim yüksek (57–62), ilkbahar ve sonbahar yaz ve kıştan yüksek.
- **Azami fiyat:** EPİAŞ verisinde en yüksek PTF yuvarlak değerlerde duruyor ve saatlerin %13–18'i bu değerde. Bu bir fiyat limitidir (EPDK kararları bu ortamdan açılamadı; değerler EPİAŞ verisinden). Nisan 2026'da 4.500 TL'ye (~100 $) çıktı; o zamandan beri nadiren bağlıyor. 2026 yazında günlük fark 61–73 $/MWh (2025: 38–40). 2025'in dar yaz farkını eski limit belirliyordu.

2025 aylık şekil (USD; oranlar aylık ortalamaya göre):

| Ay | Ortalama | Günlük fark | Gece 0–6 | Öğle 10–15 | Akşam 18–22 | Limitte | Güneş fiyat oranı |
|---|---|---|---|---|---|---|---|
| Ocak | 70,8 | 36,6 | 0,91 | 0,91 | 1,11 | %16 | 0,928 |
| Şubat | 68,7 | 34,8 | 0,93 | 0,90 | 1,11 | %6 | 0,926 |
| Mart | 59,1 | 53,3 | 1,08 | 0,65 | 1,26 | %5 | 0,743 |
| Nisan | 64,6 | 57,0 | 1,04 | 0,68 | 1,32 | %15 | 0,793 |
| Mayıs | 63,6 | 65,2 | 1,13 | 0,62 | 1,34 | %17 | 0,751 |
| Haziran | 56,0 | 65,5 | 1,16 | 0,58 | 1,41 | %8 | 0,788 |
| Temmuz | 74,0 | 37,6 | 1,05 | 0,84 | 1,13 | %27 | 0,899 |
| Ağustos | 72,2 | 40,2 | 1,07 | 0,80 | 1,14 | %21 | 0,868 |
| Eylül | 66,2 | 53,3 | 1,07 | 0,70 | 1,22 | %12 | 0,827 |
| Ekim | 65,7 | 57,7 | 1,02 | 0,70 | 1,21 | %26 | 0,801 |
| Kasım | 66,1 | 51,0 | 0,95 | 0,79 | 1,17 | %29 | 0,827 |
| Aralık | 69,8 | 31,5 | 0,89 | 0,97 | 1,08 | %29 | 0,963 |

## Model (`config.js` `REG.T`, `sim.js`, `mods.js`)
- **`cap` 100 $/MWh:** Türkiye'de saatlik fiyat bunu aşmaz (`priceCap`). 4.500 TL'nin 2026 kuruyla karşılığı; normal yıl ortalamasının ~1,5 katı. Olay kartlarının fiyat etkisi de tavanda durur. Diğer piyasalarda oyunun genel üst sınırı (110 × piyasa çarpanı) değişmedi.
- **`sm`: güneşin öğle fiyatını düşürme etkisinin aylık çarpanı.** Ocak…Aralık: 0,8; 0,8; 1,5; 1,4; 1,7; 1,4; 1; 1,1; 1,2; 1,4; 1,4; 0,6. İlkbahar ve sonbaharda ılık hava (düşük talep) ve kar erimesi öğleyi derin düşürür. Yazın klima talebi, kışın zayıf güneş düşüşü sınırlar. Aylık güneş fiyat oranına göre ayarlandı.
- **`dem`: aylık talep düzeyi** (genel `DEMAND` yerine). Hedef, aylık ortalamanın yıl ortalamasına oranının 2024 ve 2025 ortalaması. Önceki eğride kış fazla pahalı (Ocak 1,16), Mayıs fazla ucuzdu (0,79). Gerçekte bu oranlar 1,01 ve 0,94.
- **`nz` 0,24:** saatlik rastgele oynama ±%12 (diğer piyasalarda ±%8). Gerçek günler ortalama profilden çok daha fazla açılıyor: Ocak'ta ortalama profilin farkı ~18, tek tek günlerinki ~37 $/MWh.
- **`mult` 0,92 → 0,94:** yıl ortalaması 66,4'te kalsın diye.
- **Hidroloji `mon` Mayıs 1,15 → 1,45:** Mayıs'ın talep düzeyi yükseldiği için yağışlı yıl oranı hedefe dönsün diye.
- **Ölçüm:** `scripts/calib_shape.cjs` (yeni). Aylık ortalama, günlük fark, saat grupları, limitteki saat payı ve güneş fiyat oranı, EPİAŞ 2025 ile yan yana. Koda dokunmadan ayar denemesi için 6.–10. bağımsız değişkenler.

## Ayar süreci
| Deneme | Ortalama | Günlük fark | Güneş fiyat oranı | Not |
|---|---|---|---|---|
| Önceki model | 65,7 | 44,7 | 0,85 | her ay 41–49 |
| Yalnızca limit (84 $, 2025) | 65,1 | 36,6 | 0,86 | kış ve yaz farkı çöktü |
| 2025 limiti + `sm`, `dem`, `nz` 0,36 | 66,0–66,3 | 46,2 | 0,82 | 2025'e oturuyor: aylık fark 12 ayın 10'unda ±6 $/MWh içinde (Ekim, Kasım −10) |
| Güncel limit (100 $), aynı ayar | 66,4 | 59–61 | 0,79–0,81 | limit akşamı kesmeyince fark büyüdü, güneş oranı düştü |
| **Seçilen:** 100 $, `sm` ×0,89, `nz` 0,24 | 66,6 | 51,7 | 0,837 | |

Değerler `calib_shape.cjs` (3 koşu) ve `calib_market.cjs` (4 koşu) ortalamaları; güneş fiyat oranı `calib_market`'ten.

## Sonuç (seçilen ayar, normal yıl)
| Ay | Ortalama ($/MWh) | Günlük fark: oyun / 2024 / 2025 | Öğle oranı: oyun / 2025 | Akşam oranı: oyun / 2025 | Güneş fiyat oranı: oyun / 2025 |
|---|---|---|---|---|---|
| Ocak | 67,1 | 43,0 / 53,0 / 36,6 | 0,89 / 0,91 | 1,21 / 1,11 | 0,91 / 0,93 |
| Şubat | 66,8 | 43,7 / 48,8 / 34,8 | 0,85 / 0,90 | 1,24 / 1,11 | 0,87 / 0,93 |
| Mart | 62,3 | 58,2 / 43,8 / 53,3 | 0,72 / 0,65 | 1,34 / 1,26 | 0,78 / 0,74 |
| Nisan | 59,1 | 54,8 / 62,0 / 57,0 | 0,72 / 0,68 | 1,36 / 1,32 | 0,81 / 0,79 |
| Mayıs | 62,6 | 64,9 / 48,8 / 65,2 | 0,66 / 0,62 | 1,41 / 1,34 | 0,78 / 0,75 |
| Haziran | 59,3 | 60,5 / 49,5 / 65,5 | 0,67 / 0,58 | 1,38 / 1,41 | 0,80 / 0,79 |
| Temmuz | 75,5 | 46,5 / 41,9 / 37,6 | 0,81 / 0,84 | 1,26 / 1,13 | 0,90 / 0,90 |
| Ağustos | 75,1 | 49,2 / 37,5 / 40,2 | 0,79 / 0,80 | 1,27 / 1,14 | 0,88 / 0,87 |
| Eylül | 70,3 | 56,5 / 44,4 / 53,3 | 0,74 / 0,70 | 1,33 / 1,22 | 0,82 / 0,83 |
| Ekim | 68,9 | 53,9 / 57,7 / 57,7 | 0,77 / 0,70 | 1,30 / 1,21 | 0,81 / 0,80 |
| Kasım | 69,1 | 49,0 / 41,7 / 51,0 | 0,82 / 0,79 | 1,23 / 1,17 | 0,84 / 0,83 |
| Aralık | 67,8 | 40,4 / 40,0 / 31,5 | 0,93 / 0,97 | 1,18 / 1,08 | 0,94 / 0,96 |

- **Yıl:**
  - Ortalama 66,6 $/MWh (66,3–67,3; hedef 66,4).
  - Güneş fiyat oranı 0,837 (0,80–0,86; hedef 0,834).
  - Rüzgâr fiyat oranı 0,974 (hedef 0,986).
  - Rüzgâr filosu kapasite faktörü 0,319.
  - Günlük fark 51,7 $/MWh: eski limitli 2024–2025 (47–49) ile yeni limitli, çok yağışlı 2026 (62) arasında.
  - Aylık düzeyin hedeften ortalama sapması 0,016.
- **Avrupa ve Kuzey Amerika değişmedi:** Avrupa 91,4 $/MWh, güneş fiyat oranı 0,55, rüzgâr fiyat oranı 0,91.
- **Akşam oranı** artık 2025'ten yüksek (yazın 1,26–1,27'ye karşı 1,13–1,14). Bu bilinçli bir sonuç: 2025'te akşamı 3.400 TL limiti kesiyordu, güncel limit (4.500 TL) kesmiyor.

## Hidroloji ve proje etkileri
`calib_hydro.cjs` (120 gün × 2 koşu, her su endeksi için; normal yıl Mayıs ağırlığı değişmeden önceki koşudan, w 1'de etkisi yok). Parantezde "Saatlik dağılım" bölümündeki önceki ölçüm (08.11.2026).

| | Kurak (w 0,78) | Normal (w 1) | Çok yağışlı (w 1,27) |
|---|---|---|---|
| Yıl ortalaması ($/MWh) | 68,5 (önce 70,2) | 66,4 (66,6) | 50,9 (51,1) |
| Konya GES ortalama satış fiyatı | 57,5 (60,5) | 55,1 (55,4) | 42,5 (40,8) |
| Çanakkale RES ortalama satış fiyatı | 67,9 (68,2) | 65,1 (65,2) | 48,7 (49,1) |

- **Yağışlı yıl hedefleri korundu.** Oranlar w 1,27 ÷ w 0,78; parantezde EPİAŞ 2026 ÷ 2025 ÷ 1,15.
  - Aylık oran: Nisan 0,35 (0,33), Mayıs 0,23 (0,21), Haziran 0,49 (0,49), Mart 0,67 (0,65).
  - 5 $/MWh altındaki saatler: Nisan %31 (%32), Mayıs %55 (%58), Haziran %17 (%26), Mart %2 (%14).
  - Nisan'ın akşam oranı 0,82 (0,83).
  - Nisan'ın günlük fark oranı 1,47 (1,42); önceki modelde 1,65'ti.
- **Yağışlı yılın günlük farkı 2026'ya yakın.** Oyunda w 1,27 iken Temmuz–Ekim 61–65 $/MWh; EPİAŞ 2026 Temmuz–Ekim 61–73.
- **YEKDEM kararı (59,2 $/MWh) değişmedi.**
  - Konya GES: YEKDEM normal ve kurak yılda biraz önde (kurak yılda artık 57,5'e karşı; önce başa baştı), çok yağışlı yılda açık ara önde.
  - Çanakkale RES: normal ve kurak yılda piyasa önde.
- **Vaka çalışması:** Türkiye proje satırları 8 yeni koşuyla yenilendi. Konya GES'in ortalama satış fiyatı 51,5–56,6 $/MWh (önce 54,6–58,0). IRR %10,9–12,7 (önce %11,8–13,6).

## Çok yıllı fiyat yolu
Ölçüm `scripts/calib_years.cjs` ile (yeni): 3 oyun yılı (360 gün) × 4 koşu. Normal hidrolojik yıl, olay kartları kapalı, oyuncunun santrali yok. Karşılaştırma için aynı kod, eski Türkiye parametreleriyle de koşturuldu: `CALIB_REG`, `mult` 0,92, tavan, `sm`, `dem` ve `nz` olmadan.

| Oyun yılı | Türkiye fiyatı ($/MWh) | 1. yıla göre | Güneş fiyat oranı | Güneşin piyasa satış fiyatı ($/MWh) | Rakiplerin Türkiye'deki kurulu gücü (GES) | Eski parametrelerle: fiyat / güneş oranı |
|---|---|---|---|---|---|---|
| 1 | 66,4 (65,4–67,8) | — | 0,83 | ~55 | 0,16–0,33 GW (0,15) | 65,5 / 0,84 |
| 2 | 58,1 (57,3–59,2) | −%12 | 0,68 | ~40 | 0,78–0,91 GW (0,51) | 57,9 / 0,71 |
| 3 | 49,8 (48,8–50,7) | −%25 | 0,53 | ~26 | 1,37–1,53 GW (0,82) | 50,4 / 0,57 |

- **Düşüş bu değişiklikten gelmiyor.** Eski parametrelerle de üçüncü yılda −%23 ve güneş oranı 0,57. 30.10.2026'daki ~66 → ~60 → ~52 tahmini ölçeklenmiş eski ölçümlerdi.
- **Güneşin satış fiyatı ortalamadan çok daha hızlı düşüyor:** üç yılda −%52, ortalama fiyatta −%25. Vaka çalışmasındaki %20 fiyat stresi GES için bu riski göstermez; sayfada belirtildi.
- **Gerçekle karşılaştırma:** Türkiye'nin güneş fiyat oranı 2024'ten 2025'e 0,91'den 0,83'e indi (yılda ~8 puan). Oyundaki hız (yılda ~15 puan) daha yüksek. Oyunun kendi davranışıdır, tahmin değildir.
- **Avrupa:** 90,8 → 84,6 → 81,4 $/MWh (−%10).

### Rakip GES'in etkisi gerçek ölçeğe çekildi (`REG.T.rg`, `s0`)
- **Sorun:** Yılda ~15 puanlık düşüş, gerçekte ~8 puan.
  - Gerçek veri: güneş filosu 2024'te 20,2, 2025'te 25,9 GW (TEİAŞ yıl sonu kurulu güç). Yılda ~%28 büyürken güneş fiyat oranı 0,911'den 0,834'e indi. 1 Kasım 2026'da 28,7 GW (TEİAŞ YTBS, geçici).
  - Oyundaki neden: güneşin fiyat etkisi, piyasanın doygunluğu ile rakiplerin GES gücünün MW başına 1/1.000'inin toplamı. İlk yılın doygunluğu (~0,84) Türkiye'nin bütün filosunu (~27 GW) temsil eder. Rakiplerin 1 GW'ı ise ~32 GW gerçek filoya denk geliyordu.
- **Değişiklik:**
  - Türkiye'de rakip GES MW başına 1/3.500 (`rg`). Diğer piyasalar 1/1.000 kaldı.
  - Rakip etkisi azalınca ilk yılın doygunluğu aynı kalsın diye `s0` 0,60 → 0,69 (tavanı 0,72 → 0,83).
- **Denenenler (2'şer koşu):** `rg` 2.500 ile güneş oranı 0,83 → 0,77 → 0,67; 3.500 ile 0,82 → 0,76 → 0,69.
- **Sonuç (`rg` 3.500; 3 yıl × 4 koşu):**

| Oyun yılı | Türkiye fiyatı ($/MWh) | Güneş fiyat oranı | Güneşin piyasa satış fiyatı | Rakip kurulu gücü (GES) |
|---|---|---|---|---|
| 1 | 66,1 (65,7–66,7) | 0,823 | 54,4 | 0,30 GW (0,20) |
| 2 | 59,7 (−%10) | 0,769 (−5 puan) | 45,9 | 0,94 GW (0,56) |
| 3 | 54,2 (−%18) | 0,695 (−7 puan) | 37,7 (−%31) | 1,44 GW (0,80) |

- **İlk yıl korundu** (`calib_market`, 4 koşu):
  - Türkiye ortalaması 66,3 $/MWh.
  - Güneş fiyat oranı 0,835 (0,826–0,842; hedef 0,834).
  - Rüzgâr fiyat oranı 0,981.
  - Avrupa ve Kuzey Amerika değişmedi.
  - Vaka çalışması: 8 yeni proje koşusu Türkiye aralıklarında kaldı (GES IRR %11,1–13,6, ortalama 66,3); satırlar korundu.
- **10.11.2026 güncellemesi (`rg` 2.300, `s0` 0,67):** Hafta sonu etkisi eklenince iş günündeki öğle düşüşü (`sm`) sığlaştı; rakip GES terimi de `sm` ile çarpıldığı için aynı rakip gücü güneş fiyatını daha az düşürür oldu. Yıllık düşüş yine ~5 puan olsun diye `rg` 2.300'e, ilk yıl doygunluğu korunsun diye `s0` 0,67'ye çekildi. 3 yıl × 4 koşu:

| Oyun yılı | Türkiye fiyatı ($/MWh) | Güneş fiyat oranı | Güneşin piyasa satış fiyatı | Rakip kurulu gücü (GES) |
|---|---|---|---|---|
| 1 | 66,8 | 0,834 | 55,7 | 0,27 GW (0,16) |
| 2 | 60,7 (−%9) | 0,779 (−5,5 puan) | 47,3 | 0,93 GW (0,59) |
| 3 | 54,4 (−%19) | 0,739 (−4 puan) | 40,3 (−%28) | 1,50 GW (0,85) |

- **Sınırlama:** Rakiplerin yatırım hızı ayrıca kalibre edilmedi; düşüş hızı kurulu güç ile fiyat etkisinin birlikte sonucudur. 2026'da filo büyümesi yavaşladı (Ocak–Ekim ~%11). Gerçek düşüş 2026'da 8 puandan az olabilir; 2026 tam yıl verisiyle (Ocak 2027) yeniden bakılmalı.

## Sınırlamalar
- **Şekil hedefi yine tek yıla (2025) dayanıyor.** Aylık fark yıldan yıla çok oynuyor; oyun 2024 ile 2025 arasında ya da yakınında kalıyor. Kış farkı 2024'ten düşük, 2025'ten yüksek.
- **Limit dolar cinsinden sabit.** Gerçekte TL'dir ve EPDK kararıyla değişir. 4.500 TL değeri EPİAŞ verisinden çıkarıldı; EPDK kararı doğrulanamadı.
- **Hafta sonu ve tatil etkisi yok.** Günden güne fark rastgele oynamayla (`nz`) temsil ediliyor; gerçekte hafta sonu öğle fiyatı daha derin düşer. (10.11.2026: eklendi; "Hafta sonu ve tatil" bölümü.)
- **Güneş üretimi yalnızca lisanslı santrallerden** (gerçek zamanlı veri). Lisanssız güneşin profili benzer varsayıldı.
- **Normal yıl hedefi karma:** güneş fiyat oranı 2025'ten (kurak yıl), aylık düzey 2024–2025 ortalamasından, limit 2026'dan.

# Hafta sonu ve tatil (10.11.2026)

## Neden
"Günlük fiyat şekli" bölümünde günden güne fiyat farkı saatlik rastgele oynamayla (±%12) temsil ediliyordu. Gerçekte bu farkın büyük kısmı gün tipinden gelir. Hafta sonu ve tatilde iş yerleri kapalıdır; gündüz talebi düşer, güneş üretimi aynı kalır, gündüz fiyatı derin iner.

## Veri
EPİAŞ PTF, saatlik, USD; 2024 ve 2025 (731 gün). Her gün, aynı ayın iş günlerinin saatlik ortalamasına bölündü.

| Gün tipi | Gün sayısı | Gün ortalaması | Öğle 10–15 | Gece 0–6 | Akşam 18–22 | Günlük en yüksek–en düşük farkı ($/MWh) |
|---|---|---|---|---|---|---|
| İş günü | 499 | 1 | 1 | 1 | 1 | 42,3 |
| Cumartesi | 100 | 0,93 | 0,77 | 1,03 | 1,00 | 50,2 |
| Pazar | 100 | 0,78 | 0,40 | 1,01 | 0,96 | 67,4 |
| Tek günlük resmî tatil | 14 | 0,85 | 0,61 | ~1,0 | ~1,0 | 61,5 |
| Ramazan ve Kurban Bayramı, arife dahil | 18 | 0,52 | 0,08 | ~0,74 | ~0,82 | 76,1 |

- **Saatlik desen:**
  - Pazar 08–15 saatleri iş gününün 0,25–0,51'i, 07'de 0,85, 16'da 0,66, 17'de 0,87. Gece ve akşam ~1.
  - Bayramda bütün gün düşük: gece 0,65–0,89, gündüz 0,03–0,09.
- **Tatil tarihleri veriyle doğrulandı.**
  - Bayram günleri ve arifeleri pazardan da düşük; örneğin 2024'te 12 Nisan'ın gün oranı 0,19, 2025'te 6 Haziran'ınki 0,30.
  - 28 Ekim yarım günü fiyatı etkilemiyor (oran ~1,0); tatil sayılmadı.
  - 23 Nisan 2024'te etki görülmedi (1,10). Tek günlük tatiller arasında oynaklık büyük: 0,66–1,10.
- **2026 bayramları da veride görünüyor:**
  - Ramazan arifesi 19 Mart'ta günlük ortalama 10,7, 20 Mart'ta 2,6 $/MWh; 23 Mart iş günü 42,0.
  - Kurban Bayramı 27–30 Mayıs (yağışlı Mayıs zaten sıfıra yakındı).

## Model (`src/daytype.js`, `config.js` `REG.T.dt`)
- **Gün tipi önceliği:** bayram, arife dahil (Ramazan 3, Kurban 4 gün) > resmî tatil > pazar > cumartesi > iş günü.
  - Sabit tatiller: 1 Ocak, 23 Nisan, 1 Mayıs, 19 Mayıs, 15 Temmuz, 30 Ağustos, 29 Ekim.
  - Bayramlar 2024–2026 için gerçek tarihlerle yazıldı.
  - Sonraki yıllar tablolu (aritmetik) hicri takvimden hesaplanıyor. Bu algoritma 2024–2026'nın 6 bayramının 3'ünü doğru, 3'ünü bir gün geç verdi; yani sonraki yıllarda tarih ±1 gün sapabilir.
- **Fiyattaki talep terimi** gün tipine göre saat saat çarpılır: `a × (1 − d × w[saat])`.
  - `w`: gündüz ağırlığı; 07'de 0,3, 08–15'te 0,8–0,9, 16'da 0,6, 17'de 0,3, gece 0. Pazar deseninden alındı; öğle doymasın diye biraz yayvan.
  - `d` (gündüz derinliği): cumartesi 0,22, pazar 0,48, resmî tatil 0,30, bayram 0,6.
  - `a` (bütün gün çarpanı): bayramda 0,8, diğerlerinde 1.
  - Oyunda gündüz fiyatı güneş etkisi kadar zaten düşük olduğu için derinlikler fiyat oranlarını tutturacak şekilde ayarlandı.
- **Telafiler:**
  - Saatlik rastgele oynama ±%12'den diğer piyasalar gibi ±%8'e indi (`nz` kaldırıldı).
  - Gerçek güneş fiyat oranı (0,834) hafta sonlarını zaten içerdiği için iş günündeki öğle düşüşü (`sm`) ~%35 sığlaştı.
  - Yıl ortalaması korunsun diye `mult` 0,94 → 0,962.
  - Rakip GES etkisi `rg` 3.500 → 2.300 ve `s0` 0,69 → 0,67 (aşağıda).
- **Oyuncu tarafı:**
  - Tarih etiketinde gün adı ve tatil adı.
  - Bayramın ilk oyun günü ve resmî tatilde haber bandında not.
  - Sözlükte "Hafta sonu ve tatil etkisi".
- **Takvim notu:** Bir oyun günü 3 takvim günüdür. Haftanın 7 günü eşit sıklıkla gelir. Tek günlük bir tatile her yıl isabet olasılığı ~1/3; bayramın 4–5 gününden genelde 1–2'si oyun gününe düşer. Oyun 20 Mart 2026'da, Ramazan Bayramı'nın ilk gününde başlar.
- **Ölçüm:** `scripts/calib_shape.cjs` gün tipi tablosunu da yazar (`CALIB_DT` ile koda dokunmadan deneme).

## Sonuç (`calib_shape`, 120 gün × 3 koşu; normal yıl)
| Gün tipi | Oyunda gün sayısı | Gün ortalaması | Öğle 10–15 | Gece | Akşam | Günlük fark ($/MWh) |
|---|---|---|---|---|---|---|
| İş günü | 237 | 1 | 1 | 1 | 1 | 41,3 (42,3) |
| Cumartesi | 51 | 0,91 (0,93) | 0,73 (0,77) | 1,00 (1,03) | 1,01 (1,00) | 55,3 (50,2) |
| Pazar | 51 | 0,80 (0,78) | 0,41 (0,40) | 0,99 (1,01) | 1,01 (0,96) | 74,5 (67,4) |
| Resmî tatil | 9 | 0,88 (0,85) | 0,60 (0,61) | 1,01 | 1,00 | 68,4 (61,5) |
| Bayram | 12 | 0,49 (0,52) | 0,03 (0,08) | 0,65 (0,74) | 0,78 (0,82) | 78,3 (76,1) |

Parantezde EPİAŞ 2024–2025. Takvim her koşuda aynı olduğu için gün sayıları 3 koşunun toplamıdır.

- **Yıl:**
  - Ortalama 66,8 $/MWh (`calib_market`, 4 koşu: 67,2; 66,5–67,8; hedef 66,4).
  - Güneş fiyat oranı 0,83 (`calib_market`: 0,831; hedef 0,834).
  - Rüzgâr fiyat oranı 0,979; rüzgâr filosu kapasite faktörü 0,318.
  - Günlük fark 50,0 $/MWh (önce 51,7).
  - Avrupa ve Kuzey Amerika'nın fiyat modeli değişmedi (bu ölçümde 92,7 ve 64,6 $/MWh).
- **Hafta sonu farkı gerçekten biraz geniş** (cumartesi 55 / 50, pazar 75 / 67). Saat grubu ortalamaları tutarken farkın geniş kalmasının nedeni ayrıca incelenmedi; gün içi en düşük ve en yüksek saatin dağılımı gerçekten farklı olabilir (yorum, ölçülmedi).
- **Bayram gecesi gerçekten düşük** (0,65 / 0,74). Bütün gün çarpanı (`a` 0,8) ile gündüz derinliği birlikte ayarlandı; öğle oranını (0,03 / 0,08) bozmadan geceyi yükseltmek için ayrı bir gece çarpanı gerekirdi. 18 gerçek günlük örnek için gereksiz görüldü.
- **Hidroloji hedefleri korundu** (`calib_hydro`, `rg` 3.500 ile; `rg` ilk yılı az etkiler): kurak yıl 69,4, çok yağışlı yıl 50,8 $/MWh. Yağışlı ÷ kurak aylık oran Nisan 0,34, Mayıs 0,25, Haziran 0,50, Mart 0,65 (hedef 0,33 / 0,21 / 0,49 / 0,65).
- **Vaka çalışması:** Türkiye için 7 yeni proje koşusu (`sim_year`) sayfadaki aralıklarda kaldı. Taban fiyat 65,8 (64,5–67,1), Konya GES IRR %11,7–12,5, Çanakkale RES IRR %19,8–23,9. Satırlar korundu; yalnızca günlük fark ve çok yıllı fiyat yolu güncellendi.
- **Çok yıllı fiyat yolu:** "Çok yıllı fiyat yolu" bölümündeki 10.11.2026 notu.

## Sınırlamalar
- **Tek günlük tatillerin etkisi çok oynak** (0,66–1,10). Oyun hepsine aynı derinliği verir.
- **Bayram tarihleri 2027'den sonra ±1 gün sapabilir** (tablolu hicri takvim). Gerçek tarihler Diyanet takviminden eklenebilir.
- **Köprü günleri ve yarım günler yok.** Bayramın hafta sonuna bitişik günleri, idari izinler ve 28 Ekim gibi yarım günler ayrıca modellenmedi; 28 Ekim veride de etkisiz.
- **Gün tipi yalnızca Türkiye'de.** Avrupa ve Kuzey Amerika'da hafta sonu etkisi rastgele oynamanın içinde kaldı.

# Avrupa ikiye ayrıldı: İberya ve Avrupa (11.11.2026)

## Neden
- **Avrupa tek piyasaydı.** Hedef, Almanya ile İspanya'nın ortalamasıydı (~88 $/MWh).
- **Güneş etkisi yanlış yerin havasından geliyordu.** Fiyattaki güneş etkisi Orta Almanya'daki temsilî noktanın (50°K 10°D) bulutluluğundan hesaplanıyordu. İspanya'daki santral ise kendi sahasının havasıyla üretiyordu. İspanya güneşliyken Almanya bulutluysa santral yüksek fiyattan satıyordu.
- **Sonuç gerçeğin çok üstündeydi.** Vaka çalışmasındaki İspanya GES'i 65–71 $/MWh'den satıyordu. Fiyat oranı, kısılan üretim dahil, %63–69'du.
  - Gerçekte İspanya filosunun 2025 güneş oranı %55,2, ortalama fiyat 65,5 €/MWh (~74 $). Yakalanan fiyat ~41 $/MWh (hesap: 74 × 0,552).

## Veri
ENTSO-E 2025 tam yıl; "Avrupa rüzgârının fiyat etkisi" bölümündeki aynı ölçüm. Kur 1,1306 $/€ (FRED AEXUSEU, 2025).

| Gösterge | Almanya (DE_LU) | İspanya (ES) |
|---|---|---|
| Baz yük fiyatı | 89,3 €/MWh (~101 $) | 65,5 €/MWh (~74 $) |
| Rüzgâr yakalama oranı | %86,6 | %96,5 |
| Güneş yakalama oranı | %51,6 | %55,2 |

İspanya ve Portekiz ortak gün öncesi piyasasında (MIBEL) çoğu saat aynı fiyatı paylaşır. Portekiz İspanya'yla aynı piyasaya alındı; Portekiz'in ayrı verisi kullanılmadı.

## Model
- **Yeni piyasa `I` (İberya):** İspanya ve Portekiz, kıyılarındaki deniz sahaları dahil. Ülke eşlemesi `src/data/countries.json` içinde.
- **Avrupa (`E`):** diğer ülkeler. Hedef artık Almanya; temsilî nokta ve rüzgâr filosu zaten Almanya'daydı.
- **Rüzgâr filosu ikiye bölündü** (`src/windfleet.js`, `scripts/gen_windfleet.cjs`):
  - Avrupa: Almanya kara ve deniz üstü, 13 nokta.
  - İberya: İspanya'nın 11 bölgesi.
  - `FLEET_CF` Avrupa 0,23, İberya 0,22. Değerler bu çalışmanın 20 koşusunun ortalamasıdır; koşudan koşuya 0,15–0,29.
- **İberya'nın temsilî noktası** 40°K 4°B (İspanya iç kesimi). Güneş etkisi bu noktanın bulutluluğundan hesaplanır.
- **Rüzgâr kaynağı değişmedi.** Portekiz İspanya'nın aylık desenini (`WIND_MONTH.ESP`) kullanır. Saha hız katsayıları aynı kaldı: Portekiz 0,83, İspanya 0,925, denizler 0,725.
- **Kurallar ve destekler:**
  - Avrupa'nın kredi faizi, kurumlar vergisi, izin olasılığı ve süresi İberya'da da geçerli (`config.js` `EU`).
  - Avrupa Hidrojen Bankası desteği İberya'da da var.
  - Britanya kapasite piyasası ve offshore fark sözleşmesi (AR7) yalnızca Avrupa'da kaldı. Önceden İspanya'daki batarya ve offshore santral de bunları alıyordu; bu bir hataydı.
  - GES yatırım katsayısı İberya'da da IRENA Avrupa ortalaması (779 $/kW).
- **Eski kayıtlar:** İspanya ve Portekiz'deki sahalar, santraller ve rakip sahaları bir kez İberya'ya taşınır (`state.js`, `mktV`).

| Parametre | Önce (tek Avrupa) | Avrupa | İberya |
|---|---|---|---|
| `mult` | 1,62 | 1,69 | 1,19 |
| `sk` | 3,7 | 4,0 | 2,6 |
| `wk` | 1,7 | 1,45 | 0,97 |
| `FLEET_CF` | 0,211 | 0,23 | 0,22 |

## Ayar süreci
- **Turlar:** Her turda üç ayar 2'şer koşuyla denendi. Ölçüm `calib_market.cjs` ile; yeni `CALIB_REGS` ve `CALIB_FCF` ortam değişkenleri koda dokunmadan deneme sağlar.
- **İkinci turun tahmini:** İlk turun ölçümlerine basit bir doğrusal model oturtuldu. Varsayım: fiyat, güneş ve rüzgâr oranı `sk·mult` ve `wk·mult`'a doğrusal bağlıdır.
- **İberya'da güneş oranı doğrusal değil.** Öğle fiyatı sıfıra indikçe güneş etkisini artırmak oranı daha az düşürüyor.
- **İberya'nın rüzgâr oranı güneşe de bağlı.** Güneş öğle fiyatını düşürdükçe rüzgâr görece pahalı saatlerde üretiyor.
- **Avrupa'nın güneş oranı koşudan koşuya ±0,04 oynuyor.** Neden tek temsilî noktanın bulutluluğu. Son ayar bu yüzden 8 koşunun ortalamasına göre seçildi.

## Sonuç (`calib_market`, 120 gün × 4 koşu, son ayar)
| | Gerçek 2025 | Oyun, önce (tek Avrupa) | Oyun, sonra |
|---|---|---|---|
| Avrupa (Almanya): ortalama fiyat | ~101 $/MWh | 89,5 (86,1–95,7) | 99,6 (97,9–101,9) |
| Avrupa: rüzgâr oranı | 0,866 | 0,88 | 0,88 (0,85–0,91) |
| Avrupa: güneş oranı | 0,516 | 0,55 | 0,52 (0,49–0,55) |
| İberya (İspanya): ortalama fiyat | ~74 $/MWh | — | 73,8 (72,7–75,0) |
| İberya: rüzgâr oranı | 0,965 | — | 0,97 (0,93–0,99) |
| İberya: güneş oranı | 0,552 | — | 0,53 (0,48–0,56) |

- **"Önce" sütunu tek Avrupa piyasasının ölçümüdür.** Hedefi iki ülkenin ortalamasıydı (~88 $/MWh, güneş ~0,53, rüzgâr ~0,90).
- **Türkiye ve Kuzey Amerika değişmedi:** Türkiye 66,8 (66,0–67,8) $/MWh, Kuzey Amerika ~64 $/MWh.
- **İspanya'daki GES** (`sim_year`, 8 koşu): ortalama satış fiyatı 41,2–43,5 $/MWh (önce 64,9–71,0).
  - Kendi fiyat oranı 0,56–0,59.
  - Kısılan üretim dahil oran 0,51–0,56 (önce 0,63–0,69). Gerçek İspanya filosu: 0,552.
  - Kısıntı %3–9 (önce %8–13).

## Proje ekonomisi (vaka çalışması, `sim_year` 8 koşu, %10 WACC)
`sim_year` artık GES ve RES'i ayrı piyasalarda ölçebiliyor: her biri kendi piyasasının ortalamasına ve finansman varsayımına göre.

| Santral | Kapasite faktörü | Ort. satış fiyatı ($/MWh) | LCOE ($/MWh) | NPV (M$) | IRR |
|---|---|---|---|---|---|
| GES, İberya (İspanya iç kesim) | %19,2–21,3 | 41,2–43,5 (önce 64,9–71,0) | 54,3–60,3 | −1,40 ile −0,93 (önce +0,21 ile +1,00) | %4,8–6,7 (önce %10,7–13,3) |
| RES, Avrupa (Kuzey Almanya) | %18,8–29,6 | 83,3–93,0 (önce 74,7–80,4) | 59,6–94,0 | −0,80 ile +2,94 (önce −1,04 ile +1,47) | %8,0–16,9 (önce %7,3–13,5) |

- **İberya GES'i desteksiz spot satışla %10 WACC'ın altında kalıyor.**
  - IRR %4,8–6,7. WACC %8'de bile NPV negatif (−0,98 ile −0,42 M$).
  - Borç oranı spotta %39–47, özsermaye IRR'ı %3,4–5,5.
  - Bu, İspanya'nın 2025 güneş yakalama fiyatıyla (~41 $/MWh) tutarlı. Oyunun proje ekonomisi destek ve ikili anlaşmayı (PPA'nın %10 indirimli sabit fiyatı dışında) içermez.
- **Kuzey Almanya RES'i daha iyi.** Avrupa'nın fiyatı yükseldi (önce ~91, şimdi ~100 $/MWh); IRR %8,0–16,9.
- **Bu koşularda piyasa ortalamaları:** İberya 74,2 (73,4–75,7), Avrupa 99,8 (96,3–102,0) $/MWh.

## Sınırlamalar
- **Avrupa'nın geri kalanı Almanya'ya göre ayarlı.** Fransa, İtalya, İskandinavya, Britanya ve Doğu Avrupa'nın fiyat düzeyi ve oranları farklı. Bu ülkelerin verisi bu çalışmada kullanılmadı.
- **Portekiz İspanya'yla aynı.** Gerçekte MIBEL'de iki ülkenin fiyatı bazı saatlerde ayrışır; oyunda ayrışmaz.
- **İberya GES'inin yatırımı IRENA Avrupa ortalaması** (779 $/kW). İspanya'nın ülke maliyeti farklı olabilir; doğrulanmadı.
- **Kurumlar vergisi ortalama alındı.** Vergi Avrupa ve İberya'da aynı (%27,5; Almanya ve İspanya ortalaması). Gerçekte İspanya %25. (11.11.2026: ayrıldı; "İberya ve Avrupa: kurumlar vergisi" bölümü.)
- **Tek temsilî nokta ve tek yıl.** Güneş etkisi tek temsilî noktanın bulutluluğundan hesaplanıyor; hedefler tek yıla (2025) dayanıyor.

# Negatif fiyat (11.11.2026)

## Neden
- **Oyunda fiyat tabanı 0'dı.** Gerçekte Avrupa'nın gün öncesi piyasalarında fiyat sıfırın altına iner: üreten para öder, tüketen para alır.
- **Etkisi en çok güneşte.** Negatif saatler güneşin bol olduğu bahar öğlelerinde yoğunlaşır. Desteksiz (yalnızca spot satan) bir santral bu saatlerde üretmez; batarya ve elektrolizör şebekeden elektrik alırken para kazanır.
- **Türkiye'de taban 0 kalır.** PTF sıfırın altına inemez.

## Veri
ENTSO-E gün öncesi fiyatlar, 2025, MCP `day_ahead_prices` ile aylık sorgular. Ekim–Aralık 15 dakikalık; dönem sayısı 4'e bölünerek saate çevrildi.

| | Almanya (DE_LU) | İspanya (ES) |
|---|---|---|
| Negatif saat | ~575 (%6,6) | ~552 (%6,3) |
| En yoğun aylar | Haziran %19,6, Mayıs %17,3, Nisan %10,4 | Mayıs %32,1, Nisan %16,3, Haziran %7,6 |
| Negatif saat olmayan aylar | Şubat, Kasım, Aralık | Ocak, Şubat, Aralık |
| En düşük fiyat | −250,32 €/MWh (11 Mayıs, 13:00) | −15 €/MWh (Mayıs) |
| Örnek günlerde negatif saatler | 103 saat: ortanca −5,05 €, ortalama −23,3 €; %32'si −1 € ve üstü | 40 saat: ortanca −3 €, ortalama −4,6 € |

- **Örnekler derine yanlı.** Örnek günler negatifin yoğun olduğu, gün ortalaması düşük günlerden seçildi (Almanya 6, İspanya 3 pencere; saatlik 2–3 gün). Ortalama derinlik yıl geneli için büyük olasılıkla fazladır; ortanca ve en düşük değer daha güvenilir.
- **Kur:** 1,1306 $/€ (FRED AEXUSEU, 2025).
- **Aylık dağılım** (negatif saat payı, Ocak…Aralık):
  - Almanya: 1,9 / 0 / 4,0 / 10,4 / 17,3 / 19,6 / 1,6 / 8,6 / 8,3 / 6,7 / 0 / 0.
  - İspanya: 0 / 0 / 6,5 / 16,3 / 32,1 / 7,6 / 1,7 / 4,2 / 4,4 / 1,6 / 0,6 / 0.
- **Hesap:** `scripts/neg_stats.cjs`. Aylık sayılar MCP çıktısının `negative_hours` alanından, örnek saatler saatlik çıktıdan aktarıldı.

## Model (`config.js` `priceFloor`, `REG.E.neg`, `REG.I.neg`)
- **Ham fiyat** (`sim.js` `D[k].raw`): sıfırda kesilmeden önceki model fiyatı.
- **Eşleme:**
  - Ham fiyat `z`'nin üstündeyse aynen kalır.
  - `t` ile `z` arasındaysa 0–`z` aralığına gerilir; eşleme sürekli ve tekdüzedir.
  - `t`'nin altındaysa negatif olur: −a × (t − ham)^p. Çoğu saat sığ, az sayıda saat derin (ağır kuyruk). Fiyat `f` tabanında durur.
- **Neden eşik var:** Oyunun ham fiyatı gerçeğe göre daha az saatte sıfırın altına iniyordu: Avrupa %3,4, İberya %1,1. Gerçekte destekli ve esnek olmayan üretim, düşük fiyatlı saatlerde de sıfırın altında teklif verir. Eşik bunu temsil eder.
- **Parametreler:**

| | `t` ($) | `z` ($) | `a` | `p` | `f` ($) |
|---|---|---|---|---|---|
| Avrupa | 31 | 43 | 0,0026 | 2,4 | −283 (−250 €) |
| İberya | 31 | 43 | 0,14 | 1,64 | −17 (−15 €) |

- **Telafi:** Negatif saatler güneşin değerini düşürdüğü için güneş etkisi azaltıldı: `sk` Avrupa 4,0 → 3,45, İberya 2,6 → 2,15. `mult` Avrupa 1,69 → 1,70.
- **Oyuncu tarafı:**
  - Negatif fiyatlı saatte GES, RES ve JES üretmez. GES sıfır fiyatta da üretmez (önceden de öyleydi).
  - HES negatif saatte suyunu saklar.
  - Batarya, pompaj HES ve elektrolizör şebekeden alırken para kazanır. Elektrolizörün maliyeti önceden sıfırda kesiliyordu.
  - GÖP taahhüdü negatif saatte sıfır.
  - Dengesizlik negatif fiyatta da sapanın aleyhine: fazla `fiyat − K·|fiyat|`, eksik `fiyat + K·|fiyat|`.
  - Olay kartının fiyat çarpanı negatif fiyata uygulanmaz.
  - Fiyat grafiği sıfırın altını gösterir.
  - Piyasada ilk negatif fiyatta bir kez haber çıkar.
  - Sözlükte "Negatif fiyat" terimi var.
- **Fark sözleşmesi:** Britanya'nın offshore CfD'si AR4'ten bu yana negatif fiyatlı saatte fark ödemesi yapmaz (ikincil kaynaklar: Modo Energy, LCP, Current News; birincil metin bu oturumdan doğrulanamadı). Oyunda santral negatif saatte üretmediği için fark ödemesi de doğmaz; kural kendiliğinden uyar.

## Ayar süreci
- **Turlar:** Dört tur, her turda üç ayar 2'şer koşuyla (`calib_market` ve yeni `calib_neg`; `CALIB_REGS` ile koda dokunmadan).
- **Güneş etkisi ile negatif saat payı birlikte değişiyor.** Güneş etkisi azalınca negatif saat payı düşüyor, artınca güneş oranı hedefin altına iniyor. Eşik `t` iki hedefi birlikte tutturmayı sağladı.
- **`z`'nin genişliği güneş oranını etkiliyor.** Geniş `z` (2t) düşük pozitif fiyatları da aşağı çekip güneş oranını 0,03–0,05 düşürüyordu; dar `z` (t + 12) seçildi.
- **Derinlik (`a`) de güneş oranını düşürüyor.** Avrupa'da `a` 0,0035 iken güneş oranı 0,46'ya iniyordu. Öncelik güneş oranında olduğu için derinlik örnek ortancasının biraz altında bırakıldı.

## Sonuç
`calib_market` 120 gün × 4 koşu (oyuncunun 5 MW'lık santralleriyle) ve `calib_neg` 120 gün × 3 koşu. Ortalama, iki ölçümün 7 koşusunun ortalamasıdır.

| | Gerçek 2025 | Avrupa (oyun) | | İberya (oyun) | |
|---|---|---|---|---|---|
| | | `calib_market` | `calib_neg` | `calib_market` | `calib_neg` |
| Ortalama fiyat | DE ~101, ES ~74 $/MWh | 102,1 (95,6–106,6) | 105,5 | 74,7 (73,6–75,7) | 76,2 |
| Güneş oranı | DE 0,516, ES 0,552 | 0,48 (0,41–0,52) | 0,556 | 0,535 (0,50–0,56) | 0,572 |
| Rüzgâr oranı | DE 0,866, ES 0,965 | 0,89 | – | 0,965 | – |
| Negatif saat | DE %6,6, ES %6,3 | %6,5 (5,3–8,7) | %4,75 | %6,6 (5,9–7,4) | %5,35 |
| Negatif fiyat ortancası | DE −5,7 $, ES −3,4 $ (örnek) | ~−5,3 $ | −4,1 $ | ~−4,4 $ | −3,9 $ |
| En düşük | DE −283 $, ES −17 $ | −81 ile −170 $ | −121 $ | −17 $ | −17 $ |

- **7 koşunun ortalaması:**
  - Avrupa: fiyat 103,6 $/MWh, güneş oranı 0,514, negatif saat %5,8.
  - İberya: fiyat 75,3 $/MWh, güneş oranı 0,551, negatif saat %6,1.
- **Aylık negatif saat payı** (`calib_neg`, Ocak…Aralık):
  - Avrupa: 0 / 0 / 2,4 / 4,7 / 15,9 / 14,6 / 9,6 / 5,1 / 1,4 / 1,9 / 0 / 0.
  - İberya: 0 / 0 / 1,7 / 11,7 / 20,7 / 17,1 / 5,6 / 1,8 / 3,2 / 0,6 / 0 / 0.
  - Gerçekteki gibi bahar–yaz başı zirvesi var. Oyunda İspanya'nın Mayıs zirvesi daha basık, Haziran'ı daha yüksek; Almanya'nın Temmuz'u yüksek, Eylül–Ekim'i düşük.
- **Türkiye ve Kuzey Amerika değişmedi:** Türkiye 66,0–67,1 $/MWh, Kuzey Amerika ~64.

## Proje ekonomisi (vaka çalışması, `sim_year` 8 koşu, %10 WACC)
| Santral | Kapasite faktörü | Kısıntı | Ort. satış fiyatı ($/MWh) | LCOE ($/MWh) | NPV (M$) | IRR |
|---|---|---|---|---|---|---|
| GES, İberya (İspanya iç kesim) | %16,3–17,7 (önce %19,2–21,3) | %22–29 (önce %3–9) | 54,6–55,7 (önce 41,2–43,5) | 65,4–70,9 | −1,02 ile −0,65 | %6,3–7,7 (önce %4,8–6,7) |
| RES, Avrupa (Kuzey Almanya) | %20,0–28,0 | – | 86,7–94,0 | 63,0–88,4 | +0,45 ile +2,63 | %11,1–16,2 (önce %8,0–16,9) |

- **İspanya GES'i negatif ve sıfır fiyatlı saatlerde üretmiyor.**
  - Bu saatler bahar öğleleri ve üretiminin %22–29'u. Kalan üretim daha yüksek fiyattan satılıyor.
  - Kısılan üretim dahil fiyat oranı 0,52–0,56 (gerçek İspanya filosu 0,552).
  - Kontrol: gerçek yakalama fiyatı ~41 $; sıfır ve altı saatlerdeki ~%20 üretim gelir getirmediği için kalan üretim ~51 $'dan satar. Oyun 55 $ veriyor.
- **Sonuç yine %10 WACC'ın altında.** NPV WACC %8'de de negatif (−0,53 ile −0,10 M$).
- **Bu koşularda piyasa ortalamaları:** İberya 75,0 (73,4–76,6), Avrupa 102,4 (97,4–105,6) $/MWh.

## Sınırlamalar
- **Derinlik hedefi yanlı örneklere dayanıyor.** Negatif fiyatın ortalama derinliği yıl geneli için ölçülmedi; örnekler negatifin yoğun olduğu günlerden.
- **Gerçekte sıfır civarında yoğun bir kütle var.** İspanya'da çok saat 0,00–0,01 €'da kapanır. Oyunda bu kütle eşleme ile sığ negatiflere dağılır; sıfır fiyatlı saat kalmaz.
- **Destekli santral de negatif fiyatta üretmez.** Gerçekte eski destekli santraller negatif fiyatta da üretmeye devam edebilir. Oyundaki tek kara desteği Almanya'nın piyasa primi (aşağıda, 11.11.2026); 2025'ten beri yeni santrallere negatif fiyatlı saatte prim ödenmediği için o saatte üretmemeleri gerçekle uyumlu.
- **Dengeleme piyasasının negatif fiyatı ayrı modellenmedi.** Dengesizlik gün öncesi fiyatına bağlı kalır.
- **Kuzey Amerika'da taban 0 kaldı.** ABD piyasalarının verisi bu çalışmada kullanılmadı.

# İberya ve Avrupa: kurumlar vergisi (11.11.2026)

## Neden
- **Vergi Avrupa tek piyasayken seçilmişti.** %27,5, Almanya'nın %29,9'u ile İspanya'nın %25'inin ortalamasıydı.
- **Artık her piyasa bir ülkeye göre ayarlı.** Avrupa'nın fiyatı Almanya'ya, İberya'nınki İspanya'ya göre ayarlı. Vergi de aynı ülkelerden alındı.

## Değişiklik (`finance.js` `PF_DEFAULT`, `projectFinance`; panel "Finansman varsayımları")
- **Oranlar** (Tax Foundation, OECD verisi, 2025; repoda önceden kullanılan aynı kaynak):
  - Avrupa: %29,9 (Almanya).
  - İberya: %25 (İspanya). Portekiz'in oranı farklıdır; ayrı modellenmedi.
- **Kredi faizi** Avrupa ve İberya'da aynı kaldı (%6,9; marj varsayımı).
- **Eski kayıt:** Oyuncu eski varsayılanı (%27,5) saklamışsa Avrupa yeni varsayılana geçer, İberya %25'ten başlar.
- **GES yatırımı değişmedi** (IRENA Avrupa ortalaması, 779 $/kW). İspanya'nın ülke değeri IRENA'nın *Renewable Power Generation Costs in 2024* raporunda yer alıyor olabilir. Bu oturumda irena.org'a erişilemedi; ikincil kaynaklarda İspanya'ya özgü 2024 değeri bulunamadı.

## Etki (aynı koşular, eski ve yeni vergi; `sim_year` 2 koşu)
| | Vergi | Vergi sonrası proje IRR'ı | Özsermaye IRR'ı | Borç oranı |
|---|---|---|---|---|
| GES, İberya (İspanya iç kesim) | %27,5 → %25 | +0,1 puan | +0,1 puan | değişmedi |
| RES, Avrupa (Kuzey Almanya) | %27,5 → %29,9 | −0,2 puan | −0,3 ile −0,8 puan | −1 ile −2 puan |

Vergi öncesi göstergeler (LCOE, NPV, IRR) değişmez.

## Vaka çalışması (`sim_year` 8 yeni koşu)
| Santral | KF | Kısıntı | Satış fiyatı ($/MWh) | IRR (vergisiz) | Spot: borç / özsermaye IRR'ı | PPA: borç / özsermaye IRR'ı |
|---|---|---|---|---|---|---|
| GES, İberya | %14,8–17,8 | %23–35 | 54,8–56,7 | %5,4–7,8 | %42–52 / %4,1–7,2 | %43–54 / %3,3–6,0 |
| RES, Avrupa | %20,2–26,0 | – | 86,8–94,9 | %11,5–15,8 | %50–66 / %11,9–21,5 | %65–75 / %11,2–20,9 |

Aralıklardaki diğer farklar (örneğin İspanya GES'inin kısıntısı %22–29'dan %23–35'e) koşudan koşuya hava değişimindendir. Piyasa ortalamaları: İberya 74,5 (73,8–75,4), Avrupa 102,5 (97,3–104,7) $/MWh.

# Almanya piyasa primi (EEG) (11.11.2026)

## Neden
- **Avrupa'da kara GES ve RES desteksizdi.** Oyunda Avrupa'nın tek üretim desteği Britanya'nın offshore fark sözleşmesiydi.
- **Negatif fiyat eklenince destek önem kazandı.** Destek, santralin negatif ve düşük fiyatlı saatlerdeki davranışını ve getirisini belirler.

## Gerçek
- **Mekanizma:** Kayan, tek yönlü piyasa primi (EEG, Marktprämie).
  - Santral elektriğini piyasada kendisi satar.
  - Ay sonunda üretimine prim = max(0, ödül değeri − teknolojinin o ayki piyasa değeri) ödenir.
  - Piyasa değeri (Monatsmarktwert): ayın saatlik fiyatlarının ülkedeki güneş ya da rüzgâr üretimiyle ağırlıklı ortalaması.
  - Piyasa değeri ödülün üstündeyse prim yok, geri ödeme de yok (iki yönlü fark sözleşmesinden farkı bu). Süre 20 yıl.
- **Ödül değeri** (BNetzA basın bültenleri, hacim ağırlıklı ortalama):

| İhale | Tur | Ortalama | Önceki turlar | Kaynak |
|---|---|---|---|---|
| Güneş, birinci segment (arazi GES) | 1 Temmuz 2026 | 4,79 ct/kWh (teklifler 4,38–4,97; tavan 5,90) | Mart 2026 4,94 | BNetzA, 18.08.2026 |
| Kara rüzgârı | 1 Ağustos 2026 | 4,79 ct/kWh (tavan 7,25) | Mayıs 2026 5,06; Şubat 2026 5,54; Kasım 2025 6,06 | BNetzA, 17.09.2026; geçmiş turlar BDEW |

- **İkisinin eşit çıkması rastlantı.** Rüzgârda ödül hızla düşüyor (Mayıs 2025'te 6,83).
- **Negatif fiyat:** 2025'ten beri işletmeye giren santrallere negatif fiyatlı saatlerin üretimi için prim ödenmez (Solarspitzengesetz; ikincil kaynaklar). Bu saatler destek süresinin sonuna eklenir.

## Model (`src/support.js` `EEG`, `sim.js` `eegPay`, `finance.js` `EEG_Y`)
- **Kim alır:** Sahası Almanya'da (`a3` DEU) olan GES ve kara RES. İlk blokla 20 ekonomik yıl (116 oyun günü). Eski kayıtlarda bugünden başlar.
- **Ödül değeri:** 47,9 €/MWh × 1,1199 = 53,6 $/MWh, iki teknolojide de (FRED kuru, 23.10.2026, diğer desteklerle aynı).
- **Piyasa değeri:** Avrupa piyasasının saatlik fiyatları, her gün sonunda ayın birikimine eklenir.
  - Güneş: piyasanın güneş profiliyle (`sunP`) ağırlıklı.
  - Rüzgâr: rüzgâr filosunun saatlik kapasite oranıyla (`fleet`) ağırlıklı.
  - Takvim ayı oyun takviminden; bir ay ~10 oyun günü.
- **Uygun üretim:** Santralin saat saat ürettiği MWh.
  - Fiyat sıfırın altındaysa sayılmaz. Oyunda santraller o saatte zaten üretmez.
  - Başlangıç desteği (alım garantisi) sürerken sayılmaz: iki destek üst üste binmez.
- **Ödeme:** Ay değişince uygun üretim × max(0, ödül − piyasa değeri).
  - Nakde ve proje gelirine (`ac.mp`) eklenir.
  - Günlük raporda "Piyasa primi" satırı; günlükte ayın piyasa değeri ve tutar.
- **Proje ekonomisi:** Satış fiyatı primsiz piyasa fiyatıdır; ilk 20 yıl buna prim eklenir.
  - Prim: kapanan aylarda uygun MWh başına ödenen ortalama. Henüz ay kapanmadıysa ödülle satış fiyatı farkı.
  - Fiyat stresinde (−%20) prim en az, ödül ile %20 düşmüş ortalama piyasa değeri arasındaki fark olur. Aylık primin dışbükeyliği nedeniyle bu bir alt sınırdır.
  - PPA seçilirse PPA yıllarında prim yok. Gerekçe: yeşil PPA menşe garantisi ister; destekli elektriğe menşe garantisi verilmez (çifte pazarlama yasağı). PPA bitince prim, sürenin kalanında döner.

## Ölçüm (`EEG=1 node scripts/sim_year.cjs 120 52.3,13.9 53.8,9.5 <adres>`, 2 koşu, başlangıç desteği kapalı)
| Santral | Prim ($/MWh üretim) | Not |
|---|---|---|
| GES, Brandenburg | 7,9–15,0 (12.11.2026 bulut düzeltmesinden sonra 6,0–9,1) | Yaz aylarında güneşin piyasa değeri ödülün altında |
| RES, Kuzey Almanya | 0–0,2 (sonra 0) | Rüzgârın piyasa değeri (~90 $/MWh) neredeyse her ay ödülün üstünde |

- **Vaka çalışması değişmedi.** `sim_year` varsayılan olarak primi kapatır, çünkü vaka çalışması piyasa satışıdır (merchant). Kuzey Almanya RES'inin primi zaten ~0.
- **Yan bulgu: Almanya'daki GES'in üretimi düşüktü.** Brandenburg'daki GES'in kapasite faktörü kısıntı sonrası %5–6, kısıntı %34–39 çıkıyordu. Neden ve düzeltme: aşağıda "Güneş üretimi: bulut düzeltmesi (12.11.2026)".

## Sınırlamalar
- **Yalnızca Almanya.** Fransa, İtalya ve diğer Avrupa ülkelerinin destekleri (ör. Fransa'nın complément de rémunération mekanizması) için veri toplanmadı.
- **Ödül ortalama değer.** Gerçekte her santral kendi teklifini alır (teklif usulü). Oyunda ihaleyi kazanmış sayılır; ihale riski ve hacim sınırı yok.
- **Rüzgârda saha düzeltmesi yok.** Gerçekte ödül değeri sahanın rüzgâr kalitesine göre düzeltilir (Referenzertragsmodell): zayıf sahada yükselir, güçlü sahada düşer.
- **Negatif saatlerin süreye eklenmesi modellenmedi.**
- **Piyasa değeri oyunun Avrupa piyasasından.** Gerçek Alman güneş ve rüzgâr filosunun saatlik üretimi değil, oyunun güneş profili ve rüzgâr filosu kullanılır.
- **Prim çeyrek saatlik değil saatlik.** Oyun saatlik çalışır.
- **Proje ekonomisinde prim süresi** santralin yaşından bağımsız olarak ilk 20 yıl sayılır (fark sözleşmesiyle aynı basitleştirme).

# Güneş üretimi: bulut düzeltmesi (12.11.2026)

## Neden
- **Almanya'daki GES'in üretimi düşüktü.** Kısıntı öncesi kapasite faktörü Brandenburg'da %7,3–8,3, Bavyera'da %10,1–10,6. Gerçek Alman güneş filosu %8,9 (aşağıda); filonun çoğu çatı üstü olduğu için arazi GES'i daha yüksek çalışır.
- **Kök neden: bulut iki kez sayılıyordu.**
  - Üretim formülü sahanın ışınım potansiyelini (yıllık GHI haritası) zaten içerir.
  - Hava modeli buna bir "göreli açıklık" çarpanı ekler: o anki açık gökyüzü oranının sahanın iklim değerine oranı.
  - Geçen sistemler bulutu iklim değerinin etrafında simetrik değiştirmez. Alçak basınçlar 34–61° enlemde ve oyunun odak bölgesinde (Avrupa) daha sık doğar; yüksek basınçlar 20–42° enlemde.
  - Sonuç: orta enlemlerde çarpanın uzun dönem ortalaması ~0,65–0,75, çöl kuşağında ~1,1. Yıllık ışınım haritadan geldiği hâlde Almanya'nın üretimi ~%30 düşüyordu.
- **Ölçüm** (`scripts/calib_pv.cjs`, 120 gün × 2 koşu): üretim ağırlıklı ortalama çarpan Brandenburg 0,64–0,71, Bavyera 0,76–0,79, İspanya 1,01–1,06, Konya 1,05–1,08. Tavana (1,25) takılma Almanya'da saatlerin %0–7'si: neden tavan değil, hava modelinin ortalaması.

## Gerçek veri
| | Üretim 2025 | Kurulu güç | Filo kapasite faktörü | Kaynak |
|---|---|---|---|---|
| Almanya (DE_LU) | 74.212 GWh | 86,95 GW (Ocak 2025) → 104,03 GW (Ocak 2026); ortalama 95,5 | %8,9 | ENTSO-E (MCP: güneş üretimi A75, kurulu güç) |
| İspanya | 52.387 GWh (kapsam %99,6) | 29,0 → 41,4 GW; ortalama 35,2 | %17,0 (başlangıç gücüyle %20,6) | ENTSO-E |
| Türkiye | 43.520 GWh | 20,2 → 25,9 GW; ortalama 23,1 | %21,5 | TEİAŞ yıllık istatistikleri (2025) |

- **Filo ortalaması bir alt sınır.** Almanya'nın filosunun çoğu çatı üstü (doğu–batı yönlü, gölgeli, eski); arazi GES'i daha yüksek çalışır. İkincil kaynaklar Almanya'da güneye bakan, en iyi açılı sistem için ~935 (kuzey) – 1.105 (orta/doğu) – 1.280 (güney) kWh/kWp veriyor (Fraunhofer ISE'ye dayandırılmış; birincil kaynak bu oturumdan açılamadı: pv-fakten.de, PVGIS ve energy-charts erişime kapalı). Bu, kapasite faktörü olarak ~%10,7–14,6.
- **Kurulu güç tabanları farklı olabilir** (AC/DC). Türkiye'deki TEİAŞ kurulu gücü elektriksel (AC) güçtür; bu yüzden filo kapasite faktörü yüksektir. Oyunda MW sahanın bağlantı gücü gibi kullanılır.

## Değişiklik (`weather.js` `sunRel`, `cloudK`; `data/cloudk.js`; `config.js` `PV_K`)
- **Düzeltme tablosu:** `scripts/gen_cloudk.cjs` hava modelini 240 oyun günü (iki takvim yılı) × 3 tohum çalıştırır. 5°×10° ızgarada üretim ağırlıklı (gün eğrisi × öğle yüksekliği) ortalama göreli açıklığı ölçer.
- **Güneş paneli üretimi** (GES, yüzer GES, deniz GES'i; saha paneli durumu da) göreli açıklığı bu değere böler. Ara değer çift doğrusal, boylam çevrimli. Uzun dönemde ortalama 1 olur: yıllık üretim ışınım haritasını izler, hava gün gün dalgalanma yaratır.
- **Türkiye sabit kaldı:** Üretim çarpanı 1,24 × Konya'nın düzeltmesi (1,067) = 1,323. Konya'nın beklenen üretimi değişmez; Konya ~%21, TEİAŞ 2025 filosu %21,5.
- **CSP değişmedi:** Güneş çarpanı (`CSP.sm`) ham açıklıkla ayarlandı (`sunRelRaw`).
- **Fiyat modeli değişmedi:** Piyasanın güneş etkisi temsilî noktanın kendi açıklık ölçeğini kullanır.
- **Üretim değişimi** (Konya'ya göre; düzeltme oranı):

| Bölge | Değişim |
|---|---|
| Türkiye (Konya, Şanlıurfa / İzmir / Antalya) | 0 / +%1 / −%2 |
| İspanya iç kesim / Portekiz | +%3 / +%1 |
| Almanya (Bavyera / Brandenburg / Kuzey) | +%40 / +%60 / +%64 |
| Fransa güney / İtalya güney | +%17 / +%6 |
| ABD (Teksas, Kaliforniya) | +%4 |
| Şili, Brezilya, Güney Afrika, Avustralya | +%5 |
| Çin / Hindistan / Suudi Arabistan / Fas | +%7 / +%2 / −%2 / −%6 |

## Sonuç (`calib_pv`, 120 gün × 2 koşu, önce / sonra aynı koşu sayısıyla)
| Saha | Kısıntı öncesi KF, önce | Sonra | Kısıntı sonrası KF, sonra | Kısıntı, önce → sonra |
|---|---|---|---|---|
| Konya | %22,6–23,2 | %21,7–22,5 | %21,2–22,0 | %1–2 → %2 |
| İspanya iç kesim | %21,8–22,9 | %22,1–23,3 | %16,5–18,0 | %21–24 → %23–25 |
| Brandenburg | %7,3–8,3 | %11,5–12,3 | %8,3–8,4 | %35–37 → %28–32 |
| Bavyera | %10,1–10,6 | %12,2–14,6 | %8,6–9,6 | %36–39 → %30–34 |
| Kuzey Almanya (53,8°K) | %6,9–8,0 | %12,0–12,5 | %8,7–8,8 | %33–36 → %27–31 |

- **Konya'daki fark hava yılından.** Göreli açıklık iki koşuda 1,00 ve 1,05; beklenen üretim değişmedi.
- **Almanya'daki kısıntı azaldı:** Bulutlu günlerde fiyat pozitifken üretim arttı.

## Kısıntı (değişmedi; açık konu)
- **Oyunda Almanya'da güneş üretiminin sıfır ve altı fiyatlı saatlere düşen payı ~%28–36.** Piyasanın kendi güneş profiliyle de ~%28–38.
- **Gerçek 2025 için kaynaklar tutarsız:**
  - pv magazine'e dayandırılan ikincil kaynak (logicenergy): tam yıl %16.
  - ZfK: "2025'te her üç MWh'den biri"; grafik büyük olasılıkla ilk yarıyı karşılaştırıyor.
  - Aylık: LfL Bayern Mart 2025 %13,7; pv magazine Nisan 2025 %29,2 (başka bir yerde %32,6).
  - Aylık değerlerin üretimle ağırlıklı kaba toplamı ~%25 (tahmin).
- **Doğrulanamadı:** Saatlik güneş üretimi bu oturumdaki araçlarla alınamadı. ENTSO-E MCP günlük toplam veriyor; energy-charts erişime kapalı. Kesin pay olmadan fiyat modelinin negatif saat dağılımı yeniden ayarlanmadı.
- **Ayar yapılırsa yön:** Pay %16'ya yakınsa oyunda negatif saatler fazla güneş saatlerinde yoğunlaşıyor. Gerçekte kış rüzgârlı geceleri ve tatillerde de negatif saat var (Ocak 2025 %1,9). Oyunun negatif saat payı (%6,5) ve güneş fiyat oranı (0,514) hedefte kalacak biçimde dağılım değiştirilmeli.

## Ölçüm düzeltmesi (`scripts/sim_year.cjs`)
- **GES kısıntısı tüm santrallerin toplamıydı.** Negatif fiyat (11.11.2026) eklenince aynı koşudaki Kuzey Almanya RES'inin negatif fiyatlı saatlerdeki kısıntısı İspanya GES'inin kısıntısına karışıyordu. Vaka çalışmasındaki "%23–35" bu yüzden fazlaydı.
- **Artık yalnızca GES'in kendi kısıntısı sayılır:** Fiyat ≤ 0 saatte üretilmeyen enerji. Kısılan üretim dahil fiyat oranı da buna göre.

## Vaka çalışması (`sim_year` 8 yeni koşu, İspanya GES + Kuzey Almanya RES)
| Santral | KF | Kısıntı | Satış fiyatı ($/MWh) | IRR (vergisiz) | Spot: borç / özsermaye IRR'ı | PPA: borç / özsermaye IRR'ı |
|---|---|---|---|---|---|---|
| GES, İberya | %16,2–18,4 (önce %14,8–17,8) | %19–30 (önce %23–35, hatalı ölçüm) | 53,1–56,9 | %6,5–8,1 (önce %5,4–7,8) | %46–53 / %5,5–7,5 | %48–55 / %4,5–6,3 |
| RES, Avrupa | %19,6–26,6 | – | 83,8–95,8 | %10,4–15,7 | %46–65 / %10,2–21,1 | %65–75 / %9,1–20,5 |

- **RES modeli değişmedi;** aralık farkları koşudan koşuya hava değişimidir.
- **Piyasa ortalamaları:** İberya 75,0 (73,8–76,6), Avrupa 101,9 (97,3–104,1) $/MWh.
- **Türkiye** (2 koşu): GES KF %21,3–22,1, IRR %12,2–12,6; vaka çalışmasının aralıklarında (%10,9–12,7) kaldı.
- **Almanya GES** (Brandenburg, 2'şer koşu):
  - Kısıntı sonrası KF %8,6–8,9, kısıntı %29–35, LCOE 130–134 $/MWh (satılan üretimle).
  - Piyasa satışıyla IRR %2,5–3,7.
  - Piyasa primiyle (EEG) IRR %4,6; prim 6,0–9,1 $/MWh.
  - Gerçekte de Alman arazi GES'i %10 sermaye maliyetinde, yalnızca spot satışla zor: gerçek projeler ihaleli prim, PPA ve daha düşük sermaye maliyetiyle yapılır.

## Sınırlamalar
- **Tablo hava modelinin uzun dönem ortalaması** (3 tohum × 2 yıl). Tek bir oyun yılı ±%5 sapabilir; bu hava yılı riskidir.
- **Kaba ızgara.** 5°×10° ızgara bölge içi farkı (ör. Türkiye'de batı–doğu) kaba yakalar.
- **Hava modeli değişirse tablo yeniden üretilmeli** (`gen_cloudk.cjs`).
- **Gün uzunluğu enleme göre değişmez.** Gün eğrisi (`CAL.rise`, `CAL.len`) tek bir takvimden gelir; yüksek enlemde yaz günü kısa, kış günü uzun sayılır. Öğle yüksekliği enleme göre değiştiği için yıllık toplam etkisi sınırlı; ayrı modellenmedi.

# Avrupa'nın kalanı: Fransa, İtalya, İskandinavya (12.11.2026)

## Neden
- **Avrupa piyasası Almanya'ya göre ayarlıydı.** Fransa, İtalya ve İskandinavya'daki santraller Almanya'nın fiyatından satıyordu.
- **Gerçek fiyatlar çok farklı.** 2025 ortalaması Fransa'da 61, İtalya'da 115, İsveç'te (SE3) 46 €/MWh; Almanya'da 89. Güneşin ve rüzgârın değeri de farklı.

## Veri (ENTSO-E 2025, MCP `capture_price` ve `day_ahead_prices`)
| | Fransa (FR) | İtalya (IT-SUD) | İskandinavya (SE3) |
|---|---|---|---|
| Ortalama fiyat | 61,07 €/MWh | 115,03 (IT-NORD 115,86) | 46,24 |
| Güneş yakalama oranı | %59,1 | %82,4 (IT-NORD %81,9) | %58,9 |
| Rüzgâr yakalama oranı | %89,6 | %95,0 | %76,1 |
| Negatif saat | ~509 (%5,8) | 0 (en düşük fiyat 0) | ~344 (%3,9) |
| En düşük | −118,01 € | 0 | −25,05 € |

- **Sorgular:** İtalya rüzgârı ve İsveç tam yıl sorgusu zaman aşımına uğradığı için çeyrek ve yarı yıllarla alındı. Toplam, üretimle ağırlıklandı.
- **Negatif saat:** Ekim–Aralık 15 dakikalık olduğu için o dönemin negatif dönem sayısı 4'e bölündü (Fransa 65 → ~16 saat, SE3 217 → ~54 saat).
- **Kur:** 1,1306 $/€ (önceki Avrupa kalibrasyonuyla aynı).
- **Temsilî bölge seçimi:**
  - **İtalya:** Güney (IT-SUD). Yenilenebilir santrallerin çoğu güneyde; fiyat Kuzey'le neredeyse aynı.
  - **İskandinavya:** İsveç SE3 (Stockholm). İsveç'in bölgeleri arasında fark büyük, SE3 ortadadır.
  - **Danimarka:** DK1 fiyatı Almanya'ya yakın olduğu için Avrupa'da kaldı.
  - **Baltık ülkeleri:** Avrupa'da kaldı.
- **Aylık fiyat oranı** (günlük ortalamalardan; yıllık ortalamalar ENTSO-E değeriyle birebir):

| Piyasa | Ocak…Aralık |
|---|---|
| Fransa | 1,675 / 2,008 / 1,257 / 0,691 / 0,317 / 0,667 / 0,949 / 0,891 / 0,57 / 0,942 / 0,968 / 1,125 |
| İtalya | 1,236 / 1,304 / 1,03 / 0,862 / 0,809 / 0,99 / 0,979 / 0,962 / 0,958 / 0,905 / 0,988 / 0,999 |
| SE3 | 1,195 / 1,477 / 1,001 / 0,74 / 0,852 / 0,449 / 0,715 / 0,942 / 1,029 / 1,237 / 1,37 / 1,025 |

## Model (`config.js` `REG.R/L/K`, `MARKETS`, `EU`, `FLEET_CF`; `windfleet.js`; `wxsite.js` `MREF`)
| | `mult` | `sk` | `wk` | `neg` (t, z, a, p, f) | `dem` | Temsilî nokta |
|---|---|---|---|---|---|---|
| Fransa (R) | 1,10 | 2,35 | 1,35 | 31, 43, 0,008, 2,4, −133 | yok | 46,5°K 2,5°D |
| İtalya (L) | 1,74 | 1,35 | 0,65 | yok (taban 0) | yok | 41,5°K 15°D |
| İskandinavya (K) | 0,89 | 3,9 | 2,0 | −12, 12, 0,14, 1,64, −28 | SE3 aylık oranı | 60°K 15°D |

- **Rüzgâr filosu:** `gen_windfleet.cjs` ile üretildi. Bölge ağırlıkları yaklaşık kurulu güçtür (GW) ve doğrulanmadı.
  - Fransa: 9 bölge ve 3 deniz üstü saha.
  - İtalya: 8 bölge.
  - İskandinavya: İsveç'te 4, Finlandiya'da 2, Norveç'te 2 bölge.
  - `FLEET_CF`: 0,30 / 0,19 / 0,11 (kalibrasyon koşularının ortalaması). İskandinavya'nın değeri aynı gün 0,31 oldu: aşağıda "İskandinavya'nın rüzgâr üretimi".
  - Türkiye'nin noktaları yeniden üretilmedi; kıyı düzeltmesinden sonra iki nokta kayıyordu, eski değerler korundu.
- **Aylık talep düzeyi (`dem`):** Fransa'da denendi, kullanılmadı. 2025'in aylık fiyat oranı baharın güneş etkisini zaten içerdiği için güneş iki kez sayıldı: negatif saat %15–20'ye çıktı, rüzgâr oranı 1'in üstüne çıktı. İtalya'da gerek kalmadı. İskandinavya'da gerekli: Türkiye'ye göre ayarlı genel aylık talep yazın yüksektir, İsveç'te ise yazın fiyat düşer (bahar seli, düşük talep). Bu olmadan güneş oranı 1'in üstüne çıkıyordu.
- **İskandinavya'nın negatif eşiği sıfırın altında:** Güneş ve rüzgâr etkisi oranları tutturacak kadar güçlü olunca ham fiyat sık sık sıfırın altına iniyor; eşik 31 ve hatta 3 $ iken negatif saat %9–11'de kaldı. Eşik −12 $ olunca −12 ile 12 arası 0–12 $'a gerilir, gerçekteki gibi çok saat sıfıra yakın kapanır.
- **Oyuncunun santralleri:** Rüzgâr üretimi değişmedi; kara ve deniz katsayısı (`LAND_K`, `SEA_K`) ve aylık rüzgâr deseni Avrupa'dakiyle aynı. İskandinavya'nın kara katsayısı aynı gün İsveç filosuna göre ayarlandı (aşağıda). Güneş üretimi zaten sahanın ışınımına ve bulut düzeltmesine bağlı. Yatırım katsayısı Avrupa'yla aynı (IRENA Avrupa ortalaması).
- **Kurallar:**
  - `EU` kümesi: kredi faizi ve izin süresi bütün Avrupa piyasalarında aynı.
  - Kurumlar vergisi piyasaya göre: Fransa %25 (PwC; %3,3 sosyal katkı 763 bin €'yu aşan vergide, 2025 ek vergisi 1 milyar € ciroda), İtalya %27,8 (IRES + IRAP; Tax Foundation/OECD), İskandinavya %20,6 (İsveç, PwC).
  - Avrupa Hidrojen Bankası desteği üçünde de; ilk ihalenin kazananları İspanya, Portekiz ve İskandinavya'dan.
  - Britanya'nın kapasite ödemesi ve offshore fark sözleşmesi ile Almanya'nın piyasa primi yalnızca Avrupa'da.
- **Eski kayıt (piyasa v2):** Bu ülkelerdeki ve kıyılarındaki sahalar, santraller ve rakip sahaları taşınır; yeni piyasaların güneş doygunluğu başlangıç değerinden başlar.
- **Harita verisi:** `scripts/build_geo.py` İberya'yı da içerecek şekilde güncellendi; önce yeniden üretilirse İspanya ve Portekiz Avrupa'ya dönerdi.

## Ayar süreci (`calib_market`, 120 gün × 2 koşu, iki parametre seti paralel, 7 tur)
- **İtalya** 3. turda tuttu. Aylık talepsiz tutuyor; aylık talep güneş oranını düşürüyordu.
- **Fransa** ilk turlarda güneş oranı ile negatif saat birlikte hareket ediyordu; `sk` 2,3 ile 2,45 arasında güneş oranı 0,62'den 0,49'a, negatif saat %4,6'dan %8'e değişti (çok duyarlı). Derinlik `a` 0,0026'dan 0,008'e çıkarıldı (en düşük −15 $'dan −34 ile −52 $'a).
- **İskandinavya'da** önce güneş oranı 1'in üstündeydi (aylık talep), sonra negatif saat yüksekti (eşik).

## Sonuç (`calib_market` 120 gün × 4 koşu, son ayar)
| | Gerçek 2025 | Oyun |
|---|---|---|
| Fransa: fiyat / güneş / rüzgâr / negatif saat | 69,0 $ / 0,591 / 0,896 / %5,8 | 68,2 (67,6–69,4) / 0,573 (0,54–0,61) / 0,905 / %6,3 (5,6–7,0) |
| İtalya | 130,1 $ / 0,824 / 0,950 / 0 | 130,1 (129,7–130,6) / 0,818 / 0,965 / 0 |
| İskandinavya | 52,3 $ / 0,589 / 0,761 / %3,9 | 52,5 (52,2–53,1) / 0,595 / 0,796 / %3,2 (2,5–3,9) |
| Avrupa (kontrol) | 101 $ / 0,516 / 0,866 / %6,6 | 8 koşu: eski kod 102,2 / 0,54; yeni kod 100,7 / 0,49 |

- **Avrupa ve İberya değişmedi.** Rakiplerin aday bölgelerinde Fransa, İtalya ve İskandinavya yok. Avrupa'nın 120 günlük ortalaması koşudan koşuya 97–106 $ arasında oynuyor; iki grup hedefin iki yanında.
- **Türkiye ve Kuzey Amerika değişmedi** (67,1 ve 64,3 $/MWh).

## Sınırlamalar
- **Tek fiyat bölgesi.** İtalya (7 bölge), İsveç (4), Norveç (5) gerçekte birden çok fiyat bölgesidir. İsveç'te kuzey (SE1–SE2, rüzgârın çoğu) güneyden çok ucuzdur; oyunda hepsi SE3 fiyatı.
- **Kaba rüzgâr filosu.** Filo ağırlıkları yaklaşık. İskandinavya'nın oyun filosu kapasite faktörü önce düşüktü (0,11): noktalar orman ve iç bölgelerde (aşağıda düzeltildi).
- **Fransa'nın derin negatifleri yok.** Oyunda en düşük −34 ile −52 $, gerçekte −133 $.
- **Tek yıl.** Hedefler 2025'e dayanır; Fransa'nın 2025 kışı gaz fiyatıyla pahalıydı.
- **Destekler yalnızca Avrupa piyasasında.** Fransa'nın tamamlayıcı ödeme (complément de rémunération) ve İtalya'nın teşvikleri modellenmedi.

## İskandinavya'nın rüzgâr üretimi (12.11.2026, vaka satırları sırasında)
- **Sorun:** Vaka çalışması için İsveç'in iç kesiminde (63°K 16,5°D) kurulan RES'in kapasite faktörü %3–4 çıktı. Oyunun İsveç filosu (`wind_fleet.cjs` SE, 4 bölge) %9.
  - Neden: Ormanlık iç bölgelerde rüzgâr verisi ve orman düşüşü (−0,5 m/s) ile Avrupa'nın kara katsayısı (0,83, Almanya'ya göre) rüzgârı az gösteriyordu.
  - Fransa ve İtalya'da sorun yok: filo %30 ve %19, örnek santraller %26–32 ve %13–24.
- **Gerçek:** İsveç kara rüzgârı 2025 (ENTSO-E A75):
  - Üretim: Ocak–Haziran 21,06 TWh, Temmuz–Eylül 6,83 TWh, Ekim–Aralık 5,89 TWh.
  - Ekim–Aralık dönemlerinin yalnızca %49,4'ü yayımlanmış; tamamı ~11,9 TWh (tahmin). Yıllık ~39,8 TWh.
  - Kurulu güç 18,0 GW (ENTSO-E, Ocak 2025). Filo kapasite faktörü **~%25**.
- **Değişiklik (`world.js` `LAND_K.K`):** 0,83 → 1,3. Ölçümler (240 gün, tek koşu ±%10):

| Katsayı | Filo kapasite faktörü |
|---|---|
| 0,83 | %8,7 |
| 1,0 | %13 |
| 1,15 | %21 |
| 1,25 | %22 |
| 1,3 | %24–27 (3 koşu, ortalama %25) |

  - Finlandiya ve Norveç için ayrı veri toplanmadı; aynı katsayı.
  - Deniz katsayısı değişmedi.
  - Eski kayıtta İskandinavya'daki kara sahalarının rüzgâr puanı yeniden hesaplanır (piyasa v3).
- **Fiyat yeniden ayarlandı:**
  - Filonun kapasite oranı 0,11'den ~0,31'e çıktı; `FLEET_CF.K` 0,31.
  - Rüzgâr endeksi değiştiği için `wk` 2,0 → 2,8, `mult` 0,89 → 0,99.
  - Sonuç (4 koşu): fiyat 52,5 (50,6–53,9) $/MWh, güneş oranı 0,575, rüzgâr oranı 0,85 (0,78–0,88), negatif saat %5,3 (3,5–8,3).
  - Rüzgâr oranı hedefin (0,761) üstünde kaldı: `wk` 3,4'te de 0,83. Ham fiyat sıfırın altına inince eşik (−12 $) sıfıra yakın fiyata çevirdiği için rüzgârlı saatlerin fiyatı daha fazla düşmüyor.

## Vaka çalışması: Fransa, İtalya, İskandinavya (`sim_year` 120 gün × 8 koşu, piyasa başına)
| Santral | KF | Satış fiyatı ($/MWh) | LCOE (%10) | NPV (M$) | IRR | Spot: borç / özsermaye IRR'ı |
|---|---|---|---|---|---|---|
| GES Fransa (Gard, 43,9°K 4,3°D) | %12,6–15,3 (kısıntı %16–33) | 52,8–56,2 | 75,8–91,8 | −1,85 ile −1,25 | %2,9–5,4 | %32–42 / %1,6–4,1 |
| RES Fransa (Hauts-de-France, 50,0°K 2,8°D) | %26,1–31,6 | 62,9–66,2 | 55,9–67,8 | −0,16 ile +1,04 | %9,6–12,5 | %53–61 / %10,0–14,5 |
| GES İtalya (Puglia, 41,3°K 15,9°D) | %17,6–19,7 (kısıntı yok) | 103,0–108,0 | 58,9–65,8 | +2,85 ile +3,48 | %19,1–21,0 | %75 / %35,1–40,5 |
| RES İtalya (Puglia, 41,2°K 15,6°D) | %13,1–24,3 | 118,3–126,2 | 72,6–135,2 | −0,66 ile +4,90 | %8,3–21,2 | %52–75 / %7,7–40,4 |
| GES İskandinavya (Skåne, 55,8°K 13,4°D) | %9,8–12,3 (kısıntı %9–22) | 32,2–38,1 | 93,9–118,2 | −3,10 ile −2,83 | < %0 | %12–17 / yok |
| RES İskandinavya (Västra Götaland, 58,3°K 12,8°D) | %14,4–27,1 | 37,7–47,0 | 65,2–122,5 | −4,46 ile −2,96 | < %0 | %7–27 / yok |

- **Piyasa ortalamaları:** Fransa 69,0 (67,4–70,4), İtalya 130,4 (128,9–131,5), İskandinavya 52,1 (50,1–53,9) $/MWh.
- **İtalya GES'i** 2025'in gaz ağırlıklı fiyatı sürerse çok kârlı. Güneşin değeri yüksek (yakalama oranı 0,79–0,83; gerçek IT-SUD 0,824), negatif fiyat yok.
- **İtalya RES'inin aralığı geniş.** Koşularda santral farklı noktalara kuruldu (dağlık arazi); kapasite faktörü %13–24.
- **İskandinavya'da hiçbiri yatırımını geri ödemiyor.** Ortalama fiyat düşük, güneş ve rüzgâr bunun altında satıyor.
- **İskandinavya RES sahası:** Rüzgâr filosunun ortalamasına (%25) en yakın bölge seçildi. Kuzey İsveç (Norrbotten) ve güneydoğu kıyısı (Skåne–Kalmar) oyunda %40–49 verir; ama fiyat bütün İsveç için SE3'ünkü.

