// --- Hafif yakın görünüm: ekran kartı kullanmayan (yazılımla çizen) tarayıcıda "3D yakından bak" yerine ---
// Cesium yazılımla çizimde saniyede ~1,5 kare çizer ve her karede arayüzü 1 sn'den fazla dondurur (ölçüm: SwiftShader,
// 1366×768, 20 MW saha: 12 sn'de 18 uzun görev, en uzunu 1,2 sn). Bu görünüm sahanın three.js ile bir kez çizilen
// kuşbakışı görüntüsünü (siteimage.js, haritadakiyle aynı) büyük gösterir; pervaneler rüzgâr üretimine göre döner
// (rotors.js), canlı üretim, batarya ve santral durumu yazar, gece görüntü kararır. Sahanın havası (yağmur, kar, fırtınada
// şimşek), mevsime göre zemin rengi ve karla örtülü saha CSS katmanıyla gösterilir (wxfx.js; yalnızca transform ve
// opacity canlandırılır, ana iş parçacığını yormaz). "Tam 3D" düğmesi Cesium'u yine açar.
import { S } from "../state.js";
import { TECH } from "../config.js";
import { placeName } from "../world.js";
import { shape } from "../utils.js";
import { plantStatus, statusText } from "../plantstatus.js";
import { wxLabel } from "../weather.js";
import { liveText, battHtml } from "./sitelive.js";
import { addRotors, spinRotors } from "./rotors.js";
import { fxOf } from "./wxfx.js";

let el=null,cur=null,spin=[],nat=null,onFull=null,ro=null;

function build(box){
  el=document.createElement("div");el.className="cv";el.hidden=true;
  el.innerHTML=`<div class="cvstage"><div class="cvpic"><img alt=""><div class="mk-rot"></div></div><div class="cvfx" aria-hidden="true"><i class="cvp"></i><i class="cvflash"></i></div><div class="cvload">Saha görüntüsü hazırlanıyor…</div></div>
    <div class="cvinfo"><b class="cvt"></b><div class="cvlive" aria-live="polite"></div><div class="cvst"></div>
    <p class="cvnote">Bu tarayıcı ekran kartını kullanmıyor (yazılımla çizim). Tam 3D görünüm bu cihazda arayüzü saniyelerce dondurur; burada sahanın hafif görünümü var.</p>
    <button type="button" class="cvfull">Tam 3D görünümü yine de aç</button></div>`;
  box.appendChild(el);
  el.querySelector(".cvfull").onclick=()=>{const f=onFull,id=cur;close();if(f)f(id);};
  ro=new ResizeObserver(fit);ro.observe(el.querySelector(".cvstage"));
}
// görüntü sahneye sığdırılır (en-boy oranı korunur; pervaneler yüzdeyle konumlandığı için birlikte ölçeklenir)
function fit(){
  if(!el||!nat)return;const sg=el.querySelector(".cvstage"),cs=getComputedStyle(sg),
    w=sg.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight),h=sg.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom),
    k=Math.max(0.05,Math.min(w/nat[0],h/nat[1]));
  Object.assign(el.querySelector(".cvpic").style,{width:Math.floor(nat[0]*k)+"px",height:Math.floor(nat[1]*k)+"px"});
}

export const closeOpen=()=>!!cur;
// id: saha; full(id): Cesium görünümünü açar
export async function openClose(box,id,full){
  if(!el)build(box);cur=id;onFull=full;nat=null;el.hidden=false;
  const pic=el.querySelector(".cvpic"),img=pic.querySelector("img"),rot=pic.querySelector(".mk-rot");
  pic.style.visibility="hidden";el.querySelector(".cvload").hidden=false;rot.innerHTML="";spin=[];update();
  const F=await import("./siteimage.js"),im=await F.siteImage(id,true);
  if(cur!==id)return;el.querySelector(".cvload").hidden=true;
  if(!im){el.querySelector(".cvload").hidden=false;el.querySelector(".cvload").textContent="Bu sahada henüz santral yok.";return;}
  img.src=im.lods[0].url;await img.decode().catch(()=>{});if(cur!==id)return;
  nat=[img.naturalWidth||1,img.naturalHeight||1];fit();spin=addRotors(rot,im.hubs);pic.style.visibility="";update();
}
// her oyun saatinde (map.js drawMap): canlı üretim, batarya, durum, pervane hızı ve gece karartması
export function update(){
  if(!el||!cur)return;const o=S.sites[cur];if(!o){close();return;}
  const ps=S.plants.filter(p=>p.t===cur),st=plantStatus(cur),night=shape(Math.min(S.hour,23))===0;
  const kinds=[...new Set(ps.map(p=>p.k))].map(k=>`${TECH[k].n} ${ps.filter(p=>p.k===k).reduce((a,p)=>a+p.mw,0)} MW`).join(" + ");
  el.querySelector(".cvt").textContent=`${placeName(o)}${kinds?" • "+kinds:""}`;
  const w=st.wx?wxLabel(st.wx,night):null,lv=liveText(cur);
  el.querySelector(".cvlive").innerHTML=`${w?`<span>${w.i} ${w.t} • rüzgâr ${st.wx.hub.toFixed(0)} m/s • ${String(S.hour%24).padStart(2,"0")}:00</span>`:""}${lv?`<span>${lv}</span>`:""}${battHtml(st.batt)}`;
  el.querySelector(".cvst").textContent=statusText(plantStatus(cur));
  el.querySelector(".cvpic").classList.toggle("night",night);
  // hava ve mevsim: yalnızca değişince öznitelik yazılır (stil yeniden hesabı saatte bir)
  const fx=fxOf(o,st.wx||undefined);
  if(fx.kind)el.dataset.wx=fx.kind;else delete el.dataset.wx;
  el.dataset.season=fx.season;el.classList.toggle("snowy",fx.snowy);el.style.setProperty("--fxo",fx.amt.toFixed(2));
  spinRotors(spin,st);
}
export function close(){if(!el)return;el.hidden=true;cur=null;spin=[];el.querySelector(".mk-rot").innerHTML="";}
