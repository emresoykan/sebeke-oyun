// --- Durum ---
// S: kalıcı oyun durumu (localStorage), D: günlük simülasyon verisi (kaydedilmez).
// ES modül bağlamaları dışarıdan yeniden atanamadığı için atamalar setS/setD ile yapılır.
// S.sites: satın alınan sahalar (id -> konum, arazi bilgisi, izin durumu); S.sel: seçili nokta {id, lat, lon}.
import { SAVE_KEY, REG, MARKETS } from "./config.js";
import { describe } from "./world.js";
import { renderLog } from "./ui/hud.js";

export let S, D={};
export function setS(v){S=v;}
export function setD(v){D=v;}

export function fresh(){const m={};MARKETS.forEach(k=>m[k]=REG[k].s0);return{money:150000,dayNo:1,hour:0,sites:{},nextId:1,plants:[],mSolar:m,hist:[],last:null,log:[],won:false,sel:{id:null,lat:38.6,lon:33.3}};}
export function load(){try{const r=localStorage.getItem(SAVE_KEY);if(r){const o=JSON.parse(r);if(o&&o.plants&&o.sites)return o;}}catch(e){}return fresh();}
export function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(S));}catch(e){}}
export function addLog(msg){S.log.unshift("Gün "+S.dayNo+": "+msg);S.log=S.log.slice(0,8);renderLog();}

// Seçili noktanın bilgisi: satın alınmış sahaysa kayıtlı bilgi, değilse anlık hesap (önbellekli)
let cacheKey=null, cacheVal=null;
export function selSite(){
  const s=S.sel;if(s.id&&S.sites[s.id])return S.sites[s.id];
  const k=s.lat.toFixed(4)+","+s.lon.toFixed(4);if(k!==cacheKey){cacheKey=k;cacheVal=describe(s.lat,s.lon);}return cacheVal;
}
