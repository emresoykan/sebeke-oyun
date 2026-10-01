// --- Durum ---
// S: kalıcı oyun durumu (localStorage), D: günlük simülasyon verisi (kaydedilmez).
// ES modül bağlamaları dışarıdan yeniden atanamadığı için atamalar setS/setD ile yapılır.
import { SAVE_KEY, COLS, REG, MARKETS } from "./config.js";
import { renderLog } from "./ui/hud.js";

export let S, D={};
export function setS(v){S=v;}
export function setD(v){D=v;}

export function fresh(){const m={};MARKETS.forEach(k=>m[k]=REG[k].s0);return{money:150000,dayNo:1,hour:0,tiles:{},plants:[],mSolar:m,hist:[],last:null,log:[],won:false,sel:5*COLS+23};}
export function load(){try{const r=localStorage.getItem(SAVE_KEY);if(r){const o=JSON.parse(r);if(o&&o.plants)return o;}}catch(e){}return fresh();}
export function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(S));}catch(e){}}
export function addLog(msg){S.log.unshift("Gün "+S.dayNo+": "+msg);S.log=S.log.slice(0,8);renderLog();}
