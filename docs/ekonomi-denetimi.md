# Teknoloji ekonomisi denetimi (29.10.2026, düzeltilmiş sürüm)

Oyundaki 14 teknolojinin proje ekonomisini üç piyasada (Türkiye T, Avrupa E, Kuzey Amerika N) ölçüp gerçek dünya kıyaslarıyla karşılaştırır. Amaç, oyuncuya yanlış ders veren aykırılıkları bulmaktır.

> **Düzeltme.** İlk sürümdeki ölçüm betiği piyasanın ortalama fiyatını yanlış ölçüyordu: günün piyasa verisini (`D`) başta bir kez okuyup yıl boyunca ilk günün fiyatlarını kullanıyordu. Santrallerin satış fiyatı, KF, LCOE ve IRR bundan etkilenmedi; yakalama oranları ve "Avrupa fiyatı koşudan koşuya 58–124 $/MWh oynuyor" bulgusu yanlıştı. Betik düzeltildi, bu sürümdeki tüm değerler yeniden ölçüldü. Doğru ölçümde Avrupa'nın yıllık fiyatı koşular arasında ±%3–6 değişiyor. Asıl sapma, Avrupa'da rüzgârın yakalama oranının yüksek olmasıydı (0,97; gerçek ~0,90). Bu, fiyattaki rüzgâr etkisi filo bölgelerine bağlanarak giderildi ([kalibrasyon](kalibrasyon.md), "Avrupa rüzgârının fiyat etkisi"). Aşağıdaki sonuçlar yeni modelle ölçüldü.

> **Güncelleme (30.10.2026).** Türkiye'nin fiyat düzeyi ilk oyun yılına göre yeniden ayarlandı (`REG.T.mult` 0,92; [kalibrasyon](kalibrasyon.md)). Türkiye satırları bu ayarla yeniden ölçüldü (120 gün × 3 koşu). Avrupa ve Kuzey Amerika satırları 29.10.2026 ölçümüdür; o piyasalarda model değişmedi. İlk sürümde "Türkiye fiyatı ~%8 kaymış" diye yazılan fark kayma değil, tanım farkıydı: ilk 120 gün, 365 günlük (üç takvim yılı) kalibrasyonla karşılaştırılmıştı.

## Sonuç

- **Çoğu teknoloji gerçekle aynı büyüklükte.**
  - **Doğrulanmamış kıyaslarla uyumlu:** GES, CSP, biyokütle ve jeotermalin kapasite faktörü (KF) ve LCOE'si IRENA 2024 küresel ortalamalarına yakın; yüzer RES NREL'in ABD değerine, deniz enerjisi Avrupa literatür aralığına uyuyor. Bu kıyas değerlerinin hiçbiri birincil belgeden okunamadı (kaynak tablosuna bakın).
  - **Birincil veriyle doğrulanan:** Türkiye'de HES'in KF'si TEİAŞ 2022–2025 filo değerleriyle (%20–27) uyumlu.
- **En büyük sapma, piyasaya göre değişmeyen yatırım maliyeti.**
  - Oyun her piyasada IRENA'nın küresel ağırlıklı ortalama yatırım maliyetini kullanıyor. Bu ortalama Çin'in düşük maliyetlerinin ağırlığını taşıyor.
  - Sonuç olarak Avrupa'da ve Kuzey Amerika'da LCOE düşük, IRR yüksek çıkıyor.
  - Kanıt: Kuzey Amerika'da GES'in oyundaki LCOE'si %7,5 iskontoyla 36 $/MWh. Lazard'ın ABD aralığı 38–78 $/MWh (2025), yani oyun aralığın altında. IRENA'ya göre ABD'de GES yatırımı 1.058 $/kW, küresel ortalama 691 $/kW (ikincil kaynak).
- **Avrupa'da rüzgârın yakalama oranı düzeltildi.**
  - Önce: 0,97 (fiyattaki rüzgâr etkisi tek bir noktanın havasından geliyordu).
  - Sonra: Kuzey Almanya'daki RES'te 0,87 (0,85–0,89); ENTSO-E'de Almanya 2025 değeri 0,866. Bu santralin IRR'ı %14,1'den %12,0'ye indi.
