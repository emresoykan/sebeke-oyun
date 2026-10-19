// --- Güneş / rüzgâr potansiyel haritası ---
// Haritanın üstüne yarı saydam bir katman: her noktanın oyundaki güneş veya rüzgâr puanı (panelde ●●●○○ olarak
// görünen değer) tek renkli bir yoğunluk ölçeğiyle boyanır; koyu/saydam düşük, parlak/opak yüksek puandır.
// Puanlar ayrı bir işçide (potential.worker.js) karo karo hesaplanır ve önbelleğe alınır; iki harita da
// (MapLibre özel protokolle, Apple TileOverlay ile) aynı karo görüntülerini kullanır.
import { expectedCF, windClass } from "../weather.js";
const KEY="sebeke-pot", N=24, MAXZ=13;
// tek renk tonu, beş kademe (paneldeki nokta sayısı): saydamlık arttıkça koyu harita üstünde ton parlaklaşır
// rüzgâr için açık camgöbeği: lacivert deniz ve uydu görüntüsü üstünde mavi kaybolur
const HUE={s:[242,180,44],w:[110,226,255]}, ALPHA=[0,0.08,0.2,0.36,0.54,0.72];
const NAME={s:"Güneş",w:"Rüzgâr"};

let mode=(()=>{try{const v=localStorage.getItem(KEY);return v==="s"||v==="w"?v:"off";}catch(e){return "off";}})();
const grids=new Map(), waiting=new Map(), urls=new Map(), listeners=new Set(), tileListeners=new Set();
let worker=null, busy=false, broken=false;
const stack=[];

export const potMode=()=>mode;
// hesap kuyruğunda bekleyen karo sayısı (Apple katmanı yenilemeyi buna göre seyreltir)
export const potPending=()=>stack.length+(busy?1:0);
export function onPotChange(f){listeners.add(f);}
export function onPotTile(f){tileListeners.add(f);}

function startWorker(){
  if(worker||broken)return;
  try{worker=new Worker(new URL("../potential.worker.js",import.meta.url),{type:"module"});}
  catch(e){broken=true;console.warn("Potansiyel haritası işçisi başlatılamadı:",e);return;}
  worker.onmessage=e=>{const {key,s,w}=e.data;grids.set(key,{s,w});busy=false;
    const r=waiting.get(key);waiting.delete(key);if(r)r.forEach(f=>f());tileListeners.forEach(f=>f(key));next();
    if(grids.size>600){const k=grids.keys().next().value;grids.delete(k);}};
  // işçi çalışamazsa bekleyen istekler boş karoyla sonuçlanır (harita takılmaz)
  worker.onerror=e=>{broken=true;busy=false;console.warn("Potansiyel haritası işçisi hata verdi:",e.message);waiting.forEach(l=>l.forEach(f=>f()));waiting.clear();};
}
// en son istenen karo önce: ekranda görünen karolar, kaydırılıp geçilenlerden önce hesaplanır
function next(){
  if(busy||!worker)return;let j;
  while((j=stack.pop())&&grids.has(j.key)){}
  if(!j)return;busy=true;worker.postMessage({...j,n:N});
}
// karo ızgarası: hazırsa döner; değilse ister ve hazır olunca cb çağrılır
function grid(z,x,y,cb){
  const key=`${z}/${x}/${y}`,g=grids.get(key);if(g)return g;
  startWorker();if(broken)return null;
  if(cb){const l=waiting.get(key)||[];l.push(cb);waiting.set(key,l);}
  if(!stack.some(j=>j.key===key))stack.push({key,z,x,y});
  if(stack.length>80)stack.splice(0,stack.length-80);
  next();return null;
}

// 256 piksellik karo: (N+2)² ızgara renklenir, kenar payı kırpılarak yumuşatmayla büyütülür
function paint(g,kind){
  const m=N+2,src=document.createElement("canvas");src.width=src.height=m;const sg=src.getContext("2d"),im=sg.createImageData(m,m),px=im.data,v=g[kind],[r,gr,b]=HUE[kind];
  // rüzgâr kademesi paneldeki gibi beklenen kapasite faktörü sınıfıdır (weather.js windClass); güneşte puan × 5
  const lv=kind==='w'?x=>windClass(expectedCF(4+8.5*x)):x=>Math.round(x*5);
  for(let k=0;k<m*m;k++){const a=v[k]<0?0:ALPHA[Math.max(1,Math.min(5,lv(v[k])))];px[k*4]=r;px[k*4+1]=gr;px[k*4+2]=b;px[k*4+3]=Math.round(a*255);}
  sg.putImageData(im,0,0);
  const c=document.createElement("canvas");c.width=c.height=256;const cg=c.getContext("2d");cg.imageSmoothingEnabled=true;cg.imageSmoothingQuality="high";
  cg.drawImage(src,1,1,N,N,0,0,256,256);src.width=src.height=0;return c;
}
// büyük yakınlıkta üst karonun bir parçası büyütülür (hesap yükü sabit kalır)
function norm(z,x,y){const n=2**z;if(y<0||y>=n)return null;x=((x%n)+n)%n;if(z<=MAXZ)return {z,x,y,sub:null};
  const d=z-MAXZ,k=2**d;return {z:MAXZ,x:x>>d,y:y>>d,sub:{k,i:x%k,j:y%k}};}
