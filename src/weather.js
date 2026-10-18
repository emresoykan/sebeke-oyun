// --- Hava durumu modeli ---
// Dünya üzerinde hareket eden hava sistemleri: alçak basınç (bulut, yağmur, kuvvetli rüzgâr), yüksek basınç (açık ve
// durgun hava), fırtına hücreleri ve sıcak hava kütleleri. Orta enlemlerde batıdan doğuya, tropiklerde doğudan batıya
// ilerlerler; ömürleri boyunca güçlenip zayıflarlar. Herhangi bir nokta ve saatteki bulut örtüsü, yağış, rüzgâr hızı ve
// yönü bu sistemlerin toplamından hesaplanır. Model meteorolojik bir tahmin modeli değil, gerçek örüntülere benzeyen
// bir oyun simülasyonudur. Yeni sistemler tohumlu rastgele sayıyla doğar; böylece gün başındaki 24 saatlik tahmin,
// gün içindeki gerçekleşmeyle aynı sistemleri izler. DOM'a bağımlı değildir (Node'da da çalışır).

const KM=111.2, RAD=Math.PI/180;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

// tohumlu rastgele sayı (mulberry32); durum wx.seed içinde saklanır
function rand(wx){let t=(wx.seed=(wx.seed+0x6D2B79F5)|0);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}
const between=(wx,a,b)=>a+(b-a)*rand(wx);

// sistem türleri: hedef sayı, boy (km), ömür (saat), hareket
const KINDS={
  low:{n:16,r:[600,1100],life:[48,96]},
  high:{n:8,r:[1000,1600],life:[72,144]},
  storm:{n:5,r:[160,320],life:[14,36]},
  heat:{n:2,r:[500,800],life:[60,120]}
};
// Mevsim: güneşin eğimi (derece). Kışın kuzey yarımkürede alçak basınç kuşağı güneye iner (Akdeniz'e yağmur getirir),
// yazın kuzeye çekilir; sıcak hava kütleleri yaz yaşanan yarımkürede doğar. Oyun her gün başında ayarlar.
let DECL=0,DOY=80;export const setSeason=(d,doy=DOY)=>{DECL=d;DOY=doy;};
// Türkiye ve Avrupa çevresinde (batısında) daha sık sistem doğsun ki oyunun odak bölgesinde hava hareketli olsun
function spawn(wx,type){
  const k=KINDS[type],focus=rand(wx)<(type==="low"?0.22:type==="storm"?0.2:0.35);
  let lat,lon;
  if(type==="low"){const nh=focus||rand(wx)<0.7,d=nh?DECL:-DECL;lat=(nh?1:-1)*between(wx,34+0.45*d,61+0.25*d);lon=focus?between(wx,-25,35):between(wx,-180,180);}
  else if(type==="high"){lat=(rand(wx)<0.6?1:-1)*between(wx,20,42);lon=focus?between(wx,-30,40):between(wx,-180,180);if(focus)lat=Math.abs(lat);}
  else if(type==="storm"){const trop=rand(wx)<0.5;lat=(rand(wx)<0.65?1:-1)*(trop?between(wx,8,22):between(wx,34,48));lon=focus&&!trop?between(wx,15,45):between(wx,-180,180);if(focus&&!trop)lat=Math.abs(lat);}
  else{const nh=DECL>-6||(focus&&DECL>-12);lat=(nh?1:-1)*between(wx,28,42);lon=focus&&nh?between(wx,20,50):between(wx,-120,120);}
  const mid=Math.abs(lat)>=28,dir=Math.sign(lat)||1;
  // hareket (derece/saat): orta enlemlerde batılı rüzgârlar, tropiklerde doğulu rüzgârlar
  let vx=mid?between(wx,0.3,0.6):-between(wx,0.15,0.3),vy=between(wx,-0.04,0.04)+(type==="storm"&&!mid?0.06*dir:0);
  if(type==="high"||type==="heat"){vx*=0.4;vy*=0.5;}
  // ilk dolumda sistemler farklı yaşlarda başlar
  const life=between(wx,...k.life);
  return {type,lat,lon,r:between(wx,...k.r),vx,vy,age:wx.init?between(wx,0,life*0.8):0,life};
}
export function initWx(seed=(Math.random()*2**31)|0){
  const wx={seed,t:0,sys:[],init:true};
  for(const type in KINDS)for(let i=0;i<KINDS[type].n;i++)wx.sys.push(spawn(wx,type));
  wx.init=false;return wx;
}
const strength=s=>Math.sin(Math.PI*clamp(s.age/s.life,0,1))**0.7;

