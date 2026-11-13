// species.js — FORA tree species and their DBH models (height and crown
// diameter -> diameter at breast height). Moved out of App.jsx unchanged in
// v2.0 so the models can be tested directly; see ALLOMETRIC_MODELS.md.

// Species-specific allometric models — published coefficients
// All formulas return DBH in cm given H in m and CD in m
// Inverse-solving used for pure h-d models (Gompertz, Schnute, Prodan)
export const SP=[
  // Gencal (2025) PhD thesis + Karahalil & Karsli (2017,)
  {id:"ps",nameTR:"Sarıçam (P. sylvestris)",nameEN:"Scots pine (P. sylvestris)",ref:"Gencal 2025",fn:(h,cd)=>Math.max(0,-5.22+1.65*h+2.35*cd)},
  {id:"ab",nameTR:"Göknar (A. bornmuelleriana)",nameEN:"Uludağ fir (A. bornmuelleriana)",ref:"Gencal 2025",fn:(h,cd)=>Math.max(0,-6.27+1.80*h+2.06*cd)},
  // Özçelik et al. (2014) DOI:10.3906/TAR-1304-115 — Gompertz, inverse-solved for d
  // Formula: h = 1.3 + a·exp(-b·exp(-c·d))  →  d = -ln(-ln((h-1.3)/a)/b)/c
  {id:"pb_me",nameTR:"Kızılçam-Sahil (P. brutia ME)",nameEN:"Calabrian pine – coastal (P. brutia ME)",ref:"Özçelik 2014",fn:(h,cd)=>{const a=22.527,b=1.823,c=0.062;if(h<=1.3||h>=a+1.3)return NaN;const inner=(h-1.3)/a;if(inner<=0||inner>=1)return NaN;const lni=-Math.log(inner)/b;if(lni<=0)return NaN;return Math.max(0,-Math.log(lni)/c);}},
  {id:"pb_ie",nameTR:"Kızılçam-İç (P. brutia IE)",nameEN:"Calabrian pine – inland (P. brutia IE)",ref:"Özçelik 2014",fn:(h,cd)=>{const a=25.911,b=2.004,c=0.045;if(h<=1.3||h>=a+1.3)return NaN;const inner=(h-1.3)/a;if(inner<=0||inner>=1)return NaN;const lni=-Math.log(inner)/b;if(lni<=0)return NaN;return Math.max(0,-Math.log(lni)/c);}},
  {id:"pb_le",nameTR:"Kızılçam-Göl (P. brutia LE)",nameEN:"Calabrian pine – lake district (P. brutia LE)",ref:"Özçelik 2014",fn:(h,cd)=>{const a=24.207,b=1.465,c=0.038;if(h<=1.3||h>=a+1.3)return NaN;const inner=(h-1.3)/a;if(inner<=0||inner>=1)return NaN;const lni=-Math.log(inner)/b;if(lni<=0)return NaN;return Math.max(0,-Math.log(lni)/c);}},
  // Özçelik et al. (2014) — Pinus nigra Gompertz (Akdeniz sahil)
  {id:"pn",nameTR:"Karaçam (P. nigra)",nameEN:"Black pine (P. nigra)",ref:"Özçelik 2014",fn:(h,cd)=>{const a=23.494,b=2.397,c=0.067;if(h<=1.3||h>=a+1.3)return NaN;const inner=(h-1.3)/a;if(inner<=0||inner>=1)return NaN;const lni=-Math.log(inner)/b;if(lni<=0)return NaN;return Math.max(0,-Math.log(lni)/c);}},
  // Ercanli (2015) DOI:10.5154/R.RCHSCFA.2015.02.006 — Schnute, Kestel-Bursa
  // Assumes H_dom = max(H+1, 10) m and D_dom = 35 cm; inverse-solved numerically
  {id:"fo",nameTR:"Kayın (F. orientalis)",nameEN:"Oriental beech (F. orientalis)",ref:"Ercanli 2015 (Kestel-Bursa)",fn:(h,cd)=>{const a=1.659,b=0.051,H0=Math.max(h+1,10),D0=35;let lo=0.1,hi=150;for(let i=0;i<40;i++){const d=(lo+hi)/2;const num=1-Math.exp(-b*d),den=1-Math.exp(-b*D0);const hPred=Math.pow(Math.pow(1.3,a)+(Math.pow(H0,a)-Math.pow(1.3,a))*num/den,1/a);if(hPred<h)lo=d;else hi=d;}return Math.max(0,(lo+hi)/2);}},
  // Carus & Akguş (2018) DOI:10.18182/tjf.338311 — Prodan 1968 rational (m8)
  // h = 1.30 + d² / (a + b·d + c·d²)
  // Tarsus region afforestation stands, n=5885 trees, Çizelge 4 (model dev dataset)
  // Verified: d=25.7 → h=8.54 (paper mean 8.4) — PHYSICALLY VALID
  // Inverse solved numerically via bisection on h
  {id:"pp",nameTR:"Fıstıkçamı (P. pinea)",nameEN:"Stone pine (P. pinea)",ref:"Carus & Akguş 2018 (Tarsus)",fn:(h,cd)=>{
    if(h<=1.3)return NaN;
    const a=-8.922602,b=3.254666,c=0.025050;
    // Find d such that 1.30 + d²/(a + b·d + c·d²) = h
    let lo=0.5,hi=150;
    for(let i=0;i<60;i++){
      const d=(lo+hi)/2;
      const den=a+b*d+c*d*d;
      if(den<=0){lo=d;continue;}
      const hPred=1.30+d*d/den;
      if(isNaN(hPred)||hPred<h)lo=d;else hi=d;
    }
    return Math.max(0,(lo+hi)/2);
  }},
  // Cimini & Salvati (2011) — Q. cerris GADA site-index model, central Italy
  // h = Hdom · [(1-exp(b1·d))^b2 / (1-exp(b1·Ddom))^b2]
  // b1=-0.046, b2=0.650; defaults Hdom=25m, Ddom=40cm for mature Mediterranean stand
  // Proxy for Turkish Q. cerris (published Turkish coefs not yet available)
  {id:"qc",nameTR:"Meşe (Q. cerris) [BETA]",nameEN:"Turkey oak (Q. cerris) [BETA]",ref:"Cimini & Salvati 2011 (proxy)",experimental:true,fn:(h,cd)=>{
    if(h<=1.3)return NaN;
    const b1=-0.046,b2=0.650,Hdom=25,Ddom=40;
    const den=Math.pow(1-Math.exp(b1*Ddom),b2);
    // Find d such that Hdom · (1-exp(b1·d))^b2 / den = h
    let lo=0.5,hi=150;
    for(let i=0;i<60;i++){
      const d=(lo+hi)/2;
      const term=1-Math.exp(b1*d);
      if(term<=0){lo=d;continue;}
      const hPred=Hdom*Math.pow(term,b2)/den;
      if(isNaN(hPred)||hPred<h)lo=d;else hi=d;
    }
    return Math.max(0,(lo+hi)/2);
  }}
];


// The seven species offered in the interface (v2.0). Calabrian pine's three
// regional models in SP are DBH model choices of one species (dbhChoice.js).
export const SPECIES=[
  {id:"ps",nameTR:"Sarıçam (P. sylvestris)",nameEN:"Scots pine (P. sylvestris)"},
  {id:"ab",nameTR:"Uludağ göknarı (A. bornmuelleriana)",nameEN:"Uludağ fir (A. bornmuelleriana)"},
  {id:"pb",nameTR:"Kızılçam (P. brutia)",nameEN:"Calabrian pine (P. brutia)"},
  {id:"pn",nameTR:"Karaçam (P. nigra)",nameEN:"Black pine (P. nigra)"},
  {id:"fo",nameTR:"Doğu kayını (F. orientalis)",nameEN:"Oriental beech (F. orientalis)"},
  {id:"pp",nameTR:"Fıstıkçamı (P. pinea)",nameEN:"Stone pine (P. pinea)"},
  {id:"qc",nameTR:"Saçlı meşe (Q. cerris)",nameEN:"Turkey oak (Q. cerris)"},
];

// species display name in the current UI language
export const spName=(s,L)=>s?(L?s.nameTR:s.nameEN):"";
