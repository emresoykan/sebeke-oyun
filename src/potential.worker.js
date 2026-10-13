// --- Potansiyel haritası hesap işçisi ---
// Bir harita karosu (Web Mercator z/x/y) için (n+2)×(n+2) noktalık güneş ve rüzgâr puanı ızgarası hesaplar.
// Kenarda bir hücrelik pay bırakılır: karolar yumuşatılarak büyütülürken komşu karolarla birleşim yeri görünmesin.
// Puanlar world.js'teki potentialAt ile oyunun kendi kurallarından gelir (panelde gösterilenle aynı değer).
import { potentialAt } from "./world.js";
import { loadUrban } from "./urban.js";

const lat=(y,n)=>Math.atan(Math.sinh(Math.PI*(1-2*y/n)))*180/Math.PI;

// yerleşim alanları önce yüklenir (şehirler haritada boş kalır)
const ready=loadUrban();
onmessage=async e=>{await ready;
  const {key,z,x,y,n}=e.data,N=2**z,m=n+2,s=new Float32Array(m*m),w=new Float32Array(m*m);
  for(let j=0;j<m;j++){const la=lat(y+(j-0.5)/n,N);
    for(let i=0;i<m;i++){const lo=(x+(i-0.5)/n)/N*360-180,r=la>85||la<-85?null:potentialAt(la,lo),k=j*m+i;
      s[k]=r?r.s:-1;w[k]=r?r.w:-1;}}
  postMessage({key,s,w},[s.buffer,w.buffer]);
};
