// --- Sürüm notları: oyuncunun göreceği değişiklikler, en yenisi önce ---
// id: yayın tarihi (YYYY-MM-DD; aynı gün ikinci yayın YYYY-MM-DD.2; "yeni" işareti en üstteki id'ye göre). Yeni bir yayında en üste bir kayıt eklenir;
// yalnızca oyuncunun fark edeceği değişiklikler yazılır (iç düzenlemeler, testler ve betikler yazılmaz).
export const NOTES=[
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
