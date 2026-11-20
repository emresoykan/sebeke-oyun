// --- Saha işareti simgeleri: teknolojiye göre glif (RES türbin, GES güneş, HES damla …) ---
// Uzaktan bakınca sahanın ne olduğu rengiyle birlikte biçiminden de anlaşılsın diye. Düz harita (MapLibre) glifi tuvale
// çizip harita görüntüsü olarak ekler; Apple haritası ve lejant aynı yolları satır içi SVG olarak kullanır.
// Yollar 24×24 kutuda; {d, f:1} dolu, {d, s:kalınlık} yuvarlak uçlu çizgi.
const T=(cx,cy,a)=>(x,y)=>{const c=Math.cos(a),s=Math.sin(a);return `${(cx+x*c-y*s).toFixed(2)} ${(cy+x*s+y*c).toFixed(2)}`;};
// pervane kanadı: göbekten yukarı (a=0), süpürülmüş ince profil (ön kenar kavisli, uç bir yana kayık). Rotor 15° döndürülür:
// kanat kuleyle aynı hizaya gelince simge yukarı ok gibi, geniş simetrik kanatla uçak gibi görünüyordu. Zemin çizgisi de
// küçük boyda direk olduğunu belli eder
const blade=(cx,cy,a,L)=>{const p=T(cx,cy,a);return `M${p(-1.1,0)}C${p(-1.6,-0.45*L)} ${p(-0.6,-0.85*L)} ${p(0.9,-L)}C${p(1.2,-0.6*L)} ${p(1.4,-0.3*L)} ${p(1.1,0)}Z`;};
const ROT=15*Math.PI/180;
const turbine=(hy,L,base)=>[{d:`M11.35 ${hy+1.4}h1.3l.75 ${base-hy-1.4}h-2.8Z`,f:1},
  ...[0,2,4].map(i=>({d:blade(12,hy,ROT+i*Math.PI/3,L),f:1})),{d:`M10.2 ${hy}a1.8 1.8 0 1 0 3.6 0a1.8 1.8 0 1 0-3.6 0Z`,f:1}];
const rays=(cx,cy,r0,r1)=>Array.from({length:8},(_,i)=>{const a=i*Math.PI/4,c=Math.cos(a),s=Math.sin(a);
  return `M${(cx+r0*c).toFixed(2)} ${(cy+r0*s).toFixed(2)}L${(cx+r1*c).toFixed(2)} ${(cy+r1*s).toFixed(2)}`;}).join("");
