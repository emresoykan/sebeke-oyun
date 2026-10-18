// --- Banka kredisi: santral bloğu kısmen borçla kurulur ---
// Faiz, vade, borç oranı üst sınırı ve hedef DSCR proje finansmanı varsayımlarından (finance.js, pf) gelir; panelden
// değiştirilen değerler yeni kredilere uygulanır.
// Zaman ölçeği: oyunda yatırımlar gerçeğin ~1/63'ü (GES: IRENA 691 $/kW × 5 MW ÷ oyundaki 55 b$), gelir ise gerçek ölçekte
// (bir oyun günü bir günlük üretim). Yatırıma oranla gelir bu yüzden 63 kat hızlı birikir: ekonomik olarak 1 yıl ≈ 5,8 oyun
// günüdür. Faiz ve vade bu ölçekle çevrilir (yıllık %8,6, 12 yıl → oyun günü başına ~%1,43, 70 oyun günü); böylece borç
// servisinin santral nakit akışına oranı (DSCR) gerçek dünyadakiyle aynı kalır. Takvim (bir oyun günü 3 takvim günü) bu
// hesabı etkilemez.
// Boyutlandırma: borç = min(borç oranı üst sınırı × yatırım, CFADS ÷ hedef DSCR × anüite faktörü). CFADS (borç servisine
// hazır nakit): oyuncunun aynı piyasada aynı teknolojideki santrallerinin gerçekleşen günlük satış geliri (yakıt düşülmüş)
// − bloğun işletme gideri; en az 3 günlük veri gerekir. Veri yoksa banka temkinli davranır: borç en çok yatırımın NEW_GEAR'ı
// (varsayım; gerçekte banka bağımsız üretim raporuyla, P50/P90, boyutlandırır). Oyunda vergi yoktur: CFADS = FAVÖK.
// İlk GRACE yıl yalnızca faiz, sonra eşit taksit (anüite); taksit gün sonunda nakitten düşer; nakit eksiye düşer ve düzelmezse iflas kuralı işler.
import { S, addLog } from "./state.js";
import { TECH, BLOCK } from "./config.js";
import { FIN, pf, MIN_H } from "./finance.js";
import { EQUIP, capexOf } from "./equipment.js";
import { fmt$ } from "./utils.js";

export const ECON_YEAR=365/(FIN.ges.capex*1000*BLOCK/TECH.ges.capex); // ≈ 5,8 oyun günü
export const NEW_GEAR=0.5;
// ödemesiz dönem (yıl): bu sürede yalnızca faiz ödenir, anapara kalan vadede eşit taksitle döner (varsayım; proje
// kredilerinde 1–3 yıllık ödemesiz dönem yaygındır, kaynakla doğrulanmadı)
export const GRACE=2;
const placeOf=id=>{const o=S.sites[id];return o?o.city||o.country||"Saha":"Saha";};

