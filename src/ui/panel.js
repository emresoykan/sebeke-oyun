// --- Panel ---
import { wp } from "../perfmark.js";
import { BLOCK, SITE_MIN_KM, REG, TECH, TER_N, MAR_UNLOCK, MAR_PREMIUM } from "../config.js";
import { S, selSite, save } from "../state.js";
import { allowed, locked, totalMW, landCost, permitFee, permitProb, oddsTxt, ministry, tooSteep, slopeOfSite, SLOPE, baseAllowed, siteCap, permitOptions } from "../rules.js";
import { spotCheck, ob, proOn, inTutorial } from "../tutorial.js";
import { checkMissions } from "../missions.js";
import { slopeOf } from "../slope.js";
import { fillRes, ghiAt } from "../world.js";
import { fmt$, dots, shape } from "../utils.js";
import { siteMW } from "../sim.js";
import { buyLand, applyPermit, build, undoFor, undoLast } from "../actions.js";
import { plantStatus, statusText } from "../plantstatus.js";
import { flyToSite, orbitSite } from "./map.js";
import { EQUIP, TIERS, TIER_ORDER, capexOf, eqName, tierOf } from "../equipment.js";
import { siteWx, siteForecast } from "../wxsite.js";
import { wxLabel, dirName, expectedCF, windSpeedOf, windClass } from "../weather.js";
import { rivalNear } from "../rivals.js";
import { km } from "../world.js";
import { loanTerms, NEW_GEAR } from "../loans.js";
import { pf } from "../finance.js";

const coord=(v,p,n)=>Math.abs(v).toFixed(2).replace(".",",")+"°"+(v>=0?p:n);
const near=t=>t.cityKm<5?`${t.city}`:`${t.city} (${t.cityKm} km)`;
let tab=null; // ekipman kartlarında seçili teknoloji

// Anlık hava ve günün kalan saatleri için 3 saatlik tahmin şeridi
function wxHtml(t){
  const w=siteWx(t),l=wxLabel(w,shape(Math.min(S.hour,23))===0),rain=w.rain>0.25?" • Yağış var":"";
  const fc=siteForecast(t,Math.min(S.hour,23)).map(({h,w})=>{const x=wxLabel(w,shape(h)===0);return `<div title="${String(h).padStart(2,"0")}:00 ${x.t}, rüzgâr ${w.hub.toFixed(0)} m/s"><small>${String(h).padStart(2,"0")}</small><span>${x.i}</span><small>${w.hub.toFixed(0)} m/s</small></div>`;}).join("");
  return `<div class="wx"><div class="wxnow"><span class="wxi">${l.i}</span><span><b>${l.t}</b> • Rüzgâr ${w.hub.toFixed(0)} m/s ${dirName(w.dir)} (türbin yüksekliği)${rain}</span></div><div class="wxfc" aria-label="Hava tahmini">${fc}</div></div>`;
}
const pctTxt=v=>"%"+(Math.round(v*1000)/10).toLocaleString("tr-TR");

