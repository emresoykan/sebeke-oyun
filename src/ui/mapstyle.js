// --- Düz harita stili (MapLibre) ---
// Zemin: oyunla birlikte gelen kabartmalı görüntüler (dünya z4, Türkiye z7): derinliğe göre lacivert deniz, yüksekliğe
// göre yeşil kara, çöller kum, kutuplar buz rengi (scripts/build_relief.py). Böylece harita sunucusuna ulaşılamasa da
// harita çalışır. Çevrimiçiyken yakınlaşınca OpenFreeMap vektör katmanları (kıyı, nehir, yol, yer adları) ve AWS arazi
// verisinden kabartma gölgesi eklenir. Yazı tipleri (Noto Sans, SIL OFL) sitede barındırılır.
import countries from "../data/countries.json";
import landBorders from "../data/borders.json";
import countryLabels from "../data/country-labels.json";
import cities from "../data/cities.json";
import relief from "../data/relief.json";
import { PROTECTED } from "../data/protected.js";

const base=new URL(import.meta.env.BASE_URL,location.href).href;
export const ONLINE=import.meta.env.VITE_OFFLINE_MAP!=="1";
const MAXLAT=85.0511;
const corners=([w,s,e,n])=>[[w,n],[e,n],[e,s],[w,s]];
const NAME=["coalesce",["get","name:tr"],["get","name:latin"],["get","name_en"],["get","name"]];
const HALO="#0B1626";
export const FONT={r:["Noto Sans Regular"],m:["Noto Sans Medium"],i:["Noto Sans Italic"]};
const DEM_ATTR='Arazi: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">AWS Terrain Tiles</a> (United States 3DEP, global GMTED2010 ve SRTM: U.S. Geological Survey; ETOPO1: NOAA; <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener">tüm kaynaklar</a>)';

// Korunan alanlar: merkez ve yarıçaptan çember çokgen
function circle(lon,lat,rkm,n=48){const pts=[];for(let k=0;k<=n;k++){const a=k/n*2*Math.PI;pts.push([lon+rkm*Math.cos(a)/(111.32*Math.cos(lat*Math.PI/180)),lat+rkm*Math.sin(a)/110.57]);}return pts;}
const fc=features=>({type:"FeatureCollection",features});
const parks=fc(PROTECTED.map(([n,lat,lon,r])=>({type:"Feature",properties:{n},geometry:{type:"Polygon",coordinates:[circle(lon,lat,r)]}})));
const parkLabels=fc(PROTECTED.map(([n,lat,lon])=>({type:"Feature",properties:{n},geometry:{type:"Point",coordinates:[lon,lat]}})));
const turkey=fc(countries.features.filter(f=>f.properties.a3==="TUR"));
const borders={type:"Feature",properties:{},geometry:{type:"MultiLineString",coordinates:landBorders}};
const cityPts=fc(cities.map(([n,a3,lat,lon,pop,mz,cap])=>({type:"Feature",properties:{n,pop,cap:cap?1:0},geometry:{type:"Point",coordinates:[lon,lat]}})));

// Yedek katmanlar (yalnızca vektör katmanlar yüklenemezse görünür) ve vektöre bağlı katmanlar
export const FALLBACK=["fb-borders","fb-country","fb-city-dot","fb-city"];
export const VECTOR=["omt-water","omt-wood","omt-sand","omt-ice","omt-waterway","omt-road-major","omt-road-primary","omt-road-minor","omt-border","omt-water-name","omt-country","omt-city-dot","omt-city","omt-town"];

