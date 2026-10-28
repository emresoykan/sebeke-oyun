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
  }
};

// Eski kayıtlarda kademe yok: standart sayılır
export const tierOf=p=>EQUIP[p.k][p.q]?p.q:"std";
export const eqOf=p=>EQUIP[p.k][tierOf(p)];
export const eqName=(k,q)=>`${EQUIP[k][q].brand} ${EQUIP[k][q].model}`;

// 5 MW'lık bir bloğun kurulum maliyeti (finansçı uzmanlığı %6 indirim alır; olay kartları fiyatı geçici değiştirebilir)
export const capexOf=(k,q)=>Math.round(TECH[k].capex*EQUIP[k][q].capex*(spec()==="fin"?0.94:1)*factor("capex",null,k)/100)*100;
