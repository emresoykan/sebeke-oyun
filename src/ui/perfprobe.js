// --- Başarım ölçümü (?perf=1): haritada takılmanın nedenini kullanıcının cihazında bulmak için ---
// Köşede küçük bir kutu: son 5 sn'deki kare hızı ve en uzun kare aralığı (rAF; her tarayıcıda), uzun görevler ve —
// Chrome'da — Long Animation Frames API'nin verdiği betik kaynakları (hangi dosyanın hangi işlevi ne kadar sürdü).
// En uzun 10 donma saklanır; "Kopyala" düğmesi raporu panoya alır (sohbete yapıştırmak için). Oyunu etkilemez.
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
  let loaf=false;
  try{new PerformanceObserver(l=>l.getEntries().forEach(e=>{if(e.duration<200)return;
      const s=(e.scripts||[]).slice().sort((a,b)=>b.duration-a.duration).slice(0,3).map(x=>`${Math.round(x.duration)}ms ${x.sourceFunctionName||x.invoker||"?"} @${(x.sourceURL||"").split("/").pop().split("?")[0]}`);
      keep({ms:Math.round(e.duration),at:Math.round((e.startTime-0)/1000),what:"uzun kare: "+(s.join(" | ")||"betik yok (çizim/düzen)")});})).observe({type:"long-animation-frame",buffered:true});loaf=true;}catch(e){}
  const report=()=>{const f=frames.length,gap=Math.round(Math.max(0,...frames.map(x=>x[1])));
    return `Wattlas perf • ${navigator.userAgent.match(/(iPhone|iPad|Mac|Windows|Android|Linux)/)?.[0]||""} • ${Math.round((performance.now()-t0)/1000)} sn\n`+
      `kare: ${Math.round(f/5)}/sn, en uzun aralık ${gap} ms • uzun görev ${lt} (en uzun ${Math.round(ltMax)} ms)${loaf?"":" • betik kaynağı bu tarayıcıda yok"}\n`+
      (worst.length?"en uzun donmalar:\n"+worst.map(w=>`  ${w.ms} ms (${w.at}. sn) ${w.what}`).join("\n"):"donma yok")+
      "\noyun işlevleri (toplam / en uzun / sayı):\n"+Object.entries(window.__wp).sort((a,b)=>b[1].t-a[1].t).slice(0,8).map(([k,e])=>`  ${Math.round(e.t)} ms / ${Math.round(e.max)} ms / ${e.n} ${k}`).join("\n");};
  // metne dokununca tek satıra küçülür / açılır (telefonda kutu düğmelerin üstünü kapatmasın)
  let mini=matchMedia("(max-width:599px)").matches;txt.onclick=()=>{mini=!mini;txt.textContent=mini?report().split("\n").slice(0,2).join("\n"):report();};
  setInterval(()=>{const r=report();txt.textContent=mini?r.split("\n").slice(0,2).join("\n"):r;},1000);
  btn.onclick=async()=>{try{await navigator.clipboard.writeText(report());btn.textContent="Kopyalandı";}catch(e){btn.textContent="Kopyalanamadı: metni seçip kopyala";}setTimeout(()=>btn.textContent="Kopyala",2000);};
}
