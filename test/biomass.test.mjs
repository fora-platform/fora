// Tests for the v2.0 biomass model library (src/biomassLibrary.js), the species
// mapping (src/modelChoice.js), the carbon defaults (src/carbon.js) and the DBH
// models moved to src/species.js. Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";

import { MODELS, MODEL_BY_CODE } from "../src/biomassLibrary.js";
import {
  SPECIES_BIOMASS, ROOT_PAIR, DEFAULT_SCOPE, SCOPES, SONMEZ_COMPONENTS,
  biomassChoice, modelsFor, evalModel, standSpread,
} from "../src/modelChoice.js";
import { ipccRootToShoot, IPCC_CF, standCarbon, treeCarbon } from "../src/carbon.js";
import { SP } from "../src/species.js";

const rel = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} != ${b}`);

// ---------- library ----------
test("library: every model reproduces the workbook value at d 25 cm, h 18 m, CD 4 m", () => {
  assert.equal(MODELS.length, 179);
  for (const m of MODELS) rel(m.fn(25, 18, 4), m.test);
});

test("library: codes are unique; no unusable (KULLANMA) model is shipped", () => {
  assert.equal(new Set(MODELS.map((m) => m.code)).size, MODELS.length);
  assert.ok(MODELS.every((m) => m.status !== "KULLANMA"));
  assert.equal(MODELS.filter((m) => m.kind === "agb").length, 134);
  assert.equal(MODELS.filter((m) => m.kind === "root").length, 45);
});

test("library: models agree with coefficients typed from the papers at other trees", () => {
  const ln = Math.log, ex = Math.exp;
  const cases = [
    // Sönmez et al. 2016, Table 4, total; FORA adds exp(0.363²/2)
    ["SON-T", (d, h) => ex(-0.770 + 7.829 * d / (d + 12.843) + 0.056 * h) * ex(0.363 ** 2 / 2)],
    // Ruiz-Peinado et al. 2011, Pinus nigra: stem + thick branches (d > 32.5) + medium + thin
    ["RP-PNI", (d, h) => 0.0403 * d ** 1.838 * h ** 0.945 + (d > 32.5 ? 0.228 * (d - 32.5) ** 2 : 0) + 0.0521 * d ** 2 + 0.072 * d ** 2],
    // Correia et al. 2018, MT-dh system
    ["COR18-DH", (d, h) => 0.008797 * d ** 2.871281 * (h / d) ** -0.19326 + 0.060502 * d ** 1.897782 * h ** 0.527179 + 49.37346 * (d / 100) ** 2.528243 * (h / d) ** -2.01953],
    // Durkaya et al. 2010, Scots pine, Eq. 15
    ["DUR10-PSY-DH", (d, h) => -158.378 + 18.39502 * d - 0.15635 * d * h - 0.54561 * d ** 2 + 0.031285 * d ** 2 * h],
    // Aydın 2016, Taurus cedar, Eq. 4.22
    ["AYD16-CED-D", (d) => 0.542204 * d ** 2 - 8.059717 * ln(d) ** 2],
    // Forrester et al. 2017, Fagus sylvatica
    ["FOR-FAGUSYL-AGB", (d) => ex(-1.6594 + 2.3589 * ln(d)) * 0.996924],
    // de-Miguel et al. 2014, Middle East pooled, total
    ["DMG-ME-D", (d) => ex(0.119 + 10.122 * d / (d + 23.225))],
    // Montero, Ruiz-Peinado & Muñoz 2005, Table 2: above-ground total and roots, × exp(SEE²/2)
    ["MON05-PSY", (d) => ex(-2.50275 + 2.41194 * ln(d)) * ex(0.246887 ** 2 / 2)],
    ["MON05-QPY-KOK", (d) => ex(-2.4543 + 2.13346 * ln(d)) * ex(0.242145 ** 2 / 2)],
  ];
  for (const [code, f] of cases) {
    for (const [d, h] of [[12, 9], [25, 18], [40, 24], [55, 27]]) rel(MODEL_BY_CODE[code].fn(d, h, 4), f(d, h), 1e-6);
  }
});

// ---------- species mapping ----------
test("mapping: every listed code exists and is of the right kind", () => {
  for (const e of Object.values(SPECIES_BIOMASS)) {
    for (const s of SCOPES) for (const c of e.agb[s]) assert.equal(MODEL_BY_CODE[c]?.kind, "agb", c);
    for (const c of e.root) assert.equal(MODEL_BY_CODE[c]?.kind, "root", c);
  }
  for (const [a, r] of Object.entries(ROOT_PAIR)) {
    assert.equal(MODEL_BY_CODE[a]?.kind, "agb", a);
    assert.equal(MODEL_BY_CODE[r]?.kind, "root", r);
  }
});

test("mapping: models listed under a scope carry that scope in the library", () => {
  for (const e of Object.values(SPECIES_BIOMASS)) {
    for (const s of SCOPES) for (const c of e.agb[s]) assert.equal(MODEL_BY_CODE[c].scope, s, c);
  }
});

test("mapping: every FORA species gets a Europe–Mediterranean model by default", () => {
  assert.equal(DEFAULT_SCOPE, "eu");
  for (const s of SP) {
    const ch = biomassChoice(s.id);
    assert.ok(ch, s.id);
    assert.equal(ch.scope, "eu", s.id);
    assert.equal(ch.fallback, false, s.id);
  }
  assert.equal(biomassChoice("pb_me").model.code, "DMG-ME-D");
  assert.equal(biomassChoice("ps").model.code, "RP-PSY");
});

test("mapping: Türkiye and world are selectable; a scope without models falls back", () => {
  assert.equal(biomassChoice("pb_ie", "tr").model.code, "SON-T");
  assert.equal(biomassChoice("ps", "tr").model.code, "DUR10-PSY-DH");
  assert.equal(biomassChoice("fo", "world").model.code, "JUC-A7-A");
  const pp = biomassChoice("pp", "tr");
  assert.equal(pp.fallback, true);
  assert.equal(pp.scope, "eu");
  assert.equal(pp.model.code, "COR18-DH");
});

test("mapping: a model chosen by the user is used whatever the scope", () => {
  const ch = biomassChoice("pn", "eu", "DUR19-PNI-DH");
  assert.equal(ch.model.code, "DUR19-PNI-DH");
  assert.equal(ch.scope, "tr");
  // a code of another species is ignored
  assert.equal(biomassChoice("pn", "eu", "SAR-FAG").model.code, "RP-PNI");
});

test("mapping: root model from the same paper first, then the species' root model", () => {
  assert.equal(biomassChoice("ps").root.code, "RP-PSY-KOK");
  assert.equal(biomassChoice("ps").rootPaired, true);
  assert.equal(biomassChoice("ps", "tr").root.code, "RP-PSY-KOK");
  assert.equal(biomassChoice("ps", "tr").rootPaired, false);
  assert.equal(biomassChoice("pb_me").root, null);
  assert.equal(biomassChoice("pp").root.code, "COR18-MT-dh-KOK");
  assert.equal(biomassChoice("qc", "eu", "MON05-QPY").root.code, "MON05-QPY-KOK");
  // Montero 2005 beech has no root model in FORA: the species' root model is used
  assert.equal(biomassChoice("fo", "eu", "MON05-FSY").root.code, "FOR-FAGUSYL-KOK");
});

// ---------- evaluation ----------
test("evaluation: missing inputs and non-positive results give no biomass", () => {
  const m = MODEL_BY_CODE["RP-PSY"];
  assert.equal(evalModel(m, NaN, 18, 4).value, null);
  assert.equal(evalModel(m, 25, 0, 4).value, null);
  // Durkaya et al. 2010 Crimean pine polynomial is negative below 9.2 cm
  assert.equal(evalModel(MODEL_BY_CODE["DUR10-PNI-D"], 8, 7, 3).value, null);
  // Jucker uses height and crown diameter only
  assert.ok(evalModel(MODEL_BY_CODE["JUC-A7-G"], NaN, 18, 4).value > 0);
});

test("evaluation: trees outside the data range are flagged, not dropped", () => {
  const abi = evalModel(MODEL_BY_CODE["DUR-ABI"], 15, 12, 3);    // valid for d ≥ 20 cm only
  assert.ok(abi.value > 0);
  assert.equal(abi.oor, true);
  assert.equal(evalModel(MODEL_BY_CODE["DUR-ABI"], 30, 20, 5).oor, false);
});

test("evaluation: Sönmez components stay uncorrected; the total carries exp(RSE²/2)", () => {
  const d = 25, h = 18;
  rel(SONMEZ_COMPONENTS.stem(d, h), Math.exp(-3.107 + 9.480 * (d / (d + 9.499)) + 0.070 * h));
  rel(MODEL_BY_CODE["SON-T"].cf, Math.exp(0.363 ** 2 / 2), 1e-5);
  rel(MODEL_BY_CODE["SON-T"].fn(d, h, 4) / Math.exp(-0.770 + 7.829 * d / (d + 12.843) + 0.056 * h), MODEL_BY_CODE["SON-T"].cf);
});

test("model spread: every model listed for the species, with the stand range", () => {
  const trees = [{ dbhModel: 25, h: 18, cd: 4 }, { dbhModel: 32, h: 21, cd: 5 }, { dbhModel: 18, h: 14, cd: 3 }];
  const s = standSpread(trees, "pn");
  assert.equal(s.rows.length, modelsFor("pn").length);
  assert.ok(s.n >= 2 && s.min_t <= s.max_t);
  assert.equal(standSpread([], "pn"), null);
});

// ---------- carbon defaults ----------
test("carbon: IPCC 2006 Table 4.4 root-to-shoot classes (temperate)", () => {
  assert.equal(ipccRootToShoot("conifer", 40).value, 0.40);
  assert.equal(ipccRootToShoot("conifer", 120).value, 0.29);
  assert.equal(ipccRootToShoot("conifer", 200).value, 0.20);
  assert.equal(ipccRootToShoot("broadleaf", 60).value, 0.46);
  assert.equal(ipccRootToShoot("broadleaf", 100).value, 0.23);
  assert.equal(ipccRootToShoot("broadleaf", 180).value, 0.24);
  assert.equal(ipccRootToShoot("oak", 90).value, 0.30);
  assert.equal(ipccRootToShoot("oak", 50).value, 0.46);
  assert.equal(ipccRootToShoot("conifer", null).value, 0.29);   // area unknown: middle class
  assert.equal(IPCC_CF.conifer.value, 0.51);
  assert.equal(IPCC_CF.broadleaf.value, 0.48);
});

test("carbon: root models replace AGB × R tree by tree", () => {
  const trees = [{ bm_total: 200, bgb_model: 50 }, { bm_total: 100, bgb_model: null }];
  const s = standCarbon(trees, { rootToShoot: 0.29, carbonFraction: 0.51, useRootModel: true });
  rel(s.bgb_t, (50 + 100 * 0.29) / 1000);
  assert.equal(s.treesWithRootModel, 1);
  const r = standCarbon(trees, { rootToShoot: 0.29, carbonFraction: 0.51 });
  rel(r.bgb_t, 300 * 0.29 / 1000);
  assert.equal(r.treesWithRootModel, 0);
  rel(treeCarbon(200, { bgbKg: 50, carbonFraction: 0.5 }).carbonKg, 125);
});

// ---------- DBH models (moved, unchanged) ----------
test("species: DBH models unchanged after the move to species.js", () => {
  const ps = SP.find((s) => s.id === "ps");
  rel(ps.fn(18, 4), -5.22 + 1.65 * 18 + 2.35 * 4);
  const pbme = SP.find((s) => s.id === "pb_me");
  const d = pbme.fn(15, 4);
  rel(1.3 + 22.527 * Math.exp(-1.823 * Math.exp(-0.062 * d)), 15, 1e-9);
  assert.equal(SP.length, 9);
});
