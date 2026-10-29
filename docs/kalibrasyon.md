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
- Güneş oranı yalnızca 7 güne dayanır; günlük oran %18 ile %110 arasında değişti (hafta sonu ve bayram günleri çok düşük). Yıllık değer için daha fazla gün gerekir; sonuç "~%75, belirsizliği yüksek" diye okunmalıdır.
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
- **Gözlem (değiştirilmedi):** Türkiye'nin oyundaki ortalama fiyatı 72 $/MWh. EPİAŞ 2025 ortalaması 66,4 $/MWh, ilk kalibrasyonda oyun 65,8'di; aradaki ~%8'lik kayma bu çalışmanın kapsamı dışında bırakıldı.
