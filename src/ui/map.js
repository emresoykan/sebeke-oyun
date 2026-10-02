// --- Harita: MapLibre 3D küre, NASA Blue Marble uydu mozaiği, Natural Earth sınırları ve şehirleri ---
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import countries from "../data/countries.json";
import countryLabels from "../data/country-labels.json";
import cities from "../data/cities.json";
import { PROTECTED } from "../data/protected.js";
import { TECH, SITE_MIN_KM } from "../config.js";
import { km } from "../world.js";
import { S } from "../state.js";
import { cssv } from "../utils.js";
import { siteMW } from "../sim.js";
import { render } from "./hud.js";
import { renderPanel } from "./panel.js";
import { modelLayer, syncModels, pickModel } from "./models.js";

maplibregl.setWorkerUrl(workerUrl);
const base=new URL(import.meta.env.BASE_URL,location.href).href;
// Glif dosyaları base64 JSON olarak saklanır (bazı statik sunucular .pbf servis etmez); eksik aralık boş döner
maplibregl.addProtocol("glyphs",async({url})=>{
  const [,stack,range]=url.match(/^glyphs:\/\/(.+)\/(\d+-\d+)$/);
  const r=await fetch(`${base}fonts/${encodeURIComponent(decodeURIComponent(stack))}/${range}.json`);
  if(!r.ok)return{data:new ArrayBuffer(0)};
  return{data:Uint8Array.from(atob(await r.json()),c=>c.charCodeAt(0)).buffer};
});
// Bantlar ters sırada eklenir: üstteki katman çakışmada önce yerleşir, böylece büyük şehir/ülke adları öncelik alır
const FONT=["Noto Sans Regular"], BANDS=[7,6,5,4,3,2,1,0];
const band=mz=>Math.min(7,Math.max(0,Math.floor(mz)));
const fc=features=>({type:"FeatureCollection",features});
const pt=(lon,lat,properties)=>({type:"Feature",properties,geometry:{type:"Point",coordinates:[lon,lat]}});
const STATUS={none:"rgba(255,255,255,.9)",pending:"#F2C94C",ok:"#FFFFFF",rejected:"#F06A7D"};

let map=null, ready=false;

function selectSite(id){const o=S.sites[id];S.sel={id,lat:o.lat,lon:o.lon};renderPanel();drawMap();render();}
// Seçili sahaya eğik açıyla yaklaş (3D görünüm)
export function flyToSite(id){const o=S.sites[id];if(map&&o)map.flyTo({center:[o.lon,o.lat],zoom:8.3,pitch:62,bearing:-28,duration:2200});}

function circle(lat,lon,r){const c=[];for(let i=0;i<=48;i++){const a=i/48*2*Math.PI;c.push([lon+r/(111.32*Math.cos(lat*Math.PI/180))*Math.cos(a),lat+r/110.57*Math.sin(a)]);}return c;}
const parksFC=fc(PROTECTED.map(([n,lat,lon,r])=>({type:"Feature",properties:{n},geometry:{type:"Polygon",coordinates:[circle(lat,lon,r)]}})));
const citiesFC=fc(cities.map(([n,a3,lat,lon,pop,mz,cap])=>pt(lon,lat,{n,cap,b:cap?Math.min(band(mz),2):band(mz),r:-pop})));
const labelsFC=fc(countryLabels.features.map(f=>({...f,properties:{...f.properties,b:band(f.properties.mz)}})));

