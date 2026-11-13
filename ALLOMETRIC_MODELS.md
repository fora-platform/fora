# Allometric models in FORA

Every model takes tree height (h, m) and, for two species, crown diameter
(CD, m), and returns diameter at breast height (d, cm). Height–diameter
equations published in the h = f(d) direction are inverted numerically by
bisection, so no closed-form rearrangement is required.

Sections 1–7 describe FORA's own Turkish DBH models (`src/species.js`), used
since v1. Since v2.0 they are one group in a choice of DBH models per species;
the models from outside Türkiye are described at the end of this file. Biomass
models (134 above-ground, 45 root) are described in [BIOMASS_MODELS.md](BIOMASS_MODELS.md).

Two species are shipped as experimental proxies and are flagged `[BETA]` in
the interface: *Pinus pinea* and *Quercus cerris*. They should not be used for
quantitative inventory.

---

## 1. Pinus sylvestris

Multiple linear regression on height and crown diameter:

```
d = -5.22 + 1.65 h + 2.35 CD
```

Valid over the calibration range of the source data, h ~ 4-35 m.

Source: Gencal B. (2025) Meşcere parametrelerinin insansız hava araçları (İHA)
ile tahmin edilmesi. PhD thesis, Bursa Technical University, Bursa.
n = 2,956 trees, UAV-LiDAR paired with ground measurements.

---

## 2. Abies bornmuelleriana

```
d = -6.27 + 1.80 h + 2.06 CD
```

Source: Gencal (2025), same dataset as *P. sylvestris*.

---

## 3. Pinus brutia, three ecoregions

Gompertz height–diameter function:

```
h = 1.3 + a exp(-b exp(-c d))
```

Defined only for 1.3 m < h < a + 1.3 m, where a is the asymptote listed below.
Heights outside this interval return no estimate.

| Ecoregion | a | b | c |
|---|---|---|---|
| Mediterranean coastal | 22.527 | 1.823 | 0.062 |
| Inland eastern | 25.911 | 2.004 | 0.045 |
| Lake district | 24.207 | 1.465 | 0.038 |

Source: Özçelik R, Yavuz H, Karatepe Y, et al. (2014) Development of
ecoregion-based height-diameter models for 3 economically important tree
species of southern Turkey. Turkish Journal of Agriculture and Forestry
38:399-412. https://doi.org/10.3906/tar-1304-115

---

## 4. Pinus nigra

Same Gompertz form, Mediterranean coastal ecoregion:

```
h = 1.3 + 23.494 exp(-2.397 exp(-0.067 d))
```

Source: Özçelik et al. (2014), as above.

---

## 5. Fagus orientalis

Schnute generalized height–diameter function:

```
h = [1.3^b0 + (Hdom^b0 - 1.3^b0) (1 - exp(-b1 d)) / (1 - exp(-b1 Ddom))]^(1/b0)
```

Fixed-effect coefficients: b0 = 1.659, b1 = 0.051.

The published model is stand-conditional. FORA has no stand inventory, so it
substitutes Hdom = max(h + 1, 10) m and Ddom = 35 cm as representative values
for the source region and solves for d by bisection. Estimates are therefore
approximate for stands that differ markedly from the calibration stands.

Source: Ercanlı İ. (2015) Nonlinear mixed effect models for predicting
relationships between total height and diameter of oriental beech trees in
Kestel, Turkey. Revista Chapingo Serie Ciencias Forestales y del Ambiente
21(2):221-232. https://doi.org/10.5154/r.rchscfa.2015.02.006
Reported fit: R² = 0.906, RMSE = 1.48 m, 124 plots, Kestel-Bursa.

---

## 6. Pinus pinea  [BETA]

Prodan (1968) rational form:

```
h = 1.30 + d² / (a + b d + c d²)
```

Coefficients a = -8.922602, b = 3.254666, c = 0.025050, inverted by bisection.

Source: Carus S, Akguş Y. (2018) Development of diameter-height models for
Stone pine (Pinus pinea L.) stands in Tarsus region. Turkish Journal of
Forestry 19(3):293-299. https://doi.org/10.18182/tjf.338311
Model development dataset: 5,885 trees, 259 sample plots, Tarsus afforestation
region.

Flagged experimental pending calibration against Turkish inventory data
outside the Tarsus region.

---

## 7. Quercus cerris  [BETA]

GADA site-index form used as a height–diameter relation:

```
h = Hdom (1 - exp(b1 d))^b2 / (1 - exp(b1 Ddom))^b2
```

Coefficients b1 = -0.046, b2 = 0.650, applied with default dominant stand
parameters Hdom = 25 m and Ddom = 40 cm, inverted by bisection.

Source: Cimini D, Salvati R. (2011) Local height-diameter equation for Pinus
halepensis and Quercus cerris in central Italy. Annals of Silvicultural
Research 37(1):61-66. https://doi.org/10.4129/ifm.2011.5.03

