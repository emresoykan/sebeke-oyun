// --- Proje ekonomisi: gerçek dünya karşılığı ---
// Oyunun parası sıkıştırılmıştır (yatırımlar gerçeğin ~1/60'ı, günler hızlı geçer); finansal göstergeler bu yüzden oyun
// parasıyla değil, gerçek dünya ölçeğinde hesaplanır. Üretim ve satış fiyatı oyunun simülasyonundan gelir (santralin
// oyunda gerçekleşen kapasite faktörü ve kazandığı ortalama fiyat); yatırım, işletme gideri, ömür ve iskonto oranı
// aşağıdaki gerçek dünya varsayımlarıdır. Vergi, enflasyon, finansman, arazi, şebeke bağlantısı ve hurda değeri hariçtir.
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
  if(npvAt(0,c0,flows)<=0)return null; // toplam nakit girişi yatırımı karşılamıyor
  let lo=0,hi=1;while(npvAt(hi,c0,flows)>0&&hi<10)hi*=2;
  for(let i=0;i<80;i++){const m=(lo+hi)/2;if(npvAt(m,c0,flows)>0)lo=m;else hi=m;}
  return (lo+hi)/2;
}

// Bir santral kaydının gerçek dünya göstergeleri; yeterli veri yoksa {wait:true}
export function plantFinance(p){
  const a=p.ac,f=FIN[p.k];if(!a||a.h<MIN_H||!f)return {wait:true,h:a?a.h:0};
  const q=EQUIP[p.k][tierOf(p)],kw=p.mw*1000,capex=f.capex*q.capex*kw,opex=f.opex*q.opex*kw;
  const cf=a.cap>0?a.e/a.cap:0; // kapasite faktörü: üretim / (kurulu güç × saat); güç sonradan arttıysa da doğru kalır
  const batt=p.k==="batt";
  const e1=batt?0:cf*p.mw*8760,price=a.e>0?a.r/a.e:0,fuelPerMWh=a.e>0?a.f/a.e:0;
  const net1=batt&&a.cap>0?a.r/a.cap*p.mw*8760:0; // batarya: MW başına net arbitraj gelirinin yıllığa çevrilmesi
  const E=[],flows=[];let disc=0,discE=0;
  for(let t=1;t<=f.life;t++){
    const e=p.k==="ges"?e1*(1-DEGR)**(t-1):e1;E.push(e);
    const cost=opex+e*fuelPerMWh,cash=batt?net1-opex:e*price-cost;flows.push(cash);
    disc+=cost/(1+wacc)**t;discE+=e/(1+wacc)**t;
  }
  const npv=npvAt(wacc,capex,flows),irr=irrOf(capex,flows);
  let cum=-capex,pb=null;for(let t=0;t<flows.length;t++){const prev=cum;cum+=flows[t];if(cum>=0){pb=t+(-prev)/flows[t];break;}}
  const lcoe=batt||discE<=0?null:(capex+disc)/discE;
  return {capex,opex,cf,e1,net1,price,lcoe,npv,irr,pb,life:f.life,days:a.h/24,src:f.src};
}

export const SHORT_DAYS=30; // daha kısa veride mevsimsellik yıllık değeri saptırabilir
export const techName=k=>TECH[k].n;
