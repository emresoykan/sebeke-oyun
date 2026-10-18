// Oyunun rüzgâr filosu kapasite faktörünü ölçer (rüzgâr kalibrasyonu, docs/kalibrasyon.md). Her bölge için çevresindeki
// (±0,3°, denizde ±0,1°) kurulabilir noktalardan biri seçilir, oyunun saatlik havasıyla N gün boyunca güç eğrisinden
// kapasite faktörü hesaplanır ve bölgenin kurulu gücüyle ağırlıklanır; ~%3,5 arıza payı düşülür.
//  TR: EPDK işletmedeki RES il dağılımı (ilk 25 il, MWm); ilin en rüzgârlı noktası (santraller sırtlara kurulur)
//  DE, ES: eyalet/bölge ağırlıkları yaklaşık (yayımlanmış bir kaynakla doğrulanmadı), noktaların ortancası
//  DEoff: Alman deniz üstü kümeleri, ağırlıklar yaklaşık
// Kullanım: önce `npx vite --port 5181`, sonra  node scripts/wind_fleet.cjs TR 365   (DE, ES, DEoff)
// Hava modeli her koşuda başka tohumla başlar; tek yıl ±%10 sapabilir, birkaç koşunun ortalamasını alın.
const { chromium } = require("playwright");
const SETS={
  TR:{pick:"max",sea:false,r:3,IL:{"İzmir":[38.45,27.2,1887],"Balıkesir":[39.65,27.9,1740],"Çanakkale":[40.1,26.4,1487],"İstanbul":[41.15,28.6,1004],"Manisa":[38.8,27.6,854],"Kırklareli":[41.7,27.3,678],"Bursa":[40.2,29.0,650],"Aydın":[37.85,27.85,580],"Hatay":[36.4,36.2,467],"Kayseri":[38.7,35.5,417],"Afyonkarahisar":[38.75,30.55,403],"Konya":[37.9,32.5,358],"Sivas":[39.75,37.0,329],"Muğla":[37.2,28.35,315],"Yalova":[40.6,29.2,308],"Mersin":[36.8,34.6,266],"Sakarya":[40.75,30.4,258],"Osmaniye":[37.1,36.25,256],"Edirne":[41.7,26.55,243],"Bilecik":[40.15,30.0,241],"Karaman":[37.2,33.2,241],"Tekirdağ":[40.98,27.5,232],"Kırşehir":[39.15,34.15,174],"Tokat":[40.3,36.55,166],"Uşak":[38.7,29.4,165]}},
  DE:{pick:"med",sea:false,r:3,IL:{"Niedersachsen":[52.8,8.5,12],"Brandenburg":[52.3,13.5,8.5],"Schleswig-Holstein":[54.3,9.5,8],"NRW":[51.6,8.0,7.5],"Sachsen-Anhalt":[51.9,11.7,5.5],"Rheinland-Pfalz":[49.9,7.4,4],"Bayern":[49.0,11.5,2.6],"Baden-Württemberg":[48.5,9.5,1.8]}},
  ES:{pick:"med",sea:false,r:3,IL:{"Castilla y León":[41.8,-4.5,6.5],"Aragón":[41.6,-1.0,5.5],"Castilla-La Mancha":[39.6,-2.5,4],"Galicia":[43.0,-8.0,3.9],"Andalucía Cádiz":[36.3,-5.7,2],"Andalucía Granada":[37.2,-3.2,1.7],"Cataluña":[41.2,0.6,1.5],"Navarra":[42.6,-1.7,1.3],"Valencia":[39.7,-0.9,1.3],"Asturias":[43.3,-6.3,0.6],"La Rioja":[42.3,-2.5,0.45]}},
  DEoff:{pick:"med",sea:true,r:1,IL:{"BorWin":[54.2,6.5,3],"Bard":[54.35,5.95,2],"Helgoland":[54.2,7.6,2.5],"Arkona":[54.8,14.1,1.2],"Baltic":[54.6,12.65,0.5]}}
};
const [SET,DAYS,URL]=[process.argv[2]||"TR",+process.argv[3]||365,process.argv[4]||"http://localhost:5181/"];
(async()=>{
  const b=await chromium.launch({args:["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});const p=await b.newPage();
  await p.addInitScript(()=>{localStorage.clear();localStorage.setItem("sebeke-profile-v1",JSON.stringify({name:"Sim",company:"Sim",color:"#1F9D74",spec:"eng",created:1}));});
  await p.goto(URL);await p.waitForTimeout(5000);
  const r=await p.evaluate(async([C,DAYS])=>{
    const st=await import("/src/state.js"),sim=await import("/src/sim.js"),wx=await import("/src/wxsite.js"),W=await import("/src/weather.js"),wo=await import("/src/world.js"),ru=await import("/src/rules.js"),cal=await import("/src/calendar.js");
    const S=st.S;S.money=1e12;S.won=true;document.querySelectorAll("dialog[open]").forEach(d=>d.close());document.getElementById("pauseBtn")?.click();
    const probes=[];
    for(const [n,[lat0,lon0,mw]] of Object.entries(C.IL)){const pts=[];
      for(let i=-C.r;i<=C.r;i++)for(let j=-C.r;j<=C.r;j++){const t=wo.describe(lat0+i*0.1,lon0+j*0.1);if(!t)continue;
        if(C.sea?(t.sea&&t.shallow):(!t.sea&&ru.baseAllowed(t).includes("res")))pts.push(t);}
      if(!pts.length)continue;pts.sort((a,b)=>a.wind-b.wind);
      probes.push({n,mw,t:C.pick==="max"?pts[pts.length-1]:pts[Math.floor(pts.length/2)],sp:0,N:0,mo:Array(12).fill(0),mn:Array(12).fill(0)});}
    for(let d=0;d<DAYS;d++){const m=cal.CAL.date.getUTCMonth();
      for(let h=0;h<24;h++){for(const q of probes){const e=W.powerCurve(wx.siteWx(q.t,h).hub);q.sp+=e;q.N++;q.mo[m]+=e;q.mn[m]++;}sim.tick();}
      document.querySelectorAll("dialog[open]").forEach(x=>x.close());}
    const AV=0.965,Wt=probes.reduce((a,q)=>a+q.mw,0);
    return {set:C.name,days:DAYS,cf:+(probes.reduce((a,q)=>a+q.sp/q.N*q.mw,0)/Wt*AV).toFixed(3),
      monthly:Array.from({length:12},(_,m)=>+(probes.reduce((a,q)=>a+(q.mn[m]?q.mo[m]/q.mn[m]:0)*q.mw,0)/Wt*AV).toFixed(3)),
      sites:probes.map(q=>({n:q.n,speed:+W.windSpeedOf(q.t).toFixed(2),cf:+(q.sp/q.N*AV).toFixed(3)}))};
  },[{...SETS[SET],name:SET},DAYS]);
  console.log(JSON.stringify(r,null,1));await b.close();
})();
