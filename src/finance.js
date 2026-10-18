// --- Proje ekonomisi: gerçek dünya karşılığı ---
// Oyunun parası sıkıştırılmıştır (yatırımlar gerçeğin ~1/60'ı, günler hızlı geçer); finansal göstergeler bu yüzden oyun
// parasıyla değil, gerçek dünya ölçeğinde hesaplanır. Üretim ve satış fiyatı oyunun simülasyonundan gelir (santralin
// oyunda gerçekleşen kapasite faktörü ve kazandığı ortalama fiyat); yatırım, işletme gideri, ömür ve iskonto oranı
// aşağıdaki gerçek dünya varsayımlarıdır. Proje göstergeleri (plantFinance) vergi ve finansman öncesidir; proje
// finansmanı (projectFinance) borç, vergi ve satış sözleşmesini (PPA) ekler. Enflasyon, arazi, şebeke bağlantısı ve hurda
// değeri hariçtir.
import { TECH } from "./config.js";
import { EQUIP, tierOf } from "./equipment.js";

// Yatırım maliyeti (USD/kW): IRENA, Renewable Power Generation Costs in 2024 (Temmuz 2025), küresel ağırlıklı ortalama
// kurulu maliyet. Birincil rapora erişilemedi; değerler raporu aktaran haberlerden alındı (GES, RES, offshore ve batarya
// birden fazla kaynakta aynı; HES, JES ve biyokütle tek kaynakta). Batarya 192 USD/kWh × 2 saat (oyunda 5 MW / 10 MWh).
// Deniz enerjisi için IRENA değeri yok: oyun varsayımı.
// İşletme gideri (USD/kW-yıl), ömür (yıl) ve GES verim kaybı: kaynakla doğrulanmamış yaklaşık değerler (varsayım).
export const FIN={
  ges:{capex:691,opex:12,life:25,src:"IRENA 2024"},
  res:{capex:1041,opex:40,life:25,src:"IRENA 2024"},
  off:{capex:2852,opex:80,life:25,src:"IRENA 2024"},
  hes:{capex:2267,opex:45,life:40,src:"IRENA 2024"},
  jes:{capex:4015,opex:110,life:30,src:"IRENA 2024"},
  bes:{capex:3242,opex:120,life:25,src:"IRENA 2024"},
  batt:{capex:384,opex:8,life:15,src:"IRENA 2024 (192 $/kWh × 2 saat)"},
  mar:{capex:6000,opex:200,life:20,src:"oyun varsayımı (kaynak yok)"}
};
export const DEGR=0.005;            // GES yıllık üretim kaybı (varsayım)
export const MIN_H=72;              // gösterge için en az 72 saatlik (3 oyun günü) işletme verisi
const KEY="sebeke-wacc";
// İskonto oranı (WACC, nominal USD): Türkiye ülke riskini yansıtan varsayım; panelden değiştirilebilir
export let wacc=(()=>{try{const v=+localStorage.getItem(KEY);return v>=0.02&&v<=0.25?v:0.10;}catch(e){return 0.10;}})();
export function setWacc(v){wacc=v;try{localStorage.setItem(KEY,String(v));}catch(e){}}

// Santralin saatlik kaydı (sim.js): kurulu güç × saat, üretim (MWh), piyasa değeri ($), yakıt ($)
export function acc(p){return p.ac||(p.ac={cap:0,h:0,e:0,r:0,f:0});}

const npvAt=(r,c0,flows)=>flows.reduce((a,c,t)=>a+c/(1+r)**(t+1),-c0);
function irrOf(c0,flows){
  if(c0<=0||npvAt(0,c0,flows)<=0)return null; // toplam nakit girişi yatırımı karşılamıyor
  let lo=0,hi=1;while(npvAt(hi,c0,flows)>0&&hi<10)hi*=2;
  for(let i=0;i<80;i++){const m=(lo+hi)/2;if(npvAt(m,c0,flows)>0)lo=m;else hi=m;}
  return (lo+hi)/2;
}
// birikimli (iskontosuz) nakit akışının ilk yatırımı karşıladığı yıl (kesirli)
function paybackOf(c0,flows){let cum=-c0;for(let t=0;t<flows.length;t++){const prev=cum;cum+=flows[t];if(cum>=0)return t+(-prev)/flows[t];}return null;}

