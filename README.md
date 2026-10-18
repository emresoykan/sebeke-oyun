# Wattlas

Wattlas — dünya haritasında yenilenebilir enerji portföyü kurma oyunu (depo adı: `sebeke-oyun`; eski çalışma adı "Şebeke"). Vite + vanilla JS (ES modülleri), MapLibre GL düz dünya haritası; isteğe bağlı 3D yakın görünüm için CesiumJS ve three.js ile kurulan 3D santraller.

## Çalıştırma

```bash
npm install
npm run dev      # geliştirme sunucusu
npm run build    # dist/ altına üretim derlemesi
npm run preview  # derlemeyi yerelde sun
npm run build:preview  # dosya sayısı sınırlı yerler için hafif derleme (göreli yollar, az Cesium varlığı)
```

### Google Photorealistic 3D Tiles

3D yakın görünümde gerçek arazi ve binalar (Google Photorealistic 3D Tiles) için bir Google Maps Platform API anahtarı gerekir. Anahtar yoksa ya da yüklenemezse 3D görünüm gömülü NASA görüntüleriyle çalışır. Düz harita anahtar gerektirmez.

1. Google Cloud Console'da bir proje aç, faturalandırmayı bağla ve **Map Tiles API**'yi etkinleştir.
2. Bir API anahtarı oluştur. **Uygulama kısıtı:** HTTP yönlendirenleri (ör. `https://<kullanıcı>.github.io/*`, `http://localhost:5173/*`). **API kısıtı:** yalnızca Map Tiles API. Faturaya karşı günlük kota sınırı koy.
3. Yerelde: proje kökünde `.env.local` dosyasına `VITE_GOOGLE_MAPS_API_KEY=...` yaz (bu dosya git'e girmez).
4. GitHub Pages için: depo ayarlarında **Secrets and variables → Actions** altına `GOOGLE_MAPS_API_KEY` ekle; **Pages → Source: GitHub Actions** seç. `main`'e her push'ta `.github/workflows/pages.yml` yayınlar.

Anahtar istemci tarafında çalıştığı için derlenmiş JavaScript'te görünür; güvenliği yukarıdaki yönlendiren ve API kısıtlarıyla sağlanır. Ücret: ayda ilk 1.000 kök karo isteği (oyun oturumu) ücretsiz, sonrası 1.000 istek başına yaklaşık 6 $ (Google'ın güncel fiyat listesini kontrol et).

Önizleme sayfaları (claude.ai artifact) dış sunuculara istek atamadığı için orada her zaman gömülü görüntü kullanılır.

## Yapı

