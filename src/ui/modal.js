// --- Pencere sırası: gün başında olay kartı ve GÖP masası art arda açılır; açık pencere varken oyun bekler ---
const hold=v=>window.dispatchEvent(new CustomEvent(v?"sebeke:hold":"sebeke:release"));
const q=[];let busy=false;
// open(done): pencereyi açar, kapanınca done() çağırır
export function enqueue(open){q.push(open);if(!busy)next();}
function next(){
  const f=q.shift();if(!f){busy=false;hold(false);return;}
  busy=true;hold(true);
  let fin=false;f(()=>{if(fin)return;fin=true;setTimeout(next,0);});
}
export const modalBusy=()=>busy;
