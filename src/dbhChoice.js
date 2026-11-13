// dbhChoice.js — which DBH model FORA uses for each species, and how.
//
// FORA estimates DBH from LiDAR height and crown. The models come from two places:
//   species.js    FORA's own Turkish models (used since v1; see ALLOMETRIC_MODELS.md)
//   dbhLibrary.js models from Europe and elsewhere, generated from the model-library workbook
// Each species lists its models by scope ("eu" Europe–Mediterranean, "tr" Türkiye,
// "world" global or other regions). The first model of a scope is the recommended one.
// Default: the first Europe–Mediterranean model; a species without one uses its first
// world model (Jucker et al. 2017, Palearctic region, by biome and group).
//
// Every model receives the crown measure it was fitted with (crownFor below), not
// FORA's crown setting; FORA's own models keep using the crown of that setting, as
// before v2.0.

import { SP } from "./species.js";
import { DBH_MODELS } from "./dbhLibrary.js";

export const DBH_DEFAULT_ORDER = ["eu", "world", "tr"];

// FORA's own models, from species.js. code: author + year + species.
const SP_FN = Object.fromEntries(SP.map((s) => [s.id, s.fn]));
// formula: the formula with its coefficients, as shown in the interface; "h = …"
// models are solved for d numerically (bisection), as in species.js.
const TR = (code, id, species, source, region, eq, inputs, formula, extra = {}) => ({
  code, formula, scope: extra.scope || "tr", status: "FORA modeli", species, source, region, eq, inputs,
  crown: inputs.includes("cd") ? "fora" : null, crownNote: null, d: null, h: null, c: null, n: extra.n ?? null,
  doi: extra.doi ?? null, note: extra.note ?? null, legacyId: id, fn: (h, cd) => SP_FN[id](h, cd),
});
const OZC = "Özçelik vd. 2014, Turkish Journal of Agriculture and Forestry 38:399–412";
const GOMP = "h = 1.3 + a·exp(−b·exp(−c·d)), d'ye göre çözülür";
export const FORA_DBH = [
  TR("GEN25-PSY", "ps", "Sarıçam (Pinus sylvestris)", "Gencal 2025, doktora tezi, Bursa Teknik Üniversitesi", "Türkiye (İHA-LiDAR ve yer ölçümü, 2956 ağaç)",
    "d = −5.22 + 1.65·h + 2.35·CD", ["h", "cd"], "−5.22 + 1.65·h + 2.35·CD", { n: 2956 }),
  TR("GEN25-ABN", "ab", "Uludağ göknarı (Abies bornmuelleriana)", "Gencal 2025, doktora tezi, Bursa Teknik Üniversitesi", "Türkiye (sarıçamla aynı veri seti)",
    "d = −6.27 + 1.80·h + 2.06·CD", ["h", "cd"], "−6.27 + 1.8·h + 2.06·CD"),
  TR("OZC14-PBR-ME", "pb_me", "Kızılçam (Pinus brutia), Akdeniz sahil", OZC, "Türkiye, Akdeniz sahil ekolojik bölgesi", GOMP, ["h"], "h = 1.3 + 22.527·exp(−1.823·exp(−0.062·d))", { doi: "10.3906/tar-1304-115" }),
  TR("OZC14-PBR-IE", "pb_ie", "Kızılçam (Pinus brutia), iç doğu", OZC, "Türkiye, iç doğu ekolojik bölgesi", GOMP, ["h"], "h = 1.3 + 25.911·exp(−2.004·exp(−0.045·d))", { doi: "10.3906/tar-1304-115" }),
  TR("OZC14-PBR-LE", "pb_le", "Kızılçam (Pinus brutia), Göller", OZC, "Türkiye, Göller ekolojik bölgesi", GOMP, ["h"], "h = 1.3 + 24.207·exp(−1.465·exp(−0.038·d))", { doi: "10.3906/tar-1304-115" }),
  TR("OZC14-PNI", "pn", "Karaçam (Pinus nigra)", OZC, "Türkiye, Akdeniz sahil ekolojik bölgesi", GOMP, ["h"], "h = 1.3 + 23.494·exp(−2.397·exp(−0.067·d))", { doi: "10.3906/tar-1304-115" }),
  TR("ERC15-FOR", "fo", "Doğu kayını (Fagus orientalis)", "Ercanlı 2015, Revista Chapingo Serie Ciencias Forestales y del Ambiente 21(2):221–232", "Türkiye, Kestel (Bursa), 124 alan",
    "Schnute boy–çap (Hdom = max(h + 1, 10) m, Ddom = 35 cm varsayılır), d'ye göre çözülür", ["h"],
    "h = [1.3^1.659 + (Hdom^1.659 − 1.3^1.659)·(1 − exp(−0.051·d))/(1 − exp(−0.051·35))]^(1/1.659); Hdom = max(h + 1, 10)", { doi: "10.5154/r.rchscfa.2015.02.006" }),
  TR("CAR18-PPI", "pp", "Fıstıkçamı (Pinus pinea)", "Carus & Akguş 2018, Turkish Journal of Forestry 19(3):293–299", "Türkiye, Tarsus ağaçlandırmaları (5885 ağaç)",
    "h = 1.30 + d² / (a + b·d + c·d²), d'ye göre çözülür", ["h"], "h = 1.3 + d²/(−8.922602 + 3.254666·d + 0.02505·d²)", { doi: "10.18182/tjf.338311", n: 5885, note: "BETA: Tarsus dışında doğrulanmadı." }),
  TR("CIM11-QCE", "qc", "Saçlı meşe (Quercus cerris)", "Cimini & Salvati 2011, Annals of Silvicultural Research 37(1):61–66", "İtalya, orta bölge",
    "GADA boy–çap (Hdom = 25 m, Ddom = 40 cm varsayılır), d'ye göre çözülür", ["h"], "h = 25·(1 − exp(−0.046·d))^0.65/(1 − exp(−0.046·40))^0.65",
    { scope: "eu", doi: "10.4129/ifm.2011.5.03", note: "BETA: Türkiye katsayıları bulunamadığı için İtalya modeli vekil olarak kullanılıyor." }),
];