function crop(c,sub){if(!sub)return c;const o=document.createElement("canvas");o.width=o.height=256;const og=o.getContext("2d");og.imageSmoothingEnabled=true;
  const s=256/sub.k;og.drawImage(c,sub.i*s,sub.j*s,s,s,0,0,256,256);return o;}

// MapLibre: özel protokol için PNG verisi (hazır olana kadar bekler)
export async function tilePNG(kind,z,x,y){
  const t=norm(z,x,y);if(!t)return null;
  let g=grid(t.z,t.x,t.y);
  if(!g){await new Promise(res=>{const gg=grid(t.z,t.x,t.y,res);if(gg||broken)res();});g=grids.get(`${t.z}/${t.x}/${t.y}`);}
  if(!g)return null;
  const c=crop(paint(g,kind),t.sub);const blob=await new Promise(r=>c.toBlob(r,"image/png"));return blob?blob.arrayBuffer():null;
}
// Apple: eşzamanlı istenir; hazır değilse null döner, hazır olunca onPotTile dinleyicisi katmanı yeniler
export function tileURL(z,x,y){
  if(mode==="off")return null;const t=norm(z,x,y);if(!t)return null;
  const key=`${mode}/${z}/${x}/${y}`;let u=urls.get(key);if(u)return u;
  const g=grid(t.z,t.x,t.y,()=>{});if(!g)return null;
  const p=paint(g,mode),c=crop(p,t.sub);u=c.toDataURL();p.width=p.height=0;c.width=c.height=0; // tuvaller hemen bırakılır (iOS)
  if(urls.size>500)urls.clear();urls.set(key,u);return u;
}

// --- Düğme ve lejant ---
const ICON={off:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3 2 8l10 5 10-5-10-5zm-7.6 8.2L2 12.4 12 17.4l10-5-2.4-1.2L12 15 4.4 11.2zm0 4.4L2 16.8l10 5 10-5-2.4-1.2L12 19.4l-7.6-3.8z" fill="currentColor"/></svg>',
  s:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="currentColor"/><g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></g></svg>',
  w:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 9h11a3 3 0 1 0-3-3"/><path d="M3 13h15a3 3 0 1 1-3 3"/><path d="M3 17h7"/></g></svg>'};
function legend(){
  const el=document.getElementById("potLegend");if(!el)return;el.hidden=mode==="off";if(mode==="off")return;
  const [r,g,b]=HUE[mode];
  el.innerHTML=`<b>${NAME[mode]} potansiyeli</b><div class="pl-scale">${[1,2,3,4,5].map(n=>`<span><i style="background:rgba(${r},${g},${b},${ALPHA[n]+0.12})"></i>${"●".repeat(n)}</span>`).join("")}</div>
    <small>${mode==="w"?"Rüzgâr: beklenen kapasite faktörü sınıfı (panelde ●●●○○ ≈ Türkiye filo ortalaması %33), NASA POWER yıllık ortalamalarından, TEİAŞ ve ENTSO-E 2025 ile kalibre":"Güneş: kaynak puanı (panelde ●●●○○), NASA POWER yıllık ortalamalarından"} (~50 km çözünürlük). Boş alanlarda kurulum yapılamaz. Tam değer için haritaya dokun.</small>`;
}
function label(btn){
  btn.innerHTML=ICON[mode];btn.setAttribute("aria-pressed",String(mode!=="off"));
  btn.setAttribute("aria-label",mode==="off"?"Potansiyel haritası: kapalı (güneşi göster)":mode==="s"?"Potansiyel haritası: güneş (rüzgârı göster)":"Potansiyel haritası: rüzgâr (kapat)");
  btn.title=mode==="off"?"Güneş / rüzgâr potansiyeli":`${NAME[mode]} potansiyeli`;
}
export function setPotMode(m){
  mode=m;try{localStorage.setItem(KEY,m);}catch(e){}
  if(m!=="off")startWorker();
  const btn=document.getElementById("potBtn");if(btn)label(btn);legend();listeners.forEach(f=>f(m));
}
export function initPotButton(){
  const btn=document.getElementById("potBtn");if(!btn)return;label(btn);legend();
  btn.onclick=()=>setPotMode(mode==="off"?"s":mode==="s"?"w":"off");
}
