# Haftalık gerçek dünya güncellemeleri

Oyunun Türkiye tarafını güncel tutmak için haftalık kayıt. Amaç gerçeği haftası haftasına kopyalamak değil, kuralları ve
tarifeleri güncel tutmak.

## Süreç
1. **Başlıklar:** O haftanın gelişmeleri başlık olarak gelir (ör. "157 sayılı İlke Kararı yayımlandı"). Kurum içi belge,
   bülten ya da kamuya açık olmayan bilgi kullanılmaz; oyunun sitesi ve kodu herkese açıktır.
2. **Doğrulama:** Her madde birincil kaynaktan doğrulanır (EPİAŞ, EPDK, Resmî Gazete, Bakanlık). Birincil kaynağa
   ulaşılamazsa ikincil kaynak kullanılır ve bu not edilir.
3. **Ayırma:** Her madde dört gruptan birine girer:
   - oyun kuralı ya da tarife (koda girer),
   - fiyat kalibrasyonu girdisi (haftalık değil, çeyreklik ya da yıllık tam veriyle; `docs/kalibrasyon.md`),
   - yalnızca haber (`src/data/realnews.js`; oyun takvimi tarihe gelince haber bandında),
   - oyuna girmez (oyunda karşılığı yok, ya da gerçek şirket adı içerir; oyundaki şirketler kurgusaldır).
4. **Uygulama:** Öneri onaylanınca uygulanır; test, sürüm notu (`src/changelog.js`) ve bu kayıt güncellenir.

## 2026-11-04

| Gelişme | Grup | Oyundaki karşılığı | Kaynak ve doğrulama |
|---|---|---|---|
| YEKDEM: yıllık başvuru (30 Kasım), Ekim 2026 tarifesi, depolamalı RES/GES fiyatı | Kural ve tarife | YEKDEM mekaniği (`src/yekdem.js`, `config.js` `YEKDEM`) | EPDK duyurusu "2027 yılı YEKDEM Başvurularının Alınması Hakkında" (19.10.2026; EPDK MCP ile okundu, birincil). Ekim 2026 tarife tablosu (GES/karasal RES 289,74, depolamalı 341,74 kuruş/kWh) ve depolamalı fiyatın yalnızca depolanıp şebekeye verilen enerjiye uygulanması: ikincil kaynaklar (yesilhaber.net, aa.com.tr); EPİAŞ'ın kendi tablosu doğrulanamadı. Kur: EPİAŞ PTF dolar karşılığı, 1 Ekim 2026 (birincil). |
| 157 sayılı İlke Kararı: nitelikli doğal koruma alanlarında RES için 50 MWm sınırı kalktı, en çok 18 türbin | Yalnızca haber | Haber bandı, 3 Kasım 2026 | Resmî Gazete 3 Kasım 2026, sayı 33419; ikincil kaynaklardan (dunya.com, musavirlerkulubu.com.tr). Resmî Gazete metni doğrulanamadı. Oyunda bu alanların haritası yok; oyundaki korunan alanlar milli parktır ve karar onları kapsamaz. |
| Haftalık PTF (26 Ekim – 1 Kasım 2026): 3.303,5 TL/MWh; 08–20 saatleri 3.507, diğer saatler 3.100 | Kalibrasyon girdisi | Oyuna girmez (haftalık oynaklık) | EPİAŞ Şeffaflık Platformu, PTF (EPİAŞ MCP, birincil) |
| Çeyreklik fiyat kontrolü: 2026 Ocak–Ekim PTF 44,7 $/MWh (2025 aynı dönem 66,1; oyunun ilk yılı 66,2). Düşüşün yarısı TL fiyattan (ilkbahar, çok yüksek hidro üretimi), yarısı kurdan | Kalibrasyon girdisi | Kalibrasyon değişmedi; "hidrolojik yıl" mekaniği önerildi (`docs/kalibrasyon.md`, "Türkiye 2026 kontrolü") | EPİAŞ PTF USD ve TL (birincil); TEİAŞ aylık/yıllık hidro üretimi ve kurulu güç (birincil); TCMB EVDS reel efektif kur (birincil) |
| Hidrolojik yıl: 2026 çok yağışlı (HES kapasite faktörü ~%33, tahmin); ilkbahar fiyatları çöktü (TL'de Nisan −%62, Mayıs −%76) | Kural (çeyreklik kontrolden) | Hidrolojik yıl mekaniği (`src/hydro.js`, `config.js` `HYDRO`); 2026 gerçek yıl, sonrakiler 2015–2025'ten seçilir; haber bandında 1 Haziran 2026 fiyat haberi | EPİAŞ aylık PTF, TL (birincil); TEİAŞ aylık/yıllık hidro üretimi ve kurulu güç (birincil). 2026 yıl sonu değeri tahmin; TEİAŞ yıllık verisi yayımlanınca `HYDRO.known` güncellenecek. |
| YEKA RES-2026 (2 Kasım; 7 yarışma, 1.500 MWe) ve GES-2026 (3 Kasım; 11 yarışma, 785 MWe): hepsi taban fiyatta (3,50 ve 3,25 €c/kWh), rekabet katkı payıyla (RES 0–154, GES 16–91 bin €/MW); sözleşmeden sonra 72/60 ay serbest piyasa, sonra 20 yıl sabit fiyat | Kural (olay kartı) ve haber | YEKA kartı (`src/yeka.js`, `config.js` `YEKA`); sabit fiyat gerçek fiyatın 2026 PTF ortalamasına oranıyla oyuna taşındı (RES 58,2, GES 54,0 $/MWh); haber bandında 2 ve 3 Kasım 2026 | İkincil kaynaklar (Forbes Türkiye, Enerji Bülteni, Yeşil Haber, Aksiyon, Bloomberg HT; arama sonuçlarından). Kaynaklar arasında il bazında farklar var: RES'te bazı illerde 3,53–3,62 €c/kWh, GES'te dört ilin katkı payı ve kazananı. Oyunda yalnızca kaynaklarda tutarlı kazanan teklifler kullanıldı. Bakanlık duyurusu ve şartname doğrulanamadı (enerji.gov.tr bu ortamda kapalı). Kazanan şirketler oyuna girmez. |
| Lisanssız 2026: 3.500 MW (iletim 1.500, dağıtım 2.000; EPDK 14353, 26.02.2026), şirket başına iletimden 75 MW; iletimde 30 Eylül'de 38,3 MW kaldı. Depolamalı ön lisans: üretim gücü ≤ depolama gücü (RG 19.11.2022) | Kural | Şebeke bağlantı kapasitesi (`src/grid.js`, `config.js` `GRID`): yıllık 75 MW serbest kontenjan (30 Eylül'e kadar), depolamalı yol; haber bandında 2 Mart ve 30 Eylül 2026 | TEİAŞ'ın 2 Mart 2026 duyurusu (başlığı aramada görüldü, metni açılamadı); 75 ve 10 MW sınırları, kalan kapasiteler ve depolamalı oran ikincil kaynaklardan (Yeşil Haber, Enerji Haber, Doğa Yidinle, hukuk bürosu yayınları). Resmî Gazete 19.11.2022 metni açılamadı; bir kaynak sonradan oran kuralının değiştiğini söylüyor, doğrulanamadı. |

Erişim notu: resmigazete.gov.tr, enerji.gov.tr, teias.gov.tr, dunya.com, yesilhaber.net, gensed.org, enerjibulteni.com bu çalışma ortamının ağ ayarlarında kapalıydı; birincil metinler
açıldığında yeniden doğrulanacak.
