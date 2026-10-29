# Teknoloji ekonomisi denetimi (29.10.2026)

Oyundaki 14 teknolojinin proje ekonomisini üç piyasada (Türkiye T, Avrupa E, Kuzey Amerika N) ölçüp gerçek dünya kıyaslarıyla karşılaştırır. Amaç, oyuncuya yanlış ders veren aykırılıkları bulmaktır.

## Sonuç

- **Çoğu teknoloji gerçekle aynı büyüklükte.**
  - **Doğrulanmamış kıyaslarla uyumlu:** GES, CSP, biyokütle ve jeotermalin kapasite faktörü (KF) ve LCOE'si IRENA 2024 küresel ortalamalarına yakın; yüzer RES NREL'in ABD değerine, deniz enerjisi Avrupa literatür aralığına uyuyor. Bu kıyas değerlerinin hiçbiri birincil belgeden okunamadı (kaynak tablosuna bakın).
  - **Birincil veriyle doğrulanan:** Türkiye'de HES'in KF'si TEİAŞ 2022–2025 filo değerleriyle (%20–27) uyumlu.
- **En büyük sapma, piyasaya göre değişmeyen yatırım maliyeti.**
  - Oyun her piyasada IRENA'nın küresel ağırlıklı ortalama yatırım maliyetini kullanıyor. Bu ortalama Çin'in düşük maliyetlerinin ağırlığını taşıyor.
  - Sonuç olarak Avrupa'da ve Kuzey Amerika'da LCOE düşük, IRR yüksek çıkıyor.
  - Kanıt: Kuzey Amerika'da GES'in oyundaki LCOE'si %7,5 iskontoyla 36 $/MWh. Lazard'ın ABD aralığı 38–78 $/MWh (2025), yani oyun aralığın altında. IRENA'ya göre ABD'de GES yatırımı 1.058 $/kW, küresel ortalama 691 $/kW (ikincil kaynak).
- **Avrupa fiyatını tek bir noktanın rüzgârı belirliyor.**
  - Fiyattaki rüzgâr etkisi piyasanın tek temsilî noktasının havasından hesaplanıyor.
  - Sonuç: yıllık fiyat koşudan koşuya 58–124 $/MWh oynuyor; rüzgârın yakalama oranı gerçekteki gibi sistematik olarak 1'in altında kalmıyor, rastgele.
- **Offshore RES hiçbir piyasada kârlı değil.**
  - IRR %10 iskontoyla %3–5. Gerçekte de deniz rüzgârı çoğunlukla sabit fiyatlı destek sözleşmeleriyle (CfD) kuruluyor.
  - Oyunda böyle bir destek yok; bu yüzden offshore oyuncu için bir tuzak.
- **Hata düzeltildi:** yüzer GES ile deniz üstü GES'inde panel yaşlanması (yıllık %0,5) proje ekonomisine yansımıyordu. Düzeltme LCOE'yi yaklaşık %3 artırdı.
- **Yakalama oranları önceki kalibrasyonla tutarlı.**
  - Oyuncunun kendi santralinde ölçülen oran, piyasa düzeyindeki orandan yüksek çıkıyor; iki neden var:
    - santral sıfır fiyatlı saatlerde üretimi kısıyor;
    - santralin havası, piyasanın temsilî noktasının havasından farklı.
  - Gerçek 2025 yıllık değerler (ENTSO-E, üretim ağırlıklı): Almanya güneş %51,6, İspanya güneş %55,2, Almanya karada rüzgâr %86,6.
  - Önceki kalibrasyonun oyundaki piyasa düzeyi değerleri: güneş %53, rüzgâr %90 ([kalibrasyon](kalibrasyon.md)).

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
- **Yakalama oranı:** desteksiz satış fiyatı ÷ piyasanın saatlik ortalama fiyatı. Destek gelirleri ayrı tutuldu (deniz enerjisinin MWh başına 60 $ yenilik desteği, depolamanın kapasite ödemesi, hidrojen desteği).

