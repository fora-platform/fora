# FORA roadmap

Planned work after v1.9.0, grouped by release. Each item is developed on its own
branch, tested locally (`npm test`, `npm run build`, `npm run preview`), merged through
a pull request, and listed in [CHANGELOG.md](CHANGELOG.md) when released.

Status: ✅ done · 🔧 in progress · ⏳ planned · 🔬 needs a scientific decision

---

## v1.9.1 — bug fixes · released 2026-11-04

| | Item | Notes |
|---|---|---|
| ✅ | Tree metrics were capped at 5000 segments | Larger areas silently lost trees in the table, CSV, PDF, stem density and carbon. Metrics are now computed in one pass over the points (identical results, 20–170× faster). |
| ✅ | `npm test` failed on Node.js 22 and later | Script changed to `node --test`; verified on Node 20 (CI) and 22. |
| ✅ | Tests for the v1.9 modules | Carbon, vegetation layers, LAS info, PDF text, LAZ round-trip against LAS (new fixtures in `test_data/`). |
| ✅ | Citation box | Adds the BibTeX entry of the SoftwareX article. |
| ✅ | `npm audit` advisories (5 of 7) | All seven were in development tools only, not in the published site. Five cleared with non-breaking updates (only versions at least two weeks old); the remaining two need the Vite major upgrade in v1.11. |

## v1.9.2 — display fixes · released 2026-11-04

| | Item | Notes |
|---|---|---|
| ✅ | Transect shown only after switching to 3D and back | The panel was pushed below the screen and drawn while opening (22 px tall). Layout fixed; canvases redraw on resize. |
| ✅ | Small text on 2D canvases | Font sizes now account for the 2× canvas resolution. |
| ✅ | Colour legend in 2D and 3D | What each colour means, in metres or classes. |
| ✅ | Transect axes | Distance and height ticks, A/B end labels. |
| ✅ | Colour-mode menu too narrow | |

## v1.9.3 — 3D navigation and real coordinates · released 2026-11-13

| | Item | Notes |
|---|---|---|
| ✅ | Pan in 3D | Right or middle button, Shift+drag, or a pan-mode button for touchpads; the view could only be rotated and zoomed around a fixed centre. |
| ✅ | Zoom to the cursor | The wheel zooms toward the point under the cursor instead of the centre. |
| ✅ | Touch control in 3D | One finger rotates, two fingers pan and pinch-zoom (tablets, touch screens). |
| ✅ | Reset and top view buttons | Top view looks straight down with north up. |
| ✅ | Coordinate axes in 3D | Ground grid at round easting/northing values with labels, elevation axis, north arrow; can be hidden. |
| ✅ | Real coordinates in 2D | Grid labels show easting/northing instead of offsets from the first point; cursor position read-out. |
| ✅ | Vertical axis: height above ground or elevation | 3D and side view; height above ground by default, so tree heights are read directly from the axis. |
| ✅ | Side view height lines | Were measured from the lowest point of the file; now shown only above the ground, where they are correct. |
| ✅ | 3D view follows window resizes; draws only when the view changes | Lower GPU load while idle. |

## v1.10 — usability

