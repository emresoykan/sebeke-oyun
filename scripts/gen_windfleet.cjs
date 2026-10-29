// Piyasaların rüzgâr filosu noktalarını üretir (src/windfleet.js). Fiyattaki rüzgâr etkisi tek bir noktanın havasıyla değil,
// piyasanın rüzgâr santrallerinin bulunduğu bölgelerin güç eğrisi ortalamasıyla hesaplanır (sim.js newDay, wxsite.js fleetWind).
// Bölgeler ve ağırlıklar scripts/wind_fleet.cjs'teki kalibrasyon setlerinden (TR: EPDK il dağılımı, MWm; DE, ES, DEoff:
// yaklaşık) alınır; seçim kuralı da aynıdır: TR ilin en rüzgârlı, DE/ES bölgenin ortanca kurulabilir noktası, deniz üstünde
// sığ denizin ortanca noktası. Avrupa piyasası = Almanya (kara + deniz) ve İspanya, kendi ağırlıklarıyla.
// Kuzey Amerika: ABD'nin başlıca rüzgâr bölgeleri; ağırlıklar yaklaşık kurulu güç sırasına göre (GW, yuvarlak; yayımlanmış
// bir kaynakla doğrulanmadı).
// Kullanım: npx vite --port 5182 &  sonra  node scripts/gen_windfleet.cjs http://localhost:5182/sebeke-oyun/
const { chromium } = require("playwright");
const fs=require("fs"),path=require("path");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/";
const src=fs.readFileSync(path.join(__dirname,"wind_fleet.cjs"),"utf8");
const SETS=Function("return "+src.slice(src.indexOf("const SETS=")+11,src.indexOf("};\nconst [SET")+1))();
SETS.US={pick:"med",sea:false,r:3,IL:{"Texas Panhandle":[35.3,-101.8,20],"West Texas":[32.4,-100.6,20],"Iowa":[42.6,-94.4,13],"Oklahoma":[36.3,-98.8,12],
  "Kansas":[38.0,-99.4,9],"Illinois":[40.6,-88.9,8],"California":[35.1,-118.3,6],"Colorado":[40.4,-103.4,5],"Minnesota":[44.0,-96.0,4],"Wyoming":[41.9,-105.9,3]}};
const MK={T:["TR"],E:["DE","DEoff","ES"],N:["US"]};
(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.route(/fonts\.g/,r=>r.abort());
await p.goto(URL0);await p.waitForTimeout(3000);
const out=await p.evaluate(async([SETS,MK])=>{const wo=await import("/src/world.js"),ru=await import("/src/rules.js"),res={};
  for(const [mk,sets] of Object.entries(MK)){res[mk]=[];
    for(const sn of sets){const C=SETS[sn];
      for(const [n,[lat0,lon0,w]] of Object.entries(C.IL)){const pts=[];
        for(let i=-C.r;i<=C.r;i++)for(let j=-C.r;j<=C.r;j++){const t=wo.describe(lat0+i*0.1,lon0+j*0.1);if(!t)continue;
          if(C.sea?(t.sea&&t.shallow):(!t.sea&&ru.baseAllowed(t).includes("res")))pts.push(t);}
        if(!pts.length){res[mk].push({n,skip:true});continue;}pts.sort((a,b)=>a.wind-b.wind);
        const t=C.pick==="max"?pts[pts.length-1]:pts[Math.floor(pts.length/2)];res[mk].push({n,set:sn,lat:t.lat,lon:t.lon,w,mreg:t.mreg});}}}
  return res;},[SETS,MK]);
await b.close();
let js=`// --- Rüzgâr filosu noktaları: fiyattaki rüzgâr etkisi bu noktaların güç eğrisi ortalamasıyla hesaplanır ---
// Üreten: scripts/gen_windfleet.cjs (bölgeler ve ağırlıklar scripts/wind_fleet.cjs; ayrıntı docs/kalibrasyon.md).
// [enlem, boylam, ağırlık]. T: EPDK işletmedeki RES il dağılımı (MWm). E: Almanya kara ve deniz üstü, İspanya (ağırlıklar
// yaklaşık, GW). N: ABD'nin başlıca rüzgâr bölgeleri (ağırlıklar yaklaşık, doğrulanmadı). Diğer piyasalar tek noktayla kalır.
export const WFLEET={\n`;
for(const [mk,a] of Object.entries(out)){js+=`  ${mk}:[${a.filter(x=>!x.skip).map(x=>`[${x.lat},${x.lon},${x.w}]`).join(",")}],\n`;
  a.forEach(x=>console.log(mk,x.skip?"ATLANDI":"",x.n,x.set||"",x.lat||"",x.lon||"",x.w||"",x.mreg||""));}
js+="};\n";
fs.writeFileSync(path.join(__dirname,"..","src","windfleet.js"),js);console.log("src/windfleet.js yazıldı");
})();
