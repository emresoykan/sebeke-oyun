// --- Uygulama olarak kurma (PWA): ana ekrana ekleme ve çevrimdışı önbellek ---
// Oyun bir web uygulamasıdır; ana ekrana eklenince adres çubuğu olmadan, kendi ikonuyla tam ekran açılır (manifest.webmanifest).
// Android ve masaüstü Chrome/Edge kurulum penceresini kendisi sunar (beforeinstallprompt): Ayarlar'daki düğme onu açar.
// iPhone/iPad'de böyle bir pencere yok: düğme adımları gösterir; Safari'de üçüncü oyun gününden sonra bir kez ipucu çıkar.
// iOS'ta ana ekrandaki uygulamanın depolaması Safari'den ayrıdır: Safari'deki kayıt kendiliğinden geçmez (kayıt dosyası ya da
// bulut kayıt ile taşınır); yönlendirme bunu da söyler.
import { S } from "../state.js";
import { toast } from "./fx.js";

const HINT_KEY="wattlas-install-hint";
export const standalone=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const isIOS=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
let deferred=null;

// adım adım kurulum penceresi (onay penceresinin kabuğunu kullanır)
function showHelp(){
  const d=document.getElementById("confirmDlg"),ios=isIOS();
  const steps=ios?["Bu sayfayı <b>Safari</b>'de aç (başka tarayıcıdaysan adresi Safari'ye kopyala).","Alttaki <b>Paylaş</b> düğmesine dokun (kutudan çıkan ok).","Listeden <b>Ana Ekrana Ekle</b>'yi seç, sonra <b>Ekle</b>."]
    :["Chrome ya da Edge'de menüyü aç (⋮).","<b>Uygulamayı yükle</b> ya da <b>Ana ekrana ekle</b>'yi seç.","Masaüstünde adres çubuğunun sağındaki kurulum simgesi de aynı işi görür."];
  d.innerHTML=`<h3>Ana ekrana ekle</h3><ol class="inststeps">${steps.map(s=>`<li>${s}</li>`).join("")}</ol>
    <p class="kbd">Wattlas ana ekrandan adres çubuğu olmadan, uygulama gibi tam ekran açılır; oyun dosyaları telefonda saklandığı için hızlı başlar. Harita için internet gerekir.</p>
    ${ios?`<p class="kbd"><b>Kaydını taşı:</b> ana ekrandaki uygulama Safari'nin kaydını görmez. Önce burada Ayarlar ▸ <b>Kaydı indir</b>, sonra uygulamada <b>Kayıt yükle</b> (ya da bulut kayıt).</p>`:""}
    <div class="dlgbtns">${ios?`<button data-v="save">Kaydı indir</button>`:""}<button data-v="1" class="pri">Tamam</button></div>`;
  d.querySelectorAll("button").forEach(b=>b.onclick=()=>{d.close();if(b.dataset.v==="save")document.getElementById("saveExport").click();});
  d.oncancel=null;d.showModal();d.querySelector('[data-v="1"]').focus();
}

export function initInstall(btn){
  if(!btn)return;
  if(standalone()){btn.hidden=true;return;} // zaten uygulama olarak açık
  addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;});
  addEventListener("appinstalled",()=>{deferred=null;btn.hidden=true;toast("Wattlas kuruldu","Ana ekrandan uygulama gibi açabilirsin.");});
  btn.onclick=async()=>{
    if(deferred){const p=deferred;deferred=null;p.prompt();try{await p.userChoice;}catch(e){}return;}
    showHelp();};
  // iPhone/iPad Safari: oyuna ısındıktan sonra (3. gün) bir kez ipucu
  let seen=false;try{seen=!!localStorage.getItem(HINT_KEY);}catch(e){}
  if(isIOS()&&!seen&&S.dayNo>=3)setTimeout(()=>{
    try{localStorage.setItem(HINT_KEY,"1");}catch(e){}
    toast("Uygulama gibi oyna","Paylaş ▸ Ana Ekrana Ekle: tam ekran, hızlı açılış. Ayrıntı: Ayarlar ▸ Ana ekrana ekle.");},8000);
}

// çevrimdışı önbellek: yalnızca derlenmiş sürümde (geliştirme sunucusunda dosyalar değişip durur)
export function registerSW(){
  if(!import.meta.env.PROD||!("serviceWorker" in navigator))return;
  addEventListener("load",()=>navigator.serviceWorker.register(import.meta.env.BASE_URL+"sw.js").catch(e=>console.warn("Service worker kaydedilemedi:",e)));
}