## Oyun sonuçları (rakipler dondurulmuş, 120 gün × 3 koşu; parantez içi koşu aralığı)

LCOE ve IRR vergi ve finansman öncesidir; yatırım ve işletme gideri `FIN` (gerçek dünya $/kW). IRR'da %10 iskonto oranı yoktur (iç verim oranı); NPV ve LCOE %10 ile hesaplanır.

| Teknoloji | Piyasa | KF % | Satış $/MWh | Yakalama | LCOE %10 | LCOE %7,5 | IRR % |
|---|---|---|---|---|---|---|---|
| GES | T | 22,3 (21,9–22,8) | 65 | 0,91 (0,83–0,97) | 47 (46–48) | 39 (39–40) | 15,7 (15,2–16,2) |
| GES | E | 21,3 (19,8–22,2) | 71 (65–74) | 0,73 (0,71–0,76) | 49 (47–53) | 41 (40–44) | 16,6 (13,4–18,4) |
| GES | N | 23,8 (23,6–24,2) | 59 (58–59) | 0,93 (0,89–0,96) | 44 (43–44) | 37 (36–37) | 15,0 (14,7–15,3) |
| Yüzer GES | T | 15,9 (15,6–16,4) | 64 (64–65) | 0,90 (0,88–0,92) | 79 (76–80) | 66 (64–68) | 7,1 (6,9–7,5) |
| Yüzer GES | E | 9,9 (9,8–10,2) | 63 (60–65) | 0,72 (0,61–0,81) | 126 (123–128) | 106 (103–107) | 0,9 (0,4–1,3) |
| Yüzer GES | N | 21,3 (20,3–22,0) | 58 (58–59) | 0,96 (0,95–0,97) | 59 (57–62) | 49 (48–52) | 9,9 (9,1–10,3) |
| Deniz üstü GES | T | 23,7 (22,8–24,3) | 65 | 0,90 (0,84–0,95) | 63 (61–65) | 53 (52–55) | 10,5 (9,9–11,0) |
| Deniz üstü GES | E | 7,9 (7,5–8,4) | 66 (59–71) | 0,79 (0,69–0,95) | 190 (177–198) | 161 (150–168) | yok |
| Deniz üstü GES | N | 17,5 (17,1–17,9) | 58 (58–59) | 0,96 (0,92–1,02) | 85 (83–87) | 72 (71–74) | 4,5 (4,2–4,9) |
| CSP | T | 38,8 (37,7–40,5) | 84 (83–84) | 1,17 (1,07–1,24) | 137 (131–141) | 114 (109–117) | 3,9 (3,5–4,4) |
| CSP | E | 38,6 (37,3–39,3) | 113 (108–118) | 1,17 (1,07–1,27) | 138 (135–142) | 114 (112–118) | 7,3 (6,4–8,2) |
| CSP | N | 41,5 (41,3–41,7) | 71 (71–72) | 1,13 (1,09–1,17) | 128 (127–129) | 106 (106–107) | 2,9 (2,8–3,0) |
| RES karada | T | 47,4 (46,2–48,3) | 73 (73–74) | 1,03 (0,94–1,08) | 37 (37–38) | 32 (32–33) | 25,4 (24,4–26,0) |
| RES karada | E | 25,1 (20,9–28,5) | 88 (83–93) | 0,91 (0,86–0,97) | 72 (62–85) | 62 (54–73) | 14,1 (11,6–15,5) |
| RES karada | N | 39,9 (38,3–42,7) | 63 | 1,00 (0,95–1,03) | 44 (41–46) | 38 (36–40) | 17,0 (16,1–18,7) |
| RES offshore | T | 41,1 (39,4–42,7) | 73 (73–74) | 1,03 (0,93–1,08) | 110 (105–114) | 93 (90–97) | 4,0 (3,4–4,5) |
| RES offshore | E | 33,2 (29,1–37,3) | 92 (86–96) | 0,95 (0,89–1,01) | 137 (121–155) | 117 (103–132) | 4,1 (3,1–4,9) |
| RES offshore | N | 43,0 (40,5–45,3) | 64 | 1,01 (0,96–1,04) | 105 (99–111) | 89 (85–95) | 2,8 (2,0–3,6) |
| Yüzer RES | E | 38,1 (34,2–42,0) | 102 (99–104) | 1,06 (0,99–1,16) | 211 (190–234) | 178 (160–197) | 1,3 (0,7–1,9) |
| Yüzer RES | N | 48,8 (46,7–52,0) | 64 (64–65) | 1,02 (0,97–1,06) | 164 (154–171) | 138 (130–144) | yok |
| HES | T | 24,8 (23,8–25,3) | 91 (90–92) | 1,28 (1,18–1,33) | 127 (125–133) | 104 (101–108) | 6,1 (5,9–6,3) |
| HES | E | 29,1 (26,8–32,0) | 130 (127–134) | 1,35 (1,22–1,51) | 109 (99–118) | 89 (80–96) | 12,5 (11,2–13,6) |
| HES | N | 21,7 (20,6–22,9) | 79 (78–80) | 1,26 (1,18–1,30) | 146 (138–153) | 119 (112–124) | 3,5 (3,1–3,9) |
| JES | T | 74,9 (55,6–94,4) | 75 | 1,05 (0,96–1,11) | 86 (65–110) | 72 (54–92) | 8,6 (4,8–12,3) |
| JES | E | 57,5 (48,5–72,4) | 99 (94–102) | 1,03 (0,96–1,11) | 110 (85–126) | 92 (71–106) | 8,8 (7,0–11,7) |
| JES | N | 77,9 (74,2–80,0) | 65 | 1,03 (0,98–1,06) | 79 (76–82) | 66 (64–69) | 7,3 (6,6–7,6) |
| Biyokütle | T | 93,2 (91,8–95,0) | 75 | 1,05 (0,96–1,11) | 92 (91–93) | 84 (83–85) | 4,4 (4,2–4,7) |
| Biyokütle | E | 85,8 (83,5–87,1) | 105 (102–107) | 1,09 (1,02–1,20) | 97 (96–99) | 88 (87–90) | 12,2 (10,8–12,9) |
| Biyokütle | N | 92,9 (92,6–93,4) | 65 (64–65) | 1,03 (0,98–1,06) | 92 | 84 | 0,2 (0,1–0,2) |
| Deniz (gelgit/dalga) | T | 12,6 (11,9–13,3) | 134 (134–135) | 1,04 (0,94–1,10) | 824 (774–869) | 718 (675–758) | yok (destekli) |
| Deniz (gelgit/dalga) | E | 36,5 (36,0–36,8) | 157 (153–161) | 1,01 (0,94–1,09) | 283 (281–287) | 247 (245–250) | 0,6 (destekli) |
| Deniz (gelgit/dalga) | N | 39,5 (38,9–40,3) | 125 (124–125) | 1,03 (0,98–1,06) | 262 (256–265) | 228 (223–231) | yok (destekli) |

