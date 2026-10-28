// --- Rapor sekmesi: proje ekonomisi (gerçek dünya karşılığı) ---
// Her santral kaydı için kapasite faktörü, ortalama satış fiyatı, yatırım, LCOE, NPV, IRR ve geri ödeme; iskonto oranı
// kaydırıcıyla değiştirilebilir (duyarlılık). Varsayımlar, formüller ve kısaltmalar açılır bölümde.
import { proOn } from "../tutorial.js";
import { S, save } from "../state.js";
import { loanDSCR, prepay, totalDebt, dailyDS, dueOf, ECON_YEAR } from "../loans.js";
import { fmt$ } from "../utils.js";
import { render } from "./hud.js";
import { TECH, BLOCK, H2 } from "../config.js";
import { placeName } from "../world.js";
import { eqName, tierOf } from "../equipment.js";
import { FIN, NET, DEGR, MIN_H, SHORT_DAYS, wacc, setWacc, plantFinance, projectFinance, pf, setPf, resetPf, PF_SRC } from "../finance.js";

const nf=(v,d=1)=>v.toLocaleString("tr-TR",{minimumFractionDigits:d,maximumFractionDigits:d});
const M$=v=>`${v<0?"−":""}${nf(Math.abs(v)/1e6,2)} M$`;
const pct=v=>v==null?"—":"%"+nf(v*100,1);
const yrs=v=>v==null?"—":nf(v,1)+" yıl";

function rows(){
  const ps=S.plants.slice().sort((a,b)=>a.t.localeCompare(b.t)||a.k.localeCompare(b.k));
  if(!ps.length)return `<tr><td colspan="9" style="text-align:left;color:var(--muted)">Henüz santral yok.</td></tr>`;
  return ps.map(p=>{
    const o=S.sites[p.t],f=plantFinance(p),name=`${o?placeName(o):p.t}<br><small class="mut">${TECH[p.k].n} ${p.mw} MW • ${eqName(p.k,tierOf(p))}</small>`;
    if(f.wait)return `<tr><td>${name}</td><td colspan="8" style="text-align:left;color:var(--muted)">Veri toplanıyor: ${Math.floor(f.h/24)}/${MIN_H/24} gün</td></tr>`;
    const batt=NET.includes(p.k),short=f.days<SHORT_DAYS;
    return `<tr><td>${name}</td>
      <td>${batt?"—":pct(f.cf)}${short?' <small class="mut" title="Kısa veri dönemi: mevsimsellik yıllık değeri saptırabilir">*</small>':""}</td>
      <td>${batt?`${M$(f.net1)}/yıl`:`${nf(f.price,0)} $/MWh`}</td>
      <td>${M$(f.capex)}</td>
      <td>${f.lcoe==null?"—":nf(f.lcoe,0)+" $/MWh"}</td>
      <td class="${f.npv<0?"neg":"pos"}">${M$(f.npv)}</td>
      <td>${pct(f.irr)}</td>
      <td>${f.pb==null?`> ${f.life} yıl`:nf(f.pb,1)+" yıl"}</td>
      <td>${nf(f.days,0)} gün</td></tr>`;
  }).join("");
}

