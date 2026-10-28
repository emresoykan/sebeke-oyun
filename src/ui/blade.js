// --- Rüzgâr türbini kanadının planı: 3D model (sitemodel.js) ve haritadaki dönen pervane (rotors.js) ortak kullanır ---
// Türkiye'deki rüzgâr santrallerinin fotoğraflarına göre: kökte silindirik bağlantı, ~%20 açıklıkta en geniş (~3,8 m),
// firar kenarı kökte şişkin, hücum kenarı düz, uç sivri. Uçta havacılık ikaz işareti: %80–88 ve %94–uç kırmızı bantlar
// (arası beyaz). Ölçüler metre (y açıklık boyunca kökten uca, x kiriş); temsilîdir.
const ss=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
export const BLADE_LEN=61.3,BLADE_ROOT=1.6,BLADE_BANDS=[[49,54],[57.6,BLADE_LEN]];
// hücum (sol) ve firar (sağ) kenarlarının x konumu; uçta 0'a iner
export const bladeL=y=>y<4?-1.1:y<12?-1.1-.3*ss(4,12,y):-1.4+1.25*Math.min(1,(y-12)/49);
export const bladeR=y=>y<4?1.1:y<12?1.1+1.5*ss(4,12,y):.15+2.45*Math.pow(Math.max(0,1-(y-12)/49),1.6);
// [y0,y1] açıklık diliminin çokgeni ([[x,y],…]); dilim uca ulaşırsa sivri biter
export function bladePart(y0,y1,step=1.5){
  const tip=y1>=BLADE_LEN-.01,ye=tip?61:y1,n=Math.max(2,Math.ceil((ye-y0)/step)),pts=[];
  for(let i=0;i<=n;i++){const y=y0+(ye-y0)*i/n;pts.push([bladeL(y),y]);}
  if(tip)pts.push([0,BLADE_LEN]);
  for(let i=n;i>=0;i--){const y=y0+(ye-y0)*i/n;pts.push([bladeR(y),y]);}
  return pts;
}
