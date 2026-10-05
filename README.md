# sebeke-oyun

Şebeke: Dünya — yenilenebilir enerji portföyü kurma oyunu. Vite + vanilla JS (ES modülleri), CesiumJS 3D dünya, three.js ile kurulan 3D santraller.

## Çalıştırma

```bash
npm install
npm run dev      # geliştirme sunucusu
npm run build    # dist/ altına üretim derlemesi
npm run preview  # derlemeyi yerelde sun
npm run build:preview  # dosya sayısı sınırlı yerler için hafif derleme (göreli yollar, az Cesium varlığı)
```

### Google Photorealistic 3D Tiles

Gerçek 3D dünya (arazi, binalar, yüksek çözünürlüklü görüntü) için bir Google Maps Platform API anahtarı gerekir. Anahtar yoksa ya da yüklenemezse oyun gömülü NASA görüntüleriyle çalışır.

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
| `src/ui/weatherLayer.js` | Haritada bulut katmanı, şimşek, rüzgâr okları ve fırtına uyarı halkaları |
| `src/market.js` | GÖP ve dengesizlik: gerçek üretim, ilişkili tahmin hatası, teklif (taahhüt), saatlik uzlaştırma, bataryayla dengeleme |
| `src/ui/desk.js`, `src/ui/modal.js` | GÖP masası penceresi; gün başı pencerelerinin (olay kartı, masa) sırası |
| `src/rivals.js` | Kurgusal rakip şirketler: saha seçimi, yatırım bütçesi, inşaat, piyasaya etkisi, portföy değeri |
| `src/news.js`, `src/ui/ticker.js` | Haber bandı: rakip hamleleri, hava uyarıları, fiyat rekorları, olaylar, mevsim |
| `src/mods.js` | Olaylardan gelen geçici etkiler (fiyat, üretim, sabit fiyat, prim, maliyet, arıza riski) |
| `src/ui/mission.js`, `src/ui/eventcard.js`, `src/ui/fx.js` | Görev çubuğu, olay kartı penceresi, bildirim balonları, kutlama ve ses |
| `src/ui/profile.js` | Başlıktaki profil rozeti, ilk açılışta şirket kurma formu, profil penceresi |
| `src/ui/map.js` | CesiumJS 3D dünya: Google 3D Tiles veya gömülü NASA görüntüleri, gece/gündüz, sınırlar, şehirler, korunan alanlar, sahalar, tıklama |
| `src/ui/models.js` | 3D santral modelleri: three.js ile kurulur, glTF olarak Cesium'a verilir; rotor, ikaz ışığı, dolusavak ve LED canlandırması |
| `src/plantstatus.js` | Sahadaki santrallerin o saatteki çalışma durumu (3D modeller ve panel ortak kullanır) |
| `src/ui/panel.js` | Seçili nokta/saha paneli, ekipman kartları ve buton durumları |
| `src/ui/hud.js` | Fiyat/üretim grafiği, göstergeler, rapor, trend |
| `src/main.js` | Giriş noktası: oyun döngüsü, kontroller, ilk yükleme |
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

## Görevler, olay kartları ve geri bildirim

- **Görev zinciri:** Haritanın üstündeki çubuk sıradaki görevi, kısa bir açıklamayı ve ödülü gösterir. 14 görev oyunun ilk yarım saatini yönlendirir: arazi alma, izin, ilk santral, kârlı gün, ilk olay kararı, rüzgâr ve batarya ile çeşitlendirme, ikinci ve üçüncü piyasa, 25 MW, dolu saha, 500 b$ ve 1 M$ portföy. Eski kayıtlarda geçmişte tamamlanan görevler ödülsüz geçilir.
- **Olay kartları:** İlk santralden sonra, 3. günden itibaren gün başında yaklaşık %45 olasılıkla bir olay çıkar (ilk olay garantili, iki olay arasında en az bir gün). Oyun durur, oyuncu seçeneklerden birini seçer. Olaylar gerçek piyasa olgularından esinlenir ve her kartta bir "piyasa notu" vardır: kuraklık, fırtına (kesme hızı, sigorta), tatil günü öğle fiyat çöküşü (kanibalizasyon, ikili anlaşma), gaz şoku (marjinal fiyatlama), vadeli satış teklifi (hedge), ekipman zammı (CAPEX), şebeke kısıtı, toz (soiling), yerel halk tepkisi (sosyal lisans), sıcak hava dalgası (akşam piki, bakım erteleme), destek programı ve trafo arızası. Seçimlerin etkileri birkaç gün sürer ve haritanın altında etiket olarak görünür.
- **Geri bildirim:** Görev ve rozetlerde kutlama balonu, gün sonunda net kazanç balonu ve nakit göstergesinde renkli vuruş. "Ses" düğmesi (varsayılan kapalı) kısa efektleri açar. Sistemde "hareketi azalt" açıksa animasyonlar kapanır.

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
- **Harita:** 6 km yükseklikte, gece tarafı karartılan bulut katmanı (yağmur ve fırtına bulutları daha koyu, fırtınalarda şimşek); bölgeye yaklaşınca rüzgâr okları (uzunluk hız, renk şiddet) ve fırtına hücrelerine kesikli uyarı halkası. Yaklaştıkça bulutlar incelir, sahaları kapatmaz. "Hava katmanı" düğmesi görselleri kapatır (etkiler sürer).
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
- **Grafik kalitesi** ("Grafik" düğmesi: Otomatik → Yüksek → Dengeli → Düşük): Yüksek 4x kenar yumuşatma ve ekranın piksel oranında (en fazla 2x) çizim; Dengeli kenar yumuşatmayı FXAA'ya çevirir, CSS pikseli çözünürlüğünde çizer ve Google 3D'den daha az ayrıntı yükler; Düşük ayrıca çözünürlüğü %80'e indirir, gölgeleri kapatır, boşta 24 kare/sn çizer. Otomatik mod ekran kartına göre başlar (Intel HD/UHD ve giriş seviyesi GeForce MX → Dengeli, yazılımla çizim → Düşük) ve kare hızı uzun süre 20'nin altında kalırsa bir kademe düşer. Adresin sonuna `?fps` eklenirse haritanın köşesinde kare hızı ve kare süresi görünür.

