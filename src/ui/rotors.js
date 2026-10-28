// --- Dönen pervaneler: pervanesiz çizilen tesis görüntüsünün (siteimage.js bare) üstünde, türbin göbeklerinde ---
// Apple haritasındaki tesis görüntüsü ve hafif yakın görünüm (closeview.js) ortak kullanır. Rotor diski CSS matrisiyle
// görüntünün eğik bakışına izdüşürülür; dönüş Web Animations ile (kompozitörde, yeniden çizimsiz) yapılır. Kule ve gövdenin
// gölgesi görüntüdedir; pervanenin gölgesi ayrı bir yarı saydam pervanedir (göbeğin gölgesinde, güneş yönüne göre zemine
// izdüşmüş) ve pervaneyle aynı açıdan, aynı hızla döner. Gölgeler pervanelerin altında kalır. Hareket azaltılmışsa döndürülmez.
const reduced=matchMedia("(prefers-reduced-motion: reduce)");
const BLADES='<svg viewBox="-100 -100 200 200" aria-hidden="true"><g class="bl">'+[0,120,240].map(a=>`<path transform="rotate(${a})" d="M-4,-4 C-9,-30 -7,-70 -1.5,-98 L1.5,-98 C5,-60 7,-28 4,-4 Z"/>`).join("")+'<circle r="6"/></g></svg>';

// box: görüntüyle aynı boyutta konumlanan kap; hubs: siteimage.js göbek listesi. Dönüş: hız ayarı için liste
export function addRotors(box,hubs){
  const spin=[],hs=hubs||[],deg=hs.map(()=>Math.round(Math.random()*120)),t0=hs.map(()=>Math.random()*5000);
  const add=(h,i,x,y,m,cls)=>{const w=document.createElement("div");w.className=cls;box.appendChild(w);
    Object.assign(w.style,{left:x*100+"%",top:y*100+"%",width:h.r*200+"%",transform:`translate(-50%,-50%) matrix(${m.join(",")},0,0)`});
    w.innerHTML=BLADES;const g=w.firstChild;g.style.transform=`rotate(${deg[i]}deg)`;
    const a=reduced.matches||!g.animate?null:g.animate([{transform:"rotate(0deg)"},{transform:"rotate(360deg)"}],{duration:5000,iterations:Infinity});
    if(a){a.currentTime=t0[i];a.playbackRate=0;}return a;};
  // önce gölgeler (hepsi pervanelerin altında), sonra pervaneler; aynı başlangıç açısı ve zamanı
  const sh=hs.map((h,i)=>h.sm?add(h,i,h.sx,h.sy,h.sm,"mk-rotor mk-rotsh"):null);
  hs.forEach((h,i)=>spin.push({a:add(h,i,h.x,h.y,h.m,"mk-rotor"),s:sh[i],k:h.k}));
  return spin;
}
// Hız: 5 sn'de bir tur = 12 dev/dk. Kapasitenin %3'ünden az üretimde (rüzgâr yok, fırtınada kesme, arıza) durur,
// üretim arttıkça 6'dan 14 dev/dk'ya çıkar (büyük türbinlerin olağan çalışma aralığı). st: plantStatus(id)
export function spinRotors(spin,st){
  for(const x of spin||[]){if(!x.a)continue;const s=st[x.k],f=s&&!s.down&&!s.cut?s.f:0,rate=f>=0.03?(6+8*f)/12:0;
    if(Math.abs((x.rate??-1)-rate)<0.01)continue;x.rate=rate;
    // gölge pervanenin zamanına eşitlenir: hız değişimleri iki animasyonda ayrı ayrı kayma biriktirmesin
    for(const a of [x.a,x.s]){if(!a)continue;if(a===x.s)a.currentTime=x.a.currentTime;if(a.updatePlaybackRate)a.updatePlaybackRate(rate);else a.playbackRate=rate;}}
}
