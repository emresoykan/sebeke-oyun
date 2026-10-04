// Simülasyon: günlük fiyat üretimi, saatlik tick, gün sonu kapanışı
import { BASE, EFF, IMB, BLOCK, REG, MARKETS, TECH } from "./config.js";
import { placeName } from "./world.js";
import { S, D, setD, save, addLog } from "./state.js";
import { permitProb, rejectWhy, landCost } from "./rules.js";
import { rnd, clamp, gauss, shape, prof } from "./utils.js";
import { render, renderReport } from "./ui/hud.js";
import { renderPanel } from "./ui/panel.js";
import { drawMap } from "./ui/map.js";

const site=id=>S.sites[id];

export function newDay(){
  setD({st:{E:{ges:0,res:0,off:0,hes:0},R:{ges:0,res:0,off:0,hes:0},imb:0,bNet:0,curt:0,opex:0,sBase:0}});
  MARKETS.forEach(k=>{
    const sun=0.55+rnd()*0.45, windDay=0.4+rnd()*1.0;
    const solarMW=S.plants.filter(p=>p.k==="ges"&&site(p.t).mreg===k).reduce((a,p)=>a+p.mw,0);
    const mS=S.mSolar[k]+solarMW/200, mult=REG[k].mult;
    const price=BASE.map((b,h)=>clamp(mult*(b*(0.92+0.16*rnd())-57*mS*shape(h)*sun-10*windDay),0,110*mult));
    const idx=[...Array(24).keys()].sort((a,b)=>price[a]-price[b]);
    const ch=idx.slice(0,2),dis=idx.slice(-2),plan=Array(24).fill(0);
    if((price[dis[0]]+price[dis[1]])*EFF>(price[ch[0]]+price[ch[1]])*1.05){ch.forEach(h=>plan[h]=1);dis.forEach(h=>plan[h]=-1);}
    D[k]={sun,windDay,price,plan,avg:price.reduce((a,b)=>a+b,0)/24,gen:Array.from({length:24},()=>({s:0,w:0,h:0,b:0}))};
  });
  S.plants.forEach(p=>{if(p.k!=="hes")return;const t=site(p.t),pr=D[t.mreg].price;
    let budget=p.mw*24*t.hydro*(0.25+rnd()*0.3);p.plan=Array(24).fill(0);
    [...Array(24).keys()].sort((a,b)=>pr[b]-pr[a]).forEach(h=>{const e=Math.min(p.mw,budget);p.plan[h]=e;budget-=e;});});
}

export function tick(){
  const h=S.hour, st=D.st; let cash=0;
  S.plants.forEach(p=>{
    const t=site(p.t), M=D[t.mreg], pr=M.price[h], g=M.gen[h];
    if(p.k==="ges"){let e=p.mw*t.solar*shape(h)*M.sun*(0.9+rnd()*0.1);if(pr<=0){st.curt+=e;e=0;}
      st.E.ges+=e;st.R.ges+=e*pr;st.sBase+=e*M.avg;g.s+=e;cash+=e*pr;}
    else if(p.k==="res"||p.k==="off"){const f=clamp(t.wind*M.windDay*prof(h),0,1),a=clamp(f*(1+gauss()*0.25),0,1),e=p.mw*a,imb=Math.abs(e-p.mw*f)*pr*IMB;
      st.E[p.k]+=e;st.R[p.k]+=e*pr;st.imb+=imb;g.w+=e;cash+=e*pr-imb;}
    else if(p.k==="hes"){const e=p.plan?p.plan[h]:0;st.E.hes+=e;st.R.hes+=e*pr;g.h+=e;cash+=e*pr;}
    else if(p.k==="batt"){p.soc=p.soc||0;const cap=p.mw*2;
      if(M.plan[h]===1){const e=Math.min(p.mw,cap-p.soc);p.soc+=e;st.bNet-=e*pr;cash-=e*pr;g.b-=e;}
      else if(M.plan[h]===-1){const e=Math.min(p.mw,p.soc);p.soc-=e;st.bNet+=e*EFF*pr;cash+=e*EFF*pr;g.b+=e*EFF;}}
    const ox=TECH[p.k].opex*p.mw/BLOCK/24;st.opex+=ox;cash-=ox;
  });
  S.money+=cash; S.hour++;
  if(S.hour>=24)endDay();
  render();
}

export function endDay(){
  const st=D.st, E=st.E, R=st.R;
  const net=R.ges+R.res+R.off+R.hes-st.imb+st.bNet-st.opex;
  const sRate=E.ges>0?(R.ges/E.ges)/(st.sBase/E.ges):(()=>{const M=D.T;let a=0,b=0;M.price.forEach((p,h)=>{a+=p*shape(h);b+=shape(h);});return(a/b)/M.avg;})();
  S.last={dayNo:S.dayNo,E:{...E},R:{...R},imb:st.imb,bNet:st.bNet,curt:st.curt,opex:st.opex,net,sRate};
  S.hist.push(sRate);if(S.hist.length>14)S.hist.shift();
  MARKETS.forEach(k=>S.mSolar[k]=Math.min(1.6,S.mSolar[k]+0.012));
  // izin süreçleri
  Object.values(S.sites).forEach(o=>{
    if(o.permit!=="pending")return;o.days--;
    if(o.days<=0){const nm=placeName(o);
      if(rnd()<permitProb(o)){o.permit="ok";addLog(`${nm} için izin çıktı. Artık santral kurabilirsin.`);}
      else{o.permit="rejected";o.why=rejectWhy(o);addLog(`${nm} için izin reddedildi: ${o.why}.`);}}
  });
  S.dayNo++;S.hour=0;newDay();save();renderReport();renderPanel();drawMap();
}

export function netWorth(){let v=S.money;Object.values(S.sites).forEach(o=>v+=landCost(o));S.plants.forEach(p=>v+=TECH[p.k].capex*p.mw/BLOCK);return v;}
export function siteMW(id){return S.plants.filter(p=>p.t===id).reduce((a,p)=>a+p.mw,0);}

export function newDayHydro(p){const t=site(p.t),pr=D[t.mreg].price;let b=p.mw*24*t.hydro*0.4;p.plan=Array(24).fill(0);
  [...Array(24).keys()].filter(h=>h>=S.hour).sort((a,c)=>pr[c]-pr[a]).forEach(h=>{const e=Math.min(p.mw,b);p.plan[h]=e;b-=e;});}
