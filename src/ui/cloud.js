// --- Ayarlar: bulut kayıt bölümü (aç / kapat, kurtarma kodu, kodla yükle) ---
import { CL, cloudAvailable, enableCloud, disableCloud, pushCloud, fetchByCode, applyFetched, fmtCode } from "../cloud.js";
import { confirmBox } from "./sheet.js";
import { toast } from "./fx.js";

let show=false;
const when=t=>t?new Date(t).toLocaleString("tr-TR",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}):"henüz yok";

function render(){
  const el=document.getElementById("cloudBox");if(!el)return;
  if(!cloudAvailable()){el.innerHTML=`<h4>Bulut kayıt</h4><p class="kbd">Bu yayında bulut kayıt kapalı (Firebase yapılandırılmamış). Kaydı dosya olarak indirip yükleyebilirsin.</p>`;return;}
  const st=CL.status==="syncing"?"Kaydediliyor…":CL.status==="error"?`Hata: ${CL.err}`:`Son bulut kaydı: ${when(CL.last)}${CL.lastDay?` (Gün ${CL.lastDay})`:""}`;
  el.innerHTML=CL.code?`<h4>Bulut kayıt <span class="cl-on">açık</span></h4>
    <p class="kbd" role="status">${st}</p>
    <div class="cl-code"><span>Kurtarma kodu</span><code>${show?fmtCode(CL.code):"••••-••••-••••-••••"}</code><button data-c="show" aria-pressed="${show}">${show?"Gizle":"Göster"}</button><button data-c="copy">Kopyala</button></div>
    <p class="kbd">Kodu bir şifre gibi sakla: başka cihazda ya da tarayıcı verisi silinince oyunu bununla geri yüklersin. Kodu bilen herkes kaydı okuyup değiştirebilir.</p>
    <div class="controls"><button data-c="push">Şimdi kaydet</button><button data-c="off">Kapat</button><button data-c="del" class="dangerbtn">Buluttan sil</button></div>`
  :`<h4>Bulut kayıt</h4>
    <p class="kbd">Açarsan oyunun bir kopyası buluta da kaydedilir (anonim giriş, hesap gerekmez). Sana bir kurtarma kodu verilir; başka cihazda oyuna bu kodla devam edersin. Bulutta oyun durumu ve profilin (şirket adı, oyuncu adı, renk) saklanır.</p>
    ${CL.status==="error"?`<p class="kbd neg" role="status">Hata: ${CL.err}</p>`:""}
    <div class="controls"><button data-c="on" class="pri">Bulut kaydı aç</button></div>
    <div class="cl-load"><label for="clIn">Kurtarma kodun var mı?</label><div><input id="clIn" placeholder="ABCD-EFGH-JKLM-NPQR" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="24"><button data-c="load">Kodla yükle</button></div></div>`;
  el.querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>act(b.dataset.c,b));
}
async function act(c,b){
  if(c==="show"){show=!show;render();return;}
  if(c==="copy"){try{await navigator.clipboard.writeText(fmtCode(CL.code));toast("Kurtarma kodu kopyalandı","Güvenli bir yerde sakla");}catch(e){show=true;render();toast("Kopyalanamadı","Kodu elle not al","neg");}return;}
  b.disabled=true;
  try{
    if(c==="on"){if(await enableCloud()){show=true;toast("Bulut kayıt açık","Kurtarma kodunu Ayarlar'da sakla");}}
    else if(c==="push"){const r=await pushCloud(true);if(r==="wait")toast("Biraz bekle","Bulut kayıt en fazla 20 saniyede bir yapılabilir");}
    else if(c==="off"){if(await confirmBox("Bulut kaydı kapat","Bu cihaz artık buluta kaydetmeyecek. Buluttaki kopya kurtarma koduyla erişilebilir kalır.","Kapat"))await disableCloud(false);}
    else if(c==="del"){if(await confirmBox("Buluttan sil","Buluttaki kayıt silinsin ve bulut kayıt kapansın mı? Bu cihazdaki oyun kalır.","Sil",true)){const ok=await disableCloud(true);toast(ok?"Buluttaki kayıt silindi":"Silinemedi",ok?"":"Bağlantıyı kontrol et",ok?"":"neg");}}
    else if(c==="load"){const r=await fetchByCode(document.getElementById("clIn").value);
      if(r.err){toast("Kayıt yüklenemedi",r.err,"neg");}
      else if(await confirmBox("Buluttan yükle",`Gün ${r.state.dayNo} kaydı (son kayıt ${when(r.at)}) yüklensin mi? Bu cihazdaki ilerlemenin yerine geçer.`,"Yükle",true))applyFetched(r);}
  }finally{b.disabled=false;render();}
}
export function initCloudUI(){window.addEventListener("sebeke:cloud",render);render();}
