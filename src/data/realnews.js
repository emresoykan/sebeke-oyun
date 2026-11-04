// Gerçek dünyadan haberler: oyun takviminde tarihi gelince haber bandında bir kez görünür (news.js realNews). Yalnızca
// kamuya açık, kaynağı belli gelişmeler; kaynaklar ve doğrulama notu docs/guncellemeler.md'de.
// d: gelişmenin tarihi (YYYY-AA-GG), i: simge, t: metin
export const REAL_NEWS=[
  {id:"2026-03-02-lisanssiz",d:"2026-03-02",i:"🔌",
    t:"TEİAŞ 2026 lisanssız üretim kapasitesini duyurdu: yeni RES ve GES için 3.500 MW (iletim 1.500, dağıtım 2.000 MW; EPDK'nın 26 Şubat 2026 tarihli 14353 sayılı kararı). Bir şirket iletimden en çok 75, dağıtımdan 10 MW alabilecek."},
  {id:"2026-06-01-hidro",d:"2026-06-01",i:"🌊",
    t:"Türkiye'de Nisan ve Mayıs'ta gün öncesi fiyatı (PTF) ortalaması 20,7 ve 13,0 $/MWh'e indi; bir yıl önce 64,6 ve 63,6'ydı. Aynı aylarda HES üretimi ayda ~11,7 TWh ile 2025'in %58–59 üstündeydi. Saatlerin yarısında fiyat Nisan'da 8,1, Mayıs'ta 4,2 $/MWh'in altındaydı (EPİAŞ, TEİAŞ)."},
  {id:"2026-09-30-lisanssiz",d:"2026-09-30",i:"🔌",
    t:"Lisanssız RES ve GES için iletim seviyesinde açılan 1.500 MW'ın yalnızca 38,3 MW'ı kaldı; 15 bölgeden 4'ünde kapasite var (Erzincan 14,1, Elazığ 13,8, Konya 5,4, Eskişehir 5 MW). Dağıtım seviyesindeki 2.000 MW'ın 16 Temmuz'da 833,6 MW'ı kalmıştı."},
  {id:"2026-11-02-yeka-res",d:"2026-11-02",i:"🌬️",
    t:"YEKA RES-2026: 7 yarışmada 1.500 MWe rüzgâr kapasitesi tahsis edildi. Yarışmaların hepsi taban fiyatta (3,50 €c/kWh) kapandı; kazananı MW başına katkı payı belirledi (0–154 bin €/MW, toplam 62,9 milyon €, KDV hariç). Sözleşmeden sonraki 72 ay serbest piyasa, ardından 20 yıl bu fiyattan alım."},
  {id:"2026-11-03-yeka-ges",d:"2026-11-03",i:"☀️",
    t:"YEKA GES-2026: 11 yarışmada 785 MWe güneş kapasitesi tahsis edildi (3 yarışma iptal edildi). Taban fiyat 3,25 €c/kWh; katkı payları MW başına 16–91 bin €, toplam 37,9 milyon € (KDV dahil). Sözleşmeden sonraki 60 ay serbest piyasa, ardından 20 yıl bu fiyattan alım."},
  {id:"2026-11-03-ilke157",d:"2026-11-03",i:"🏞️",
    t:"Nitelikli doğal koruma alanlarında rüzgâr santralleri için 50 MWm güç sınırı kaldırıldı; türbin sayısı en çok 18 (önceden 20). Projeler koruma amaçlı imar planına göre değerlendirilecek (157 sayılı İlke Kararı, Resmî Gazete 33419). Karar milli parkları kapsamıyor; oyundaki korunan alanlar milli parktır."},
];