// Banka kredisi açıklaması (standart kademe için): borç oranı, onu sınırlayan kural, faiz, vade ve taksit
const pc=v=>v.toLocaleString("tr-TR",{maximumFractionDigits:2});
function loanNote(t,k){
  const L=loanTerms(S.sel.id,k,"std");if(!L||L.debt<=0)return "";
  const why=L.bind==="new"?`ilk projede gerçekleşmiş üretim verisi yok, banka en çok %${Math.round(NEW_GEAR*100)} verir; bu piyasada bu teknolojide 3 günlük üretimden sonra nakit akışına göre boyutlandırılır`
    :L.bind==="gear"?`üst sınır %${pf.gear}; gerçekleşen nakit akışıyla DSCR ${pc(L.dscr)}`:`DSCR ${pc(pf.dscrM)} hedefi bağlıyor (gerçekleşen günlük nakit akışı ${fmt$(L.cfads)})`;
  return `<div class="eqnote loannote"><b>Banka kredisi:</b> borç %${Math.round(L.gear*100)} (${why}). Faiz yıllık %${pc(L.R*100)}, vade ${pf.tenor} yıl (oyunda ${L.n} gün). İlk ${L.g} gün ödemesiz: yalnızca faiz, günde ${fmt$(L.dsG)}; sonra günlük taksit ${fmt$(L.ds)}. Oyunda yatırımlar gerçeğin ~1/63'ü olduğundan 1 ekonomik yıl ≈ 5,8 oyun günü sayılır. Taksit gün sonunda nakitten düşer; ödenemezse iflas kuralı işler.</div>`;
}
// Ekipman seçimi: teknoloji sekmeleri ve her kademe için bir kart (marka, özellik, üretim, arıza riski, maliyet)
function buildHtml(t){
  const ks=allowed(t);if(!ks.length)return `<div class="status bad">${steepTxt(t)} Bu sahaya yeni tesis kurulamaz.</div>`;if(!ks.includes(tab))tab=ks[0];
  let h=`<div class="eqtabs" role="tablist">`+ks.map(k=>`<button role="tab" aria-selected="${k===tab}" class="${k===tab?"on":""}" style="--c:var(${TECH[k].c})" data-a="tab" data-k="${k}">${TECH[k].n}</button>`).join("")+`</div>`;
  h+=`<div class="eqcards">`+TIER_ORDER.map(q=>{const e=EQUIP[tab][q],c=capexOf(tab,q);
    const perf=tab==="batt"?`<span>Verim</span><b>${pctTxt(e.rte)}</b><span>Süre</span><b>2 saat</b>`:`<span>Üretim</span><b>${pctTxt(e.perf)}</b>`;
    return `<div class="eqcard t-${q}"><div class="eqtier">${TIERS[q]}</div><div class="eqname">${eqName(tab,q)}</div><div class="eqspec">${e.spec}</div>
      <div class="eqstats">${perf}<span>Arızasız gün</span><b>${pctTxt(e.avail)}</b><span>İşletme gideri</span><b>${pctTxt(e.opex)}</b></div>
      <button class="tech" style="--c:var(${TECH[tab].c})" data-a="build" data-k="${tab}" data-q="${q}" data-c="${c}">+5 MW${tab==="batt"?" / 10 MWh":""} • ${fmt$(c)}</button>${(()=>{if(!proOn())return "";const L=loanTerms(S.sel.id,tab,q);return L&&L.debt>0?`<button class="tech loan" style="--c:var(${TECH[tab].c})" data-a="build" data-loan="1" data-k="${tab}" data-q="${q}" data-c="${L.equity}" title="${fmt$(L.debt)} banka kredisi; ilk ${L.g} gün faiz ${fmt$(L.dsG)}/gün, sonra taksit ${fmt$(L.ds)}/gün">Kredili • ${fmt$(L.equity)} peşin</button>`:"";})()}</div>`;}).join("")+`</div>`;
  const TN={jes:`Jeotermal sürekli üretir ve tahmin hatası yoktur. İlk blokta sondaj yapılır: rezervuar beklenenin %55–110'u çıkabilir${t.well!=null?` (bu sahada %${Math.round(t.well*100)})`:""}.`,
    bes:`Biyokütle yakıt yakar: yalnızca fiyat yakıt maliyetini aştığı saatlerde çalışır. Hammadde bolluğu yakıtı ucuzlatır.`,
    mar:locked("mar")?`Gelişmekte olan teknoloji: toplam ${MAR_UNLOCK} MW kurulu güce ulaşınca açılır (şu an ${totalMW()} MW).`:`Gelgit günde iki kez güçlenir ve önceden hesaplanır; dalga havaya bağlıdır. Üretime MWh başına +${MAR_PREMIUM} $ yenilik desteği ödenir.`};
  if(proOn())h+=loanNote(t,tab); // kredi ilk satıştan sonra açılır (tutorial.js)
  return h+`<div class="eqnote">${TN[tab]?TN[tab]+" ":""}Yüzdeler standart kademeye göre. Ekonomi aynı parayla daha çok MW kurdurur; premium 40 MW'lık saha sınırında en çok üretimi verir.</div>`;
}

