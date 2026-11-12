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

## v1.9.3 — 3D navigation and real coordinates

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
| ⏳ | Intensity colour mode | Values are clipped at 255; most sensors store 0–65535, so clouds can look uniformly white. Scale to the file's own range. |
| 🔬 | Valid height range for every DBH model | Out-of-range warning already exists for models that return no value; ranges are needed for stone pine, beech and Turkey oak, whose models saturate instead. |
| 🔬 | Carbon root-to-shoot ratio | Options: IPCC 2006 Table 4.4 by above-ground biomass per hectare, or measured Turkish values (e.g. Durkaya et al. 2020). |

## v1.11 — technical

| | Item | Notes |
|---|---|---|
| ⏳ | Background under the cloud, user's choice | 2D map background and textured ground in 3D. Options: none (default) · satellite image (online) · street map (online) · own orthophoto (GeoTIFF, e.g. from Agisoft Metashape or Pix4D; offline). Online options need the CRS and a reprojection library; requesting tiles tells the tile server where the area is, so the user is told this once before turning them on. Tile-service terms and attribution to be checked. |
| ⏳ | Decompress LAZ in a Web Worker | Large files currently freeze the page for a few seconds. |
| ⏳ | Turkish PDF report | Needs an embedded font. |
| ⏳ | Upgrade Vite | Clears the remaining development-server advisories. |
| ⏳ | Move species and biomass models out of `App.jsx` | Prerequisite for v2.0 and for testing the models directly. |

## v2.0 — international model library

| | Item | Notes |
|---|---|---|
| ⏳ | DBH models outside Türkiye | From a verified model table: Jucker et al. 2017 (global and region/group-specific), Kalliovirta & Tokola 2005, Valbuena Rabadán et al. 2016, Balenović et al. 2015, Gonzalez-Benecke et al. 2014. |
| ⏳ | Above-ground biomass models outside Türkiye | Jucker et al. 2017 (directly from height × crown diameter), Jenkins et al. 2003, Lambert et al. 2005, Repola 2009, Altanzagas et al. 2019, Delcourt & Veraverbeke 2022. |
| ⏳ | Model choice by region and species | Each model receives the crown measure it was fitted with (mean, maximum or equal-area diameter), shows its source and valid range, and is covered by tests against values computed from the original papers. |
| ⏳ | Manual and report updates | |
