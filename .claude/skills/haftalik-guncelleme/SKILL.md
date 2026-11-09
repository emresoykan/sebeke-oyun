---
name: haftalik-guncelleme
description: Oyunun Türkiye tarafını haftalık gerçek dünya gelişmeleriyle güncelle. Başlıkları birincil kaynaktan doğrula, dört gruba ayır, uygula, test et, docs/guncellemeler.md'ye kaydet, PR aç. Kullanıcı başlık listesi verdiğinde, "haftalık güncelleme" dediğinde ya da /haftalik-guncelleme yazdığında kullan.
---

# Haftalık gerçek dünya güncellemesi

Amaç gerçeği haftası haftasına kopyalamak değil, oyunun kurallarını, tarifelerini ve haberlerini güncel tutmak. Süreç ve
geçmiş kayıtlar: `docs/guncellemeler.md`. Yanıtlar Türkçe; önce sonuç, sonra kanıt, riskler ve öneri.

## Kurallar (her adımda)
- Yalnızca kamuya açık bilgi. Kurum içi bülten, şirket belgesi ya da kamuya açık olmayan bilgi kullanılmaz; kullanıcı böyle
  bir belge verirse yalnızca başlıklarını kamuya açık kaynaklarla doğrulayarak kullan, belgenin kendisini kaynak gösterme.
- Gerçek şirket adları oyuna girmez (oyundaki şirketler kurgusal). Kazanan şirketler, sözleşme tarafları yazılmaz.
- Her sayı için: kaynak, yayın tarihi, verinin ait olduğu dönem, birim. Birincil kaynak açılamazsa ikincil kaynak kullan ve
  bunu kayıtta açıkça yaz. Kaynaklar çelişirse farkı yaz; tutarlı olmayan değeri oyuna koyma.
- Doğrulanmamış bir şeyi doğrulanmış gibi yazma. Tahminleri "tahmin" diye etiketle.
- Anahtar, belirteç, kişisel veri commit edilmez.

## 0. Hazırlık
1. Dalı main'le eşitle: `git fetch origin main`; squash birleştirmeden sonra `git diff HEAD origin/main` boşsa
   `git merge -s ours origin/main`. Zorla gönderme yok.
2. `node scripts/weekly_values.cjs`: oyundaki gerçek dünya değerlerinin listesi (YEKDEM, fiyat düzeyi, hidroloji, YEKA,
   bağlantı kapasitesi, yatırım katsayıları, destekler, gerçek dünya haberleri). Bu hafta neyin kontrol edileceğini buradan seç.

## 1. Başlıklar
Kullanıcının verdiği başlıkları listele. Başlık yoksa yalnızca 2. adımdaki düzenli kontrolleri yap.

## 2. Doğrulama
Her başlık için birincil kaynağı ara (araçlar oturumda yüklü değilse ToolSearch ile yükle):
- EPDK duyuruları: `mcp__EPDK-MCP__search_epdk_announcements` (yalnızca yakın dönem penceresi).
- EPİAŞ PTF: `mcp__BESS_ARBITRAJ__bess_get_prices` (market `epias`, zone `TR1`, currency `USD` ya da `TRY`) veya
  `mcp__EPIAS_MCP__get_ptf`.
- TEİAŞ üretim ve kurulu güç: `mcp__TEIAS_EUAS_MCP__teias_get_monthly_energy` (metric `hidro`, `rüzgar`, `güneş`, `tüketim`),
  `teias_get_installed_capacity`.
- Kur ve makro: `mcp__TCMB_FRED_MCP__get_tcmb_series`, `get_fred_series`.
- Avrupa: `mcp__ENTSOE_MCP__*`.
- Diğerleri için WebSearch. Bu ortamda kapalı olduğu görülen alan adları (bir kez denemek yeter, açılmazsa ikincil kaynağa
  geç ve kayda yaz): resmigazete.gov.tr, enerji.gov.tr, teias.gov.tr, gov.uk, irena.org.

Düzenli kontroller (başlık olmasa da):
- **Her hafta:** son 7 günün PTF ortalaması (USD ve TL); oyunun Türkiye düzeyiyle kıyas yalnızca not olarak, kalibrasyon
  değişmez.
