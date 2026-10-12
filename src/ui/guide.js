// --- İlk oyun rehberi: üç kısa adım (yer seç, araziyi al, izin ve santral) ---
// Haritanın üstünde küçük bir kart olarak görünür; oyuncu adımı yaptıkça kendiliğinden ilerler.
// S.tut: sıradaki adım (0-2), 3 = bitti/geçildi. Ayarlar'daki "Rehberi göster" baştan başlatır.
import { S, save } from "../state.js";

const STEPS=[
  {t:"Bir yer seç",d:"Haritaya dokun. Güneşli ovalar güneş (GES), rüzgârlı kıyılar ve tepeler rüzgâr (RES) santrali için iyidir."},
  {t:"Kaynaklara bak, araziyi al",d:"Panelde güneş ve rüzgâr puanlarına bak. Beğendiysen \"Araziyi satın al\"a bas. Yanlışlıkla aldıysan birkaç saniye içinde geri alabilirsin."},
  {t:"İzin al, santral kur",d:"Zaman şimdi işlemeye başladı. İzin başvurusu yap; inceleme birkaç gün sürer, üstteki hız düğmesiyle hızlandırabilirsin. İzin çıkınca santralini kur.",end:true}
];
let el=null;

function render(){
  if(!el)return;const i=S.tut;
  if(i==null||i>=STEPS.length){el.hidden=true;return;}
  const s=STEPS[i];el.hidden=false;
  el.innerHTML=`<div class="gtop"><span>Rehber ${i+1}/${STEPS.length}</span><button class="gskip" data-g="skip">Rehberi geç</button></div><b></b><p></p>${s.end?`<button class="pri" data-g="done">Başla</button>`:""}`;
  el.querySelector("b").textContent=s.t;el.querySelector("p").textContent=s.d;
  el.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>finish());
}
function finish(){S.tut=STEPS.length;save();render();}
// adım ancak sırası gelince ilerler (ör. araziyi almak 1. adımı da geçer)
function reach(i){if(S.tut==null||S.tut>=STEPS.length||S.tut>i)return;S.tut=i+1;save();render();}

export function initGuide(){
  if(!el){el=document.createElement("div");el.className="guide";el.setAttribute("role","status");el.hidden=true;document.getElementById("mapwrap").appendChild(el);
    window.addEventListener("sebeke:select",()=>reach(0));
    window.addEventListener("sebeke:land",()=>{if(Object.keys(S.sites).length)reach(1);});}
  if(S.tut==null)S.tut=Object.keys(S.sites).length?STEPS.length:0;
  render();
}
export function restartGuide(){S.tut=Object.keys(S.sites).length?2:0;save();initGuide();}
