// Oyun sabitleri, piyasalar ve teknoloji tanımları
export const SAVE_KEY="sebeke-world-v2", COLS=40, ROWS=20, TS=18, BLOCK=5, TILE_LIMIT=40, GOAL=5e6, EFF=0.88, IMB=0.12;
export const BASE=[2600,2450,2350,2300,2300,2400,2700,2950,3050,3000,2900,2850,2800,2800,2850,2950,3100,3300,3400,3400,3300,3150,2950,2750].map(x=>x/35);

export const REG={
  T:{n:"Türkiye",mult:1.00,s0:0.60,land:20000},
  E:{n:"Avrupa",mult:1.15,s0:0.70,land:40000},
  N:{n:"Kuzey Amerika",mult:0.85,s0:0.50,land:25000},
  S:{n:"Güney Amerika",mult:0.90,s0:0.40,land:12000},
  F:{n:"Afrika",mult:1.05,s0:0.20,land:8000},
  M:{n:"Orta Doğu",mult:0.80,s0:0.50,land:10000},
  A:{n:"Asya",mult:0.95,s0:0.60,land:15000},
  O:{n:"Okyanusya",mult:1.00,s0:0.80,land:20000},
  G:{n:"Grönland"}, X:{n:"Antarktika"}
};
export const MARKETS=["T","E","N","S","F","M","A","O"];
export const TECH={
  ges:{n:"GES",long:"Güneş (GES)",capex:55000,opex:100,c:"--solar"},
  res:{n:"RES",long:"Rüzgâr karada (RES)",capex:140000,opex:250,c:"--wind"},
  off:{n:"Offshore",long:"Rüzgâr denizde (offshore RES)",capex:260000,opex:500,c:"--wind"},
  hes:{n:"HES",long:"Hidroelektrik (HES)",capex:180000,opex:200,c:"--hydro"},
  batt:{n:"Batarya",long:"Batarya 5 MW / 10 MWh",capex:12000,opex:50,c:"--batt"}
};
export const TER_N={pl:"Ova",f:"Orman",m:"Dağlık",d:"Çöl",p:"Korunan alan",i:"Buz örtüsü"};
