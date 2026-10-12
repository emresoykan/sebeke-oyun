// --- Yer arama: şehir, ülke, bölge, milli park veya "enlem, boylam" ---
// Çevrimdışı çalışır: oyunun kendi şehir (Natural Earth) ve ülke listesinde arar. Türkçe karakterler eşleştirmede
// yok sayılır ("elazig" → Elâzığ). Şehir seçilince harita oraya gider ve nokta seçilir (panelde kaynak puanları);
// ülke seçilince yalnızca harita gider.
import { cityList, countryList } from "../world.js";
import { REGIONS } from "../data/regions.js";
import { PROTECTED } from "../data/protected.js";

const fold=s=>s.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ı/g,"i");
let IDX=null;
function index(){
  if(IDX)return IDX;const cs=countryList(),nm=Object.fromEntries(cs.map(c=>[c.a3,c.n]));
  IDX=[...cs.map(c=>({n:c.n,sub:"Ülke",lat:c.lat,lon:c.lon,zoom:Math.max(2.5,Math.min(7,Math.log2(360/Math.max(c.span,1))+0.4)),sel:false,f:fold(c.n),o:0})),
    ...REGIONS.map(([n,lat,lon,zoom])=>({n,sub:"Bölge",lat,lon,zoom,sel:zoom>=9,f:fold(n),o:0})),
    ...PROTECTED.map(([n,lat,lon])=>({n,sub:"Milli park",lat,lon,zoom:8.5,sel:false,f:fold(n),o:0})),
    ...cityList().map((c,i)=>({n:c[0],sub:nm[c[1]]||c[1],lat:c[2],lon:c[3],zoom:8,sel:true,f:fold(c[0]),o:1+i}))];
  return IDX;
}
const COORD=/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;
export function searchPlaces(q,max=8){
  const m=q.match(COORD);
  if(m){const lat=+m[1],lon=+m[2];if(Math.abs(lat)<=85&&Math.abs(lon)<=180)return [{n:`${lat}, ${lon}`,sub:"Koordinat",lat,lon,zoom:9,sel:true}];}
  const f=fold(q.trim());if(f.length<2)return [];
  const out=[];
  // sıra: tam eşleşme, baştan eşleşme, kelime başı, içinde; eşitlikte ülkeler kısa addan uzuna, şehirler nüfusa göre
  for(const e of index()){const i=e.f.indexOf(f);if(i<0)continue;const sc=e.f===f?0:i===0?1:e.f[i-1]===" "||e.f[i-1]==="-"?2:3;out.push([sc,e.o?1000+e.o:e.f.length,e]);}
  return out.sort((a,b)=>a[0]-b[0]||a[1]-b[1]).slice(0,max).map(x=>x[2]);
}

export function initSearch(go){
  const btn=document.getElementById("searchBtn"),box=document.getElementById("mapSearch"),inp=document.getElementById("searchIn"),ul=document.getElementById("searchRes");
  if(!btn||!box)return;let res=[],act=-1;
  const open=v=>{box.hidden=!v;btn.setAttribute("aria-expanded",String(v));if(v){inp.focus();inp.select();}else{ul.innerHTML="";inp.value="";res=[];}};
  const draw=()=>{ul.innerHTML=res.map((r,i)=>`<li role="option" id="sr${i}" aria-selected="${i===act}"><button data-i="${i}"><b></b><small></small></button></li>`).join("");
    ul.querySelectorAll("li").forEach((li,i)=>{li.querySelector("b").textContent=res[i].n;li.querySelector("small").textContent=res[i].sub;li.querySelector("button").onclick=()=>pick(i);});
    inp.setAttribute("aria-activedescendant",act>=0?`sr${act}`:"");
    if(inp.value.trim().length>=2&&!res.length)ul.innerHTML=`<li class="none">Sonuç yok. Şehir, ülke, bölge ya da "38.5, 32.4" gibi koordinat yaz.</li>`;};
  const pick=i=>{const r=res[i];if(!r)return;open(false);go(r);};
  btn.onclick=()=>open(box.hidden);
  inp.oninput=()=>{res=searchPlaces(inp.value);act=res.length?0:-1;draw();};
  inp.onkeydown=e=>{
    if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();if(!res.length)return;act=(act+(e.key==="ArrowDown"?1:-1)+res.length)%res.length;draw();}
    else if(e.key==="Enter"){e.preventDefault();pick(act>=0?act:0);}
    else if(e.key==="Escape"){e.preventDefault();e.stopPropagation();open(false);btn.focus();}
  };
  document.addEventListener("keydown",e=>{if(e.key==="/"&&!e.target.closest("input,textarea,select,[contenteditable]")&&!document.querySelector("dialog[open]")){e.preventDefault();open(true);}});
}
