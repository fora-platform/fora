# Allometric Models in FORA

All models estimate DBH (cm) from tree height (H, m) and/or crown diameter (CD, m) as input.

## 1. Pinus sylvestris (Sarıçam)

**Model:** Multi-variable linear regression

```
DBH = −5.22 + 1.65·H + 2.35·CD
```

**Source:** 
- Gençal B. (2025) Meşcere parametrelerinin insansız hava araçları (İHA) ile tahmin edilmesi. PhD Thesis, Bursa Technical University, Graduate School, Bursa.
- Karahalil U, Karslı F. (2017) Meşcere parametrelerinin yerel uydu ve dijital kamera görüntüleriyle tahmini ve farklı uydu görüntü verileri ile karşılaştırılması. TÜBİTAK Proje No. 115O013. Artvin Çoruh Üniversitesi.

**Sample:** n = 2,956 trees (UAV-LiDAR paired with ground measurements)

---

## 2. Abies bornmuelleriana (Uludağ göknarı)

**Model:** Multi-variable linear regression

```
DBH = −6.27 + 1.80·H + 2.06·CD
```

**Source:** Same as P. sylvestris (Gençal 2025 + Karahalil 2017)

---

## 3. Pinus brutia (Kızılçam) — h-d

**Model:** Gompertz function, three ecoregions

```
h = 1.3 + a · exp(−b · exp(−c · d))
```

FORA inverse-solves this equation to estimate d from h.

| Ecoregion | a | b | c |
|-----------|-----|-----|-----|
| ME (Mediterranean coastal) | 22.527 | 1.823 | 0.062 |
| IE (Inland eastern) | 25.911 | 2.004 | 0.045 |
| LE (Lake district) | 24.207 | 1.465 | 0.038 |

**Source:** Özçelik R, Yavuz H, Karatepe Y, et al. (2014) Development of ecoregion-based height-diameter models for 3 economically important tree species of southern Turkey. *Turkish Journal of Agriculture and Forestry* 38:399-412. [DOI: 10.3906/TAR-1304-115](https://doi.org/10.3906/TAR-1304-115)

---

## 4. Pinus nigra (Karaçam)

**Model:** Gompertz function (Mediterranean coastal)

```
h = 1.3 + 23.494 · exp(−2.397 · exp(−0.067 · d))
```

**Source:** Özçelik et al. (2014) — same as P. brutia

---

## 5. Fagus orientalis (Doğu kayını)

**Model:** Schnute generalized function

```
h = [1.3^a + (H_dom^a − 1.3^a) · (1 − exp(−b·d)) / (1 − exp(−b·D_dom))]^(1/a)
```

Coefficients (fixed effects): **a = 1.659, b = 0.051**

FORA uses estimated H_dom = H + 1 m and D_dom = 35 cm (representative values) and numerically solves for d via bisection.

**Source:** Ercanli İ. (2015) Nonlinear mixed effect models for predicting relationships between total height and diameter of oriental beech trees in Kestel, Turkey. *Revista Chapingo Serie Ciencias Forestales y del Ambiente* 21(2):221-232. [DOI: 10.5154/R.RCHSCFA.2015.02.006](https://doi.org/10.5154/R.RCHSCFA.2015.02.006)

**Performance:** R² = 0.906, RMSE = 1.48 m, n = 124 plots (Kestel-Bursa, Türkiye)

---

## 6. Pinus pinea (Fıstık çamı)

**Model:** Power approximation (pending PDF verification)

```
DBH = 1.8 · (h − 1.3)^0.95
```

**Source (pending verification):** Carus S, Akguş Y. (2018) Development of diameter-height models for Stone pine (*Pinus pinea* L.) stands in Tarsus region. *Turkish Journal of Forestry* 19(3):293-299. [DOI: 10.18182/tjf.338311](https://doi.org/10.18182/tjf.338311)

**Note:** Original Prodan coefficients (a=0.6996, b=−0.1066, c=0.0114) reported in secondary sources produced non-physical DBH estimates on testing. The current implementation is a conservative approximation based on typical Mediterranean *P. pinea* allometry. PDF verification is pending.

---

## 7. Quercus cerris (Saçlı meşe)

**Model:** Chapman-Richards function (Turkish data pending)

```
h = 1.3 + 30 · (1 − exp(−0.035·d))^1.2
```

**Proxy source:** Cimini D, Salvati R. (2011) — Sicilian *Quercus cerris* study.

**Note:** No published allometric coefficients were found for Turkish *Q. cerris* at the time of writing. Diamantopoulou et al. (2023) used machine learning models (SVR) without extractable closed-form equations. FORA currently uses a conservative Chapman-Richards fit; this will be updated when Turkish data become available.

---

## Biomass Module — Pinus brutia (Kızılçam)

Aboveground biomass estimation for *Pinus brutia* in the Mediterranean Region of Turkey:

### A. Branches and Bark
```
ln(y) = b₀ + b₁·ln(d) + b₂·ln(h)
```

| Component | b₀ | b₁ | b₂ | R² |
|-----------|----|----|----|-----|
| Branches | −2.611 | 1.069 | 0.950 | 0.82 |
| Bark | −3.254 | 1.314 | 0.878 | 0.90 |

### B. Stem, Needles, and Total
```
ln(y) = b₀ + b₁ · [d / (d + b₂)] + b₃·h
```

| Component | b₀ | b₁ | b₂ | b₃ | R² |
|-----------|----|----|----|----|-----|
| Stem | −3.107 | 9.480 | 9.499 | 0.070 | 0.95 |
| Needles | −1.152 | 6.483 | 25.940 | −0.017 | 0.65 |
| Total | −0.770 | 7.829 | 12.843 | 0.056 | 0.96 |

**Output:** Dry biomass in kilograms.

**Source:** Sönmez T, Kahriman A, Şahin A, Yavuz M. (2016) Biomass equations for Calabrian pine in the Mediterranean Region of Turkey. *Šumarski List* 140(11-12):569-577. [DOI: 10.31298/SL.140.11-12.4](https://doi.org/10.31298/SL.140.11-12.4)

---

## Symbol Glossary

| Symbol | Meaning | Units |
|--------|---------|-------|
| d, D, DBH | Diameter at breast height | cm |
| h, H | Total tree height | m |
| CD | Crown diameter | m |
| H_dom, H₀ | Stand dominant height | m |
| D_dom, D₀ | Stand dominant diameter | cm |
| d_q | Stand quadratic mean diameter | cm |
| N | Trees per hectare | trees/ha |
| G | Basal area | m²/ha |
