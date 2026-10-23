// Başarım işaretleri (?perf=1 ile perfprobe.js açınca toplanır; kapalıyken tek bir boş kontrol)
export function wp(name,t0){const W=window.__wp;if(!W)return;const d=performance.now()-t0;const e=W[name]||(W[name]={n:0,t:0,max:0});e.n++;e.t+=d;if(d>e.max)e.max=d;}