// Arazi eğimi: panelde ölçülen değer; düz arazi isteyen teknolojiler eğimli yerde çıkar (rules.js)
function slopeRow(t){
  const s=slopeOfSite(t);
  if(s===undefined)return `<span class="muted">ölçülüyor…</span>`;
  if(s===null)return `<span class="muted">ölçülemedi (yükseklik verisine ulaşılamadı; eğim kuralı uygulanmıyor)</span>`;
  const d=s.mean<=5?"düz":s.mean<=SLOPE.flat?"hafif eğimli":s.mean<=SLOPE.res?"eğimli":"sarp";
  return `%${s.mean.toLocaleString("tr-TR")} • ${d}${s.south&&s.mean>5?", güneye bakan yamaç":""} <small class="rv">250 m çevrenin ortalaması</small>`;
}
function steepTxt(t){
  const s=slopeOfSite(t),ks=baseAllowed(t).filter(k=>tooSteep(k,t));if(!s||!ks.length)return "";
  const lim={ges:`GES en çok %${SLOPE.flat}, güneye bakan yamaçta %${SLOPE.south}`,res:`rüzgâr türbini yolu ve platformu en çok %${SLOPE.res}`,
    batt:`batarya en çok %${SLOPE.flat}`,bes:`biyokütle santrali en çok %${SLOPE.flat}`,jes:`jeotermal santral en çok %${SLOPE.flat}`};
  return `Arazi eğimi %${s.mean.toLocaleString("tr-TR")}: ${ks.map(k=>TECH[k].n).join(", ")} için fazla eğimli (${ks.map(k=>lim[k]).join("; ")}).`;
}
// seçili noktanın eğimi henüz ölçülmediyse ölç; satın alınmış sahaya kaydet
function measureSlope(t,id){
  if(t.sea||t.reg==="X"||t.reg==="G"||slopeOfSite(t)!==undefined)return;
  slopeOf(t.lat,t.lon).then(r=>{const o=id&&S.sites[id];if(o&&r&&o.slope===undefined){o.slope=r;save();}
    const c=selSite();if(c&&c.lat===t.lat&&c.lon===t.lon)renderPanel();});
}

