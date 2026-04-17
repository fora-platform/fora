# FORA — FORest Analysis

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-r128-000000?logo=three.js)](https://threejs.org/)

**FORA** is an open-source, browser-based web platform for processing forest LiDAR point clouds at individual tree and stand levels. All computation runs entirely on the client side — no installation, no server, no programming knowledge required.

🌲 **Live demo:** [fora-platform.github.io/fora](https://fora-platform.github.io/fora)

---

## Features

- 📂 **LAS file parsing** (versions 1.2–1.4, point data record formats 0–10)
- 🎨 **Interactive 3D/2D visualization** with WebGL (Three.js)
- 📏 **Height normalization** using grid-based minimum-Z + gap filling
- ✂️ **Spatial clipping** (circular or rectangular regions of interest)
- 🌳 **CHM-based individual tree detection (ITD)** with marker-controlled watershed
- 📊 **Area-based approach (ABA) metrics**: height percentiles (H5–H99), density ratios (D1–D9), canopy cover (CC₁.₃), variability statistics
- 🔢 **Allometric DBH estimation** for 8 Turkish tree species with published coefficients
- 🌿 **Aboveground biomass estimation** for *Pinus brutia* (5 components: stem, branches, bark, needles, total)
- 📐 **Transect profile analysis**
- 📈 **Paired statistical comparison** (RMSE, Bias, R², paired t-test)
- 💾 **Multi-format export** (CSV, PNG)
- 🌍 **Bilingual UI** (Turkish/English)

---

## Quick Start

### Use online (no install)
Just open [fora-platform.github.io/fora](https://fora-platform.github.io/fora) in Chrome, Firefox, Edge, or Safari.

### Run locally
```bash
git clone https://github.com/fora-platform/fora.git
cd fora
npm install
npm run dev
```

### Build for production
```bash
npm run build
npm run preview
```

---

## Workflow

1. **Load** a `.las` file (up to ~5 million points in browser)
2. **Normalize** — heights are computed automatically
3. **Clip** (optional) — select a circular or rectangular region of interest
4. **Segment** — run CHM-based tree segmentation (cell 0.5 m, minH 2 m, search radius 3 m by default)
5. **Metrics** — tree-level metrics appear in a sortable table
6. **Area** — compute ABA metrics (parameter-invariant, independent of segmentation choices)
7. **Species** — select a species and apply allometric model to estimate DBH (and biomass for *P. brutia*)
8. **Export** — download CSV for trees and area metrics, or PNG for maps

---

## Allometric Models

FORA includes 8 published allometric models for Turkish forest species:

| Species | Model | Source |
|---------|-------|--------|
| *Pinus sylvestris* (Sarıçam) | DBH = −5.22 + 1.65·H + 2.35·CD | Gencal (2025) PhD thesis + Karahalil & Karsli (2017) |
| *Abies bornmuelleriana* (Uludağ göknarı) | DBH = −6.27 + 1.80·H + 2.06·CD | Gencal (2025) + Karahalil & Karsli (2017) |
| *Pinus brutia* ME — coastal (Kızılçam) | Gompertz, a=22.527, b=1.823, c=0.062 | Özçelik et al. (2014) |
| *Pinus brutia* IE — inland | Gompertz, a=25.911, b=2.004, c=0.045 | Özçelik et al. (2014) |
| *Pinus brutia* LE — lake | Gompertz, a=24.207, b=1.465, c=0.038 | Özçelik et al. (2014) |
| *Pinus nigra* (Karaçam) | Gompertz, a=23.494, b=2.397, c=0.067 | Özçelik et al. (2014) |
| *Fagus orientalis* (Doğu kayını) | Schnute, a=1.659, b=0.051 | Ercanli (2015) Kestel-Bursa |
| *Pinus pinea* (Fıstık çamı) | Power approx. | Carus & Akguş (2018) — PDF verification pending |
| *Quercus cerris* (Saçlı meşe) | Chapman-Richards (proxy) | Cimini & Salvati (2011) — Turkish source pending |

**Biomass module** for *Pinus brutia* (Mediterranean Turkey):
- Sönmez, Kahriman, Şahin, Yavuz (2016), *Šumarski List* 140(11-12)
- DOI: [10.31298/SL.140.11-12.4](https://doi.org/10.31298/SL.140.11-12.4)

See `ALLOMETRIC_MODELS.md` for full equations and coefficients.

---

## Validation

FORA has been validated on:
- **8 UAV LiDAR datasets** (4,878 matched trees) against lidR algorithms (Dalponte2016, Silva2016, Watershed) — pooled R² = 0.901, RMSE = 2.27 m
- **7 full-extent PANGAEA datasets** (Yakutia, Russia) — ITC mean height R² = 0.948 against published reference segmentation

All validation datasets are from PANGAEA (Kruse et al. 2025):
- Yakutia 2021: [10.1594/PANGAEA.980735](https://doi.org/10.1594/PANGAEA.980735)
- NW Canada 2022: [10.1594/PANGAEA.977771](https://doi.org/10.1594/PANGAEA.977771)
- E Alaska 2023: [10.1594/PANGAEA.980485](https://doi.org/10.1594/PANGAEA.980485)
- W Alaska 2024: [10.1594/PANGAEA.980757](https://doi.org/10.1594/PANGAEA.980757)

---

## Citation

If you use FORA in your research, please cite:

```bibtex
@software{gencal2026fora,
  author  = {Gencal, Burhan},
  title   = {FORA: A browser-based platform for processing UAV-LiDAR point clouds in forest structures},
  version = {1.0.0},
  year    = {2026},
  url     = {https://github.com/fora-platform/fora},
  doi     = {[Zenodo DOI pending]}
}
```

And the accompanying publication (under review):
> Gencal B. (2026) FORA: A browser-based platform for processing UAV-LiDAR point clouds in forest structures. *SoftwareX* (under review).

---

## Limitations

- Browser memory constrains processing to approximately 5 million points per session
- LAZ compressed files are not yet supported — use CloudCompare, lidR, LAStools, or PDAL to convert LAZ to LAS
- Ground estimation uses simplified grid-minimum approach (not TIN or CSF)
- Allometric coefficients for *Pinus pinea* and *Quercus cerris* are approximate pending PDF verification and Turkish-source alternatives
- CHM-based segmentation inherently underperforms point cloud-based methods in multi-layered forests

---

## Roadmap

- [ ] LAZ format support via WebAssembly (laz-perf)
- [ ] User-defined allometric equations
- [ ] Canopy gap analysis
- [ ] TIN-based DTM with cloth simulation filter (CSF)
- [ ] Batch processing with Web Workers
- [ ] Session state persistence (IndexedDB)
- [ ] Additional species (*Cedrus libani*, *Picea orientalis*)

---

## License

FORA is released under the **MIT License** — see [LICENSE](LICENSE) for details.

---

## Author

**Burhan Gencal**  
Bursa Technical University, Faculty of Forestry  
Department of Forest Engineering  
16310 Bursa, Türkiye  
📧 burhan.gencal@btu.edu.tr

---

## Acknowledgments

- Alfred Wegener Institute (AWI) and North-Eastern Federal University of Yakutsk (NEFU) for providing open UAV LiDAR datasets via PANGAEA (Kruse et al. 2025)
- The PANGAEA repository for free access to the validation datasets
- All authors whose published allometric equations are implemented in this software (see `ALLOMETRIC_MODELS.md` for full citations)

---

## Contributing

Issues and pull requests are welcome at [github.com/fora-platform/fora/issues](https://github.com/fora-platform/fora/issues).

For major changes, please open an issue first to discuss what you would like to change.
