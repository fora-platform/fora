# FORA metric exports for the validation script

`fora_validation.R` compares FORA's tree-level output against the lidR
algorithms. To do that it reads one CSV per dataset from this folder:

```
validation/fora_exports/FORA_<id>_metrics.csv
```

for the eight datasets used in the paper:

```
FORA_EN23611_2_metrics.csv
FORA_EN23612_metrics.csv
FORA_EN24111_metrics.csv
FORA_EN21217_metrics.csv
FORA_EN21220_2_metrics.csv
FORA_EN21232_1_metrics.csv
FORA_EN21234_metrics.csv
FORA_EN21239_metrics.csv
```

These are the tree-metric tables FORA writes with its **"Export tree metrics
(CSV)"** button, one row per detected tree. The validation script needs four
columns from each file:

| Column | Meaning |
|--------|---------|
| `H_auto`  | automatic tree height (m) — older exports may call this `H_m` |
| `CD_auto` | automatic crown diameter (m) — older exports may call this `CD_m` |
| `CenterX` | tree X coordinate (projected CRS) |
| `CenterY` | tree Y coordinate (projected CRS) |

The script accepts either the current (`H_auto`, `CD_auto`) or the legacy
(`H_m`, `CD_m`) column names, so exports from any 1.x version work.

## How these were produced

Each file is the direct CSV export from FORA v1.8.0, run on the corresponding
PANGAEA point cloud with FORA's default parameters (CHM cell 0.5 m, minimum
height 2 m, fixed 3–4 m search window as listed in the paper). No manual editing
was applied; the files are the unmodified tool output that underlies the
statistics in Tables 4 and 5.