| Dosya | İçerik |
|---|---|
| `index.html` | Sayfa iskeleti (markup) |
| `src/style.css` | Tüm stiller ve açık/koyu tema token'ları |
| `src/config.js` | Sabitler, piyasalar (`REG`, `MARKETS`), teknolojiler (`TECH`) |
| `src/world.js` | Gerçek dünya sorguları: ülke, arazi tipi, kıyıya uzaklık, en yakın şehir (`describe(lat, lon)`) |
| `src/rules.js` | İzinli teknolojiler, arazi/izin maliyeti ve olasılıkları |
| `src/utils.js` | Rastgelelik, üretim profilleri, biçimlendirme |
| `src/state.js` | Oyun durumu (`S`, `D`), kayıt/yükleme (localStorage), seçili nokta, bildirim günlüğü |
| `src/sim.js` | Günlük fiyatlar, saatlik tick, gün sonu, net değer |
| `src/actions.js` | Saha açma (arazi alma), izin başvurusu, santral kurma (ekipman kademesiyle) |
| `src/equipment.js` | Ekipman katalogu: her teknoloji için ekonomi/standart/premium kademe, kurgusal markalar, maliyet ve performans çarpanları |
| `src/profile.js` | Oyuncu profili: kimlik, uzmanlıklar, ünvanlar, rozetler |
| `src/missions.js` | Görev zinciri: 14 sıralı görev, ödüller |
| `src/events.js` | Olay kartları: 12 piyasa/hava/şebeke/mevzuat olayı ve seçenekleri |
| `src/calendar.js` | Takvim ve mevsimler: tarih, güneş eğimi, gün uzunluğu, öğle güneşi yüksekliği, aylık talep |
| `src/weather.js` | Hava modeli: hareket eden alçak/yüksek basınç, fırtına ve sıcak hava sistemleri; nokta başına bulut, yağış, rüzgâr hızı ve yönü (DOM'suz) |
| `src/wxsite.js` | Havanın oyuna bağlanması: günlük 24 saatlik tahmin, piyasa temsilî noktaları, saha havası |
| `src/market.js` | GÖP ve dengesizlik: gerçek üretim, ilişkili tahmin hatası, teklif (taahhüt), saatlik uzlaştırma, bataryayla dengeleme |
| `src/ui/desk.js`, `src/ui/modal.js` | GÖP masası penceresi; gün başı pencerelerinin (olay kartı, masa) sırası |
| `src/rivals.js` | Kurgusal rakip şirketler: saha seçimi, yatırım bütçesi, inşaat, piyasaya etkisi, portföy değeri |
| `src/news.js`, `src/ui/ticker.js` | Haber bandı: rakip hamleleri, hava uyarıları, fiyat rekorları, olaylar, mevsim |
| `src/league.js`, `src/net/fb.js`, `src/ui/league.js` | Arkadaş ligi: sıralama, eşik duyuruları, Firebase bağlantısı (yalnızca lige katılınca yüklenir), lig penceresi |
| `firebase/firestore.rules` | Lig ve bulut kayıt veritabanının güvenlik kuralları |
| `src/cloud.js`, `src/ui/cloud.js` | Bulut kayıt: kurtarma kodu, otomatik eşitleme, kodla yükleme; Ayarlar'daki bölüm |
| `src/mods.js` | Olaylardan gelen geçici etkiler (fiyat, üretim, sabit fiyat, prim, maliyet, arıza riski) |
| `src/ui/mission.js`, `src/ui/eventcard.js`, `src/ui/fx.js` | Görev çubuğu, olay kartı penceresi, bildirim balonları, kutlama ve ses |
| `src/ui/profile.js` | Başlıktaki profil rozeti, ilk açılışta şirket kurma formu, profil penceresi |
| `src/ui/map.js` | Düz dünya haritası (MapLibre GL): sahalar, rakipler, seçim, korunan alanlar, gece gölgesi, tıklama, açılış uçuşu; 3D pencereyi açar |
| `src/ui/mapstyle.js` | Harita stili: kabartmalı zemin görüntüleri, OpenFreeMap vektör katmanları, arazi gölgesi, yer adları, yedek katmanlar |
| `src/ui/wxflat.js` | Düz haritada bulutlar, fırtına halkaları, şimşek; hava katmanı düğmesi |
| `src/ui/globe3d.js`, `src/ui/weather3d.js` | İsteğe bağlı 3D yakın görünüm (CesiumJS): Google 3D Tiles veya gömülü NASA görüntüleri, 3D santraller, sinematik tur, 3D hava |
| `src/ui/models.js` | 3D santral modelleri: three.js ile kurulur, glTF olarak Cesium'a verilir; rotor, ikaz ışığı, dolusavak ve LED canlandırması |
| `src/plantstatus.js` | Sahadaki santrallerin o saatteki çalışma durumu (3D modeller ve panel ortak kullanır) |
| `src/ui/panel.js` | Seçili nokta/saha paneli, ekipman kartları ve buton durumları |
| `src/ui/sheet.js` | Panel düzeni: sekmeler (Saha, Piyasa, Rapor, Ayarlar), mobilde alttan açılan kart, "Sahalarım" listesi, onay penceresi |
| `src/ui/savefile.js` | Kayıt dosyası: oyunu ve profili JSON olarak indirme, doğrulayarak geri yükleme |
| `src/ui/guide.js` | İlk oyun rehberi: üç adım (yer seç, araziyi al, izin ve santral) |
| `src/ui/potential.js`, `src/potential.worker.js` | Güneş/rüzgâr potansiyel haritası: karo karo ayrı işçide hesap, iki harita için ortak karo görüntüsü, düğme ve lejant |
| `src/ui/search.js` | Yer arama: oyunun şehir ve ülke listesinde (çevrimdışı), Türkçe karakter duyarsız; koordinat girişi |
| `src/ui/hud.js` | Fiyat/üretim grafiği, göstergeler, rapor, trend |
| `src/main.js` | Giriş noktası: oyun döngüsü, kontroller, ilk yükleme |
| `src/loans.js` | Oyun içi banka kredisi: ekonomik zaman ölçeği, DSCR'a göre boyutlandırma, ödemesiz dönem, günlük taksit, erken kapama |
| `src/finance.js`, `src/ui/finview.js` | Proje ekonomisi ve proje finansmanı: santral bazında gerçek dünya karşılığı LCOE, NPV, IRR, geri ödeme; borç, DSCR, vergi, PPA, özsermaye IRR'ı ve fiyat stresi (Rapor sekmesi) |
| `src/ui/feedback.js` | Pilot geri bildirim formu: anonim sorular, oyun özeti, kopyala/indir, Firebase varsa gönder |
| `public/vaka/`, `public/case-study/` | Vaka çalışması sayfaları (Türkçe, İngilizce) |
| `scripts/sim_year.cjs` | Oyunu ekransız N gün simüle edip fiyat, capture oranı, kapasite faktörü ve proje ekonomisini yazdırır |
| `scripts/calib_wind.py`, `scripts/wind_fleet.cjs` | Rüzgâr kalibrasyonu: TEİAŞ, EPDK ve ENTSO-E 2025'ten filo kapasite faktörü hedefleri; oyunun filo kapasite faktörünü ölçen simülasyon |
| `src/ui/realplants.js`, `public/data/plants/`, `scripts/build_osm_plants.py`, `.github/workflows/osm-plants.yml` | Gerçek santraller katmanı (dünya): OSM verisi (Actions'ta üretilir), görünüme göre ülke yükleme, düz ve Apple haritası çizimi, ipucu, ülke lejantı |
| `src/slope.js` | Arazi eğimi: seçilen noktanın 250 m çevresinin ortalama eğimi ve baktığı yön, AWS Terrain Tiles yükseklik karolarından (12. yakınlık, ~30 m) |
| `src/urban.js`, `public/data/urban.bin` | Yerleşim alanları: kentsel alan poligonları (Natural Earth, üretilmiş; `scripts/build_urban.py`), açılışta arka planda yüklenir; nokta sorgusu |
| `src/data/resource.js` | Güneş ışınımı ve rüzgâr hızı ızgarası (NASA POWER, üretilmiş; `scripts/build_resource.py`) |
| `src/data/` | Üretilmiş harita verisi (ülkeler, ülke etiketleri, şehirler, arazi bölgeleri, kıyı çizgisi) ve korunan alan listesi |
| `public/textures/` | Gömülü dünya görüntüleri: NASA Blue Marble (gündüz) ve Black Marble (gece), 4096×2048; Türkiye ve çevresi için Sentinel-2 mozaiği (`tr-*.jpg`, ~300 m/piksel) |
| `scripts/` | Harita verisini ve Sentinel-2 Türkiye mozaiğini yeniden üreten Python script'leri |
| `.github/workflows/pages.yml` | GitHub Pages yayını |

`S` ve `D` modüller arasında canlı bağlama (live binding) olarak okunur; yeniden atama yalnızca `setS`/`setD` ile yapılır.

## Oyuncu profili ve ekipman

İlk açılışta oyuncu şirketini kurar: ad, şirket adı, renk ve uzmanlık. Uzmanlık oyunun bir mekaniğini hafifletir:

| Uzmanlık | Etkisi |
|---|---|
| Mühendis | Santral arızaları yarı yarıya azalır |
| Finansçı | Kurulum maliyeti %6 düşer |
| Mevzuat uzmanı | İzin ihtimali 10 puan artar (korunan alanlar hariç), inceleme 1 gün kısalır |
| Piyasa analisti | Rüzgâr dengesizlik maliyeti %35 azalır |

Profil ayrı anahtarda (`sebeke-profile-v1`) saklanır; "Yeniden başla" oyunu sıfırlar, profili korur. Ünvan portföy değeriyle yükselir (Girişimci → Enerji devi); istatistikler ve 10 rozet oyuna aittir.

Her teknolojide (GES, karada RES, offshore RES, HES, batarya) üç ekipman kademesi vardır. Markalar ve modeller kurgusaldır, değerler oyun dengesi için temsilidir:

| Kademe | Kurulum | Üretim / verim | Arızasız gün | İşletme gideri |
|---|---|---|---|---|
| Ekonomi | %80–85 | %86–92 (batarya verimi %82) | %94–97 | %110–120 |
| Standart | %100 | %100 (batarya %88) | %97–98,5 | %100 |
| Premium | %115–122 | %104–112 (batarya %92) | %98,5–99,5 | %88–95 |

Ekonomi aynı parayla daha çok MW kurdurur; premium 40 MW'lık saha sınırında MW başına en çok üretimi verir. Arızalanan santral 1–2 gün üretmez ama işletme gideri sürer. Premium türbinler 3D'de daha büyük rotor ve kuleyle, paneller kademeye göre farklı tonda görünür. Eski kayıtlardaki santraller standart kademe sayılır.

## Ekran düzeni ve kontroller

- **Masaüstü (900 px ve üstü):** Harita solda, panel sağda sabit durur; haritaya dokununca sonuç aynı anda panelde görünür. Sayfa kaymaz: başlık, haber bandı ve görev kartı ne kadar yer kaplarsa harita kalanı doldurur (620 px'ten kısa ekranlarda sayfa kaydırılır). Kendi sahan seçiliyken boş bir yere ilk tıklama seçimi değiştirmez, "tekrar tıkla" ipucu gösterir.
- **Mobil:** Harita ekranı doldurur, sayfa kaymaz. Panel alttan açılan bir karttır: kapalıyken yalnızca sekmeler görünür, seçim yapılınca yarıya açılır, tutamağa dokunarak veya sürükleyerek büyütülür/küçültülür. Kart açıkken haritaya ilk dokunuş seçimi değiştirmez, yalnızca kartı küçültür. Seçilen nokta kartın altında kalırsa harita kendiliğinden kayar. Kapalı kartın tutamağında seçili yerin özeti (arazi tipi, en yakın şehir, fiyat ya da sahanın gücü ve izin durumu) görünür. Arazi satın alma ve izin düğmesi kartın altına yapışıktır (masaüstünde de panelin altına yapışır; geri alma kutusu düğmeyi aşağı itmez). Görev açıklaması iki satır görünür; dokununca tamamı açılır.
- **Sekmeler:** Saha (Sahalarım listesi, seçili nokta/saha paneli), Piyasa (fiyat/üretim grafiği, GÖP masası, lig, hedef), Rapor (gün sonu raporu, bildirimler), Ayarlar (hava katmanı, grafik, ses, "Yeniden başla").
- **Harita düğmeleri:** Yer ara, potansiyel haritası, yakınlaştır, uzaklaştır, sıradaki sahama git, lejant ve (destekleyen tarayıcıda) tam ekran. İşaretlerin çevresinde 44 piksellik görünmez dokunma alanı vardır; boş haritada dokunulan yerin 16 piksel çevresindeki en yakın işaret seçilir.
- **Zaman:** Saat ilk arazi alınana kadar işlemez. Başlıktaki düğmeler duraklatır ve hızı 1x/3x/8x arasında değiştirir.
- **Klavye:** Boşluk duraklat/devam, 1/3/8 hız, / yer ara, Esc mobil kartı küçültür (3D görünüm açıksa onu kapatır). Kısayollar bir düğmeye tıkladıktan sonra da çalışır; odak bir düğmedeyken boşluk o düğmeye basar.
- **Klavyeyle nokta seçme:** Haritaya Tab ile gelinince ortada bir nişangâh ve kısa ipucu çıkar. Oklar haritayı kaydırır (Shift ile daha hızlı), + / − yakınlaştırır, Enter ortadaki noktayı seçer (panel açılır; kendi sahan seçiliyken "tekrar Enter" koruması geçerli). Klavye modu yalnızca haritaya klavyeyle gelinince açılır; fareyle tıklayınca kapanır, boşluk her zaman oyunu duraklatır. İpucu çubuğu ilk 5 saniye görünür. Kaydırma bitince imlecin yeri (ülke, arazi tipi, en yakın şehir) ekran okuyucuya bildirilir. Klavye modunda bu tuşlar haritanın kendi tuş işleyicisine gitmez; boşluk, 1/3/8 ve / çalışmaya devam eder.
- **Bildirim balonları:** Haritanın üst kenarında çıkar (masaüstünde sağ üst, mobilde ortada); başlığı, nakdi, görev kartını ve paneli kapatmaz. Ekranda masaüstünde en fazla iki, mobilde bir balon kalır.
- **Potansiyel haritası:** Düğme sırayla güneş → rüzgâr → kapalı arasında geçer. Her noktanın oyundaki güneş puanı ya da rüzgâr kapasite faktörü sınıfı (panelde ●●●○○) tek renkli beş kademeyle boyanır; koyu/saydam düşük, parlak yüksek. Kurulum yapılamayan yerler (buz örtüsü, derin deniz, piyasa dışı) boş kalır. Puanlar oyunun kendi kurallarından gelir (`world.js` `potentialAt`, `describe` ile aynı formül); gerçek ölçüm verisi değildir. Hesap ağır olduğu için (nokta başına ~0,3 ms) karolar ayrı bir işçide 26×26 noktalık ızgarayla hesaplanır, kenar paylı ızgara yumuşatılarak büyütülür; z13'ten yakında üst karo büyütülür. Apple haritada katman, hesap sürerken en fazla 1,2 saniyede bir ve kuyruk bitince bir kez yenilenir. İşçi dosyası dünya verisini de içerdiğinden katman ilk açıldığında ~1,2 MB (sıkıştırmasız) ek indirme yapılır.
- **Yer arama:** Şehir (Natural Earth listesi, ~1.300), ülke, bölge (Türkiye'nin coğrafi bölgeleri, Kapadokya, ovalar, dağlar, göller ve birkaç dünya bölgesi; `src/data/regions.js`, yaklaşık merkezler), milli park ya da "38.5, 32.4" biçiminde koordinat. Türkçe karakterler eşleştirmede yok sayılır ("elazig" → Elâzığ); tam eşleşme ve baştan eşleşme önce gelir. Şehir veya koordinat seçilince harita oraya gider ve nokta seçilir.
- **Rehber:** İlk oyunda haritanın üstünde üç adımlı kısa bir rehber çıkar (yer seç → araziyi al → izin başvurusu); oyuncu adımı yaptıkça ilerler, izin başvurusu yapılınca ya da santral kurulunca kendiliğinden kapanır. Arazi alımı geri alınırsa 2. adıma döner. "Rehberi geç" ile kapanır, Ayarlar'dan baştan açılır. Kart haritaya dokunmayı engellemez; mobilde yalnızca başlık satırı görünür ("Ayrıntı" açıklamayı açar) ve bildirim balonları kartın altına iner.
- **Geri alma:** Son satın alma (arazi/deniz alanı veya +5 MW blok) 10 saniye içinde panelden tam iadeyle geri alınabilir. Arazide izin başvurusu yapıldıysa ya da santral kurulduysa, JES'te ilk blok (sondaj sonucu öğrenildiği için) geri alınamaz. O satın almayla tamamlanan görev ve rozet ödülleri geri alınmaz.
- **Kayıt dosyası:** Ayarlar'da "Kaydı indir" oyunu ve profili bir JSON dosyasına yazar; "Kayıt yükle" dosyayı doğrular, onay ister ve mevcut ilerlemenin yerine koyar.
- **İflas:** Gün sonu nakit (görev ve rozet ödüllerinden sonra) art arda 7 gün eksi kalırsa şirket iflas eder; her eksi günde kalan süre bildirilir. İflas ekranında kayıt yüklenebilir ya da yeni oyuna başlanır.
- **Hedef:** Portföy değeri 5 M$'a ulaşınca özet ekranı (süre, kurulu güç, toplam üretim ve net kazanç, saha ve rozet sayısı) açılır; oyuncu devam edebilir veya yeni oyuna başlayabilir. "Yeniden başla" onay penceresi ister.

## Görevler, olay kartları ve geri bildirim

- **Görev zinciri:** Haritanın üstündeki çubuk sıradaki görevi, kısa bir açıklamayı ve ödülü gösterir. 14 görev oyunun ilk yarım saatini yönlendirir: arazi alma, izin, ilk santral, kârlı gün, ilk olay kararı, rüzgâr ve batarya ile çeşitlendirme, ikinci ve üçüncü piyasa, 25 MW, dolu saha, 500 b$ ve 1 M$ portföy. Eski kayıtlarda geçmişte tamamlanan görevler ödülsüz geçilir.
- **Olay kartları:** İlk santralden sonra, 3. günden itibaren gün başında yaklaşık %45 olasılıkla bir olay çıkar (ilk olay garantili, iki olay arasında en az bir gün). Oyun durur, oyuncu seçeneklerden birini seçer. Olaylar gerçek piyasa olgularından esinlenir ve her kartta bir "piyasa notu" vardır: kuraklık, fırtına (kesme hızı, sigorta), tatil günü öğle fiyat çöküşü (kanibalizasyon, ikili anlaşma), gaz şoku (marjinal fiyatlama), vadeli satış teklifi (hedge), ekipman zammı (CAPEX), şebeke kısıtı, toz (soiling), yerel halk tepkisi (sosyal lisans), sıcak hava dalgası (akşam piki, bakım erteleme), destek programı ve trafo arızası. Seçimlerin etkileri birkaç gün sürer ve haritanın altında etiket olarak görünür.
- **Geri bildirim:** Görev ve rozetlerde kutlama balonu, gün sonunda net kazanç balonu (gelir ya da gider yoksa çıkmaz) ve nakit göstergesinde renkli vuruş. "Ses" düğmesi (varsayılan kapalı) kısa efektleri açar. Sistemde "hareketi azalt" açıksa animasyonlar kapanır.

## Enerji kaynakları

**Fiyat modeli kalibrasyonu.** Türkiye piyasasının saatlik fiyat modeli EPİAŞ 2025 verisiyle karşılaştırılıp ayarlandı (`PRICE`, `src/config.js`): oyunda yıllık ortalama fiyat 65,8 $/MWh (gerçek PTF 66,4), güneşin fiyat oranı %74 (gerçek ~%75, 7 örnek gün), rüzgârın %99 (gerçek %99). Önceki modelde öğle fiyatı ~3 ayda kalıcı olarak sıfıra iniyor, GES yıllık %8 kapasite faktörüne düşüyordu. Avrupa piyasası ENTSO-E 2025 Almanya ve İspanya örnek günleriyle ayrıca ayarlandı (ortalama fiyat 87,9 $/MWh, güneşin piyasa fiyat oranı %53, rüzgâr %90; piyasa bazında `REG.E.mult/sk/wk`). Aynı ayarla tekrarlanan koşular hava modeli nedeniyle farklı sonuç verir (Avrupa ortalama fiyatı 77,9–90,7 $/MWh). **Rüzgâr üretimi kalibrasyonu:** oyunun rüzgâr filosu kapasite faktörü Türkiye'de %27'den %32,6'ya çıktı (TEİAŞ 2025: %32,8; il ağırlıkları EPDK), Almanya'da ~%45'ten %20,2'ye indi (ENTSO-E: %20,2); İspanya %21,8 (ENTSO-E %20,5), Almanya deniz üstü %31,7 (%31,2). Türkiye'de en rüzgârlı ay Ağustos, Almanya'da kış. Hedefler: `scripts/calib_wind.py`; oyun ölçümü: `scripts/wind_fleet.cjs`. Yöntem, veri, önce/sonra tabloları ve sınırlamalar: [docs/kalibrasyon.md](docs/kalibrasyon.md).

**Proje ekonomisi (gerçek dünya karşılığı).** Rapor sekmesinde her santral kaydı için kapasite faktörü (CF), ortalama satış fiyatı, yatırım, LCOE (seviyelendirilmiş enerji maliyeti), NPV (net bugünkü değer), IRR (iç verim oranı) ve geri ödeme süresi gösterilir. Oyunun parası sıkıştırılmış olduğu için (yatırımlar gerçeğin ~1/60'ı) hesap oyun parasıyla değil gerçek dünya ölçeğinde yapılır: üretim ve satış fiyatı santralin oyunda gerçekleşen değerleridir (en az 3 günlük veri), yatırım maliyetleri IRENA *Renewable Power Generation Costs in 2024* küresel ağırlıklı ortalamalarıdır (birincil rapora erişilemedi, raporu aktaran kaynaklardan; deniz enerjisi oyun varsayımı). İşletme gideri, ömür, GES verim kaybı (%0,5/yıl) ve iskonto oranı (WACC, varsayılan %10, kaydırıcıyla %4–16) doğrulanmamış varsayımlardır. Bu tablo vergi ve finansman öncesidir (aşağıda *Proje finansmanı*); enflasyon, arazi, bağlantı, hurda değeri ve dengesizlik maliyeti hariçtir; 30 günden kısa veride mevsimsellik yıllık değeri saptırabilir. Varsayımlar, formüller ve kısaltmalar panelde açılır bölümde yazılıdır.

**Proje finansmanı (borç, vergi, PPA).** Aynı bölümün altında her santral için iki yapı karşılaştırılır: **spot** (tüm üretim piyasaya) ve **PPA** (ilk yıllarda oyunda gerçekleşen ortalama satış fiyatının %10 altında sabit fiyat, sonra piyasa). Yıllık model: FAVÖK = gelir − işletme − yakıt; vergi = (FAVÖK − doğrusal amortisman − faiz − geçmiş yıl zararı) × oran; CFADS = FAVÖK − vergi. Borç eşit taksitli; tutarı, borç oranı üst sınırı ile vade boyunca en düşük CFADS ÷ hedef DSCR'ı sağlayan tutarın küçüğüdür (vergi kalkanıyla yinelemeli). Gösterilenler: borç oranı ve tutarı, en düşük DSCR, vergi sonrası proje IRR'ı, özsermaye IRR'ı, özsermaye geri ödemesi ve spot fiyatın %20 düştüğü stres senaryosunda özsermaye IRR'ı ile en düşük DSCR (borç baz senaryoyla boyutlanır; DSCR < 1 ⚠ ile işaretlenir).

| Varsayım | Varsayılan | Dayanak |
|---|---|---|
| Kredi faizi, Türkiye ve diğer piyasalar | %8,6 | ABD 10 yıllık hazine %5,10 (FRED DGS10, 15.10.2026) + %3,5 marj (varsayım) |
| Kredi faizi, Avrupa | %6,9 | ABD 10 yıllık %5,10 + %1,8 marj (varsayım) |
| Kurumlar vergisi | Türkiye %25, Avrupa %27,5 | Türkiye: ikincil kaynaklar (KVK md. 32); Avrupa: Almanya %29,9 ve İspanya %25 ortalaması (Tax Foundation, OECD 2025) |
| Zarar devri | Türkiye 5 yıl, Avrupa süresiz | KVK md. 9 (ikincil kaynaklar); Avrupa'da yıllık mahsup üst sınırları uygulanmadı |
| Vade, borç oranı üst sınırı, hedef DSCR (spot / PPA), vergi amortismanı, PPA süresi ve indirimi | 12 yıl, %75, 1,40 / 1,20, 10 yıl, 10 yıl, %10 | varsayım |

**Banka kredisi (oyunda).** Santral kartlarında "+5 MW" düğmesinin altındaki **Kredili** düğmesi bloğu kısmen bankadan karşılar: nakitten yalnızca özsermaye payı düşer (`src/loans.js`). Faiz, vade, borç oranı üst sınırı ve hedef DSCR yukarıdaki proje finansmanı varsayımlarıdır (panelden değiştirilince yeni kredilere uygulanır).

- **Zaman ölçeği:** oyunda yatırımlar gerçeğin ~1/63'ü (GES: 691 $/kW × 5 MW ÷ 55 b$), gelir gerçek ölçekte; yatırıma oranla gelir 63 kat hızlı birikir. Bu yüzden ekonomik olarak 1 yıl ≈ 5,8 oyun günü sayılır: yıllık %8,6 faiz oyun günü başına ~%1,43, 12 yıl vade 70 oyun günüdür. Böylece taksitin santral nakit akışına oranı (DSCR) gerçek dünyadakiyle aynı kalır. Takvimin hızı (bir oyun günü 3 takvim günü) bu hesabı etkilemez.
- **Boyutlandırma:** borç = min(%75 × yatırım, CFADS ÷ 1,40 × anüite faktörü). CFADS, oyuncunun aynı piyasada aynı teknolojideki santrallerinin gerçekleşen günlük satış geliri (yakıt düşülmüş) eksi bloğun işletme gideridir (en az 3 günlük veri; oyunda vergi yok). Veri yoksa banka en çok %50 verir (varsayım; gerçekte bağımsız üretim raporuyla boyutlandırılır).
- **Geri ödeme:** ilk 2 yıl (12 oyun günü) ödemesiz, yalnızca faiz; sonra kalan 58 günde eşit taksit (varsayım; proje kredilerinde 1–3 yıllık ödemesiz dönem yaygındır, kaynakla doğrulanmadı). Taksit gün sonunda nakitten düşer; nakit eksiye düşer ve 7 gün düzelmezse iflas kuralı işler. Krediler Rapor sekmesinde (kalan anapara, günlük taksit, kalan gün, gerçekleşen DSCR) listelenir ve cezasız erken kapatılabilir. Portföy değeri borç düşülerek hesaplanır; satın almayı geri almak krediyi de iptal eder.
- **Etki (bot simülasyonu, tek koşular, tahmin):** kazancını hep yeniden yatıran bir botla, kredisiz 1 M$ portföye 57–62., 5 M$'a 162–165. günde; kredili 40–52. ve 116–162. günde ulaşıldı. Ödemesiz dönem olmadan kredi oyunu yavaşlattı (1 M$: 100. gün): DSCR 1,40'la boyutlanan taksit santral nakdinin ~%70'ini aldığından yeniden yatırıma az nakit kalıyordu. Borç, getirisi faizinden az yüksek projede büyümeyi kendiliğinden hızlandırmaz; hızlandıran, ödemesiz dönemde serbest kalan nakittir.

**Batarya fiyatı.** Batarya bloğu (5 MW / 10 MWh) 12 b$'dan 30 b$'a çıktı: diğer teknolojilerle aynı ölçek (IRENA 2024: 192 $/kWh × 10 MWh = 1,92 M$; ÷ 63 ≈ 30 b$). Ölçek tümüyle aynı değil: rüzgâr karada ~1/37, biyokütle ~1/108, offshore ~1/55 (oyun dengesi için bırakıldı).

Varsayımlar panelden değiştirilebilir ve tarayıcıda saklanır. Hariç: inşaat dönemi ve inşaat faizi, kredi komisyonları, borç servis rezervi, kur riski (her şey USD), enflasyon, temettü kısıtları. `scripts/sim_year.cjs` aynı göstergeleri 365 günlük simülasyon için yazdırır.

**Arazi eğimi.** Kara noktası seçilince çevresinin gerçek eğimi ölçülür (AWS Open Data Terrain Tiles, 12. yakınlık, ~30 m/piksel; noktanın 250 m çevresindeki piksellerin ortalama eğimi ve yamacın baktığı yön) ve panelde "Eğim" satırında gösterilir. Düz arazi isteyen tesisler eğimli yerde kurulamaz. Mevzuatta tek bir sınır yok; değerler yaygın saha geliştirme pratiğine göre seçilmiş yaklaşık sınırlardır: GES en çok %10 (güneye bakan yamaçta %15), batarya, biyokütle ve jeotermal santral en çok %10, rüzgâr türbini (yol ve platform) en çok %40; HES için sınır yok. Kurulabilecek hiçbir tesis kalmayan sarp arazi satın alınamaz. Sınır ölçüm sonrası her yeni kurulumda uygulanır; eski kayıtlarda bu sınırları aşan yerlerde kurulmuş santraller korunur. Ölçüm ağ gerektirir; yükseklik verisine ulaşılamazsa panel bunu söyler ve kural uygulanmaz. Rakipler eğim ölçmez, GES'i yalnızca kaba sınıflandırmadaki dağlık bölgelere kurmaz. Potansiyel haritası eğimi göstermez.

**Yerleşim alanları.** Şehir ve kasabaların yapılaşmış bölgelerinde arazi satın alınamaz ve santral kurulamaz (gerçekte büyük ölçekli santral bu alanlara kurulmaz; çatı GES'i oyunda yok). Sınırlar Natural Earth 1:10m Urban Areas poligonlarından gelir (dünyada ~11.900 kentsel alan, ~200 m'ye sadeleştirilmiş, `public/data/urban.bin`); ayrıca büyük bir şehrin merkezine 2 km'den yakın noktalar da yerleşim sayılır. Kaba kıyı çizgisinin denize düşürdüğü kıyı kent dokusu (ör. İstanbul Boğazı kıyıları) da kapsanır. Veri MODIS uydu verisinden (~2002 dönemi, ~500 m–1 km) türetildiği için sonradan büyüyen yerleşimleri ve küçük köyleri göstermez; panel, yerleşim alanında "arazi satın alınamaz" der, potansiyel haritasında bu alanlar boş kalır, rakipler de buralara kurmaz. Eski kayıtlarda bu alanlarda kalan sahalar korunur.

**Güneş ve rüzgâr kaynağı (gerçek iklim verisi).** Puanlar [NASA POWER](https://power.larc.nasa.gov) uzun dönem yıllık ortalamalarından gelir (`src/data/resource.js`, `scripts/build_resource.py`):

- **Güneş:** yatay düzleme gelen yıllık ortalama ışınım (GHI, CERES SYN1deg, 1°). Puan = GHI / 9 kWh/m²/gün (en az 0,12). GES üretimi puanla orantılıdır; Türkiye ortalaması eski modelle aynı düzeyde kalır (Konya ~4,9 kWh/m²/gün → 0,54), çöller yüksek (Ouarzazate ~0,65), bulutlu kuzey düşük (Hamburg ~0,32).
- **Rüzgâr:** 50 m'de yıllık ortalama hız (MERRA-2, 0,5°×0,625°), 100 m göbek yüksekliğine pürüzlülük üssü 0,14 ile taşınır. Puan, oyunun hava modelindeki ortalama göbek hızına karşılık gelir (hız = 4 + 8,5 × puan). Veri ~50 km'lik ortalama olduğu için sırt, boğaz ve burunlardaki yerel hızlanmayı göstermez: dağlık arazide +0,8 m/s, kıyıda +0,3 m/s eklenir, ormanda 0,5 m/s düşülür. Yine de Hatay–Belen gibi orografik rüzgâr bölgeleri veride olduğundan zayıf görünür. Hız ayrıca ülkeye göre bir katsayıyla çarpılır (Türkiye 1,02, Almanya 0,73, İspanya 0,925, Avrupa'nın diğer ülkeleri 0,83, Avrupa denizleri 0,725) ve ülkenin 2025 aylık profiline göre mevsimlenir; katsayılar oyunun filo kapasite faktörünü TEİAŞ ve ENTSO-E 2025 gerçekleşmesine eşitler (bkz. *Rüzgâr üretimi kalibrasyonu*).
- **Hava modeli:** Geçen alçak basınç ve fırtına sistemlerinin rüzgârı sahanın ortalama hızıyla ölçeklenir (rüzgârlı sahada sert, korunaklı ovada zayıf); böylece uzun dönem kapasite faktörü sahanın kaynağını izler. Türbin güç eğrisi 3 m/s'de devreye girer, 11 m/s'de tam güce ulaşır (büyük rotorlu modern türbin), 25 m/s'de durur.
- **Paneldeki rüzgâr değeri:** Noktalar beklenen kapasite faktörü (KF) sınıfıdır: ●○○○○ %12–20, ●●○○○ %20–27, ●●●○○ %27–34 (Türkiye filo ortalaması ~%33), ●●●●○ %34–41, ●●●●● %41 ve üstü. Yanında yıllık ortalama göbek hızı ve tahmini KF yazar (oyunun saatlik rüzgâr dağılımına uyan Weibull eğrisinden; 365 günlük simülasyonlarla ~3 puan hata). Potansiyel haritası aynı sınıfları kullanır.
- **Ölçüm (365 gün, 5 MW, standart ekipman; hava rastgele olduğundan tek yıl ±%10 oynar):** kara RES kapasite faktörü Çanakkale ~%45–48, Kuzey Almanya ~%23–24; Türkiye filosu (EPDK il dağılımı) %32,6, Almanya filosu %20,2; GES Konya ~%21–22.
- **Eski kayıtlar:** Sahaların puanları yüklemede bir kez yeni veriye göre yeniden hesaplanır (bildirim günlüğüne not düşülür); rüzgâr kalibrasyonundan önceki kayıtlarda rüzgâr değeri bir kez daha yeniden hesaplanır.

Oyunda biyokütle santrali "Biyokütle" diye yazılır, "BES" kısaltması kullanılmaz: batarya depolama sistemi (BESS) ile karışmasın diye. Kayıtlardaki iç kodlar değişmedi (`bes`, `batt`).

| Teknoloji | Nerede | Nasıl üretir | Öğrettiği |
|---|---|---|---|
| GES (güneş) | Karada | Güneş yüksekliği ve buluta göre, gündüz | Kanibalizasyon: öğle fiyatı düşer |
| RES (rüzgâr), offshore | Karada; sığ denizde | Göbek yüksekliğindeki rüzgârla güç eğrisi | Tahmin hatası, kesme hızı |
| HES (hidro) | Dağlık bölge | Suyu en pahalı saatlere saklar | Esneklik, kuraklık riski |
| JES (jeotermal) | Jeotermal kuşaklar (Batı Anadolu, İzlanda, Toskana, Doğu Afrika Riftı, Endonezya, Filipinler, Yeni Zelanda, Kaliforniya, Japonya …) | Gece gündüz sabit (~%90 kapasite) | Baz yük, tahmin hatası yok; yüksek yatırım ve **sondaj riski**: ilk blokta rezervuar beklenenin %55–110'u çıkar |
| Biyokütle (biyokütle/biyogaz santrali) | Ova, orman, dağlık (hammaddesi olan kara) | Yakıt yakar; yalnızca fiyat yakıt maliyetini aştığı saatlerde çalışır | **Marjinal maliyet** kararı; yakıt gideri raporda ayrı satır |
| Deniz (gelgit + dalga) | Sığ deniz; güçlü gelgit kıyıları (Fundy, Manş, İskoçya, Kore, KB Avustralya …) | Gelgit günde iki kez güçlenir (12,42 saatlik döngü, önceden hesaplanır), dalga rüzgâra bağlı | Gelişmekte olan teknoloji: 25 MW kurulu güçten sonra açılır, üretime MWh başına +60 $ **yenilik desteği**; Türkiye denizlerinde gelgit zayıftır |
| Batarya (BESS, depolama) | Karada | Arbitraj veya dengeleme | Depolama |

Ölçüm (aynı tohum, 5 günlük ortalama, 5 MW blok başına, standart ekipman): JES (Denizli) kapasite faktörü 0,88–0,96, geri dönüş ~55–60 gün (zayıf rezervuarda ~110 gün); Biyokütle (Konya) KF ~0,78, yakıt sonrası geri dönüş ~70–80 gün; deniz (Fundy) KF ~0,42, destekle ~90 gün; aynı dönemde GES ~57–71 gün. Değerler oyun dengesi için temsilîdir.

## Haritada tesis görünümü ve canlılık

- Yakınlaşınca (düz haritada ~11. yakınlıktan, Apple haritasında benzer mesafeden) saha noktasının arkasında tesisin kendisi görünür: sahanın 3D modeli (`src/ui/sitemodel.js`) tarayıcıda güneyden hafif eğik bakan bir kamerayla gerçek ölçekli, saydam bir görüntüye çizilir (`src/ui/siteimage.js`) ve sahanın koordinatına yerleştirilir. Görüntü her yakınlıkta gerçek boyutundadır (büyütülmez; uzaktayken sahayı işaret noktası gösterir). Güneş öğleden sonra güney-güneybatıdan vurur, gölgeler saydam bir zeminle uydu görüntüsünün üstüne düşer; çakıl ve beton alanlar yarı saydamdır. three.js yalnızca ilk yakınlaşmada yüklenir; santral listesi değişince görüntü yenilenir.
- O saatte üretim yapan sahanın çevresinde teknoloji renginde bir nabız halkası atar.
- 3D görünümde rotorlar, GES parıltısı, batarya fanları, HES su sıçraması, JES buharı, biyokütle santralinin dumanı ve konveyörü, gelgit rotorları ve dalga şamandıraları üretim durumuna göre hareket eder. Hareket azaltma ayarında durur.

## Mevsimler

Oyun 20 Mart 2026'da başlar; her oyun günü takvimi 3 gün ilerletir (bir yıl = 120 oyun günü). Başlıkta tarih ve mevsim görünür; mevsim değişince bildirim gelir.

- **Güneş:** Gün doğumu/batımı ve öğle güneşinin yüksekliği güneşin eğimine göre değişir (Türkiye enleminde gün yazın ~14,5, kışın ~9,4 saat). Cesium'un güneşi de oyun takvimini kullanır.
- **Rüzgâr:** Orta enlemlerde kışın güçlü, yazın sakin; Ege'de yaz meltemi tersine yazın güçlenir.
- **Hava sistemleri:** Kışın alçak basınç kuşağı güneye iner (Akdeniz'e yağmur), yazın kuzeye çekilir; sıcak hava kütleleri yaz yaşanan yarımkürede doğar.
- **Kar:** Soğuk bölgelerde yağış kar olarak düşer: GES panelleri 2 gün karla kaplanır (%25 üretim), HES sahasında kar birikir ve ilkbaharda eriyerek suya dönüşür.
- **Talep ve fiyat:** Aylık talep çarpanı (kışın ısınma, yazın klima yüksek; ilkbaharda düşük); güney yarımkürede mevsimler ters.
- **Olaylar:** Yazın kuraklık, sıcak hava ve toz; kışın fırtına kartları daha sık çıkar.

8 günlük örnek (Aydın GES, TR fiyat): Nisan KF 0,20 / 49 $/MWh, Temmuz 0,35 / 54, Ekim 0,21 / 58, Ocak 0,07 / 72.

## Hava durumu

Dünya üzerinde ~30 hava sistemi dolaşır: alçak basınçlar (bulut, yağmur, kuvvetli ve dönen rüzgâr), yüksek basınçlar (açık ve durgun hava), fırtına hücreleri ve sıcak hava kütleleri. Orta enlemlerde batıdan doğuya, tropiklerde doğudan batıya ilerler, ömürleri boyunca güçlenip zayıflarlar; Avrupa-Türkiye çevresinde biraz daha sık doğarlar. Yeni sistemler tohumlu rastgele sayıyla doğduğu için paneldeki hava tahmini gün içindeki gerçekleşmeyle aynıdır; GÖP masasındaki üretim tahmini ise buna hata ekler (aşağıda). Model gerçek örüntülere benzeyen bir oyun simülasyonudur, meteorolojik tahmin değildir.

- **Üretim:** GES, sahanın o saatteki bulut örtüsüne göre ortalamasının etrafında dalgalanır (tam kapalı havada ~%20). RES, göbek yüksekliğindeki rüzgârdan güç eğrisiyle üretir: 3 m/s'de başlar, 12 m/s'de tam güç, 25 m/s üstünde kesme hızında durur. HES'in su bütçesi son günlerin yağışıyla değişir.
- **Fiyat:** Her piyasanın temsilî noktasındaki saatlik bulut ve rüzgâr fiyatı belirler (rüzgârlı gece ucuz, bulutlu öğle pahalı); sıcak hava akşam talebini artırır.
- **Harita:** 6 km yükseklikte, gece tarafı karartılan bulut katmanı (yağmur ve fırtına bulutları daha koyu, fırtınalarda şimşek) ve fırtına hücrelerine kesikli uyarı halkası. Yaklaştıkça bulutlar incelir, sahaları kapatmaz. "Hava katmanı" düğmesi görselleri kapatır (etkiler sürer).
- **Panel ve 3D:** Seçili noktada anlık hava ve günün kalan saatleri için 3 saatlik tahmin; türbinler rüzgârın estiği yöne döner. Fırtına bir rüzgâr sahasında kesme hızını aşınca bildirim gelir.

Kalibrasyon (6 tohum × 30 gün): Türkiye sahalarında RES kapasite faktörü eski modelle uyumlu (Aydın ~0,34, Kars ~0,48), offshore ~0,52, güneş ortalaması sahanın uzun dönem ortalamasının ~%95'i; Türkiye'de yağışlı saat oranı ~%20.

## GÖP masası ve dengesizlik

Her gün başında yenilenebilir santrallerin (GES, RES, offshore) o günkü saatlik üretim tahmini hazırlanır ve oyuncu GÖP masasında ne kadarını gün öncesi piyasasında satacağını seçer. Teklif edilen miktar (taahhüt) GÖP fiyatından satılır. Gerçekleşen üretim teklifinden saparsa fark dengesizlik fiyatından kapanır: eksik üretim PTF'nin %35 fazlasıyla alınır, fazla üretim PTF'nin %30 altından satılır. (Gerçek piyasada dengesizlik fiyatı PTF ve SMF'den türetilir; bu oranlar oyun dengesi için temsilîdir.)

- **Tahmin hatası:** Saatler arasında ilişkilidir (bir saat yüksek tahmin edildiyse sonraki saatler de büyük olasılıkla yüksektir) ve gün içinde ileriye doğru büyür. Rüzgârda güç eğrisinin dik bölgesinde (4,5–11,5 m/s) ve fırtınada, güneşte parçalı bulutlu havada artar.
- **Teklif oranı:** %70–110. Düşük teklif eksik riskini azaltır ama fazlayı ucuza satarsın; ceza neredeyse simetrik olduğundan en iyi teklif çoğu gün tahmine yakındır.
- **Tahmin servisi:** Premium servis hatayı yarıya indirir, yenilenebilir MW başına günlük 4 $ ücretlidir. Tüccar uzmanlığı hatayı ayrıca %35 azaltır.
- **Batarya:** Arbitraj (ucuz saatte şarj, pahalı saatte deşarj), dengeleme (sapmayı karşılar) veya boşta.
- **Gün içi:** Masa "GÖP masası" düğmesiyle yeniden açılabilir; değişiklik yalnızca kalan saatlere uygulanır. Olay kartı üretimi veya fiyatı değiştirirse kalan saatlerin teklifi yeniden hesaplanır. "Otomatik gönder" seçiliyse masa her gün kendiliğinden açılmaz.
- **Rapor:** Dünün raporunda dengesizlik maliyeti, eksik/fazla MWh, tahmin hatası oranı, batarya dengeleme ve servis ücreti ayrı satırlarda görünür.

Ölçüm (Aydın 5 MW GES + 5 MW RES, Çanakkale 5 MW RES, 5 MW batarya; aynı tohumla 2 dönem × 25 gün): standart serviste tahmin hatası üretimin ~%13'ü, dengesizlik maliyeti yenilenebilir piyasa değerinin ~%3'ü; premium serviste hata ~%7–9, maliyet ~%1,5–1,7. Teklif oranı %100, %90–95 ve %110'dan biraz daha kârlı çıktı.

## Rakipler ve haber bandı

Üç kurgusal şirket (Kuzgun Enerji, Mavi Ufuk Güç, Tundra Renewables) dünyanın güneşli ve rüzgârlı bölgelerinde saha açar; sahaların ~%60'ı Türkiye'dedir. Her şirketin günlük yatırım bütçesi birikir, yeterince biriktiğinde yeni saha (20–40 MW) açar ya da mevcut sahasını 10 MW büyütür. Yeni saha 3 gün inşaatta kalır.

- **Harita:** Rakip sahaları şirket renginde eşkenar dörtgenle görünür (inşaattakiler soluk). Dokununca panelde şirket, kapasite ve durum çıkar.
- **Arazi:** Rakip sahasının 20 km yakınında saha açılamaz; rakipler de oyuncunun sahalarından uzak durur.
- **Piyasa:** İşletmedeki rakip güneşi öğle fiyatlarını, rakip rüzgârı rüzgârlı saatlerin fiyatını düşürür (oyuncunun kendi kapasitesinden daha zayıf bir etkiyle).
- **Sıralama:** Profil penceresinde oyuncu ve rakipler portföy değerine göre sıralanır (rakip değeri = birikmiş bütçe + yatırım tutarı + arazi). 120 günlük ölçümde rakiplerin portföyü 3,9–5,8 M$'a ulaştı.
- **Haber bandı:** Başlığın altında en yeni haber görünür, diğerleri 7 saniyede bir döner; dokununca son 14 haber listelenir. Kaynaklar: rakip yatırımları, oyuncu sahaları için fırtına/kar uyarıları, piyasa fiyat rekorları ve sıfır fiyat, olay kartları, mevsim değişimi. Hareket azaltma ayarında geçiş animasyonu kapanır.

## Ses ve kamera

- **Ortam sesi** ("Ses" düğmesiyle açılır; ses dosyası yok, WebAudio ile üretilir): kameranın bulunduğu noktanın havasına göre rüzgâr (hız arttıkça yükselir ve tizleşir), yağmur ve fırtınada ara ara gök gürültüsü. Yere yaklaştıkça hava sesi artar, uzaydan bakarken yalnızca hafif bir uğultu kalır. Oyuncunun rüzgâr sahasına ~4 km yaklaşınca türbin sesi eklenir: kanat geçişleriyle dalgalanır, üretim arttıkça güçlenir. Sekme arka plandayken ses durur.
- **Açılış:** Kamera uzaydan dönerek Türkiye'ye iner.
- **Sinematik tur:** Kurulu sahanın panelindeki "🎬 Sinematik tur" kamerayı sahaya indirir ve etrafında yavaşça döndürür (~70 sn'de bir tur, en fazla 75 sn). Haritaya dokunmak veya kaydırmak turu bitirir.
- Hareket azaltma ayarı açıksa açılış ve tur animasyonsuz yapılır.
- **Grafik kalitesi** ("Grafik" düğmesi: Otomatik → Yüksek → Dengeli → Düşük): Yüksek 4x kenar yumuşatma ve ekranın piksel oranında (en fazla 2x) çizim; Dengeli kenar yumuşatmayı FXAA'ya çevirir, CSS pikseli çözünürlüğünde çizer ve Google 3D'den daha az ayrıntı yükler; Düşük ayrıca çözünürlüğü %80'e indirir, gölgeleri kapatır, boşta 24 kare/sn çizer. Otomatik mod ekran kartına göre başlar (Intel HD/UHD ve giriş seviyesi GeForce MX → Dengeli, yazılımla çizim → Düşük) ve kare hızı uzun süre 20'nin altında kalırsa bir kademe düşer. Adresin sonuna `?fps` eklenirse haritanın köşesinde kare hızı görünür (düz harita yalnızca değişince çizildiği için haritayı kaydırırken anlamlıdır; 3D görünümde Cesium'un kare hızı ve süresi). Düz harita yazıların keskin kalması için ekranın piksel yoğunluğunda (Düşük'te en fazla 1,5x) çizilir; Düşük'te arazi gölgesi kapanır.

## Arkadaş ligi

Oyuncular bir davet koduyla aynı lige katılır ("🏆 Lig" düğmesi). Sıralama portföy değerine göredir; her satırda şirket adı, ünvan, kurulu güç ve oyun günü görünür. Kişi adı paylaşılmaz. Bir oyuncu yeni bir eşiği geçince (10, 25, 50, 100 … MW; 500 b$, 1 M$, 2,5 M$; 5 M$ hedefi; yeni ünvan) lige duyuru düşer; diğer oyuncular bunu haber bandında ve bildirim balonunda görür. Lige katılırken mevcut ilerleme yeniden duyurulmaz.

- **Sunucu:** Firebase Firestore ve anonim giriş (e-posta/şifre yok, tarayıcı başına bir kimlik). Firebase SDK'sı yalnızca bir lige katılınca yüklenir.
- **Güvenlik kuralları** (`firebase/firestore.rules`): lig listesi okunamaz, kodu bilen ligi görür; herkes yalnızca kendi kaydını yazar; alanların tipi ve aralığı denetlenir, serbest metin yoktur (duyuru metni istemcide türden üretilir); kayıt en fazla 10 sn'de bir güncellenir; duyurular değiştirilemez ve silinemez; yalnızca lig üyesi duyuru yazabilir. Kurallar Firebase emülatöründe 29 senaryoyla test edildi.
- **Sınır:** Skorlar oyuncunun tarayıcısında hesaplanır. Kurallar biçimi ve sıklığı denetler ama bilerek sahte değer gönderen birini tamamen engelleyemez; davet kodlu arkadaş grubu için tasarlandı.

**Kurulum (bir kez):**
1. [Firebase konsolunda](https://console.firebase.google.com) **yeni** bir proje açın (Google Analytics gerekmez). Ücretsiz Spark planında kalır; mevcut, faturalandırma bağlı Google Cloud projesini seçmeyin.
2. Build → Authentication → Get started → Sign-in method → **Anonymous** → Enable. Settings → Authorized domains'e `emresoykan.github.io` ekleyin.
3. Build → Firestore Database → Create database → konum `eur3 (europe-west)` → **production mode**.
4. Firestore → Rules sekmesine `firebase/firestore.rules` dosyasının içeriğini yapıştırıp **Publish**.
5. Proje ayarları (dişli) → General → Your apps → Web (`</>`) → uygulamayı kaydedin (Hosting gerekmez) → gösterilen `firebaseConfig` nesnesini kopyalayın.
6. GitHub depo → Settings → Secrets and variables → Actions → New repository secret: ad `FIREBASE_CONFIG`, değer kopyaladığınız `{ ... }` nesnesi. Sonraki yayında "🏆 Lig" düğmesi görünür.

Firebase web yapılandırması gizli anahtar değildir (tarayıcıya gömülür, erişimi güvenlik kuralları korur); yine de depoya yazılmaz, secret olarak verilir. Yerel test: `npx firebase emulators:start --only auth,firestore --project demo-sebeke` ve geliştirme sunucusunda `?fbemu=127.0.0.1`.

## Bulut kayıt

Ayarlar → "Bulut kaydı aç". Lig ile aynı Firebase projesini kullanır (anonim giriş, ücretsiz Spark planı); `FIREBASE_CONFIG` yoksa bölüm hiç görünmez.

- **Kurtarma kodu:** Açınca 16 karakterlik rastgele bir kod üretilir (`ABCD-EFGH-JKLM-NPQR`, karışan O/0/I/1 harfleri yok, ~80 bit). Kayıt `saves/{KOD}` belgesinde durur; kodu bilen okur, yazar ve siler, kayıt listesi okunamaz. Kod bir şifre gibi saklanmalı; Ayarlar'da gizli gösterilir, "Göster" ve "Kopyala" ile alınır.
- **Saklanan veri:** Oyun durumu (tek JSON metni, en fazla 800 KB) ve profil (şirket adı, oyuncu adı, renk, uzmanlık; en fazla 4 KB). Başka bir şey gönderilmez.
- **Eşitleme:** Açıkken oyun günü bittikçe en fazla 90 saniyede bir ve oyun değiştiyse, ayrıca sekme gizlenirken yazılır; "Şimdi kaydet" elle yazar. Sunucu bir kaydı en fazla 20 saniyede bir günceller. Oyuncu başına saatte en fazla ~40 yazma; Spark planının günlük ücretsiz kotası (Firebase'in sayfasına göre 20.000 yazma, 50.000 okuma) küçük bir oyuncu grubu için yeterlidir.
- **Yükleme:** Buluttan yükleme yalnızca oyuncu kodu girip onaylayınca olur, yerel ilerleme sessizce ezilmez. Yüklenen cihaz aynı kodla eşitlemeye devam eder.
- **Kapatma:** "Kapat" bu cihazda eşitlemeyi durdurur (buluttaki kopya kodla erişilebilir kalır); "Buluttan sil" kopyayı da siler.
- **Sınır:** Anonim girişte hesap yoktur; kod kaybolursa buluttaki kayda ulaşılamaz. Aynı kodu iki cihazda aynı anda oynamak son yazanın kazanmasıyla sonuçlanır.
- **Kurallar** (`firebase/firestore.rules`, `saves` bölümü): kod biçimi, alan listesi, tip ve boyut sınırları, sunucu zamanı ve 20 sn güncelleme aralığı denetlenir. Emülatörde 19 senaryoyla test edildi (lig kurallarının 29 senaryosu da geçiyor).

**Kurulum:** Lig için yapılan kurulum yeterli; yalnızca güncel `firebase/firestore.rules` içeriği Firebase konsolunda Firestore → Rules sekmesine yapıştırılıp **Publish** edilmeli (yoksa sunucu bulut kaydı reddeder ve oyunda "Sunucu isteği reddetti" yazar).

## Gerçek santraller katmanı (dünya, OpenStreetMap)

Harita düğmelerindeki santral simgesi dünyadaki gerçek elektrik santrallerini gösterir. Noktalar teknoloji renginde ve gücün kareköküyle büyür; 8. yakınlıktan itibaren ad ve güç yazılır. Bir noktaya dokununca adı, türü, gücü ve (rüzgârda) türbin sayısı ipucu olarak görünür; oyundaki seçim değişmez. Lejant haritanın ortasındaki ülkenin özetini gösterir (denizdeyse dünya toplamı); Türkiye'de OSM'de gücü yazılı santrallerin TEİAŞ 2025 kurulu gücüne oranını (kapsama) da verir. Lejanttaki satıra dokununca o tür gizlenir ya da gösterilir; "Yalnızca yenilenebilir" kısayolu fosil, nükleer, batarya ve bilinmeyen türleri gizler, "Hepsi" geri açar (seçim tarayıcıda saklanır). Fosil santraller bilerek gösterilir: fiyatı çoğu saatte onlar belirler, oyuncu ise yalnızca yenilenebilir santral kurar. Düz haritada GeoJSON çember katmanı, Apple haritasında karo görüntüsü olarak çizilir (`src/ui/realplants.js`).

- **Yükleme:** katman açılınca `index.json` (ülke özetleri) ve `world.json` (100 MW ve üstü santraller) yüklenir; dünya görünümünde yalnızca bunlar çizilir. Harita 4,5. yakınlığı geçince görünen ülkelerin (merkeze en yakın 8 ülke) `{ISO3}.json` dosyaları yüklenir ve o ülkelerin tüm santralleri çizilir; en son kullanılan 24 ülke bellekte tutulur.
- **Veri:** `public/data/plants/`, `scripts/build_osm_plants.py` ile üretilir. GitHub Actions (`.github/workflows/osm-plants.yml`) Geofabrik'in kıta çıkarımlarını (Afrika, Asya, Avustralya-Okyanusya, Orta Amerika, Avrupa, Kuzey Amerika, Rusya, Güney Amerika) indirir, `osmium tags-filter` ile `power=plant` nesnelerini ve rüzgâr türbinlerini (`generator:source=wind`) süzer; her kıta ayrı işte işlenir, son iş birleştirip ülke dosyalarını yazar ve aynı dala commit eder (elle ya da betik değişince). Overpass API'nin ortak sunucuları dünya taraması için güvenilir olmadı (18.10.2026 denemesinde 6 saat boyunca çoğunlukla HTTP 502/500/504; güney yarımküre bile bitmedi); betik küçük alanlar için Overpass'la karo karo sorguyu (`--bbox`) hâlâ destekler. Alanlar için merkez dış halkanın ortalama noktası, alan büyüklüğü sınır kutusundan alınır. Türbinler 2 km komşulukla kümelenir; küme 3 km içinde bir rüzgâr santraline bağlanır (gücü yoksa türbin güçleri toplanır), değilse en az 2 türbin ya da 1 MW ise ayrı santral olur. Santraller Natural Earth ülke sınırlarıyla (`src/data/countries.json`) ülkeye atanır; kıyı ve deniz santralleri en yakın ülkeye (münhasır ekonomik bölge sınırı kullanılmadığından komşu ülkeye düşebilir). `index.json` içindeki `meta.sources` birleştirilen kıtaları listeler; bir kıta başarısız olduysa orada eksik görünür.
- **Eleme (boyut için):** gücü 1 MW'tan küçük santraller; gücü ve adı yazılmamış, yalnızca nokta olarak işli ya da alanı 2 hektardan küçük güneş santralleri. Bu yüzden çatı ve küçük arazi GES'leri ile küçük hidro ve biyogaz tesislerinin bir kısmı görünmez.
- **Lisans:** © OpenStreetMap katkıcıları, ODbL 1.0 (atıf lejantta ve Ayarlar alt bilgisinde).
- **Türkiye kapsaması (18.10.2026, eleme öncesi):** 1.922 santral. OSM'de gücü yazılı toplam, TEİAŞ 2025 kurulu gücüne göre: hidro %83, kömür ~%100, doğalgaz %115, rüzgâr %55, jeotermal %24, güneş %17, biyokütle %15. Lisanssız GES'ler ve gücü yazılmamış santraller eksik. %100'ün üstü, OSM'de kapanmış ya da çift yakıtlı santrallerin de bulunmasından gelebilir. Akkuyu (4.800 MW) TEİAŞ'ın 2025 kurulu gücünde yer almaz. Diğer ülkeler için resmî kurulu güçle karşılaştırma henüz yok.

- **Vaka çalışması:** `public/vaka/` (Türkçe) ve `public/case-study/` (İngilizce), yayında `…/sebeke-oyun/vaka/` ve `…/sebeke-oyun/case-study/`. Fiyat modelinin EPİAŞ ve ENTSO-E 2025 verisiyle kalibrasyonunu, aynı modelle 5 MW GES ve RES için Türkiye ve Avrupa'da LCOE, NPV, IRR sonuçlarını ve WACC duyarlılığını anlatır. Sayılar `scripts/sim_year.cjs` ile üretildi (Türkiye 2, Avrupa 3 bağımsız 365 günlük koşu); koşudan koşuya fark hava modeli ve rastgelelikten gelir. Oyundan Ayarlar → "Vaka çalışması" ile açılır.
- **Geri bildirim formu** (`src/ui/feedback.js`): Ayarlar → "Geri bildirim ver". Anonimdir: alan, deneyim bandı, beş 1–5 puanlık soru (fiyat, proje ekonomisi ve saha kurallarının gerçekçiliği; tablonun anlaşılırlığı; capture oranının öğretilmesi), 0–10 tavsiye puanı ve üç kısa metin. İsteğe bağlı oyun özeti (oyun günü, santral sayısı ve türleri, MW, piyasalar, masaüstü/mobil) eklenir; profil adı ve şirket adı eklenmez. Metinde e-posta ya da telefon numarası görünürse gönderim durdurulur.
- **Pilot bağlantısı:** `…/sebeke-oyun/?geribildirim`. Oyuncu önce oynar; form 15 dakika ya da 8 oyun günü sonra bir kez kendiliğinden açılır.
- **Teslim:** `FIREBASE_CONFIG` tanımlıysa "Gönder" yanıtı `feedback/{anonim uid}` belgesine yazar; tarayıcı başına bir yanıt tutulur, en fazla 30 sn'de bir değiştirilebilir, oyundan hiç kimse okuyamaz (yanıtlar Firebase konsolunda, Firestore → `feedback`). Sunucu yoksa ya da gönderim başarısız olursa yanıt panoya kopyalanır veya JSON olarak indirilir.
- **Kurallar** (`firebase/firestore.rules`, `feedback` bölümü): alan listesi, seçenek değerleri, puan aralıkları, metin boyu (en fazla 600 karakter) ve sunucu zamanı denetlenir. Emülatörde 21 senaryoyla test edildi; lig (29) ve bulut kayıt (19) senaryoları da geçiyor. **Kurulum:** güncel kural dosyası Firebase konsolunda Firestore → Rules sekmesine yapıştırılıp **Publish** edilmeli.

## Harita

**Apple Haritalar (isteğe bağlı ana harita).** `MAPKIT_TOKEN` secret'ı tanımlıysa oyun Apple'ın haritasında (MapKit JS) oynanır: varsayılan hibrit görünüm (uydu görüntüsü + yol ve yer adları), Apple'ın sağ üstteki düğmesiyle Standart/Uydu/Hibrit seçilir ve seçim hatırlanır. Sahalar, rakipler, seçim halkası, korunan alanlar, gece tarafı, bulutlar ve fırtına halkaları bu haritada da çizilir (`src/ui/mapkit.js`). MapKit yüklenemezse veya belirteç reddedilirse oyun aşağıdaki düz haritaya döner; `?map=maplibre` ile düz harita zorlanabilir. Tarayıcı grafik işlemci kullanmıyorsa (SwiftShader, llvmpipe gibi yazılımla çizim: sanal makine, uzak masaüstü) Apple haritasında uydu karoları, etiketler ve dokunulan nokta birbirinden kayabildiği için (bir test raporunda Çanakkale'ye dokununca Sırbistan seçildi) oyun kendiliğinden düz haritayı açar; `?map=apple` ile Apple haritası yine de zorlanabilir.

Belirteç kurulumu (Apple Developer Program üyeliği gerekir; ücretsiz kota Apple'ın sayfasına göre üyelik başına günde 250.000 harita görüntüleme ve 25.000 servis çağrısı):
1. [developer.apple.com/account](https://developer.apple.com/account) → Certificates, Identifiers & Profiles → Services → Maps → Configure.
2. Usage Dashboard'da Tokens → (+). Token Type: **MapKit JS**; Restriction Type: **Domain**; Websites: `emresoykan.github.io`; süre seçin; Create.
3. Belirteci kopyalayıp GitHub'da Settings → Secrets and variables → Actions → New repository secret: ad `MAPKIT_TOKEN`. Belirteç alan adına kısıtlı olduğu için sayfaya gömülür; yine de sohbet veya depoya yazılmaz.
4. main'e bir sonraki yayında Apple haritası açılır. Yerel geliştirmede `.env.local` içine `VITE_MAPKIT_TOKEN=...` yazılabilir (belirtecin alan adı listesine `localhost` eklenmişse).

Oyun düz bir dünya haritasında (Web Mercator, MapLibre GL) oynanır; görünüm koyu temalı dünya haritalarından örnek alındı: derinliğe göre gölgelenmiş koyu lacivert denizler, mavimsi yeşil kabartmalı kara, gri-haki çöller, mavimsi gri buz. Uzak planda ülke sınırı ve ülke adı yoktur; kıta adları aralıklı büyük harfle, okyanus ve deniz adları italik açık maviyle yazılır. Sınırlar ve ülke adları yakınlaştıkça soluk olarak belirir, şehirler büyüklüğüne göre sırayla gelir. Bu zemin oyunla gelen iki görüntüdür (dünya ~2,4 km/piksel, Türkiye ve çevresi ~300 m/piksel; `scripts/build_relief.py`), bu yüzden harita sunucusuna ulaşılamasa da harita çalışır. Çevrimiçiyken yakınlaştıkça zemin AWS arazi verisinden (terrarium, ~13. yakınlığa kadar) yeniden renklendirilir: deniz derinliği lacivert tonlarıyla, karada yükseklik renkle ve kabartma gölgesiyle; denizde gölge yumuşatılır. Ayrıca [OpenFreeMap](https://openfreemap.org) vektör katmanları (kıyı ve göller, nehirler, otoyol ve yollar, şehir ve kasaba adları; Türkçe ad varsa o) eklenir. Vektör katmanları yüklenemezse oyunun kendi ülke adları, şehirleri ve sınırları gösterilir. Arazi verisine hiç ulaşılamazsa yakınlaşma sınırlanır (bulanık büyütme gösterilmez). Dış sunucuya erişemeyen önizleme derlemesi Türkiye için ~120 m/piksel ayrıntılı kabartma karolarını içinde taşır (`scripts/build_relief_hd.py`; göller yükseklik verisindeki düz yüzeylerden bulunur). Yazı tipleri (Noto Sans) sitede barındırılır.

- **Gece/gündüz:** Güneşin o saatteki yüksekliğinden hesaplanan yumuşak alacakaranlıklı gece gölgesi; mevsime göre kutuplarda gece veya gündüz uzar.
- **3D yakın görünüm:** Kurulu sahanın panelindeki "3D yakından bak" ve "🎬 Sinematik tur", harita alanının üstünde CesiumJS ile 3D görünümü açar (Google 3D Tiles anahtarı varsa gerçek arazi ve binalar). Cesium yalnızca bu pencere ilk açılınca yüklenir; pencere kapalıyken çizim döngüsü durur. "← Haritaya dön" veya Esc düz haritaya döner.

Oyuncu haritanın herhangi bir noktasına dokunup orada saha açar. Noktanın ülkesi, piyasası, arazi tipi ve kaynak potansiyeli `world.js` içinde gerçek coğrafyadan hesaplanır:

- **Ülke ve piyasa:** Natural Earth ülke sınırları; ülkeler oyunun 8 piyasasına eşlenir (`scripts/build_geo.py`, `market()`).
- **Arazi tipi:** Natural Earth dağ silsilesi, çöl ve havza poligonları. Toros ve Doğu Anadolu dağları ile tayga ve Güneydoğu Asya ormanları elle/kuralla yaklaşık eklenmiştir. Korunan alanlar `src/data/protected.js` içindeki temsili dairelerdir.
- **Deniz:** Bir ülke kıyısına en fazla 200 km uzaklıktaki deniz noktaları offshore için uygundur.
- **3D santraller:** Kurulu sahalarda gerçek ölçekli, prosedürel 3D modeller çizilir (dış model dosyası yok; uzaktan büyütülmez, ~60 km'den uzakta yalnızca saha işareti kalır). Boyutlar yaygın saha değerlerine göre seçilmiş yaklaşık değerlerdir: GES ~1,1 ha/MW (sabit eğimli, iki dikey modüllü 4,6 m masalar, 9,5 m sıra aralığı); rüzgârda 5 MW başına bir türbin (rotor ~128 m, göbek ~100 m), türbinler arası rotor çapının ~3,5 katı, sıralar arası ~5 katı.
- **Araziye oturtma:** Google 3D Tiles açıkken kamera sahaya ~3 km yaklaşınca ve sonra her belirgin yaklaşmada (mesafe ~%40 azalınca; Google yakında daha ayrıntılı zemin yükler) ekranda yüklü 3D karolardan saha alanının zemin yükseklikleri ölçülür (en çok 16×16 noktalık ızgara, 3×3 medyan süzgeciyle tek ağaç/direk sıçramaları atılır; türbin ve binalar için kendi noktalarında beşer ölçümün medyanı). Her panel masası (~26 m) kendi zeminine iner ve iki ucunun yüksekliğine göre yamaç boyunca eğilir; türbin, trafo ve binalar kendi zeminlerine oturur. Çakıl, beton ve yol alanları modelden çıkarılıp araziye ve 3D dokuya serilir. Ölçüm bitene kadar model tek noktadan zemine oturan düz hâliyle görünür; model yalnızca zemin belirgin değiştiyse (>0,4 m) yeniden kurulur, yenisi hazır olana kadar eskisi görünür; ölçüm sonucu tarayıcı konsoluna "Saha araziye oturtuldu" satırıyla yazılır. Google 3D açıkken kamera zemine ~40 m'ye kadar inebilir (gömülü dünya dokusunda 600 m). HES vadi modeli bir bütün olarak oturur; deniz sahalarında oturtma yapılmaz. Rüzgâr gülleri o saatin rüzgârıyla döner (ataletle hızlanır/yavaşlar), gece kanat ucu ikaz ışıkları yanıp söner; paneller güneş ve gökyüzünü yansıtır, invertör ışığı üretim/kısıntı durumunu gösterir; HES planlı üretim saatlerinde dolusavaktan su bırakır; batarya LED'leri şarjda yeşil, deşarjda turuncu yanar. Cesium saati oyun saatine bağlıdır (Türkiye saati, ekinoks tarihi): güneşin konumu, gece/gündüz sınırı ve gölgeler gerçek coğrafyaya göre hesaplanır. Panelde "3D yakından bak" kamerayı eğik açıyla sahaya götürür. Sistemde "hareketi azalt" açıksa hareket durur, modeller kalır.
- **3D'de yakın görüntü:** 3D görünümün gömülü dünya dokusu yaklaşık 10 km/piksel olduğu için yakında bulanıklaşır. Türkiye ve çevresinde (25,6–45°D, 35,7–42,3°K) bunun yerine 2024–2025 yaz aylarının az bulutlu Sentinel-2 sahnelerinden üretilmiş ~300 m/piksel mozaik kullanılır. Bulutlar SCL sınıflandırmasıyla ayıklanır, denizler tek tip renge çekilir, her sahnenin geniş ölçekli rengi Blue Marble'a eşlenir (karo sınırı görünmez), Tuz Gölü gerçek Sentinel rengiyle kalır. Bina ölçeğinde netlik yalnızca Google 3D Tiles ile gelir.
- **3D'de gece/gündüz:** 3D görünümde gece tarafında NASA şehir ışıkları görünür; Google 3D Tiles kullanılırken sahne geceleri karartılır.
- **Saha kuralları:** Bir sahada en fazla 40 MW kurulur; iki saha arasında en az 20 km olmalıdır (yakına dokunmak mevcut sahayı seçer).

Kayıt anahtarı `sebeke-world-v3`. Kare tabanlı eski sürümün kayıtları (`sebeke-world-v2`) bu sürümle uyumlu değildir ve yüklenmez (silinmez).

### Verileri yeniden üretmek

```bash
pip install pillow numpy
python3 scripts/build_geo.py                      # Natural Earth'ten src/data/*.json
python3 scripts/build_relief.py                   # düz haritanın kabartmalı zemini (AWS Terrain Tiles, ~300 karo indirir)
python3 scripts/build_relief_hd.py                # önizleme için Türkiye ayrıntılı karoları (public/relief-hd, depoya eklenmez; ~1.600 karo indirir)
pip install numcodecs
python3 scripts/build_resource.py                 # güneş/rüzgâr kaynak ızgarası (NASA POWER, AWS Open Data; src/data/resource.js, ~270 KB)
python3 scripts/build_urban.py                    # yerleşim alanları (Natural Earth 1:10m Urban Areas; public/data/urban.bin, ~950 KB)
# Dünya görüntüleri: three-globe npm paketindeki NASA kopyaları
npm pack three-globe && tar xzf three-globe-*.tgz
cp package/example/img/earth-blue-marble.jpg public/textures/earth-day.jpg
cp package/example/img/earth-night.jpg public/textures/earth-night.jpg
# Türkiye Sentinel-2 mozaiği (AWS Open Data sentinel-cogs; ~7 dk, ağ gerekir)
pip install rasterio mgrs
python3 scripts/build_sentinel_mosaic.py --bluemarble public/textures/earth-day.jpg --stash /tmp/s2.npz
# --stash: ham sahne verisini saklar; sonraki çalıştırmalar indirmeden saniyeler içinde yeniden birleştirir
```

## Kaynaklar ve lisanslar

- Uydu görüntüsü: NASA Blue Marble ve gece ışıkları NASA Black Marble (NASA Earth Observatory), kamu malı; kaynak dosyalar three-globe npm paketindeki kopyalar.
- Türkiye yakın görüntüsü: Contains modified Copernicus Sentinel data 2024–2025 (Copernicus Sentinel-2 L2A, [AWS Open Data](https://registry.opendata.aws/sentinel-2-l2a-cogs/)). Copernicus verisi kaynak gösterilerek serbestçe kullanılabilir.
- 3D motor: [three.js](https://threejs.org), MIT.
- Güneş ve rüzgâr kaynağı: [NASA POWER Projesi](https://power.larc.nasa.gov) (NASA Langley Research Center), Analysis Ready Data ([AWS Open Data](https://registry.opendata.aws/nasa-power/), `s3://nasa-power`), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Yıllık ortalama ALLSKY_SFC_SW_DWN (CERES SYN1deg) ve WS50M (MERRA-2).
- Yerleşim alanları: [Natural Earth](https://www.naturalearthdata.com) 1:10m Urban Areas (MODIS uydu verisinden türetilmiş kentsel alanlar), kamu malı.
- Ülke sınırları, şehirler, coğrafi bölgeler ve kıyı çizgisi: [Natural Earth](https://www.naturalearthdata.com), kamu malı.
- 3D görünüm motoru: [CesiumJS](https://cesium.com/platform/cesiumjs/), Apache 2.0.
- Düz harita motoru: [MapLibre GL JS](https://maplibre.org), BSD-3-Clause.
- Vektör harita: [OpenFreeMap](https://openfreemap.org) (ücretsiz, anahtarsız; atıf gerekir) © [OpenMapTiles](https://www.openmaptiles.org), veriler © [OpenStreetMap](https://www.openstreetmap.org/copyright) katkıcıları (ODbL). Atıf haritanın köşesinde gösterilir.
- Kabartma ve arazi gölgesi: [AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/); United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey; ETOPO1: NOAA; bölgesel kaynakların tam listesi: [joerd attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md).
- Harita yazı tipi: Noto Sans ([protomaps/basemaps-assets](https://github.com/protomaps/basemaps-assets) glifleri), SIL Open Font License 1.1 (`public/fonts/OFL.txt`).
- Google Photorealistic 3D Tiles (isteğe bağlı): Google Maps Platform şartlarına tabidir; Google logosu ve veri kaynakları ekranda gösterilir.