- **Offshore RES hiçbir piyasada kârlı değil.**
  - IRR %2–3. Gerçekte de deniz rüzgârı çoğunlukla sabit fiyatlı destek sözleşmeleriyle (CfD) kuruluyor.
  - Oyunda böyle bir destek yok; bu yüzden offshore oyuncu için bir tuzak.
- **Hata düzeltildi:** yüzer GES ile deniz üstü GES'inde panel yaşlanması (yıllık %0,5) proje ekonomisine yansımıyordu. Düzeltme LCOE'yi yaklaşık %3 artırdı.
- **Güneşin yakalama oranı.**
  - Filo düzeyinde (sıfır fiyatlı saatlerdeki üretim dahil) Avrupa'da 0,55; gerçek 2025: Almanya %51,6, İspanya %55,2 (ENTSO-E).
  - Oyuncunun kendi santralinde oran daha yüksek (Avrupa 0,73), çünkü santral sıfır fiyatlı saatlerde üretimi kısıyor.

## Yöntem

- **Betik:** `scripts/audit_econ.cjs`.
- **Sahalar:** her teknoloji her piyasada, o teknolojinin oyunda kurulabildiği temsilî bir sahada (betikteki `SITES`); 5 MW blok, standart kademe.
- **Süre:** 120 oyun günü (bir takvim yılı), 3 koşu. Tablolar koşuların ortalamasını ve parantez içinde aralığını verir.
- **Ayrı koşulan teknolojiler:** oyuncunun güneş kapasitesi öğle fiyatını düşürür (`sim.js`: güneş MW ÷ 200). Bu yüzden güneş türleri ayrı koşularda ölçüldü:
  - B1: GES ve güneş dışı her şey
  - B2: yüzer GES
  - B3: deniz üstü GES
  - B4: elektrolizör (sahada 15 MW GES ile)
- **Rakipler:** iki kip.
  - Dondurulmuş: rakipler yatırım yapmaz; gelirin üst sınırını verir.
  - Açık: normal oyundaki gibi yatırım yaparlar ve fiyatı ek olarak düşürürler.
- **Olay kartları:** kapalı.
- **LCOE:** iki iskonto oranıyla.
  - %10: oyunun varsayılanı.
  - %7,5: IRENA'nın eski raporlarında OECD için kullandığı reel oran (ikincil kaynak; yeni raporlarda bölgeye göre %3,8–12).
  - Oyunun nakit akışları enflasyonsuz olduğu için iki oran da reel sayılabilir.
- **Yakalama oranı:** desteksiz satış fiyatı ÷ piyasanın saatlik ortalama fiyatı (o gün geçerli fiyatlar, her gün yeniden okunur). Destek gelirleri ayrı tutuldu (deniz enerjisinin MWh başına 60 $ yenilik desteği, depolamanın kapasite ödemesi, hidrojen desteği).

## Oyun sonuçları (rakipler dondurulmuş, 120 gün × 3 koşu; parantez içi koşu aralığı)

LCOE ve IRR vergi ve finansman öncesidir; yatırım ve işletme gideri `FIN` (gerçek dünya $/kW). IRR'da %10 iskonto oranı yoktur (iç verim oranı); NPV ve LCOE %10 ile hesaplanır.

