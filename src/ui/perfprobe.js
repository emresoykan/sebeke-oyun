// --- Başarım ölçümü (?perf=1): haritada takılmanın nedenini kullanıcının cihazında bulmak için ---
// Köşede küçük bir kutu: son 5 sn'deki kare hızı ve en uzun kare aralığı (rAF; her tarayıcıda), uzun görevler ve —
// Chrome'da — Long Animation Frames API'nin verdiği betik kaynakları (hangi dosyanın hangi işlevi ne kadar sürdü).
// En uzun 10 donma saklanır; "Kopyala" düğmesi raporu panoya alır (sohbete yapıştırmak için). Oyunu etkilemez.
// Apple haritasında ayrıca: Apple karolarının sayısı ve süresi (Resource Timing; istek tamamlanınca kaydedilir, karolar
// MapKit'in işçisinden isteniyorsa görünmez), betik ve oturum açma süresi, bizim karo katmanlarımızın kaç kez yenilendiği.
// Boş ızgaranın nedenini ayırmak için: karolar geç isteniyorsa ya da ana iş parçacığı meşgulse sorun bizde, istekler
// erken gidip yanıtlar geç geliyorsa Apple tarafında (ağ, sunucu).
// Düz haritada (MapLibre) ayrıca: kaynağa göre karo yükleme süresi (isteğin başlamasından karonun hazır olmasına: ağ ve
// çözümleme; bellekteki önbellekten gelen karolar sayılmaz) ve hareket bittikten sonra görünümdeki vektör ve yükseklik
// karolarının yüklenmesine kadar geçen süre (oyuncunun gördüğü bekleme; bu sırada ayrıntı bulanık ya da eksiktir).
const FM={src:{},waits:[],moves:0,nw:0};
const FM_NAMES={omt:"vektör",dem:"yükseklik"};
export function probeFlatMap(map){
  window.__perfFlat=FM;window.__perfMap=map; // ölçüm betikleri için (yalnızca ?perf=1)
  const st=new WeakMap();
  map.on("sourcedataloading",e=>{if(e.tile&&FM_NAMES[e.sourceId])st.set(e.tile,performance.now());});
  map.on("sourcedata",e=>{const t=e.tile&&st.get(e.tile);if(t==null)return;st.delete(e.tile);
    const s=FM.src[e.sourceId]||(FM.src[e.sourceId]={n:0,d:[]});s.n++;s.d.push(performance.now()-t);if(s.d.length>300)s.d.shift();});
  let seq=0;map.on("movestart",()=>seq++);
  map.on("moveend",()=>{const my=seq,t0=performance.now();FM.moves++;
    const poll=()=>{if(seq!==my)return;const d=performance.now()-t0;
      if(Object.keys(FM_NAMES).every(id=>!map.getSource(id)||map.isSourceLoaded(id))){FM.nw++;FM.waits.push(Math.round(d));if(FM.waits.length>30)FM.waits.shift();return;}
      if(d<60000)requestAnimationFrame(poll);};
    requestAnimationFrame(poll);});
}
const pct=(a,q)=>{if(!a.length)return 0;const s=a.slice().sort((x,y)=>x-y);return Math.round(s[Math.min(s.length-1,Math.floor(q*s.length))]);};
function flatLine(){
  if(!FM.moves&&!Object.keys(FM.src).length)return "";
  const w=FM.waits,src=Object.entries(FM.src).map(([k,s])=>`${FM_NAMES[k]} ${s.n} karo, ortanca ${pct(s.d,0.5)} ms, %90 ${pct(s.d,0.9)} ms`);
  return `\nhareket sonrası bekleme (son ${w.length}): `+(w.length?`ortanca ${pct(w,0.5)} ms, en uzun ${Math.max(...w)} ms, anında (<100 ms) ${w.filter(x=>x<100).length}`:"henüz yok")+
    (src.length?`\nkaro yükleme: ${src.join(" • ")}`:"");
}
export function initPerfProbe(){
  window.__wp={};
  const box=document.createElement("div");
  Object.assign(box.style,{position:"fixed",left:"8px",bottom:"8px",zIndex:99999,background:"rgba(10,15,25,.92)",color:"#E5ECF0",
    font:"11px/1.35 ui-monospace,monospace",padding:"6px 8px",borderRadius:"8px",maxWidth:"min(460px,94vw)",whiteSpace:"pre-wrap",pointerEvents:"auto"});
  const txt=document.createElement("div"),btn=document.createElement("button");btn.textContent="Kopyala";
  Object.assign(btn.style,{marginTop:"4px",font:"inherit",padding:"2px 8px",borderRadius:"6px",border:"1px solid #5B6B77",background:"#18242D",color:"inherit"});
  box.append(txt,btn);document.body.appendChild(box);
  const frames=[],worst=[],t0=performance.now();let last=performance.now(),lt=0,ltMax=0;
  const keep=e=>{worst.push(e);worst.sort((a,b)=>b.ms-a.ms);worst.length=Math.min(worst.length,10);};
  (function raf(){const n=performance.now(),d=n-last;last=n;frames.push([n,d]);while(frames.length&&n-frames[0][0]>5000)frames.shift();
    if(d>250)keep({ms:Math.round(d),at:Math.round((n-t0)/1000),what:"kare aralığı (ana iş parçacığı meşgul ya da sekme arka planda)"});requestAnimationFrame(raf);})();
  try{new PerformanceObserver(l=>l.getEntries().forEach(e=>{lt++;ltMax=Math.max(ltMax,e.duration);})).observe({type:"longtask"});}catch(e){}
  const ap={n:0,first:0,firstReq:0,dur:[],max:0,js:0,boot:0,ends:[]};
  try{new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(!/apple-mapkit\.com/.test(e.name))return;const d=e.duration;
      if(/\/mapkit\.js/.test(e.name)){ap.js=d;return;}if(/bootstrap/.test(e.name)){ap.boot=d;return;}if(!/tile/.test(e.name))return;
      ap.n++;if(!ap.first||e.responseEnd<ap.first)ap.first=e.responseEnd;if(!ap.firstReq||e.startTime<ap.firstReq)ap.firstReq=e.startTime;
      ap.dur.push(d);if(ap.dur.length>300)ap.dur.shift();ap.max=Math.max(ap.max,d);ap.ends.push(e.responseEnd);})).observe({type:"resource",buffered:true});}catch(e){}
  const sec=ms=>(ms/1000).toFixed(1).replace(".",",");
  const apple=()=>{
    const n=performance.now();while(ap.ends.length&&n-ap.ends[0]>5000)ap.ends.shift();
    const RL="Apple yenileme: ",rl=Object.entries(window.__wp).filter(([k])=>k.startsWith(RL)).map(([k,e])=>`${k.slice(RL.length)} ${e.n}`);
    if(!ap.n&&!ap.js&&!rl.length)return "";
    const d=ap.dur.slice().sort((a,b)=>a-b),med=d.length?Math.round(d[d.length>>1]):0;
    return `\nApple karoları: ${ap.n} (son 5 sn ${ap.ends.length})`+(ap.n?` • süre ortanca ${med} ms, en uzun ${Math.round(ap.max)} ms • ilk istek ${sec(ap.firstReq)}. sn, ilk karo ${sec(ap.first)}. sn`:" • karo isteği görünmüyor")+
      (ap.js||ap.boot?` • betik ${Math.round(ap.js)} ms, oturum ${Math.round(ap.boot)} ms`:"")+
      (rl.length?`\nkatman yenilemeleri: ${rl.join(", ")}`:"");};
  let loaf=false;
  try{new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(e.duration<200)return;
      const s=(e.scripts||[]).slice().sort((a,b)=>b.duration-a.duration).slice(0,3).map(x=>`${Math.round(x.duration)}ms ${x.sourceFunctionName||x.invoker||"?"} @${(x.sourceURL||"").split("/").pop().split("?")[0]}`);
      keep({ms:Math.round(e.duration),at:Math.round((e.startTime-0)/1000),what:"uzun kare: "+(s.join(" | ")||"betik yok (çizim/düzen)")});})).observe({type:"long-animation-frame",buffered:true});loaf=true;}catch(e){}
  const report=()=>{const f=frames.length,gap=Math.round(Math.max(0,...frames.map(x=>x[1])));
    return `Wattlas perf • ${navigator.userAgent.match(/(iPhone|iPad|Mac|Windows|Android|Linux)/)?.[0]||""} • ${Math.round((performance.now()-t0)/1000)} sn\n`+
      `kare: ${Math.round(f/5)}/sn, en uzun aralık ${gap} ms • uzun görev ${lt} (en uzun ${Math.round(ltMax)} ms)${loaf?"":" • betik kaynağı bu tarayıcıda yok"}\n`+
      (worst.length?"en uzun donmalar:\n"+worst.map(w=>`  ${w.ms} ms (${w.at}. sn) ${w.what}`).join("\n"):"donma yok")+
      apple()+flatLine()+"\noyun işlevleri (toplam / en uzun / sayı):\n"+Object.entries(window.__wp).filter(([k])=>!k.startsWith("Apple yenileme: ")).sort((a,b)=>b[1].t-a[1].t).slice(0,8).map(([k,e])=>`  ${Math.round(e.t)} ms / ${Math.round(e.max)} ms / ${e.n} ${k}`).join("\n");};
  // metne dokununca tek satıra küçülür / açılır (telefonda kutu düğmelerin üstünü kapatmasın)
  let mini=matchMedia("(max-width:599px)").matches;txt.onclick=()=>{mini=!mini;txt.textContent=mini?report().split("\n").slice(0,2).join("\n"):report();};
  setInterval(()=>{const r=report();txt.textContent=mini?r.split("\n").slice(0,2).join("\n"):r;},1000);
  btn.onclick=async()=>{try{await navigator.clipboard.writeText(report());btn.textContent="Kopyalandı";}catch(e){btn.textContent="Kopyalanamadı: metni seçip kopyala";}setTimeout(()=>btn.textContent="Kopyala",2000);};
}
