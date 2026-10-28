// --- Aksiyonlar ---
import { BLOCK, REG, TECH, UNDO_MS, FIT } from "./config.js";
import { describe, placeName } from "./world.js";
import { S, save, addLog } from "./state.js";
import { landCost, permitFee, permitDays, allowed, permitOptions, SHRINK_MW, siteBlock, fits } from "./rules.js";
import { easyPermit, ob } from "./tutorial.js";
import { slopeCached } from "./slope.js";
import { siteMW, newDayHydro, planBio, planStore, planH2, planCSP, awardAch } from "./sim.js";
import { locked } from "./rules.js";
import { capexOf, eqName, TIERS } from "./equipment.js";
import { checkMissions } from "./missions.js";
import { sfx } from "./ui/fx.js";
import { fmt$ } from "./utils.js";
import { siteWx } from "./wxsite.js";
import { dirName } from "./weather.js";
import { rivalNear } from "./rivals.js";
import { loanTerms, openLoan, dropLoan, ECON_YEAR } from "./loans.js";
import { saleOffer } from "./sale.js";
import { render } from "./ui/hud.js";
import { renderPanel } from "./ui/panel.js";
import { drawMap } from "./ui/map.js";

function refresh(){awardAch();checkMissions();save();renderPanel();drawMap();render();}

// --- Geri alma: son satın alma (arazi veya +5 MW blok) kısa süre içinde tam iadeyle geri alınabilir ---
// Yalnızca en son satın alma geri alınır; arazide izin başvurusu yapıldıysa veya santral kurulduysa artık alınamaz.
// JES'te ilk blok sondajı yaptığı için geri alınamaz (sondaj sonucu öğrenilip para geri istenemez).
let U=null,uT=0;
function markUndo(u){U={...u,at:performance.now()};clearTimeout(uT);uT=setTimeout(()=>{U=null;renderPanel();},UNDO_MS);}
function undoValid(){
  if(!U||performance.now()-U.at>UNDO_MS)return false;const o=S.sites[U.id];if(!o)return false;
  if(U.kind==="land")return o.permit==="none"&&!S.plants.some(p=>p.t===U.id);
  const p=S.plants.find(x=>x.t===U.id&&x.k===U.k&&x.q===U.q);return !!p&&p.mw>=BLOCK;
}
// panel için: seçili sahada geri alınabilir bir satın alma varsa açıklaması
export function undoFor(id){return undoValid()&&U.id===id?U:null;}
export function undoLast(){
  if(!undoValid())return;const u=U;U=null;clearTimeout(uT);S.money+=u.c;
  if(u.kind==="land"){const o=S.sites[u.id];delete S.sites[u.id];S.sel={id:null,lat:o.lat,lon:o.lon};
    addLog(`${o.sea?"Deniz alanı tahsisi":"Arazi alımı"} geri alındı: ${placeName(o)}. ${fmt$(u.c)} iade edildi.`);}
  else{const i=S.plants.findIndex(x=>x.t===u.id&&x.k===u.k&&x.q===u.q),p=S.plants[i];p.mw-=BLOCK;p.cost=(p.cost||0)-(u.cost??u.c);if(p.mw<=0)S.plants.splice(i,1);if(u.loan)dropLoan(u.loan);
    addLog(`${placeName(S.sites[u.id])}: +${BLOCK} MW ${TECH[u.k].n} geri alındı. ${fmt$(u.c)} iade edildi.`);}
  refresh();window.dispatchEvent(new CustomEvent("sebeke:land"));
}

// Seçili noktada yeni saha aç (arazi satın al / deniz alanı kirala)
export function buyLand(){const t=describe(S.sel.lat,S.sel.lon),c=landCost(t);if(S.money<c||rivalNear(t.lat,t.lon)||t.urban||(!t.sea&&!allowed(t).length)||(t.deep&&locked("flo")))return;S.money-=c;
  const id="s"+(S.nextId++),sl=slopeCached(t.lat,t.lon);S.sites[id]={...t,permit:"none"};if(sl)S.sites[id].slope=sl;S.sel={id,lat:t.lat,lon:t.lon};
  addLog(`${t.sea?"Deniz alanı tahsisi":"Arazi"} alındı: ${placeName(t)} (${REG[t.mreg].n} piyasası). Sıradaki adım: izin başvurusu.`);markUndo({kind:"land",id,c});refresh();window.dispatchEvent(new CustomEvent("sebeke:land"));}
// opt: reddedilen başvurudan sonra seçilen yol (rules.js permitOptions); yoksa normal başvuru.
// Eğitimde uygun ilk sahanın ilk başvurusu onaylanır ve kısa sürer (tutorial.js easyPermit; t.tg sonuçlanınca silinir).
export function applyPermit(id,opt="n"){const t=S.sites[id];if(!t||(t.permit!=="none"&&t.permit!=="rejected"))return;
  const o=permitOptions(t).find(x=>x.k===opt)||permitOptions(t)[0],c=o.fee;if(S.money<c)return;S.money-=c;
  const easy=t.permit==="none"&&easyPermit(t),d=easy?2:permitDays(t,o.d);delete t.why;
  if(easy){t.tg=1;ob().g=1;}
  if(o.k==="small")t.cap=SHRINK_MW;
  Object.assign(t,{permit:"pending",days:d,pk:o.k});
  const how={ced:" Ek ÇED çalışmasıyla.",small:` Proje ${SHRINK_MW} MW'a küçültüldü.`,local:" Yerel ortakla."}[o.k]||"";
  addLog(`${placeName(t)}: izin başvurusu yapıldı, inceleme yaklaşık ${d} gün sürecek.${how}`);refresh();window.dispatchEvent(new CustomEvent("sebeke:permit"));}