| | Item | Notes |
|---|---|---|
| ⏳ | Warn when coordinates are in degrees | Photogrammetry exports (e.g. Agisoft Metashape) often keep WGS 84 latitude/longitude while Z is in metres: the cloud then appears as a single vertical line in 3D, the extent reads 0 × 0 m and segmentation fails. Detect a near-zero horizontal extent with a normal height range and ask for a projected CRS in metres (e.g. UTM); automatic conversion can follow once EPSG is read (v1.11). |
| ⏳ | Coordinate system: read, warn, choose | Read the CRS from the file (GeoKey directory in LAS 1.2–1.3, WKT in LAS 1.4) and show it. When the file has none, say so and let the user pick one (common list for Türkiye and Europe: WGS 84 / UTM, TUREF / TM, ED50 / UTM) or type an EPSG code. Prerequisite for the background maps in v1.11. |
| ⏳ | Metrics table pagination | The table lists only the first 200 trees. |
| ⏳ | Keep field measurements when segmentation is re-run | H₂, CD₂ and DBH₂ are currently erased; match old and new trees by position. |
| ⏳ | Apply an external DTM to the loaded file | Today it only takes effect on the next file load. |
| ⏳ | CSV for spreadsheets with a decimal comma | Optional `;`-separated export. |
| ⏳ | Open in the 3D view | The 3D view is drawn by the graphics card and, since v1.9.3, only when the view changes; on large files it feels lighter than 2D. Clipping, transects and tree selection stay in 2D, one click away. |
| ⏳ | Faster 2D view | 2D redraws every point on each pan and zoom step. Draw the points once into an off-screen image, move that image while panning and redraw only when zoom, colours or data change. |
| ⏳ | Intensity colour mode | Values are clipped at 255; most sensors store 0–65535, so clouds can look uniformly white. Scale to the file's own range. |
| 🔬 | Valid height range for every DBH model | The DBH models from outside Türkiye carry their data ranges and flag trees outside them (v2.0). FORA's own models only warn when they return no value; ranges are needed for stone pine, beech and Turkey oak, whose models saturate instead. |
| ✅ | Carbon root-to-shoot ratio and carbon fraction | Decided and implemented in v2.0: root models where the species has one; otherwise R from IPCC 2006 Table 4.4 for temperate forests by group and stand above-ground biomass per hectare (middle class until the area is calculated); CF 0.51 for conifers and 0.48 for broadleaves (Table 4.3). Typed values still override. Background: verified against the IPCC 2006 Guidelines (Vol. 4, Ch. 4, Tables 4.3–4.4); Türkiye's national figures use the same values (Tolunay 2011). The temperate values are used because IPCC 2006 has no R for subtropical mountain systems. Previously R 0.29 and CF 0.47 for every species. |
| ✅ | Log-scale correction for Calabrian pine biomass | Applied in v2.0 to the total (× 1.068), stated in the panel, CSV and report; components as published. The same rule is used for the four other log-scale models whose papers give no correction. Background: FORA's model (Sönmez et al. 2016) was re-checked against the paper: all 17 coefficients match. The equations were fitted on the log scale and neither the paper nor FORA corrects the back-transformation; applying exp(RSE²/2) would raise total above-ground biomass by 6.8% (components 14–37%). |

## v1.11 — technical

| | Item | Notes |
|---|---|---|
| ⏳ | Background under the cloud, user's choice | 2D map background and textured ground in 3D. Options: none (default) · satellite image (online) · street map (online) · own orthophoto (GeoTIFF, e.g. from Agisoft Metashape or Pix4D; offline). Online options need the CRS and a reprojection library; requesting tiles tells the tile server where the area is, so the user is told this once before turning them on. Tile-service terms and attribution to be checked. |
| ⏳ | Decompress LAZ in a Web Worker | Large files currently freeze the page for a few seconds. |
| ⏳ | Turkish PDF report | Needs an embedded font. |
| ⏳ | Upgrade Vite | Clears the remaining development-server advisories. |
| ✅ | Move species and biomass models out of `App.jsx` | Done in v2.0: `src/species.js` (DBH models, unchanged), `src/biomassLibrary.js` (generated from the model-library workbook by `tools/build_biomass_library.py`), `src/modelChoice.js` (species mapping); all tested directly. |

## v2.0 — international model library · in development

