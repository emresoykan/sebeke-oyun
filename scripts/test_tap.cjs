// Haritada dokunma/tıklama doğruluğu (düz harita, MapLibre): beş ekran boyutunda (390×844 ve 360×740 dokunmatik,
// 768×1024 tablet, 1024×700 ve 1366×768 fare) haritanın yedi noktasına dokunulur. Dokunmadan önce o pikselin coğrafi
// karşılığı alınır; seçilen nokta ile arasındaki fark aynı kamera durumunda piksel olarak ölçülür (seçimden sonra kart
// açılıp harita kayabildiği için). 3 pikselden büyük fark hata sayılır.
// Kullanım: npx vite --port 5182 &  sonra  node scripts/test_tap.cjs http://localhost:5182/sebeke-oyun/
const { chromium } = require("playwright");
const URL0=process.argv[2]||"http://localhost:5182/sebeke-oyun/";let bad=0;
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const [w,h,touch] of [[390,844,true],[360,740,true],[768,1024,true],[1024,700,false],[1366,768,false]]){
const p=await b.newPage({viewport:{width:w,height:h},hasTouch:touch,isMobile:touch});const errs=[];p.on('pageerror',e=>errs.push(String(e).slice(0,150)));
await p.route(/fonts\.g/,r=>r.abort());
await p.addInitScript(()=>{localStorage.clear();localStorage.setItem('sebeke-profile-v1',JSON.stringify({name:'G',company:'A',color:'#1F9D74',spec:'eng',created:1}));});
await p.goto(URL0);await p.waitForTimeout(4500);
await p.evaluate(async()=>{const st=await import('/src/state.js');st.S.mi=8;document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  window.__map.jumpTo({center:[33,38.8],zoom:6});});
await p.waitForTimeout(1500);
const box=await p.evaluate(()=>{const r=document.getElementById('map').getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height};});
const res=[];
for(const [fx,fy] of [[0.3,0.3],[0.7,0.35],[0.5,0.5],[0.25,0.6],[0.8,0.6],[0.15,0.15],[0.9,0.2]]){
  // mobilde alttaki kart haritayı örtebilir: noktanın üstünde kart varsa atla
  const x=Math.round(box.x+box.w*fx),y=Math.round(box.y+box.h*fy);
  // seçim kartı açıkken ilk dokunuş seçimi değiştirmez (koruma): önce kartı kapat
  await p.evaluate(async()=>{const s=await import('/src/ui/sheet.js');s.collapseSheet();const st=await import('/src/state.js');st.S.sel={id:null,lat:0,lon:0};});
  await p.waitForTimeout(500);
  const top=await p.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);return e&&e.closest('#map')?'map':(e&&(e.id||e.className))||'?';},[x,y]);
  if(top!=='map'){res.push({fx,fy,skip:String(top).slice(0,30)});continue;}
  const exp=await p.evaluate(([x,y])=>{const r=document.getElementById('map').getBoundingClientRect(),c=window.__map.unproject([x-r.left,y-r.top]);return [c.lng,c.lat];},[x,y]);
  if(touch)await p.touchscreen.tap(x,y);else await p.mouse.click(x,y);
  await p.waitForTimeout(700);
  const d=await p.evaluate(async(exp)=>{const st=await import('/src/state.js'),s=st.S.sel,a=window.__map.project([s.lon,s.lat]),e=window.__map.project(exp);
    return {lat:s.lat,lon:s.lon,id:s.id,dx:Math.round(a.x-e.x),dy:Math.round(a.y-e.y)};},exp);
  res.push({fx,fy,...d});if(Math.abs(d.dx)>3||Math.abs(d.dy)>3)bad++;}
console.log(`${w}×${h}${touch?' dokunmatik':' fare'}:`,res.map(r=>r.skip?`(${r.fx},${r.fy}) atlandı: ${r.skip}`:`(${r.fx},${r.fy}) fark ${r.dx},${r.dy} px${r.id?' saha':''}`).join(' | '),errs.length?errs:'');
await p.close();}
await b.close();console.log(bad?`${bad} dokunuşta fark 3 pikselden büyük`:"Tüm dokunuşlar doğru noktayı seçti");process.exit(bad?1:0);})();