const sun=(cx,cy,r)=>[{d:`M${cx-r} ${cy}a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 ${-2*r} 0Z`,f:1},{d:rays(cx,cy,r+2,r+4.6),s:2}];
const WAVE={d:"M2.5 21.2q2.4-2.3 4.8 0t4.8 0t4.8 0t4.8 0",s:1.7};
export const GLYPHS={
  wind:[...turbine(8.8,8.4,21.4),{d:"M7.5 22h9",s:1.6}],
  windsea:[...turbine(8.2,7.6,18.8),WAVE],
  sun:sun(12,12,4.2),
  sunsea:[...sun(12,9.6,3.4),WAVE],
  // kule ve tepesinde parlayan alıcı (aynaların odakladığı güneş)
  csp:[{d:"M11 10.6h2l.9 11.4h-3.8Z",f:1},...sun(12,6.6,2.4).map(o=>o.s?{d:rays(12,6.6,3.9,5.9),s:1.6}:o),{d:"M3 22h18",s:1.6}],
  drop:[{d:"M12 2.5C12 2.5 5.2 10.2 5.2 14.6A6.8 6.8 0 0 0 18.8 14.6C18.8 10.2 12 2.5 12 2.5Z",f:1}],
  pump:[{d:"M9 4C9 4 3.6 10.2 3.6 13.9A5.4 5.4 0 0 0 14.4 13.9C14.4 10.2 9 4 9 4Z",f:1},{d:"M18.8 5.5V18.5M16.3 8L18.8 5.5L21.3 8M16.3 16L18.8 18.5L21.3 16",s:1.8}],
  batt:[{d:"M4.6 7.4h12.6a1.6 1.6 0 0 1 1.6 1.6v6a1.6 1.6 0 0 1-1.6 1.6H4.6a1.6 1.6 0 0 1-1.6-1.6V9a1.6 1.6 0 0 1 1.6-1.6Z",s:1.8},
    {d:"M19.9 10h1.8v4h-1.8Z",f:1},{d:"M5.6 9.9h7.4v4.2H5.6Z",f:1}],
  steam:[{d:"M3 19.6h18v2.2H3Z",f:1},{d:"M7 16.6c-1.7-2 1.7-3.3 0-5.3s1.7-3.3 0-5.3M12 16.6c-1.7-2 1.7-3.3 0-5.3s1.7-3.3 0-5.3s1.7-2.4 0-3.6M17 16.6c-1.7-2 1.7-3.3 0-5.3s1.7-3.3 0-5.3",s:1.8}],
  leaf:[{d:"M20 3.6C10.6 3.6 4.6 9 5.5 17.8C14.8 18.8 20 12.6 20 3.6Z",f:1},{d:"M3.4 20.6L12.6 11.4",s:1.9}],
  wave:[{d:"M2.5 9q2.4-2.6 4.8 0t4.8 0t4.8 0t4.8 0M2.5 15.4q2.4-2.6 4.8 0t4.8 0t4.8 0t4.8 0",s:2.1}],
  h2:[{d:"M4.6 5.6v12.8M12.8 5.6v12.8M4.6 12h8.2",s:2.3},{d:"M15.7 14.3c0-1.4 1-2.2 2.2-2.2s2.2.8 2.2 2c0 1-.6 1.7-1.5 2.4l-2.9 2.3h4.6",s:1.6}],
  // santrali olmayan saha: arazi alınmış, işaret kazığı
  flag:[{d:"M8 21V3.6",s:1.9},{d:"M8.9 4L19.2 7.7L8.9 11.4Z",f:1}]
};
const OF={res:"wind",off:"windsea",flo:"windsea",ges:"sun",fpv:"sunsea",spv:"sunsea",csp:"csp",hes:"drop",phs:"pump",batt:"batt",jes:"steam",bes:"leaf",mar:"wave",h2:"h2"};
export const glyphOf=k=>OF[k]||"flag";

// Zemin rengine göre glif mürekkebi: koyu (#0B1626) ya da beyaz; hangisi daha kontrastlıysa (WCAG göreli parlaklık)
const lum=hex=>{const m=/^#?([0-9a-f]{6})$/i.exec(hex||"");if(!m)return 0;const n=parseInt(m[1],16);
  return [n>>16,(n>>8)&255,n&255].map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4;}).reduce((a,v,i)=>a+v*[0.2126,0.7152,0.0722][i],0);};
export const DARK="#0B1626",IDLE="#66727C"; // güç kutusunun yazısı; o saatte üretim yoksa soluk (beyaz zeminde ~4,8:1)
export const inkOn=hex=>{const L=lum(hex);return (L+0.05)/(lum(DARK)+0.05)>=1.05/(L+0.05)?"d":"w";};
export const INK={d:DARK,w:"#FFFFFF"};

// Tuvale çiz (düz harita görüntüsü): px kenarlı kare, renk c
export function glyphCanvas(name,px,c){
  const cv=document.createElement("canvas");cv.width=cv.height=px;const x=cv.getContext("2d"),k=px/24;
  x.scale(k,k);x.fillStyle=x.strokeStyle=c;x.lineCap=x.lineJoin="round";
  for(const o of GLYPHS[name]||[]){const p=new Path2D(o.d);if(o.f)x.fill(p);else{x.lineWidth=o.s;x.stroke(p);}}
  return x.getImageData(0,0,px,px);
}
// Satır içi SVG (Apple haritası, lejant): rengi currentColor
export function glyphSVG(name,cls="mk-gl"){
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${(GLYPHS[name]||[]).map(o=>o.f
    ?`<path d="${o.d}" fill="currentColor"/>`:`<path d="${o.d}" fill="none" stroke="currentColor" stroke-width="${o.s}" stroke-linecap="round" stroke-linejoin="round"/>`).join("")}</svg>`;
}