| Teknoloji | Piyasa | KF % | Satış $/MWh | Yakalama | LCOE %10 | LCOE %7,5 | IRR % |
|---|---|---|---|---|---|---|---|
| GES | T | 22,3 (22,1–22,4) | 60 (59–61) | 0,87 (0,86–0,88) | 47 | 39 (39–40) | 14,2 (14,1–14,3) |
| GES | E | 21,5 (20,9–21,8) | 67 (67–68) | 0,73 (0,73–0,75) | 48 (48–50) | 41 (40–42) | 15,7 (15,0–16,1) |
| GES | N | 24,5 (23,3–25,4) | 58 | 0,90 | 43 (41–45) | 36 (35–38) | 15,4 (14,5–16,1) |
| Yüzer GES | T | 15,3 (14,0–16,5) | 59 | 0,86 (0,85–0,87) | 82 (76–89) | 69 (64–75) | 5,5 (4,4–6,5) |
| Yüzer GES | E | 10,7 (10,4–10,9) | 60 (58–62) | 0,64 (0,62–0,66) | 116 (114–120) | 98 (96–101) | 1,3 (0,8–2,0) |
| Yüzer GES | N | 19,6 (18,9–20,1) | 58 (58–59) | 0,90 | 64 (62–66) | 54 (52–56) | 8,7 (8,2–9,1) |
| Deniz üstü GES | T | 24,4 (24,0–24,8) | 60 | 0,87 (0,86–0,87) | 61 (60–62) | 52 (51–53) | 9,7 (9,5–10,0) |
| Deniz üstü GES | E | 7,8 (7,5–8,1) | 62 (61–63) | 0,67 (0,64–0,69) | 191 (185–200) | 162 (157–169) | yok |
| Deniz üstü GES | N | 17,1 (16,9–17,4) | 58 | 0,90 (0,89–0,90) | 87 (86–88) | 74 (73–75) | 4,2 (4,1–4,4) |
| CSP | T | 38,8 (38,0–40,1) | 77 (76–78) | 1,12 (1,11–1,13) | 137 (132–140) | 114 (110–116) | 3,0 (2,8–3,2) |
| CSP | E | 40,3 (39,1–41,2) | 115 (113–118) | 1,25 (1,23–1,29) | 132 (129–136) | 109 (107–113) | 8,2 (8,0–8,4) |
| CSP | N | 42,0 (39,2–44,3) | 71 (70–71) | 1,09 (1,09–1,10) | 127 (120–135) | 105 (100–112) | 2,9 (2,1–3,5) |
| RES karada | T | 43,8 (40,7–46,8) | 66 (66–67) | 0,96 (0,96–0,97) | 40 (38–43) | 35 (33–37) | 20,4 (18,7–22,0) |
| RES karada | E | 24,8 (22,9–28,3) | 80 (79–81) | 0,87 (0,85–0,89) | 72 (62–77) | 62 (54–67) | 12,0 (10,4–14,5) |
| RES karada | N | 40,0 (38,5–41,2) | 63 (62–63) | 0,97 (0,96–0,98) | 44 (43–46) | 38 (37–40) | 16,9 (16,1–17,7) |
| RES offshore | T | 37,8 (34,1–40,1) | 66 | 0,96 (0,95–0,96) | 120 (112–132) | 102 (96–112) | 1,5 (0,2–2,4) |
| RES offshore | E | 34,3 (32,6–37,7) | 83 (82–84) | 0,90 (0,88–0,92) | 132 (119–138) | 112 (102–118) | 3,3 (2,5–4,5) |
| RES offshore | N | 44,3 (41,5–45,8) | 63 | 0,97 (0,97–0,98) | 102 (98–108) | 87 (84–92) | 3,0 (2,1–3,6) |
| Yüzer RES | E | 34,2 (32,5–35,6) | 90 (87–94) | 0,98 (0,95–1,01) | 234 (224–246) | 197 (189–207) | yok |
| Yüzer RES | N | 50,1 (45,6–54,3) | 64 (64–65) | 0,99 (0,98–1,00) | 160 (147–175) | 135 (124–148) | yok |
| HES | T | 25,6 (25,5–25,7) | 83 (82–83) | 1,20 (1,19–1,21) | 123 (123–124) | 100 (100–101) | 5,5 (5,4–5,6) |
| HES | E | 27,8 (26,6–29,0) | 133 (130–136) | 1,45 (1,43–1,46) | 114 (109–119) | 93 (88–97) | 12,1 (11,8–12,8) |
| HES | N | 20,6 (20,1–21,6) | 79 (79–80) | 1,23 (1,22–1,24) | 153 (147–157) | 125 (119–128) | 3,0 (2,8–3,4) |
| JES | T | 68,3 (59,2–82,7) | 69 | 1,00 | 91 (74–103) | 77 (62–87) | 6,3 (4,6–8,9) |
| JES | E | 71,1 (53,4–93,2) | 92 (91–93) | 1,00 | 91 (66–115) | 76 (55–96) | 10,9 (6,8–16,0) |
| JES | N | 68,2 (60,0–78,7) | 65 (64–65) | 1,00 | 91 (78–102) | 76 (65–86) | 5,5 (3,9–7,4) |
| Biyokütle | T | 93,1 (92,5–93,4) | 69 | 1,00 | 92 (92–93) | 84 | 2,1 (2,0–2,2) |
| Biyokütle | E | 85,0 (83,5–86,9) | 100 (98–101) | 1,09 (1,08–1,09) | 98 (96–99) | 89 (88–90) | 10,6 (10,3–10,9) |
| Biyokütle | N | 92,6 (91,8–93,4) | 65 (64–65) | 1,00 | 92 (92–93) | 84 (84–85) | 0,1 (0,0–0,1) |
| Deniz (gelgit/dalga) | T | 12,3 (11,8–12,9) | 127 | 0,97 (0,97–0,98) | 843 (801–876) | 735 (698–764) | yok (destekli) |
| Deniz (gelgit/dalga) | E | 36,7 (36,3–37,6) | 151 (151–152) | 0,99 (0,99–1,00) | 281 (275–284) | 245 (239–248) | yok (destekli) |
| Deniz (gelgit/dalga) | N | 38,3 (37,3–38,9) | 124 | 1,00 (0,99–1,00) | 270 (265–277) | 235 (231–242) | yok (destekli) |

