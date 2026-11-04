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
- Oyunda fiyat tabanı 0'dır ve santral sıfır fiyatta üretimi kısar; gerçek piyasada negatif fiyat vardır ve destekli santraller üretmeye devam eder. Bu yüzden oyunda Avrupa GES kısıntısı yüksektir (yıllık üretimin ~%20–25'i, kapasite faktörü ~%17).
- Avrupa tek piyasa olarak modellenir; ülkeler arası fark (Almanya'da yüksek fiyat ve güçlü rüzgâr etkisi, İspanya'da düşük fiyat ve güçlü güneş etkisi) ortalamada kaybolur.
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
- Avrupa tek piyasa: Almanya ve İspanya'nın ayrı fiyat bölgeleri bir arada. Filo ağırlıkları Almanya ağırlıklı olduğu için İspanya'daki bir santralin oyundaki oranı gerçekteki %96,5'ten düşük çıkabilir.
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

## Sınırlamalar
- Sonraki yıllardaki düşüş oyunun kendi davranışıdır (rakip yatırımı, güneş doygunluğu); gerçek piyasa için tahmin değildir. Gerçekte fiyatı gaz fiyatı, kur ve talep de belirler.
- Hedef tek yıla (2025) dayanır; 2026 ortalaması kullanılmadı. 2026'nın ilk on ayıyla karşılaştırma: aşağıdaki "Türkiye 2026 kontrolü" bölümü.
- Güneş hedefi 12 güne dayanır; günler arasındaki fark büyük.
- Vaka çalışması sayfaları (`public/vaka/`, `public/case-study/`) 18.10.2026 model sürümüyle ve 365 gün üzerinden üretilmişti. 30.10.2026'da güncel modelle ve ilk oyun yılı üzerinden yeniden üretildi: piyasa karşılaştırması bu bölümdeki ve bölgesel rüzgâr bölümündeki kalibrasyon koşularından, proje ekonomisi `scripts/sim_year.cjs` ile (120 gün × 8 koşu, piyasa başına; olay kartları kapalı).

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
- Türkiye piyasasında her saatin fiyatından, piyasa çarpanından önce `depth × mon[ay] × (w − 1)` düşülür. Kurak yılda (w < 1) aynı terim `dry` payıyla (0,25) fiyata eklenir. Fiyat sıfırın altına inmez; bu sınır etkiyi doğal olarak doğrusal olmayan yapar.
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
- Etki bütün saatlerde aynı tutardır. Gerçekte Nisan 2026'da saatlerin yarısı 8,1 $/MWh'in altında, ortalama 20,7 $/MWh'ti; akşam saatleri yüksek kaldı (günlük en yüksek–en düşük farkı ortalaması 2025'te 2.167, 2026'da 3.535 TL/MWh). Oyunda sıfıra inen saat payı gerçekte olduğundan az.
- Su endeksi yıllıktır; gerçekte yağış ve kar erimesi yıl içinde değişir (2026 Ocak'ı kuraktı, Şubat'tan sonra çok yağışlıydı).
- 2026 değeri tahmindir; TEİAŞ yıllık verisi yayımlanınca güncellenecek.
- Kalibrasyon koşuları (`calib_market.cjs`) ve vaka çalışması (`sim_year.cjs`) bütün yıllar için w = 1 (normal yıl) kullanır: taban düzey ve proje ekonomisi önceki modelle aynıdır.