// Santralin yıllık temel verisi: yatırım, gider, yıllık üretim profili ve oyunda gerçekleşen ortalama satış fiyatı
function base(p){
  const a=p.ac,f=FIN[p.k];if(!a||a.h<MIN_H||!f)return null;
  const q=EQUIP[p.k][tierOf(p)],kw=p.mw*1000,batt=p.k==="batt";
  const cf=a.cap>0?a.e/a.cap:0; // kapasite faktörü: üretim / (kurulu güç × saat); güç sonradan arttıysa da doğru kalır
  const e1=batt?0:cf*p.mw*8760,price=a.e>0?a.r/a.e:0,fuelPerMWh=a.e>0?a.f/a.e:0;
  const net1=batt&&a.cap>0?a.r/a.cap*p.mw*8760:0; // batarya: MW başına net arbitraj gelirinin yıllığa çevrilmesi
  const E=Array.from({length:f.life},(_,t)=>p.k==="ges"?e1*(1-DEGR)**t:e1);
  return {f,batt,capex:f.capex*q.capex*kw,opex:f.opex*q.opex*kw,cf,e1,price,fuelPerMWh,net1,E,life:f.life,days:a.h/24};
}

// Bir santral kaydının gerçek dünya göstergeleri (vergi ve finansman öncesi); yeterli veri yoksa {wait:true}
export function plantFinance(p){
  const b=base(p);if(!b)return {wait:true,h:p.ac?p.ac.h:0};
  const {capex,opex,cf,e1,net1,price,fuelPerMWh,E,batt,life,days,f}=b,flows=[];let disc=0,discE=0;
  E.forEach((e,i)=>{const t=i+1,cost=opex+e*fuelPerMWh;flows.push(batt?net1-opex:e*price-cost);disc+=cost/(1+wacc)**t;discE+=e/(1+wacc)**t;});
  const lcoe=batt||discE<=0?null:(capex+disc)/discE;
  return {capex,opex,cf,e1,net1,price,lcoe,npv:npvAt(wacc,capex,flows),irr:irrOf(capex,flows),pb:paybackOf(capex,flows),life,days,src:f.src};
}

export const SHORT_DAYS=30; // daha kısa veride mevsimsellik yıllık değeri saptırabilir
export const techName=k=>TECH[k].n;

// --- Proje finansmanı: borç, vergi ve satış sözleşmesi (PPA) ---
// Varsayımlar (panelden değiştirilebilir, tarayıcıda saklanır). Kaynaklı olanlar:
//  faiz tabanı: ABD 10 yıllık hazine faizi %5,10 (FRED DGS10, 15.10.2026); üstüne piyasa riskine göre kredi marjı (varsayım)
//  kurumlar vergisi: Türkiye %25 (ikincil kaynaklar; KVK md. 32); Avrupa %27,5 = Almanya %29,9 ile İspanya %25 ortalaması
//  (Tax Foundation, OECD verisi, 2025)
// Kaynaksız varsayımlar: kredi marjı, borç oranı üst sınırı, vade, hedef DSCR'lar, vergi amortisman süresi, PPA süresi ve
// indirimi. Hedef DSCR spot satışta yüksek, PPA'da düşüktür: fiyatı sabitlenmiş gelir bankaya daha az risk taşır, bu yüzden
// aynı nakit akışına daha çok borç verilir.
export const PF_DEFAULT={rateT:8.6,rateE:6.9,tenor:12,gear:75,dscrM:1.40,dscrP:1.20,taxT:25,taxE:27.5,dep:10,ppaYears:10,ppaDisc:10};
export const PF_SRC={rateT:"ABD 10 yıllık %5,10 (FRED) + %3,5 marj (varsayım)",rateE:"ABD 10 yıllık %5,10 (FRED) + %1,8 marj (varsayım)",
  taxT:"Türkiye kurumlar vergisi (ikincil kaynak)",taxE:"Almanya %29,9 ve İspanya %25 ortalaması (Tax Foundation / OECD 2025)"};
const PF_KEY="sebeke-pf";
export let pf=(()=>{try{const o=JSON.parse(localStorage.getItem(PF_KEY)||"null");return o?{...PF_DEFAULT,...o}:{...PF_DEFAULT};}catch(e){return {...PF_DEFAULT};}})();
export function setPf(k,v){pf={...pf,[k]:v};try{localStorage.setItem(PF_KEY,JSON.stringify(pf));}catch(e){}}
export function resetPf(){pf={...PF_DEFAULT};try{localStorage.removeItem(PF_KEY);}catch(e){}}