function layers(){
  const L=[
    {id:"ocean",type:"background",paint:{"background-color":"#0B1D33"}},
    {id:"sat",type:"raster",source:"sat",paint:{"raster-fade-duration":150,"raster-brightness-max-transition":{duration:900},"raster-saturation-transition":{duration:900}}},
    {id:"night",type:"raster",source:"night",paint:{"raster-opacity":0,"raster-opacity-transition":{duration:900},"raster-fade-duration":150}},
    {id:"tr-fill",type:"fill",source:"countries",filter:["==",["get","a3"],"TUR"],paint:{"fill-color":"#C2364A","fill-opacity":0.12,"fill-opacity-transition":{duration:900}}},
    {id:"borders",type:"line",source:"countries",paint:{"line-color":"rgba(255,255,255,.55)","line-width":["interpolate",["linear"],["zoom"],0,0.4,4,0.9,8,1.6]}},
    {id:"tr-border",type:"line",source:"countries",filter:["==",["get","a3"],"TUR"],paint:{"line-color":"#F06A7D","line-width":["interpolate",["linear"],["zoom"],0,0.8,6,2]}},
    {id:"parks",type:"fill",source:"parks",paint:{"fill-color":"#C2364A","fill-opacity":0.22}},
    {id:"parks-line",type:"line",source:"parks",paint:{"line-color":"#F06A7D","line-width":1.2,"line-dasharray":[2,1]}},
    {id:"parks-label",type:"symbol",source:"parks",minzoom:5,layout:{"text-field":["get","n"],"text-font":FONT,"text-size":11},paint:{"text-color":"#FFD3D9","text-halo-color":"rgba(0,0,0,.7)","text-halo-width":1.2}}
  ];
  BANDS.forEach(b=>{
    L.push({id:"city-dot-"+b,type:"circle",source:"cities",minzoom:b+1,filter:["==",["get","b"],b],
      paint:{"circle-radius":["case",["==",["get","cap"],1],3.4,2.4],"circle-color":"#FFFFFF","circle-stroke-color":"rgba(0,0,0,.7)","circle-stroke-width":1}});
    L.push({id:"city-"+b,type:"symbol",source:"cities",minzoom:b+1,filter:["==",["get","b"],b],
      layout:{"text-field":["get","n"],"text-font":FONT,"text-size":["case",["==",["get","cap"],1],12.5,11],"text-variable-anchor":["left","right","top","bottom"],"text-radial-offset":0.55,"text-justify":"auto","text-max-width":9,"symbol-sort-key":["get","r"]},
      paint:{"text-color":"#FFFFFF","text-halo-color":"rgba(0,0,0,.75)","text-halo-width":1.3}});
  });
  BANDS.forEach(b=>L.push({id:"country-"+b,type:"symbol",source:"labels",minzoom:b,filter:["==",["get","b"],b],
    layout:{"text-field":["get","n"],"text-font":FONT,"text-size":["interpolate",["linear"],["zoom"],1,10,6,15],"text-letter-spacing":0.06,"text-transform":"uppercase","text-max-width":7,"symbol-sort-key":["get","r"]},
    paint:{"text-color":"rgba(255,255,255,.88)","text-halo-color":"rgba(0,0,0,.65)","text-halo-width":1.4}}));
  L.push(
    {id:"sites",type:"circle",source:"sites",paint:{"circle-radius":["interpolate",["linear"],["zoom"],1,5,6,9],"circle-color":["get","fill"],"circle-stroke-color":["get","ring"],"circle-stroke-width":2.5}},
    {id:"sites-label",type:"symbol",source:"sites",minzoom:3,filter:[">",["get","mw"],0],layout:{"text-field":["concat",["to-string",["get","mw"]]," MW"],"text-font":FONT,"text-size":11,"text-anchor":"top","text-offset":[0,1.1],"text-allow-overlap":true},paint:{"text-color":"#FFFFFF","text-halo-color":"rgba(0,0,0,.8)","text-halo-width":1.3}},
    {id:"sel-outer",type:"circle",source:"sel",paint:{"circle-radius":["interpolate",["linear"],["zoom"],1,9,6,13],"circle-color":"rgba(0,0,0,0)","circle-stroke-color":"#000","circle-stroke-width":3.5}},
    {id:"sel-inner",type:"circle",source:"sel",paint:{"circle-radius":["interpolate",["linear"],["zoom"],1,9,6,13],"circle-color":"rgba(0,0,0,0)","circle-stroke-color":"#FFF","circle-stroke-width":1.6}}
  );
  return L;
}

