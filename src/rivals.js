// --- Rakip şirketler ---
// Üç kurgusal şirket dünyanın verimli bölgelerinde (yaklaşık %60'ı Türkiye'de) saha açıp santral kurar. Her şirketin
// günlük yatırım bütçesi birikir; yeterince biriktiğinde yeni saha açar ya da mevcut sahasını büyütür. Yeni saha 3 gün
// inşaatta kalır, sonra piyasaya girer: rakip güneşi öğle fiyatlarını, rakip rüzgârı rüzgârlı saatlerin fiyatını düşürür.
// Rakip sahalarının 20 km yakınında oyuncu saha açamaz. DOM'a bağımlı değildir.
import { BLOCK, SITE_LIMIT, SITE_MIN_KM, REG, TECH } from "./config.js";
import { describe, km } from "./world.js";
import { allowed } from "./rules.js";
import { S } from "./state.js";
import { rnd } from "./utils.js";
import { news } from "./news.js";

// isimler kurgusaldır; gerçek bir şirketi temsil etmez
export const RIVALS=[
  {id:"r1",n:"Kuzgun Enerji",sh:"KZG",c:"#FF7A45",mix:{ges:0.65,res:0.35},tr:0.7,rate:21000},
  {id:"r2",n:"Mavi Ufuk Güç",sh:"MUG",c:"#E8559B",mix:{ges:0.25,res:0.75},tr:0.6,rate:26000},
  {id:"r3",n:"Tundra Renewables",sh:"TND",c:"#19C3D6",mix:{ges:0.5,res:0.5},tr:0.45,rate:23000}
];
const BUILD_DAYS=3;
// Aday bölgeler: [enlem, boylam, teknoloji]; seçilen noktanın çevresinde ±0,25° oynatılır
const TR=[[37.85,32.6,"ges"],[37.25,33.3,"ges"],[37.6,30.3,"ges"],[37.25,39.6,"ges"],[38.6,43.2,"ges"],[37.9,34.6,"ges"],[38.6,39.2,"ges"],
  [38.6,35.6,"ges"],[37.3,40.7,"ges"],[38.4,34.0,"ges"],[37.1,30.2,"ges"],
  [38.85,26.95,"res"],[39.55,27.8,"res"],[39.75,26.3,"res"],[40.3,27.9,"res"],[41.6,27.6,"res"],[36.25,36.1,"res"],[38.9,27.7,"res"],
  [37.1,36.4,"res"],[39.5,37.4,"res"],[40.2,36.3,"res"],[38.3,26.4,"res"]];
const WORLD=[[37.6,-4.4,"ges"],[38.0,-7.9,"ges"],[30.9,-6.9,"ges"],[24.5,32.8,"ges"],[24.0,45.5,"ges"],[27.3,71.5,"ges"],[-23.5,-69.3,"ges"],
  [33.5,-112.5,"ges"],[-31.0,138.0,"ges"],[53.8,8.9,"res"],[38.3,22.4,"res"],[32.0,-101.5,"res"],[42.5,-2.0,"res"],[55.5,9.0,"res"],
  [-38.5,-63.0,"res"],[-33.5,24.5,"res"]];

export const rivalOf=id=>RIVALS.find(r=>r.id===id);
// Tüm rakip sahaları: [{r, i, s}]
export function rivalSites(){const out=[];if(!S.rivals)return out;for(const r of RIVALS)(S.rivals[r.id]?.sites||[]).forEach((s,i)=>out.push({r,i,s}));return out;}
// Bir noktanın SITE_MIN_KM yakınındaki en yakın rakip sahası
export function rivalNear(lat,lon){let best=null,bd=SITE_MIN_KM;for(const x of rivalSites()){const d=km(lat,lon,x.s.lat,x.s.lon);if(d<bd){bd=d;best=x;}}return best;}
// Rakip şirketin portföy değeri: nakit (birikmiş bütçe) + yatırım tutarı
export const rivalValue=id=>{const o=S.rivals[id];return o.cash+o.sites.reduce((a,s)=>a+TECH[s.k].capex*s.mw/BLOCK+(REG[s.mreg]?.land||20000),0);};
export const rivalMW=id=>S.rivals[id].sites.reduce((a,s)=>a+s.mw,0);
// Piyasaya giren (inşaatı biten) rakip kapasitesi: {ges, res} MW
export function rivalCap(m){const c={ges:0,res:0};rivalSites().forEach(({s})=>{if(s.mreg===m&&!(s.build>0))c[s.k]+=s.mw;});return c;}