Depolama ve hidrojen (net gelirle çalışır, LCOE yok):

| Teknoloji | Piyasa | Net gelir $/kW-yıl (destek hariç) | IRR % destekli | IRR % desteksiz |
|---|---|---|---|---|
| Batarya (2 saat) | T | 21 (20–21) | yok | yok |
| Batarya (2 saat) | E | 69 (68–70) | 18,6 (18,4–19,1) | 13,5 (13,2–14,0) |
| Batarya (2 saat) | N | 17 (16–17) | 3,7 (3,5–3,8) | yok |
| Pompaj HES (10 saat) | T | 29 (29–30) | yok | yok |
| Pompaj HES (10 saat) | E | 158 (153–166) | 10,3 (10,1–10,8) | 6,6 (6,3–7,0) |
| Pompaj HES (10 saat) | N | 20 (20–21) | 4,7 (4,6–4,8) | yok |
| Elektrolizör | T | 196 (195–199) | 3,9 (3,8–4,1) | 3,9 (3,8–4,1) |
| Elektrolizör | E | 142 (130–158) | 1,4 | 0,7 |
| Elektrolizör | N | 231 (228–233) | 11,9 (11,7–12,2) | 6,4 (6,3–6,6) |

## Gerçek dünya kıyası

### LCOE ve kapasite faktörü

