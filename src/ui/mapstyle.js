// --- Düz harita stili (MapLibre) ---
// Zemin: oyunla birlikte gelen kabartmalı görüntüler (dünya z4, Türkiye z7): derinliğe göre lacivert deniz, yüksekliğe
// göre yeşil kara, çöller kum, kutuplar buz rengi (scripts/build_relief.py). Böylece harita sunucusuna ulaşılamasa da
// harita çalışır. Çevrimiçiyken yakınlaşınca OpenFreeMap vektör katmanları (kıyı, nehir, yol, yer adları) ve AWS arazi
// verisinden kabartma gölgesi eklenir. Yazı tipleri (Noto Sans, SIL OFL) sitede barındırılır.
import landBorders from "../data/borders.json";
import countryLabels from "../data/country-labels.json";
import cities from "../data/cities.json";
import relief from "../data/relief.json";
import { PROTECTED } from "../data/protected.js";
import { GEO_LABELS } from "../data/geo-labels.js";

const base=new URL(import.meta.env.BASE_URL,location.href).href;
export const ONLINE=import.meta.env.VITE_OFFLINE_MAP!=="1";
const MAXLAT=85.0511;
const corners=([w,s,e,n])=>[[w,n],[e,n],[e,s],[w,s]];
const NAME=["coalesce",["get","name:tr"],["get","name:latin"],["get","name_en"],["get","name"]];
const HALO="#0B1626";
export const FONT={r:["Noto Sans Regular"],m:["Noto Sans Medium"],i:["Noto Sans Italic"]};
const DEM_ATTR='Arazi: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">AWS Terrain Tiles</a> (USGS, NOAA, <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener">diğerleri</a>)';

// Korunan alanlar: merkez ve yarıçaptan çember çokgen
function circle(lon,lat,rkm,n=48){const pts=[];for(let k=0;k<=n;k++){const a=k/n*2*Math.PI;pts.push([lon+rkm*Math.cos(a)/(111.32*Math.cos(lat*Math.PI/180)),lat+rkm*Math.sin(a)/110.57]);}return pts;}
const fc=features=>({type:"FeatureCollection",features});
const parks=fc(PROTECTED.map(([n,lat,lon,r])=>({type:"Feature",properties:{n},geometry:{type:"Polygon",coordinates:[circle(lon,lat,r)]}})));
const parkLabels=fc(PROTECTED.map(([n,lat,lon])=>({type:"Feature",properties:{n},geometry:{type:"Point",coordinates:[lon,lat]}})));
const borders={type:"Feature",properties:{},geometry:{type:"MultiLineString",coordinates:landBorders}};
const geoLabels=fc(GEO_LABELS.map(([n,lon,lat,t])=>({type:"Feature",properties:{n,t},geometry:{type:"Point",coordinates:[lon,lat]}})));
const cityPts=fc(cities.map(([n,a3,lat,lon,pop,mz,cap])=>({type:"Feature",properties:{n,pop,cap:cap?1:0},geometry:{type:"Point",coordinates:[lon,lat]}})));

// Yedek katmanlar (yalnızca vektör katmanlar yüklenemezse görünür) ve vektöre bağlı katmanlar
export const FALLBACK=["fb-borders","fb-country","fb-city-dot","fb-city","fb-town-dot","fb-town"];
export const VECTOR=["omt-water","omt-wood","omt-grass","omt-sand","omt-ice","omt-residential","omt-park","omt-building","omt-waterway","omt-road-street","omt-road-major","omt-road-primary","omt-road-minor","omt-border","omt-water-name","omt-country","omt-city-dot","omt-city","omt-town","omt-peak","omt-suburb","omt-poi"];

