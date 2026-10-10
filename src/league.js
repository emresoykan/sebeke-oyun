// --- Arkadaş ligi: oyuncular arası sıralama ve duyurular ---
// Lig bir davet koduyla kurulur veya katılınır. Her oyun günü sonunda oyuncunun şirket adı, rengi, portföy değeri,
// kurulu gücü, oyun günü ve ünvanı paylaşılır (kişi adı paylaşılmaz). Yeni bir eşik aşılınca (ör. 50 MW, 1 M$)
// lige duyuru düşer; diğer oyuncuların duyuruları haber bandında ve bildirim balonunda görünür.
// Sunucu: Firebase (Firestore + anonim giriş). Yapılandırma VITE_FIREBASE_CONFIG ile gelir; yoksa lig gizlenir.
// Skorlar oyuncunun tarayıcısında hesaplanır; sunucu kuralları biçimi ve sıklığı denetler ama hileyi tamamen önleyemez.
import { S } from "./state.js";
import { netWorth } from "./sim.js";
import { getProfile, TITLES, titleOf } from "./profile.js";
import { fmt$ } from "./utils.js";
import { news } from "./news.js";
import { toast } from "./ui/fx.js";

const KEY="sebeke-league-v1", PUSH_MS=15000;
const MW_STEPS=[10,25,50,100,200,300,500,750,1000,1500,2000], VAL_STEPS=[5e5,1e6,2.5e6];
const FIELDS=["apiKey","authDomain","projectId","storageBucket","messagingSenderId","appId"];

// Firebase'in verdiği yapılandırma JSON ya da JavaScript nesnesi olarak yapıştırılabilir
export function parseCfg(s){
  if(!s)return null;s=String(s);
  let o=null;try{o=JSON.parse(s);}catch(e){o={};for(const m of s.matchAll(/(\w+)\s*:\s*["']([^"']+)["']/g))o[m[1]]=m[2];}
  const out={};FIELDS.forEach(k=>{if(o&&typeof o[k]==="string")out[k]=o[k];});
  return out.apiKey&&out.projectId&&out.appId?out:null;
}
const CFG=parseCfg(import.meta.env.VITE_FIREBASE_CONFIG);
const EMU=import.meta.env.DEV?new URLSearchParams(location.search).get("fbemu"):null; // yalnızca yerel testte
// önizleme derlemesi (sunucusuz sayfa): tarayıcı içinde örnek oyuncularla çalışan demo lig
export const DEMO=import.meta.env.VITE_LEAGUE_DEMO==="1";
export const leagueAvailable=()=>!!CFG||!!EMU||DEMO;

export const LG={code:null,status:"off",uid:null,players:[],feed:[],err:null};
let api=null,unsub=[],lastPush=0,timer=null,seen=new Set(),joinedAt=0;
const emit=()=>window.dispatchEvent(new CustomEvent("sebeke:league"));
const store=o=>{try{o?localStorage.setItem(KEY,JSON.stringify(o)):localStorage.removeItem(KEY);}catch(e){}};
const stored=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"null");}catch(e){return null;}};

export const normCode=s=>String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
export const codeOk=c=>/^[A-Z0-9]{6,16}$/.test(c);
export function newCode(){const A="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",r=crypto.getRandomValues(new Uint32Array(8));let s="";for(const x of r)s+=A[x%A.length];return s;}
export const safeColor=c=>/^#[0-9A-Fa-f]{6}$/.test(c)?c:"#8899AA";

function me(){
  const P=getProfile()||{},nw=netWorth();
  return {co:String(P.company||"Şirket").trim().slice(0,40)||"Şirket",c:safeColor(P.color),v:Math.round(nw),
    mw:S.plants.reduce((a,p)=>a+p.mw,0),d:Math.max(1,S.dayNo|0),ti:TITLES.findIndex(t=>t[1]===titleOf(nw).n)};
}
export function feedText(f){
  const co=f.co||"Bir oyuncu";
  if(f.k==="join")return `${co} lige katıldı (${f.n} MW).`;
  if(f.k==="mw")return `${co} ${f.n} MW kurulu güce ulaştı.`;
  if(f.k==="val")return `${co} portföy değerini ${fmt$(f.n)}'a çıkardı.`;
  if(f.k==="goal")return `${co} 5 M$ hedefine ulaştı!`;
  if(f.k==="title")return `${co} artık "${(TITLES[f.n]||TITLES[0])[1]}".`;
  return co;
}

