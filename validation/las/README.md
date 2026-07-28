# Point-cloud tiles for the validation script

The validation script (`../fora_validation.R`) reads the point-cloud tiles for
each dataset from this folder. These files are large, so they are not committed
to the repository. Download them from the PANGAEA repository cited in the paper:

  Kruse et al. 2025, https://doi.org/10.1594/PANGAEA.980735
  (complementary sites: PANGAEA.977771, PANGAEA.980485, PANGAEA.980757)

For each of the eight datasets used in the paper, place the tree-only and
ground-classified tiles here, e.g.:

  EN23611_2_treesonly.laz   EN23611_2_ground_classification.laz
  EN23612_treesonly.laz     EN23612_ground_classification.laz
  ... (and so on for the remaining six datasets)

The script's `las_dir` points to this folder by default. Once the tiles and the
FORA metric exports (in ../fora_exports/) are in place, the script reproduces
Tables 3–5 and Figure 3.