// --- Proje finansmanı tablosu: her santral için spot ve PPA satırı; son iki sütun spot fiyatın %20 düştüğü stres senaryosu
const STRESS=0.2;
function pfRows(){
  const ps=S.plants.slice().sort((a,b)=>a.t.localeCompare(b.t)||a.k.localeCompare(b.k));
  if(!ps.length)return `<p class="mut" style="margin:0">Henüz santral yok.</p>`;
  return ps.map(p=>{
    const o=S.sites[p.t],mk=o?.mreg,name=`<b>${o?placeName(o):p.t}</b> <small class="mut">${TECH[p.k].n} ${p.mw} MW</small>`;
    const pf0=plantFinance(p);if(pf0.wait)return `<div class="pfcard"><div>${name}</div><p class="mut" style="margin:4px 0 0">Veri toplanıyor</p></div>`;
    const star=pf0.days<SHORT_DAYS?' <small class="mut" title="Kısa veri dönemi: mevsimsellik yıllık değeri saptırabilir">*</small>':"";
    const modes=NET.includes(p.k)?["spot"]:["spot","ppa"],F=modes.map(m=>projectFinance(p,m,mk)),X=modes.map(m=>projectFinance(p,m,mk,STRESS));
    const dscr=v=>v==null?"—":nf(Math.floor(v*100)/100,2)+(v<1?" ⚠":""),row=(l,f,cls)=>`<tr><th scope="row">${l}</th>${modes.map((_,i)=>`<td class="${cls?cls(i):""}">${f(i)}</td>`).join("")}</tr>`;
    return `<div class="pfcard"><div>${name}${star}</div><table class="pfmini"><thead><tr><th></th>${modes.map(m=>`<th>${m==="ppa"?"PPA":"Spot"}</th>`).join("")}</tr></thead><tbody>
      ${row("Satış fiyatı ($/MWh)",i=>p.k==="h2"?`hidrojen ${H2.price} $/kg`:NET.includes(p.k)?"arbitraj":nf(F[i].ppaPrice??F[i].price,0))}
      ${row("Borç oranı",i=>`${pct(F[i].gear)}<br><small class="mut">${M$(F[i].debt)}</small>`)}
      ${row("En düşük DSCR",i=>dscr(F[i].minDscr))}
      ${row("Proje IRR (vergi sonrası)",i=>pct(F[i].projIrr))}
      ${row("<b>Özsermaye IRR</b>",i=>`<b>${pct(F[i].eqIrr)}</b>`)}
      ${row("Özsermaye geri ödeme",i=>yrs(F[i].eqPb))}
      <tr class="pfst"><th scope="row" colspan="${modes.length+1}">Stres: spot fiyat −%${STRESS*100}</th></tr>
      ${row("Özsermaye IRR",i=>pct(X[i].eqIrr))}
      ${row("En düşük DSCR",i=>dscr(X[i].minDscr),i=>X[i].minDscr!=null&&X[i].minDscr<1?"neg":"")}
    </tbody></table></div>`;
  }).join("");
}
// varsayım girişleri: [anahtar, etiket, birim, adım, en az, en çok]
const PF_IN=[["rateT","Kredi faizi, Türkiye ve diğer piyasalar","%",0.1,0,30],["rateE","Kredi faizi, Avrupa","%",0.1,0,30],["tenor","Kredi vadesi","yıl",1,1,25],
  ["gear","Borç oranı üst sınırı","% yatırım",1,0,90],["dscrM","Hedef DSCR, spot satış","×",0.05,1,3],["dscrP","Hedef DSCR, PPA","×",0.05,1,3],
  ["taxT","Kurumlar vergisi, Türkiye ve diğer","%",0.5,0,50],["taxE","Kurumlar vergisi, Avrupa","%",0.5,0,50],["dep","Vergi amortismanı (doğrusal)","yıl",1,1,40],
  ["ppaYears","PPA süresi","yıl",1,0,25],["ppaDisc","PPA fiyatı, beklenen spot satış fiyatının altında","%",1,0,50]];
function pfInputs(){
  return `<div class="pfin">${PF_IN.map(([k,l,u,st,mn,mx])=>`<label><span>${l}</span><span class="pfv"><input type="number" data-pf="${k}" value="${pf[k]}" step="${st}" min="${mn}" max="${mx}" inputmode="decimal"> <small>${u}</small></span>${PF_SRC[k]?`<small class="mut">${PF_SRC[k]}</small>`:`<small class="mut">varsayım</small>`}</label>`).join("")}</div>
    <button type="button" class="pfreset">Varsayılanlara dön</button>`;
}

