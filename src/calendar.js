// --- Takvim ve mevsimler ---
// Oyun 20 Mart 2026'da (ilkbahar ekinoksu) başlar; her oyun günü takvimi 3 gün ilerletir, böylece bir yıl 120 oyun
// gününde geçer. Güneşin eğimi (deklinasyon) gün uzunluğunu, öğle güneşinin yüksekliğini ve hava sistemlerinin
// enlemini belirler; aylık talep çarpanı fiyatları etkiler. DOM'a bağımlı değildir.
const DAY_MS=864e5, START=Date.UTC(2026,2,20), STEP=3, RAD=Math.PI/180;
export const TR_LAT=39, SOLAR_NOON=12.7; // Türkiye saatiyle (UTC+3) ortalama öğle

export const dateOf=dayNo=>new Date(START+(dayNo-1)*STEP*DAY_MS);
export const doyOf=d=>Math.floor((d-Date.UTC(d.getUTCFullYear(),0,1))/DAY_MS)+1;
// güneşin eğimi (derece): yazın +23,4, kışın −23,4
export const declOf=d=>23.44*Math.sin(2*Math.PI*(284+doyOf(d))/365);

const AYLAR=["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
export const fmtDate=d=>`${d.getUTCDate()} ${AYLAR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
// mevsim (kuzey yarımküreye göre; güney yarımkürede tersi)
export function seasonOf(d,lat=TR_LAT){
  let m=d.getUTCMonth();if(lat<0)m=(m+6)%12;
  return m>=2&&m<=4?{k:"spr",n:"İlkbahar",i:"🌸"}:m>=5&&m<=7?{k:"sum",n:"Yaz",i:"☀️"}:m>=8&&m<=10?{k:"aut",n:"Sonbahar",i:"🍂"}:{k:"win",n:"Kış",i:"❄️"};
}

// Gün uzunluğu (saat) ve öğle güneşinin göreli yüksekliği (ekinoksa göre) bir enlem için
export function dayLength(lat,decl){const x=-Math.tan(lat*RAD)*Math.tan(decl*RAD);return x<=-1?24:x>=1?0:2*Math.acos(x)/RAD/15;}
export const noonAmp=(lat,decl)=>Math.max(0.05,Math.cos((lat-decl)*RAD))/Math.max(0.2,Math.cos(lat*RAD));

// Aylık talep çarpanı (kuzey yarımküre): kışın ısınma, yazın klima talebi yüksek; ilkbaharda talep düşük ve su bol
const DEMAND=[1.10,1.05,0.95,0.86,0.86,0.96,1.10,1.12,1.00,0.97,1.02,1.08];
export const demandOf=(d,lat)=>{let m=d.getUTCMonth();if(lat<0)m=(m+6)%12;return Math.abs(lat)<12?1:DEMAND[m];};

// Güncel takvim durumu: sim.js her gün başında ayarlar; güneş eğrisi (utils.shape) buradan okur
export const CAL={date:dateOf(1),decl:0,rise:6.7,set:18.7,len:12};
export function setCalendar(dayNo){
  const d=dateOf(dayNo),decl=declOf(d),len=dayLength(TR_LAT,decl);
  Object.assign(CAL,{date:d,decl,len,rise:SOLAR_NOON-len/2,set:SOLAR_NOON+len/2});
  return CAL;
}