// Sistemleri dh saat ilerlet; ömrü biten yerine aynı türden yenisi doğar
export function stepWx(wx,dh=1){
  wx.t+=dh;
  wx.sys.forEach((s,i)=>{s.age+=dh;s.lon+=s.vx*dh;s.lat+=s.vy*dh;
    if(s.lon>180)s.lon-=360;if(s.lon<-180)s.lon+=360;
    if(s.age>=s.life||Math.abs(s.lat)>72)wx.sys[i]=spawn(wx,s.type);});
}
export const cloneWx=wx=>({seed:wx.seed,t:wx.t,sys:wx.sys.map(s=>({...s}))});
// 0..n saat sonrasının anlık görüntüleri (gün başı tahmini için); [0] şimdiki durum
export function forecast(wx,n=24){const w=cloneWx(wx),out=[cloneWx(w)];for(let i=0;i<n;i++){stepWx(w,1);out.push(cloneWx(w));}return out;}
// iki anlık görüntü arasında konum ara değeri (haritada akıcı hareket için)
export function lerpWx(a,b,f){return {t:a.t+(b.t-a.t)*f,sys:a.sys.map((s,i)=>{const o=b.sys[i];if(!o||o.type!==s.type||Math.abs(o.lon-s.lon)>20)return s;
  return {...s,lat:s.lat+(o.lat-s.lat)*f,lon:s.lon+(o.lon-s.lon)*f,age:s.age+(o.age-s.age)*f};})};}

// İklim: enleme göre ortalama bulutluluk (ekvator kuşağı bulutlu, 20-30° çöl kuşağı açık, yüksek enlemler bulutlu)
export const climoCloud=lat=>{const a=Math.abs(lat);return clamp(0.3+0.3*Math.exp(-(((lat-5)/9)**2))-0.22*Math.exp(-(((a-25)/8)**2))+0.25*smooth(38,62,a),0.05,0.85);};
// Arka plan rüzgârı (m/s, esmeye doğru yön vektörü: u doğuya, v kuzeye): orta enlemlerde batılı, tropiklerde doğulu
function bgWind(lat){const a=Math.abs(lat),sg=Math.sign(lat)||1;
  if(a<28){const k=smooth(28,20,a);return [-4.5*k,-2.5*k*sg];} // alize: KD/GD'dan
  if(a<65){const k=smooth(28,38,a)*smooth(65,55,a);return [6.5*k,0];}
  return [-3,0];}

// Bir noktada hava: c bulut 0-1, rain yağış 0-1, v rüzgâr m/s, dir rüzgârın estiği yön (derece, kuzeyden saat yönünde),
// storm fırtına şiddeti 0-1, heat sıcak hava 0-1. base: sahanın iklim bulutluluğu ve rüzgâr potansiyeli (isteğe bağlı)
export function sampleWx(wx,lat,lon,base){
  let c=base&&base.cloud!=null?base.cloud:climoCloud(lat),rain=0,storm=0,heat=0,calm=1;
  const bg=bgWind(lat),bs=base&&base.speed!=null?base.speed:5.5,bm=Math.hypot(bg[0],bg[1])||1;
  let u=bg[0]/bm*bs,v=bg[1]/bm*bs;const sg=Math.sign(lat)||1,cl=Math.cos(lat*RAD);
  // geçen sistemlerin rüzgârı sahanın ortalama hızıyla ölçeklenir: açık kıyı ve boğazlarda fırtına sert, korunaklı ovada
  // zayıf eser (rüzgâr dağılımı ortalamayla birlikte büyür). Sahasız örneklemede (harita) ölçek 1.
  const ks=base&&base.speed!=null?clamp(bs/7.5,0.45,1.5):1;
  for(const s of wx.sys){
    let dlon=lon-s.lon;if(dlon>180)dlon-=360;if(dlon<-180)dlon+=360;
    const dx=dlon*KM*Math.cos((lat+s.lat)/2*RAD),dy=(lat-s.lat)*KM,d=Math.hypot(dx,dy),q=d/s.r;
    if(q>2.6)continue;
    const st=strength(s),g=Math.exp(-q*q),ring=q*Math.exp(0.5-q*q)*1.17; // ring: merkezin 0,7 yarıçap dışında en kuvvetli
    // dönüş yönü: alçak basınç kuzey yarımkürede saat yönünün tersine, yüksek basınç saat yönünde
    const tx=d>1?-dy/d:0,ty=d>1?dx/d:0,rot=(s.type==="high"?-1:1)*sg;
    if(s.type==="low"){c+=0.62*st*g;rain+=st*Math.max(0,g-0.55)*2.4;const w=11*ks*st*ring;u+=rot*tx*w;v+=rot*ty*w;}
    else if(s.type==="storm"){c+=0.95*st*g;rain+=st*Math.max(0,g-0.35)*2.4;storm=Math.max(storm,st*g);const w=24*ks*st*ring;u+=rot*tx*w;v+=rot*ty*w;}
    else if(s.type==="high"){c-=0.55*st*g;calm*=1-0.55*st*g;const w=2.5*ks*st*ring;u+=rot*tx*w;v+=rot*ty*w;}
    else{c-=0.4*st*g;heat=Math.max(heat,st*g);calm*=1-0.3*st*g;}
  }
  u*=calm;v*=calm;
  const sp=Math.hypot(u,v),dir=(Math.atan2(-u,-v)/RAD+360)%360;
  return {c:clamp(c,0,1),rain:clamp(rain,0,1),v:sp,dir,storm:clamp(storm,0,1),heat:clamp(heat,0,1),u,vv:v,cl};
}