// aynı piyasa ve teknolojideki santrallerin gerçekleşen günlük CFADS'ı (5 MW blok başına, verilen ekipmanın gideriyle)
export function histCFADS(mreg,k,q="std"){
  let r=0,cap=0;
  for(const p of S.plants){const o=S.sites[p.t],a=p.ac;if(p.k!==k||!o||o.mreg!==mreg||!a||a.h<MIN_H)continue;r+=a.r-(a.f||0);cap+=a.cap;}
  if(cap<=0)return null;
  return r/cap*24*BLOCK-TECH[k].opex*EQUIP[k][q].opex;
}
// kredi koşulları: piyasa, faiz, vade, anüite, borç tutarı ve dayanağı
export function loanTerms(id,k,q="std"){
  const o=S.sites[id];if(!o)return null;
  const capex=capexOf(k,q),mk=o.mreg==="E"?"E":"T",R=(mk==="E"?pf.rateE:pf.rateT)/100;
  const rd=(1+R)**(1/ECON_YEAR)-1,n=Math.max(2,Math.round(pf.tenor*ECON_YEAR)),g=Math.min(n-1,Math.round(Math.min(GRACE,pf.tenor-1)*ECON_YEAR)),
    nA=n-g,ann=rd>0?(1-(1+rd)**-nA)/rd:nA; // anüite faktörü ödemeli dönem için
  const cf=histCFADS(o.mreg,k,q),capG=pf.gear/100;
  let debt=cf==null?NEW_GEAR*capex:Math.min(capG*capex,Math.max(0,cf/pf.dscrM*ann));
  debt=Math.floor(debt/100)*100;
  const ds=debt>0?debt/ann:0;
  return {capex,debt,equity:capex-debt,gear:debt/capex,R,rd,n,g,ann,ds,dsG:debt*rd,cfads:cf,dscr:cf!=null&&ds>0?cf/ds:null,basis:cf==null?"new":"hist",
    bind:cf==null?"new":debt>=Math.floor(capG*capex/100)*100?"gear":"dscr",mk};
}
// krediyi aç (build içinde, yatırımın özsermaye kısmı nakitten düşüldükten sonra)
export function openLoan(id,k,q,t){
  if(!S.loans)S.loans=[];const L={id:(S.loanId=(S.loanId||0)+1),t:id,k,q,P:t.debt,bal:t.debt,rd:t.rd,ds:t.ds,n:t.n,left:t.n,g:t.g,day:S.dayNo,R:t.R};
  S.loans.push(L);return L;
}
export function dropLoan(lid){if(S.loans)S.loans=S.loans.filter(L=>L.id!==lid);}
export const totalDebt=()=>(S.loans||[]).reduce((a,L)=>a+L.bal,0);
// bugünkü taksit: ödemesiz dönemde faiz, sonra anüite
export const dueOf=L=>L.g>0?L.bal*L.rd:L.ds;
export const dailyDS=()=>(S.loans||[]).reduce((a,L)=>a+dueOf(L),0);
// gün sonu: taksitler ödenir (faiz önce, kalanı anaparadan); vadesi dolan kredi kapanır
export function payLoans(){
  let paid=0,int=0;const L=S.loans||[];
  for(const x of L){const i=x.bal*x.rd,pay=x.g>0?i:x.left<=1?x.bal+i:Math.min(x.ds,x.bal+i);x.bal=Math.max(0,x.bal+i-pay);x.left--;if(x.g>0)x.g--;paid+=pay;int+=i;}
  S.money-=paid;
  for(const x of L.filter(x=>x.left<=0||x.bal<1))addLog(`${placeOf(x.t)}: ${TECH[x.k].n} kredisi kapandı (${fmt$(x.P)} anapara, ${x.n} günde).`);
  S.loans=L.filter(x=>x.left>0&&x.bal>=1);
  return {paid,int};
}
// erken kapama: kalan anapara nakitten ödenir (ceza yok: basitleştirme)
export function prepay(lid){
  const x=(S.loans||[]).find(L=>L.id===lid);if(!x||S.money<x.bal)return false;
  S.money-=x.bal;addLog(`${placeOf(x.t)}: ${TECH[x.k].n} kredisi erken kapatıldı (${fmt$(x.bal)} ödendi).`);dropLoan(lid);return true;
}
// sahanın aynı teknolojideki santrallerinin gerçekleşen DSCR'ı: günlük CFADS ÷ o kayda bağlı kredilerin günlük taksiti
export function loanDSCR(x){
  let r=0,cap=0,mw=0,op=0,h=0;
  for(const p of S.plants){if(p.t!==x.t||p.k!==x.k||!p.ac)continue;r+=p.ac.r-(p.ac.f||0);cap+=p.ac.cap;mw+=p.mw;h=Math.max(h,p.ac.h);op+=TECH[p.k].opex*EQUIP[p.k][p.q||"std"].opex*p.mw/BLOCK;}
  const ds=(S.loans||[]).filter(L=>L.t===x.t&&L.k===x.k).reduce((a,L)=>a+dueOf(L),0);
  if(h<MIN_H||ds<=0||cap<=0)return null;
  return (r/cap*24*mw-op)/ds; // MW-saat başına gelir × bugünkü güç
}
