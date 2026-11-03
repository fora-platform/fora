// carbon.js — convert FORA's biomass output into carbon and CO2 equivalent.
//
// FORA already computes dry-biomass components for Pinus brutia (Sönmez et al.
// 2016). In App.jsx these live on each tree record of the `met` array as:
//   bm_total, bm_stem, bm_branch, bm_bark, bm_needle   (kg)
// and the modelled diameter as dbhModel. This module adds the standard last
// step — carbon stock and CO2 equivalent — following IPCC guidance.
//
// Method (IPCC 2006 Guidelines, Vol. 4):
//   below-ground biomass (BGB) = AGB × R        (root-to-shoot, default 0.29)
//   carbon stock (C)           = (AGB + BGB) × CF   (carbon fraction, default 0.47)
//   CO2 equivalent             = C × 44/12       (≈ 3.667)
//
// Defaults are the standard constants a carbon report would cite, so the output
// is auditable rather than a black-box figure. Both are adjustable.
//
// Usage in App.jsx (met = your tree array after running the species/biomass step):
//   import { standCarbon, addCarbonColumns } from "./carbon.js";
//   const c = standCarbon(met, { areaHa: standArea });   // stand summary
//   // c.carbon_tC, c.co2eq_tCO2, c.carbonPerHa_tC ...
//   const metPlus = addCarbonColumns(met);               // per-tree columns

export const CARBON_DEFAULTS = {
  carbonFraction: 0.47,   // CF
  rootToShoot: 0.29,      // R
  co2Ratio: 44 / 12,      // ≈ 3.667
};

// One tree. agbKg is the tree's total above-ground dry biomass in kg.
export function treeCarbon(agbKg, opts = {}) {
  const CF = opts.carbonFraction ?? CARBON_DEFAULTS.carbonFraction;
  const R = opts.rootToShoot ?? CARBON_DEFAULTS.rootToShoot;
  const co2r = opts.co2Ratio ?? CARBON_DEFAULTS.co2Ratio;

  const bgbKg = agbKg * R;
  const carbonKg = (agbKg + bgbKg) * CF;
  const co2Kg = carbonKg * co2r;

  return { agbKg, bgbKg, totalBiomassKg: agbKg + bgbKg, carbonKg, co2eqKg: co2Kg };
}

// A whole stand. `trees` is FORA's met array; each tree's above-ground biomass
// is read from the key given by agbKey (default bm_total, FORA's field name).
// Trees without biomass (e.g. non-Pinus brutia, or before the biomass step) are
// skipped.
export function standCarbon(trees, opts = {}) {
  const agbKey = opts.agbKey ?? "bm_total";
  let n = 0, agb = 0, bgb = 0, carbon = 0, co2 = 0;

  for (const t of trees) {
    const v = Number(t[agbKey]);
    if (!Number.isFinite(v) || v <= 0) continue;
    const c = treeCarbon(v, opts);
    n++; agb += c.agbKg; bgb += c.bgbKg; carbon += c.carbonKg; co2 += c.co2eqKg;
  }

  const areaHa = opts.areaHa;
  const perHa = (x) => (areaHa && areaHa > 0 ? x / areaHa : null);

  // totals in tonnes, the unit carbon programmes expect
  return {
    treesWithBiomass: n,
    agb_t: agb / 1000,
    bgb_t: bgb / 1000,
    totalBiomass_t: (agb + bgb) / 1000,
    carbon_tC: carbon / 1000,
    co2eq_tCO2: co2 / 1000,
    carbonPerHa_tC: perHa(carbon / 1000),
    co2PerHa_tCO2: perHa(co2 / 1000),
    method: {
      carbonFraction: opts.carbonFraction ?? CARBON_DEFAULTS.carbonFraction,
      rootToShoot: opts.rootToShoot ?? CARBON_DEFAULTS.rootToShoot,
      co2Ratio: opts.co2Ratio ?? CARBON_DEFAULTS.co2Ratio,
      source: "IPCC 2006 Guidelines for National Greenhouse Gas Inventories, Vol. 4",
    },
  };
}

// Add per-tree carbon fields to a copy of each tree record, ready for CSV or
// the table. Adds BGB_kg, Carbon_kgC, CO2eq_kg (strings, like FORA's export).
export function addCarbonColumns(trees, opts = {}) {
  const agbKey = opts.agbKey ?? "bm_total";
  return trees.map((t) => {
    const v = Number(t[agbKey]);
    if (!Number.isFinite(v) || v <= 0) {
      return { ...t, BGB_kg: "", Carbon_kgC: "", CO2eq_kg: "" };
    }
    const c = treeCarbon(v, opts);
    return {
      ...t,
      BGB_kg: c.bgbKg.toFixed(1),
      Carbon_kgC: c.carbonKg.toFixed(1),
      CO2eq_kg: c.co2eqKg.toFixed(1),
    };
  });
}
