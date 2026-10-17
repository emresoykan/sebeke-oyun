// --- Rapor sekmesi: proje ekonomisi (gerçek dünya karşılığı) ---
// Her santral kaydı için kapasite faktörü, ortalama satış fiyatı, yatırım, LCOE, NPV, IRR ve geri ödeme; iskonto oranı
// kaydırıcıyla değiştirilebilir (duyarlılık). Varsayımlar, formüller ve kısaltmalar açılır bölümde.
import { S } from "../state.js";
import { TECH } from "../config.js";
import { placeName } from "../world.js";
import { eqName, tierOf } from "../equipment.js";
import { FIN, DEGR, MIN_H, SHORT_DAYS, wacc, setWacc, plantFinance } from "../finance.js";

const nf=(v,d=1)=>v.toLocaleString("tr-TR",{minimumFractionDigits:d,maximumFractionDigits:d});
const M$=v=>`${v<0?"−":""}${nf(Math.abs(v)/1e6,2)} M$`;
const pct=v=>v==null?"—":"%"+nf(v*100,1);

function rows(){
  const ps=S.plants.slice().sort((a,b)=>a.t.localeCompare(b.t)||a.k.localeCompare(b.k));
  if(!ps.length)return `<tr><td colspan="9" style="text-align:left;color:var(--muted)">Henüz santral yok.</td></tr>`;
  return ps.map(p=>{
    const o=S.sites[p.t],f=plantFinance(p),name=`${o?placeName(o):p.t}<br><small class="mut">${TECH[p.k].n} ${p.mw} MW • ${eqName(p.k,tierOf(p))}</small>`;
    if(f.wait)return `<tr><td>${name}</td><td colspan="8" style="text-align:left;color:var(--muted)">Veri toplanıyor: ${Math.floor(f.h/24)}/${MIN_H/24} gün</td></tr>`;
    const batt=p.k==="batt",short=f.days<SHORT_DAYS;
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

function assumptions(){
  const tr=Object.entries(FIN).map(([k,f])=>`<tr><td>${TECH[k].n}</td><td>${f.capex.toLocaleString("tr-TR")}</td><td>${f.opex}</td><td>${f.life}</td><td style="text-align:left">${f.src}</td></tr>`).join("");
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
  <p class="mut">Hariç: vergi, enflasyon (fiyat ve giderler sabit), kredi ve finansman maliyeti, arazi ve şebeke bağlantısı, hurda değeri, dengesizlik maliyeti. * işaretli satırlarda veri ${SHORT_DAYS} günden kısa: oyundaki mevsim yıllık ortalamayı temsil etmeyebilir (ör. ilkbaharda ölçülen GES yıllık değeri olduğundan yüksek gösterebilir). Satış fiyatları oyunun piyasa modelinden gelir, gerçek piyasa fiyatı değildir.</p>
  <p><b>Kısaltmalar</b></p>
  <ul>
    <li><b>CF</b> (Capacity Factor): kapasite faktörü.</li>
    <li><b>LCOE</b> (Levelized Cost of Energy): seviyelendirilmiş enerji maliyeti; ömür boyu her MWh'nin ortalama maliyeti.</li>
    <li><b>NPV</b> (Net Present Value): net bugünkü değer; pozitifse proje istenen getiriden fazlasını kazandırır.</li>
    <li><b>IRR</b> (Internal Rate of Return): iç verim oranı; projenin yıllık getirisi.</li>
    <li><b>WACC</b> (Weighted Average Cost of Capital): ağırlıklı ortalama sermaye maliyeti; burada iskonto oranı.</li>
  </ul></details>`;
}

export function renderFin(){
  const el=document.getElementById("fin");if(!el)return;
  if(!el.dataset.init){el.dataset.init="1";
    el.innerHTML=`<label class="finw">İskonto oranı (WACC): <b id="finW"></b><input type="range" min="4" max="16" step="0.5" value="${wacc*100}" aria-label="İskonto oranı (WACC), yüzde"></label>
      <div style="overflow-x:auto"><table class="fint"><thead><tr><th>Santral</th><th>CF</th><th>Ort. satış fiyatı</th><th>Yatırım</th><th>LCOE</th><th>NPV</th><th>IRR</th><th>Geri ödeme</th><th>Veri</th></tr></thead><tbody id="finRows"></tbody></table></div>
      ${assumptions()}`;
    // kaydırıcı yalnızca tabloyu yeniler (sürükleme kesilmez): iskonto oranına duyarlılık
    el.querySelector('input[type="range"]').oninput=e=>{setWacc(+e.target.value/100);renderFin();};
  }
  el.querySelector("#finW").textContent="%"+nf(wacc*100,1);
  el.querySelector("#finRows").innerHTML=rows();
}
