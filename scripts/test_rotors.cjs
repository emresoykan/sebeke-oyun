// Düz haritada (MapLibre) RES pervaneleri: tesis görüntüsü pervanesiz çizilir, pervaneler üstünde dönen bir HTML katmanıdır
// (rotors.js). Sınanan: yakında her türbin için pervane ve gölgesi, dönüş hızının üretime bağlı olması, kutunun görüntünün
// köşelerine oturması, uzaklaşınca ve ekran dışında gizlenmesi, satılan sahanın pervanelerinin kalkması.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_rotors.cjs http://localhost:5182/sebeke-oyun/
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/";let fails=0;
const ok=(c,m)=>{console.log((c?"  ✓ ":"  ✗ ")+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const p=await b.newPage({viewport:{width:900,height:700}});const errs=[];p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"T",company:"D",color:"#1F9D74",spec:"eng",created:1}));});
await p.route(/fonts\.g/,r=>r.abort());
await p.goto(URL0);await p.waitForTimeout(6000);
// Vite'ın ?t= sürümlü modül adresleri: uygulamanın kullandığı örnekler
const u=await p.evaluate(()=>performance.getEntriesByType("resource").map(e=>e.name).filter(n=>/\/src\/(state|world|actions|plantstatus|ui\/map)\.js/.test(n)));
const r=await p.evaluate(async(u)=>{const imp=n=>import(u.find(x=>x.includes("/src/"+n))||("/src/"+n));
  document.querySelectorAll("dialog[open]").forEach(d=>d.close());
  const st=await imp("state.js"),w=await imp("world.js"),ac=await imp("actions.js"),mp=await imp("ui/map.js"),ps=await imp("plantstatus.js"),S=st.S;
  S.money=1e10;S.won=true;S.win1=1;Object.assign(S.ob,{g:1,pick:1,tech:1,prod:1,sale:1,card:1,rep:1,desk:1});
  const id="R1";S.sites[id]={...w.describe(40.1,26.4),permit:"ok"};for(let i=0;i<3;i++)ac.build(id,"res","std");
  const m=window.__map;m.setMaxZoom(16); // test ortamında yükseklik karoları yüklenmez, harita 8'de sınırlanır
  mp.drawMap();m.jumpTo({center:[S.sites[id].lon,S.sites[id].lat],zoom:13.5});
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  for(let i=0;i<40&&!document.querySelector(".fac-rots .mk-rot");i++)await wait(500);
  const out={};
  const rots=[...document.querySelectorAll(".fac-rots .mk-rotor:not(.mk-rotsh)")];
  out.n=rots.length;out.sh=document.querySelectorAll(".fac-rots .mk-rotsh").length;
  const res=ps.plantStatus(id).res,f=res&&!res.down&&!res.cut?res.f:0;out.f=f;
  out.rates=rots.map(e=>{const a=e.querySelector("svg").getAnimations()[0];return a?a.playbackRate:null;});
  out.want=f>=0.03?(6+8*f)/12:0;
  // kutu görüntünün köşelerinde mi (MapLibre görüntü kaynağının koordinatları)
  const box=document.querySelector(".fac-rots .mk-rot").getBoundingClientRect(),cv=m.getCanvas().getBoundingClientRect();
  const q=m.getSource("fac-"+id).coordinates,a=m.project(q[0]),c=m.project(q[2]);
  out.dx=Math.max(Math.abs(box.left-cv.left-a.x),Math.abs(box.top-cv.top-a.y),Math.abs(box.right-cv.left-c.x),Math.abs(box.bottom-cv.top-c.y));
  // kaydırınca kutu birlikte gider
  m.panBy([120,-80],{duration:0});await wait(100);const box2=document.querySelector(".fac-rots .mk-rot").getBoundingClientRect();
  out.pan=[Math.round(box2.left-box.left),Math.round(box2.top-box.top)];
  // ekran dışı: gizli
  m.jumpTo({center:[S.sites[id].lon+0.5,S.sites[id].lat]});await wait(100);out.off=document.querySelector(".fac-rots .mk-rot").style.display;
  // uzakta: katman gizli
  m.jumpTo({center:[S.sites[id].lon,S.sites[id].lat],zoom:9});await wait(100);out.far=getComputedStyle(document.querySelector(".fac-rots")).display;
  // saha kalkınca (satış) pervaneler de kalkar
  m.jumpTo({zoom:13.5});delete S.sites[id];S.plants=S.plants.filter(q=>q.t!==id);mp.drawMap();await wait(1500);
  out.gone=document.querySelectorAll(".fac-rots .mk-rot").length;out.layer=!!m.getLayer("fac-"+id);
  return out;},u);
ok(r.n===3&&r.sh===3,`3 türbin: ${r.n} pervane, ${r.sh} gölge`);
ok(r.rates.length===3&&r.rates.every(x=>x!=null&&Math.abs(x-r.want)<0.01),`dönüş hızı üretime göre (f ${r.f.toFixed(2)}): ${r.rates.map(x=>x==null?"–":x.toFixed(2)).join(", ")} (beklenen ${r.want.toFixed(2)})`);
ok(r.dx<1.5,`kutu görüntünün köşelerinde (en büyük sapma ${r.dx.toFixed(2)} px)`);
ok(r.pan[0]===-120&&r.pan[1]===80,`kaydırınca harita içeriğiyle birlikte gider (${r.pan.join(", ")})`);
ok(r.off==="none","ekran dışındaki saha gizli");
ok(r.far==="none","uzaklaşınca pervane katmanı gizli");
ok(r.gone===0&&!r.layer,"saha kalkınca pervaneler ve görüntü kalkar");
ok(!errs.length,"sayfa hatası yok"+(errs.length?": "+errs.join(" | "):""));
await b.close();console.log(fails?`\n${fails} başarısız`:"\nhepsi geçti");process.exit(fails?1:0);})();
