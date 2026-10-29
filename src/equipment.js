// --- Ekipman katalogu ---
// Her teknoloji için üç kademe. Markalar ve modeller kurgusaldır; değerler oyun dengesi için temsilidir.
// capex/opex: teknolojinin temel maliyetine çarpan; perf: üretime (GES/RES/deniz), suyun elektriğe dönüşümüne (HES),
// rezervuar ısısının dönüşümüne (JES) veya yakıt verimine (BES) çarpan; avail: bir günün arızasız geçme olasılığı; rte: bataryada şarj-deşarj verimi.
// Denge: ekonomi kademesi aynı parayla daha çok MW kurdurur ama az üretir ve sık arızalanır; premium
// pahalıdır ama 40 MW'lık saha sınırında MW başına en çok üretimi verir.
import { TECH } from "./config.js";
import { spec } from "./profile.js";
import { factor } from "./mods.js";

export const TIERS={eco:"Ekonomi",std:"Standart",pre:"Premium"};
export const TIER_ORDER=["eco","std","pre"];

export const EQUIP={
  ges:{
    eco:{brand:"Helion",model:"Poly 330",spec:"Polikristal panel, 330 W, sabit montaj",capex:0.80,perf:0.86,avail:0.97,opex:1.10},
    std:{brand:"Solara",model:"Mono PERC 450",spec:"Monokristal PERC panel, 450 W",capex:1.00,perf:1.00,avail:0.985,opex:1.00},
    pre:{brand:"Lumina",model:"TOPCon Bifacial 620",spec:"Çift yüzlü TOPCon panel, 620 W, tek eksen takip",capex:1.22,perf:1.12,avail:0.995,opex:0.95}
  },
  res:{
    eco:{brand:"Zephyra",model:"Z-120",spec:"Rotor 120 m, göbek 90 m",capex:0.82,perf:0.88,avail:0.95,opex:1.15},
    std:{brand:"Anemos",model:"A-150",spec:"Rotor 150 m, göbek 110 m",capex:1.00,perf:1.00,avail:0.975,opex:1.00},
    pre:{brand:"Boreas",model:"B-170",spec:"Rotor 170 m, göbek 125 m",capex:1.22,perf:1.12,avail:0.99,opex:0.90}
  },
  off:{
    eco:{brand:"Nereid",model:"N-180",spec:"Rotor 180 m, monopil temel",capex:0.84,perf:0.90,avail:0.94,opex:1.20},
    std:{brand:"Tethys",model:"T-220",spec:"Rotor 220 m, monopil temel",capex:1.00,perf:1.00,avail:0.97,opex:1.00},
    pre:{brand:"Poseidon",model:"P-250",spec:"Rotor 250 m, doğrudan tahrikli jeneratör",capex:1.20,perf:1.10,avail:0.985,opex:0.88}
  },
  // yüzer rüzgâr (markalar kurgusal): çift rotor V kule, tek nokta bağlamalı platform rüzgâra kendiliğinden döner
  flo:{
    eco:{brand:"Halcyon",model:"TW-12",spec:"Çift rotor (2 × 6 MW), yarı batık platform",capex:0.85,perf:0.90,avail:0.93,opex:1.20},
    std:{brand:"Aeolia",model:"TW-17",spec:"Çift rotor (2 × 8,5 MW), V kule, tek nokta bağlama",capex:1.00,perf:1.00,avail:0.965,opex:1.00},
    pre:{brand:"Zephyros",model:"TW-20T",spec:"Çift rotor, tayfun sınıfı gövde, uzaktan bakım",capex:1.18,perf:1.08,avail:0.985,opex:0.90}
  },
  hes:{
    eco:{brand:"Akarsu",model:"F-80",spec:"Francis türbin, verim %86",capex:0.85,perf:0.92,avail:0.96,opex:1.10},
    std:{brand:"Kaskad",model:"F-120",spec:"Francis türbin, verim %91",capex:1.00,perf:1.00,avail:0.98,opex:1.00},
    pre:{brand:"Nexa Hydro",model:"FX-160",spec:"Francis türbin, verim %94, uzaktan izleme",capex:1.15,perf:1.04,avail:0.99,opex:0.92}
  },
  batt:{
    eco:{brand:"Voltix",model:"LFP-10",spec:"LFP hücre, verim %82",capex:0.85,perf:1,rte:0.82,avail:0.96,opex:1.15},
    std:{brand:"Ampera",model:"LFP-10",spec:"LFP hücre, verim %88",capex:1.00,perf:1,rte:0.88,avail:0.98,opex:1.00},
    pre:{brand:"Kolos",model:"LFP-10 Pro",spec:"LFP hücre, verim %92, sıvı soğutma",capex:1.20,perf:1,rte:0.92,avail:0.99,opex:0.90}
  },
  // JES: perf rezervuar ısısının elektriğe dönüşümü
  jes:{
    eco:{brand:"Pyros",model:"SF-10",spec:"Tek flaş buhar türbini, açık devre",capex:0.85,perf:0.90,avail:0.95,opex:1.15},
    std:{brand:"Hephaist",model:"ORC-12",spec:"Organik Rankine çevrimi, reenjeksiyonlu kapalı devre",capex:1.00,perf:1.00,avail:0.975,opex:1.00},
    pre:{brand:"Vulkana",model:"DF-15",spec:"Çift flaş + ORC kombine çevrim, gaz salımı düşük",capex:1.18,perf:1.08,avail:0.99,opex:0.92}
  },
  // BES: perf yakıt verimi (daha verimli santral aynı elektrik için daha az yakıt yakar)
  bes:{
    eco:{brand:"Agrova",model:"BG-1",spec:"Biyogaz motoru, elektrik verimi %36",capex:0.85,perf:0.90,avail:0.95,opex:1.15},
    std:{brand:"Biomera",model:"BK-5",spec:"Biyokütle kazanı ve buhar türbini, verim %40",capex:1.00,perf:1.00,avail:0.975,opex:1.00},
    pre:{brand:"Verdea",model:"CHP-8",spec:"Kojenerasyon: atık ısı da satılır, verim %45",capex:1.20,perf:1.12,avail:0.985,opex:0.95}
  },
  mar:{
    eco:{brand:"Maris",model:"TS-1",spec:"Deniz tabanına sabit gelgit türbini",capex:0.85,perf:0.88,avail:0.93,opex:1.20},
    std:{brand:"Talassa",model:"FT-2",spec:"Yüzer çift rotorlu gelgit türbini ve dalga dönüştürücü",capex:1.00,perf:1.00,avail:0.96,opex:1.00},
    pre:{brand:"Okeanis",model:"FT-3X",spec:"Yüzer gelgit dizisi, uzaktan bakım, dalga sönümleyici",capex:1.20,perf:1.10,avail:0.98,opex:0.90}
  },
  // yüzer GES: perf üretime çarpan (suyun soğutma kazancı ayrıca config.js FPV_COOL)
  fpv:{
    eco:{brand:"Nymphe",model:"F-400",spec:"Polikristal panel, HDPE şamandıra, sabit eğim",capex:0.82,perf:0.87,avail:0.96,opex:1.12},
    std:{brand:"Lacus",model:"F-550",spec:"Mono PERC panel, modüler şamandıra, çevre çapası",capex:1.00,perf:1.00,avail:0.98,opex:1.00},
    pre:{brand:"Aquila",model:"F-620B",spec:"Çift yüzlü panel, suyun yansımasından da üretir, dalga kırıcı",capex:1.20,perf:1.10,avail:0.99,opex:0.95}
  },
  // deniz üstü GES: perf üretime çarpan (deniz kazancı ayrıca config.js SPV_GAIN); kademeler korozyon koruması ve panel tipine göre
  spv:{
    eco:{brand:"Pelagos",model:"SP-450",spec:"Mono panel, galvanizli çelik kafes, boyalı kazık",capex:0.86,perf:0.92,avail:0.95,opex:1.15},
    std:{brand:"Marea",model:"SP-570B",spec:"Çift yüzlü N tipi panel, epoksi kaplı kafes, kurban anot",capex:1.00,perf:1.00,avail:0.97,opex:1.00},
    pre:{brand:"Thalassa",model:"SP-620X",spec:"Çift yüzlü cam-cam panel, kalın kaplama ve katodik koruma, uzaktan izleme",capex:1.16,perf:1.07,avail:0.985,opex:0.90}
  },
  // pompaj HES: rte pompa + türbin çevrim verimi (yayınlarda %70–85 aralığı; değerler temsilî)
  phs:{
    eco:{brand:"Kaskad",model:"PT-1",spec:"Sabit hızlı tersinir Francis, verim %75",capex:0.88,perf:1,rte:0.75,avail:0.97,opex:1.10},
    std:{brand:"Dicle Hydro",model:"PT-2",spec:"Tersinir pompa-türbin, verim %80",capex:1.00,perf:1,rte:0.80,avail:0.98,opex:1.00},
    pre:{brand:"Nexa Hydro",model:"VS-3",spec:"Değişken hızlı pompa-türbin, verim %83",capex:1.15,perf:1,rte:0.83,avail:0.99,opex:0.92}
  },
  // elektrolizör: perf = 55 kWh/kg ÷ sistemin tüketimi (daha verimli sistem aynı elektrikten daha çok hidrojen)
  h2:{
    eco:{brand:"Hydra",model:"AE-5",spec:"Alkali elektrolizör, 58 kWh/kg",capex:0.85,perf:0.95,avail:0.95,opex:1.15},
    std:{brand:"Hidrova",model:"AP-5",spec:"Basınçlı alkali elektrolizör, 55 kWh/kg",capex:1.00,perf:1.00,avail:0.97,opex:1.00},
    pre:{brand:"Protea",model:"PEM-5X",spec:"PEM elektrolizör, 52 kWh/kg, hızlı yük takibi",capex:1.22,perf:1.06,avail:0.985,opex:0.95}
  },
  // CSP: perf ısı toplama ve dönüşüm verimi
  csp:{
    eco:{brand:"Helios",model:"PT-50",spec:"Parabolik oluk, sentetik yağ ve tuz deposu",capex:0.86,perf:0.90,avail:0.95,opex:1.12},
    std:{brand:"Solaris",model:"ST-100",spec:"Merkezi kule, erimiş tuz alıcı, 10 saatlik depo",capex:1.00,perf:1.00,avail:0.97,opex:1.00},
    pre:{brand:"Ikaros",model:"ST-150X",spec:"Kule, çift eksenli heliostatlar, süper kritik buhar",capex:1.18,perf:1.08,avail:0.985,opex:0.92}
  }
};

// Eski kayıtlarda kademe yok: standart sayılır
export const tierOf=p=>EQUIP[p.k][p.q]?p.q:"std";
export const eqOf=p=>EQUIP[p.k][tierOf(p)];
export const eqName=(k,q)=>`${EQUIP[k][q].brand} ${EQUIP[k][q].model}`;

// 5 MW'lık bir bloğun kurulum maliyeti (finansçı uzmanlığı %6 indirim alır; olay kartları fiyatı geçici değiştirebilir)
export const capexOf=(k,q)=>Math.round(TECH[k].capex*EQUIP[k][q].capex*(spec()==="fin"?0.94:1)*factor("capex",null,k)/100)*100;
