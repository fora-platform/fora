// carbon.js — convert FORA's biomass output into carbon and CO2 equivalent.
//
// FORA computes above-ground dry biomass per tree from the species' biomass
// model (modelChoice.js). In App.jsx this lives on each tree record of the
// `met` array as bm_total (kg); bgb_model (kg) holds the root model's result
// when the species has one. This module adds the standard last step — carbon
// stock and CO2 equivalent — following IPCC guidance.
//
// Method (IPCC 2006 Guidelines, Vol. 4):
//   below-ground biomass (BGB) = root model, or AGB × R (root-to-shoot)
//   carbon stock (C)           = (AGB + BGB) × CF   (carbon fraction)
//   CO2 equivalent             = C × 44/12       (≈ 3.667)
//
// Since v2.0 FORA's defaults follow the IPCC tables for temperate forests:
// R from Table 4.4 by group and stand above-ground biomass per hectare
// (ipccRootToShoot), CF from Table 4.3 by group (IPCC_CF). CARBON_DEFAULTS
// keeps the single IPCC default values (R 0.29, CF 0.47) used before v2.0.
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

// IPCC 2006, Vol. 4, Table 4.3 (temperate and boreal forests).
export const IPCC_CF = {
  conifer: { value: 0.51, label: "conifers, IPCC 2006 Table 4.3", labelTR: "iğne yapraklı, IPCC 2006 Tablo 4.3" },
  broadleaf: { value: 0.48, label: "broadleaves, IPCC 2006 Table 4.3", labelTR: "geniş yapraklı, IPCC 2006 Tablo 4.3" },
  oak: { value: 0.48, label: "broadleaves, IPCC 2006 Table 4.3", labelTR: "geniş yapraklı, IPCC 2006 Tablo 4.3" },
};

// label / labelTR: the class used, in English (report, CSV) and Turkish (interface).
// IPCC 2006, Vol. 4, Table 4.4, temperate forests (oceanic, continental and
// mountain systems). agbPerHa: stand above-ground biomass in t/ha; null when
// the stand area is unknown, in which case the middle class is used.
export function ipccRootToShoot(group, agbPerHa) {
  const known = Number.isFinite(agbPerHa) && agbPerHa >= 0;
  if (group === "oak") {
    // Table 4.4 gives Quercus only above 70 t/ha; below it, other broadleaf (< 75 t/ha)
    if (!known) return { value: 0.30, label: "Quercus spp., > 70 t/ha (area unknown)", labelTR: "meşe, > 70 t/ha (alan bilinmiyor)" };
    return agbPerHa > 70 ? { value: 0.30, label: "Quercus spp., > 70 t/ha", labelTR: "meşe, > 70 t/ha" } : { value: 0.46, label: "other broadleaf, < 75 t/ha", labelTR: "diğer geniş yapraklı, < 75 t/ha" };
  }
  if (group === "broadleaf") {
    if (!known) return { value: 0.23, label: "other broadleaf, 75–150 t/ha (area unknown)", labelTR: "diğer geniş yapraklı, 75–150 t/ha (alan bilinmiyor)" };
    if (agbPerHa < 75) return { value: 0.46, label: "other broadleaf, < 75 t/ha", labelTR: "diğer geniş yapraklı, < 75 t/ha" };
    if (agbPerHa <= 150) return { value: 0.23, label: "other broadleaf, 75–150 t/ha", labelTR: "diğer geniş yapraklı, 75–150 t/ha" };
    return { value: 0.24, label: "other broadleaf, > 150 t/ha", labelTR: "diğer geniş yapraklı, > 150 t/ha" };
  }
  if (!known) return { value: 0.29, label: "conifers, 50–150 t/ha (area unknown)", labelTR: "iğne yapraklı, 50–150 t/ha (alan bilinmiyor)" };
  if (agbPerHa < 50) return { value: 0.40, label: "conifers, < 50 t/ha", labelTR: "iğne yapraklı, < 50 t/ha" };
  if (agbPerHa <= 150) return { value: 0.29, label: "conifers, 50–150 t/ha", labelTR: "iğne yapraklı, 50–150 t/ha" };
  return { value: 0.20, label: "conifers, > 150 t/ha", labelTR: "iğne yapraklı, > 150 t/ha" };
}

// One tree. agbKg is the tree's total above-ground dry biomass in kg.
// opts.bgbKg: below-ground biomass from a root model; replaces AGB × R.
export function treeCarbon(agbKg, opts = {}) {
  const CF = opts.carbonFraction ?? CARBON_DEFAULTS.carbonFraction;
  const R = opts.rootToShoot ?? CARBON_DEFAULTS.rootToShoot;
  const co2r = opts.co2Ratio ?? CARBON_DEFAULTS.co2Ratio;

  const bgbKg = Number.isFinite(opts.bgbKg) && opts.bgbKg >= 0 ? opts.bgbKg : agbKg * R;
  const carbonKg = (agbKg + bgbKg) * CF;
  const co2Kg = carbonKg * co2r;

  return { agbKg, bgbKg, totalBiomassKg: agbKg + bgbKg, carbonKg, co2eqKg: co2Kg };
}

// A whole stand. `trees` is FORA's met array; each tree's above-ground biomass
// is read from the key given by agbKey (default bm_total, FORA's field name).
// Trees without biomass (before the biomass step, or outside the models'
// range) are skipped. With opts.useRootModel, a tree's bgbKey value (default
// bgb_model) replaces AGB × R where it is present.
export function standCarbon(trees, opts = {}) {
  const agbKey = opts.agbKey ?? "bm_total";
  const bgbKey = opts.bgbKey ?? "bgb_model";
  let n = 0, nRoot = 0, agb = 0, bgb = 0, carbon = 0, co2 = 0;

  for (const t of trees) {
    const v = Number(t[agbKey]);
    if (!Number.isFinite(v) || v <= 0) continue;
    const raw = t[bgbKey];
    const r = opts.useRootModel && raw != null && raw !== "" ? Number(raw) : NaN;
    const useR = Number.isFinite(r) && r >= 0;
    const c = treeCarbon(v, { ...opts, bgbKg: useR ? r : undefined });
    n++; if (useR) nRoot++;
    agb += c.agbKg; bgb += c.bgbKg; carbon += c.carbonKg; co2 += c.co2eqKg;
  }

  const areaHa = opts.areaHa;
  const perHa = (x) => (areaHa && areaHa > 0 ? x / areaHa : null);

  // totals in tonnes, the unit carbon programmes expect
  return {
    treesWithBiomass: n,
    treesWithRootModel: nRoot,
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