// Santral kur: aynı sahada aynı teknoloji ve ekipman kademesi tek kayıtta birikir; yatırılan tutar (cost) portföy değerine girer.
// loan: yatırımın bir kısmı banka kredisiyle (loans.js); nakitten yalnızca özsermaye payı düşer, borç portföy değerinden çıkar
export function build(id,k,q="std",loan=false){const lt=loan?loanTerms(id,k,q):null;if(loan&&!(lt&&lt.debt>0))return;
  const c=capexOf(k,q),pay=lt?lt.equity:c;if(S.money<pay||!fits(id,k,BLOCK)||locked(k)||siteBlock(id,k)||!allowed(S.sites[id]).includes(k))return;S.money-=pay;
  const L=lt?openLoan(id,k,q,lt):null;
  const o=S.sites[id],drill=k==="jes"&&o.well==null;
  // JES: ilk kuyu sondajı rezervuarın verimini ortaya çıkarır (sondaj riski); sahadaki sonraki bloklar aynı rezervuarı kullanır
  if(k==="jes"&&o.well==null){o.well=+(0.55+Math.random()*0.55).toFixed(2);
    const r=o.well>=0.95?"beklenenden iyi":o.well>=0.8?"beklendiği gibi":o.well>=0.68?"beklenenden zayıf":"hayal kırıklığı";
    addLog(`${placeName(o)}: jeotermal sondaj tamamlandı, rezervuar ${r} (beklenenin %${Math.round(o.well*100)}'i). Sahadaki tüm JES blokları bu verimle üretir.`);}
  let p=S.plants.find(x=>x.t===id&&x.k===k&&x.q===q);
  if(p){p.mw+=BLOCK;p.cost=(p.cost||0)+c;}else{p={t:id,k,q,mw:BLOCK,soc:0,cost:c};S.plants.push(p);}
  // ilk yenilenebilir santral: sahası alım garantisi kapsamına girer (config.js FIT)
  if(!S.fitDone&&["ges","res","off","flo","mar","fpv"].includes(k)){S.fitDone=1;const days=Math.round(FIT.years*ECON_YEAR);o.fit={p:FIT.p,until:S.dayNo+days};
    addLog(`${placeName(o)}: ilk projen alım garantisi kapsamında. Piyasa fiyatı ${FIT.p} $/MWh'nin altına düştüğü saatlerde fark ödenir (${FIT.years} ekonomik yıl, ${days} oyun günü).`);}
  // rüzgâr santrali kurulurken türbinler o saatte esen rüzgâra bakacak şekilde dizilir (sitemodel.js buildSite); sahadaki
  // sonraki bloklar aynı yönde eklenir
  let wd="";if((k==="res"||k==="off"||k==="flo")&&o.wdir==null){o.wdir=Math.round(siteWx(o).dir);wd=`; türbinler ${dirName(o.wdir)} rüzgârına dönük dizildi`;}
  if(k==="hes")newDayHydro(p);
  if(k==="bes")planBio(p,S.hour);
  if(k==="phs")planStore(p);
  if(k==="h2")planH2(p,S.hour);
  if(k==="csp")planCSP(p,S.hour);
  sfx("build");
  addLog(`${placeName(S.sites[id])}: +${BLOCK} MW ${TECH[k].n} kuruldu (${eqName(k,q)}, ${TIERS[q].toLocaleLowerCase("tr-TR")})${L?`; ${fmt$(L.P)} banka kredisi (%${Math.round(lt.gear*100)} borç, ${L.n} gün vade, ilk ${L.g} gün yalnızca faiz, sonra günlük taksit ${fmt$(L.ds)})`:""}${wd}.`);
  if(drill){U=null;clearTimeout(uT);}else markUndo({kind:"build",id,k,q,c:pay,cost:c,loan:L?L.id:null});
  refresh();window.dispatchEvent(new CustomEvent("sebeke:build"));}

// Sahayı sat (sale.js saleOffer): bedel nakde girer, sahaya bağlı krediler bedelden kapanır; saha, santralleri ve
// kredileri portföyden çıkar. Nakit kredileri kapatmaya yetmiyorsa satış yapılmaz. Geri alınamaz.
export function sellSite(id){const f=saleOffer(id);if(!f||!f.ok)return null;const o=S.sites[id];
  S.money+=f.net;S.loans=(S.loans||[]).filter(L=>L.t!==id);
  for(let i=S.plants.length-1;i>=0;i--)if(S.plants[i].t===id)S.plants.splice(i,1);
  delete S.sites[id];if(U&&U.id===id){U=null;clearTimeout(uT);}
  if(S.sel.id===id)S.sel={id:null,lat:o.lat,lon:o.lon};
  const st=S.stats;st.sold=(st.sold||0)+1;st.saleGain=(st.saleGain||0)+f.gain;
  addLog(`${placeName(o)} satıldı: ${fmt$(f.price)}${f.debt>0?`, ${fmt$(f.debt)} kredi kapatıldı, nakde ${fmt$(f.net)} geçti`:""}. Defter değerine göre ${f.gain>=0?"kâr":"zarar"}: ${fmt$(Math.abs(f.gain))}.`);
  sfx("coin");refresh();window.dispatchEvent(new CustomEvent("sebeke:sell",{detail:f}));return f;}
