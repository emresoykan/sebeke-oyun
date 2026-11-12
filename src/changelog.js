// --- Sürüm notları: oyuncunun göreceği değişiklikler, en yenisi önce ---
// id: yayın tarihi (YYYY-MM-DD; aynı gün ikinci yayın YYYY-MM-DD.2; "yeni" işareti en üstteki id'ye göre). Yeni bir yayında en üste bir kayıt eklenir;
// yalnızca oyuncunun fark edeceği değişiklikler yazılır (iç düzenlemeler, testler ve betikler yazılmaz).
export const NOTES=[
  {id:"2026-11-12.2",t:"Fransa, İtalya, İskandinavya",items:[
    "Avrupa beş piyasa oldu: Fransa, İtalya ve İskandinavya (Norveç, İsveç, Finlandiya, İzlanda) ayrıldı. Her biri ENTSO-E 2025 verisine göre ayarlı: Fransa ~69 $/MWh (bahar öğlelerinde sık negatif fiyat), İtalya ~130 $/MWh (gaz ağırlıklı, negatif fiyat yok; güneş değerini koruyor), İskandinavya ~52 $/MWh (yazın bahar seli ve rüzgârla ucuz, kışın pahalı). Danimarka Almanya'ya yakın fiyatla Avrupa'da kaldı.",
    "Bu ülkelerdeki sahaların kendi piyasasının fiyatından satar; kayıtlı oyunda taşındı. Kredi, izin ve Avrupa Hidrojen Bankası desteği aynı; kurumlar vergisi Fransa %25, İtalya %27,8, İskandinavya %20,6 (İsveç). Rüzgâr santralinin üretimi değişmedi.",
    "Britanya'nın offshore fark sözleşmesi artık yalnızca Avrupa piyasasında: Fransa, İtalya ve İskandinavya kıyılarındaki yeni offshore santralleri almaz."]},
  {id:"2026-11-12",t:"Avrupa'da güneş üretimi",items:[
    "Almanya ve Kuzey Avrupa'daki güneş santralleri gerçeğe göre çok az üretiyordu. Oyunun havası bu bölgelerde ortalama bulutu iklim değerinin üstünde tutuyordu; yıllık ışınım zaten haritadan geldiği için bulut iki kez sayılıyordu. Artık yıllık üretim ışınım haritasını izliyor, hava yalnızca gün gün dalgalanma yaratıyor.",
    "Almanya'daki GES'in kapasite faktörü (kısıntı öncesi) %7–8'den ~%12–14'e çıktı; negatif fiyatlı saatlerde kısılan üretim ~%35'ten ~%30'a indi. Fransa'nın güneyinde üretim ~%17, İspanya'da ~%3 arttı. Türkiye'de değişiklik yok (Konya ~%21; Türkiye güneş filosu 2025'te %21,5).",
    "Almanya'da bir GES yine de yalnızca spot satışla zor: kısıntı sonrası kapasite faktörü ~%9, sermaye maliyeti %10'da IRR ~%3 (piyasa primiyle ~%4–5)."]},
  {id:"2026-11-11.4",t:"Almanya'da piyasa primi",items:[
    "Almanya'daki GES ve kara RES artık piyasa primi alıyor (Almanya'nın yenilenebilir enerji yasası EEG). Elektriğini piyasada satarsın; ay sonunda güneşin ya da rüzgârın o ayki piyasa değeri ödül değerinin altındaysa farkı üretimine prim olarak alırsın, üstündeyse prim yok, geri ödeme de yok. Ödül değeri 53,6 $/MWh: BNetzA'nın 2026 ihalelerinde güneşte ve kara rüzgârında ortalama 4,79 ct/kWh. Süre 20 ekonomik yıl, ilk blokla başlar.",
    "Oyunda bir yıllık ölçümde Kuzey Almanya'daki rüzgâr santrali neredeyse hiç prim almadı (rüzgârın piyasa değeri ~90 $/MWh, ödülün üstünde); güneş santrali MWh başına 8–15 $ aldı (yaz aylarında güneşin piyasa değeri düşük). Negatif fiyatlı saatlerin üretimine prim ödenmez.",
    "Saha panelinde ödül değeri, bu ayın ve geçen ayın piyasa değeri; günlük raporda \"Piyasa primi\"; proje ekonomisinde fiyatın altında prim. Fransa ve diğer Avrupa ülkeleri için oyunda destek tanımlı değil. Sözlükte \"Piyasa primi (EEG)\"."]},
  {id:"2026-11-11.3",t:"Avrupa ve İberya'da vergi",items:[
    "Finansman varsayımlarında kurumlar vergisi artık piyasaya göre: Avrupa %29,9 (Almanya), İberya %25 (İspanya). Önce ikisi de %27,5'ti (iki ülkenin ortalaması). Etkisi küçük: İberya'daki GES'in vergi sonrası getirisi ~0,1 puan artar, Almanya'daki RES'inki ~0,2 puan azalır."]},
  {id:"2026-11-11.2",t:"Negatif fiyat",items:[
    "Avrupa ve İberya'da fiyat sıfırın altına inebiliyor: üreten para öder, tüketen para alır. Bahar öğlelerinde güneş ve rüzgâr talebi aşınca olur; saatlerin ~%6'sı (ENTSO-E 2025: Almanya ~575, İspanya ~552 saat). Avrupa'da derin olabilir (gerçekte en düşük −250 €/MWh), İberya'da sığdır (en düşük −15 €). Türkiye'de fiyat sıfırın altına inmez.",
    "Negatif fiyatlı saatte GES, RES ve JES üretmez, HES suyunu saklar; batarya, pompaj HES ve elektrolizör şebekeden alırken para kazanır. Fiyat grafiği sıfırın altını gösterir; piyasada ilk negatif fiyatta haber çıkar. Sözlükte \"Negatif fiyat\".",
    "İspanya'daki güneş santrali artık bu saatlerde üretmediği için üretiminin ~%25'ini kısıyor ama kalanını daha yüksek fiyattan satıyor; güneşin piyasa genelindeki fiyat oranı gerçekteki gibi (~%55)."]},
  {id:"2026-11-11",t:"İberya ayrı piyasa",items:[
    "İspanya ve Portekiz artık ayrı bir piyasa: İberya (gerçekte de iki ülke ortak fiyat bölgesidir, MIBEL). Fiyat ENTSO-E 2025 İspanya verisine göre: ortalama ~74 $/MWh, güneşin fiyat oranı ~%53–55, rüzgârın ~%97. İspanya'daki güneş santrali önceden Almanya'nın bulutuna göre fiyat alıyor ve gerçekte olduğundan çok kazanıyordu.",
    "Avrupa piyasası artık Almanya'ya göre ayarlı: ortalama ~100 $/MWh, rüzgârın fiyat oranı ~%88, güneşin ~%52 (önce iki ülkenin ortalaması, ~90 $/MWh).",
    "Kayıtlı oyunda İspanya ve Portekiz'deki sahaların İberya'ya taşındı. Avrupa'nın kredi, vergi ve izin kuralları ile Avrupa Hidrojen Bankası desteği İberya'da da geçerli; Britanya'nın kapasite ödemesi ve offshore fark sözleşmesi yalnızca Avrupa'da."]},
  {id:"2026-11-10",t:"Hafta sonu ve bayramlar",items:[
    "Türkiye'de fiyat gün tipine göre değişiyor: pazar öğlesi iş gününün ~%40'ı, cumartesi ~%75'i; gece ve akşam aynı (EPİAŞ 2024–2025). Resmî tatiller hafta sonuna benzer; Ramazan ve Kurban Bayramı'nda (arife dahil) gündüz fiyatı birkaç gün sıfıra yakın. Bayram ve tatil başlarken haber bandında not.",
    "Tarih etiketinde gün adı ve tatil adı. Batarya hafta sonu ve bayramda daha çok kazanır: gündüz ucuz, akşam normal (günlük fark iş gününde ~41, pazar ~75 $/MWh). Yıllık ortalama fiyat (~67 $/MWh) ve güneşin fiyat oranı (%83) aynı kaldı; günler arasındaki rastgele oynama azaldı."]},
  {id:"2026-11-09.2",t:"Rakiplerin güneşi fiyatı daha yavaş düşürüyor",items:[
    "Türkiye'de rakipler güneş santrali kurdukça güneşin fiyat oranı artık yılda ~6–7 puan düşüyor (önce ~15). Gerçekte güneş filosu yılda ~%28 büyürken oran ~8 puan düştü (EPİAŞ, TEİAŞ 2024–2025).",
    "Üçüncü oyun yılında güneşin piyasa satış fiyatı ilk yıla göre ~%31 düşük (önce ~%52). İlk yılın fiyatları değişmedi."]},
  {id:"2026-11-09",t:"Türkiye'de fiyat tavanı ve mevsimler",items:[
    "Türkiye'de saatlik fiyatın bir tavanı var: 100 $/MWh (azami fiyat; gerçekte Nisan 2026'dan beri 4.500 TL/MWh). Olay kartlarının fiyat etkisi de tavanı aşmaz. Sözlükte \"Azami fiyat\".",
    "Fiyatın gün içindeki şekli mevsime göre değişiyor: ilkbahar ve sonbaharda öğle fiyatı güneşle derin düşer, yazın klima talebi ve kışın zayıf güneş düşüşü sınırlar. Kış daha ucuz, Mayıs daha pahalı, yaz en pahalı (EPİAŞ 2024–2025).",
    "Günden güne fiyat daha değişken: normal yılda günlük en yüksek ile en düşük fiyat arasındaki fark ortalama ~52 $/MWh (önce ~45). Batarya bu farktan kazanır. Yıllık ortalama fiyat (~66 $/MWh) ve güneşin fiyat oranı (%84) aynı kaldı."]},
  {id:"2026-11-08.2",t:"Yağışlı yılda akşam fiyatları",items:[
    "Türkiye'de yağışlı yılda fiyat düşüşü artık saate göre değişiyor: öğle ve gece saatleri sıfıra yaklaşır, akşam zirvesi (19–21) yüksek kalır. Gerçek 2026'da da Nisan'da saatlerin üçte biri 5 $/MWh'in altındaydı, akşam TL fiyatı ise bir yıl öncesine yakındı (EPİAŞ).",
    "Günlük en yüksek ile en düşük fiyat arasındaki fark yağışlı ilkbaharda büyür: batarya ucuz saatte doldurup akşam satarak daha çok kazanır. Yıllık ortalama fiyat aynı kalır (çok yağışlı yılda ~51 $/MWh)."]},
  {id:"2026-11-08",t:"Türkiye kıyıları düzeltildi",items:[
    "Deniz GES'i ve diğer deniz sahaları artık haritada karada görünmüyor: Türkiye çevresinde kara ve deniz ayrıntılı kıyı verisiyle ayrılıyor (önceki kaba kıyı ~2 km sapıyordu).",
    "Kıyıya 1 km'den yakın şeritte saha açılmaz; saha panelinde nedeni yazar.",
    "Eski kayıtlarda yanlış tarafta ya da kıyı şeridinde kalan sahaların en yakın uygun noktaya bir kez taşındı; santraller yerinde, günlüğe not düşüldü."]},
  {id:"2026-11-05",t:"Güneş santralinin maliyeti piyasaya göre",items:[
    "Güneş santrallerinin (GES, yüzer GES, deniz GES'i) kurulum bedeli artık piyasaya göre değişiyor: Avrupa'da %13, Kuzey Amerika'da %53, Afrika'da %58 pahalı, Asya'da %15 ucuz (IRENA 2024 bölge ortalamaları). Türkiye ve diğer piyasalar küresel ortalamada.",
    "Kurulum panelinde not; santrallerin getirisi (proje ekonomisi) aynı maliyetle hesaplanır. Rüzgâr ve diğer teknolojiler değişmedi."]},
  {id:"2026-11-04.5",t:"Deniz üstü rüzgâra fark sözleşmesi",items:[
    "Avrupa'da deniz üstü RES (offshore) artık fark sözleşmesi alır: Britanya'nın Ocak 2026 turundaki fiyatla 122,0 $/MWh, ilk bloğun kurulumundan itibaren 20 ekonomik yıl (~116 gün). Piyasa fiyatı altındaysa fark sana ödenir, üstündeyse geri ödersin.",
    "Fark proje gelirine katılır: santralin getirisi (IRR) destekli değeri gösterir. Günlük raporda \"Fark sözleşmesi\" satırı, saha panelinde kalan süre. Daha önce kurduğun offshore santraller bugünden başlayarak alır.",
    "Yüzer RES ve diğer piyasalar almaz. Haber bandında Britanya'nın sonuçları ve Türkiye'nin 2027'ye planlanan ilk deniz üstü YEKA'sı; sözlükte \"Fark sözleşmesi\"."]},
  {id:"2026-11-04.4",t:"Şebeke bağlantı kapasitesi",items:[
    "Türkiye'de yeni RES, GES ve deniz GES'i için her yıl 75 MW serbest bağlantı kontenjanın var; 30 Eylül'de kapanır, 1 Ocak'ta yenilenir. Kurulum panelinde kalan kontenjan görünür.",
    "Kontenjan bitince depolamalı kurarsın: sahaya önce batarya kur, üretim gücü bataryanın gücünü aşamaz. Sahada boşta batarya varsa yeni blok önce ona bağlanır, kontenjan başka sahalara kalır. YEKA sahası ve ilk projen kontenjana sayılmaz.",
    "Gerçek 2026'dan: lisanssıza 3.500 MW açıldı, iletimdeki kapasitenin %97'si Eylül sonunda dağıtılmıştı. Haber bandında iki gerçek haber, sözlükte \"Bağlantı kapasitesi\"."]},
  {id:"2026-11-04.3",t:"YEKA yarışmaları",items:[
    "Her yıl 2 Kasım'dan sonra Türkiye'de bir YEKA yarışması kartı çıkar: 2026 yarışmalarının illerinden birinde bir RES ya da GES sahası. Fiyat taban fiyattır; MW başına katkı payını sen seçersin, rakibin teklifi 2026'nın gerçek kazanan tekliflerinden biridir.",
    "Kazanırsan izni hazır, sınırı büyük olabilen bir saha alırsın. Önce serbest piyasada satarsın (RES 6, GES 5 ekonomik yıl), sonra 20 ekonomik yıl sabit fiyat: RES 58,2, GES 54,0 $/MWh. Günlük raporda \"YEKA farkı\" satırı, saha panelinde sözleşmenin durumu.",
    "Haber bandında 2026 YEKA RES ve GES sonuçları; sözlükte \"YEKA\"."]},
  {id:"2026-11-04.2",t:"Kurak ve yağışlı yıllar",items:[
    "Türkiye'de her takvim yılı kurak, normal, yağışlı ya da çok yağışlı geçer. Yağışlı yılda ilkbaharda bol su fiyatları düşürür, öğle saatleri sıfıra yaklaşır; Türkiye'deki HES'lerine daha çok su gelir. Kurak yılda HES'e daha az su gelir, fiyat biraz yükselir.",
    "2026 gerçek yıldır ve çok yağışlı geçiyor (TEİAŞ): oyunun ilk ilkbaharında Türkiye fiyatları düşük. Sonraki yıllar 1 Ocak'ta 2015–2025'in gerçek yıllarından biri seçilerek belirlenir; haber bandında ve saha panelinde görünür.",
    "YEKDEM kararı artık bir risk kararı: ertesi yılın hidrolojisi başvuru tarihinde (30 Kasım) belli değil. Saha panelinde geçmiş yılların dağılımı var.",
    "Sözlükte \"Hidrolojik yıl\"; haber bandında 2026 ilkbaharının gerçek fiyat haberi (1 Haziran)."]},
  {id:"2026-11-04",t:"Türkiye'de YEKDEM",items:[
    "Türkiye'deki GES ve rüzgâr sahaların için YEKDEM'e katılabilirsin: başvuru her yıl 30 Kasım'a kadar saha panelinden, ertesi yıl boyunca üretim sabit fiyattan (59,2 $/MWh) satılır ve yıl içinde çıkılamaz. Piyasa fiyatı bunun altındaysa kazandırır, üstündeyse kaybettirir.",
    "Sahadaki batarya, sahanın kendi üretiminden doldurup şebekeye verdiği enerji için daha yüksek fiyat (69,9 $/MWh) alır; şebekeden doldurduğu enerji kapsam dışı. Fiyatlar gerçek Ekim 2026 YEKDEM tarifesinden.",
    "Yeni sahan, ilk santralinin işletmeye girdiği yıl için 30 gün içinde hemen de katılabilir. Günlük raporda \"YEKDEM farkı\" satırı.",
    "İlk projedeki alım garantisi artık \"başlangıç desteği\" olarak anılıyor; sözlükteki süresi düzeltildi (5 gün değil, ~29 oyun günü).",
    "Haber bandında gerçek dünyadan haberler: oyun takvimi tarihine gelince görünür (ilki: korunan alanlarda rüzgâr santrallerine 18 türbin sınırı)."]},
  {id:"2026-10-30.5",t:"Harita daha çabuk yükleniyor",items:[
    "Harita yakınlaşınca ve yer değiştirince çok daha az veri indiriyor; ayrıntı daha çabuk geliyor. Arazi gölgesi bölge görünümünde biraz daha yumuşak.",
    "Gezdiğin yerlerin harita ayrıntısı cihazında saklanıyor: aynı yere dönünce ve oyunu bir sonraki açışında beklemeden geliyor, internet kesikken de görünüyor."]},
  {id:"2026-10-30.4",t:"Pervaneler yine dönüyor",items:[
    "Haritada yakınlaşınca rüzgâr türbinlerinin pervaneleri ve gölgeleri yine dönüyor; hız o saatteki rüzgâr üretimine göre değişir, rüzgâr yokken durur.",
    "Vaka çalışması güncel modelle yeniden hesaplandı (Ayarlar ▸ Vaka çalışması)."]},
  {id:"2026-10-30.3",t:"Akıcı harita",items:[
    "Harita artık varsayılan olarak oyunun kendi haritasıyla açılır: zemini oyunla gelir, yer değiştirirken ya da uzaklaşırken hiç boş kalmaz.",
    "Apple Haritalar isteyenler için Ayarlar ▸ Harita'dan seçilebilir; seçimin hatırlanır. Apple'da yer değiştirince görüntü birkaç saniye gelmeyebilir."]},
  {id:"2026-10-30.2",t:"Türkiye fiyatları gerçeğe yakın",items:[
    "Türkiye'de elektrik fiyatları ~%8 düştü: ilk oyun yılının ortalaması EPİAŞ 2025 ortalamasına (66 $/MWh) eşitlendi. Önceden ilk yıl ~%9 yüksekti. Türkiye'deki santrallerin geliri buna göre azalır; güneşin ve rüzgârın fiyat oranı değişmez."]},
  {id:"2026-10-30",t:"Varsayılan harita: Standart",items:[
    "Apple haritası artık Standart görünümle açılır: karoları uydu görüntüsünden hafiftir, yer değiştirince boş kareler daha kısa sürmeli. Uydu görüntüsü için sağ üstteki küre düğmesinden Uydu ya da Hibrit'i seç; seçimin hatırlanır (önceki seçimler bir kez sıfırlandı)."]},
  {id:"2026-10-29.9",t:"Uzaklaşınca Apple haritası",items:[
    "Haritadan uzaklaşınca (geri çekilince) gece ve bulut katmanları Apple'ın yeni uydu görüntüsü yüklenene kadar bekler: çevredeki boş karanlık kareler daha kısa sürer."]},
  {id:"2026-10-29.8",t:"Apple haritası daha akıcı",items:[
    "Yer değiştirince Apple haritasının boş kalan karanlık kareleri azaldı: gece ve bulut katmanlarımız artık Apple'ın uydu görüntüsüyle aynı anda yüklenmiyor; yakında gece karanlığı yalnızca koyulaşıp açılır."]},
  {id:"2026-10-29.7",t:"Avrupa'da bölgesel rüzgâr",items:[
    "Avrupa piyasasında fiyat artık Almanya ve İspanya'nın rüzgâr santrali bölgelerinin toplam üretimine tepki verir: rüzgârlı saatlerde fiyat bütün piyasada birlikte düşer.",
    "Avrupa'da RES'in ortalama satış fiyatı piyasa ortalamasının ~%88'i (gerçekte ~%90; önce ~%97); RES geliri biraz azalır, depolamanın fiyat farkı büyür. Güneşin oranı ve ortalama fiyat gerçeğe yakın kalır."]},
  {id:"2026-10-29.6",t:"Uygulama gibi oyna",items:[
    "Ayarlar ▸ Ana ekrana ekle: Wattlas telefonda ana ekrana eklenip uygulama gibi tam ekran açılır (Android ve masaüstünde kurulum penceresi, iPhone'da adım adım).",
    "Oyun dosyaları cihazda saklanır: açılış hızlanır, internet kesikken de oyun açılır (harita için internet gerekir).",
    "iPhone'da ana ekrandaki uygulama Safari'nin kaydını görmez: kaydını Kaydı indir ▸ Kayıt yükle ya da bulut kayıtla taşı."]},
  {id:"2026-10-29.5",t:"Proje ekonomisi düzeltmesi",items:[
    "Yüzer GES ve deniz üstü GES'in proje ekonomisinde panel yaşlanması (yıllık %0,5 üretim kaybı) artık kara GES'i gibi hesaba katılır; LCOE ~%3 artar."]},
  {id:"2026-10-29.4",t:"Deniz üstü GES",items:[
    "Yeni teknoloji: kıyıya 20 km'den yakın sığ denizde çelik kazıklar üstündeki sarı kafes platformlara kurulan güneş santrali (Çin'deki 1 GW'lık projeler gibi).",
    "Yatırımı kara GES'inin ~1,4 katı (kazık, kafes, deniz kablosu), deniz yansıması ve serinlikle ~%4 fazla üretim; arazi kullanmaz ama saha sınırına sayılır.",
    "Sığ deniz sahalarında artık güneş kaynağı da gösterilir; sözlükte \"Deniz üstü GES\" terimi, raporda \"GES denizde\" satırı."]},
  {id:"2026-10-29.3",t:"Açık temada okunabilirlik",items:[
    "Açık temada teknoloji renkli düğme, sekme ve rozetlerdeki yazılar daha okunaklı: güneş sarısında yazı koyu, rüzgâr, batarya, biyokütle, deniz ve jeotermal zeminleri biraz koyulaştı. Haritadaki renkler değişmedi.",
    "Kazanç rakamları, sözlük bağlantıları ve premium etiketi açık zeminde daha koyu tonda (WCAG 4,5:1 oranı)."]},
  {id:"2026-10-29.2",t:"Gerçekçi yüzer GES",items:[
    "Yüzer GES fotoğraflardaki üç yaygın düzenden biriyle kurulur (sahaya göre): bloklara bölünmüş, güneye bakan panel sıraları; doğu-batıya eğimli çatı biçimli sıralar; ya da siyah boru halkalı yuvarlak adalar.",
    "Bloklar arasında su koridorları ve bakım yolları; çatı düzeninde koyu şamandıralar, yeşil yan şamandıralar ve sırtlarda dizi kutuları; halka adalarda korkuluk.",
    "Kıyıya yüzer yürüme yolu ve kıyıda kabin, bağlama halatları ve çapa şamandıraları, adanın çevresinde turuncu uyarı şamandıraları; ada artık mansaptaki nehre taşmaz."]},
  {id:"2026-10-29",t:"Gerçekçi deniz üstü rüzgâr",items:[
    "Deniz üstü türbinlerin temeli fotoğraflardaki gibi: monopilde su hattından ~18 m yükselen sarı geçiş parçası, bazı sahalarda sarı kafes (jacket) temel.",
    "Temelin üstünde korkuluklu erişim güvertesi, küçük vinç ve tekne yanaşma merdiveni; gövdenin üstünde kırmızı korkuluklu helikopter platformu.",
    "Açık deniz trafo platformu: sarı kafes ayaklar üstünde iki katlı güverte, modüller ve platform vinci."]},
  {id:"2026-10-28.10",t:"Depolama ve hidrojene destek",items:[
    "Kapasite ödemesi: Avrupa ve Kuzey Amerika'da batarya ve pompaj HES zirveye hazır güç için günlük ödeme alır (Büyük Britanya ve PJM açık artırma fiyatlarıyla). Arızalıyken ya da batarya boştayken ödenmez.",
    "Yeşil hidrojen desteği: Avrupa'da Hidrojen Bankası primi (~0,45 $/kg), ABD'de 45V vergi kredisi (3 $/kg, takvim 2028'e gelmeden kurulana), 10 ekonomik yıl. Yalnızca aynı sahadaki rüzgâr ve güneşle üretilen hidrojene ödenir.",
    "Türkiye'de depolamaya kapasite ödemesi ve hidrojen üretim desteği yok; saha paneli her piyasada durumu yazar.",
    "Rapor ve proje ekonomisi destekleri ayrı gösterir; hidrojen desteği yalnızca ilk 10 yıl hesaba girer."]},
  {id:"2026-10-28.9",t:"Gerçekçi rüzgâr türbinleri",items:[
    "Türbinler kurulurken rüzgâr nereden esiyorsa o yöne bakar; sıralar rüzgâra dik dizilir, aynı sıradaki türbinler birbirinin rüzgâr gölgesinde kalmaz.",
    "Türbin modeli gerçek santrallerin fotoğraflarına göre yenilendi: ince kule, yuvarlak köşeli gövde, havalandırma panjurları ve ölçüm çerçevesi, iri burun, ince uzun kanatlar ve uçlarında kırmızı-beyaz-kırmızı ikaz bantları.",
    "Haritada türbin göğe bakmıyor: uydu görüntüsündeki gibi rotor tepeden ince bir çizgi, pervanenin üç kanatlı dönen şekli gölgesinde.",
    "Tesis görüntülerinde güneş sabah güneydoğudan vurur; gölgeler altlık uydu görüntüsündeki gölgelerle aynı yöne düşer.",
    "3D görünümde kuzey ve güney rüzgârında türbinler rüzgâra sırtını dönüyordu; düzeldi."]},
  {id:"2026-10-28.8",t:"Dört yeni teknoloji",items:[
    "Yüzer GES: HES'in baraj gölüne kurulur, HES'in şebeke bağlantısını paylaşır. Saha sınırına sayılmaz, en çok HES'in gücü kadar olabilir; su panelleri soğuttuğu için biraz fazla üretir.",
    "Pompaj depolamalı HES: dağlık sahada iki hazne. Ucuz saatte suyu üst hazneye basar, pahalı saatte üretir; 10 saatlik depo (bataryanın 5 katı).",
    "Yeşil hidrojen: elektrolizör, elektrik ucuzken hidrojen üretip sabit fiyattan satar. Öğle fiyatı sıfıra düştüğünde satılamayan güneşi hidrojene çevirir.",
    "CSP (kule, erimiş tuz): çölde ya da çok güneşli yerde. Isıyı depolar, akşam zirvesinde ve gece üretir; yatırımı yüksek.",
    "Dördünün de haritada ve yakın görünümde kendi modeli var: göldeki panel adası, iki hazne ve cebri borular, elektrolizör tesisi, heliostat alanı ve kule.",
    "Rapor ve proje ekonomisi yeni satırları gösterir; olay kartları (toz fırtınası, sıcak hava, şebeke kısıtı) yeni tesisleri de kapsar.",
    "HES vadisinde nehir yatağının bir kısmı haritadaki görüntüde eksik çiziliyordu; düzeldi.",
    "Haritada ve yakın görünümde dönen pervanelerin gölgesi de var: kule gölgesinin ucunda, pervaneyle eş zamanlı döner."]},
  {id:"2026-10-28.7",t:"Yüzer rüzgâr",items:[
    "Yeni teknoloji: Yüzer RES (çift rotor). V biçimli iki kule, üç yüzer kolon, rüzgâra kendiliğinden dönen tek nokta bağlamalı platform.",
    "Derin deniz artık boş değil: kıyıya 200–350 km'lik bantta yalnızca yüzer RES kurulabilir; sığ denizde sabit tabanlıyla birlikte seçilebilir.",
    "Toplam 60 MW kurulu güçten sonra açılır; yatırımı sabit tabanlı açık denizin ~1,9 katı, fırtınada hasar görmez.",
    "Deniz sahalarının yakın görünümünde zemin deniz rengi."]},
  {id:"2026-10-28.6",t:"Gerçekçi sahalar",items:[
    "GES: parsele uyan düzen, iç yollarla bloklar, blok başına inverter istasyonu, mavi modüller (kademeye göre ton), satır aralarında toprak, çevre yolu ve çit, işletme binası.",
    "HES: vadiyi dolduran baraj gölü (doğal kıyı çizgisi, sığ yerler açık, derinler koyu), ormanlı yamaçlar, mansapta nehir, kret yolu, dolusavak kapakları, cebri borular, şalt sahası.",
    "Biyokütle ve biyogaz: beyaz kubbeli çürütücüler, brandalı silaj bunkerleri, kazan evi, işaretli baca, yakıt deposu, gaz motorları, kantar ve kamyonlar.",
    "Deniz enerjisi platformları ve dalga şamandıraları artık hacimli; rüzgâr, batarya, jeotermal ve trafo merkezine yeni ayrıntılar.",
    "Haritadaki pervaneler kayık değil, düzgün görünür.",
    "Yakın görünümde yakınlaştırma (tekerlek, iki parmak, çift tık, + / −); ekran kartlı masaüstünde görüntü çok daha keskin."]},
  {id:"2026-10-28.5",t:"Sahada hava ve mevsim",items:[
    "Yakın görünümde sahanın havası: yağmur, kar ve fırtınada şimşek; zemin mevsime göre renk değiştirir (güney yarıkürede ters, dönencelerde mevsim yok).",
    "Kar panelleri örtünce saha hem yakın görünümde hem haritada karlı görünür.",
    "Efektler yalnızca CSS ile çizilir; \"hareketi azalt\" açıksa yağış durağan, şimşek kapalı."]},
  {id:"2026-10-28.4",t:"Karanlık temada okunurluk",items:[
    "Karanlık temada teknoloji renkli düğme ve etiketlerde (GES, RES, batarya…) yazı koyu: açık renk zeminde beyaz yazı okunmuyordu.",
    "Şirket avatarının yazı rengi seçtiğin renge göre otomatik; kilitli rozetler soluk değil, okunur; kazanılanlarda ✓ var.",
    "Piyasa grafiğinin başlığı ve lejantı gündüz gökyüzünde de okunur (koyu yarı saydam şerit).",
    "Saha doluysa panel nedenini yazar: saha sınırına (40 MW) batarya dahil tüm tesisler sayılır."]},
  {id:"2026-10-28.3",t:"İflastan sonra temiz başlangıç",items:[
    "İflas ekranındaki \"Yeni oyun\" şirket profilini de siler; kurulum ekranı yeniden açılır (\"Yeniden başla\" ile aynı)."]},
  {id:"2026-10-28.2",t:"Saha satışı",items:[
    "Sahayı sat: portföydeki bir sahayı bir altyapı fonunun teklifiyle satabilirsin (saha paneli, eğitimden sonra).",
    "Teklif santralin oyunda gerçekleşen nakit akışından hesaplanır; sahanın kredisi bedelden kapanır, defter değerine göre kâr ya da zarar gösterilir.",
    "Sözlüğe defter değeri ve gelir yöntemi eklendi."]},
  {id:"2026-10-28",t:"Daha hızlı ilk büyüme, daha net kontroller",items:[
    "Sözlük: piyasa, proje, finans ve teknoloji terimleri tek yerde (Ayarlar).",
    "Sürüm notları: bu pencere. Yeni bir sürüm gelince Ayarlar'da işaret görünür.",
    "Hız artık üç ayrı düğme: 1x, 3x, 8x. Seçili hız basılı görünür.",
    "İlk yenilenebilir projene 5 gün boyunca 90 $/MWh alım garantisi.",
    "Yeni görev: ilk kredili bloğunu kur. 1 M$ portföy değerinde \"Bölgesel oyuncu\" ara zaferi.",
    "Haritada dönen pervaneler ve batarya şarj çubuğu.",
    "Ekran kartı kullanmayan tarayıcıda 3D yerine hafif yakın görünüm: donma yok. \"Tam 3D\" yine açılabilir.",
    "Masaüstünde panel geniş ekranda büyür, rapor tabloları sığar.",
    "\"Yeniden başla\" şirket profilini de siler (kutu varsayılan olarak işaretli)."]},
  {id:"2026-10-25",t:"İlk 10 dakika",items:[
    "8 adımlı eğitim görevleri; ilgili düğme vurgulanır.",
    "Uygun ilk sahada ilk izin garantili ve kısa.",
    "İlk satışta sonuç kartı: üretim, fiyat, gelir ve havanın etkisi.",
    "İzin reddinde dört yol: yeniden başvur, ek ÇED, projeyi küçült, yerel ortak.",
    "GÖP masasına kısa giriş açıklaması.",
    "Yakınlaşınca saha sınırı, doluluk ve canlı üretim kutusu.",
    "Gerçek santraller katmanında Türkiye kapsaması ETKB Eylül 2026 sonu kurulu gücüyle karşılaştırılır."]},
  {id:"2026-10-19",t:"Hız ve kararlılık",items:[
    "Haritada daha akıcı kaydırma; iPhone'da çökme sonrası güvenli açılış.",
    "Takvim oyun gününden 3 kat hızlı: mevsimler 120 oyun gününde döner.",
    "Rüzgâr yatırım maliyeti güneşle aynı ölçeğe çekildi."]},
  {id:"2026-10-18",t:"Finansman ve gerçek santraller",items:[
    "Banka kredisi: yatırımın bir kısmı borçla, günlük taksit.",
    "Proje finansmanı tablosu: borç, DSCR, vergi, PPA ve fiyat stresi.",
    "Gerçek santraller katmanı (OpenStreetMap): önce Türkiye, sonra dünya; tür filtresi.",
    "Fiyat modeli 2025 verisiyle kalibre edildi (Türkiye: EPİAŞ; Avrupa: ENTSO-E).",
    "Rüzgâr üretimi TEİAŞ, EPDK ve ENTSO-E 2025 verisiyle kalibre edildi.",
    "Vaka çalışması sayfaları ve anonim geri bildirim formu."]},
  {id:"2026-10-17",t:"Proje ekonomisi",items:[
    "Her santral için LCOE, NPV, IRR ve geri ödeme süresi.",
    "Eğimli arazide düz zemin isteyen tesisler kurulamaz."]},
  {id:"2026-10-13",t:"Gerçek kaynak verisi",items:[
    "Güneş ve rüzgâr kaynağı NASA POWER iklim verisinden.",
    "Yerleşim alanlarında santral kurulamaz.",
    "Tesisler gerçek ölçekte ve araziye oturtulmuş."]},
  {id:"2026-10-12",t:"Rehber ve kayıt",items:[
    "İlk oyun rehberi, geri alma, kayıt dosyası ve bulut kayıt.",
    "Güneş ve rüzgâr potansiyel haritası, yer arama.",
    "Klavyeyle haritada gezinme; mobilde alttan açılan panel."]},
  {id:"2026-10-11",t:"Wattlas",items:[
    "Oyunun adı Wattlas; Apple Haritalar ana harita.",
    "Jeotermal, biyokütle ve deniz enerjisi santralleri."]}
];
export const LATEST=NOTES[0].id;