// oyundaki yatırımın gerçek dünya yatırımına oranı (5 MW blok başına), kurulu teknolojiler için
function scaleNote(){
  const ks=[...new Set(S.plants.map(p=>p.k))].filter(k=>FIN[k]&&k!=="batt");if(!ks.length)ks.push("ges");
  return ks.map(k=>`${TECH[k].n} ~1/${Math.round(FIN[k].capex*1000*BLOCK/TECH[k].capex)}`).join(", ");
}
function assumptions(){
  const tr=Object.entries(FIN).map(([k,f])=>`<tr><td>${TECH[k].n}</td><td>${f.capex.toLocaleString("tr-TR")}</td><td>${f.opex}</td><td>${f.life}</td><td style="text-align:left;white-space:normal;min-width:140px">${f.src}</td></tr>`).join("");
  return `<details class="findet"><summary>Varsayımlar, hesap yöntemi ve kısaltmalar</summary>
  <p><b>Neden gerçek dünya ölçeği?</b> Oyunda yatırımlar gerçeğin yaklaşık 1/60'ı ve günler hızlı geçer; oyun parasıyla hesaplanan getiri gerçekçi olmaz. Burada üretim ve satış fiyatı oyunda gerçekleşen değerlerdir, maliyetler gerçek dünya varsayımlarıdır.</p>
  <div style="overflow-x:auto"><table><tr><th>Teknoloji</th><th>Yatırım $/kW</th><th>İşletme $/kW-yıl</th><th>Ömür (yıl)</th><th style="text-align:left">Yatırım kaynağı</th></tr>${tr}</table></div>
  <p class="mut">Yatırım: IRENA, <i>Renewable Power Generation Costs in 2024</i> (2025), küresel ağırlıklı ortalama kurulu maliyet; birincil rapora erişilemedi, değerler raporu aktaran kaynaklardan alındı. Ekipman kademesi yatırımı ve işletme giderini oyundaki oranla değiştirir. İşletme gideri, ömür, GES'te yıllık %${nf(DEGR*100,1)} verim kaybı ve iskonto oranı doğrulanmamış varsayımlardır.</p>
  <p><b>Hesap</b></p>
  <ul>
    <li>Kapasite faktörü (CF) = oyundaki üretim ÷ (kurulu güç × geçen saat). Arıza ve kısıntı (satılamayan üretim) CF'yi düşürür.</li>
    <li>Yıllık üretim = CF × MW × 8.760 saat.</li>
    <li>Ortalama satış fiyatı = oyunda kazanılan piyasa değeri ÷ üretim (dengesizlik maliyeti hariç; o portföy düzeyinde ayrı izlenir). Deniz enerjisinde yenilik desteği dahil.</li>
    <li>Yıllık nakit akışı = üretim × satış fiyatı − işletme gideri − yakıt (biyokütle). Batarya: oyundaki net arbitraj geliri yıllığa çevrilir.</li>
    <li>NPV = −yatırım + Σ nakit akışı<sub>t</sub> ÷ (1 + WACC)<sup>t</sup>, t = 1 … ömür.</li>
    <li>IRR = NPV'yi sıfır yapan iskonto oranı.</li>
    <li>LCOE = (yatırım + Σ gider<sub>t</sub> ÷ (1+WACC)<sup>t</sup>) ÷ Σ üretim<sub>t</sub> ÷ (1+WACC)<sup>t</sup>. Ortalama satış fiyatı LCOE'nin üstündeyse NPV pozitiftir.</li>
    <li>Geri ödeme = birikimli (iskontosuz) nakit akışının yatırımı karşıladığı yıl.</li>
  </ul>
  <p class="mut">Bu tablo vergi ve finansman öncesidir; borç, vergi ve PPA aşağıdaki Proje finansmanı bölümündedir. Hariç: enflasyon (fiyat ve giderler sabit), arazi ve şebeke bağlantısı, hurda değeri, dengesizlik maliyeti. * işaretli satırlarda veri ${SHORT_DAYS} günden kısa: oyundaki mevsim yıllık ortalamayı temsil etmeyebilir (ör. ilkbaharda ölçülen GES yıllık değeri olduğundan yüksek gösterebilir). Satış fiyatları oyunun piyasa modelinden gelir, gerçek piyasa fiyatı değildir.</p>
  <p><b>Kısaltmalar</b> <button type="button" class="hlink" data-gloss="">Tüm terimler: Sözlük</button></p>
  <ul>
    <li><b>CF</b> (Capacity Factor): kapasite faktörü.</li>
    <li><b>LCOE</b> (Levelized Cost of Energy): seviyelendirilmiş enerji maliyeti; ömür boyu her MWh'nin ortalama maliyeti.</li>
    <li><b>NPV</b> (Net Present Value): net bugünkü değer; pozitifse proje istenen getiriden fazlasını kazandırır.</li>
    <li><b>IRR</b> (Internal Rate of Return): iç verim oranı; projenin yıllık getirisi.</li>
    <li><b>WACC</b> (Weighted Average Cost of Capital): ağırlıklı ortalama sermaye maliyeti; burada iskonto oranı.</li>
    <li><b>FAVÖK</b> (EBITDA): faiz, vergi ve amortisman öncesi kâr; burada gelir − işletme gideri − yakıt.</li>
    <li><b>CFADS</b> (Cash Flow Available for Debt Service): borç servisine hazır nakit; FAVÖK − ödenen vergi.</li>
    <li><b>DSCR</b> (Debt Service Coverage Ratio): borç servisi karşılama oranı; CFADS ÷ yıllık anapara ve faiz. Banka borcu, vade boyunca en düşük DSCR hedefin altına inmeyecek şekilde boyutlandırır; 1'in altı nakdin taksiti karşılamadığı demektir.</li>
    <li><b>PPA</b> (Power Purchase Agreement): uzun vadeli elektrik satış anlaşması; fiyat sabitlenir, piyasa fiyat riski alıcıya geçer.</li>
    <li><b>Borç oranı</b> (gearing): yatırımın borçla finanse edilen payı; geri kalanı özsermayedir.</li>
    <li><b>Özsermaye IRR'ı</b>: ortakların koyduğu paranın getirisi; borç servisi ve vergi düşüldükten sonra. Proje IRR'ından yüksekse kaldıraç getiriyi artırıyordur.</li>
    <li><b>Vergi kalkanı</b>: faiz gideri vergi matrahından düştüğü için borcun vergiyi azaltması.</li>
  </ul></details>`;
}

