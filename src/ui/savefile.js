// --- Kayıt dosyası: oyunu JSON olarak indir, başka cihazda ya da sonra geri yükle ---
// Dosyada oyun durumu ve oyuncu profili bulunur. Yükleme mevcut ilerlemenin yerine geçer (onay istenir).
import { SAVE_KEY } from "../config.js";
import { S, save, freezeSave } from "../state.js";
import { PROFILE_KEY, getProfile } from "../profile.js";
import { confirmBox } from "./sheet.js";
import { toast } from "./fx.js";

const APP="wattlas", VER=1;

export function exportSave(){
  save();
  const data={app:APP,v:VER,savedAt:new Date().toISOString(),state:S,profile:getProfile()||null};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:"application/json"}));
  const a=document.createElement("a");a.href=url;a.download=`wattlas-kayit-gun${S.dayNo}.json`;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast("Kayıt indirildi",`Gün ${S.dayNo} • ${a.download}`);
}

// Dosyanın gerçekten bir Wattlas kaydı olduğunu denetle; değilse neden olmadığını döndür
function check(d){
  if(!d||d.app!==APP)return "Bu dosya bir Wattlas kaydı değil.";
  if(typeof d.v!=="number"||d.v>VER)return "Bu kayıt oyunun daha yeni bir sürümüyle oluşturulmuş.";
  const s=d.state;
  if(!s||typeof s!=="object"||typeof s.money!=="number"||!Array.isArray(s.plants)||!s.sites||typeof s.sites!=="object"||typeof s.dayNo!=="number")return "Kayıt dosyası eksik ya da bozuk.";
  return null;
}

async function importFile(file){
  let d;try{d=JSON.parse(await file.text());}catch(e){d=null;}
  const err=check(d);if(err){toast("Kayıt yüklenemedi",err,"neg");return;}
  const ok=await confirmBox("Kaydı yükle",`Gün ${d.state.dayNo} kaydı yüklensin mi? Şu anki ilerlemenin yerine geçer.`,"Yükle",true);
  if(!ok)return;
  freezeSave();
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(d.state));if(d.profile&&d.profile.company)localStorage.setItem(PROFILE_KEY,JSON.stringify(d.profile));}
  catch(e){toast("Kayıt yüklenemedi","Tarayıcı depolamasına yazılamadı.","neg");return;}
  location.reload();
}

export function initSaveFile(exportBtn,importBtn){
  const inp=document.createElement("input");inp.type="file";inp.accept="application/json,.json";inp.hidden=true;document.body.appendChild(inp);
  inp.onchange=()=>{const f=inp.files&&inp.files[0];inp.value="";if(f)importFile(f);};
  const pick=()=>inp.click();
  exportBtn.onclick=exportSave;importBtn.onclick=pick;
  window.addEventListener("sebeke:import",pick);
}
