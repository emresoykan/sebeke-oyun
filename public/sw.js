// --- Çevrimdışı önbellek (service worker): oyun ana ekrana eklendiğinde uygulama gibi hızlı açılsın, internet zayıfken de
// başlasın. Yalnızca derlenmiş sürümde kaydedilir (main.js). Kurallar:
//  sayfa (index.html): önce ağ (yeni sürüm hemen gelsin), ağ yoksa önbellekteki son sürüm
//  oyun dosyaları (assets/: içerik özetli adlar, değişmez): önce önbellek
//  diğer kendi dosyaları (ikon, veri, doku, Cesium): önbellekten hemen, arkada ağdan tazelenir (veri dosyaları bir
//  sonraki açılışta güncellenir)
//  Google yazı tipleri: aynı (tazelenen önbellek)
//  harita karoları, uydu görüntüsü, hava ve lig servisleri: önbelleğe alınmaz (her zaman ağ; telif ve boyut)
// Önbellek en çok MAX kayıt tutar; dolunca en eski kayıtlar silinir (eski sürümlerin dosyaları birikmesin).
const CACHE="wattlas-v1", MAX=600, FONTS=/^https:\/\/fonts\.(googleapis|gstatic)\.com\//;
const SCOPE=new URL(self.registration.scope).pathname;

self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(["./","./manifest.webmanifest","./icons/icon-192.png"])).catch(()=>{}));self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k!==CACHE)await caches.delete(k);await self.clients.claim();})());});

let puts=0;
async function put(req,res){
  try{
    if(!res||res.status!==200||(res.type!=="basic"&&res.type!=="cors"))return; // kısmi (206) ve opak yanıtlar saklanmaz
    const c=await caches.open(CACHE);await c.put(req,res);
    if(++puts%25===0){const ks=await c.keys();for(let i=0;i<ks.length-MAX;i++)await c.delete(ks[i]);}
  }catch(e){}
}
const fresh=req=>fetch(req).then(res=>{put(req,res.clone());return res;});
const cacheFirst=async req=>(await caches.match(req))||fresh(req);
// önbellekten hemen, ağdan arkada tazele (tazeleme olay bitene kadar sürer)
function swr(e){const net=fresh(e.request);e.waitUntil(net.catch(()=>{}));return caches.match(e.request).then(hit=>hit||net);}

self.addEventListener("fetch",e=>{
  const r=e.request;if(r.method!=="GET"||r.headers.has("range"))return;
  const u=new URL(r.url),own=u.origin===self.location.origin&&u.pathname.startsWith(SCOPE);
  if(r.mode==="navigate"&&own){
    e.respondWith(fresh(r).catch(async()=>(await caches.match(r))||(await caches.match(SCOPE))||(await caches.match("./"))||Response.error()));return;}
  if(own){e.respondWith(u.pathname.startsWith(SCOPE+"assets/")?cacheFirst(r):swr(e));return;}
  if(FONTS.test(r.url))e.respondWith(swr(e));
});
