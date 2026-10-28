// --- Sürüm notları: oyuncunun göreceği değişiklikler, en yenisi önce ---
// id: yayın tarihi (YYYY-MM-DD; aynı gün ikinci yayın YYYY-MM-DD.2; "yeni" işareti en üstteki id'ye göre). Yeni bir yayında en üste bir kayıt eklenir;
// yalnızca oyuncunun fark edeceği değişiklikler yazılır (iç düzenlemeler, testler ve betikler yazılmaz).
export const NOTES=[
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
