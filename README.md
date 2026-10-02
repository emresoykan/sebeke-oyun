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
| `src/actions.js` | Saha açma (arazi alma), izin başvurusu, santral kurma |
| `src/ui/map.js` | CesiumJS 3D dünya: Google 3D Tiles veya gömülü NASA görüntüleri, gece/gündüz, sınırlar, şehirler, korunan alanlar, sahalar, tıklama |
| `src/ui/models.js` | 3D santral modelleri: three.js ile kurulur, glTF olarak Cesium'a verilir; rotor, ikaz ışığı, dolusavak ve LED canlandırması |
| `src/plantstatus.js` | Sahadaki santrallerin o saatteki çalışma durumu (3D modeller ve panel ortak kullanır) |
| `src/ui/panel.js` | Seçili nokta/saha paneli ve buton durumları |
| `src/ui/hud.js` | Fiyat/üretim grafiği, göstergeler, rapor, trend |
| `src/main.js` | Giriş noktası: oyun döngüsü, kontroller, ilk yükleme |
| `src/data/` | Üretilmiş harita verisi (ülkeler, ülke etiketleri, şehirler, arazi bölgeleri, kıyı çizgisi) ve korunan alan listesi |
| `public/textures/` | Gömülü dünya görüntüleri: NASA Blue Marble (gündüz) ve Black Marble (gece), 4096×2048; Türkiye ve çevresi için Sentinel-2 mozaiği (`tr-*.jpg`, ~300 m/piksel) |
| `scripts/` | Harita verisini ve Sentinel-2 Türkiye mozaiğini yeniden üreten Python script'leri |
| `.github/workflows/pages.yml` | GitHub Pages yayını |

`S` ve `D` modüller arasında canlı bağlama (live binding) olarak okunur; yeniden atama yalnızca `setS`/`setD` ile yapılır.

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