function clearOf(lat,lon){
  for(const o of Object.values(S.sites))if(km(lat,lon,o.lat,o.lon)<SITE_MIN_KM*1.5)return false;
  for(const {s} of rivalSites())if(km(lat,lon,s.lat,s.lon)<SITE_MIN_KM*1.5)return false;
  return true;
}
// Yeni saha için uygun nokta bul: kara, korunan alan veya orman değil, teknolojiye izin var, başka sahalardan uzak
function findSpot(r,k){
  const tr=rnd()<r.tr,pool=(tr?TR:WORLD).filter(x=>x[2]===k);if(!pool.length)return null;
  for(let n=0;n<20;n++){
    const [la,lo]=pool[Math.floor(rnd()*pool.length)],lat=la+(rnd()-0.5)*0.5,lon=lo+(rnd()-0.5)*0.5,t=describe(lat,lon);
    if(t.sea||!t.mreg||(tr&&t.a3!=="TUR")||t.ter==="p"||t.ter==="f"||!allowed(t).includes(k))continue;
    if((k==="ges"&&t.solar<0.5)||(k==="res"&&t.wind<0.42))continue;
    if(!clearOf(t.lat,t.lon))continue;
    return t;
  }
  return null;
}
const pickK=r=>rnd()<r.mix.ges?"ges":"res";
function newSite(r,o,k,mw,quiet){
  const t=findSpot(r,k);if(!t)return false;
  const cost=TECH[k].capex*mw/BLOCK+(REG[t.mreg].land||20000);if(!quiet&&o.cash<cost)return false;
  if(!quiet)o.cash-=cost;
  o.sites.push({lat:t.lat,lon:t.lon,k,mw,mreg:t.mreg,city:t.city,country:t.country,day:S.dayNo,build:quiet?0:BUILD_DAYS});
  if(!quiet)news("🏗️",`${r.n}, ${t.city} yakınında (${t.country}) ${mw} MW ${TECH[k].n} inşaatına başladı.`,"rival");
  return true;
}

export function initRivals(){
  if(S.rivals)return;
  S.rivals={};
  RIVALS.forEach(r=>{const o=S.rivals[r.id]={cash:0,sites:[]};
    // başlangıç portföyü: bir-iki işletmedeki saha
    newSite(r,o,pickK(r),30,true);if(rnd()<0.6)newSite(r,o,pickK(r),20,true);});
}

// Gün başı: inşaatlar ilerler, bütçe birikir, uygun olduğunda yeni yatırım yapılır
export function rivalsDay(){
  initRivals();
  RIVALS.forEach(r=>{const o=S.rivals[r.id];
    o.sites.forEach(s=>{if(s.build>0&&--s.build===0)news("⚡",`${r.n}: ${s.city} yakınındaki ${s.mw} MW ${TECH[s.k].n} devreye girdi.`,"rival");});
    o.cash+=r.rate*(0.6+0.8*rnd())*(1+S.dayNo/150); // şirket büyüdükçe yatırım hızı artar
    if(rnd()>0.35)return; // her gün yatırım yapmaz
    const k=pickK(r),grow=o.sites.filter(s=>s.k===k&&!(s.build>0)&&s.mw+10<=SITE_LIMIT);
    if(grow.length&&rnd()<0.4){const s=grow[Math.floor(rnd()*grow.length)],c=TECH[k].capex*10/BLOCK;
      if(o.cash>=c){o.cash-=c;s.mw+=10;news("📈",`${r.n}, ${s.city} sahasını ${s.mw} MW'a büyüttü.`,"rival");}return;}
    newSite(r,o,k,[20,30,40][Math.floor(rnd()*3)],false);
  });
}
