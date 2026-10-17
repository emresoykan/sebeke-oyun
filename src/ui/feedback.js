// --- Pilot geri bildirim formu ---
// Anonim: ad, e-posta veya şirket sorulmaz; serbest metinde e-posta ya da telefon numarası görünürse gönderim durdurulur.
// İsteğe bağlı olarak oyunun özeti (oyun günü, santral sayısı ve türleri, piyasalar, cihaz tipi) eklenir; profil adı eklenmez.
// Firebase yapılandırıldıysa yanıt feedback/{anonim uid} belgesine yazılır (yalnızca proje sahibi konsoldan okur);
// yoksa ya da gönderim başarısız olursa yanıt kopyalanır veya dosya olarak indirilir.
import { S } from "../state.js";
import { TECH } from "../config.js";
import { fbSetup } from "../league.js";
import { toast } from "./fx.js";

const KEY="sebeke-feedback-v1", PILOT="sebeke-pilot-v1", V=1, TMAX=600;
const ASK_MS=15*60000, ASK_DAY=8; // pilot daveti: 15 dakika ya da 8 oyun günü sonra form bir kez açılır
const ROLES=[["fin","Finans, FP&A, kurumsal finansman"],["mkt","Enerji piyasası, ticaret"],["eng","Mühendislik, proje, operasyon"],["stu","Öğrenci, akademi"],["oth","Diğer"]];
const EXP=[["0","0–2 yıl"],["3","3–5 yıl"],["6","6–10 yıl"],["10","10 yıldan fazla"]];
// 1–5 ölçekli sorular (boş bırakılabilir)
const SCALE=[
  ["r1","Fiyatlar ve gün içi fiyat profili gerçekçi."],
  ["r2","Proje ekonomisi (LCOE, NPV, IRR) gerçekçi."],
  ["r3","Saha seçimi kuralları (arazi, eğim, izin) gerçekçi."],
  ["u1","Proje ekonomisi tablosu anlaşılır."],
  ["l1","Oyun, güneş fiyat oranının (capture rate) neden düştüğünü bana gösterdi."]
];
const TEXT=[["t1","En gerçek dışı bulduğun şey neydi?"],["t2","En faydalı bulduğun şey neydi?"],["t3","Neyin eklenmesini isterdin?"]];
const PII=/[^\s@]+@[^\s@]+\.[a-z]{2,}|(?:\+|\b0)\d(?:[ ()-]?\d){8,}/i; // e-posta; + ya da 0 ile başlayan 10+ haneli numara

const dlg=()=>document.getElementById("fbDlg");
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const sentAt=()=>{try{return +localStorage.getItem(KEY)||0;}catch(e){return 0;}};
let api=null,msg="",busy=false;

// oyunun anonim özeti
export function gameSummary(){
  const techs=[...new Set(S.plants.map(p=>p.k))].sort(),mk=[...new Set(S.plants.map(p=>S.sites[p.t]?.mreg).filter(Boolean))].sort();
  return {day:S.dayNo|0,plants:S.plants.length,mw:Math.round(S.plants.reduce((a,p)=>a+p.mw,0)),techs:techs.join(","),mk:mk.join(","),dev:matchMedia("(min-width:900px)").matches?"d":"m"};
}

function read(d){
  const f=new FormData(d.querySelector("form")),o={v:V};
  o.role=f.get("role")||"";o.exp=f.get("exp")||"";
  SCALE.forEach(([k])=>{const v=+f.get(k);if(v>=1&&v<=5)o[k]=v;});
  const n=f.get("nps");if(n!==null&&n!=="")o.nps=+n;
  TEXT.forEach(([k])=>{const t=String(f.get(k)||"").trim().slice(0,TMAX);if(t)o[k]=t;});
  if(f.get("game"))Object.assign(o,gameSummary());
  return o;
}
function check(o){
  if(!o.role||!o.exp)return "Lütfen alanını ve deneyimini seç.";
  if(TEXT.some(([k])=>o[k]&&PII.test(o[k])))return "Metinde e-posta adresi ya da telefon numarası gibi görünen bir ifade var; lütfen kaldır. Form anonimdir.";
  return "";
}
// okunabilir düz metin (kopyalama için)
function asText(o){
  const L=(a,k)=>(a.find(x=>x[0]===o[k])||[,"—"])[1];
  const rows=[`Wattlas pilot geri bildirimi (form v${o.v})`,`Alan: ${L(ROLES,"role")}`,`Deneyim: ${L(EXP,"exp")}`,
    ...SCALE.map(([k,q])=>`${q} ${o[k]?o[k]+"/5":"—"}`),`Tavsiye (0–10): ${o.nps??"—"}`,...TEXT.map(([k,q])=>`${q}\n${o[k]||"—"}`)];
  if(o.day)rows.push(`Oyun özeti: gün ${o.day}, ${o.plants} santral, ${o.mw} MW, türler ${o.techs||"—"}, piyasalar ${o.mk||"—"}, ${o.dev==="d"?"masaüstü":"mobil"}`);
  return rows.join("\n");
}