| Teknoloji | Oyun KF % (T / E / N) | IRENA 2024 KF % | Oyun LCOE %7,5 $/MWh (T / E / N) | IRENA 2024 LCOE $/MWh | Lazard ABD v18 (2025) $/MWh | Değerlendirme |
|---|---|---|---|---|---|---|
| GES | 22 / 22 / 25 | ~17 | 39 / 41 / 36 | 43 | 38–78 | Uyumlu. Sahalar güneşli olduğu için KF küresel ortalamanın üstünde. Türkiye'nin 2025 filo değeri %21,5 (TEİAŞ, hesap aşağıda). |
| RES karada | 44 / 25 / 40 | 34 | 35 / 62 / 38 | 34 | 37–86 | Türkiye sahası (Gelibolu) çok rüzgârlı; filo KF'si %33. Kuzey Amerika LCOE'si Lazard aralığının altında. |
| RES offshore | 38 / 34 / 44 | 42 | 102 / 112 / 87 | 79 | 105–167 (v19, 2026) | KF uyumlu. Kârsız (IRR %2–3). |
| CSP | 39 / 40 / 42 | 41 | 114 / 109 / 105 | 92 | – | Uyumlu; LCOE farkı iskonto oranından. |
| HES | 26 / 28 / 21 | 48 | 100 / 93 / 125 | 57 | – | Türkiye TEİAŞ filosuyla uyumlu (aşağıda). IRENA'nın %48'i yeni projelerin küresel ortalaması. Avrupa ve Kuzey Amerika için ayrı veri toplanmadı. |
| JES | 68 / 71 / 68 | 88 | 77 / 76 / 76 | 60 | – | KF ilk sondajın rastgele verimine bağlı (%55–110 × 0,92); ortalama ~%76. |
| Biyokütle | 93 / 85 / 93 | 73 | 84 / 89 / 84 | 87 | – | Uyumlu. |
| Yüzer RES | – / 34 / 50 | – | – / 197 / 135 | – | – | NREL: ABD'de 181 $/MWh (2023 referans projesi). |
| Deniz | 12 / 37 / 38 | – | 735 / 245 / 235 | – | – | Avrupa literatürüyle uyumlu: gelgit ~200 €/MWh (OceanSET 2022), 110–480 €/MWh (IRENA 2019). Türkiye'de gelgit zayıf, oyun yine de izin veriyor. |
| Yüzer GES | 15 / 11 / 20 | – | 69 / 98 / 54 | – | – | Yalnızca dağlık HES sahalarında: güneş daha zayıf, kar var. |
| Deniz üstü GES | 24 / 8 / 17 | – | 52 / 162 / 74 | – | – | Avrupa sahası Hollanda kıyısı: KF düşük. |

**IRENA ve Lazard değerlerinin hiçbiri birincil belgeden okunamadı.** Bu oturumda irena.org ve lazard.com'a erişilemedi. IRENA değerleri arama motorunun rapor özetinden, Lazard değerleri haberlerden alındı. Lazard ABD'ye özgüdür ve kendi sermaye yapısını varsayar (geçmiş sürümlerde %60 borç %8, %40 özkaynak %12); IRENA ise küresel ağırlıklı ortalamadır. İki kaynak birbiriyle karıştırılmamalı.

### Birincil veriyle doğrulananlar

**Türkiye HES ve GES filosu (TEİAŞ yıllık istatistikleri, 09.10.2026 yayını):**

- KF = üretim ÷ (yıl başı ve sonu kurulu gücün ortalaması × saat).
- HES:

  | Yıl | Kapasite faktörü |
  |---|---|
  | 2022 | %24,2 |
  | 2023 | %23,0 |
  | 2024 | %26,6 |
  | 2025 | %20,3 |

  Oyunda Türkiye HES'i %26: uyumlu.
- GES 2025: 43.520 GWh ÷ (23.079 MW × 8.760 saat) = %21,5. Oyunda Konya %22.
  - Bu bir tahmin: TEİAŞ kurulu gücünün AC mi DC mi olduğu belirtilmemiş.
  - Lisanssız üretimin kapsamı da doğrulanmadı.

**Avrupa yakalama oranları 2025 (ENTSO-E gün öncesi fiyat ve gerçekleşen üretim, çeyreklik sorgular, üretim ağırlıklı yıllık toplama):**