export function renderPanel(){const t=performance.now();renderPanelImpl();wp("renderPanel (saha paneli)",t);}
function renderPanelImpl(){
  const t=selSite(),id=S.sel.id,o=id?S.sites[id]:null,el=document.getElementById("panel");
  const latS=coord(t.lat,"K","G"),lonS=coord(t.lon,"D","B");
  let title,html="";
  // mobilde kapalı kartın tutamağında görünen kısa özet
  const ps=document.getElementById("peekSum");
  if(ps)ps.textContent=t.sea&&!t.shallow?"Açık deniz":t.reg==="X"?"Antarktika":t.reg==="G"?"Grönland buz örtüsü":
    o?`${o.city} • ${siteMW(id)?siteMW(id)+" MW":"santral yok"} • ${{ok:"izinli",pending:"izin bekliyor",rejected:"izin reddedildi"}[o.permit]||"izin yok"}`:
    `${t.urban?"Yerleşim alanı":t.sea?"Sığ deniz":TER_N[t.ter]} • ${near(t)} • ${fmt$(landCost(t))}`;
  if(t.sea&&!t.shallow){el.innerHTML=`<h3>Açık deniz</h3><div class="loc">${latS} ${lonS} • En yakın şehir: ${near(t)}</div><div class="status bad">Derin deniz: sabit tabanlı türbin kurulamaz. Kıyıya en fazla 200 km mesafedeki sığ sulara bak.</div>`;return;}
  if(t.reg==="X"){el.innerHTML=`<h3>Antarktika</h3><div class="loc">${latS} ${lonS}</div><div class="status bad">Antarktika Antlaşması gereği ticari enerji tesisi kurulamaz. Arazi satışa kapalı.</div>`;return;}
  if(t.reg==="G"){el.innerHTML=`<h3>Grönland buz örtüsü</h3><div class="loc">${latS} ${lonS}</div><div class="status bad">Buz örtüsü üzerinde tesis izni verilmez ve şebeke bağlantısı yok.</div>`;return;}
  title=t.urban&&!o?`${t.country} • Yerleşim alanı`:t.sea?`${t.country} • Sığ deniz`:`${t.country} • ${TER_N[t.ter]}${t.park?" ("+t.park+")":""}`;
  html+=`<h3>${title}</h3><div class="loc">${latS} ${lonS} • En yakın şehir: ${near(t)} • ${REG[t.mreg].n} piyasasına satar</div>`;
  const u=o&&undoFor(id);
  if(u)html+=`<div class="undo" role="status"><span>${u.kind==="land"?(t.sea?"Deniz alanı kiralandı":"Arazi alındı"):`+${BLOCK} MW ${TECH[u.k].n} kuruldu`} (${fmt$(u.c)}). Yanlışlıkla mı? Birkaç saniye içinde tam iadeyle geri alabilirsin.</span><button data-a="undo">Geri al</button></div>`;
  fillRes(t);
  // noktaların yanında değer: yıllık ortalama ışınım (NASA POWER) ve rüzgârda göbek yüksekliğinde (100 m) yıllık ortalama hız
  // ile beklenen kapasite faktörü (KF). Rüzgâr noktaları KF sınıfıdır: ●●●○○ Türkiye filo ortalaması (~%33) düzeyidir.
  const ghi=`<small class="rv">${ghiAt(t.lat,t.lon).toFixed(1).replace(".",",")} kWh/m²/gün</small>`,wv=windSpeedOf(t),cf=expectedCF(wv),wc=windClass(cf),
    wd="●".repeat(wc)+"○".repeat(5-wc),
    ws=`<small class="rv" title="Kapasite faktörü (KF): yıllık üretimin, santral tam güçte çalışsaydı üreteceğine oranı. Türkiye filo ortalaması ~%33 (TEİAŞ 2025).">${wv.toFixed(1).replace(".",",")} m/s • KF ≈%${Math.round(cf*100)}</small>`;
  html+=`<div class="res">`+(t.sea?`<span>Rüzgâr</span><span class="dots">${wd} ${ws}</span><span>Gelgit</span><span class="dots">${dots(t.tide)}</span>`:
    `<span>Güneş</span><span class="dots">${dots(t.solar)} ${ghi}</span><span>Rüzgâr</span><span class="dots">${wd} ${ws}</span><span>Hidro</span><span class="dots">${t.hydro?dots(t.hydro):"–  (yalnızca dağlık bölgeler)"}</span>`+
    `<span>Jeotermal</span><span class="dots">${t.geo>=0.3?dots(t.geo):"–  (yalnızca jeotermal kuşaklar)"}</span><span>Biyokütle</span><span class="dots">${t.bio>=0.4?dots(t.bio):"–  (hammadde yok)"}</span>`+
    `<span>Eğim</span><span>${slopeRow(t)}</span>`)+`</div>`;
  measureSlope(t,id);
  html+=`<div id="wxBox">${wxHtml(t)}</div>`;
  const p=permitProb(t),rv=o?null:rivalNear(t.lat,t.lon);
  if(rv){const {r,s:x}=rv,d=km(t.lat,t.lon,x.lat,x.lon);
    html+=`<div class="rival" style="--rc:${r.c}"><b>${r.n}</b> • ${x.mw} MW ${TECH[x.k].n} ${x.build>0?`(inşaat, ${x.build} gün)`:`(Gün ${x.day}'den beri işletmede)`}<br><small>${x.city} yakını, ${x.country} • ${REG[x.mreg].n} piyasası${d>=1?` • ${d.toFixed(0)} km uzakta`:""}</small></div>`;
    html+=`<div class="status bad">Bu bölge rakip şirketin sahasına çok yakın: ${SITE_MIN_KM} km içinde yeni saha açılamaz.</div>`;}
  else if(!o&&t.urban){
    html+=`<div class="status bad">Yerleşim alanı${t.cityKm<5?` (${t.city})`:""}: şehir ve kasabaların yapılaşmış bölgelerinde santral için arazi satın alınamaz. Kentin dışındaki tarım arazisi, mera ya da sanayi bölgelerine bak.</div>`;
  }else if(!o&&!t.sea&&!allowed(t).length){
    html+=`<div class="status bad">${steepTxt(t)} Bu noktada kurulabilecek tesis yok: araziyi almak için daha düz bir yer seç.</div>`;
  }else if(!o){
    if(steepTxt(t))html+=`<div class="status wait">${steepTxt(t)}</div>`;
    // eğitimde ilk arazi: seçilen yer ilk proje için uygun mu (uygun değilse satın almadan önce açıkça uyarılır)
    if(inTutorial()&&!Object.keys(S.sites).length){const sc=spotCheck(t);
      html+=sc.ok?`<div class="status ok tutspot">İlk proje için iyi bir yer: ${[sc.sun&&"güneş",sc.wind&&"rüzgâr"].filter(Boolean).join(" ve ")} güçlü, izin ihtimali yüksek.</div>`
        :`<div class="status bad tutspot">${sc.low?"İlk projen için uygun değil. ":""}${sc.why}${sc.low?" Ova, bozkır ya da çölde bir yer seç.":""}</div>`;}
    html+=`<div class="status">${t.sea?"Deniz alanı tahsisi":"Arazi"}: <b>${fmt$(landCost(t))}</b>. Satın aldıktan sonra ${ministry(t)} izni gerekir. Tahmini izin ihtimali: <b>${oddsTxt(p)}</b>.${t.ter==="p"?" Korunan alanda izin neredeyse hiç verilmez.":t.ter==="f"?" Orman alanlarında izin zor çıkar.":""}</div>`;
    // eğim ölçülmeden arazi satılmaz: eğim uyarısı satın almadan önce görünsün (ölçüm başarısızsa düğme açılır)
    const sw=!t.sea&&slopeOfSite(t)===undefined;
    html+=`<div class="actions"><button class="pri" data-a="land" data-c="${landCost(t)}"${sw?' data-wait="1" disabled':""}>${sw?"Eğim ölçülüyor…":t.sea?"Deniz alanını kirala":"Araziyi satın al"}</button></div>`;
  }else if(o.permit==="none"||o.permit==="rejected"){
    if(steepTxt(t))html+=`<div class="status wait">${steepTxt(t)}</div>`;
    if(o.permit==="rejected"){
      // ret: başvuru yolu seçilir; maliyet, süre ve tahmini onay ihtimali önceden görünür (rules.js permitOptions)
      html+=`<div class="status bad">İzin reddedildi: ${o.why}. Nasıl devam edeceğini seç:</div><div class="popts">`+permitOptions(t).map(x=>{
        const dd=x.d[0]===x.d[1]?`${x.d[0]} gün`:`${x.d[0]}–${x.d[1]} gün`,pp=Math.round(x.p*100);
        return `<button class="popt" data-a="permit" data-o="${x.k}" data-c="${x.fee}" aria-label="${x.l}: ${fmt$(x.fee)}, ${dd} inceleme, tahmini onay ihtimali yüzde ${pp}"><b>${x.l}</b><span>${x.sub}</span><span class="pmeta">${fmt$(x.fee)} • ${dd} • onay ~%${pp}</span></button>`;}).join("")+`</div>`;}
    else{html+=`<div class="status">Arazi senin. ${ministry(t)} izni olmadan kurulum yapılamaz. İzin ihtimali: <b>${oddsTxt(p)}</b>.</div>`;
      html+=`<div class="actions"><button class="pri" data-a="permit" data-c="${permitFee(t)}">İzin başvurusu yap (${fmt$(permitFee(t))})</button></div>`;}
  }else if(o.permit==="pending"){
    html+=`<div class="status wait">İzin inceleniyor: yaklaşık ${o.days} gün kaldı.</div>`;
  }else{
    const mw=siteMW(id),list=S.plants.filter(q=>q.t===id).map(q=>`${TECH[q.k].n} ${q.mw} MW${q.k==="batt"?` / ${q.mw*2} MWh`:""} (${eqName(q.k,tierOf(q))}${q.down?", arızalı":""})`).join(", ");
    html+=`<div class="status ok">İzin var. Bu sahada ${mw}/${siteCap(o)} MW kurulu${o.cap?" (küçültülmüş proje)":""}${list?": "+list:""}.</div>`;
    if(mw)html+=`<div class="live" id="liveStatus">${statusText(plantStatus(id))}</div>`;
    if(mw)html+=`<div class="actions"><button data-a="fly">3D yakından bak</button><button data-a="cine">🎬 Sinematik tur</button></div>`;
    if(steepTxt(t)&&allowed(t).length)html+=`<div class="status wait">${steepTxt(t)}</div>`;
    html+=buildHtml(t);
  }
  el.innerHTML=html;
  el.querySelectorAll("button[data-a]").forEach(b=>{b.onclick=()=>{const a=b.dataset.a;if(a==="fly")flyToSite(S.sel.id);else if(a==="cine")orbitSite(S.sel.id);else if(a==="land")buyLand();else if(a==="undo")undoLast();else if(a==="permit")applyPermit(S.sel.id,b.dataset.o);
    else if(a==="tab"){tab=b.dataset.k;if(o&&o.permit==="ok"&&!ob().tech){ob().tech=1;checkMissions();}renderPanel();}else build(S.sel.id,b.dataset.k,b.dataset.q,b.dataset.loan==="1");};});
  updateButtons();
}
export function updateButtons(){const wb=document.getElementById("wxBox");if(wb){const t=selSite();if(t&&t.lat!=null)wb.innerHTML=wxHtml(t);}const ls=document.getElementById("liveStatus");if(ls&&S.sel.id)ls.textContent=statusText(plantStatus(S.sel.id));document.querySelectorAll("#panel button[data-c]").forEach(b=>{let d=S.money<+b.dataset.c||!!b.dataset.wait;if(b.dataset.a==="build"&&(siteMW(S.sel.id)+BLOCK>siteCap(S.sites[S.sel.id])||locked(b.dataset.k)))d=true;b.disabled=d;});}