async function start(code){
  LG.code=code;LG.status="connecting";LG.err=null;emit();
  try{
    const {connect}=DEMO?await import("./net/demo.js"):await import("./net/fb.js");
    api=await connect(CFG||{apiKey:"demo",projectId:"demo-sebeke",appId:"demo"},EMU);LG.uid=api.uid;
    unsub.forEach(f=>f());seen=new Set();let first=true;
    unsub=[api.watchPlayers(code,r=>{LG.players=r;LG.status="on";emit();},fail),
      api.watchFeed(code,r=>{LG.feed=r;
        // ilk anlık görüntü geçmiştir: bildirim üretme; sonra gelen, başkasına ait ve yeni duyurular haber bandına düşer
        r.forEach(f=>{if(seen.has(f.id))return;seen.add(f.id);
          if(!first&&f.uid!==LG.uid&&f.at>=joinedAt-60000){const t=feedText(f);news("🏆",t,"league");toast("🏆 Lig",t);}});
        first=false;emit();},fail)];
    await push(true);
  }catch(e){fail(e);}
}
function fail(e){LG.status="error";LG.err=e&&e.code?e.code:String(e&&e.message||e);console.warn("Lig bağlantısı:",e);emit();}

// Kaydı gönder: en fazla 15 sn'de bir (sunucu kuralı 10 sn); sık gün sonlarında son durum gecikmeli gönderilir
// (sayfa hızlı yenilenip kural reddederse bir kez 12 sn sonra yeniden denenir)
async function push(now,retry=0){
  if(!api||!LG.code)return;
  const wait=lastPush+PUSH_MS-Date.now();
  if(!now&&wait>0){if(!timer)timer=setTimeout(()=>{timer=null;push(true);},wait);return;}
  lastPush=Date.now();
  try{await api.upsert(LG.code,me());}
  catch(e){if(!retry)setTimeout(()=>push(true,1),12000);else fail(e);}
}
async function post(k,n){const m=me();try{await api.post(LG.code,{co:m.co,c:m.c,k,n});}catch(e){fail(e);}}

// Eşik duyuruları: yalnızca en yüksek yeni eşik duyurulur; eşikler oyun durumunda (S.lgSent) tutulur
function milestones(){
  const m=me(),s=S.lgSent||(S.lgSent={mw:0,v:0,ti:0});
  const top=(steps,x)=>steps.filter(t=>x>=t).pop()||0;
  const mw=top(MW_STEPS,m.mw);if(mw>s.mw){s.mw=mw;post("mw",mw);}
  if(m.v>=5e6&&s.v<5e6){s.v=5e6;post("goal",5e6);}
  else{const v=top(VAL_STEPS,m.v);if(v>s.v){s.v=v;post("val",v);}}
  if(m.ti>s.ti){s.ti=m.ti;if(m.ti>0)post("title",m.ti);}
}
// Lige katılırken mevcut ilerleme sessizce işaretlenir (eski başarılar yeniden duyurulmaz)
function markCurrent(){const m=me(),top=(st,x)=>st.filter(t=>x>=t).pop()||0;S.lgSent={mw:top(MW_STEPS,m.mw),v:m.v>=5e6?5e6:top(VAL_STEPS,m.v),ti:m.ti};}

export async function joinLeague(raw){
  const code=normCode(raw);if(!codeOk(code))throw new Error("Kod 6-16 harf veya rakam olmalı.");
  if(LG.code)await leaveLeague(true);
  joinedAt=Date.now();store({code,joined:joinedAt});markCurrent();
  await start(code);
  if(api&&LG.status!=="error")post("join",me().mw);
}
export async function leaveLeague(silent){
  unsub.forEach(f=>f());unsub=[];
  if(api&&LG.code)try{await api.leave(LG.code);}catch(e){}
  Object.assign(LG,{code:null,status:"off",players:[],feed:[],err:null});store(null);if(!silent)emit();
}
// Gün sonunda: eşik duyuruları ve kayıt güncellemesi
export function leagueDay(){if(!api||!LG.code||LG.status==="error")return;milestones();push();}
export function initLeague(){
  if(!leagueAvailable())return;
  const o=stored();if(o&&codeOk(o.code)){joinedAt=o.joined||Date.now();start(o.code);}
}
