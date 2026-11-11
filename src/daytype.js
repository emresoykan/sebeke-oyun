// --- Gün tipi (Türkiye): iş günü, cumartesi, pazar, resmî tatil, bayram ---
// Gerçekte: talep hafta sonu ve tatilde gündüz düşer; fiyat gece ve akşam neredeyse aynı kalırken gündüz derin iner.
// EPİAŞ 2024–2025 saatlik PTF, aynı ayın iş günlerine göre (docs/kalibrasyon.md "Hafta sonu ve tatil"): cumartesi gün
// ortalaması 0,93 (öğle 10–15: 0,77), pazar 0,78 (0,40), tek günlük resmî tatil 0,85 (0,61), Ramazan ve Kurban Bayramı
// arife dahil 0,52 (0,08).
// Bayram tarihleri: 2024–2026 gerçek (EPİAŞ fiyat düşüşüyle de doğrulandı); sonraki yıllar tablolu hicri takvimden
// hesaplanır (gerçek tarihten ±1 gün sapabilir). Ramazan Bayramı 3, Kurban Bayramı 4 gün; ikisinin de arifesi bayram sayılır.
const FIXED={"01-01":"Yılbaşı","04-23":"23 Nisan","05-01":"1 Mayıs","05-19":"19 Mayıs","07-15":"15 Temmuz","08-30":"30 Ağustos",
  "10-29":"Cumhuriyet Bayramı"};
const KNOWN={2024:{r:"04-10",k:"06-16"},2025:{r:"03-30",k:"06-06"},2026:{r:"03-20",k:"05-27"}};
const DAY=864e5;
const jdn=(y,m,d)=>{const a=Math.floor((14-m)/12),Y=y+4800-a,M=m+12*a-3;
  return d+Math.floor((153*M+2)/5)+365*Y+Math.floor(Y/4)-Math.floor(Y/100)+Math.floor(Y/400)-32045;};
// tablolu (aritmetik) hicri takvim: Jülyen gün numarasından hicri yıl, ay, gün
function hijri(J){const z=J-1948440+10632,n=Math.floor((z-1)/10631),z2=z-10631*n+354;
  const j=Math.floor((10985-z2)/5316)*Math.floor((50*z2)/17719)+Math.floor(z2/5670)*Math.floor((43*z2)/15238);
  const z3=z2-Math.floor((30-j)/15)*Math.floor((17719*j)/50)-Math.floor(j/16)*Math.floor((15238*j)/43)+29;
  const m=Math.floor((24*z3)/709);return {m,d:z3-Math.floor((709*m)/24)};}
const cache={};
// bir takvim yılında başlayan bayramlar: [{k:"r"|"k", t: ilk günün zamanı (ms, UTC gece yarısı)}]
function starts(y){
  if(cache[y])return cache[y];const out=[];
  if(KNOWN[y])for(const k of ["r","k"]){const [m,d]=KNOWN[y][k].split("-").map(Number);out.push({k,t:Date.UTC(y,m-1,d)});}
  else for(let t=Date.UTC(y,0,1);t<Date.UTC(y+1,0,1);t+=DAY){const x=new Date(t),h=hijri(jdn(y,x.getUTCMonth()+1,x.getUTCDate()));
    if(h.m===10&&h.d===1)out.push({k:"r",t});else if(h.m===12&&h.d===10)out.push({k:"k",t});}
  return cache[y]=out;
}
const BAY={r:{n:"Ramazan Bayramı",len:3},k:{n:"Kurban Bayramı",len:4}};
// tarih bir bayramın arifesi ya da günüyse {k, n, arife}
export function bayramOf(d){
  const t=Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate());
  for(const y of [d.getUTCFullYear()-1,d.getUTCFullYear(),d.getUTCFullYear()+1])for(const s of starts(y)){
    const o=Math.round((t-s.t)/DAY);if(o>=-1&&o<BAY[s.k].len)return {k:s.k,n:BAY[s.k].n,arife:o===-1};}
  return null;
}
const GUN=["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"],GUN3=["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"];
// gün tipi: bay (bayram, arife dahil) > hol (resmî tatil) > sun > sat > wd
export function dayType(d){
  const b=bayramOf(d),g=GUN[d.getUTCDay()],g3=GUN3[d.getUTCDay()];
  if(b)return {k:"bay",n:b.arife?`${b.n} arifesi`:b.n,g,g3,bk:b.k,arife:b.arife};
  const f=FIXED[String(d.getUTCMonth()+1).padStart(2,"0")+"-"+String(d.getUTCDate()).padStart(2,"0")];
  if(f)return {k:"hol",n:f,g,g3};
  const w=d.getUTCDay();return {k:w===0?"sun":w===6?"sat":"wd",n:null,g,g3};
}
// Gün başı (sim.js newDay): bayramın ilk oyun günü ve resmî tatil haber bandında (fiyat neden düştü)
export function dayNews(d,S,news){
  const t=dayType(d);if(t.k!=="bay"&&t.k!=="hol")return;
  const key=t.k==="bay"?`${d.getUTCFullYear()}-${t.bk}`:`${d.getUTCFullYear()}-${t.n}`;if((S.dtNews||(S.dtNews=[])).includes(key))return;
  S.dtNews.push(key);if(S.dtNews.length>20)S.dtNews.shift();
  news("🎉",`${t.k==="bay"?t.n.replace(" arifesi",""):t.n}: Türkiye'de talep düşük, gündüz fiyatları ${t.k==="bay"?"birkaç gün sıfıra yakın":"hafta sonu gibi düşük"}.`,"price");
}
// fiyattaki talep teriminin saatlik çarpanı (config.js REG.T.dt): a × (1 − d × w[saat]); iş gününde 1
export function dayFactor(d,dt){
  const x=dt&&dt[dayType(d).k];if(!x)return null;
  return dt.w.map(w=>(x.a??1)*(1-(x.d??0)*w));
}