- **Her ay başı:** EPİAŞ'ın yeni YEKDEM tablosu → `config.js` `YEKDEM` (`p`, `store`, `asOf`; dolar karşılığı ay başındaki
  PTF dolar kuruyla). Son TEİAŞ aylık hidro verisi → `HYDRO.known` içindeki yılın tahmini.
- **Çeyrekte bir:** tam fiyat kontrolü, `docs/kalibrasyon.md`'deki "Türkiye 2026 kontrolü" bölümünün yöntemiyle (EPİAŞ
  aylık USD ve TL, TEİAŞ hidro, TCMB reel kur). Yağışlı ya da kurak bir ilkbahardan sonra saat gruplarını da karşılaştır
  (EPİAŞ saatlik PTF; `docs/kalibrasyon.md` "Saatlik dağılım", `calib_hydro.cjs` saat grubu tablosu). Kalibrasyon yalnızca
  tipik bir yılı temsil eden kanıtla değişir.
- **Olay oldukça:** azami fiyat (fiyat tavanı) değişikliği (EPDK kararı; EPİAŞ PTF'nin en yüksek değeri) → `REG.T.cap`
  (TL değerin o günkü kurla dolar karşılığı; normal yıl ortalamasına oranı ~1,5 korunur, `calib_shape.cjs` ile ölç),
  YEKA turları (yeni il, fiyat, katkı payı), deniz üstü YEKA, lisanssız kapasite duyuruları, offshore
  fark sözleşmesi turları, IRENA yıllık maliyet raporu (Temmuz).

## 3. Ayırma
Her madde dört gruptan birine girer (`docs/guncellemeler.md`):
1. **Kural ya da tarife** → koda girer: `src/config.js` (YEKDEM, YEKA, GRID, HYDRO, CAPEX_M), `src/support.js` (CAP, H2SUB,
   CFD) ya da ilgili modül (`src/yekdem.js`, `src/yeka.js`, `src/grid.js`, `src/hydro.js`).
2. **Fiyat kalibrasyonu girdisi** → haftalık değil; çeyreklik ya da yıllık tam veriyle, `docs/kalibrasyon.md`.
3. **Yalnızca haber** → `src/data/realnews.js` (`id`, `d`: gelişmenin tarihi, `i`: simge, `t`: metin, kaynağıyla tutarlı
   sayılar). Oyun takvimi o tarihe gelince haber bandında bir kez görünür.
4. **Oyuna girmez** → oyunda karşılığı yok ya da gerçek şirket adı içerir.

Öneriyi kullanıcıya kısa bir tabloyla sun (gelişme, grup, oyundaki karşılığı, kaynak ve doğrulama durumu). Kural
değişikliği oyun dengesini belirgin etkiliyorsa (fiyat düzeyi, kurulum engeli, destek miktarı) uygulamadan önce sor;
haber ve tarife güncellemelerinde onay bekleme.

## 4. Uygulama
1. Değişiklikleri yap. Yeni kural için test ekle ya da ilgili testi genişlet (`scripts/test_*.cjs`).
2. Sürüm notu: oyuncunun fark edeceği değişiklik varsa `src/changelog.js` en üstüne kayıt (id: tarih; aynı gün ikinci
   yayın `.2`).
3. Kayıt: `docs/guncellemeler.md` içinde haftanın tarihli bölümüne satır (gelişme, grup, oyundaki karşılığı, kaynak ve
   doğrulama). Erişilemeyen alan adlarını erişim notuna ekle.
4. Belge: kural değiştiyse `README.md` ilgili bölümü.
5. Test: `node scripts/test_all.cjs` (kendi Vite sunucusunu açar ve kapatır; çalışırken `src/` altında dosya değiştirme).
   Yalnızca ilgili testler için `--only grid,yeka`. Derleme: `npx vite build --base=/sebeke-oyun/`.
6. Commit (açıklayıcı Türkçe mesaj), push, PR. Birleştirme kullanıcı isteyince.

## 5. Rapor
Kullanıcıya Türkçe, önce sonuç: neler değişti, neler yalnızca haber oldu, neler girmedi ve neden. Doğrulanamayanları ve
erişilemeyen kaynakları ayrıca yaz. Sonunda birleştirme sorusu ve bekleyen işler.