Depolama ve hidrojen (net gelirle çalışır, LCOE yok):

| Teknoloji | Piyasa | Net gelir $/kW-yıl (destek hariç) | IRR % destekli | IRR % desteksiz |
|---|---|---|---|---|
| Batarya (2 saat) | T | 23 (22–23) | yok | yok |
| Batarya (2 saat) | E | 56 (52–58) | 14,5 (13,2–15,4) | 9,0 (7,6–9,9) |
| Batarya (2 saat) | N | 17 (16–17) | 3,4 (3,3–3,5) | yok |
| Pompaj HES (10 saat) | T | 33 (32–33) | yok | yok |
| Pompaj HES (10 saat) | E | 119 (112–126) | 8,3 (8,0–8,6) | 4,3 (3,9–4,7) |
| Pompaj HES (10 saat) | N | 21 (20–22) | 4,9 (4,8–4,9) | yok |
| Elektrolizör | T | 155 (153–157) | 0,4 (0,3–0,6) | 0,4 (0,3–0,6) |
| Elektrolizör | E | 122 (113–128) | yok | yok |
| Elektrolizör | N | 225 (217–231) | 11,5 (10,9–12,0) | 6,0 (5,5–6,5) |

## Gerçek dünya kıyası

### LCOE ve kapasite faktörü