// Sahanın iklim tabanı: bulutluluk enleme ve güneş potansiyeline, ortalama rüzgâr hızı rüzgâr potansiyeline bağlı
export const siteBase=t=>({cloud:clamp(0.5*climoCloud(t.lat)+0.5*(0.88-0.8*(t.solar||0.5)),0.04,0.85),speed:(4+8.5*(t.wind||0.4))*windSeason(t.lat,t.lon,t.mreg,t.a3)}); // ortalama rüzgâr hızı 4-12 m/s
// Mevsimsel rüzgâr: orta enlemlerde kış rüzgârlı, yaz sakin; Ege'de yaz poyrazı (meltem/etezyen) tersine yazın güçlenir
// Aylık rüzgâr hızı çarpanı (Ocak…Aralık, ay ortası; arada doğrusal; yıllık ortalama 1). Her ülkenin 2025 aylık rüzgâr
// üretimi ve kurulu gücünden hesaplanan aylık kapasite faktörüne göre ayarlandı (docs/kalibrasyon.md):
//  TUR: TEİAŞ (yaz poyrazıyla Ağustos en rüzgârlı, Ekim en sakin), DEU: ENTSO-E (Kasım tahmini, Aralık 2024; kış rüzgârlı,
//  ilkbahar ve yaz sakin), ESP: ENTSO-E (kış rüzgârlı, Ağustos–Eylül sakin). Avrupa'nın diğer ülkeleri DEU ve ESP ortalaması.
export const WIND_MONTH={TUR:[1.044,1.052,0.984,0.913,0.97,1.052,1.029,1.021,1.002,0.963,0.97,1],DEU:[1.386,1.137,0.861,0.733,0.712,0.719,0.704,0.745,0.936,1.2,1.408,1.459],ESP:[1.177,1.105,1.043,0.955,0.868,0.927,0.925,0.817,0.814,0.983,1.179,1.208]};
const E_MONTH=WIND_MONTH.DEU.map((v,i)=>(v+WIND_MONTH.ESP[i])/2);
const inTR=(lat,lon)=>lat>35.5&&lat<42.5&&lon>25.5&&lon<45;
function monthly(tab){const x=(DOY-15.5)/30.44,i=Math.floor(x),f=x-i,a=tab[(i%12+12)%12],b=tab[((i+1)%12+12)%12];return a+(b-a)*f;}
export function windSeason(lat,lon,m,a3){
  if(inTR(lat,lon))return monthly(WIND_MONTH.TUR);
  if(WIND_MONTH[a3])return monthly(WIND_MONTH[a3]);
  const w=(Math.sign(lat)||1)*DECL/23.44; // +1 yaz ortası, −1 kış ortası (o yarımküre için)
  if(lat>34&&lat<41.5&&lon>22&&lon<30.5)return 1+0.22*Math.max(0,w)-0.04*Math.max(0,-w);
  if(m==="E")return monthly(E_MONTH);
  return Math.abs(lat)>30?1-0.12*w:1;
}
// Soğuk mu (yağış kar olarak düşer): kış yaşanan yarımkürede yüksek enlem ya da dağ
export const isCold=(lat,mountain)=>{const w=(Math.sign(lat)||1)*DECL/23.44,a=Math.abs(lat);return w<-0.35&&(a>39.5||(mountain&&a>33))||(mountain&&w<0.1&&a>38);};
// Güneş: sahanın güneş potansiyeli zaten iklimi içerir; hava bu ortalamanın etrafında dalgalanma yaratır.
// Göreli açıklık = o anki açık gökyüzü oranı / sahanın ortalama açıklığı (en fazla %25 üstü)
export const sunRel=(w,b)=>Math.min(1.25,clearFactor(w.c)/clearFactor(b.cloud));
// Açık gökyüzü oranı: tam kapalı havada panel üretimi ~%20'ye iner
export const clearFactor=c=>1-0.8*c;
// Türbin güç eğrisi: 3 m/s'de başlar, 12 m/s'de tam güç, 25 m/s üstünde güvenlik için durur (kesme hızı)
// Türbin güç eğrisi (kurulu güce oran): 3 m/s'de devreye girer, 11 m/s'de tam güce ulaşır, 25 m/s'de durur. Oyundaki
// standart türbin gibi büyük rotorlu (düşük özgül güçlü) modern bir türbinin yaklaşık eğrisidir; arası küp yasasıyla.
export const powerCurve=v=>v<3?0:v<11?(v**3-27)/(1331-27):v<=25?1:0;
// Sahanın yıllık ortalama göbek hızından (m/s) beklenen net kapasite faktörü: oyunun saatlik rüzgâr dağılımına uyan
// Weibull (k=2,2, ortalama taban hızın 1,03 katı) ve yukarıdaki güç eğrisi, ~%3,5 arıza payı düşülerek. 365 günlük
// simülasyonlarla doğrulandı (docs/kalibrasyon.md); tek bir yılda hava nedeniyle ±%10 sapabilir.
const CF_TAB=(()=>{const k=2.2,g=1.03/0.8856,out=[];for(let i=0;i<=150;i++){const S=i/10,c=S*g;let e=0;
  if(c>0)for(let v=0.05;v<30;v+=0.1)e+=powerCurve(v)*(k/c)*(v/c)**(k-1)*Math.exp(-((v/c)**k))*0.1;out.push(e*0.965);}return out;})();
