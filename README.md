# sebeke-oyun

Şebeke: Dünya — yenilenebilir enerji portföyü kurma oyunu (prototip v2). Vite + vanilla JS (ES modülleri).

## Çalıştırma

```bash
npm install
npm run dev      # geliştirme sunucusu
npm run build    # dist/ altına üretim derlemesi
npm run preview  # derlemeyi yerelde sun
```

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
| `src/ui/map.js` | MapLibre 3D küre: uydu katmanı, sınırlar, şehirler, korunan alanlar, sahalar |
| `src/ui/panel.js` | Seçili nokta/saha paneli ve buton durumları |
| `src/ui/hud.js` | Fiyat/üretim grafiği, göstergeler, rapor, trend |
| `src/main.js` | Giriş noktası: oyun döngüsü, kontroller, ilk yükleme |
| `src/data/` | Üretilmiş harita verisi (ülkeler, ülke etiketleri, şehirler, arazi bölgeleri, kıyı çizgisi) ve korunan alan listesi |
| `public/tiles/` | Uydu karoları (Web Mercator, z0–z4) |
| `public/fonts/` | Harita etiketleri için Noto Sans glif dosyaları |
| `scripts/` | Harita verisini ve karoları yeniden üreten Python script'leri |

`S` ve `D` modüller arasında canlı bağlama (live binding) olarak okunur; yeniden atama yalnızca `setS`/`setD` ile yapılır.

## Harita

Oyuncu kürenin herhangi bir noktasına dokunup orada saha açar. Noktanın ülkesi, piyasası, arazi tipi ve kaynak potansiyeli `world.js` içinde gerçek coğrafyadan hesaplanır:

- **Ülke ve piyasa:** Natural Earth ülke sınırları; ülkeler oyunun 8 piyasasına eşlenir (`scripts/build_geo.py`, `market()`).
- **Arazi tipi:** Natural Earth dağ silsilesi, çöl ve havza poligonları. Toros ve Doğu Anadolu dağları ile tayga ve Güneydoğu Asya ormanları elle/kuralla yaklaşık eklenmiştir. Korunan alanlar `src/data/protected.js` içindeki temsili dairelerdir.
- **Deniz:** Bir ülke kıyısına en fazla 200 km uzaklıktaki deniz noktaları offshore için uygundur.
- **Saha kuralları:** Bir sahada en fazla 40 MW kurulur; iki saha arasında en az 20 km olmalıdır (yakına dokunmak mevcut sahayı seçer).

Kayıt anahtarı `sebeke-world-v3`. Kare tabanlı eski sürümün kayıtları (`sebeke-world-v2`) bu sürümle uyumlu değildir ve yüklenmez (silinmez).

### Verileri yeniden üretmek

```bash
pip install pillow numpy
python3 scripts/build_geo.py                      # Natural Earth'ten src/data/*.json
npm pack three-globe && tar xzf three-globe-*.tgz # Blue Marble görüntüsü: package/example/img/earth-blue-marble.jpg
python3 scripts/build_tiles.py package/example/img/earth-blue-marble.jpg public/tiles --maxzoom 4
```

## Kaynaklar ve lisanslar

- Uydu görüntüsü: NASA Blue Marble (NASA Earth Observatory), kamu malı.
- Ülke sınırları, şehirler, coğrafi bölgeler ve kıyı çizgisi: [Natural Earth](https://www.naturalearthdata.com), kamu malı.
- Fontlar: Noto Sans (GoNotoKurrent derlemesinden glif dosyaları, `smp-noto-glyphs` paketi), SIL Open Font License 1.1, bkz. `public/fonts/OFL.txt`.
- Harita motoru: [MapLibre GL JS](https://maplibre.org), BSD-3-Clause.
