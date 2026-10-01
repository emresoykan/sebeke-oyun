// --- Harita (kaba, 9 derecelik kareler) ---
import { COLS, ROWS, MARKETS } from "./config.js";

const LAND=[[0,13,17,"G"],[1,6,12,"N"],[1,13,17,"G"],[1,21,21,"E"],[1,29,33,"A"],
[2,2,13,"N"],[2,14,16,"G"],[2,17,17,"E"],[2,20,23,"E"],[2,24,39,"A"],
[3,3,9,"N"],[3,11,14,"N"],[3,19,23,"E"],[3,24,38,"A"],
[4,6,14,"N"],[4,19,24,"E"],[4,25,35,"A"],
[5,6,12,"N"],[5,19,22,"E"],[5,23,24,"T"],[5,25,25,"M"],[5,26,35,"A"],
[6,7,11,"N"],[6,19,21,"F"],[6,23,23,"F"],[6,24,27,"M"],[6,28,35,"A"],
[7,8,10,"N"],[7,18,23,"F"],[7,24,26,"M"],[7,28,33,"A"],
[8,9,10,"N"],[8,11,13,"S"],[8,18,24,"F"],[8,25,25,"M"],[8,28,28,"A"],[8,30,32,"A"],[8,34,34,"A"],
[9,11,15,"S"],[9,19,25,"F"],[9,31,34,"A"],
[10,11,16,"S"],[10,21,24,"F"],[10,31,35,"A"],[10,36,36,"O"],
[11,11,16,"S"],[11,21,25,"F"],[11,34,37,"O"],
[12,12,15,"S"],[12,21,25,"F"],[12,33,37,"O"],
[13,12,14,"S"],[13,22,23,"F"],[13,33,37,"O"],
[14,12,13,"S"],[14,36,36,"O"],[14,39,39,"O"],
[15,12,13,"S"],[15,38,39,"O"],[16,12,13,"S"],[17,13,13,"X"],[18,0,39,"X"],[19,0,39,"X"]];
const TER=[[3,5,9,"f"],[3,26,34,"f"],[9,12,14,"f"],[10,12,15,"f"],[9,21,23,"f"],[10,21,22,"f"],[9,31,33,"f"],[10,32,34,"f"],
[4,7,7,"m"],[5,7,8,"m"],[10,11,11,"m"],[11,11,11,"m"],[13,12,12,"m"],[4,21,21,"m"],[6,29,30,"m"],[5,24,24,"m"],[2,20,20,"m"],[8,24,24,"m"],[7,31,31,"m"],[15,38,38,"m"],[5,27,28,"m"],
[6,20,21,"d"],[7,19,22,"d"],[6,24,25,"d"],[7,24,25,"d"],[12,34,36,"d"],[13,34,35,"d"],[12,12,12,"d"],[12,21,22,"d"],[4,31,32,"d"],[6,7,8,"d"],[6,26,26,"d"],
[9,13,13,"p"],[9,22,22,"p"],[3,30,30,"p"],[11,36,36,"p"]];

export const T=[];
(function build(){
  const reg=Array(COLS*ROWS).fill(null), ter=Array(COLS*ROWS).fill(null);
  LAND.forEach(([r,a,b,x])=>{for(let c=a;c<=b;c++)reg[r*COLS+c]=x;});
  TER.forEach(([r,a,b,x])=>{for(let c=a;c<=b;c++){const i=r*COLS+c;if(reg[i])ter[i]=x;}});
  const nb=i=>{const r=Math.floor(i/COLS),c=i%COLS,o=[];for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;const rr=r+dr,cc=(c+dc+COLS)%COLS;if(rr>=0&&rr<ROWS)o.push(rr*COLS+cc);}return o;};
  for(let i=0;i<COLS*ROWS;i++){
    const r=Math.floor(i/COLS),c=i%COLS,lat=90-9*r-4.5,lon=-180+9*c+4.5,R=reg[i];
    const t={i,r,c,lat,lon,reg:R,sea:!R};
    if(R){
      t.ter=(R==="G"||R==="X")?"i":(ter[i]||"pl");
      t.mreg=MARKETS.includes(R)?R:null;
      const coast=nb(i).some(j=>!reg[j]);
      t.solar=Math.max(0.15,Math.min(1,Math.min(1,Math.max(0.2,1.05-Math.abs(lat)/75))+(t.ter==="d"?0.15:0)-(t.ter==="f"?0.15:0)));
      t.wind=Math.max(0.15,Math.min(0.95,0.35+(Math.abs(lat)>=40?0.25:0)+(coast?0.12:0)+(t.ter==="m"?0.08:0)-(t.ter==="f"?0.1:0)));
      t.hydro=t.ter==="m"?0.8:0;
    }else{
      const lands=nb(i).map(j=>reg[j]).filter(x=>x&&MARKETS.includes(x));
      t.shallow=lands.length>0&&Math.abs(lat)<66;
      if(t.shallow){t.mreg=lands.includes("T")?"T":lands.includes("E")?"E":lands[0];t.wind=0.7+(Math.abs(lat)>=40?0.15:0);t.solar=0;t.hydro=0;}
    }
    T.push(t);
  }
})();
