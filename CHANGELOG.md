# Changelog

All notable changes to FORA will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

[1.8.0] - 2026-07-18

Added


Custom Variable Window Size coefficients: linear (a + b·H, with lower and
upper clamps) or quadratic (a + b·H + c·H²) entered from the segmentation
panel, alongside the four built-in presets.
Classification colour mode in the 2D and 3D views, using the ASPRS class
palette. Point classification was already parsed but was not displayed.
Test LAS files covering point data record formats 0-3 and 6-8, with the
generator script test_data/make_test_las.R.
Validation script validation/fora_validation.R reproducing the
cross-tool comparison against lidR reported in the article.
CITATION.cff.


Fixed


Classification byte offset for LAS 1.4 point formats 6-10, where the field
sits at byte 16 rather than byte 15. Files in these formats previously
reported classification from the flags byte.
Coordinate precision for projected data with large northing values.
Coordinates are now stored relative to a double-precision local origin and
restored to absolute values for CSV export and external DTM matching;
single-precision storage previously introduced decimetre-level error.
Area-based density now uses the actual region of interest (πr² for circular
clips, the full rectangle for rectangular ones) instead of the point
bounding box. The exported metrics record which was used in area_source.
Tree count in the interface distinguishes measured trees from raw segments.
Segments with fewer than five points are excluded from the metrics table, so
the badge now reads measured / segments.


Changed


Version reported in the interface, package.json and CITATION.cff
aligned at 1.8.0.