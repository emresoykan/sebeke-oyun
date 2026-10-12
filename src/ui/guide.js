// --- İlk oyun rehberi: üç kısa adım (yer seç, araziyi al, izin ve santral) ---
// Haritanın üstünde küçük bir kart olarak görünür; oyuncu adımı yaptıkça kendiliğinden ilerler ve
// izin başvurusu yapılınca (ya da santral kurulunca) kapanır. Arazi alımı geri alınırsa 2. adıma döner.
// Mobilde yalnızca başlık satırı görünür; "Ayrıntı" açıklamayı açar.
// S.tut: sıradaki adım (0-2), 3 = bitti/geçildi. Ayarlar'daki "Rehberi göster" baştan başlatır.
import { S, save } from "../state.js";

const STEPS=[
  {t:"Bir yer seç",d:"Haritaya dokun. Güneşli ovalar güneş (GES), rüzgârlı kıyılar ve tepeler rüzgâr (RES) santrali için iyidir. Sol üstteki katman düğmesi potansiyeli haritada gösterir."},
  {t:"Kaynaklara bak, araziyi al",d:"Panelde güneş ve rüzgâr puanlarına bak. Beğendiysen \"Araziyi satın al\"a bas. Yanlışlıkla aldıysan birkaç saniye içinde geri alabilirsin. Zaman ilk araziyi alınca işlemeye başlar."},
  {t:"İzin başvurusu yap",d:"Santral kurmadan önce izin gerekir. Saha panelinden başvur; inceleme birkaç gün sürer, üstteki hız düğmesiyle zamanı hızlandırabilirsin. İzin çıkınca santralini kur.",end:true}
];
let el=null,open=false;

function render(){
  if(!el)return;const i=S.tut;
  if(i==null||i>=STEPS.length){el.hidden=true;return;}
  const s=STEPS[i];el.hidden=false;el.classList.toggle("open",open);
  el.innerHTML=`<div class="grow"><span class="gstep">${i+1}/${STEPS.length}</span><b></b><button class="glink gmore" data-g="more" aria-expanded="${open}">${open?"Gizle":"Ayrıntı"}</button><button class="glink" data-g="skip" aria-label="Rehberi geç"><span class="glg">Rehberi geç</span><span class="gsm">Geç</span></button></div><p></p>${s.end?`<button class="pri gdone" data-g="done">Anladım</button>`:""}`;
  el.querySelector("b").textContent=s.t;el.querySelector("p").textContent=s.d;
  el.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>{if(b.dataset.g==="more"){open=!open;render();}else finish();});
  window.dispatchEvent(new CustomEvent("sebeke:guide"));
}
function finish(){S.tut=STEPS.length;save();render();}
// adım ancak sırası gelince ilerler (ör. araziyi almak 1. adımı da geçer)
function reach(i){if(S.tut==null||S.tut>=STEPS.length||S.tut>i)return;S.tut=i+1;save();render();}
const active=()=>S.tut!=null&&S.tut<STEPS.length;

export function initGuide(){
  if(!el){el=document.createElement("div");el.className="guide";el.setAttribute("role","status");el.hidden=true;document.getElementById("mapwrap").appendChild(el);
    window.addEventListener("sebeke:select",()=>reach(0));
    // arazi alındı: 3. adım; alım geri alındıysa (hiç saha kalmadı) 2. adıma dön
    window.addEventListener("sebeke:land",()=>{if(!active())return;
      if(Object.keys(S.sites).length)reach(1);else if(S.tut===2){S.tut=1;save();render();}});
    // izin başvurusu ya da santral: rehber tamam
    const done=()=>{if(active()&&Object.keys(S.sites).length)finish();};
    window.addEventListener("sebeke:permit",done);window.addEventListener("sebeke:build",done);}
  if(S.tut==null)S.tut=Object.keys(S.sites).length?STEPS.length:0;
  // 3. adımda kalmış kayıt: başvuru zaten yapılmışsa (ya da santral varsa) rehber kapanır
  if(S.tut===2&&(S.plants.length||Object.values(S.sites).some(o=>o.permit!=="none")))S.tut=STEPS.length;
  render();
}
// Ayarlar'dan: rehber baştan, adımlar açık (kendiliğinden kapanma yalnızca yeni bir başvuru/santralde)
export function restartGuide(){S.tut=0;open=true;save();initGuide();}