| Bölge ve tür | Baz yük fiyatı €/MWh | Yakalama fiyatı €/MWh | Yakalama oranı |
|---|---|---|---|
| Almanya güneş | 89,3 | 46,1 | %51,6 |
| Almanya karada rüzgâr | 89,3 | 77,3 | %86,6 |
| İspanya güneş | 65,5 | 36,2 | %55,2 (2. çeyrekte üretim verisinin %1,6'sı eksik) |
| İspanya karada rüzgâr | 65,5 | 63,2 | %96,5 (aynı eksiklik) |

- Almanya'nın baz fiyatı 1,1306 $/€ kurla (FRED AEXUSEU, 2025) 101 $/MWh, İspanya'nınki 74 $/MWh eder. Oyunda Avrupa'nın 120 günlük ortalama fiyatı 91–93 $/MWh (rakipler dondurulmuş) ve 88–95 $/MWh (rakipler açık).
- Türkiye'nin oyundaki ilk yıl ortalama fiyatı, yeniden ayardan sonra 66,2 $/MWh (rakipler açık, `calib_market.cjs`); EPİAŞ 2025 ortalaması 66,4 $/MWh. Bu denetimin oyuncu santralleriyle dolu koşularında Türkiye ortalaması 69 $/MWh (rakipler dondurulmuş) ve 66 $/MWh (rakipler açık).
- Türkiye fiyat verisi ENTSO-E'de yok. Önceki kalibrasyon EPİAŞ 2025 verisiyle rüzgârın oranını %99 ölçmüştü. Güneşinki 12 örnek günle 0,84 (önce 7 günle ~0,75; [kalibrasyon](kalibrasyon.md)); oyunda 0,85.

## Bulgular

1. **Yatırım maliyeti piyasaya göre değişmiyor (en büyük sapma).**
   - `FIN` her piyasada IRENA'nın küresel ağırlıklı ortalamasını kullanıyor. Bu ortalama, Çin'in düşük maliyetlerinin ağırlığını taşıyor.
   - Kanıt (ikincil kaynak): IRENA'ya göre ABD'de GES yatırımı 1.058 $/kW, Avrupa'da 779 $/kW; küresel ortalama 691 $/kW.
   - Kuzey Amerika'da oyunun GES ve karada RES LCOE'si (36 ve 38 $/MWh, %7,5 iskonto) Lazard'ın ABD aralığının alt ucunda ya da altında. Offshore'un oyundaki LCOE'si (87) Lazard 2026 aralığının (105–167) da altında.
   - Etki: Avrupa ve Kuzey Amerika'da IRR'lar abartılı. Örneğin Kuzey Amerika'da GES IRR'ı %15, karada RES %17.
2. **Avrupa'da rüzgârın yakalama oranı yüksekti (düzeltildi).**
   - Fiyattaki rüzgâr etkisi piyasanın tek temsilî noktasının havasından (`MREF.E` = 50°K 10°D) hesaplanıyordu; santral kendi sahasının havasıyla üretiyor. Filo düzeyindeki rüzgâr oranı 0,97'ydi; gerçek ~0,90 (Almanya 0,866, İspanya 0,965).
   - Fiyattaki rüzgâr etkisi artık Almanya ve İspanya'nın rüzgâr filosu bölgelerinden geliyor (`src/windfleet.js`). Avrupa ayarı yeniden yapıldı (`REG.E`): fiyat 89,5 $/MWh, rüzgâr oranı 0,88, güneş oranı 0,55.
   - Kuzey Almanya'daki RES'in yakalama oranı 0,87, IRR %12,0 (önce %14,1). Avrupa offshore 0,90.
   - Rüzgârlı saatlerle durgun saatler arasındaki fiyat farkı açıldığı için Avrupa'da depolama kazancı arttı: batarya IRR %14,5'ten %18,6'ya, pompaj HES %8,3'ten %10,3'e (kapasite ödemesi dahil).
3. **Offshore RES hiçbir piyasada kârlı değil.**
   - IRR %2–3; KF ve yatırım gerçekçi.
   - Gerçekte deniz rüzgârı çoğunlukla sabit fiyatlı destek sözleşmeleriyle (CfD) ya da ihaleyle kuruluyor. Oyunda böyle bir destek yok; bu yüzden offshore oyuncu için tuzak, deniz enerjisi ise yalnızca 60 $/MWh desteğiyle yaşıyor.
4. **Hata: panel yaşlanması yüzer ve deniz üstü GES'e uygulanmıyordu.** Yıllık %0,5 kayıp (`DEGR`) proje ekonomisinde yalnızca kara GES'ine işliyordu; düzeltildi (`finance.js` `PV_DEGR`).
5. **Türkiye'de karada RES çok kârlı.**
   - Ölçülen sahada (Gelibolu) IRR %20 (Türkiye yeniden ayarından önce %22). Nedenleri: KF %44 (filo ortalaması %33), yakalama oranı 0,96 ve ~66 $/MWh fiyat.
   - Saha seçimi oyunun parçası; ancak en iyi sahanın filo ortalamasının 1,4 katı olması yüksek görünüyor (doğrulanmadı).
6. **Depolama ve hidrojen gerçek dünyayla aynı yönde.**
   - Batarya Türkiye'de yalnız arbitrajla yatırımını karşılamıyor; Avrupa'da kapasite ödemesiyle IRR %18,6 (desteksiz %13,5).
   - Elektrolizör ancak ABD'nin 45V desteğiyle kârlı (IRR %11,9; desteksiz %6,4). Bu, yeşil hidrojenin bugün desteksiz rekabet edemediği tablosuyla uyumlu (BNEF 2025, ikincil kaynak: 3,7–11,7 $/kg).
7. **Rakiplerin etkisi.**
   - 120 günde rakipler ~900 MW kurdu, çoğu Türkiye'de güneş.
   - Türkiye GES'inin IRR'ı %14,2'den %12,1'e indi; ortalama fiyat 69'dan 66 $/MWh'e düştü (Türkiye yeniden ayarından sonra; önce %15,9'dan %14,1'e).
   - Avrupa ve Kuzey Amerika'da etki küçük (rakipler oralara az kuruyor).

## Öneriler (öncelik sırasıyla)

1. **Piyasaya göre yatırım çarpanı ekle** (`REG[k].capex` ya da `FIN` içinde teknoloji × piyasa).
   - Değerler IRENA'nın ülke ve bölge tablolarından (Türkiye, Avrupa, ABD) alınmalı.
   - Bu oturumda irena.org'a erişilemedi. Ağ ayarlarında irena.org'a izin verilirse ya da rapor PDF'i sağlanırsa doğrulanmış değerlerle yapılabilir.
   - Hedef: Kuzey Amerika LCOE'leri Lazard aralığına girsin.
2. ~~**Türkiye fiyat düzeyini yeniden ayarla.**~~ Yapıldı (30.10.2026). Fark kayma değil tanım farkıydı; Türkiye ilk oyun yılına göre ayarlandı (`REG.T.mult` 0,92, ilk yıl 66,2 $/MWh).
3. **Offshore için destek seçeneği.** Avrupa'da CfD benzeri sabit fiyatlı sözleşme. Sözleşme fiyatı (strike price) ve süresi birincil kaynaktan alınmalı (İngiltere CfD ihale sonuçları, Almanya ihaleleri). Alternatif: destek olmadığını oyuncuya açıkça söyle.
4. **Düşük öncelikli:**
   - Avrupa ve Kuzey Amerika HES KF'si (ENTSO-E ve EIA verisiyle).
   - Türkiye'de gelgiti zayıf sahalarda deniz enerjisi uyarısı.
   - Türkiye güneşinin yakalama oranı için EPİAŞ tam yıl hesabı (örnek 30.10.2026'da 7 günden 12 güne çıkarıldı: 0,84).

## Sınırlamalar

- **Her teknoloji tek sahada:** sonuçlar saha seçimine bağlı (özellikle rüzgâr, jeotermal ve deniz).
- **Süre:** 120 oyun günü bir takvim yılıdır; 3 koşu hava ve fiyat oynaklığını tam yakalamaz.
- **Sermaye yapısı:** LCOE ve IRR vergi ve finansman öncesidir (`plantFinance`); proje finansmanı modülü (borç, vergi, PPA) ayrı.
- **Kıyas verileri:** IRENA ve Lazard değerleri arama özetlerinden alındı ve doğrulanmadı. Birincil veri: ENTSO-E (API), TEİAŞ (yıllık istatistik tabloları), FRED (kur).
- **Kapsam dışı:** olay kartları kapalı, oyuncunun GÖP masası varsayılan ayarda.
