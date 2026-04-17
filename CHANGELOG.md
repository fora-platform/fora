# Changelog

All notable changes to FORA will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-04-17

### Added
- Initial public release
- LAS file parsing (versions 1.2–1.4, formats 0–10)
- Interactive 3D/2D point cloud visualization (WebGL via Three.js)
- Height normalization with grid-based minimum-Z + gap filling
- Spatial clipping (circular and rectangular ROI)
- CHM-based individual tree detection with marker-controlled watershed
- Area-based approach (ABA) metrics: H5–H99 percentiles, D1–D9 density ratios, CC₁.₃, kurtosis, IQR, CV
- 8 allometric DBH models for Turkish tree species:
  - *Pinus sylvestris* — Gençal (2025) + Karahalil & Karslı (2017)
  - *Abies bornmuelleriana* — Gençal (2025) + Karahalil & Karslı (2017)
  - *Pinus brutia* (3 ecoregions) — Özçelik et al. (2014)
  - *Pinus nigra* — Özçelik et al. (2014)
  - *Fagus orientalis* — Ercanli (2015)
  - *Pinus pinea* — Carus & Akguş (2018) *(pending PDF verification)*
  - *Quercus cerris* — Cimini & Salvati (2011) *(proxy, Turkish source pending)*
- 5-component aboveground biomass estimation for *Pinus brutia* (stem, branches, bark, needles, total) — Sönmez et al. (2016)
- Transect profile analysis with configurable buffer width
- Paired statistical comparison (RMSE, Bias, R², paired t-test with Abramowitz–Stegun normal CDF approximation)
- CSV export (tree metrics + biomass + area metrics)
- PNG export (2D map with tree IDs + 3D screenshot)
- Bilingual UI (Turkish / English)
- Light and dark themes
- MIT License

### Validated
- 8 UAV LiDAR datasets (4,878 matched trees) against lidR Dalponte2016, Silva2016, Watershed algorithms
  - Pooled height R² = 0.901, RMSE = 2.27 m
- 7 full-extent PANGAEA datasets against published reference segmentation
  - ITC mean height R² = 0.948 (matched scenario)
  - ABA metrics parameter-invariant (0% change across default and matched scenarios)

### Known Limitations
- Browser memory caps processing at ~5 million points per session
- LAZ compressed format not yet supported (use CloudCompare/lidR/LAStools/PDAL to convert)
- Allometric coefficients for *P. pinea* and *Q. cerris* are approximate
- CHM-based segmentation underperforms in multi-layered forests
- Fixed search radius (not variable-window LMF)