// Banka kredileri (oyun parasıyla): kalan anapara, günlük taksit, kalan gün, gerçekleşen DSCR; erken kapama
function loanRows(){
  const L=S.loans||[];if(!L.length)return `<p class="mut">Kredi yok. Santral kurarken "Kredili" düğmesiyle yatırımın bir kısmını bankadan karşılayabilirsin.</p>`;
  return `<div style="overflow-x:auto"><table class="fint"><thead><tr><th>Santral</th><th>Kalan anapara</th><th>Günlük taksit</th><th>Kalan</th><th title="Gerçekleşen günlük nakit akışı ÷ günlük taksit (sahada o teknolojideki tüm krediler)">DSCR</th><th></th></tr></thead><tbody>${L.map(x=>{
    const o=S.sites[x.t],d=loanDSCR(x);
    return `<tr><td>${o?placeName(o):"—"} ${TECH[x.k].n}<small class="mut"> • %${nf(x.R*100,1)} yıllık</small></td><td>${fmt$(x.bal)}</td><td>${fmt$(dueOf(x))}${x.g>0?`<small class="mut"> faiz, ${x.g} gün ödemesiz</small>`:""}</td><td>${x.left} gün</td><td>${d==null?"—":nf(d,2)+(d<1?" ⚠":"")}</td><td><button type="button" data-pre="${x.id}" ${S.money<x.bal?"disabled":""}>Kapat</button></td></tr>`;}).join("")}</tbody></table></div>
    <p class="mut">Toplam borç ${fmt$(totalDebt())}, günlük taksit ${fmt$(dailyDS())}. Portföy değeri borç düşülerek hesaplanır. Vade ve faiz ekonomik zaman ölçeğiyle çevrilir: 1 yıl ≈ ${nf(ECON_YEAR,1)} oyun günü. ⚠: santralin nakit akışı taksiti karşılamıyor, fark nakitten ödeniyor.</p>`;
}