| | Item | Notes |
|---|---|---|
| ✅ | DBH models outside Türkiye | Done: 30 models in `src/dbhLibrary.js`, generated from the workbook: Jucker et al. 2017 (global and Palearctic by biome and group), Kalliovirta & Tokola 2005, Valbuena Rabadán et al. 2016, Balenović et al. 2015, Gonzalez-Benecke et al. 2014, and for Turkey oak Gencal 2019 (MSc thesis) and Sönmez & Gencal 2023 (Bursa; from height or crown diameter, in the Türkiye group). In the Sp tab the DBH model is chosen from a list grouped by scope, next to FORA's own Turkish models; the default is the Europe–Mediterranean model, otherwise the Jucker Palearctic model for the biome of the species' main Turkish range. |
| ✅ | Above-ground biomass models, all species | Done: 134 above-ground models in `src/biomassLibrary.js`, listed in [BIOMASS_MODELS.md](BIOMASS_MODELS.md); models the workbook marks unusable are left out. Sources: Jucker et al. 2017 (directly from height × crown diameter), Jenkins et al. 2003, Lambert et al. 2005, Repola 2009, Altanzagas et al. 2019, Delcourt & Veraverbeke 2022. Mediterranean conifers: Ruiz-Peinado et al. 2011 (Pinus nigra, P. sylvestris, P. pinea, P. halepensis, Abies alba); Correia et al. 2010 (P. pinea, Portugal); Correia et al. 2018 (P. pinea, Italy, Spain and Portugal, 283 trees, with root models). Mediterranean broadleaves: Ruiz-Peinado et al. 2012 (13 species incl. Alnus glutinosa, Fraxinus angustifolia, Fagus sylvatica, Castanea sativa, Populus × euramericana and five oaks); Cienciala et al. 2008 (Quercus robur/petraea, Czechia; one model also uses crown width). Spain, older diameter-only national equations: Montero et al. 2005 (Scots, black, stone and Aleppo pine, European beech, pedunculate and Pyrenean oak, Spanish fir; read twice from the monograph, identical to the allometric/models record for the totals). Calabrian pine: Sönmez et al. 2016 (the model FORA uses, now checked against the paper) and de-Miguel et al. 2014 (Syria and Lebanon, 201 trees). Europe-wide diameter-only equations: Forrester et al. 2017 (24 species and groups incl. Pinus nigra, P. sylvestris, Abies alba, Fagus sylvatica and Quercus robur/petraea). Beech and fir in south-eastern Europe: Zianis & Mencuccini 2003 (Balkan beech, Greece, and a general Fagus equation), Dutcă et al. 2020 (European beech and silver fir, Romanian Carpathians plus generic data, 5–93 cm; coefficients taken from treeallometry.org because the paper's table is an image). Türkiye: Saraçoğlu 1998 (oriental beech), Saraçoğlu 2000 (Alnus glutinosa subsp. barbata), Durkaya et al. 2013 (Uludağ fir, d ≥ 20 cm only), Özdemir et al. 2019 (Hungarian, Turkey and sessile oak, coppice stands in Thrace, 474 trees), Durkaya et al. 2013 (Taurus cedar, Antalya), Aydın 2016 (Taurus cedar across its range, 83 trees, 5.5–56 cm, with a root model; re-fitting the thesis's own tree data gives the selected equations within 3%), Durkaya et al. 2010 (Scots pine, Erzurum), Tolunay 2012 (young Scots pine, Bolu; re-fitting the paper's own 13 trees gives the published coefficients), Sağlam et al. 2020 (Turkey oak coppice, Adıyaman, 308 trees), Özcan et al. 2020 (grey poplar, Van). Found by a web search of Turkish studies, coefficients read twice from the open-access PDFs, page images still to be checked: Durkaya et al. 2009, 2015 and 2022 (Calabrian pine; Adana, Mersin), Durkaya et al. 2010, 2015 and 2019 (Crimean pine; Zonguldak, Kızılcahamam), Durkaya et al. 2015 and 2016 (Scots pine; Erzurum, Çerkeş), Özkaya 2021 (oriental spruce, Artvin), Özbayram & Seçgin 2019 (chestnut coppice, Kocaeli). For a 25 cm, 18 m tree the Turkish Crimean pine models give 203–251 kg. Before v2.0 FORA computed biomass for Calabrian pine only (Sönmez et al. 2016); for a 25 cm, 18 m tree the de-Miguel models give 6% less to 13% more. |
| ✅ | Model choice by region and species | Done: species, DBH model and biomass model are chosen in one place, the Sp tab; each list is grouped by scope (Europe–Mediterranean, Türkiye, world) with the recommended model marked, and the Metrics tab shows what is applied. Seven species: Calabrian pine's three regional models are DBH models of one species. Source, inputs, data range and how the coefficients were checked are shown; trees outside a model's data range are counted. Every FORA species now has at least one verified biomass model. Turkish models exist for Calabrian pine, Crimean pine, Scots pine, Uludağ fir, oriental beech and Turkey oak; none were found for stone pine, Taurus fir or juniper, which use Mediterranean or European models. Models are grouped as Türkiye, Europe–Mediterranean or world, so the user can choose the scope. The public database treeallometry.org agrees with every shared coefficient checked (Lambert 256/256, Ruiz-Peinado 2012 23/23, de-Miguel 21/21, Jenkins 10/10, Forrester, Cienciala, Repola, Delcourt) but has no Turkish equations. The allometric/models publication files agree with the library for Forrester (40/40) and Delcourt (2/2); their Montero et al. 2005 branch and foliage coefficients contain transcription errors (exponents off by whole numbers), so only the totals and roots that match the monograph are used. Every model is tested against the workbook value, nine against coefficients typed from the papers. |
| ✅ | Crown measure per model | Done: each DBH model gets the crown measure it was fitted with (mean crown diameter from the bounding box, maximum diameter from the hull or the longer bounding-box side, equal-area diameter, crown area); the crown-based biomass models (Jucker et al. 2017, Cienciala et al. 2008 CIE-Q3) get the mean crown diameter. FORA's own models keep the crown outline chosen in the Tools tab. |
| ✅ | Below-ground biomass from root models | Done: the root model from the same paper as the above-ground model, otherwise the species' root model, otherwise the IPCC ratio; the panel, CSV and report say which. Where a species root model exists (Ruiz-Peinado et al. 2011, 2012; Forrester et al. 2017, 16 species and groups; Aydın 2016, Taurus cedar; Röhling et al. 2019, Scots pine, oak and birch in Germany; Montero et al. 2005, six Spanish species), compute below-ground biomass directly instead of applying a fixed ratio. The library's 45 root models give 42–224 kg of roots for the same 25 cm tree. Measured root-to-shoot ratios range from 0.16 (beech) to 0.81 (alder) in the Spanish broadleaves, and the five Spanish conifers give 0.16 to 0.39 at the same tree. |
| 🔧 | Model spread as uncertainty | Biomass and DBH done: stand above-ground biomass and mean tree DBH from every model that fits the species, in the interface, CSV and PDF. Carbon to follow. Show the range of DBH, biomass and carbon across all models valid for the species and region, not only one value; the verified models differ by up to 34 cm in DBH for the same tree (24 m tall, 5.5 m crown). |
| ✅ | Manual and report updates | MANUAL, KILAVUZ, README, ALLOMETRIC_MODELS and the new BIOMASS_MODELS.md; the PDF report and CSV name the models, coefficients and their sources. |
| 🔬 | Sources still to obtain | Page-image check of the web-read Turkish models (Durkaya et al. 2009, 2010 Crimean pine, 2015, 2016, 2019 and 2022). Uğurlu et al. 1976 (Scots pine) survives only as a diameter equation quoted in later papers. Checked and not used: Sakıcı et al. 2018 (Calabrian pine saplings, stem-base diameter), Bilgili & Küçük 2009 (young Calabrian pine crown fuel; its coefficients do not reproduce the paper's own data), the Scots pine height model of Durkaya et al. 2015 (85–322 kg for the same 25 cm tree between 15 and 20 m height) and the cedar model of Karataş et al. 2017 (twice the sum of its own components at 41 cm). |

## Later — ideas

| | Item | Notes |
|---|---|---|
| ⏳ | Stand table for forest management planning | Diameter-class distribution (4 cm classes), stems, basal area and stem volume per hectare in the PDF report and CSV. Volume needs verified double-entry volume equations for Turkish species; the first is verified (Sakıcı et al. 2018, Crimean pine, Kastamonu), others are still needed. Candidates for Turkey oak: Gencal 2019 (MSc thesis, Bursa; single- and double-entry tables) and the Marmara Forestry Research Institute 2023 project report (Näslund, R² 0.994); coefficients to be read from the page images (the thesis text is garbled, the report's units and model numbers are inconsistent). Taper equations would also give volume by assortment; Turkish taper equations exist for Taurus cedar and Taurus fir (Özçelik & Dirican 2017; Alkan & Özçelik 2021). |
| ⏳ | DBH from crown diameter and stem density | Nunes et al. 2022 (Spanish national forest inventory; Scots, stone and Aleppo pine, oaks, chestnut, other conifers and broadleaves) model crown diameter from DBH and the mean distance between trees; inverted, it gives DBH from the LiDAR crown and the stems per hectare FORA already computes. The same paper gives crown length, i.e. crown base height. Coefficients checked against the paper's tables (all 24 match the allometric/models record, whose distance term is inverted); the DBH and height ranges of the sample trees are in the supplementary tables, not yet seen. |
| ⏳ | Maquis biomass from shrub height and cover | Spanish shrubland models (Montero et al. 2020: kermes oak, mastic, tree heath, rockroses and others common in Turkish maquis) give biomass per hectare from mean shrub height and cover, which FORA's vegetation layers provide. The original monograph must be checked before use. |
| ⏳ | GIS export of trees | Tree tops (points) and crowns (polygons) with all metrics as GeoJSON or GeoPackage, in the file's coordinate system (needs the CRS from v1.10). |