| Teknoloji | Oyun KF % (T / E / N) | IRENA 2024 KF % | Oyun LCOE %7,5 $/MWh (T / E / N) | IRENA 2024 LCOE $/MWh | Lazard ABD v18 (2025) $/MWh | Değerlendirme |
|---|---|---|---|---|---|---|
| GES | 22 / 21 / 24 | ~17 | 39 / 41 / 37 | 43 | 38–78 | Uyumlu. Sahalar güneşli olduğu için KF küresel ortalamanın üstünde. Türkiye'nin 2025 filo değeri %21,5 (TEİAŞ, hesap aşağıda). |
| RES karada | 47 / 25 / 40 | 34 | 32 / 62 / 38 | 34 | 37–86 | Türkiye sahası (Gelibolu) çok rüzgârlı; filo KF'si %33. Kuzey Amerika LCOE'si Lazard aralığının altında. |
| RES offshore | 41 / 33 / 43 | 42 | 93 / 117 / 89 | 79 | 105–167 (v19, 2026) | KF uyumlu. %10 iskontoyla kârsız (IRR %3–4). |
| CSP | 39 / 39 / 42 | 41 | 114 / 114 / 106 | 92 | – | Uyumlu; LCOE farkı iskonto oranından. |
| HES | 25 / 29 / 22 | 48 | 104 / 89 / 119 | 57 | – | Türkiye TEİAŞ filosuyla uyumlu (aşağıda). IRENA'nın %48'i yeni projelerin küresel ortalaması. Avrupa ve Kuzey Amerika için ayrı veri toplanmadı. |
| JES | 75 / 58 / 78 | 88 | 72 / 92 / 66 | 60 | – | KF ilk sondajın rastgele verimine bağlı (%55–110 × 0,92); ortalama ~%76. |
| Biyokütle | 93 / 86 / 93 | 73 | 84 / 88 / 84 | 87 | – | Uyumlu. |
| Yüzer RES | – / 38 / 49 | – | – / 178 / 138 | – | – | NREL: ABD'de 181 $/MWh (2023 referans projesi). |
| Deniz | 13 / 37 / 40 | – | 718 / 247 / 228 | – | – | Avrupa literatürüyle uyumlu: gelgit ~200 €/MWh (OceanSET 2022), 110–480 €/MWh (IRENA 2019). Türkiye'de gelgit zayıf, oyun yine de izin veriyor. |
| Yüzer GES | 16 / 10 / 21 | – | 66 / 106 / 49 | – | – | Yalnızca dağlık HES sahalarında: güneş daha zayıf, kar var. |
| Deniz üstü GES | 24 / 8 / 18 | – | 53 / 161 / 72 | – | – | Avrupa sahası Hollanda kıyısı: KF düşük. |

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

  Oyunda Türkiye HES'i %25: uyumlu.
- GES 2025: 43.520 GWh ÷ (23.079 MW × 8.760 saat) = %21,5. Oyunda Konya %22.
  - Bu bir tahmin: TEİAŞ kurulu gücünün AC mi DC mi olduğu belirtilmemiş.
  - Lisanssız üretimin kapsamı da doğrulanmadı.

**Avrupa yakalama oranları 2025 (ENTSO-E gün öncesi fiyat ve gerçekleşen üretim, çeyreklik sorgular, üretim ağırlıklı yıllık toplama):**