export function initMap(){
  map=new maplibregl.Map({
    container:"map",center:[S.sel.lon,S.sel.lat],zoom:innerWidth<600?1.5:2.4,minZoom:0.5,maxZoom:9,maxPitch:72,attributionControl:{compact:true},canvasContextAttributes:{antialias:true},
    style:{version:8,projection:{type:"globe"},glyphs:"glyphs://{fontstack}/{range}",
      sky:{"atmosphere-blend":["interpolate",["linear"],["zoom"],0,1,5,1,7,0]},
      sources:{
        sat:{type:"raster",tiles:[base+"tiles/{z}/{x}/{y}.jpg"],tileSize:256,maxzoom:4,attribution:"Görüntü: NASA Blue Marble"},
        night:{type:"raster",tiles:[base+"tiles-night/{z}/{x}/{y}.jpg"],tileSize:256,maxzoom:3,attribution:"Gece ışıkları: NASA Black Marble"},
        countries:{type:"geojson",data:countries,attribution:"Sınırlar ve şehirler: Natural Earth"},
        labels:{type:"geojson",data:labelsFC},cities:{type:"geojson",data:citiesFC},parks:{type:"geojson",data:parksFC},
        sites:{type:"geojson",data:fc([])},sel:{type:"geojson",data:fc([])}
      },
      layers:layers()}
  });
  map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),"top-right");
  map.addControl(new maplibregl.GlobeControl(),"top-right");
  map.on("load",()=>{ready=true;map.addLayer(modelLayer,"sel-outer");drawMap();document.querySelector("#map .maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");});
  map.on("click",e=>{
    const hit=pickModel(e.point);if(hit)return selectSite(hit); // 3D modele tıklandı
    const p=e.point,f=map.queryRenderedFeatures([[p.x-10,p.y-10],[p.x+10,p.y+10]],{layers:["sites"]});
    const lat=e.lngLat.lat,lon=((e.lngLat.lng+540)%360)-180;
    let id=f.length?f[0].properties.id:null;
    if(!id){let bd=SITE_MIN_KM;Object.entries(S.sites).forEach(([k,o])=>{const d=km(lat,lon,o.lat,o.lon);if(d<bd){bd=d;id=k;}});}
    S.sel=id?{id,lat:S.sites[id].lat,lon:S.sites[id].lon}:{id:null,lat:+lat.toFixed(4),lon:+lon.toFixed(4)};
    renderPanel();drawMap();render();
  });
  if(import.meta.env.DEV)window.__map=map;
}

// Oyun saatine göre gece/gündüz: dünyayı karart, gece şehir ışıklarını göster
let lastDay=-1;
export function setDaylight(day){
  if(!ready||Math.abs(day-lastDay)<0.01)return;lastDay=day;
  map.setPaintProperty("sat","raster-brightness-max",0.3+0.7*day);map.setPaintProperty("sat","raster-saturation",-0.35*(1-day));
  map.setPaintProperty("night","raster-opacity",0.92*Math.max(0,Math.min(1,(0.35-day)/0.35)));
  map.setPaintProperty("tr-fill","fill-opacity",0.03+0.09*day);
}

// Sahaları ve seçimi haritaya yansıt (eski kare çiziminin yerine)
export function drawMap(){
  if(!ready)return;
  const feats=Object.entries(S.sites).map(([id,o])=>{
    const ps=S.plants.filter(p=>p.t===id),top=ps.slice().sort((a,b)=>b.mw-a.mw)[0];
    return pt(o.lon,o.lat,{id,mw:siteMW(id),fill:top?cssv(TECH[top.k].c):"rgba(255,255,255,.25)",ring:STATUS[o.permit]});
  });
  map.getSource("sites").setData(fc(feats));
  map.getSource("sel").setData(fc([pt(S.sel.lon,S.sel.lat,{})]));
  syncModels();
}