// Santralin finansman sonrası göstergeleri (market: sahanın piyasası; Avrupa dışı piyasalar Türkiye varsayımlarını kullanır).
// mode: "spot" (tüm üretim piyasaya) ya da "ppa" (ilk ppaYears yıl, piyasada beklenen satış fiyatının ppaDisc kadar altında
// sabit fiyat; sonra piyasa). stress: piyasa fiyatı düşüşü (0,2 = %20); borç baz senaryoyla boyutlandırılır, stres yalnızca
// gerçekleşen nakit akışına uygulanır (bankanın kötü senaryo testi). Yıllık model:
//  FAVÖK = gelir − işletme − yakıt; vergi = max(0, FAVÖK − amortisman − faiz − devreden zarar) × oran
//  CFADS (borç servisine hazır nakit) = FAVÖK − vergi; DSCR = CFADS ÷ borç servisi
//  Borç: eşit taksitli (anüite), vade boyunca; tutarı iki sınırdan küçüğü: borç oranı üst sınırı × yatırım ve
//  vade boyunca en düşük CFADS ÷ hedef DSCR'ı sağlayan borç (faizin vergi kalkanıyla birlikte, yinelemeli)
export function projectFinance(p,mode="spot",market="T",stress=0){
  const b=base(p);if(!b)return {wait:true};
  const mk=market==="E"?"E":"T",r=(mk==="E"?pf.rateE:pf.rateT)/100,tax=(mk==="E"?pf.taxE:pf.taxT)/100;
  const {capex,opex,E,price,fuelPerMWh,net1,batt,life}=b,ppa=mode==="ppa"&&!batt;
  const N=Math.max(1,Math.min(pf.tenor,life-2)),dep=Math.min(pf.dep,life),depY=capex/dep,ppaP=price*(1-pf.ppaDisc/100);
  const ebitdaAt=sx=>E.map((e,t)=>batt?net1*(1-sx)-opex:e*(ppa&&t<pf.ppaYears?ppaP:price*(1-sx))-opex-e*fuelPerMWh);
  // vergi; geçmiş yıl zararı önce en eskisinden mahsup edilir. Türkiye'de en çok 5 yıl devreder (KVK md. 9); Avrupa'da süre
  // sınırı yok (basitleştirme: Almanya ve İspanya'daki yıllık mahsup üst sınırları uygulanmadı)
  const life5=mk==="T"?5:Infinity;
  const taxes=(eb,interest)=>{const L=[];return eb.map((x,t)=>{
    for(let i=L.length-1;i>=0;i--)if(t-L[i].y>life5)L.splice(i,1); // süresi dolan zararlar
    let tb=x-(t<dep?depY:0)-interest[t];
    if(tb<0){L.push({y:t,a:-tb});return 0;}
    while(tb>0&&L.length){const u=Math.min(tb,L[0].a);tb-=u;L[0].a-=u;if(L[0].a<=0)L.shift();}
    return tb*tax;});};
  const ann=r>0?(1-(1+r)**-N)/r:N,cap=pf.gear/100*capex,target=ppa?pf.dscrP:pf.dscrM;
  const schedule=debt=>{const ds=debt>0?debt/ann:0,it=[];let bal=debt;for(let t=0;t<life;t++){if(t<N){const i=bal*r;it.push(i);bal-=ds-i;}else it.push(0);}return {ds,it};};
  const run=(debt,eb)=>{const {ds,it}=schedule(debt),tx=taxes(eb,it);return {ds,tx,cfads:eb.map((x,t)=>x-tx[t])};};
  const eb0=ebitdaAt(0),zero=E.map(()=>0),txU=taxes(eb0,zero),cfadsU=eb0.map((x,t)=>x-txU[t]);
  // borç boyutlandırma: önce vergi kalkanı olmadan, sonra gerçekleşen CFADS ile yeniden (birkaç adımda yakınsar)
  let debt=Math.max(0,Math.min(cap,Math.min(...cfadsU.slice(0,N))/target*ann));
  for(let i=0;i<6;i++){const c=run(debt,eb0).cfads;debt=Math.max(0,Math.min(cap,Math.min(...c.slice(0,N))/target*ann));}
  const eb=stress?ebitdaAt(stress):eb0,{ds,tx,cfads}=run(debt,eb);
  const dscr=ds>0?cfads.slice(0,N).map(c=>c/ds):[];
  const eqFlows=cfads.map((c,t)=>c-(t<N?ds:0)),equity=capex-debt;
  const txS=stress?taxes(eb,zero):txU,cfU=eb.map((x,t)=>x-txS[t]); // vergi sonrası, borçsuz
  return {mode:ppa?"ppa":"spot",mk,stress,capex,debt,equity,gear:debt/capex,ds,tenor:N,rate:r,tax,ppaPrice:ppa?ppaP:null,price,
    minDscr:dscr.length?Math.min(...dscr):null,avgDscr:dscr.length?dscr.reduce((a,v)=>a+v,0)/dscr.length:null,
    projIrr:irrOf(capex,cfU),eqIrr:irrOf(equity,eqFlows),eqPb:paybackOf(equity,eqFlows),
    taxSum:tx.reduce((a,v)=>a+v,0),ebitda1:eb[0],cfads1:cfads[0]};
}