function form(){
  const sel=(n,a)=>a.map(([v,t])=>`<label class="fbopt"><input type="radio" name="${n}" value="${v}" required> ${esc(t)}</label>`).join("");
  const sc=SCALE.map(([k,q])=>`<fieldset class="fbsc"><legend>${esc(q)}</legend><div>${[1,2,3,4,5].map(i=>`<label><input type="radio" name="${k}" value="${i}"><span>${i}</span></label>`).join("")}</div></fieldset>`).join("");
  const g=gameSummary();
  return `<form class="fbk" novalidate>
    <p class="pmuted">Yanıtlar anonimdir. Ad, e-posta, şirket adı ya da gizli şirket bilgisi yazma. Yaklaşık 3 dakika sürer.</p>
    <fieldset><legend>Hangi alanda çalışıyorsun?</legend>${sel("role",ROLES)}</fieldset>
    <fieldset><legend>Enerji veya finans alanında deneyimin</legend>${sel("exp",EXP)}</fieldset>
    <p class="fbhint">1 = hiç katılmıyorum, 5 = tamamen katılıyorum. Fikrin yoksa boş bırak.</p>
    ${sc}
    <fieldset class="fbsc fbnps"><legend>Oyunu bu alanda çalışan bir meslektaşına önerir misin? (0 = kesinlikle hayır, 10 = kesinlikle evet)</legend><div>${[...Array(11).keys()].map(i=>`<label><input type="radio" name="nps" value="${i}"><span>${i}</span></label>`).join("")}</div></fieldset>
    ${TEXT.map(([k,q])=>`<label class="fbtxt">${esc(q)}<textarea name="${k}" maxlength="${TMAX}" rows="2"></textarea></label>`).join("")}
    <label class="fbopt"><input type="checkbox" name="game" checked> Oyun özetini ekle: gün ${g.day}, ${g.plants} santral (${g.techs?g.techs.split(",").map(k=>TECH[k]?.n||k).join(", "):"yok"}), ${g.mw} MW</label>
  </form>`;
}

function render(){
  const d=dlg(),cloud=!!fbSetup(),prev=sentAt();
  d.innerHTML=`<h3>Geri bildirim</h3>${prev?`<p class="pmuted">Bu tarayıcıdan ${new Date(prev).toLocaleDateString("tr-TR")} tarihinde yanıt gönderdin; yeniden gönderirsen önceki yanıtın yerine geçer.</p>`:""}
    ${form()}<p class="fbmsg" role="status" aria-live="polite"></p>
    <div class="pact">${cloud?"":'<span class="pmuted fbnote">Sunucu bağlı değil: yanıtı kopyalayıp ya da dosya olarak indirip oyunu sana gönderen kişiye ilet.</span>'}
      <button type="button" data-a="close">Kapat</button><button type="button" data-a="copy">Kopyala</button><button type="button" data-a="file">Dosya indir</button>${cloud?'<button type="button" class="pri" data-a="send">Gönder</button>':""}</div>`;
  d.querySelectorAll("button[data-a]").forEach(b=>b.onclick=()=>act(b.dataset.a));
}
const say=(t,bad)=>{const m=dlg().querySelector(".fbmsg");m.textContent=t;m.classList.toggle("neg",!!bad);};

async function act(a){
  const d=dlg();if(a==="close")return d.close();
  if(busy)return;
  const o=read(d),err=check(o);if(err)return say(err,true);
  if(a==="copy"){try{await navigator.clipboard.writeText(asText(o));say("Yanıt panoya kopyalandı. E-posta ya da mesajla iletebilirsin.");}catch(e){say("Kopyalanamadı; dosya indir seçeneğini kullan.",true);}return;}
  if(a==="file"){const u=URL.createObjectURL(new Blob([JSON.stringify(o,null,1)],{type:"application/json"})),l=document.createElement("a");
    l.href=u;l.download=`wattlas-geribildirim-${new Date().toISOString().slice(0,10)}.json`;l.click();setTimeout(()=>URL.revokeObjectURL(u),2000);say("Dosya indirildi.");return;}
  if(a==="send"){
    busy=true;say("Gönderiliyor…");
    try{if(!api){const f=fbSetup(),m=await import("../net/fb.js");api=await m.connect(f.cfg,f.emu);}
      await api.feedback(o);try{localStorage.setItem(KEY,String(Date.now()));}catch(e){}
      say("Teşekkürler, yanıtın gönderildi.");d.querySelector('[data-a="send"]').disabled=true;}
    catch(e){console.warn("Geri bildirim gönderilemedi:",e);say(/permission/i.test(String(e))&&sentAt()?"Gönderilemedi: yeni yanıt için en az 30 saniye bekle.":"Gönderilemedi. Yanıtı kopyalayıp ya da dosya olarak indirip iletebilirsin.",true);}
    finally{busy=false;}
  }
}
export function openFeedback(){const d=dlg();if(!d.open){render();d.showModal();}}
export function initFeedback(btn){
  btn.onclick=openFeedback;
  dlg().addEventListener("click",e=>{if(e.target===dlg())dlg().close();});
  // vaka çalışması sayfasındaki bağlantı (?geribildirim): oyuncu önce oynar; form 15 dakika ya da 8 oyun günü sonra bir kez açılır
  const ls=(k,v)=>{try{if(v===undefined)return JSON.parse(localStorage.getItem(k)||"null");localStorage.setItem(k,JSON.stringify(v));}catch(e){return null;}};
  if(new URLSearchParams(location.search).has("geribildirim")){
    if(!ls(PILOT))ls(PILOT,{t:Date.now(),asked:false});
    setTimeout(()=>toast("Pilot oyununa hoş geldin","15–20 dakika oyna; geri bildirim formu kendiliğinden açılır. İstersen Ayarlar → Geri bildirim ver."),2500);
  }
  setInterval(()=>{const p=ls(PILOT);
    if(!p||p.asked||sentAt()||document.querySelector("dialog[open]"))return;
    if(Date.now()-p.t>=ASK_MS||S.dayNo>=ASK_DAY){ls(PILOT,{...p,asked:true});openFeedback();}
  },20000);
}
