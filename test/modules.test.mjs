// Tests for the modules added in v1.9, run with `npm test` (plain `node --test`).
//
// They pin the behaviour that the user-facing numbers depend on: the IPCC carbon
// arithmetic, the vegetation-layer thresholds (including heights with no ground
// estimate), the LAS header summary, the text folding for the PDF report, and the
// LAZ path, which must give exactly the same points as the equivalent LAS file.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { treeCarbon, standCarbon, addCarbonColumns, CARBON_DEFAULTS } from "../src/carbon.js";
import { layerOf, classifyByHeight, layerSummary, VEG_THRESHOLDS } from "../src/vegLayers.js";
import { getLasInfo } from "../src/lasInfo.js";
import { pdfText, buildInventoryPDF } from "../src/inventoryReport.js";
import { isLaz, makeLazToLas } from "../src/lazLoader.js";
import { parseLAS } from "../src/lasParser.js";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "..", "test_data");
const readAB = (f) => {
  const b = readFileSync(join(dataDir, f));
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);

// ---------- carbon ----------
test("carbon: IPCC chain for one tree (defaults R = 0.29, CF = 0.47)", () => {
  const c = treeCarbon(1000);
  close(c.bgbKg, 290);
  close(c.carbonKg, (1000 + 290) * 0.47);
  close(c.co2eqKg, (1000 + 290) * 0.47 * 44 / 12);
});

test("carbon: reproduces the v1.9 sample report (AGB 84.64 t)", () => {
  const c = treeCarbon(84640);
  close(c.bgbKg / 1000, 24.5456, 1e-4);
  close(c.carbonKg / 1000, 51.3172, 1e-4);
  close(c.co2eqKg / 1000, 188.1630, 1e-3);
});

test("carbon: stand totals skip trees without biomass and report per hectare", () => {
  const trees = [{ bm_total: 100 }, { bm_total: null }, { bm_total: NaN }, { bm_total: 0 }, { bm_total: 300 }];
  const s = standCarbon(trees, { areaHa: 0.5 });
  assert.equal(s.treesWithBiomass, 2);
  close(s.agb_t, 0.4);
  close(s.carbonPerHa_tC, s.carbon_tC / 0.5);
  assert.equal(standCarbon(trees).carbonPerHa_tC, null);
});

test("carbon: user coefficients are used and recorded", () => {
  const s = standCarbon([{ bm_total: 1000 }], { rootToShoot: 0.4, carbonFraction: 0.51 });
  close(s.bgb_t, 0.4);
  close(s.carbon_tC, 1.4 * 0.51);
  assert.equal(s.method.rootToShoot, 0.4);
  assert.equal(s.method.carbonFraction, 0.51);
  assert.equal(CARBON_DEFAULTS.rootToShoot, 0.29);
});

test("carbon: per-tree columns are blank for trees without biomass", () => {
  const [a, b] = addCarbonColumns([{ bm_total: 100 }, { bm_total: null }]);
  assert.equal(a.Carbon_kgC, (129 * 0.47).toFixed(1));
  assert.equal(b.Carbon_kgC, "");
});

// ---------- vegetation layers ----------
test("vegetation layers: threshold boundaries", () => {
  assert.equal(layerOf(0.49), 0);
  assert.equal(layerOf(0.5), 1);
  assert.equal(layerOf(1.99), 1);
  assert.equal(layerOf(2.0), 2);
  assert.equal(layerOf(5.0), 3);
  assert.equal(layerOf(40), 3);
});

test("vegetation layers: heights with no ground estimate are never vegetation", () => {
  assert.equal(layerOf(NaN), 0);
  assert.equal(layerOf(Infinity), 0);
  const { counts } = classifyByHeight(Float32Array.from([NaN, 1, 3, 10, NaN]), 5);
  assert.deepEqual(counts, [2, 1, 1, 1]);
});

test("vegetation layers: custom thresholds and summary", () => {
  const h = Float32Array.from([0.2, 1, 2.5, 4, 9, 20]);
  const { counts } = classifyByHeight(h, h.length, { groundMax: 1, lowMax: 3, mediumMax: 8 });
  assert.deepEqual(counts, [1, 2, 1, 2]);
  const s = layerSummary(counts);
  assert.equal(s.vegetationPoints, 5);
  close(s.understoreyFraction, 3 / 5);
  assert.deepEqual(VEG_THRESHOLDS, { groundMax: 0.5, lowMax: 2.0, mediumMax: 5.0 });
});