## Harita

Oyuncu kürenin herhangi bir noktasına dokunup orada saha açar. Noktanın ülkesi, piyasası, arazi tipi ve kaynak potansiyeli `world.js` içinde gerçek coğrafyadan hesaplanır:

- **Ülke ve piyasa:** Natural Earth ülke sınırları; ülkeler oyunun 8 piyasasına eşlenir (`scripts/build_geo.py`, `market()`).
- **Arazi tipi:** Natural Earth dağ silsilesi, çöl ve havza poligonları. Toros ve Doğu Anadolu dağları ile tayga ve Güneydoğu Asya ormanları elle/kuralla yaklaşık eklenmiştir. Korunan alanlar `src/data/protected.js` içindeki temsili dairelerdir.
- **Deniz:** Bir ülke kıyısına en fazla 200 km uzaklıktaki deniz noktaları offshore için uygundur.
- **3D santraller:** Kurulu sahalarda gerçek oranlı, prosedürel 3D modeller çizilir (dış model dosyası yok). Uzaktan görünsün diye en az 120 piksel çizilir; yaklaştıkça gerçek ölçeğe döner. Rüzgâr gülleri o saatin rüzgârıyla döner (ataletle hızlanır/yavaşlar), gece kanat ucu ikaz ışıkları yanıp söner; paneller güneş ve gökyüzünü yansıtır, invertör ışığı üretim/kısıntı durumunu gösterir; HES planlı üretim saatlerinde dolusavaktan su bırakır; batarya LED'leri şarjda yeşil, deşarjda turuncu yanar. Cesium saati oyun saatine bağlıdır (Türkiye saati, ekinoks tarihi): güneşin konumu, gece/gündüz sınırı ve gölgeler gerçek coğrafyaya göre hesaplanır. Panelde "3D yakından bak" kamerayı eğik açıyla sahaya götürür. Sistemde "hareketi azalt" açıksa hareket durur, modeller kalır.
- **Yakın görüntü:** Gömülü dünya dokusu yaklaşık 10 km/piksel olduğu için yakında bulanıklaşır. Türkiye ve çevresinde (25,6–45°D, 35,7–42,3°K) bunun yerine 2024–2025 yaz aylarının az bulutlu Sentinel-2 sahnelerinden üretilmiş ~300 m/piksel mozaik kullanılır. Bulutlar SCL sınıflandırmasıyla ayıklanır, denizler tek tip renge çekilir, her sahnenin geniş ölçekli rengi Blue Marble'a eşlenir (karo sınırı görünmez), Tuz Gölü gerçek Sentinel rengiyle kalır. Bina ölçeğinde netlik yalnızca Google 3D Tiles ile gelir.
- **Gece/gündüz:** Dünyanın gece tarafında NASA şehir ışıkları görünür; Google 3D Tiles kullanılırken sahne geceleri karartılır.
- **Saha kuralları:** Bir sahada en fazla 40 MW kurulur; iki saha arasında en az 20 km olmalıdır (yakına dokunmak mevcut sahayı seçer).

Kayıt anahtarı `sebeke-world-v3`. Kare tabanlı eski sürümün kayıtları (`sebeke-world-v2`) bu sürümle uyumlu değildir ve yüklenmez (silinmez).

### Verileri yeniden üretmek

```bash
pip install pillow numpy
python3 scripts/build_geo.py                      # Natural Earth'ten src/data/*.json
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
- Ülke sınırları, şehirler, coğrafi bölgeler ve kıyı çizgisi: [Natural Earth](https://www.naturalearthdata.com), kamu malı.
- 3D dünya motoru: [CesiumJS](https://cesium.com/platform/cesiumjs/), Apache 2.0.
- Google Photorealistic 3D Tiles (isteğe bağlı): Google Maps Platform şartlarına tabidir; Google logosu ve veri kaynakları ekranda gösterilir.
