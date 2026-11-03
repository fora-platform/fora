// vegLayers.js — split vegetation points into low / medium / high layers.
//
// Two independent ways to do this, because a LAS file may or may not carry
// usable classification:
//
//   1. classifyByHeight(p)  — uses normalised heights (height above ground).
//      This is the robust default for forestry: it does not trust the file's
//      class field, only the geometry FORA already computes.
//
//   2. classifyByClass(p)   — uses the ASPRS class field directly, mapping
//      class 3 → low, 4 → medium, 5 → high. Use when the file is already
//      classified and you want to honour it.
//
// Both return, per point, a layer index 0..3:
//   0 ground / non-veg   1 low   2 medium   3 high
// plus the counts, so you can drive a colour mode or a fuel/habitat summary.
//
// Height thresholds follow the common forestry convention and match the ASPRS
// low/medium/high split; they are adjustable per site.

export const VEG_THRESHOLDS = {
  groundMax: 0.5,   // below this is ground / bare, not vegetation
  lowMax: 2.0,      // 0.5–2 m   low vegetation, shrubs, regeneration
  mediumMax: 5.0,   // 2–5 m     understorey
  // above mediumMax is high vegetation / canopy
};

const LAYER = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3 };
export const LAYER_NAMES = ["ground/other", "low", "medium", "high"];

// Layer of one point. Non-finite heights (no ground found for that point) are
// "ground/other", never vegetation — without this guard NaN fell through every
// comparison and was counted as HIGH.
export function layerOf(h, t = VEG_THRESHOLDS) {
  if (!Number.isFinite(h) || h < t.groundMax) return LAYER.NONE;
  if (h < t.lowMax) return LAYER.LOW;
  if (h < t.mediumMax) return LAYER.MEDIUM;
  return LAYER.HIGH;
}

// heights[i] must be the normalised height (metres above ground) for point i.
// If you have not normalised yet, pass p.z minus your ground surface; in FORA
// the normalisation step already produces this array.
export function classifyByHeight(heights, n, thr = {}) {
  const t = { ...VEG_THRESHOLDS, ...thr };
  const layer = new Uint8Array(n);
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < n; i++) {
    const L = layerOf(heights[i], t);
    layer[i] = L;
    counts[L]++;
  }
  return { layer, counts };
}

// Uses the file's own classification field.
export function classifyByClass(classification, n) {
  const layer = new Uint8Array(n);
  const counts = [0, 0, 0, 0];
  const map = { 3: LAYER.LOW, 4: LAYER.MEDIUM, 5: LAYER.HIGH };
  for (let i = 0; i < n; i++) {
    const L = map[classification[i]] ?? LAYER.NONE;
    layer[i] = L;
    counts[L]++;
  }
  return { layer, counts };
}

// A compact summary suitable for a panel or a fuel/habitat report.
export function layerSummary(counts) {
  const veg = counts[1] + counts[2] + counts[3];
  const total = counts[0] + veg;
  const pct = (x) => (total > 0 ? (100 * x) / total : 0);
  const vpct = (x) => (veg > 0 ? (100 * x) / veg : 0);
  return {
    total,
    vegetationPoints: veg,
    layers: [
      { name: "low", count: counts[1], pctOfAll: pct(counts[1]), pctOfVeg: vpct(counts[1]) },
      { name: "medium", count: counts[2], pctOfAll: pct(counts[2]), pctOfVeg: vpct(counts[2]) },
      { name: "high", count: counts[3], pctOfAll: pct(counts[3]), pctOfVeg: vpct(counts[3]) },
    ],
    // a crude fuel/understory indicator: how much of the vegetation is below the canopy
    understoreyFraction: vpct(counts[1] + counts[2]) / 100,
  };
}

// Colours for a three-tier vegetation colour mode, consistent with FORA's
// green canopy palette (RGB 0..255).
export const LAYER_COLOURS = {
  0: [140, 130, 120], // ground / other — muted brown-grey
  1: [200, 210, 120], // low — pale yellow-green
  2: [120, 175, 90],  // medium — mid green
  3: [40, 110, 55],   // high — dark canopy green
};
