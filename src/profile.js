// --- Oyuncu profili: kimlik, uzmanlık, ünvan ve rozetler ---
// Kimlik (ad, şirket, renk, uzmanlık) ayrı anahtarda saklanır; "Yeniden başla" oyunu sıfırlar ama profili korur.
// İstatistik ve rozetler oyunun kendisine aittir (S.stats, S.ach) ve yeni oyunla sıfırlanır.
import { MARKETS } from "./config.js";

export const PROFILE_KEY="sebeke-profile-v1";
export const COLORS=["#2F7FC1","#1F9D74","#E59E00","#C2364A","#7A5CC2","#1D2B36"];

// Uzmanlıklar oyunun bir mekaniğini hafifletir; oyun başında seçilir
export const SPECS={
  eng:{n:"Mühendis",d:"Santral arızaları yarı yarıya azalır."},
  fin:{n:"Finansçı",d:"Santral kurulum maliyeti %6 düşer."},
  reg:{n:"Mevzuat uzmanı",d:"İzin ihtimali 10 puan artar (korunan alanlar hariç), inceleme 1 gün kısalır."},
  trd:{n:"Piyasa analisti",d:"Üretim tahminlerin %35 daha isabetli: GÖP teklifinde dengesizlik maliyeti azalır."}
};

let P=null;
export function getProfile(){
  if(P)return P;
  try{const o=JSON.parse(localStorage.getItem(PROFILE_KEY)||"null");if(o&&o.name&&o.company&&SPECS[o.spec])P=o;}catch(e){}
  return P;
}
export function saveProfile(o){P={...o};try{localStorage.setItem(PROFILE_KEY,JSON.stringify(P));}catch(e){}}
export const spec=()=>(getProfile()||{}).spec;
export const initials=s=>s.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toLocaleUpperCase("tr-TR")||"?";

// Ünvan portföy değerine göre yükselir
export const TITLES=[[0,"Girişimci"],[3e5,"Proje geliştirici"],[1e6,"Bağımsız üretici"],[2.5e6,"Enerji yatırımcısı"],[5e6,"Enerji devi"]];
export function titleOf(nw){
  let i=0;while(i+1<TITLES.length&&nw>=TITLES[i+1][0])i++;
  const next=TITLES[i+1];
  return {n:TITLES[i][1],next:next?next[1]:null,need:next?next[0]:null,pct:next?Math.min(1,(nw-TITLES[i][0])/(next[0]-TITLES[i][0])):1};
}

export const freshStats=()=>({mwh:0,net:0,best:null,outages:0});

// Rozetler: koşul her gün sonunda ve her kurulumda kontrol edilir
const mwOf=S=>S.plants.reduce((a,p)=>a+p.mw,0);
export const ACH=[
  {id:"land",n:"İlk arazi",d:"İlk sahanı aç.",ok:S=>Object.keys(S.sites).length>0},
  {id:"permit",n:"Yeşil ışık",d:"İlk iznini al.",ok:S=>Object.values(S.sites).some(o=>o.permit==="ok")},
  {id:"plant",n:"İlk megavat",d:"İlk santralini kur.",ok:S=>S.plants.length>0},
  {id:"hybrid",n:"Hibrit saha",d:"Aynı sahada iki farklı teknoloji kur.",ok:S=>Object.keys(S.sites).some(id=>new Set(S.plants.filter(p=>p.t===id).map(p=>p.k)).size>=2)},
  {id:"off",n:"Açık denizde",d:"Offshore rüzgâr santrali kur.",ok:S=>S.plants.some(p=>p.k==="off")},
  {id:"pre",n:"Kaliteden ödün yok",d:"Premium ekipmanla santral kur.",ok:S=>S.plants.some(p=>p.q==="pre")},
  {id:"mw50",n:"50 MW",d:"Toplam kurulu gücü 50 MW'a çıkar.",ok:S=>mwOf(S)>=50},
  {id:"mkt3",n:"Küresel oyuncu",d:"Üç farklı piyasada üretim yap.",ok:S=>new Set(S.plants.map(p=>S.sites[p.t].mreg)).size>=3},
  {id:"gwh",n:"Gigavatsaat",d:"Toplam 1.000 MWh elektrik üret.",ok:S=>S.stats.mwh>=1000},
  {id:"mil",n:"Milyon dolarlık portföy",d:"Portföy değerini 1 M$'a çıkar.",ok:(S,nw)=>nw>=1e6}
];
// Yeni açılan rozetleri döndürür ve S.ach'a ekler
export function checkAch(S,nw){
  const got=new Set(S.ach),fresh=ACH.filter(a=>!got.has(a.id)&&a.ok(S,nw));
  fresh.forEach(a=>S.ach.push(a.id));return fresh;
}
export const marketCount=S=>MARKETS.filter(k=>S.plants.some(p=>S.sites[p.t].mreg===k)).length;