// yerel şehirler: başkentler 4. yakınlıktan, diğerleri büyüklüğüne göre 5–6'dan itibaren
const CITY_Z=["any",["==",["get","cap"],1],[">=",["get","pop"],1500000]];
const CITY_Z2=["all",["!=",["get","cap"],1],["<",["get","pop"],1500000]];
export function buildStyle(){
  const sources={
    "relief-world":{type:"image",url:base+"textures/relief-world.jpg",coordinates:corners(relief.world)},
    "relief-tr":{type:"image",url:base+"textures/relief-tr.webp",coordinates:corners(relief.tr)},
    borders:{type:"geojson",data:borders},"geo-labels":{type:"geojson",data:geoLabels},
    "country-labels":{type:"geojson",data:countryLabels},cities:{type:"geojson",data:cityPts},
    parks:{type:"geojson",data:parks},"park-labels":{type:"geojson",data:parkLabels}
  };
  if(ONLINE){
    sources.omt={type:"vector",url:"https://tiles.openfreemap.org/planet"};
    sources.dem={type:"raster-dem",tiles:["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],encoding:"terrarium",tileSize:256,maxzoom:13,attribution:DEM_ATTR};
  }
  const vis=on=>({visibility:on?"visible":"none"});
  const layers=[
    {id:"bg",type:"background",paint:{"background-color":"#0B1E52"}},
    {id:"relief-world",type:"raster",source:"relief-world",paint:{"raster-fade-duration":0,"raster-resampling":"linear"}},
    {id:"relief-tr",type:"raster",source:"relief-tr",paint:{"raster-fade-duration":0,"raster-opacity":["interpolate",["linear"],["zoom"],3.5,0,4.5,1]}},
  ];
  if(ONLINE)layers.push(
    // yakın planda kara düz renk, deniz ve göller vektörden: zemin görüntüsünün bulanık kıyısı yerine keskin kıyı.
    // Yalnızca vektör katmanları gerçekten yüklenince açılır (yoksa denizler de kara rengine boyanırdı).
    // yükseklik verisinden renk: yaklaştıkça deniz derinliği ve karada yükseklik ayrıntısı (zemin görüntüsüyle aynı renk skalası);
    // zemin görüntüsü altta kalır (çöl tonu ve veri gelmezse yedek)
    {id:"dem-color",type:"color-relief",source:"dem",minzoom:3.5,paint:{"color-relief-opacity":["interpolate",["linear"],["zoom"],3.5,0,5,0.82],
      "color-relief-color":["interpolate",["linear"],["elevation"],-7000,"#090F2C",-3500,"#0C1438",-1000,"#111D4C",-150,"#172860",-20,"#1C3270",-0.5,"#1F3676",0,"#386E66",400,"#3C6E62",1200,"#466C60",2500,"#606E68",4500,"#96A0AC"]}},
    // vektör kıyı ve göller yakın planda yarı saydam: keskin kıyı, derinlik tonları kaybolmaz
    {id:"omt-water",type:"fill",source:"omt","source-layer":"water",minzoom:6,paint:{"fill-color":"#16285E","fill-opacity":["interpolate",["linear"],["zoom"],6,0,8,0.55]}},
    {id:"omt-wood",type:"fill",source:"omt","source-layer":"landcover",minzoom:7,filter:["==",["get","class"],"wood"],paint:{"fill-color":"#285A5C","fill-opacity":0.55}},
    {id:"omt-sand",type:"fill",source:"omt","source-layer":"landcover",minzoom:7,filter:["==",["get","class"],"sand"],paint:{"fill-color":"#7E806E","fill-opacity":0.6}},
    {id:"omt-grass",type:"fill",source:"omt","source-layer":"landcover",minzoom:9,filter:["in",["get","class"],["literal",["grass","farmland","wetland"]]],paint:{"fill-color":["match",["get","class"],"wetland","#2A5E6E","farmland","#4A7464","#3F7466"],"fill-opacity":["interpolate",["linear"],["zoom"],9,0,11,0.35]}},
    {id:"omt-ice",type:"fill",source:"omt","source-layer":"landcover",minzoom:5,filter:["==",["get","class"],"ice"],paint:{"fill-color":"#687A9A","fill-opacity":0.8}},
    {id:"hillshade",type:"hillshade",source:"dem",minzoom:3.5,paint:{"hillshade-exaggeration":["interpolate",["linear"],["zoom"],3.5,0,5,0.45,10,0.55,14,0.7],"hillshade-shadow-color":"#05110B","hillshade-highlight-color":"#DCEFD4","hillshade-accent-color":"#183324"}},
    // denizde kabartma gölgesi yarı yarıya yumuşatılır (deniz tabanı verisindeki basamaklar beyaz çizgi gibi görünmesin)
    {id:"sea-damp",type:"color-relief",source:"dem",minzoom:3.5,paint:{"color-relief-opacity":["interpolate",["linear"],["zoom"],3.5,0,5,1],
      "color-relief-color":["interpolate",["linear"],["elevation"],-7000,"rgba(9,15,44,0.6)",-200,"rgba(20,34,84,0.55)",-1,"rgba(28,50,112,0.5)",0,"rgba(0,0,0,0)"]}},
    // yerleşim, park ve binalar: yakın planda kent dokusu
    {id:"omt-residential",type:"fill",source:"omt","source-layer":"landuse",minzoom:9,filter:["in",["get","class"],["literal",["residential","suburb","neighbourhood","commercial","industrial","retail"]]],
      paint:{"fill-color":["match",["get","class"],"industrial","#4E5868","#55606E"],"fill-opacity":["interpolate",["linear"],["zoom"],9,0,11,0.45,14,0.35]}},
    {id:"omt-park",type:"fill",source:"omt","source-layer":"park",minzoom:9,paint:{"fill-color":"#2E6A5A","fill-opacity":0.45}},
    {id:"omt-building",type:"fill",source:"omt","source-layer":"building",minzoom:13,paint:{"fill-color":"#7D8A9A","fill-outline-color":"#A6B3C2","fill-opacity":["interpolate",["linear"],["zoom"],13,0,14,0.75]}},
    {id:"omt-waterway",type:"line",source:"omt","source-layer":"waterway",minzoom:7,paint:{"line-color":"#24408A","line-width":["interpolate",["linear"],["zoom"],7,0.6,12,2,15,4]}},
    {id:"omt-road-street",type:"line",source:"omt","source-layer":"transportation",minzoom:13,filter:["in",["get","class"],["literal",["service","track","path","rail"]]],
      paint:{"line-color":["match",["get","class"],"rail","#C4B5A0","#8794A2"],"line-opacity":0.6,"line-width":["interpolate",["linear"],["zoom"],13,0.4,16,1.6]}},
    {id:"omt-road-minor",type:"line",source:"omt","source-layer":"transportation",minzoom:10,filter:["in",["get","class"],["literal",["secondary","tertiary","minor"]]],
      paint:{"line-color":"#9AA8B6","line-opacity":0.7,"line-width":["interpolate",["linear"],["zoom"],11,0.6,15,2.5]}},
    {id:"omt-road-primary",type:"line",source:"omt","source-layer":"transportation",minzoom:8,filter:["==",["get","class"],"primary"],
      paint:{"line-color":"#B4C1CE","line-opacity":0.8,"line-width":["interpolate",["linear"],["zoom"],8,0.7,14,3]}},
    {id:"omt-road-major",type:"line",source:"omt","source-layer":"transportation",minzoom:5,filter:["in",["get","class"],["literal",["motorway","trunk"]]],
      paint:{"line-color":"#D3DCE6","line-opacity":0.85,"line-width":["interpolate",["linear"],["zoom"],5,0.6,10,1.6,15,4]}},
    {id:"omt-border",type:"line",source:"omt","source-layer":"boundary",minzoom:3.5,filter:["all",["==",["get","admin_level"],2],["!=",["get","maritime"],1]],
      paint:{"line-color":"#A9BBCF","line-opacity":["interpolate",["linear"],["zoom"],3.5,0,4.5,0.3,8,0.45],"line-width":["interpolate",["linear"],["zoom"],4,0.6,8,1.1]}}
  );
  layers.push(
    {id:"fb-borders",type:"line",source:"borders",minzoom:3.5,layout:vis(!ONLINE),paint:{"line-color":"#A9BBCF","line-opacity":["interpolate",["linear"],["zoom"],3.5,0,4.5,0.3,8,0.45],"line-width":0.8}},
    {id:"parks",type:"fill",source:"parks",minzoom:5,paint:{"fill-color":"#C2364A","fill-opacity":0.15}},
    {id:"parks-line",type:"line",source:"parks",minzoom:5,paint:{"line-color":"#F06A7D","line-dasharray":[2,2],"line-width":1}}
  );
  // (hava katmanı burada araya eklenir: wxflat.js, "labels-start" öncesine)
  layers.push({id:"labels-start",type:"background",layout:{visibility:"none"},paint:{}});
  const lbl=(size,color="#FFFFFF")=>({"text-color":color,"text-halo-color":HALO,"text-halo-width":1.4,"text-halo-blur":0.3});
  // kıta adları aralıklı büyük harfle, okyanus ve deniz adları italik açık maviyle
  layers.push(
    {id:"geo-continent",type:"symbol",source:"geo-labels",maxzoom:3.3,filter:["==",["get","t"],"k"],layout:{"text-field":["get","n"],"text-font":FONT.m,"text-size":["interpolate",["linear"],["zoom"],0.6,11,3,16],
      "text-letter-spacing":0.45,"text-max-width":30,"text-allow-overlap":true},paint:{"text-color":"#D5DCE6","text-opacity":0.85,"text-halo-color":"rgba(8,14,30,0.6)","text-halo-width":1}},
    {id:"geo-ocean",type:"symbol",source:"geo-labels",maxzoom:6,filter:["==",["get","t"],"o"],layout:{"text-field":["get","n"],"text-font":FONT.i,"text-size":["interpolate",["linear"],["zoom"],0.6,11,4,15],
      "text-letter-spacing":0.1,"text-max-width":7},paint:{"text-color":"#8EA8E0","text-halo-color":"rgba(8,14,30,0.5)","text-halo-width":1}},
    {id:"geo-sea",type:"symbol",source:"geo-labels",minzoom:3,maxzoom:8,filter:["==",["get","t"],"d"],layout:{"text-field":["get","n"],"text-font":FONT.i,"text-size":["interpolate",["linear"],["zoom"],3,10,7,14],
      "text-letter-spacing":0.08,"text-max-width":8},paint:{"text-color":"#8EA8E0","text-halo-color":"rgba(8,14,30,0.5)","text-halo-width":1}}
  );
  if(ONLINE)layers.push(
    {id:"omt-water-name",type:"symbol",source:"omt","source-layer":"water_name",minzoom:7,filter:["in",["get","class"],["literal",["sea","lake","bay"]]],
      layout:{"text-field":NAME,"text-font":FONT.i,"text-size":["interpolate",["linear"],["zoom"],1,11,6,15],"text-letter-spacing":0.12,"text-max-width":8},paint:lbl(0,"#9DB8EA")},
    {id:"omt-country",type:"symbol",source:"omt","source-layer":"place",minzoom:3,maxzoom:8,filter:["==",["get","class"],"country"],
      layout:{"text-field":NAME,"text-font":FONT.m,"text-size":["interpolate",["linear"],["zoom"],2,11,6,16],"text-letter-spacing":0.08,"text-max-width":7,"symbol-sort-key":["get","rank"]},paint:lbl()},
    {id:"omt-city-dot",type:"circle",source:"omt","source-layer":"place",minzoom:5,maxzoom:13,filter:["==",["get","class"],"city"],
      paint:{"circle-radius":2.6,"circle-color":"#FFFFFF","circle-stroke-color":HALO,"circle-stroke-width":1}},
    {id:"omt-city",type:"symbol",source:"omt","source-layer":"place",minzoom:5,filter:["==",["get","class"],"city"],
      layout:{"text-field":NAME,"text-font":FONT.m,"text-size":["interpolate",["linear"],["zoom"],4,11,10,16],"text-anchor":"left","text-offset":[0.5,0],"symbol-sort-key":["get","rank"],"text-max-width":9},paint:lbl()},
    {id:"omt-town",type:"symbol",source:"omt","source-layer":"place",minzoom:8,filter:["in",["get","class"],["literal",["town","village"]]],
      layout:{"text-field":NAME,"text-font":FONT.r,"text-size":["interpolate",["linear"],["zoom"],8,10,13,14],"symbol-sort-key":["get","rank"],"text-max-width":9},paint:lbl()},
    {id:"omt-suburb",type:"symbol",source:"omt","source-layer":"place",minzoom:11,filter:["in",["get","class"],["literal",["suburb","quarter","neighbourhood","hamlet","isolated_dwelling"]]],
      layout:{"text-field":NAME,"text-font":FONT.r,"text-size":["interpolate",["linear"],["zoom"],11,10,15,13],"text-max-width":8},paint:lbl(0,"#D5DCE6")},
    // dağ zirveleri: ad ve yükseklik (m)
    {id:"omt-peak",type:"symbol",source:"omt","source-layer":"mountain_peak",minzoom:9,filter:["has","name"],
      layout:{"text-field":["format",NAME,{},["case",["has","ele"],["concat","\n",["to-string",["get","ele"]]," m"],""],{"font-scale":0.82}],
        "text-font":FONT.r,"text-size":11,"text-max-width":8,"symbol-sort-key":["get","rank"]},paint:lbl(0,"#E8DCC4")},
    // havalimanları
    {id:"omt-poi",type:"symbol",source:"omt","source-layer":"aerodrome_label",minzoom:9,
      layout:{"text-field":NAME,"text-font":FONT.r,"text-size":11,"text-max-width":9},paint:lbl(0,"#CFE0F5")}
  );
  layers.push(
    {id:"fb-country",type:"symbol",source:"country-labels",minzoom:3,maxzoom:7,layout:{...vis(!ONLINE),"text-field":["get","n"],"text-font":FONT.m,"text-size":["interpolate",["linear"],["zoom"],2,11,6,15],"symbol-sort-key":["get","r"],"text-max-width":7},paint:lbl()},
    {id:"fb-city-dot",type:"circle",source:"cities",minzoom:4,filter:CITY_Z,layout:vis(!ONLINE),paint:{"circle-radius":["case",["==",["get","cap"],1],3.2,2.4],"circle-color":"#FFFFFF","circle-stroke-color":HALO,"circle-stroke-width":1}},
    {id:"fb-city",type:"symbol",source:"cities",minzoom:4,filter:CITY_Z,layout:{...vis(!ONLINE),"text-field":["get","n"],"text-font":FONT.m,"text-size":["interpolate",["linear"],["zoom"],4,11,10,15],
      "text-anchor":"left","text-offset":[0.5,0],"symbol-sort-key":["-",0,["get","pop"]]},paint:lbl()},
    {id:"fb-town-dot",type:"circle",source:"cities",minzoom:6,filter:CITY_Z2,layout:vis(!ONLINE),paint:{"circle-radius":2.2,"circle-color":"#FFFFFF","circle-stroke-color":HALO,"circle-stroke-width":1}},
    {id:"fb-town",type:"symbol",source:"cities",minzoom:6,filter:CITY_Z2,layout:{...vis(!ONLINE),"text-field":["get","n"],"text-font":FONT.r,"text-size":12,"text-anchor":"left","text-offset":[0.5,0],"symbol-sort-key":["-",0,["get","pop"]]},paint:lbl()},
    {id:"park-labels",type:"symbol",source:"park-labels",minzoom:6,layout:{"text-field":["get","n"],"text-font":FONT.m,"text-size":12,"text-max-width":8},paint:lbl(0,"#FFD3D9")}
  );
  return {version:8,glyphs:base+"fonts/{fontstack}/{range}.pbf",sources,layers,sky:{}};
}
export { MAXLAT };
