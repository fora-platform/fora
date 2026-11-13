# FORA User Manual (v1.9)

FORA is a free, browser-based tool that turns UAV (drone) LiDAR point clouds into a forest inventory.

- **No installation.** Just open https://fora-platform.github.io/fora
- **Your data never leaves your computer.** Files are not uploaded anywhere; everything is computed in your browser.
- **Opens LAS and LAZ** files (versions 1.2–1.4).

> Türkçe sürüm: [KILAVUZ.md](KILAVUZ.md)

---

## Before you start: 3 rules

### Rule 1 — The order is

```
Load  →  (optional) Clip  →  Seg  →  Species  →  Area  →  Report
```

Each step uses the result of the one before it. Species and Area can be done in either order; both come after Seg.

### Rule 2 — Going back clears what came after

| If you… | …this is cleared | What to do |
|---|---|---|
| Load a new file | Everything | Start again |
| Clip, or undo the clip (↩) | Trees, the Metrics table, Area results | Run Seg again |
| Run Seg again | DBH₁, biomass, carbon, Area results **and the H₂ / CD₂ / DBH₂ field values you typed in** | Press Apply again in the Sp tab, recalculate Area |

> Settle your Seg settings before you type in field measurements.

### Rule 3 — Choose an external DTM BEFORE loading the LAS

The ground is computed when the file is loaded. If you choose a DTM afterwards, it only takes effect when you load the file again.

### And remember: FORA saves nothing

If you close or reload the page, all results are lost. Export your **CSV** and **PDF** when you are done.

---

## Your first result in 5 minutes

1. Press **Load LAS / LAZ File** and pick your file.
2. Go to the **Seg** tab and press **Run**. FORA detects the trees and opens the **Metrics** tab for you.
3. In the **Sp** tab, **pick the species** and press **Apply**. The DBH₁ column fills in.
4. Go to the **Area** tab and press **Calculate**.
5. Back in **Metrics**, press **📄 PDF**. Your inventory report downloads.

Each step is explained in detail below, in the same order.

---

## The screen

**Top bar:** number of trees found, messages, the **2D / 3D** switch, the **colour mode** menu, theme (☀ / 🌙), **TR / EN**, **New** (opens another file) and **↩** (undoes the clip; only shown after clipping).

**Side panel tabs:** **Tools · Clip · Seg · Metrics · Area · Stats · Sp · T**

The tab order is not exactly the workflow order. Follow the order in this manual.

---

## 1. Load the file

- You can pick **LAS** or **LAZ**. LAZ is compressed LAS, and FORA opens it by itself. The screen shows "Decompressing LAZ…"; large files can take a few seconds.
- On load, FORA finds the ground and computes each point's **height above ground**. This is called normalisation.
- **If a file has more than 5 million points**, FORA thins it at regular intervals (every k-th point) and **runs every calculation on the thinned cloud**. Tools → LAS File shows this as "shown / total". To work at full density, split the file into smaller tiles beforehand (for example with LAStools or PDAL).

**Tools → LAS File** shows the file's details:
- version (LAS or LAZ)
- point count and point density
- extent and area
- elevation range
- whether RGB is present
- class distribution

The **EPSG** code (coordinate system) is not read in this version; the panel says "not read".

**If a LAZ will not open**, the start screen shows ways to convert it to LAS: CloudCompare, R, LAStools, PDAL.

---

## 2. Ground model (optional): BEFORE the LAS

- **Auto (grid min-Z):** This is the default. The lowest point in each grid cell is taken as ground.
- **External DTM:** Gives a better ground surface under dense understorey. Supported formats: GeoTIFF (.tif), ESRI ASCII (.asc / .txt), XYZ / CSV.

How to use it:
1. On the start screen, choose **External DTM**.
2. Select your DTM file.
3. **Then** load the LAS.

If the DTM's elevation differs from the LAS by more than 50 m, FORA does not use it, switches back to auto mode and tells you.

---

## 3. Look: 2D, 3D and colours

- **2D** is the top-down map (shown first). Grid labels are the file's real easting/northing; moving the mouse shows the cursor coordinates at the bottom.
- **3D** is the three-dimensional view:
  - **Left drag:** rotates.
  - **Right or middle button drag, or Shift + drag:** pans.
  - **Wheel:** zooms toward the point under the cursor.
  - **Touch screen:** one finger rotates, two fingers pan and zoom.
  - Buttons at the top right: **⟲ Reset** (initial view), **⊤ Top** (from above, north up), **✋ Pan** (left button also pans; for touchpads without a middle button), **# Axes** (coordinate grid, easting/northing and height axes, north arrow) and **⇕** (vertical axis).
