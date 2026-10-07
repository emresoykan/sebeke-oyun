// --- Önizleme ligi: sunucusuz, tarayıcı içinde çalışan örnek lig ---
// Yalnızca önizleme derlemesinde (VITE_LEAGUE_DEMO=1) kullanılır. fb.js ile aynı arayüzü sunar; üç örnek oyuncu
// zamanla büyür ve eşik geçince duyuru yazar. Gerçek oyuncu veya sunucu yoktur; arayüzü denemek içindir.
const BOTS=[
  {id:"demo-1",co:"Örnek: Kuzey Rüzgârı",c:"#2F7FC1",v:180000,mw:5,rate:1.6},
  {id:"demo-2",co:"Örnek: Güneşli Ova",c:"#E59E00",v:220000,mw:10,rate:1.2},
  {id:"demo-3",co:"Örnek: Dere Enerji",c:"#C2364A",v:150000,mw:0,rate:0.9}
];
const MW=[10,25,50,100,200,300,500], VAL=[2.5e5,5e5,1e6,2.5e6], TI=[0,3e5,1e6,2.5e6,5e6];
let api=null;

export async function connect(){
  if(api)return api;
  const uid="me",players=new Map(),feed=[],pw=new Set(),fw=new Set();let n=0;
  const t0=Date.now();
  BOTS.forEach((b,i)=>{players.set(b.id,{id:b.id,co:b.co,c:b.c,v:b.v,mw:b.mw,d:3+i,ti:0,at:t0});
    feed.push({id:"f"+(n++),uid:b.id,co:b.co,c:b.c,k:"join",n:b.mw,at:t0-(i+1)*600000});});
  const sorted=()=>[...players.values()].sort((a,b)=>b.v-a.v).slice(0,25);
  const recent=()=>[...feed].sort((a,b)=>b.at-a.at).slice(0,20);
  const fire=()=>{pw.forEach(f=>f(sorted()));fw.forEach(f=>f(recent()));};
  // örnek oyuncular her 9 sn'de büyür; eşik geçince duyuru yazar
  setInterval(()=>{
    const b=BOTS[Math.floor(Math.random()*BOTS.length)],p=players.get(b.id),mw0=p.mw,v0=p.v,ti0=p.ti;
    p.mw+=5*Math.ceil(Math.random()*2*b.rate);p.v=Math.round(p.v*(1.06+0.06*Math.random()*b.rate)+40000*b.rate);p.d++;p.at=Date.now();
    p.ti=TI.filter(x=>p.v>=x).length-1;
    const post=(k,v)=>feed.push({id:"f"+(n++),uid:b.id,co:b.co,c:b.c,k,n:v,at:Date.now()});
    const mw=MW.filter(x=>p.mw>=x&&mw0<x).pop();if(mw)post("mw",mw);
    if(p.v>=5e6&&v0<5e6)post("goal",5e6);else{const v=VAL.filter(x=>p.v>=x&&v0<x).pop();if(v)post("val",v);}
    if(p.ti>ti0)post("title",p.ti);
    fire();
  },9000);
  api={uid,
    upsert:async(code,d)=>{players.set(uid,{...d,id:uid,at:Date.now()});fire();},
    post:async(code,d)=>{feed.push({...d,id:"f"+(n++),uid,at:Date.now()});fire();},
    leave:async()=>{players.delete(uid);fire();},
    watchPlayers:(code,cb)=>{pw.add(cb);setTimeout(()=>cb(sorted()),0);return ()=>pw.delete(cb);},
    watchFeed:(code,cb)=>{fw.add(cb);setTimeout(()=>cb(recent()),0);return ()=>fw.delete(cb);}
  };
  return api;
}
