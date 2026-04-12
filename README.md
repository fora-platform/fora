# ◆ FORA — FORest Analysis Platform

A browser-based web platform for processing UAV-LiDAR and ALS data 
in complex forest structures.

**Live:** https://fora-platform.github.io/fora

## Features
- LAS 1.2–1.4 and PLY (ASCII/Binary) file support
- Interactive 3D/2D point cloud visualization
- Height normalization and spatial clipping
- CHM-based individual tree segmentation
- Area-based and individual tree metrics
- Allometric DBH estimation (Turkish species database)
- Statistical comparison (paired t-test)
- Transect profile extraction
- CSV export with area-based metrics
- Bilingual (TR/EN) interface

## Quick Start
1. Visit https://fora-platform.github.io/fora
2. Upload a LAS or PLY file
3. Click on 2D view to set clip center → Cut
4. Run segmentation
5. View metrics and export CSV

## Technology
- React 19 + Three.js (r128)
- Pure client-side processing (no server required)
- MIT License

## Citation
If you use FORA in your research, please cite:
> Gençal, B. (2026). FORA: A browser-based platform for processing 
> UAV-LiDAR data in forest structures. SoftwareX. 
> DOI: [Zenodo DOI]

## Author
Burhan Gençal — Bursa Technical University, Faculty of Forestry