export function renderFin(){
  const el=document.getElementById("fin");if(!el)return;
  // ilk satışa kadar gizli; sonra kısa bir açıklama ve kapalı "Uzman ayrıntıları" (tutorial.js)
  if(!proOn()){if(el.dataset.init!=="0"){el.dataset.init="0";el.innerHTML=`<p class="mut" style="margin:0">İlk satışından sonra burada santralinin ömür boyu ekonomisi hesaplanır: yatırımın kaç yılda geri döner, MWh başına maliyetin ne olur.</p>`;}return;}
  if(el.dataset.init!=="1"){el.dataset.init="1";
    el.innerHTML=`<p class="mut pfnote" style="margin-top:0">Santralinin gerçekleşen üretimi ve satış fiyatıyla, aynı santralin gerçek dünyada ömrü boyunca ne kazandıracağı tahmin edilir. Terimlerin açıklaması tablonun altında.</p>
      <details class="expert"><summary>Uzman ayrıntıları: LCOE, NPV, IRR, PPA ve kredi</summary>
      <label class="finw">İskonto oranı (WACC): <b id="finW"></b><input type="range" min="4" max="16" step="0.5" value="${wacc*100}" aria-label="İskonto oranı (WACC), yüzde"></label>
      <p class="mut pfnote"><b>Bu tablo gerçek dünya ölçeğindedir (M$).</b> Aynı santral gerçekte kurulsaydı yatırım ve getirisi ne olurdu, onu gösterir; oyundaki bütçen (b$) bu tutarların çok küçük bir kesridir (${scaleNote()}). Üretim ve satış fiyatı oyunda gerçekleşen değerlerdir. Oyun parası yalnızca aşağıdaki Banka kredileri bölümündedir.</p>
      <div style="overflow-x:auto"><table class="fint"><thead><tr><th>Santral</th><th>CF</th><th>Ort. satış fiyatı</th><th title="Gerçek dünya karşılığı">Yatırım (gerçek)</th><th>LCOE</th><th>NPV</th><th>IRR</th><th>Geri ödeme</th><th>Veri</th></tr></thead><tbody id="finRows"></tbody></table></div>
      ${assumptions()}
      <h3 class="pfh">Proje finansmanı <small class="mut">borç, vergi ve satış sözleşmesi</small></h3>
      <p class="mut pfnote">Her santral iki yapıyla: <b>Spot</b>, tüm üretimi piyasaya satar; <b>PPA</b>, ilk yıllarda sabit fiyatla satar, karşılığında banka daha çok borç verir. Alttaki stres satırları spot fiyatın %${STRESS*100} düştüğü kötü senaryodur (borç baz senaryoyla boyutlanır).</p>
      <div id="pfRows" class="pfbox"></div>
      <h3 class="pfh">Banka kredileri <small class="mut">oyun parasıyla</small></h3>
      <div id="loanRows"></div>
      <details class="findet"><summary>Finansman varsayımları ve hesap yöntemi</summary>
        ${pfInputs()}
        <p><b>Hesap</b> (yıllık, gerçek dünya ölçeğinde)</p>
        <ul>
          <li>Gelir: yıllık üretim × satış fiyatı. PPA'da ilk yıllarda fiyat, oyunda gerçekleşen ortalama satış fiyatının belirtilen oranda altındadır; sonra piyasa fiyatı.</li>
          <li>Vergi = (FAVÖK − amortisman − faiz − geçmiş yıl zararı) × vergi oranı, sıfırın altına inmez. Zarar en eskisinden mahsup edilir; Türkiye'de en çok 5 yıl devreder (KVK md. 9), Avrupa'da süre sınırı yok (Almanya ve İspanya'daki yıllık mahsup üst sınırları uygulanmadı).</li>
          <li>Borç eşit taksitli (anüite) geri ödenir. Tutar şu iki sınırdan küçüğüdür: borç oranı üst sınırı × yatırım ve vade boyunca en düşük CFADS ÷ hedef DSCR'ı sağlayan tutar.</li>
          <li>Özsermaye nakit akışı = CFADS − borç servisi. Proje IRR'ı (vergi sonrası) borçsuz hesaplanır.</li>
          <li>Stres senaryosu: borç baz senaryoyla boyutlanır, gerçekleşen spot fiyat %${STRESS*100} düşer; PPA yıllarının fiyatı değişmez. ⚠, DSCR'ın 1'in altına indiği (nakdin taksiti karşılamadığı) yıl olduğunu gösterir. Stresin ilk yıllarda yarattığı vergi zararı sonraki yılların vergisini azalttığı için en düşük DSCR bazen baz senaryodan yüksek çıkabilir.</li>
        </ul>
        <p class="mut">Hariç: inşaat dönemi ve inşaat faizi, kredi komisyonları, borç servis rezervi, kur riski (her şey USD), enflasyon, temettü kısıtları. Faiz tabanı ve vergi oranları kaynaklıdır; kredi marjı, borç oranı, vade, DSCR hedefleri, amortisman süresi ve PPA koşulları doğrulanmamış varsayımlardır. Değerler bu tarayıcıda saklanır.</p>
      </details></details>`;
    // kaydırıcı yalnızca tabloyu yeniler (sürükleme kesilmez): iskonto oranına duyarlılık
    el.querySelector('input[type="range"]').oninput=e=>{setWacc(+e.target.value/100);renderFin();};
    // finansman varsayımları: geçerli sayı girilince tablo yenilenir (giriş kutuları yeniden çizilmez)
    el.querySelectorAll("input[data-pf]").forEach(inp=>inp.oninput=()=>{const v=+inp.value;if(inp.value!==""&&isFinite(v)&&v>=+inp.min&&v<=+inp.max){setPf(inp.dataset.pf,v);el.querySelector("#pfRows").innerHTML=pfRows();}});
    el.addEventListener("click",e=>{const b=e.target.closest("button[data-pre]");if(!b)return;if(prepay(+b.dataset.pre)){save();render();renderFin();}});
    el.querySelector(".pfreset").onclick=()=>{resetPf();el.querySelectorAll("input[data-pf]").forEach(i=>i.value=pf[i.dataset.pf]);el.querySelector("#pfRows").innerHTML=pfRows();};
  }
  el.querySelector("#finW").textContent="%"+nf(wacc*100,1);
  el.querySelector("#finRows").innerHTML=rows();
  el.querySelector("#pfRows").innerHTML=pfRows();
  el.querySelector("#loanRows").innerHTML=loanRows();
}
