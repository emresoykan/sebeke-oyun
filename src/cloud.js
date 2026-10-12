// --- Bulut kayıt: oyunun bir kopyası Firebase'de, kurtarma koduyla ---
// Giriş anonimdir (lig ile aynı Firebase projesi, ücretsiz Spark planı). Kayıt, 16 karakterlik rastgele bir
// kurtarma kodunun altında durur (saves/{KOD}); kodu bilen kaydı okuyabilir ve üzerine yazabilir, liste okunamaz.
// Bu yüzden kod bir şifre gibi saklanmalıdır. Başka cihazda ya da tarayıcı verisi silindikten sonra kodla geri yüklenir.
// Eşitleme: açıkken oyun günü bittikçe en fazla 90 saniyede bir, sekme gizlenirken de bir kez yazılır (yazma kotasını
// korur). Buluttan yükleme yalnızca oyuncu isteyince olur; yerel ilerleme sessizce ezilmez.
import { SAVE_KEY } from "./config.js";
import { S, save, freezeSave } from "./state.js";
import { PROFILE_KEY, getProfile } from "./profile.js";
import { fbSetup } from "./league.js";

const KEY="sebeke-cloud-v1", VER=1, PUSH_MS=90000, MIN_GAP=21000;
const A="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CL={code:null,status:"off",last:null,lastDay:null,err:null};
let api=null,lastPush=0,lastSig=null,pushing=null,timer=0;
const sig=()=>`${S.dayNo}:${S.hour}:${Math.round(S.money)}:${S.plants.length}:${Object.keys(S.sites).length}`;

const emit=()=>window.dispatchEvent(new CustomEvent("sebeke:cloud"));
const store=()=>{try{CL.code?localStorage.setItem(KEY,JSON.stringify({code:CL.code,last:CL.last,lastDay:CL.lastDay})):localStorage.removeItem(KEY);}catch(e){}};
export const cloudAvailable=()=>!!fbSetup();
export const normSave=s=>String(s||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
export const saveCodeOk=c=>/^[A-HJ-NP-Z2-9]{16}$/.test(c);
export const fmtCode=c=>c?c.match(/.{1,4}/g).join("-"):"";
function newSaveCode(){const r=crypto.getRandomValues(new Uint32Array(16));let s="";for(const x of r)s+=A[x%A.length];return s;}
// hata mesajlarını oyuncunun anlayacağı dile çevir
function why(e){const c=e&&e.code||"";
  if(c.includes("permission-denied"))return "Sunucu isteği reddetti (kurallar güncel değil ya da çok sık kayıt).";
  if(c.includes("unavailable")||!navigator.onLine)return "Bağlantı yok; internet gelince tekrar denenecek.";
  if(c.includes("auth"))return "Anonim giriş yapılamadı (Firebase'de Anonymous açık olmalı).";
  return "Bulut kaydı yapılamadı.";}

async function conn(){if(api)return api;const f=fbSetup();if(!f)throw new Error("Firebase yapılandırılmamış");const m=await import("./net/fb.js");api=await m.connect(f.cfg,f.emu);return api;}
function payload(){
  save();const s=JSON.stringify(S),p=getProfile();
  if(s.length>800000)throw Object.assign(new Error("Kayıt çok büyük"),{code:"too-big"});
  const d={s,v:VER,day:Math.max(1,Math.round(S.dayNo||1))};if(p)d.p=JSON.stringify(p).slice(0,4000);return d;
}

// Buluta yaz: force değilse en az PUSH_MS arayla ve yalnızca oyun değiştiyse; sunucu en fazla 20 sn'de bir güncellemeye izin verir.
// Dönüş: "wait" (çok erken), "same" (değişiklik yok) ya da yazma sözü
export async function pushCloud(force=false){
  if(!CL.code)return;if(pushing)return pushing;
  const now=Date.now();if(now-lastPush<(force?MIN_GAP:PUSH_MS))return "wait";
  if(!force&&sig()===lastSig)return "same";
  lastPush=now;lastSig=sig();CL.status="syncing";emit();
  pushing=(async()=>{try{const a=await conn();await a.savePut(CL.code,payload());CL.status="ok";CL.err=null;CL.last=Date.now();CL.lastDay=S.dayNo;store();}
    catch(e){CL.status="error";CL.err=e.code==="too-big"?"Kayıt bulut sınırını aşıyor.":why(e);console.warn("Bulut kayıt:",e);}
    finally{pushing=null;emit();}})();
  return pushing;
}
export async function enableCloud(){
  CL.code=newSaveCode();CL.last=null;CL.lastDay=null;store();lastPush=0;await pushCloud(true);startAuto();
  if(CL.status==="error"){const err=CL.err;CL.code=null;store();CL.status="error";CL.err=err;emit();return false;}
  return true;
}
// Kapat: yerel kod unutulur; istenirse buluttaki kopya da silinir
export async function disableCloud(remove){
  const c=CL.code;stopAuto();CL.code=null;CL.last=null;CL.lastDay=null;store();CL.status="off";CL.err=null;emit();
  if(remove&&c){try{await (await conn()).saveDel(c);}catch(e){console.warn("Bulut kayıt silinemedi:",e);return false;}}
  return true;
}
// Kodla buluttaki kaydı getir (yüklemeden önce oyuncuya gösterilir)
export async function fetchByCode(raw){
  const code=normSave(raw);if(!saveCodeOk(code))return {err:"Kod 16 karakter olmalı (ör. ABCD-EFGH-JKLM-NPQR)."};
  try{const d=await (await conn()).saveGet(code);if(!d)return {err:"Bu koda ait bulut kaydı bulunamadı."};
    let st=null;try{st=JSON.parse(d.s);}catch(e){}
    if(!st||typeof st.money!=="number"||!Array.isArray(st.plants)||!st.sites||typeof st.dayNo!=="number")return {err:"Buluttaki kayıt bozuk."};
    let prof=null;try{prof=d.p?JSON.parse(d.p):null;}catch(e){}
    return {code,state:st,profile:prof,at:d.at,day:d.day};
  }catch(e){return {err:why(e)};}
}
// Getirilen kaydı yerel kaydın yerine koy ve sayfayı yenile; bu cihaz da aynı kodla eşitlemeye devam eder
export function applyFetched(r){
  freezeSave();stopAuto();
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(r.state));if(r.profile&&r.profile.company)localStorage.setItem(PROFILE_KEY,JSON.stringify(r.profile));
    localStorage.setItem(KEY,JSON.stringify({code:r.code,last:r.at,lastDay:r.day}));}catch(e){return false;}
  location.reload();return true;
}

function onHide(){if(document.visibilityState==="hidden")pushCloud(true);}
function onDay(){pushCloud(false);}
function startAuto(){stopAuto();window.addEventListener("sebeke:dayend",onDay);document.addEventListener("visibilitychange",onHide);timer=setInterval(()=>pushCloud(false),PUSH_MS);}
function stopAuto(){window.removeEventListener("sebeke:dayend",onDay);document.removeEventListener("visibilitychange",onHide);clearInterval(timer);timer=0;}

export function initCloud(){
  if(!cloudAvailable())return;
  try{const o=JSON.parse(localStorage.getItem(KEY)||"null");if(o&&saveCodeOk(o.code)){CL.code=o.code;CL.last=o.last||null;CL.lastDay=o.lastDay||null;CL.status="ok";startAuto();}}catch(e){}
  emit();
}
