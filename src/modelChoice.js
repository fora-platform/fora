// modelChoice.js — which biomass model FORA uses for each species, and how.
//
// The model library (biomassLibrary.js) holds 134 above-ground and 45 root
// models. This module maps FORA's species to the models that fit them, grouped
// by scope:
//   "eu"    Europe–Mediterranean (default)
//   "tr"    Türkiye
//   "world" other regions (global or North American)
// The first code in each list is the recommended model for that scope. When a
// scope has no model for the species, FORA falls back to Europe–Mediterranean,
// then to world, and says so.
//
// Below-ground biomass uses a root model when one exists: the root model from
// the same paper as the above-ground model if there is one, otherwise the
// species' own root model. Trees without a root model use the IPCC
// root-to-shoot ratio (carbon.js).

import { MODEL_BY_CODE } from "./biomassLibrary.js";

export const DEFAULT_SCOPE = "eu";
export const SCOPES = ["eu", "tr", "world"];
export const SCOPE_LABEL = {
  eu: { tr: "Avrupa–Akdeniz", en: "Europe–Mediterranean" },
  tr: { tr: "Türkiye", en: "Türkiye" },
  world: { tr: "Dünya", en: "World" },
};

// How the workbook verified a model, in English for the PDF report and UI.
export const STATUS_EN = {
  "Doğrulandı": "verified against the paper",
  "Doğrulandı — dikkat": "verified against the paper; read the note before use",
  "Web okuması": "read twice from the open-access paper (page image not checked)",
  "Web okuması — dikkat": "read twice from the open-access paper; read the note before use",
  "İkincil kaynak": "coefficients from a paper that quotes the original",
  "Site kaydı": "coefficients from a public equation database (treeallometry.org)",
  "FORA modeli": "FORA's own DBH model since v1 (see ALLOMETRIC_MODELS.md)",
};

// group: IPCC group for the carbon defaults (conifer, broadleaf, oak)
export const SPECIES_BIOMASS = {
  ps: {
    group: "conifer",
    agb: {
      eu: ["RP-PSY", "FOR-PINUSYL-AGB", "REP-P", "MON05-PSY"],
      tr: ["DUR10-PSY-DH", "DUR10-PSY-D", "DUR15-PSY-D", "COM11-PSY", "DUR16-PSY-N", "TOL12-PSY-D2H", "TOL12-PSY-D"],
      world: ["JUC-A7-G", "JEN-8"],
    },
    root: ["RP-PSY-KOK", "ROH19-PSY", "FOR-PINUSYL-KOK", "MON05-PSY-KOK"],
  },
  ab: {
    group: "conifer",
    agb: {
      eu: ["RP-AAL", "FOR-ABIEALB-AGB", "DUT20-AAL-DH", "DUT20-AAL-D"],
      tr: ["DUR-ABI"],
      world: ["JUC-A7-G", "JEN-7"],
    },
    root: ["RP-AAL-KOK"],
  },
  pb: {
    group: "conifer",
    agb: {
      eu: ["DMG-ME-D", "DMG-SY-DH", "DMG-SY-D", "DMG-LB-DH", "DMG-LB-D"],
      tr: ["SON-T", "DUR09-PBR", "DUR15-PBR-DH", "DUR15-PBR-D", "DUR22-PBR"],
      world: ["JUC-A7-G", "JEN-8"],
    },
    root: [],
  },
  pn: {
    group: "conifer",
    agb: {
      eu: ["RP-PNI", "FOR-PINUNIG-AGB", "MON05-PNI"],
      tr: ["DUR15-PNI-DH", "DUR15-PNI-D", "DUR10-PNI-DH", "DUR10-PNI-D", "DUR19-PNI-DH", "DUR19-PNI-D"],
      world: ["JUC-A7-G", "JEN-8"],
    },
    root: ["RP-PNI-KOK", "FOR-PINUNIG-KOK", "MON05-PNI-KOK"],
  },
  fo: {
    group: "broadleaf",
    agb: {
      eu: ["FOR-FAGUSYL-AGB", "RP12-FSY", "ZIA03-FMO", "ZIA03-FAG", "DUT20-FSY-DH", "DUT20-FSY-D", "MON05-FSY"],
      tr: ["SAR-FAG"],
      world: ["JUC-A7-A", "JEN-4"],
    },
    root: ["FOR-FAGUSYL-KOK", "RP12-FSY-KOK"],
  },
  pp: {
    group: "conifer",
    agb: {
      eu: ["COR18-DH", "COR18-D", "COR-PPI", "RP-PPI", "MON05-PPI"],
      tr: [],
      world: ["JUC-A7-G", "JEN-8"],
    },
    root: ["COR18-MT-dh-KOK", "COR18-MT-d-KOK", "RP-PPI-KOK", "MON05-PPI-KOK"],
  },
  qc: {
    group: "oak",
    agb: {
      eu: ["CIE-Q2", "CIE-Q1", "CIE-Q3", "FOR-QUERPET2-AGB", "MON05-QRO", "MON05-QPY"],
      tr: ["OZD-QC-T2", "OZD-QC-T1", "SAG20-QC-DH", "SAG20-QC-D", "OZD-GEN-T2", "OZD-GEN-T1"],
      world: ["JUC-A7-A", "JEN-4"],
    },
    root: ["FOR-QUERPET2-KOK", "ROH19-QUE", "MON05-QRO-KOK", "MON05-QPY-KOK"],
  },
};

