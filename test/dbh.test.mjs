// Tests for the v2.0 DBH model choice: the DBH library generated from the
// model-library workbook (src/dbhLibrary.js), FORA's own models (species.js)
// and the species mapping (src/dbhChoice.js). Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";

import { DBH_MODELS } from "../src/dbhLibrary.js";
import {
  FORA_DBH, DBH_MODEL_BY_CODE, SPECIES_DBH, dbhChoice, dbhModelsFor, crownFor, evalDbh, dbhSpread,
} from "../src/dbhChoice.js";
import { SP, SPECIES } from "../src/species.js";
import { biomassChoice } from "../src/modelChoice.js";

const rel = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} != ${b}`);

test("DBH library: every model reproduces the workbook value at h 18 m", () => {
  assert.equal(DBH_MODELS.length, 30);
  for (const m of DBH_MODELS) rel(m.fn(18, m.testCd), m.test);
  assert.equal(new Set([...DBH_MODELS, ...FORA_DBH].map((m) => m.code)).size, DBH_MODELS.length + FORA_DBH.length);
});

test("DBH library: models agree with coefficients typed from the papers at other trees", () => {
  const sq = Math.sqrt;
  const cases = [
    // Jucker et al. 2017, Eq. 6 (global) and Table S4 (Palearctic, temperate mixed, gymnosperm)
    ["JUC-D6", (h, c) => 0.557 * (h * c) ** 0.809 * Math.exp(0.056 ** 2 / 2)],
    ["JUC-S4-21", (h, c) => 1.004 * (h * c) ** 0.73],
    // Kalliovirta & Tokola 2005, Table 4: sqrt(d mm) = a + b sqrt(h dm) + c sqrt(dcrm dm), plus VAR
    ["KT-9.3.1", (h, c) => ((-3.155 + 0.73 * sq(10 * h) + 1.323 * sq(10 * c)) ** 2 + 0.869) / 10],
    // Balenović et al. 2015: sqrt(DBH) = 2.225 + 0.377 CD + 0.099 H
    ["BAL-D3", (h, c) => (2.225 + 0.377 * c + 0.099 * h) ** 2],
    // Valbuena Rabadán et al. 2016: DBH = -25.381 + 7.1931 sqrt(H) + 14.5527 sqrt(DCl)
    ["VAL", (h, c) => -25.381 + 7.1931 * sq(h) + 14.5527 * sq(c)],
    // Gencal 2019 (MSc thesis), Eq. 4.10 h = 2.297 d^0.570 and Eq. 4.11 CD = 1.310 + 0.198 d, solved for d;
    // Sönmez & Gencal 2023, h = exp(3.026 - 8.438/d), solved for d
    ["GEN19-QCE-H", (h) => (h / 2.297) ** (1 / 0.570)],
    ["GEN19-QCE-CD", (h, c) => (c - 1.310) / 0.198],
    ["SON23-QCE-H", (h) => 8.438 / (3.026 - Math.log(h))],
  ];
  for (const [code, f] of cases) {
    for (const [h, c] of [[9, 2.5], [18, 4], [24, 5.5], [28, 7]]) rel(DBH_MODEL_BY_CODE[code].fn(h, c), f(h, c), 1e-9);
  }
});

test("FORA's own DBH models are the species.js models, unchanged", () => {
  for (const m of FORA_DBH) {
    const s = SP.find((x) => x.id === m.legacyId);
    assert.ok(s, m.code);
    for (const [h, c] of [[8, 2], [15, 4], [22, 6]]) {
      const a = m.fn(h, c), b = s.fn(h, c);
      assert.ok(Object.is(a, b) || (Number.isNaN(a) && Number.isNaN(b)), m.code);
    }
  }
  assert.equal(FORA_DBH.length, SP.length);
});

test("mapping: every listed code exists in its scope; seven species, each with DBH and biomass models", () => {
  for (const [k, e] of Object.entries(SPECIES_DBH)) {
    for (const s of ["eu", "tr", "world"]) for (const c of e[s]) assert.equal(DBH_MODEL_BY_CODE[c]?.scope, s, `${k} ${c}`);
  }
  assert.equal(SPECIES.length, 7);
  for (const s of SPECIES) {
    assert.ok(dbhChoice(s.id)?.model, s.id);
    assert.ok(biomassChoice(s.id)?.model, s.id);
  }
});

test("mapping: default is Europe–Mediterranean, otherwise the world (Jucker Palearctic) model", () => {
  const want = { ps: "VAL", ab: "JUC-S4-21", pb: "JUC-S4-24", pn: "BAL-D3", fo: "JUC-S4-20", pp: "JUC-S4-24", qc: "CIM11-QCE" };
  for (const [sp, code] of Object.entries(want)) {
    const ch = dbhChoice(sp);
    assert.equal(ch.model.code, code, sp);
    assert.equal(ch.fallback, ch.model.scope !== "eu", sp);
    assert.equal(ch.recommended, true);
  }
});

test("mapping: the user's model is used; a code of another species is ignored", () => {
  assert.equal(dbhChoice("pb", "OZC14-PBR-IE").model.code, "OZC14-PBR-IE");
  assert.equal(dbhChoice("pb", "OZC14-PBR-IE").recommended, false);
  assert.equal(dbhChoice("ab", "GEN25-ABN").model.code, "GEN25-ABN");
  assert.equal(dbhChoice("ab", "BAL-D3").model.code, "JUC-S4-21");
  assert.deepEqual(dbhModelsFor("pb", "tr").map((m) => m.code), ["OZC14-PBR-ME", "OZC14-PBR-IE", "OZC14-PBR-LE"]);
  assert.deepEqual(dbhModelsFor("qc", "tr").map((m) => m.code), ["GEN19-QCE-H", "GEN19-QCE-CD", "SON23-QCE-H"]);
  // a crown-only model ignores the height range; the S model gives nothing above its asymptote (20.6 m)
  const cdOnly = evalDbh(DBH_MODEL_BY_CODE["GEN19-QCE-CD"], { h: 30, cd: 6, cdBbox: 6 });
  assert.ok(cdOnly.value > 0 && cdOnly.oor === false);
  assert.equal(evalDbh(DBH_MODEL_BY_CODE["SON23-QCE-H"], { h: 22 }).value, null);
});

test("crown: each model gets the crown measure it was fitted with", () => {
  const t = { h: 18, cd: 4.4, cdBbox: 4, cdBboxMax: 4.6, cdConvex: 4.8, cdConcave: null, cpa: 12, cpaBbox: 12.5 };
  assert.equal(crownFor(DBH_MODEL_BY_CODE["JUC-D6"], t), 4);
  assert.equal(crownFor(DBH_MODEL_BY_CODE["KT-9.3.1"], t), 4.8);
  assert.equal(crownFor(DBH_MODEL_BY_CODE["KT-9.3.1"], { ...t, cdConvex: null }), 4.6);
  rel(crownFor(DBH_MODEL_BY_CODE["VAL"], t), 2 * Math.sqrt(12 / Math.PI));
  assert.equal(crownFor(DBH_MODEL_BY_CODE["GB-dbh2"], t), 12.5);
  assert.equal(crownFor(DBH_MODEL_BY_CODE["GEN25-PSY"], t), 4.4);
  assert.equal(crownFor(DBH_MODEL_BY_CODE["KT-9.1.1"], t), null);
});

test("evaluation: no DBH without a positive result; out-of-range trees are flagged", () => {
  const VAL = DBH_MODEL_BY_CODE["VAL"];
  assert.equal(evalDbh(VAL, { h: 2.5, cpa: 0.3, cd: 0.6, cdBbox: 0.6 }).value, null);   // negative for tiny trees
  assert.equal(evalDbh(VAL, { h: 18, cpa: null, cd: 4 }).value, null);                   // no crown area
  const KT = DBH_MODEL_BY_CODE["KT-9.3.1"];
  const tall = evalDbh(KT, { h: 30, cd: 5, cdBbox: 5, cdBboxMax: 5.5 });
  assert.ok(tall.value > 0);
  assert.equal(tall.oor, true);                                                         // height range 1.4–28.6 m
  assert.equal(evalDbh(KT, { h: 18, cd: 4, cdBbox: 4, cdBboxMax: 4.6 }).oor, false);
});

test("DBH model spread: mean DBH from every model listed for the species", () => {
  const trees = [{ h: 18, cd: 4, cdBbox: 4, cdBboxMax: 4.5, cpa: 12.5, cpaBbox: 12.5 }, { h: 12, cd: 3, cdBbox: 3, cdBboxMax: 3.3, cpa: 7, cpaBbox: 7 }];
  const s = dbhSpread(trees, "pb");
  assert.equal(s.rows.length, dbhModelsFor("pb").length);
  assert.ok(s.n >= 2 && s.min <= s.max);
  assert.equal(dbhSpread([], "pb"), null);
});

// The formula shown in the interface must be the formula FORA computes.
import { MODELS } from "../src/biomassLibrary.js";
const toJs = (f) => f
  .replace(/−/g, "-").replace(/·/g, "*").replace(/²/g, "**2").replace(/³/g, "**3").replace(/\^/g, "**")
  .replace(/√\(/g, "Math.sqrt(").replace(/√([A-Za-z]+)/g, "Math.sqrt($1)")
  .replace(/\bln\(/g, "Math.log(").replace(/\bexp\(/g, "Math.exp(").replace(/π/g, "Math.PI")
  .replace(/\[/g, "(").replace(/\]/g, ")").replace(/\b(CDmax|CDe|CA|CD)\b/g, "cd");
test("formulas shown in the interface reproduce every library model", () => {
  for (const m of MODELS) rel(new Function("d", "h", "cd", `return ${toJs(m.formula)}`)(25, 18, 4), m.test, 1e-6);
  for (const m of DBH_MODELS) rel(new Function("h", "cd", `return ${toJs(m.formula)}`)(18, m.testCd), m.test, 1e-6);
});

test("formulas of FORA's own DBH models match species.js", () => {
  for (const m of FORA_DBH) {
    assert.ok(m.formula, m.code);
    for (const [h, c] of [[10, 3], [16, 4.5], [21, 5.5]]) {
      const d = m.fn(h, c);
      if (!(d > 0)) continue;
      if (m.formula.startsWith("h = ")) {
        const [lhs, hdom] = m.formula.slice(4).split("; Hdom = ");
        const js = toJs(lhs).replace(/Hdom/g, "H0");
        const H0 = hdom ? Math.max(h + 1, 10) : 0;
        rel(new Function("d", "H0", `return ${js}`)(d, H0), h, 1e-6);
      } else {
        rel(new Function("h", "cd", `return ${toJs(m.formula)}`)(h, c), d);
      }
    }
  }
});
