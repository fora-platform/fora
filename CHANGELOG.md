# Changelog

All notable changes to FORA will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.9.1] - 2026-11-04

### Fixed

- Tree metrics were limited to the first 5000 segments. In larger areas the
  remaining trees were silently left out of the metrics table, the CSV, the PDF
  report, stem density and the carbon totals. The limit is removed: tree metrics
  are now computed in a single pass over the points, which gives identical results
  and is much faster on large point clouds.
- `npm test` failed on Node.js 22 and later; it now runs on Node 20 and newer.

### Added

- Tests for the carbon, vegetation-layer, LAS-info, PDF-text and LAZ modules,
  including LAZ fixtures checked point by point against their LAS originals.
- The citation box includes the BibTeX entry of the SoftwareX article.
- ROADMAP.md with the planned work.

### Security

- Updated development dependencies (Browserslist, PostCSS, nanoid,
  source-map-js, baseline-browser-mapping) to clear five of the seven `npm audit`
  advisories. None of them affected the published site, which is built to static
  files. Only versions published at least two weeks earlier were accepted. The two
  remaining advisories concern the Vite development server and need a major Vite
  upgrade, planned for v1.11.
- The lockfile now records the package version (it still read 1.8.0).

### Changed

- Version reported in the interface, package.json, CITATION.cff and README
  aligned at 1.9.1.

## [1.9.0] - 2026-11-03

### Added

- LAZ support. Compressed LAZ files open directly in the browser through
  laz-perf (WebAssembly), loaded only when a LAZ is opened. Files above
  5 million points are thinned while decompressing, keeping exactly the points
  the LAS path keeps, so a large LAZ never has to exist as a full uncompressed
  copy in memory.
- LAS file panel (Tools tab): format and version, point count (shown / total),
  point density, extent, bounding-box area, elevation range, RGB presence and
  the ASPRS class distribution.
- Carbon estimate for Calabrian pine (Pinus brutia) following the IPCC 2006
  Guidelines, Vol. 4: below-ground biomass, carbon stock, CO₂ equivalent and
  per-hectare values. The root-to-shoot ratio (default 0.29) and carbon
  fraction (default 0.47) are shown and adjustable. The values are estimates
  and have not been validated with field measurements; the interface, CSV and
  PDF say so.
- Vegetation layer colour mode: ground / low / medium / high by height above
  ground, with adjustable thresholds (default 0.5, 2 and 5 m) and the share of
  points in each layer.
- PDF inventory report (jsPDF, loaded on demand): summary figures, statistics,
  height histogram, the segmentation and ground parameters used, area and stem
  density when area metrics are calculated, and a carbon page when Calabrian
  pine is applied.
- Carbon columns (BGB_kg, Carbon_kgC, CO2eq_kg) appended at the end of the
  tree CSV, so existing column positions are unchanged, and a CARBON_ESTIMATE
  block recording the method and coefficients.
- English species names in the English interface.
- Metrics tab: species selector with Apply, column tooltips, a note separating
  FORA's estimates (H, CD, DBH₁) from field measurements (H₂, CD₂, DBH₂),
  guidance when DBH₁ is empty, a count of trees outside the species model's
  height range, and a note when only the first 200 trees are listed.
- Area tab: a note on which metrics depend on segmentation.
- User manual in Turkish and English (docs/KILAVUZ.md, docs/MANUAL.md),
  linked from the start screen and the top bar.

### Changed

- The Species column of the tree CSV always holds the English name, which
  includes the scientific name.
- Re-running segmentation clears area-based metrics, whose ITC part depends on
  the trees; the ITC section reads "No segmentation yet" instead of zeros.
- The LAZ-to-LAS conversion tips on the start screen appear only if a LAZ
  fails to open.
- The ground (DTM) setting in the Tools tab states that it applies the next
  time a file is loaded.
- Citation note in the interface and README now refer to the published
  SoftwareX article.
- Version reported in the interface, package.json, CITATION.cff and README
  aligned at 1.9.0.

### Fixed

- Applying a different species after Calabrian pine left the previous
  species' biomass on each tree, and in the CSV.
- Trees outside a species model's height range were shown and exported as
  "NaN"; they are now shown as "–" and left empty in the CSV.
- Area-based metrics calculated before segmentation kept reporting zero trees
  after segmentation was run.

## [1.8.0] - 2026-07-18

### Added

- Custom Variable Window Size coefficients: linear (a + b·H, with lower and
  upper clamps) or quadratic (a + b·H + c·H²) entered from the segmentation
  panel, alongside the four built-in presets.
- Classification colour mode in the 2D and 3D views, using the ASPRS class
  palette. Point classification was already parsed but was not displayed.
- Test LAS files covering point data record formats 0-3 and 6-8, with the
  generator script test_data/make_test_las.R.
- Validation script validation/fora_validation.R reproducing the
  cross-tool comparison against lidR reported in the article.
- CITATION.cff.

### Fixed

- Classification byte offset for LAS 1.4 point formats 6-10, where the field
  sits at byte 16 rather than byte 15. Files in these formats previously
  reported classification from the flags byte.
- Coordinate precision for projected data with large northing values.
  Coordinates are now stored relative to a double-precision local origin and
  restored to absolute values for CSV export and external DTM matching;
  single-precision storage previously introduced decimetre-level error.
- Area-based density now uses the actual region of interest (πr² for circular
  clips, the full rectangle for rectangular ones) instead of the point
  bounding box. The exported metrics record which was used in area_source.
- Tree count in the interface distinguishes measured trees from raw segments.
  Segments with fewer than five points are excluded from the metrics table, so
  the badge now reads measured / segments.

### Changed

- Version reported in the interface, package.json and CITATION.cff
  aligned at 1.8.0.
