// --- Saha görselinde hava ve mevsim: hafif yakın görünüm (closeview.js) ve haritadaki tesis görüntüsü ---
// Sahanın o saatteki havasından yağış türü (yağmur, kar, fırtına) ve yoğunluğu, takvimden mevsim (güney yarıkürede
// ters; dönenceler arasında mevsim yok: yaz zemini), kardan zemin ve panellerin örtülü olup olmadığı (o.snowDays: kar
// GES panellerini 2 gün örter, sim.js) bulunur. Çizim yalnızca CSS'tir (style.css .cv[data-wx], .cv[data-season]).
import { CAL, seasonOf } from "../calendar.js";
import { siteWx } from "../wxsite.js";

// kind: "storm" | "snow" | "rain" | "" ; amt: yağış yoğunluğu 0–1 ; season: spr|sum|aut|win ; snowy: zemin karla kaplı
export function fxOf(o,w=siteWx(o)){
  const kind=w.storm>0.35?"storm":w.snow?"snow":w.rain>0.25?"rain":"";
  return {kind,amt:kind?Math.min(1,0.45+w.rain*0.7):0,season:Math.abs(o.lat)<23?"sum":seasonOf(CAL.date,o.lat).k,snowy:o.snowDays>0||kind==="snow"};
}