export const DBH_MODEL_BY_CODE = Object.fromEntries([...FORA_DBH, ...DBH_MODELS].map((m) => [m.code, m]));

// Jucker et al. 2017, Palearctic: biome of the species' main Turkish range (Olson
// et al. 2001, as in the paper): temperate mixed forests for fir, Scots pine,
// beech and oak; "woodlands and savannas", which includes Mediterranean woodlands,
// for Calabrian and stone pine. S4 = by group (gymnosperm / angiosperm).
export const SPECIES_DBH = {
  ps: { eu: ["VAL", "KT-9.3.1", "KT-9.1.1"], tr: ["GEN25-PSY"], world: ["JUC-S4-21", "JUC-S4-19", "JUC-D6"] },
  ab: { eu: [], tr: ["GEN25-ABN"], world: ["JUC-S4-21", "JUC-S4-19", "JUC-D6"] },
  pb: { eu: [], tr: ["OZC14-PBR-ME", "OZC14-PBR-IE", "OZC14-PBR-LE"], world: ["JUC-S4-24", "JUC-S4-21", "JUC-D6"] },
  pn: { eu: ["BAL-D3"], tr: ["OZC14-PNI"], world: ["JUC-S4-21", "JUC-S4-24", "JUC-D6"] },
  fo: { eu: [], tr: ["ERC15-FOR"], world: ["JUC-S4-20", "JUC-D6"] },
  pp: { eu: [], tr: ["CAR18-PPI"], world: ["JUC-S4-24", "JUC-D6"] },
  qc: { eu: ["CIM11-QCE"], tr: ["GEN19-QCE-DH", "GEN19-QCE-H", "GEN19-QCE-CD", "SON23-QCE-H"], world: ["JUC-S4-20", "JUC-S4-23", "JUC-D6"] },
};

const key = (sp) => (sp && sp.startsWith("pb") ? "pb" : sp);

// Models listed for a species, in one scope or (scope null) in every scope.
export function dbhModelsFor(sp, scope = null) {
  const e = SPECIES_DBH[key(sp)];
  if (!e) return [];
  const codes = scope ? e[scope] || [] : ["eu", "tr", "world"].flatMap((s) => e[s] || []);
  return codes.map((c) => DBH_MODEL_BY_CODE[c]).filter(Boolean);
}

// The DBH model for a species: the one chosen by the user (code), or the
// recommended one. fallback: true when the species has no Europe–Mediterranean model.
export function dbhChoice(sp, code = null) {
  const e = SPECIES_DBH[key(sp)];
  if (!e) return null;
  const all = dbhModelsFor(sp);
  let rec = null, recScope = null;
  for (const s of DBH_DEFAULT_ORDER) if ((e[s] || []).length) { rec = DBH_MODEL_BY_CODE[e[s][0]]; recScope = s; break; }
  const picked = code ? all.find((m) => m.code === code) : null;
  const model = picked || rec;
  return { model, scope: model.scope, recommended: model === rec, fallback: !picked && recScope !== "eu" };
}

// Crown measure a model was fitted with, from one FORA tree record.
export function crownFor(model, t) {
  const pos = (x) => (Number.isFinite(x) && x > 0 ? x : null);
  switch (model?.crown) {
    case "mean": return pos(t.cdBbox) ?? pos(t.cd);
    case "max": return pos(t.cdConcave) ?? pos(t.cdConvex) ?? pos(t.cdBboxMax) ?? pos(t.cd);
    case "eq": return pos(t.cpa) ? 2 * Math.sqrt(t.cpa / Math.PI) : null;
    case "area": return pos(t.cpaBbox) ?? pos(t.cpa);
    case "fora": return pos(t.cd);
    default: return null;
  }
}

const outside = (x, r) => Array.isArray(r) && Number.isFinite(x) && (x < r[0] || x > r[1]);

// DBH (cm) of one tree. value null when an input is missing or the model gives
// no positive result; oor: height, crown or DBH outside the model's data range.
export function evalDbh(model, t) {
  if (!model || !(t?.h > 0)) return { value: null, oor: false };
  const usesCrown = model.inputs.includes("cd");
  const c = usesCrown ? crownFor(model, t) : null;
  if (usesCrown && c == null) return { value: null, oor: false };
  const v = model.fn(t.h, c);
  if (!Number.isFinite(v) || v <= 0) return { value: null, oor: false };
  const oor = (model.inputs.includes("h") && outside(t.h, model.h)) || (usesCrown && outside(c, model.c)) || outside(v, model.d);
  return { value: v, oor };
}

// Mean DBH of the trees from every model listed for the species (model spread).
export function dbhSpread(trees, sp) {
  const models = dbhModelsFor(sp);
  if (!models.length || !trees?.length) return null;
  const rows = models.map((m) => {
    let sum = 0, n = 0;
    for (const t of trees) { const r = evalDbh(m, t); if (r.value != null) { sum += r.value; n++; } }
    return { code: m.code, scope: m.scope, mean: n ? sum / n : null, trees: n };
  });
  const full = Math.max(...rows.map((r) => r.trees));
  const comp = rows.filter((r) => r.trees === full && full > 0);
  if (!comp.length) return { rows, full, n: 0, min: null, max: null };
  const v = comp.map((r) => r.mean);
  return { rows, full, n: comp.length, min: Math.min(...v), max: Math.max(...v) };
}
