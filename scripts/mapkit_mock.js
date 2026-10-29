// Sahte MapKit JS (yalnızca test; scripts/test_mapkit.cjs bunu cdn.apple-mapkit.com/mk/5.x.x/mapkit.js yerine sunar).
// Apple'ın betiğine test ortamından erişilemediği için src/ui/mapkit.js'in kullandığı arayüzün küçük bir taklidi: harita,
// koordinat dönüşümü (Mercator), işaretler, daire ve karo katmanları, olaylar. Kamera değişince taban karoları <img> olarak
// https://cdn1.apple-mapkit.com/ti/tile?... adresinden istenir (test bu adresleri gecikmeli PNG ile yanıtlar; ?perf=1
// ölçümü bunları görür). Karo katmanlarının (TileOverlay) karo işlevi görünür karolar için çağrılır; reload çağrıları
// window.__mkmock.reloads'a {i: addTileOverlays sırası, t: zaman} olarak yazılır, kamera hareketleri moves'a, katman başına
// verilen (boş olmayan) karo sayısı loads'a.
(()=>{
const mock=window.__mkmock={reloads:[],moves:[],maps:[],loads:{}};
const events=o=>{const ev={};o.addEventListener=(n,f)=>{(ev[n]=ev[n]||[]).push(f);};o.removeEventListener=(n,f)=>{ev[n]=(ev[n]||[]).filter(x=>x!==f);};
  o._emit=(n,e={})=>(ev[n]||[]).slice().forEach(f=>f(e));};
const merc=lat=>Math.log(Math.tan(Math.PI/4+Math.max(-85,Math.min(85,lat))*Math.PI/360));
const imerc=m=>(2*Math.atan(Math.exp(m))-Math.PI/2)*180/Math.PI;
class Coordinate{constructor(a,b){this.latitude=a;this.longitude=b;}}
class Style{constructor(o){Object.assign(this,o);}}
class CircleOverlay{constructor(c,r,o){this.coordinate=c;this.radius=r;Object.assign(this,o);}}
class Annotation{
  constructor(c,f,o={}){events(this);this._c=c;this.factory=f;Object.assign(this,o);this.selected=false;this.enabled=true;this.visible=true;this.map=null;}
  get coordinate(){return this._c;} set coordinate(c){this._c=c;if(this.map)this.map._place(this);}
}
class TileOverlay{
  constructor(fn,o={}){this.fn=fn;this.opacity=1;this.minimumZ=0;this.maximumZ=20;Object.assign(this,o);this.map=null;}
  reload(){const m=this.map;mock.reloads.push({i:m?m.tov.indexOf(this):-1,t:performance.now()});if(m)m._overlayTiles(this);}
}
class Map{
  constructor(el,o={}){events(this);this.el=el;this._h=1e7;this._c=o.center||new Coordinate(0,0);this.mapType=o.mapType;this.ann=[];this.tov=[];this.seen=new Set();mock.maps.push(this);
    if(getComputedStyle(el).position==="static")el.style.position="relative";
    this.layer=document.createElement("div");this.layer.className="mkmock";Object.assign(this.layer.style,{position:"absolute",inset:"0",overflow:"hidden",background:"#2b2d31"});el.appendChild(this.layer);
    el.addEventListener("click",e=>this._emit("single-tap",{pointOnPage:new DOMPoint(e.pageX,e.pageY)}));
    setTimeout(()=>this._tiles(),0);}
  get cameraDistance(){return this._h;} set cameraDistance(h){this._h=h;this._changed();}
  get center(){return this._c;} set center(c){this._c=c;this._changed();}
  get z(){return Math.log2(2.6e7/this._h);}
  get region(){const r=this.el.getBoundingClientRect(),k=256*2**this.z/360;return {center:this._c,span:{longitudeDelta:r.width/k,latitudeDelta:Math.min(170,r.height/k)}};}
  convertCoordinateToPointOnPage(c){const r=this.el.getBoundingClientRect(),K=256*2**this.z;
    return new DOMPoint(r.left+scrollX+r.width/2+(c.longitude-this._c.longitude)/360*K,r.top+scrollY+r.height/2-(merc(c.latitude)-merc(this._c.latitude))/(2*Math.PI)*K);}
  convertPointOnPageToCoordinate(p){const r=this.el.getBoundingClientRect(),K=256*2**this.z;
    return new Coordinate(imerc(merc(this._c.latitude)-(p.y-r.top-scrollY-r.height/2)*2*Math.PI/K),this._c.longitude+(p.x-r.left-scrollX-r.width/2)*360/K);}
  addOverlays(){} removeOverlays(){} addOverlay(){} removeOverlay(){}
  addAnnotation(a){a.map=this;this.ann.push(a);a.el=a.factory(a._c,{});a.el.style.position="absolute";this.layer.appendChild(a.el);
    a.el.addEventListener("click",e=>{if(!a.enabled)return;e.stopPropagation();a.selected=true;a._emit("select",{});});this._place(a);}
  addAnnotations(l){l.forEach(a=>this.addAnnotation(a));}
  removeAnnotation(a){a.map=null;this.ann=this.ann.filter(x=>x!==a);if(a.el)a.el.remove();}
  _place(a){if(!a.el)return;const r=this.el.getBoundingClientRect(),p=this.convertCoordinateToPointOnPage(a._c);
    a.el.style.left=(p.x-r.left-scrollX)+"px";a.el.style.top=(p.y-r.top-scrollY)+"px";a.el.style.display=a.visible===false?"none":"";}
  addTileOverlays(l){l.forEach(o=>{o.map=this;this.tov.push(o);this._overlayTiles(o);});}
  // görünür karolar (merkez karonun çevresinde 5×4)
  _vis(){const z=Math.max(0,Math.min(20,Math.round(this.z))),n=2**z,cx=Math.floor((this._c.longitude+180)/360*n),cy=Math.floor((1-merc(this._c.latitude)/Math.PI)/2*n),t=[];
    for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=1;dy++){const y=cy+dy;if(y<0||y>=n)continue;t.push([((cx+dx)%n+n)%n,y,z]);}return t;}
  _overlayTiles(o){const n=this.tov.indexOf(o);for(const [x,y,z] of this._vis()){if(z<o.minimumZ||z>o.maximumZ)continue;const u=o.fn(x,y,z);if(u){mock.loads[n]=(mock.loads[n]||0)+1;const i=new Image();i.src=u;}}}
  _tiles(){if(!this.layer.isConnected)return;
    for(const [x,y,z] of this._vis()){const k=`${z}/${x}/${y}`;if(this.seen.has(k))continue;this.seen.add(k);
      const i=new Image();i.src=`https://cdn1.apple-mapkit.com/ti/tile?style=7&size=1&scale=2&z=${z}&x=${x}&y=${y}`;}
    this.tov.forEach(o=>this._overlayTiles(o));}
  _changed(){this.ann.forEach(a=>this._place(a));this._tiles();}
  _animate(apply){mock.moves.push({s:performance.now()});this._emit("region-change-start");
    let i=0;const step=()=>{i++;apply(i/6);this._changed();if(i<6)setTimeout(step,100);else{mock.moves[mock.moves.length-1].e=performance.now();this._emit("region-change-end");}};setTimeout(step,100);}
  setCameraDistanceAnimated(h,anim){const h0=this._h;if(!anim){this.cameraDistance=h;this._emit("region-change-start");this._emit("region-change-end");return;}
    this._animate(f=>{this._h=h0*(h/h0)**f;});}
  setCenterAnimated(c,anim){const c0=this._c;if(!anim){this.center=c;this._emit("region-change-start");this._emit("region-change-end");return;}
    this._animate(f=>{this._c=new Coordinate(c0.latitude+(c.latitude-c0.latitude)*f,c0.longitude+(c.longitude-c0.longitude)*f);});}
  destroy(){this.layer.remove();this.ann=[];this.tov=[];}
}
Map.MapTypes={Standard:"standard",MutedStandard:"mutedStandard",Hybrid:"hybrid",Satellite:"satellite"};
Map.ColorSchemes={Light:"light",Dark:"dark"};
Annotation.DisplayPriority={Low:250,High:750,Required:1000};
Annotation.CollisionMode={Rectangle:"rectangle",Circle:"circle",None:"none"};
const mk={Map,Coordinate,Annotation,TileOverlay,CircleOverlay,Style,FeatureVisibility:{Adaptive:"adaptive",Hidden:"hidden",Visible:"visible"},
  init(o){o.authorizationCallback(()=>fetch("https://cdn.apple-mapkit.com/ma/bootstrap?apiVersion=2").then(r=>r.json())
    .then(()=>mk._emit("configuration-change",{status:"Initialized"})).catch(()=>mk._emit("error",{status:"Unauthorized"})));}};
events(mk);window.mapkit=mk;
})();