| Bölge ve tür | Baz yük fiyatı €/MWh | Yakalama fiyatı €/MWh | Yakalama oranı |
|---|---|---|---|
| Almanya güneş | 89,3 | 46,1 | %51,6 |
| Almanya karada rüzgâr | 89,3 | 77,3 | %86,6 |
| İspanya güneş | 65,5 | 36,2 | %55,2 (2. çeyrekte üretim verisinin %1,6'sı eksik) |

- Almanya'nın baz fiyatı 1,1306 $/€ kurla (FRED AEXUSEU, 2025) 101 $/MWh eder. Oyunda Avrupa'nın 120 günlük ortalama fiyatı 62–104 $/MWh (rakipler dondurulmuş) ve 58–124 $/MWh (rakipler açık) arasında değişiyor.
- Türkiye fiyat verisi ENTSO-E'de yok. Önceki kalibrasyon EPİAŞ 2025 verisiyle rüzgârın oranını %99 ölçmüştü; güneşinki ~%75 çıkmıştı, ama yalnızca 7 örnek günden ([kalibrasyon](kalibrasyon.md)).

## Bulgular

1. **Yatırım maliyeti piyasaya göre değişmiyor (en büyük sapma).**
   - `FIN` her piyasada IRENA'nın küresel ağırlıklı ortalamasını kullanıyor. Bu ortalama, Çin'in düşük maliyetlerinin ağırlığını taşıyor.
   - Kanıt (ikincil kaynak): IRENA'ya göre ABD'de GES yatırımı 1.058 $/kW, Avrupa'da 779 $/kW; küresel ortalama 691 $/kW.
   - Kuzey Amerika'da oyunun GES ve karada RES LCOE'si (36 ve 38 $/MWh, %7,5 iskonto) Lazard'ın ABD aralığının alt ucunda ya da altında. Offshore'un oyundaki LCOE'si (89) Lazard 2026 aralığının (105–167) da altında.
   - Etki: Avrupa ve Kuzey Amerika'da IRR'lar abartılı. Örneğin Kuzey Amerika'da GES IRR'ı %15, karada RES %17.
2. **Avrupa fiyatını tek bir noktanın rüzgârı belirliyor.**
   - Fiyattaki rüzgâr etkisi piyasanın tek temsilî noktasının havasından hesaplanıyor (`MREF.E` = 50°K 10°D; `REG.E.wk`=3: Türkiye'nin 3 katı, Avrupa fiyat düzeyi çarpanıyla birlikte).
   - Sonuç 1: 120 günlük ortalama fiyat koşudan koşuya 58–124 $/MWh arasında değişiyor.
   - Sonuç 2: Kuzey Almanya'daki bir RES'in üretimiyle fiyat arasındaki korelasyon teşhis koşularında +0,16 ile −0,14 arasında çıktı. Yakalama oranı da koşudan koşuya rastgele: denetimde 0,86–0,97 (ortalama 0,91), teşhis koşularında 0,95–1,10. Gerçekte rüzgâr bölge genelinde birlikte esip fiyatı düşürür; Almanya'da 2025'te oran 0,87'ydi.
3. **Offshore RES hiçbir piyasada kârlı değil.**
   - IRR %10 iskontoyla %3–4; KF ve yatırım gerçekçi.
   - Gerçekte deniz rüzgârı çoğunlukla sabit fiyatlı destek sözleşmeleriyle (CfD) ya da ihaleyle kuruluyor. Oyunda böyle bir destek yok; bu yüzden offshore oyuncu için tuzak, deniz enerjisi ise yalnızca 60 $/MWh desteğiyle yaşıyor.
4. **Hata: panel yaşlanması yüzer ve deniz üstü GES'e uygulanmıyordu.** Yıllık %0,5 kayıp (`DEGR`) proje ekonomisinde yalnızca kara GES'ine işliyordu; düzeltildi (`finance.js` `PV_DEGR`).
5. **Türkiye'de karada RES çok kârlı.**
   - Ölçülen sahada (Gelibolu) IRR %25. Nedenleri: KF %47 (filo ortalaması %33), yakalama oranı ~1 ve ~73 $/MWh fiyat.
   - Saha seçimi oyunun parçası; ancak en iyi sahanın filo ortalamasının 1,4 katı olması yüksek görünüyor (doğrulanmadı).
6. **Depolama ve hidrojen gerçek dünyayla aynı yönde.**
   - Batarya Türkiye'de yalnız arbitrajla yatırımını karşılamıyor; Avrupa'da kapasite ödemesiyle IRR %14,5.
   - Elektrolizör ancak ABD'nin 45V desteğiyle kârlı (IRR %11,5; desteksiz %6). Bu, yeşil hidrojenin bugün desteksiz rekabet edemediği tablosuyla uyumlu (BNEF 2025, ikincil kaynak: 3,7–11,7 $/kg).
7. **Rakiplerin etkisi.**
   - 120 günde rakipler ~900 MW kurdu, çoğu Türkiye'de güneş.
   - Türkiye GES'inin yakalama oranı 0,91'den 0,86'ya, IRR'ı %15,7'den %14,5'e indi.
   - Avrupa'daki etki, bulgu 2'deki oynaklığın içinde kaldı.

## Öneriler (öncelik sırasıyla)

1. **Piyasaya göre yatırım çarpanı ekle** (`REG[k].capex` ya da `FIN` içinde teknoloji × piyasa).
   - Değerler IRENA'nın ülke ve bölge tablolarından (Türkiye, Avrupa, ABD) alınmalı.
   - Bu oturumda irena.org'a erişilemedi. Ağ ayarlarında irena.org'a izin verilirse ya da rapor PDF'i sağlanırsa doğrulanmış değerlerle yapılabilir.
   - Hedef: Kuzey Amerika LCOE'leri Lazard aralığına girsin.
2. **Fiyattaki rüzgâr etkisini bölgesel yap.**
   - Piyasanın rüzgârını tek nokta yerine birkaç noktanın ortalamasından hesapla.
   - Santralin rüzgârını piyasa rüzgârıyla kısmen ilişkilendir.
   - Hedef: Avrupa'da rüzgârın yakalama oranı ~0,85–0,90 (ENTSO-E 2025: 0,87); yıllık fiyat oynaklığı daralsın.
   - Önceki kalibrasyon (`REG.E.wk`) yeniden yapılmalı.
3. **Offshore için destek seçeneği.** Avrupa'da CfD benzeri sabit fiyatlı sözleşme. Sözleşme fiyatı (strike price) ve süresi birincil kaynaktan alınmalı (İngiltere CfD ihale sonuçları, Almanya ihaleleri). Alternatif: destek olmadığını oyuncuya açıkça söyle.
4. **Düşük öncelikli:**
   - Avrupa ve Kuzey Amerika HES KF'si (ENTSO-E ve EIA verisiyle).
   - Türkiye'de gelgiti zayıf sahalarda deniz enerjisi uyarısı.
   - Türkiye güneşinin yakalama oranı için EPİAŞ tam yıl hesabı (7 gün yerine).

## Sınırlamalar

- **Her teknoloji tek sahada:** sonuçlar saha seçimine bağlı (özellikle rüzgâr, jeotermal ve deniz).
- **Süre:** 120 oyun günü bir takvim yılıdır; 3 koşu hava ve fiyat oynaklığını tam yakalamaz (bulgu 2).
- **Sermaye yapısı:** LCOE ve IRR vergi ve finansman öncesidir (`plantFinance`); proje finansmanı modülü (borç, vergi, PPA) ayrı.
- **Kıyas verileri:** IRENA ve Lazard değerleri arama özetlerinden alındı ve doğrulanmadı. Birincil veri: ENTSO-E (API), TEİAŞ (yıllık istatistik tabloları), FRED (kur).
- **Kapsam dışı:** olay kartları kapalı, oyuncunun GÖP masası varsayılan ayarda.