// Root model from the same paper as the above-ground model.
export const ROOT_PAIR = {
  "RP-PSY": "RP-PSY-KOK", "RP-AAL": "RP-AAL-KOK", "RP-PNI": "RP-PNI-KOK", "RP-PPI": "RP-PPI-KOK",
  "RP12-FSY": "RP12-FSY-KOK",
  "FOR-PINUSYL-AGB": "FOR-PINUSYL-KOK", "FOR-PINUNIG-AGB": "FOR-PINUNIG-KOK",
  "FOR-FAGUSYL-AGB": "FOR-FAGUSYL-KOK", "FOR-QUERPET2-AGB": "FOR-QUERPET2-KOK",
  "COR18-DH": "COR18-MT-dh-KOK", "COR18-D": "COR18-MT-d-KOK",
  "MON05-PSY": "MON05-PSY-KOK", "MON05-PNI": "MON05-PNI-KOK", "MON05-PPI": "MON05-PPI-KOK",
  "MON05-QRO": "MON05-QRO-KOK", "MON05-QPY": "MON05-QPY-KOK",
};

// Sönmez et al. (2016) component models for Pinus brutia, used for the stem,
// branch, bark and needle columns when SON-T is the chosen model. Like the
// paper, the components are not log-corrected; SON-T (the total) is.
export const SONMEZ_COMPONENTS = {
  branches: (d, h) => Math.exp(-2.611 + 1.069 * Math.log(d) + 0.950 * Math.log(h)),
  bark: (d, h) => Math.exp(-3.254 + 1.314 * Math.log(d) + 0.878 * Math.log(h)),
  stem: (d, h) => Math.exp(-3.107 + 9.480 * (d / (d + 9.499)) + 0.070 * h),
  needles: (d, h) => Math.exp(-1.152 + 6.483 * (d / (d + 25.940)) - 0.017 * h),
};

export const speciesKey = (spId) => (spId && spId.startsWith("pb") ? "pb" : spId);
export const speciesBiomass = (spId) => SPECIES_BIOMASS[speciesKey(spId)] || null;

// All models listed for a species, in a scope or (scope null) in every scope.
export function modelsFor(spId, scope = null) {
  const e = speciesBiomass(spId);
  if (!e) return [];
  const codes = scope ? e.agb[scope] || [] : SCOPES.flatMap((s) => e.agb[s] || []);
  return codes.map((c) => MODEL_BY_CODE[c]).filter(Boolean);
}

// Pick the above-ground and root model for a species.
//   scope: requested scope; code: a specific model chosen by the user (optional)
// Returns null for a species without biomass models.
export function biomassChoice(spId, scope = DEFAULT_SCOPE, code = null) {
  const e = speciesBiomass(spId);
  if (!e) return null;
  let model = null, used = scope, fallback = false;
  if (code && modelsFor(spId).some((m) => m.code === code)) {
    model = MODEL_BY_CODE[code];
    used = SCOPES.find((s) => (e.agb[s] || []).includes(code));
  } else {
    for (const s of [scope, ...SCOPES.filter((x) => x !== scope)]) {
      const list = e.agb[s] || [];
      if (list.length) { model = MODEL_BY_CODE[list[0]]; used = s; fallback = s !== scope; break; }
    }
  }
  if (!model) return null;
  const rootCode = ROOT_PAIR[model.code] || e.root[0] || null;
  return {
    key: speciesKey(spId), group: e.group, scope: used, requested: scope, fallback,
    model, root: rootCode ? MODEL_BY_CODE[rootCode] : null,
    rootPaired: Boolean(ROOT_PAIR[model.code]),
  };
}

const ok = (x) => Number.isFinite(x) && x > 0;
const outside = (x, r) => Array.isArray(r) && Number.isFinite(x) && (x < r[0] || x > r[1]);

// Biomass (kg) of one tree from one model. value is null when an input the
// model needs is missing or the model gives no positive result (e.g. a
// polynomial below its valid range). oor: DBH or height outside the data range
// of the model (the value is still given; the interface warns).
export function evalModel(model, d, h, cd) {
  if (!model) return { value: null, oor: false };
  const v = { d, h, cd };
  if (!model.inputs.every((k) => ok(v[k]))) return { value: null, oor: false };
  const value = model.fn(d, h, cd);
  if (!ok(value)) return { value: null, oor: false };
  const oor = (model.inputs.includes("d") && outside(d, model.d)) || (model.inputs.includes("h") && outside(h, model.h));
  return { value, oor };
}

// Stand above-ground biomass from every model listed for the species, as a
// measure of model uncertainty. Trees are FORA's met records (dbhModel, h and
// the mean crown diameter cdBbox, which the crown-based models were fitted with).
// A model's total counts only the trees it can compute; `trees` says how many.
export function standSpread(trees, spId) {
  const models = modelsFor(spId);
  if (!models.length || !trees?.length) return null;
  const rows = models.map((m) => {
    let sum = 0, n = 0;
    for (const t of trees) {
      const r = evalModel(m, t.dbhModel, t.h, t.cdBbox ?? t.cd);
      if (r.value != null) { sum += r.value; n++; }
    }
    return { code: m.code, scope: m.scope, status: m.status, agb_t: sum / 1000, trees: n };
  });
  const full = Math.max(...rows.map((r) => r.trees));
  const comparable = rows.filter((r) => r.trees === full && full > 0);
  if (!comparable.length) return { rows, full, n: 0, min_t: null, max_t: null };
  const vals = comparable.map((r) => r.agb_t);
  return { rows, full, n: comparable.length, min_t: Math.min(...vals), max_t: Math.max(...vals) };
}
