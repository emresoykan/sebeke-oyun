// --- Durum ---
// S: kalıcı oyun durumu (localStorage), D: günlük simülasyon verisi (kaydedilmez).
// ES modül bağlamaları dışarıdan yeniden atanamadığı için atamalar setS/setD ile yapılır.
// S.sites: satın alınan sahalar (id -> konum, arazi bilgisi, izin durumu); S.sel: seçili nokta {id, lat, lon}.
import { SAVE_KEY, REG, MARKETS, START_MONEY, START_TOPUP } from "./config.js";
import { describe, placeName } from "./world.js";
import { landTR, coastKmTR, nearestValid, SHORE_KM } from "./coasttr.js";
import { renderLog } from "./ui/hud.js";
import { freshStats } from "./profile.js";

export let S, D={};
export function setS(v){S=v;}
export function setD(v){D=v;}

export function fresh(){const m={};MARKETS.forEach(k=>m[k]=REG[k].s0);return{money:START_MONEY,topup1:1,dayNo:1,hour:0,sites:{},nextId:1,plants:[],mSolar:m,hist:[],last:null,log:[],won:false,sel:{id:null,lat:38.6,lon:33.3},stats:freshStats(),ach:[],mi:0,evDone:0,evCool:0,evHist:[],mods:[],debt:0,tut:3,resV:3,coastV:1,loans:[],mv:3,ob:{}};}
export function load(){try{const r=localStorage.getItem(SAVE_KEY);if(r){const o=JSON.parse(r);if(o&&o.plants&&o.sites)return migrate(o);}}catch(e){}return fresh();}
// Ekipman ve profil öncesi kayıtlar: santraller standart kademe sayılır, istatistikler sıfırdan başlar
// (görev numarası boş bırakılır; main.js tamamlanmış görevleri ödülsüz geçer)
// Başlangıç nakdi artırılmadan önceki kayıtlara fark bir kez eklenir
function migrate(o){o.plants.forEach(p=>{if(!p.q)p.q="std";});if(!o.topup1){o.money+=START_TOPUP;o.topup1=1;}if(!o.stats)o.stats=freshStats();if(!o.ach)o.ach=[];if(!o.mods)o.mods=[];if(o.debt==null)o.debt=0;if(!o.loans)o.loans=[];if(o.tut==null)o.tut=Object.keys(o.sites).length?3:0;
  // kaynak modeli v2 (NASA POWER verisi): eski kayıtlardaki sahaların güneş/rüzgâr puanları bir kez yeniden hesaplanır
  if((o.resV||1)<2){Object.values(o.sites).forEach(t=>{const d=describe(t.lat,t.lon);if(!t.sea)t.solar=d.solar;if(d.wind!=null)t.wind=d.wind;});
    if(Object.keys(o.sites).length)o.log=[`Gün ${o.dayNo}: Güneş ve rüzgâr kaynakları gerçek iklim verisine (NASA POWER) göre güncellendi; sahalarının puanları değişmiş olabilir.`,...(o.log||[])].slice(0,8);}
  // rüzgâr modeli v3 (güç eğrisi ve TEİAŞ / ENTSO-E 2025 kalibrasyonu): sahaların rüzgâr puanı bir kez yeniden hesaplanır
  if((o.resV||1)<3){const v2=(o.resV||1)===2;Object.values(o.sites).forEach(t=>{const d=describe(t.lat,t.lon);if(d.wind!=null)t.wind=d.wind;if(d.a3)t.a3=d.a3;});
    if(v2&&Object.keys(o.sites).length)o.log=[`Gün ${o.dayNo}: Rüzgâr üretimi gerçek filo verisine (TEİAŞ, ENTSO-E 2025) göre kalibre edildi; sahalarının rüzgâr değerleri değişmiş olabilir.`,...(o.log||[])].slice(0,8);}
  // görev zinciri v2 (tutorial.js): eğitim 8 göreve çıktı. Eski görev numarası yeni zincire çevrilir; tamamlanmış
  // eğitim adımları ödülsüz işaretlenir (ödül tekrar alınmaz)
  if((o.mv||1)<2){const m=o.mi;if(m!=null)o.mi=m<=0?0:m===1?2:m<=3?3:m+4;o.ob=o.ob||{};
    if(Object.keys(o.sites).length)Object.assign(o.ob,{pick:1,g:1});
    if(o.plants.length)Object.assign(o.ob,{tech:1,prod:1,sale:1,repReady:1,rep:1,card:1});o.mv=2;}
  // görev zinciri v3: eğitimden sonra "İlk kredili bloğunu kur" eklendi (9. sıra); alım garantisi yalnızca yeni projelere
  if(o.mv<3){if(o.mi!=null&&o.mi>=9)o.mi++;if(o.plants.length)o.fitDone=1;o.mv=3;}
  // kıyı v1 (coasttr.js): Türkiye çevresinde ayrıntılı kıyı. Kaba kıyı yüzünden yanlış tarafta (denizdeki saha karada,
  // karadaki saha denizde) ya da kıyı şeridinde kalan sahalar en yakın uygun noktaya bir kez taşınır; rakip sahaları da
  if((o.coastV||0)<1){const moved=[];
    Object.values(o.sites).forEach(t=>{const l=landTR(t.lon,t.lat);if(l===null)return;
      if(l===!t.sea&&coastKmTR(t.lon,t.lat,SHORE_KM+1)>=SHORE_KM)return;const n=nearestValid(t.lon,t.lat,!!t.sea);if(!n)return;
      t.lat=n.lat;t.lon=n.lon;delete t.slope;if(t.sea){const k=coastKmTR(n.lon,n.lat);if(k!=null&&k!==Infinity)t.coastKm=+k.toFixed(1);}
      moved.push(`${placeName(t)} ${n.km.toFixed(2).replace(".",",")} km`);});
    if(o.rivals)Object.values(o.rivals).forEach(r=>(r.sites||[]).forEach(s=>{const l=landTR(s.lon,s.lat);if(l===null)return;
      if(l&&coastKmTR(s.lon,s.lat,SHORE_KM+1)>=SHORE_KM)return;const n=nearestValid(s.lon,s.lat,false);if(n){s.lat=n.lat;s.lon=n.lon;}}));
    if(moved.length)o.log=[`Gün ${o.dayNo}: Türkiye kıyıları ayrıntılı kıyı verisine geçti; yanlış tarafta ya da kıyı şeridinde kalan sahaların taşındı: ${moved.join(", ")}.`,...(o.log||[])].slice(0,8);
    o.coastV=1;}
  o.resV=3;return o;}
let frozen=false;
// Kayıt dosyası yüklenirken sayfa yenilenene kadar mevcut durum kaydın üzerine yazılmaz
export function freezeSave(){frozen=true;}
export function save(){if(frozen)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(S));}catch(e){}}
export function addLog(msg){S.log.unshift("Gün "+S.dayNo+": "+msg);S.log=S.log.slice(0,8);renderLog();}

// Seçili noktanın bilgisi: satın alınmış sahaysa kayıtlı bilgi, değilse anlık hesap (önbellekli)
let cacheKey=null, cacheVal=null;
// yerleşim alanı verisi geç yüklenince seçili noktanın bilgisi yeniden hesaplanır
export function clearSelCache(){cacheKey=null;}
export function selSite(){
  const s=S.sel;if(s.id&&S.sites[s.id])return S.sites[s.id];
  const k=s.lat.toFixed(4)+","+s.lon.toFixed(4);if(k!==cacheKey){cacheKey=k;cacheVal=describe(s.lat,s.lon);}return cacheVal;
}