// ---------- LAS info ----------
test("LAS info: density uses the file's full point count when the cloud was thinned", () => {
  const n = 1000;
  const x = new Float32Array(n), y = new Float32Array(n), z = new Float32Array(n), cl = new Uint8Array(n);
  for (let i = 0; i < n; i++) { x[i] = (i % 100); y[i] = Math.floor(i / 10); z[i] = 100 + (i % 7); cl[i] = i < 400 ? 2 : 5; }
  const info = getLasInfo({ x, y, z, classification: cl, nOrig: 4000, ox: 500000, oy: 4100000, hasRGB: false });
  assert.equal(info.subsampled, true);
  close(info.areaHa, (99 * 99) / 10000);
  close(info.densityPerM2, 4000 / (99 * 99));
  close(info.minX, 500000); close(info.maxY, 4100000 + 99);
  assert.equal(info.classes[0].code, 5);
  close(info.classes[0].pct, 60);
  assert.equal(info.epsg, null);
});

test("LAS info: summary of a real test file", () => {
  const p = parseLAS(readAB("test_fmt1.las"));
  const info = getLasInfo(p);
  assert.equal(info.pointCount, p.x.length);
  assert.ok(info.classes.some((c) => c.code === 2) && info.classes.some((c) => c.code === 5));
});

// ---------- PDF report ----------
test("PDF text: Turkish letters outside WinAnsi are folded, the rest kept", () => {
  assert.equal(pdfText("Kızılçam_Şahinler_ĞİŞ"), "Kizilçam_Sahinler_GIS");
  assert.equal(pdfText("Sönmez — Ø"), "Sönmez — Ø");
  assert.equal(pdfText(null), "");
});

test("PDF report: builds, with a carbon page only when carbon is given", async () => {
  const { jsPDF } = await import("jspdf");
  const trees = Array.from({ length: 30 }, (_, i) => ({ h: 8 + i * 0.5, cd: 3, cpa: 7, dbhModel: 15 + i, bm_total: 80 + i * 5 }));
  assert.equal(buildInventoryPDF(trees, { projectName: "Kızılçam" }, jsPDF).getNumberOfPages(), 1);
  const carbon = standCarbon(trees, { areaHa: 1 });
  assert.equal(buildInventoryPDF(trees, { areaHa: 1, carbon }, jsPDF).getNumberOfPages(), 2);
});

// ---------- LAZ ----------
test("LAZ: detected by name or by the compression bit, LAS is not", () => {
  assert.equal(isLaz("x.LAZ", null), true);
  assert.equal(isLaz("x.las", readAB("test_fmt1.laz")), true);
  assert.equal(isLaz("x.las", readAB("test_fmt1.las")), false);
});

for (const [lasFile, lazFile] of [["test_fmt1.las", "test_fmt1.laz"], ["test_fmt7.las", "test_fmt7.laz"]]) {
  test(`LAZ: ${lazFile} gives exactly the same points as ${lasFile}`, async () => {
    const lazPerf = (await import("laz-perf")).default;
    const lazToLas = makeLazToLas(lazPerf.createLazPerf);
    const { buffer, originalCount } = await lazToLas(readAB(lazFile));
    const A = parseLAS(readAB(lasFile)), B = parseLAS(buffer);
    assert.equal(originalCount, A.nOrig);
    assert.equal(B.n, A.n);
    assert.equal(B.ox, A.ox); assert.equal(B.oy, A.oy);
    for (const k of ["x", "y", "z", "intensity", "classification", "r", "g", "b"]) {
      assert.deepEqual(Array.from(B[k]), Array.from(A[k]), k);
    }
  });
}

test("LAZ: thinning while decompressing keeps the same points parseLAS would keep", async () => {
  const lazPerf = (await import("laz-perf")).default;
  const lazToLas = makeLazToLas(lazPerf.createLazPerf);
  const { buffer, originalCount } = await lazToLas(readAB("test_fmt1.laz"), { maxPoints: 100 });
  const full = parseLAS(readAB("test_fmt1.las"));
  const thin = parseLAS(buffer);
  const step = Math.ceil(full.nOrig / 100);
  assert.equal(originalCount, full.nOrig);
  assert.equal(thin.n, Math.ceil(full.nOrig / step));
  for (let i = 0; i < thin.n; i++) {
    assert.equal(thin.z[i], full.z[i * step]);
    assert.equal(thin.x[i], full.x[i * step]);
    assert.equal(thin.classification[i], full.classification[i * step]);
  }
});
