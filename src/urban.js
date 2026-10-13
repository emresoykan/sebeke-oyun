// --- Yerleşim alanları: şehir ve kasabaların yapılaşmış bölgeleri (Natural Earth 1:10m Urban Areas) ---
// public/data/urban.bin (scripts/build_urban.py) açılışta arka planda bir kez yüklenir (~950 KB, önbelleğe alınır).
// Bu alanlarda arazi satın alınamaz ve santral kurulamaz. Yüklenene kadar urbanAt() null döner (bilinmiyor).
// Hem ana sayfa hem potansiyel haritası işçisi kullanır.
let polys=null, index=null, loading=null;
const CELL=1; // 1° hücreli konum dizini

function parse(buf){
  const dv=new DataView(buf);if(String.fromCharCode(dv.getUint8(0),dv.getUint8(1),dv.getUint8(2),dv.getUint8(3))!=="URB1")throw new Error("urban.bin biçimi tanınmadı");
  const n=dv.getUint32(4,true),out=new Array(n);let o=8;
  for(let p=0;p<n;p++){
    const nr=dv.getUint16(o,true);o+=2;const rings=[];let x0=180,y0=90,x1=-180,y1=-90;
    for(let r=0;r<nr;r++){
      const np=dv.getUint16(o,true);let x=dv.getInt32(o+2,true),y=dv.getInt32(o+6,true);o+=10;
      const a=new Float32Array(np*2);a[0]=x/1e4;a[1]=y/1e4;
      for(let i=1;i<np;i++){x+=dv.getInt16(o,true);y+=dv.getInt16(o+2,true);o+=4;a[i*2]=x/1e4;a[i*2+1]=y/1e4;}
      if(r===0)for(let i=0;i<np;i++){const X=a[i*2],Y=a[i*2+1];if(X<x0)x0=X;if(X>x1)x1=X;if(Y<y0)y0=Y;if(Y>y1)y1=Y;}
      rings.push(a);
    }
    out[p]={bb:[x0,y0,x1,y1],rings};
  }
  return out;
}
function build(ps){
  const m=new Map();
  ps.forEach((p,i)=>{const [x0,y0,x1,y1]=p.bb;
    for(let gx=Math.floor(x0/CELL);gx<=Math.floor(x1/CELL);gx++)for(let gy=Math.floor(y0/CELL);gy<=Math.floor(y1/CELL);gy++){
      const k=gx*1000+gy;let l=m.get(k);if(!l)m.set(k,l=[]);l.push(i);}});
  return m;
}
function inRing(a,x,y){let ins=false;for(let i=0,j=a.length-2;i<a.length;j=i,i+=2){const xi=a[i],yi=a[i+1],xj=a[j],yj=a[j+1];
  if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)ins=!ins;}return ins;}

export function loadUrban(){
  if(!loading)loading=fetch(`${import.meta.env.BASE_URL}data/urban.bin`).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.arrayBuffer();})
    .then(b=>{polys=parse(b);index=build(polys);return true;})
    .catch(e=>{console.warn("Yerleşim alanları yüklenemedi:",e);loading=null;return false;});
  return loading;
}
export const urbanReady=()=>!!polys;
// true: yerleşim alanında, false: değil, null: veri henüz yüklenmedi
export function urbanAt(lat,lon){
  if(!polys)return null;
  const l=index.get(Math.floor(lon/CELL)*1000+Math.floor(lat/CELL));if(!l)return false;
  for(const i of l){const p=polys[i],b=p.bb;if(lon<b[0]||lon>b[2]||lat<b[1]||lat>b[3])continue;
    if(inRing(p.rings[0],lon,lat)&&!p.rings.slice(1).some(h=>inRing(h,lon,lat)))return true;}
  return false;
}