export function expectedCF(S){const x=clamp(S*10,0,149.999),i=Math.floor(x);return CF_TAB[i]+(CF_TAB[i+1]-CF_TAB[i])*(x-i);}
// sahanın rüzgâr puanından yıllık ortalama göbek hızı (siteBase ile aynı; mevsim çarpanlarının yıllık ortalaması 1)
export const windSpeedOf=t=>4+8.5*(t.wind||0);
// rüzgâr sınıfı (paneldeki nokta sayısı, potansiyel haritasının kademesi) beklenen kapasite faktörüne göre:
// 0 <%12, 1 %12–20, 2 %20–27, 3 %27–34 (Türkiye filo ortalaması ~%33), 4 %34–41, 5 ≥%41
export const windClass=cf=>cf<0.12?0:cf<0.2?1:cf<0.27?2:cf<0.34?3:cf<0.41?4:5;

const DIRS=["K","KD","D","GD","G","GB","B","KB"];
export const dirName=d=>DIRS[Math.round(d/45)%8];
// Kısa hava özeti: simge ve metin
export function wxLabel(w,night){
  if(w.storm>0.35)return {i:"⛈️",t:"Fırtına"};
  if(w.snow)return {i:"🌨️",t:"Karlı"};
  if(w.rain>0.25)return {i:"🌧️",t:"Yağmurlu"};
  if(w.c>0.7)return {i:"☁️",t:"Kapalı"};
  if(w.c>0.4)return {i:night?"☁️":"⛅",t:"Parçalı bulutlu"};
  if(w.heat>0.4)return {i:night?"🌙":"🌡️",t:"Sıcak ve açık"};
  return {i:night?"🌙":"☀️",t:"Açık"};
}