export function buildStyle(){
  const sources={
    "relief-world":{type:"image",url:base+"textures/relief-world.jpg",coordinates:corners(relief.world)},
    "relief-tr":{type:"image",url:base+"textures/relief-tr.webp",coordinates:corners(relief.tr)},
    turkey:{type:"geojson",data:turkey},borders:{type:"geojson",data:borders},
    "country-labels":{type:"geojson",data:countryLabels},cities:{type:"geojson",data:cityPts},
    parks:{type:"geojson",data:parks},"park-labels":{type:"geojson",data:parkLabels}
  };
  if(ONLINE){
    sources.omt={type:"vector",url:"https://tiles.openfreemap.org/planet"};
    sources.dem={type:"raster-dem",tiles:["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],encoding:"terrarium",tileSize:256,maxzoom:12,attribution:DEM_ATTR};
  }
  const vis=on=>({visibility:on?"visible":"none"});
  const layers=[
    {id:"bg",type:"background",paint:{"background-color":"#0B1E52"}},
    {id:"relief-world",type:"raster",source:"relief-world",paint:{"raster-fade-duration":0,"raster-resampling":"linear"}},
    {id:"relief-tr",type:"raster",source:"relief-tr",paint:{"raster-fade-duration":0,"raster-opacity":["interpolate",["linear"],["zoom"],3.5,0,4.5,1]}},
  ];
  if(ONLINE)layers.push(
    // yakın planda kıyı ve göller vektörden: zemin görüntüsünün bulanık kıyısını keskinleştirir
    {id:"omt-water",type:"fill",source:"omt","source-layer":"water",minzoom:5,paint:{"fill-color":"#17367C","fill-opacity":["interpolate",["linear"],["zoom"],5,0,7,1]}},
    {id:"omt-wood",type:"fill",source:"omt","source-layer":"landcover",minzoom:7,filter:["==",["get","class"],"wood"],paint:{"fill-color":"#2C5E40","fill-opacity":0.35}},
    {id:"omt-sand",type:"fill",source:"omt","source-layer":"landcover",minzoom:7,filter:["==",["get","class"],"sand"],paint:{"fill-color":"#C8B68A","fill-opacity":0.45}},
    {id:"omt-ice",type:"fill",source:"omt","source-layer":"landcover",minzoom:5,filter:["==",["get","class"],"ice"],paint:{"fill-color":"#E3EAF0","fill-opacity":0.8}},
    {id:"hillshade",type:"hillshade",source:"dem",minzoom:5,paint:{"hillshade-exaggeration":0.4,"hillshade-shadow-color":"#05110B","hillshade-highlight-color":"#DCEFD4","hillshade-accent-color":"#183324"}},
    {id:"omt-waterway",type:"line",source:"omt","source-layer":"waterway",minzoom:7,paint:{"line-color":"#1E4C9C","line-width":["interpolate",["linear"],["zoom"],7,0.6,12,2]}},
    {id:"omt-road-minor",type:"line",source:"omt","source-layer":"transportation",minzoom:11,filter:["in",["get","class"],["literal",["secondary","tertiary","minor"]]],
      paint:{"line-color":"#9AA8B6","line-opacity":0.7,"line-width":["interpolate",["linear"],["zoom"],11,0.6,15,2.5]}},
    {id:"omt-road-primary",type:"line",source:"omt","source-layer":"transportation",minzoom:8,filter:["==",["get","class"],"primary"],
      paint:{"line-color":"#B4C1CE","line-opacity":0.8,"line-width":["interpolate",["linear"],["zoom"],8,0.7,14,3]}},
    {id:"omt-road-major",type:"line",source:"omt","source-layer":"transportation",minzoom:5,filter:["in",["get","class"],["literal",["motorway","trunk"]]],
      paint:{"line-color":"#D3DCE6","line-opacity":0.85,"line-width":["interpolate",["linear"],["zoom"],5,0.6,10,1.6,15,4]}},
    {id:"omt-border",type:"line",source:"omt","source-layer":"boundary",filter:["all",["==",["get","admin_level"],2],["!=",["get","maritime"],1]],
      paint:{"line-color":"#E6EDF5","line-opacity":0.55,"line-width":["interpolate",["linear"],["zoom"],2,0.6,8,1.4]}}
  );
  layers.push(
    {id:"fb-borders",type:"line",source:"borders",layout:vis(!ONLINE),paint:{"line-color":"#E6EDF5","line-opacity":0.55,"line-width":1}},
    {id:"turkey",type:"line",source:"turkey",maxzoom:9,paint:{"line-color":"#F06A7D","line-width":2,"line-opacity":["interpolate",["linear"],["zoom"],7,1,9,0]}},
    {id:"parks",type:"fill",source:"parks",minzoom:5,paint:{"fill-color":"#C2364A","fill-opacity":0.22}},
    {id:"parks-line",type:"line",source:"parks",minzoom:5,paint:{"line-color":"#F06A7D","line-dasharray":[2,2],"line-width":1}}
  );
  // (hava katmanı burada araya eklenir: wxflat.js, "labels-start" öncesine)
  layers.push({id:"labels-start",type:"background",layout:{visibility:"none"},paint:{}});
  const lbl=(size,color="#FFFFFF")=>({"text-color":color,"text-halo-color":HALO,"text-halo-width":1.4,"text-halo-blur":0.3});
  if(ONLINE)layers.push(
    {id:"omt-water-name",type:"symbol",source:"omt","source-layer":"water_name",filter:["in",["get","class"],["literal",["ocean","sea"]]],
      layout:{"text-field":NAME,"text-font":FONT.i,"text-size":["interpolate",["linear"],["zoom"],1,11,6,15],"text-letter-spacing":0.12,"text-max-width":8},paint:lbl(0,"#9DB8EA")},
    {id:"omt-country",type:"symbol",source:"omt","source-layer":"place",maxzoom:8,filter:["==",["get","class"],"country"],
      layout:{"text-field":NAME,"text-font":FONT.m,"text-size":["interpolate",["linear"],["zoom"],2,11,6,16],"text-letter-spacing":0.08,"text-max-width":7,"symbol-sort-key":["get","rank"]},paint:lbl()},
    {id:"omt-city-dot",type:"circle",source:"omt","source-layer":"place",minzoom:4,maxzoom:13,filter:["==",["get","class"],"city"],
      paint:{"circle-radius":2.6,"circle-color":"#FFFFFF","circle-stroke-color":HALO,"circle-stroke-width":1}},
    {id:"omt-city",type:"symbol",source:"omt","source-layer":"place",minzoom:4,filter:["==",["get","class"],"city"],
      layout:{"text-field":NAME,"text-font":FONT.m,"text-size":["interpolate",["linear"],["zoom"],4,11,10,16],"text-anchor":"left","text-offset":[0.5,0],"symbol-sort-key":["get","rank"],"text-max-width":9},paint:lbl()},
    {id:"omt-town",type:"symbol",source:"omt","source-layer":"place",minzoom:8,filter:["in",["get","class"],["literal",["town","village"]]],
      layout:{"text-field":NAME,"text-font":FONT.r,"text-size":["interpolate",["linear"],["zoom"],8,10,13,14],"symbol-sort-key":["get","rank"],"text-max-width":9},paint:lbl()}
  );
  layers.push(
    {id:"fb-country",type:"symbol",source:"country-labels",minzoom:1.5,maxzoom:7,layout:{...vis(!ONLINE),"text-field":["get","n"],"text-font":FONT.m,"text-size":["interpolate",["linear"],["zoom"],2,11,6,15],"symbol-sort-key":["get","r"],"text-max-width":7},paint:lbl()},
    {id:"fb-city-dot",type:"circle",source:"cities",minzoom:3.5,layout:vis(!ONLINE),paint:{"circle-radius":["case",["==",["get","cap"],1],3.2,2.4],"circle-color":"#FFFFFF","circle-stroke-color":HALO,"circle-stroke-width":1}},
    {id:"fb-city",type:"symbol",source:"cities",minzoom:3.5,layout:{...vis(!ONLINE),"text-field":["get","n"],"text-font":FONT.m,"text-size":["interpolate",["linear"],["zoom"],4,11,10,15],
      "text-anchor":"left","text-offset":[0.5,0],"symbol-sort-key":["-",0,["get","pop"]]},paint:lbl()},
    {id:"park-labels",type:"symbol",source:"park-labels",minzoom:6,layout:{"text-field":["get","n"],"text-font":FONT.m,"text-size":12,"text-max-width":8},paint:lbl(0,"#FFD3D9")}
  );
  return {version:8,glyphs:base+"fonts/{fontstack}/{range}.pbf",sources,layers,sky:{}};
}
export { MAXLAT };
