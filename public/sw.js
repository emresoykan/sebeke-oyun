// --- Çevrimdışı önbellek (service worker): oyun ana ekrana eklendiğinde uygulama gibi hızlı açılsın, internet zayıfken de
// başlasın. Yalnızca derlenmiş sürümde kaydedilir (main.js). Kurallar:
//  sayfa (index.html): önce ağ (yeni sürüm hemen gelsin), ağ yoksa önbellekteki son sürüm
//  oyun dosyaları (assets/: içerik özetli adlar, değişmez): önce önbellek
//  diğer kendi dosyaları (ikon, veri, doku, Cesium): önbellekten hemen, arkada ağdan tazelenir (veri dosyaları bir
//  sonraki açılışta güncellenir)
//  Google yazı tipleri: aynı (tazelenen önbellek)
//  düz haritanın karoları (OpenFreeMap vektör, AWS Terrain Tiles yükseklik): oyuncunun gördüğü karolar ayrı bir
//  önbellekte saklanır ve önce oradan verilir; aynı yere dönünce ve sonraki açılışlarda beklemeden gelir. İkisi de
//  değişmez: OpenFreeMap karo adresi veri sürümünü içerir (sürüm değişince yeni adresler istenir, eskileri sırası gelince
//  silinir), yükseklik verisi 2017'den beri aynı. Önceden toplu indirme yok, yalnızca görülen karolar. Karo listesi
//  (TileJSON, en güncel sürümü gösterir) önce ağdan, çevrimdışıysa önbellekten.
//  uydu görüntüsü, Apple haritası, hava ve lig servisleri: önbelleğe alınmaz (her zaman ağ; telif ve boyut)
// Önbellek en çok MAX kayıt tutar; dolunca en eski kayıtlar silinir (eski sürümlerin dosyaları birikmesin). Karo
// önbelleği ayrı sınırlı (MAX_TILES; karo başına ~50–110 KB, ~100 MB, tahmin).
const CACHE="wattlas-v1", MAX=600, FONTS=/^https:\/\/fonts\.(googleapis|gstatic)\.com\//;
const TILES="wattlas-tiles-v1", MAX_TILES=1200;
const TILE=/^https:\/\/(tiles\.openfreemap\.org\/planet\/[^/]+\/\d+\/\d+\/\d+\.pbf|s3\.amazonaws\.com\/elevation-tiles-prod\/terrarium\/\d+\/\d+\/\d+\.png)$/;
const TILEJSON="https://tiles.openfreemap.org/planet";
const SCOPE=new URL(self.registration.scope).pathname;

self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(["./","./manifest.webmanifest","./icons/icon-192.png"])).catch(()=>{}));self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE&&k!==TILES)await caches.delete(k);await self.clients.claim();})());});

const puts={};
async function put(req,res,name=CACHE,max=MAX){
  try{
    if(!res||res.status!==200||(res.type!=="basic"&&res.type!=="cors"))return; // kısmi (206) ve opak yanıtlar saklanmaz
    const c=await caches.open(name);await c.put(req,res);
    puts[name]=(puts[name]||0)+1;if(puts[name]%25===0){const ks=await c.keys();for(let i=0;i<ks.length-max;i++)await c.delete(ks[i]);}
  }catch(e){} // depolama dolu (QuotaExceededError): karo yine ağdan verilir
}
const fresh=req=>fetch(req).then(res=>{put(req,res.clone());return res;});
const cacheFirst=async req=>(await caches.match(req))||fresh(req);
// harita karosu: önce karo önbelleği; yoksa ağdan, yanıt saklanır
async function tile(req){
  try{const hit=await (await caches.open(TILES)).match(req);if(hit)return hit;}catch(e){}
  const res=await fetch(req);put(req,res.clone(),TILES,MAX_TILES);return res;
}
// önbellekten hemen, ağdan arkada tazele (tazeleme olay bitene kadar sürer)
function swr(e){const net=fresh(e.request);e.waitUntil(net.catch(()=>{}));return caches.match(e.request).then(hit=>hit||net);}

self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET"||r.headers.has("range"))return;
  const u=new URL(r.url),own=u.origin===self.location.origin&&u.pathname.startsWith(SCOPE);
  if(r.mode==="navigate"&&own){
    e.respondWith(fresh(r).catch(async()=>(await caches.match(r))||(await caches.match(SCOPE))||(await caches.match("./"))||Response.error()));return;}
  if(own){e.respondWith(u.pathname.startsWith(SCOPE+"assets/")?cacheFirst(r):swr(e));return;}
  if(FONTS.test(r.url)){e.respondWith(swr(e));return;}
  if(TILE.test(r.url)){e.respondWith(tile(r));return;}
  if(r.url===TILEJSON)e.respondWith(fresh(r).catch(async()=>(await caches.match(r))||Response.error()));
});