- **Vertical axis** (3D and the 2D side view; also Tools → Display): **Height above ground** is the default; the terrain is flattened so tree heights can be read from the axis. **Elevation** shows the file's real elevation. Points without a ground estimate (outside an external DTM) are not shown in the height-above-ground view.
- **Colour modes:**
  - Height
  - Normalised (height above ground)
  - RGB (if the file has it)
  - Intensity
  - Classification (ASPRS)
  - **Vegetation layers**
  - Segment (appears after Seg)

**Vegetation layers** splits the points into 4 groups by height above ground:

| Layer | Default range |
|---|---|
| Ground / other | below 0.5 m |
| Low | 0.5 – 2 m |
| Medium | 2 – 5 m |
| High | above 5 m |

When you choose this mode, the Tools tab shows the threshold boxes and each layer's percentage. You can change the thresholds for your site. This mode does not use the file's class field; it only looks at height.

**Tools → Display** has two settings:
- **Size:** how big the points are on screen.
- **Sample:** how many points are drawn on screen. **It only speeds up the display; it does not change any calculation.**

---

## 4. Clip: if the area is large

Clipping speeds things up and lets you focus on the stand you care about. After clipping, every calculation uses only the clipped area.

1. Be in **2D** view. Clipping does not work in 3D.
2. In the **Clip** tab, choose a circle (⊚) or a square (◻).
3. Enter **R (m)**. For a circle it is the radius; for a square it is half the side length (R = 15 → a 30 × 30 m square).
4. Click the centre point on the map.
5. Press **✂ Cut**.

To undo, press **↩** in the top bar. Remember Rule 2: both clipping and undoing clear the trees, the Metrics table and the Area results.

The true area of the clipped circle or square is used for stem density (N/ha) in the Area tab.

---

## 5. Detect trees (Seg)

| Setting | Default | What it does |
|---|---|---|
| **Cell** | 0.5 m | Resolution of the canopy height model (CHM). Smaller means more detail but slower processing. |
| **Min H** | 2 m | Treetops lower than this are not counted as trees. |
| **Search R** | 3 m | Radius of the window used to find treetops (in Fixed mode). |
| **Window Mode** | Fixed | **Fixed:** the same radius everywhere. **VWS:** the window grows with tree height (Popescu & Wynne 2004). |
| **Crown Projection** | Bounding box | How crown diameter is measured: Bounding box (compatible with earlier versions), Convex hull, Concave hull. All three are listed in the CSV. |

VWS presets: **Pine / coniferous**, **Deciduous / broadleaved**, **Combined** (mixed forest), **Linear** (boreal) and **Custom**. With Custom, you enter your own coefficients as a linear or quadratic model.

Press **Run**. The Metrics tab opens and the top bar shows "trees measured / segments found". A segment needs at least 5 points to be measured as a tree.

> **Which window mode?** **Fixed** works well in even stands where trees are similar in height. If heights vary a lot, try **VWS**.

---

## 6. The tree table (Metrics)