This is a non-Turkish proxy. No published closed-form coefficients for Turkish
*Q. cerris* were available at the time of implementation. Since v2.0 Turkish
models from Bursa are in the library (next section) and can be chosen in the
Türkiye group.

---

## DBH models in the model library (v2.0)

`src/dbhLibrary.js` holds 30 DBH models generated from FORA's model-library
workbook by `tools/build_biomass_library.py`; the test suite checks each against
the workbook value at h = 18 m and eight against coefficients typed from the
papers. `src/dbhChoice.js` lists, for each species, its models by scope
(Europe–Mediterranean, Türkiye, World). The recommended model is the first
Europe–Mediterranean one; a species without one gets its first World model.

| Code | Source | Region | Inputs (crown measure) |
|---|---|---|---|
| VAL | Valbuena Rabadán et al. 2016, Forest Systems 25(1):e046 | Spain, *P. sylvestris*, LiDAR | h + diameter of a circle with the crown's area |
| KT-9.1.x, KT-9.3.x | Kalliovirta & Tokola 2005, Silva Fennica 39(2):227–248 | Finland; pine, spruce, birch, all | h, or h + maximum crown diameter |
| BAL-D3 | Balenović et al. 2015, Forests 6:492–509 | Croatia, *P. nigra* | h + mean crown diameter |
| JUC-D6 | Jucker et al. 2017, Global Change Biology 23:177–190, Eq. 6 | global | (h × mean crown diameter) |
| JUC-S4-…, JUC-S3-… | Jucker et al. 2017, supplementary Tables S3–S4 | Palearctic, by biome and conifer/broadleaf | (h × mean crown diameter) |
| GB-dbh1, GB-dbh2 | Gonzalez-Benecke et al. 2014, J. Forestry Research 25(1):43–52 | USA, *P. palustris* (not mapped to a FORA species) | h, or h + crown area |
| GEN19-QCE-H | Gencal 2019, MSc thesis, Bursa Technical University, Eq. 4.10: h = 2.297·d^0.570 | Türkiye, Bursa, *Q. cerris*, 1131 trees | h |
| GEN19-QCE-CD | Gencal 2019, Eq. 4.11; Sönmez & Gencal 2023, Ormancılık Araştırma Dergisi 10:92–104: CD = 1.310 + 0.198·d | as above, 721 trees | mean crown diameter |
| SON23-QCE-H | Sönmez & Gencal 2023: h = exp(3.026 − 8.438/d) | as above | h (no result above 20.6 m) |

The three Turkey oak models were fitted in the direction h = f(d) or CD = f(d)
and are solved for d; like the other inverted height–diameter models, they can
exaggerate DBH at the ends of the range.

Each model receives the crown measure it was fitted with, computed from FORA's
crown outline: the mean of the two bounding-box sides for a mean crown
diameter, the hull's maximum diameter (or the longer bounding-box side) for a
maximum crown diameter, 2·√(CPA/π) for an equal-area diameter. FORA's own
models keep using the crown outline chosen in the Tools tab, as before.

The Jucker regional model follows the biome of the species' main range in
Türkiye (Olson et al. 2001, as used by Jucker et al.): temperate mixed forests
for fir, Scots and black pine, beech and oak; woodlands and savannas, which
include Mediterranean woodlands, for Calabrian and stone pine.

---

## Aboveground biomass, Pinus brutia

Five dry-mass components in kilograms, from d (cm) and h (m).

Branches and bark:

```
ln(y) = b0 + b1 ln(d) + b2 ln(h)
```

| Component | b0 | b1 | b2 | R² |
|---|---|---|---|---|
| Branches | -2.611 | 1.069 | 0.950 | 0.82 |
| Bark | -3.254 | 1.314 | 0.878 | 0.90 |

Stem, needles and total:

```
ln(y) = b0 + b1 [d / (d + b2)] + b3 h
```

| Component | b0 | b1 | b2 | b3 | R² |
|---|---|---|---|---|---|
| Stem | -3.107 | 9.480 | 9.499 | 0.070 | 0.95 |
| Needles | -1.152 | 6.483 | 25.940 | -0.017 | 0.65 |
| Total | -0.770 | 7.829 | 12.843 | 0.056 | 0.96 |

Source: Sönmez T, Kahriman A, Şahin A, Yavuz M. (2016) Biomass equations for
Calabrian pine in the Mediterranean Region of Turkey. Šumarski List
140(11-12):569-577. https://doi.org/10.31298/sl.140.11-12.4
Destructive sampling of 292 trees.

Since v2.0 the total is multiplied by exp(0.363²/2) = 1.068, the usual correction
for back-transforming a model fitted on the log scale (the paper gives none); the
components are used as published. This model is one of the 134 above-ground
models of FORA's biomass library; see [BIOMASS_MODELS.md](BIOMASS_MODELS.md).

---

## Symbols

| Symbol | Meaning | Unit |
|---|---|---|
| d | Diameter at breast height | cm |
| h | Total tree height | m |
| CD | Crown diameter | m |
| Hdom | Stand dominant height | m |
| Ddom | Stand dominant diameter | cm |
