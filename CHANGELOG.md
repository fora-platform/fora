# Changelog

All notable changes to FORA will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2.0.0

### Added

- Biomass model library: 134 above-ground and 45 root models
  (`src/biomassLibrary.js`, listed in BIOMASS_MODELS.md), generated from the FORA
  model-library workbook, in which every coefficient was checked against its
  paper. Models are grouped as Türkiye, Europe–Mediterranean or world. Among
  them are the Spanish national equations of Montero et al. (2005) for Scots,
  black and stone pine, beech and two oaks, with root equations for all but beech.
- Biomass and carbon for every species, not only Calabrian pine. In the Sp tab
  the biomass model is chosen from a list grouped by scope (Europe–Mediterranean,
  Türkiye, world); the recommended model is the first Europe–Mediterranean one.
  The source, inputs, data range and how the coefficients were checked are shown.
- Choice of DBH model: 30 library models (`src/dbhLibrary.js`,
  generated from the workbook: Valbuena Rabadán et al. 2016, Kalliovirta & Tokola
  2005, Balenović et al. 2015, Jucker et al. 2017 global and Palearctic, and
  Gonzalez-Benecke et al. 2014) and three Turkish Turkey oak models (Gencal
  2019 MSc thesis; Sönmez & Gencal 2023, Bursa) next to FORA's own Turkish
  models, grouped by scope in the Sp tab (`src/dbhChoice.js`). Each model receives the crown measure
  it was fitted with (mean, maximum or equal-area crown diameter, or crown area);
  the crown-based biomass models get the mean crown diameter.
- DBH model spread: mean tree DBH from every DBH model that fits the species, in
  the Metrics tab, CSV and PDF.
- Every DBH and biomass model shows, under Details, the formula FORA computes with
  its coefficients and what each variable means. The formulas are generated from
  the same expressions the models run, and a test checks that they agree.
- Below-ground biomass from root models where the species has one (from the same
  paper as the above-ground model where possible).
- Model spread: stand above-ground biomass from every model that fits the
  species, in the carbon panel, CSV and PDF.
- Trees outside a biomass model's data range are counted and flagged
  (CSV column `Biomass_out_of_range`).
- Tests for every model against the workbook values and for nine biomass and
  five DBH models against coefficients typed from the papers
  (`test/biomass.test.mjs`, `test/dbh.test.mjs`).

### Changed

- Carbon defaults follow the IPCC 2006 tables for temperate forests: carbon
  fraction 0.51 for conifers and 0.48 for broadleaves (Table 4.3); root-to-shoot
  ratio by species group and stand above-ground biomass per hectare (Table 4.4,
  middle class until the area is calculated). Previously R 0.29 and CF 0.47 for
  all. Leaving the boxes empty uses the automatic values; a typed value overrides.
- Calabrian pine with the Sönmez et al. (2016) model: the total above-ground
  biomass is multiplied by exp(RSE²/2) = 1.068, the usual correction for a model
  fitted on the log scale (the paper gives none). The same correction is applied
  to the four other log-scale models without a published one. Components are
  unchanged.
- Default biomass scope is Europe–Mediterranean: for Calabrian pine this is
  de-Miguel et al. (2014, Syria and Lebanon) instead of Sönmez et al. (2016);
  choose it in the Türkiye group of the Sp tab for the previous model.
- Default DBH model is the Europe–Mediterranean one, otherwise a Jucker et al.
  (2017) Palearctic model, so DBH differs from v1.9.3 for every species but
  Turkey oak. FORA's previous models are in the Türkiye group of the DBH list.
- Species list: seven species. Calabrian pine's three regional models are DBH
  models of one species instead of three species. Some Turkish names are more
  precise (Uludağ göknarı, Doğu kayını, Saçlı meşe).
- Species and models are chosen only in the Sp tab; the Metrics tab shows the
  applied species and models with a link to the Sp tab. After Apply, the Sp tab
  confirms how many trees got DBH₁ and biomass and links to the tree table; it
  warns when the selection has changed but was not applied.
- CSV: new columns `Biomass_model`, `Biomass_out_of_range`, `BGB_source`,
  `DBH_source`, `DBH_out_of_range`; a DBH_MODEL block and the carbon block record
  the models, coefficients and their sources.
- PDF report: the DBH and biomass models, their sources and data ranges and the
  carbon method with its sources are written out.
- Species DBH models moved from `App.jsx` to `src/species.js` (unchanged).

## [1.9.3] - 2026-11-13

### Added

- 3D navigation: pan with the right or middle mouse button, Shift+drag, or the
  new pan-mode button (for touchpads); the wheel zooms toward the point under the
  cursor; on touch screens one finger rotates and two fingers pan and pinch-zoom.
  Buttons to reset the view and to look from above with north up.
- Coordinate axes in 3D: a ground grid at round easting and northing values with
  labels, an elevation axis and a north arrow. They can be hidden.
- 2D: grid labels show the file's real easting and northing (previously offsets
  from the first point), and a read-out shows the coordinates under the cursor.
- Vertical axis choice for the 3D view and the side view: height above ground
  (default when heights are normalised; the terrain is flattened, so tree heights
  can be read from the axis) or the file's elevation. In the height-above-ground
  view, points without a ground estimate are not shown.

### Changed

- The 3D view follows changes of the window size and is redrawn only when the
  view changes, which lowers GPU load while idle.
- The 3D view keeps its position when the colour mode or point size changes; it
  is reset when a new file is loaded or an area is clipped.
- Version reported in the interface, package.json, CITATION.cff and README
  aligned at 1.9.3.

### Fixed

- Side view: the 1.3 m, 5 m … reference lines were measured from the lowest point
  of the file, not from the ground, which was misleading on slopes. They are now
  drawn in the height-above-ground view only, where they are correct.

### Documentation

- Manual (Turkish and English): 3D navigation, coordinate axes and the vertical
  axis choice.

## [1.9.2] - 2026-11-04

### Fixed

- Transect: the profile panel opened below the visible area and was drawn while
  it was still opening, so it stayed blurred until the view was switched to 3D and
  back. The 2D view now shrinks to make room for the panel, and every 2D canvas is
  redrawn when its size changes (also when the window is resized).
- Text on the 2D map, the side view and the transect was drawn at half the intended
  size on the high-resolution canvases.
- The colour-mode menu was too narrow to read.

### Added

- Colour legend in the 2D and 3D views for every colour mode: elevation range,
  height above ground, intensity, ASPRS classes and vegetation layers.
- Transect: distance axis, height axis with even steps, A and B end labels on the
  map and on the profile, and a title stating that heights are above ground.

### Changed

- Version reported in the interface, package.json, CITATION.cff and README
  aligned at 1.9.2.

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