| Column | Meaning | Filled in by |
|---|---|---|
| **#** | Tree ID | FORA |
| **H** | Height (m) | FORA |
| **CD** | Crown diameter (m) | FORA |
| **X, Y** | Crown centre coordinates (the file's coordinate system) | FORA |
| **DBH₁** | Modelled diameter (cm). Fills in once a species is applied. | FORA |
| **DBH₂** | Diameter you measured in the field (cm) | **You** (optional) |
| **H₂** | Height you measured in the field (m) | **You** (optional) |
| **CD₂** | Crown diameter you measured in the field (m) | **You** (optional) |
| **N** | Number of points in the tree | FORA |

In short: **H, CD, DBH₁ = FORA's estimates. H₂, CD₂, DBH₂ = your measurements.** Entering measurements is optional; you only need them if you want to validate the estimates (see section 10).

- Hover over a column header to see what it means.
- Click a row to highlight that tree on the map.
- The table shows the **first 200 trees**. The CSV has all of them.
- A **"–"** in the DBH₁ column means that tree's height is outside the valid range of the chosen species model (for example, above about 23.8 m for Calabrian pine – coastal). The orange note above the table says how many trees this applies to.

---

## 7. Species → diameter (DBH) and biomass

Species and models are chosen in one place, the **Sp** tab. The top of the Metrics tab only shows the species and models applied; **Change →** takes you to the Sp tab.

1. Pick the species (7 species).
2. Check or change the **DBH model** and the **biomass model**.
3. Press **Apply**. If you change the selection without pressing Apply, a "Selection changed" warning appears.

In both lists the models are grouped by where their data come from: **Europe–Mediterranean**, **Türkiye**, **World**. The model marked *(recommended)* is used unless you pick another.

### DBH model

FORA estimates DBH from LiDAR height and crown. The recommended model is the Europe–Mediterranean one where there is one, otherwise a world model (Jucker et al. 2017, Palearctic region, by the biome of the species' main range and by conifer/broadleaf). The Turkish models FORA has used since v1 are in the **Türkiye** group.

| Species | Recommended | In the Türkiye group (FORA's previous model) |
|---|---|---|
| Scots pine | VAL — Valbuena Rabadán et al. 2016 (Spain, LiDAR) | Gencal 2025 |
| Uludağ fir | JUC-S4-21 — Jucker 2017 (temperate mixed, conifer) | Gencal 2025 |
| Calabrian pine | JUC-S4-24 — Jucker 2017 (woodlands incl. Mediterranean, conifer) | Özçelik 2014 — coastal / inland / lake district |
| Black pine | BAL-D3 — Balenović et al. 2015 (Croatia) | Özçelik 2014 |
| Oriental beech | JUC-S4-20 — Jucker 2017 (temperate mixed, broadleaf) | Ercanlı 2015 |
| Stone pine | JUC-S4-24 — Jucker 2017 | Carus & Akguş 2018 **[BETA]** |
| Turkey oak | CIM11-QCE — Cimini & Salvati 2011 (Italy) **[BETA]** | — |

- Each model gets the **crown measure** it was fitted with: Jucker and Balenović the mean crown diameter (bounding box), Kalliovirta & Tokola the maximum crown diameter, Valbuena the diameter of a circle with the crown's area. FORA's own models keep using the crown outline chosen in the Tools tab.
- The box shows the inputs, data range and how the coefficients were checked; **Details** gives the source, region and equation. Calabrian pine's three regional models are no longer separate species but three DBH models in the Türkiye group.
- Trees outside the model's data range get a DBH but are flagged; the line in the Metrics tab says how many. The **Across DBH models** line shows how much the mean DBH changes across every DBH model that fits the species.
- **BETA:** the stone pine (Tarsus) and Turkey oak (Italy) models are approximate; use them with care.
- **If you run Seg again, press Apply again.**

### Biomass model

Every species now has biomass. FORA's model library holds 134 above-ground and 45 root models; [BIOMASS_MODELS.md](../BIOMASS_MODELS.md) lists them all.

- The recommended model is the first of the Europe–Mediterranean group; Türkiye and World models are chosen from the same list.
- The box shows the inputs (DBH, height or crown diameter), the data range of the model, how its coefficients were checked (*verified against the paper*, *read twice from the open-access paper*, *secondary source*, *database record*) and the root model. Orange means: read the note.
- Trees outside the model's data range still get biomass (extrapolated); the line in the Metrics tab says how many.
- For Calabrian pine with the Türkiye model (Sönmez et al. 2016) the CSV also has stem, branch, bark and needle biomass. Since v2.0 its total is multiplied by 1.068, the standard correction for a model fitted on the log scale (the paper gives none).

---

## 8. Carbon

After you apply a species, the **"Carbon estimate (IPCC)"** panel appears in the **Sp** tab. It shows:

- the number of trees with biomass (X / Y)
- above-ground biomass (AGB) and below-ground biomass (BGB)
- carbon stock and CO₂ equivalent
- per-hectare values, if Area has been calculated
- the **model spread**: the stand's above-ground biomass from every model that fits the species (hold the mouse over it to see each model)

**Method:**

```
Below-ground (BGB) = root model, or Above-ground (AGB) × R
Carbon (C)         = (AGB + BGB) × CF
CO₂e               = C × 44/12
```

- **Leave both boxes empty** for the automatic values (IPCC 2006, Vol. 4, temperate forests):
  - **Roots:** the species' root model where there is one (the panel names it); otherwise R from Table 4.4, which depends on the stand's above-ground biomass per hectare. Until Area is calculated FORA uses the middle class (conifers 0.29, broadleaves 0.23, oak 0.30).
  - **CF:** 0.51 for conifers, 0.48 for broadleaves (Table 4.3).
- **Type a value** to override. A typed R is applied to every tree, root models included. **Automatic** clears both boxes.
- Trees outside the DBH model's height range have no biomass and are not included in the totals, so the true stock may be higher than shown. The panel says how many trees are left out.

> **Important:** These values are **estimates (IPCC methodology) and have not been validated with field measurements.** Formal uses such as carbon credits require field sampling.

---

## 9. Area metrics

In the **Area** tab, press **Calculate**. The results come in two groups:

**From the points (independent of trees):**
- height percentiles (H5–H99)
- mean and maximum height, standard deviation, CV, skewness, kurtosis, IQR
- density ratios (D1–D9)
- canopy cover (CC₁.₃)

**ITC (tree count, max / min / mean height, N/ha):** These need Seg. If Seg has not been run, this part says "No segmentation yet".

Running Seg again clears the Area results; press **Calculate** again.

The area value is chosen like this: if you clipped, the true area of the circle or square is used. If you did not clip, the file's bounding box is used.

---

## 10. Stats: validation (optional)

This compares FORA's estimates with your own field measurements.

1. In the Metrics table, type **H₂, CD₂, DBH₂** into the rows of the trees you measured in the field. You need **at least 3 trees**.
2. Open the **Stats** tab. For H, CD and DBH separately you get: **RMSE, Bias, R², paired t-test (t, p).**

- The DBH comparison also needs a species to be applied.
- **Careful:** If you run Seg again, the values you typed in are cleared and the tree IDs may change. When matching field trees to FORA trees, use the **X, Y coordinates**, not the IDs.

---

## 11. Transect (T)

1. Be in **2D** view.
2. In the **T** tab, press **Draw**.
3. Click two points on the map.

A vertical cross-section along that line is drawn below the map, including a 1.3 m reference line. Press **Clear** to remove it.

---

## 12. Export

| What | Where | Contents |
|---|---|---|
| **Tree CSV** | Metrics → 📥 CSV | Every tree: height, crown measures (3 methods), coordinates, DBH, your measurements, species, biomass. Carbon columns, then the biomass model, an out-of-range flag, the source of below-ground biomass, the DBH model and its out-of-range flag at the end. Below the table: the DBH model block, area metrics (if calculated) and a carbon-method block (models, coefficients and their sources, model spread). |
| **Area CSV** | Area → 📥 Area CSV | Area metrics |
| **PDF report** | Metrics → 📄 PDF | Summary, statistics, height histogram and the parameters used. Area and stem density if Area was calculated; a carbon page if biomass was computed. The biomass model, its source and the carbon method are written out. |
| **Image** | Tools → Save Image | The map (fora_map.png) in 2D view, or the 3D view (fora_3d.png) in 3D |

The PDF report is in English. Turkish letters are written in simplified form (ı → i, ş → s, ğ → g).

---

## Frequently asked questions

**DBH₁ is empty.**
No species has been applied. Pick a species in the Sp tab and press Apply.

**DBH₁ shows "–".**
The DBH model gave no result for that tree: its height (or crown) is outside the range where the model is defined. This is not an error; you can try another DBH model in the Sp tab.

**The carbon panel does not appear.**
Apply a species first. If the panel still does not appear, all trees may be outside the DBH model's height range.

**Stats is empty.**
You need field measurements for at least 3 trees. DBH also needs a species to be applied.

**The ITC part of the Area tab says "No segmentation yet".**
Run Seg first, then press Calculate in Area again.

**The point count in the LAS panel shows "X / Y".**
Your file has more than 5 million points, so FORA thinned it (see section 1).

**A LAZ will not open.**
Reload the page and try again; the first LAZ needs a small component to be downloaded, which requires an internet connection. If it still fails, convert the file to LAS using one of the options on the start screen.

**Where does my data go?**
Nowhere. Everything is computed in your browser.

**Are FORA's results validated?**
FORA's estimates are based on published models, but they are not validated for your site. You can check them against your own field measurements in the Stats tab. The carbon and biomass estimates have not been validated with field measurements.

---

## How to cite

If you use FORA in your work, please cite it:

- **Paper:** SoftwareX — https://doi.org/10.1016/j.softx.2026.102927
- **Software (always the latest version):** Zenodo — https://doi.org/10.5281/zenodo.19546162

The **Cite** button on the start screen gives you the BibTeX entry.

FORA is open source (MIT licence): https://github.com/fora-platform/fora
