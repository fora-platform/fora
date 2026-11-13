# Biomass models in FORA

FORA 2.0 computes above-ground and below-ground biomass from a library of 134 above-ground and 45 root models (`src/biomassLibrary.js`). Every model takes diameter at breast height (DBH, cm), tree height (H, m) or crown diameter (CD, m) and returns dry biomass in kg. DBH comes from the species DBH model (see [ALLOMETRIC_MODELS.md](ALLOMETRIC_MODELS.md)).

The library is generated from the FORA model-library workbook with `tools/build_biomass_library.py`, and the tables below with `tools/build_biomass_docs.mjs`; the test suite checks every model against the value the workbook computes for a tree of DBH 25 cm, H 18 m and CD 4 m, and nine models against coefficients typed directly from the papers at four other trees.

## Scope

Models are grouped by where their data come from. In the **Sp** tab the biomass list is grouped by scope; the recommended model, used unless the user picks another, is the first Europe–Mediterranean one. Every FORA species has one. DBH models are chosen the same way (see [ALLOMETRIC_MODELS.md](ALLOMETRIC_MODELS.md)).

| Scope | Meaning |
|---|---|
| Europe–Mediterranean | Europe, the Mediterranean basin and the Middle East (Spain, Portugal, Italy, Greece, Romania, Czechia, Finland, Germany, Syria, Lebanon; Europe-wide equations) |
| Türkiye | Turkish studies |
| World | Global (Jucker et al. 2017), North American (Jenkins et al. 2003), Mongolian (Altanzagas et al. 2019) and Siberian (Delcourt & Veraverbeke 2022) equations |

## How each coefficient was checked

| Status (in the interface) | In the tables below | Meaning |
|---|---|---|
| Doğrulandı | verified | verified against the paper |
| Doğrulandı — dikkat | verified (see note) | verified against the paper; read the note before use |
| Web okuması | web-read | read twice from the open-access paper (page image not checked) |
| Web okuması — dikkat | web-read (see note) | read twice from the open-access paper; read the note before use |
| İkincil kaynak | secondary source | coefficients from a paper that quotes the original |
| Site kaydı | database record | coefficients from a public equation database (treeallometry.org) |

Models marked unusable in the workbook (inconsistent coefficients in the paper) are not in the library.

## FORA species

The first model in each cell is the one FORA uses unless the user picks another. Root: the root model used for below-ground biomass (from the same paper as the above-ground model where possible); without one, FORA uses the IPCC 2006 root-to-shoot ratio.

| Species | Europe–Mediterranean (default) | Türkiye | World | Root model |
|---|---|---|---|---|
| Scots pine (*Pinus sylvestris*) | **RP-PSY**, FOR-PINUSYL-AGB, REP-P, MON05-PSY | **DUR10-PSY-DH**, DUR10-PSY-D, DUR15-PSY-D, COM11-PSY, DUR16-PSY-N, TOL12-PSY-D2H, TOL12-PSY-D | **JUC-A7-G**, JEN-8 | RP-PSY-KOK, ROH19-PSY, FOR-PINUSYL-KOK, MON05-PSY-KOK |
| Uludağ fir (*Abies bornmuelleriana*) | **RP-AAL**, FOR-ABIEALB-AGB, DUT20-AAL-DH, DUT20-AAL-D | **DUR-ABI** | **JUC-A7-G**, JEN-7 | RP-AAL-KOK |
| Calabrian pine, three regions (*Pinus brutia*) | **DMG-ME-D**, DMG-SY-DH, DMG-SY-D, DMG-LB-DH, DMG-LB-D | **SON-T**, DUR09-PBR, DUR15-PBR-DH, DUR15-PBR-D, DUR22-PBR | **JUC-A7-G**, JEN-8 | IPCC ratio |
| Black pine (*Pinus nigra*) | **RP-PNI**, FOR-PINUNIG-AGB, MON05-PNI | **DUR15-PNI-DH**, DUR15-PNI-D, DUR10-PNI-DH, DUR10-PNI-D, DUR19-PNI-DH, DUR19-PNI-D | **JUC-A7-G**, JEN-8 | RP-PNI-KOK, FOR-PINUNIG-KOK, MON05-PNI-KOK |
| Oriental beech (*Fagus orientalis*) | **FOR-FAGUSYL-AGB**, RP12-FSY, ZIA03-FMO, ZIA03-FAG, DUT20-FSY-DH, DUT20-FSY-D, MON05-FSY | **SAR-FAG** | **JUC-A7-A**, JEN-4 | FOR-FAGUSYL-KOK, RP12-FSY-KOK |
| Stone pine (*Pinus pinea*) | **COR18-DH**, COR18-D, COR-PPI, RP-PPI, MON05-PPI | — | **JUC-A7-G**, JEN-8 | COR18-MT-dh-KOK, COR18-MT-d-KOK, RP-PPI-KOK, MON05-PPI-KOK |
| Turkey oak (*Quercus cerris*) | **CIE-Q2**, CIE-Q1, CIE-Q3, FOR-QUERPET2-AGB, MON05-QRO, MON05-QPY | **OZD-QC-T2**, OZD-QC-T1, SAG20-QC-DH, SAG20-QC-D, OZD-GEN-T2, OZD-GEN-T1 | **JUC-A7-A**, JEN-4 | FOR-QUERPET2-KOK, ROH19-QUE, MON05-QRO-KOK, MON05-QPY-KOK |

For *Pinus brutia* the Sönmez et al. (2016) model (SON-T) also gives stem, branch, bark and needle biomass. Its total is multiplied by exp(RSE²/2) = 1.068 because the model was fitted on the log scale and the paper gives no correction; the same correction is applied to the other log-scale models whose papers give none (column cf in the tables below).

## Carbon

```
Below-ground (BGB) = root model, or AGB × R
Carbon (C)         = (AGB + BGB) × CF
CO₂e               = C × 44/12
```

Automatic values (IPCC 2006, Vol. 4, temperate forests): CF 0.51 for conifers and 0.48 for broadleaves (Table 4.3); R from Table 4.4 by group and stand above-ground biomass per hectare (conifers < 50 t/ha 0.40, 50–150 t/ha 0.29, > 150 t/ha 0.20; other broadleaf < 75 t/ha 0.46, 75–150 t/ha 0.23, > 150 t/ha 0.24; Quercus > 70 t/ha 0.30). Until the stand area is calculated the middle class is used. A value typed in the panel replaces the automatic value; a typed R is applied to every tree, root models included.

## Above-ground models

### Türkiye (39)

| Code | Species | Source | Inputs | DBH range (cm) | Status | cf |
|---|---|---|---|---|---|---|
| SAR-ALN | Alnus glutinosa subsp. barbata | Saraçoğlu 2000, Turkish J. Agric. For. 24(2):147–156 | DBH, H | 7–30 | verified (see note) |  |
| DUR-ABI | Abies nordmanniana subsp. bornmuelleriana | Durkaya, Durkaya, Makineci & Karabürk 2013, Fresenius Environ. Bull. 22(2):428–434 | DBH | 20–56 | verified (see note) |  |
| SAR-FAG | Fagus orientalis | Saraçoğlu 1998, Turkish J. Agric. For. 22(1):93–100 | DBH | 11–46 | verified (see note) |  |
| OZD-QF-T1 | Quercus frainetto | Ozdemir, Makineci, Yilmaz, Kumbasli, Caliskan, Beskardes, Keten, Zengin & Yilmaz 2019, Eur. J. For. Res. 138:623–637 | DBH | 0.2–38.2 | verified (see note) |  |
| OZD-QF-T2 | Quercus frainetto | Ozdemir, Makineci, Yilmaz, Kumbasli, Caliskan, Beskardes, Keten, Zengin & Yilmaz 2019, Eur. J. For. Res. 138:623–637 | DBH, H | 0.2–38.2 | verified (see note) |  |
| OZD-QC-T1 | Quercus cerris | Ozdemir, Makineci, Yilmaz, Kumbasli, Caliskan, Beskardes, Keten, Zengin & Yilmaz 2019, Eur. J. For. Res. 138:623–637 | DBH | 0.4–38.5 | verified (see note) |  |
| OZD-QC-T2 | Quercus cerris | Ozdemir, Makineci, Yilmaz, Kumbasli, Caliskan, Beskardes, Keten, Zengin & Yilmaz 2019, Eur. J. For. Res. 138:623–637 | DBH, H | 0.4–38.5 | verified (see note) |  |
| OZD-QP-T1 | Quercus petraea | Ozdemir, Makineci, Yilmaz, Kumbasli, Caliskan, Beskardes, Keten, Zengin & Yilmaz 2019, Eur. J. For. Res. 138:623–637 | DBH | 0.4–34.5 | verified (see note) |  |
| OZD-QP-T2 | Quercus petraea | Ozdemir, Makineci, Yilmaz, Kumbasli, Caliskan, Beskardes, Keten, Zengin & Yilmaz 2019, Eur. J. For. Res. 138:623–637 | DBH, H | 0.4–34.5 | verified (see note) |  |
| OZD-GEN-T1 | genel | Ozdemir, Makineci, Yilmaz, Kumbasli, Caliskan, Beskardes, Keten, Zengin & Yilmaz 2019, Eur. J. For. Res. 138:623–637 | DBH | 0.2–38.5 | verified (see note) |  |
| OZD-GEN-T2 | genel | Ozdemir, Makineci, Yilmaz, Kumbasli, Caliskan, Beskardes, Keten, Zengin & Yilmaz 2019, Eur. J. For. Res. 138:623–637 | DBH, H | 0.2–38.5 | verified (see note) |  |
| SON-T | Pinus brutia | Sönmez, Kahriman, Şahin & Yavuz 2016, Šumarski list 140(11–12):567–576 | DBH, H | 0.4–63 | verified | 1.068103 |
| DUR-CED-D | Cedrus libani | Durkaya, Durkaya, Makineci & Ülküdür 2013, iForest 6:278–284 | DBH | 8–43 | verified (see note) |  |
| DUR-CED-DH | Cedrus libani | Durkaya, Durkaya, Makineci & Ülküdür 2013, iForest 6:278–284 | DBH, H | 8–43 | verified (see note) |  |
| DUR09-PBR | Pinus brutia | Durkaya, Durkaya & Ünsal 2009, African Journal of Biotechnology 8(11):2483–2488 | DBH | — | web-read |  |
| DUR10-PNI-D | Pinus nigra | Durkaya, Durkaya & Çakıl 2010, Journal of Environmental Biology 31:115–118 | DBH | — | web-read (see note) |  |
| DUR10-PNI-DH | Pinus nigra | Durkaya, Durkaya & Çakıl 2010, Journal of Environmental Biology 31:115–118 | DBH, H | — | web-read (see note) |  |
| DUR15-PBR-D | Pinus brutia | Durkaya, Durkaya, Makineci & Orhan 2015, Fresenius Environ. Bull. 24(11):3573–3583 | DBH | 8–52 | web-read |  |
| DUR15-PBR-DH | Pinus brutia | Durkaya, Durkaya, Makineci & Orhan 2015, Fresenius Environ. Bull. 24(11):3573–3583 | DBH, H | 8–52 | web-read |  |
| DUR15-PSY-D | Pinus sylvestris | Durkaya, Durkaya, Makineci & Orhan 2015, Fresenius Environ. Bull. 24(11):3573–3583 | DBH | 10–58 | web-read |  |
| DUR15-PNI-D | Pinus nigra | Durkaya, Durkaya, Makineci & Orhan 2015, Fresenius Environ. Bull. 24(11):3573–3583 | DBH | 8–58 | web-read |  |
| DUR15-PNI-DH | Pinus nigra | Durkaya, Durkaya, Makineci & Orhan 2015, Fresenius Environ. Bull. 24(11):3573–3583 | DBH, H | 8–58 | web-read | 1.011314 |
| DUR16-PSY-N | Pinus sylvestris | Durkaya, Durkaya & Ulu Say 2016, Bosque 37(3):509–518 | DBH | 5–26 | web-read |  |
| DUR19-PNI-D | Pinus nigra | Durkaya, Durkaya & Yağcı 2019, Fresenius Environ. Bull. 28(2A):1132–1139 | DBH | 6–55 | web-read (see note) |  |
| DUR19-PNI-DH | Pinus nigra | Durkaya, Durkaya & Yağcı 2019, Fresenius Environ. Bull. 28(2A):1132–1139 | DBH, H | 6–55 | web-read (see note) |  |
| DUR22-PBR | Pinus brutia | Durkaya, Durkaya & Sayın 2022, Bartın Orman Fakültesi Dergisi 24(3):609–617 | DBH | 10–30 | web-read (see note) |  |
| OZK21-POR | Picea orientalis | Özkaya 2021, Anadolu Çevre ve Hayvancılık Bilimleri Dergisi 6(1):99–105 | DBH | 20–50 | web-read (see note) |  |
| OZB19-CSA | Castanea sativa | Özbayram & Seçgin 2019, Ormancılık Dergisi 15(2):118–125 | DBH | 2.3–24 | web-read |  |
| TOL12-PSY-D | Pinus sylvestris | Tolunay 2012, İstanbul Üniv. Orman Fakültesi Dergisi 62(2):97–111 | DBH | 6.1–10.9 | verified | 1.003534 |
| TOL12-PSY-D2H | Pinus sylvestris | Tolunay 2012, İstanbul Üniv. Orman Fakültesi Dergisi 62(2):97–111 | DBH, H | 6.1–10.9 | verified | 1.00345 |
| DUR10-PSY-D | Pinus sylvestris | Durkaya, Durkaya & Atmaca 2010, Energy Sources A 32(5):485–493 | DBH | — | verified |  |
| DUR10-PSY-DH | Pinus sylvestris | Durkaya, Durkaya & Atmaca 2010, Energy Sources A 32(5):485–493 | DBH, H | — | verified |  |
| COM11-PSY | Pinus sylvestris | Çömez 2011, doktora tezi, İstanbul Üniversitesi (Tolunay 2012, Tablo 1 üzerinden) | DBH | 7.1–63.2 | secondary source |  |
| SAG20-QC-D | Quercus cerris | Sağlam, Özdemir, Özkan, Demirel & Makineci 2020, Environ. Monit. Assess. 192:418 | DBH | 1.4–19.3 | verified |  |
| SAG20-QC-DH | Quercus cerris | Sağlam, Özdemir, Özkan, Demirel & Makineci 2020, Environ. Monit. Assess. 192:418 | DBH, H | 1.4–19.3 | verified |  |
| OZC20-PCA-D | Populus × canescens | Özcan, Makineci & Özdemir 2020, Environ. Monit. Assess. 192:363 | DBH | 4.5–21.6 | verified |  |
| OZC20-PCA-DH | Populus × canescens | Özcan, Makineci & Özdemir 2020, Environ. Monit. Assess. 192:363 | DBH, H | 4.5–21.6 | verified |  |
| AYD16-CED-D | Cedrus libani | Aydın 2016, doktora tezi, Süleyman Demirel Üniv. Fen Bilimleri Enstitüsü (danışman S. Carus); aynı çalışma OGM Batı Akdeniz Ormancılık Araştırma Enstitüsü proje sonuç raporu (Ocak 2017) | DBH | 5.5–56 | verified |  |
| AYD16-CED-DH | Cedrus libani | Aydın 2016, doktora tezi, Süleyman Demirel Üniv. Fen Bilimleri Enstitüsü (danışman S. Carus); aynı çalışma OGM Batı Akdeniz Ormancılık Araştırma Enstitüsü proje sonuç raporu (Ocak 2017) | DBH, H | 5.5–56 | verified |  |

### Europe–Mediterranean (69)

| Code | Species | Source | Inputs | DBH range (cm) | Status | cf |
|---|---|---|---|---|---|---|
| REP-P | P. sylvestris | Repola 2009, Silva Fennica 43(4):625–647 | DBH, H | 1.5–35.8 | verified (see note) |  |
| REP-S | P. abies | Repola 2009, Silva Fennica 43(4):625–647 | DBH, H | 1.7–41.7 | verified (see note) |  |
| COR-PPI | Pinus pinea | Correia vd. 2010, Forest Systems 19(3):418–433 | DBH, H | 6.5–56.3 | verified |  |
| CIE-Q1 | Quercus robur, Q. petraea | Cienciala, Apltauer, Exnerová & Tatarinov 2008, J. For. Sci. 54(3):109–120 | DBH | 6.4–59 | verified |  |
| CIE-Q2 | Quercus robur, Q. petraea | Cienciala, Apltauer, Exnerová & Tatarinov 2008, J. For. Sci. 54(3):109–120 | DBH, H | 6.4–59 | verified |  |
| CIE-Q3 | Quercus robur, Q. petraea | Cienciala, Apltauer, Exnerová & Tatarinov 2008, J. For. Sci. 54(3):109–120 | DBH, H, CD | 6.4–59 | verified |  |
| DMG-SY-D | Pinus brutia | de-Miguel, Pukkala, Assaf & Shater 2014, Ann. For. Sci. 71:101–112 | DBH | 2.3–55.8 | verified (see note) |  |
| DMG-SY-DH | Pinus brutia | de-Miguel, Pukkala, Assaf & Shater 2014, Ann. For. Sci. 71:101–112 | DBH, H | 2.3–55.8 | verified (see note) |  |
| DMG-LB-D | Pinus brutia | de-Miguel, Pukkala, Assaf & Shater 2014, Ann. For. Sci. 71:101–112 | DBH | 2.3–55.8 | verified (see note) |  |
| DMG-LB-DH | Pinus brutia | de-Miguel, Pukkala, Assaf & Shater 2014, Ann. For. Sci. 71:101–112 | DBH, H | 2.3–55.8 | verified (see note) |  |
| DMG-ME-D | Pinus brutia | de-Miguel, Pukkala, Assaf & Shater 2014, Ann. For. Sci. 71:101–112 | DBH | 2.3–55.8 | verified (see note) |  |
| COR18-D | Pinus pinea | Correia, Faias, Ruiz-Peinado vd. 2018, Forest Ecology and Management 429:425–436 | DBH | 6.3–72.6 | verified |  |
| COR18-DH | Pinus pinea | Correia, Faias, Ruiz-Peinado vd. 2018, Forest Ecology and Management 429:425–436 | DBH, H | 6.3–72.6 | verified |  |
| ZIA03-FMO | Fagus moesiaca | Zianis & Mencuccini 2003, Annals of Forest Science 60(5):439–448 | DBH | 5.19–40.6 | web-read |  |
| ZIA03-FAG | Fagus spp., genel | Zianis & Mencuccini 2003, Annals of Forest Science 60(5):439–448 | DBH | 1–66 | web-read | 1.017753 |
| DUT20-FSY-D | Fagus sylvatica | Dutcă, Zianis, Petrițan vd. 2020, Forests 11(11):1136 | DBH | 5.2–86.3 | database record |  |
| DUT20-FSY-DH | Fagus sylvatica | Dutcă, Zianis, Petrițan vd. 2020, Forests 11(11):1136 | DBH, H | 5.2–86.3 | database record |  |
| DUT20-AAL-D | Abies alba | Dutcă, Zianis, Petrițan vd. 2020, Forests 11(11):1136 | DBH | 5.1–92.6 | database record |  |
| DUT20-AAL-DH | Abies alba | Dutcă, Zianis, Petrițan vd. 2020, Forests 11(11):1136 | DBH, H | 5.1–92.6 | database record |  |
| MON05-PSY | Pinus sylvestris | Montero, Ruiz-Peinado & Muñoz 2005, Monografías INIA Serie Forestal 13 (İspanya) | DBH | 6.2–76 | web-read |  |
| MON05-PNI | Pinus nigra | Montero, Ruiz-Peinado & Muñoz 2005, Monografías INIA Serie Forestal 13 (İspanya) | DBH | 9.9–77.3 | web-read |  |
| MON05-PPI | Pinus pinea | Montero, Ruiz-Peinado & Muñoz 2005, Monografías INIA Serie Forestal 13 (İspanya) | DBH | 7.5–63 | web-read |  |
| MON05-PHA | Pinus halepensis | Montero, Ruiz-Peinado & Muñoz 2005, Monografías INIA Serie Forestal 13 (İspanya) | DBH | 8–44 | web-read |  |
| MON05-FSY | Fagus sylvatica | Montero, Ruiz-Peinado & Muñoz 2005, Monografías INIA Serie Forestal 13 (İspanya) | DBH | 9.5–74.8 | web-read |  |
| MON05-QRO | Quercus robur | Montero, Ruiz-Peinado & Muñoz 2005, Monografías INIA Serie Forestal 13 (İspanya) | DBH | 9.6–67.5 | web-read |  |
| MON05-QPY | Quercus pyrenaica | Montero, Ruiz-Peinado & Muñoz 2005, Monografías INIA Serie Forestal 13 (İspanya) | DBH | 2.1–65 | web-read |  |
| MON05-API | Abies pinsapo | Montero, Ruiz-Peinado & Muñoz 2005, Monografías INIA Serie Forestal 13 (İspanya) | DBH | 7–51 | web-read |  |
| FOR-ABIEALB-AGB | Abies alba | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 5.7–57.7 | verified |  |
| FOR-TUM-AGB | All species combined | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 0.1–162 | verified |  |
| FOR-ALNUGLU-AGB | Alnus glutinosa | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 1–47.3 | verified |  |
| FOR-ALNUGLU2-AGB | Alnus glutinosa Or A. incana | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 0.7–47.3 | verified |  |
| FOR-ALNUINC-AGB | Alnus incana | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 0.7–24.6 | verified |  |
| FOR-BETUPEN-AGB | Betula pendula | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 1–14 | verified |  |
| FOR-BETUPUB-AGB | Betula pubescens | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 0.5–9 | verified |  |
| FOR-GENIS-AGB | Broad-leaved species | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 0.1–90 | verified |  |
| FOR-CASTSAT-AGB | Castania sativa | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 1–64.2 | verified |  |
| FOR-IGNE-AGB | Conifers | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 1–162 | verified |  |
| FOR-FAGUSYL-AGB | Fagus sylvatica | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 1–84 | verified |  |
| FOR-FRAXEXC-AGB | Fraxinus excelsior | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 0.1–40 | verified |  |
| FOR-LARIDEC-AGB | Larix decidua | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 4–90.1 | verified |  |
| FOR-PICEABI-AGB | Picea abies | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 1–82 | verified |  |
| FOR-PINUCEM-AGB | Pinus cembra | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 7.7–56.3 | verified |  |
| FOR-PINUNIG-AGB | Pinus nigra | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 8–77.3 | verified |  |
| FOR-PINUPIN-AGB | Pinus pinaster | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 1.5–64 | verified |  |
| FOR-PINUSYL-AGB | Pinus sylvestris | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 1–71 | verified |  |
| FOR-POPU-AGB | Populus | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 0.1–44.7 | verified |  |
| FOR-PSEUMEN-AGB | Pseudotuga menziesii | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 1.8–162 | verified |  |
| FOR-QUERILE-AGB | Quercus ilex | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 1–90 | verified |  |
| FOR-QUERPET2-AGB | Quercus petraea Or Q. robur | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 5.9–67.5 | verified |  |
| FOR-QUERROB-AGB | Quercus robur | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 5.9–67.5 | verified |  |
| FOR-ROBIPSE-AGB | Robinia pseudoacacia | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 0.1–40.1 | verified |  |
| RP-PNI | Pinus nigra | Ruiz-Peinado, del Río & Montero 2011, Forest Systems 20(1):176–188 | DBH, H | 10–77.3 | verified |  |
| RP-PSY | Pinus sylvestris | Ruiz-Peinado, del Río & Montero 2011, Forest Systems 20(1):176–188 | DBH, H | 6.2–76 | verified |  |
| RP-PPI | Pinus pinea | Ruiz-Peinado, del Río & Montero 2011, Forest Systems 20(1):176–188 | DBH, H | 9–63 | verified |  |
| RP-PHA | Pinus halepensis | Ruiz-Peinado, del Río & Montero 2011, Forest Systems 20(1):176–188 | DBH, H | 8–44 | verified |  |
| RP-AAL | Abies alba | Ruiz-Peinado, del Río & Montero 2011, Forest Systems 20(1):176–188 | DBH, H | 9–57.5 | verified |  |
| RP12-AGL | Alnus glutinosa | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH, H | 8.3–47.3 | verified |  |
| RP12-CSA | Castanea sativa | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH, H | 10.7–50.6 | verified |  |
| RP12-CSI | Ceratonia siliqua | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH, H | 10.2–42.9 | verified |  |
| RP12-EGL | Eucalyptus globulus | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH, H | 9.8–54 | verified |  |
| RP12-FSY | Fagus sylvatica | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH, H | 9.5–74.8 | verified |  |
| RP12-FAN | Fraxinus angustifolia | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH, H | 7.2–52.2 | verified |  |
| RP12-OEU | Olea europaea var. sylvestris | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH, H | 10–40.5 | verified |  |
| RP12-PEU | Populus × euramericana | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH, H | 11.4–50.7 | verified |  |
| RP12-QCA | Quercus canariensis | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH, H | 10–60 | verified |  |
| RP12-QFA | Quercus faginea | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH, H | 9.5–46.5 | verified |  |
| RP12-QIL | Quercus ilex | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH, H | 7.8–85.9 | verified |  |
| RP12-QPY | Quercus pyrenaica | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH, H | 5–38.2 | verified |  |
| RP12-QSU | Quercus suber | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH, H | 10.5–83 | verified |  |

### World (26)

| Code | Species | Source | Inputs | DBH range (cm) | Status | cf |
|---|---|---|---|---|---|---|
| JUC-A7-G | gymnosperm | Jucker vd. 2017, Global Change Biology 23:177–190 | H, CD | — | verified (see note) |  |
| JUC-A7-A | angiosperm | Jucker vd. 2017, Global Change Biology 23:177–190 | H, CD | — | verified (see note) |  |
| JEN-1 | Sert ağaç | Jenkins vd. 2003, Forest Science 49(1):12–35 | DBH | — | verified |  |
| JEN-2 | Sert ağaç | Jenkins vd. 2003, Forest Science 49(1):12–35 | DBH | — | verified |  |
| JEN-3 | Sert ağaç | Jenkins vd. 2003, Forest Science 49(1):12–35 | DBH | — | verified |  |
| JEN-4 | Sert ağaç | Jenkins vd. 2003, Forest Science 49(1):12–35 | DBH | — | verified |  |
| JEN-5 | cedar/larch | Jenkins vd. 2003, Forest Science 49(1):12–35 | DBH | — | verified |  |
| JEN-6 | İğne yapraklı | Jenkins vd. 2003, Forest Science 49(1):12–35 | DBH | — | verified |  |
| JEN-7 | true fir/hemlock | Jenkins vd. 2003, Forest Science 49(1):12–35 | DBH | — | verified |  |
| JEN-8 | pine | Jenkins vd. 2003, Forest Science 49(1):12–35 | DBH | — | verified |  |
| JEN-9 | spruce | Jenkins vd. 2003, Forest Science 49(1):12–35 | DBH | — | verified |  |
| JEN-10 | woodland | Jenkins vd. 2003, Forest Science 49(1):12–35 | DBH | — | verified |  |
| ALT-Psib-D | Pinus sibirica | Altanzagas vd. 2019, Forests 10:661 | DBH | 2–42 | verified |  |
| ALT-Psib-D2H | Pinus sibirica | Altanzagas vd. 2019, Forests 10:661 | DBH, H | 2–42 | verified |  |
| ALT-Psib-DH | Pinus sibirica | Altanzagas vd. 2019, Forests 10:661 | DBH, H | 2–42 | verified |  |
| ALT-Bpla-D | Betula platyphylla | Altanzagas vd. 2019, Forests 10:661 | DBH | 6–35.4 | verified |  |
| ALT-Bpla-D2H | Betula platyphylla | Altanzagas vd. 2019, Forests 10:661 | DBH, H | 6–35.4 | verified |  |
| ALT-Bpla-DH | Betula platyphylla | Altanzagas vd. 2019, Forests 10:661 | DBH, H | 6–35.4 | verified |  |
| ALT-Pobo-D | Picea obovata | Altanzagas vd. 2019, Forests 10:661 | DBH | 5.6–43.7 | verified |  |
| ALT-Pobo-D2H | Picea obovata | Altanzagas vd. 2019, Forests 10:661 | DBH, H | 5.6–43.7 | verified |  |
| ALT-Pobo-DH | Picea obovata | Altanzagas vd. 2019, Forests 10:661 | DBH, H | 5.6–43.7 | verified |  |
| ALT-Lsib-D | Larix sibirica | Altanzagas vd. 2019, Forests 10:661 | DBH | 3.8–52.5 | verified |  |
| ALT-Lsib-D2H | Larix sibirica | Altanzagas vd. 2019, Forests 10:661 | DBH, H | 3.8–52.5 | verified |  |
| ALT-Lsib-DH | Larix sibirica | Altanzagas vd. 2019, Forests 10:661 | DBH, H | 3.8–52.5 | verified |  |
| DEL-MAG | Larix cajanderi | Delcourt & Veraverbeke 2022, Biogeosciences 19:4499–4520 | DBH | 3.9–52.8 | verified (see note) |  |
| DEL-UYA | Larix cajanderi | Delcourt & Veraverbeke 2022, Biogeosciences 19:4499–4520 | DBH | 1.8–18.9 | verified (see note) |  |

## Root models

### Türkiye (1)

| Code | Species | Source | Inputs | DBH range (cm) | Status | cf |
|---|---|---|---|---|---|---|
| AYD16-CED-WKT | Cedrus libani | Aydın 2016, doktora tezi (SDÜ) | DBH | 7.5–56 | verified |  |

### Europe–Mediterranean (44)

| Code | Species | Source | Inputs | DBH range (cm) | Status | cf |
|---|---|---|---|---|---|---|
| FOR-TUM-KOK | All species combined | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 0.1–135 | verified |  |
| FOR-ALNUGLU2-KOK | Alnus glutinosa Or A. incana | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 1.8–47.3 | verified |  |
| FOR-BETUPEN2-KOK | Betula pendula Or B. pubescens | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 0.5–38 | verified |  |
| FOR-GENIS-KOK | Broad-leaved species | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 0.1–85.9 | verified |  |
| FOR-IGNE-KOK | Conifers | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 0.4–135 | verified |  |
| FOR-FAGUSYL-KOK | Fagus sylvatica | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 0.5–79.4 | verified |  |
| FOR-FRAXEXC-KOK | Fraxinus excelsior | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 0.1–8.1 | verified |  |
| FOR-PICEABI-KOK | Picea abies | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 0.4–74 | verified |  |
| FOR-PINUNIG-KOK | Pinus nigra | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 10–77.3 | verified |  |
| FOR-PINUPIN-KOK | Pinus pinaster | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 10–60 | verified |  |
| FOR-PINUSYL-KOK | Pinus sylvestris | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 1–76 | verified |  |
| FOR-PSEUMEN-KOK | Pseudotuga menziesii | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 2.3–135 | verified |  |
| FOR-QUERILE-KOK | Quercus ilex | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 7.2–85.9 | verified |  |
| FOR-QUERPET2-KOK | Quercus petraea Or Q. robur | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 7–67.5 | verified |  |
| FOR-QUERROB-KOK | Quercus robur | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 8–67.5 | verified |  |
| FOR-ROBIPSE-KOK | Robinia pseudoacacia | Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5) | DBH | 0.1–24 | verified |  |
| RP-PNI-KOK | Pinus nigra | Ruiz-Peinado, del Río & Montero 2011, Forest Systems 20(1):176–188 | DBH | 10–77.3 | verified |  |
| RP-PSY-KOK | Pinus sylvestris | Ruiz-Peinado, del Río & Montero 2011, Forest Systems 20(1):176–188 | DBH | 6.2–76 | verified |  |
| RP-PPI-KOK | Pinus pinea | Ruiz-Peinado, del Río & Montero 2011, Forest Systems 20(1):176–188 | DBH | 9–63 | verified |  |
| RP-PHA-KOK | Pinus halepensis | Ruiz-Peinado, del Río & Montero 2011, Forest Systems 20(1):176–188 | DBH | 8–44 | verified |  |
| RP-AAL-KOK | Abies alba | Ruiz-Peinado, del Río & Montero 2011, Forest Systems 20(1):176–188 | DBH | 9–57.5 | verified |  |
| RP12-AGL-KOK | Alnus glutinosa | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH | 8.3–47.3 | verified |  |
| RP12-CSA-KOK | Castanea sativa | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH | 10.7–50.6 | verified |  |
| RP12-CSI-KOK | Ceratonia siliqua | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH | 10.2–42.9 | verified |  |
| RP12-FSY-KOK | Fagus sylvatica | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH | 9.5–74.8 | verified |  |
| RP12-FAN-KOK | Fraxinus angustifolia | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH | 7.2–52.2 | verified |  |
| RP12-OEU-KOK | Olea europaea var. sylvestris | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH | 10–40.5 | verified |  |
| RP12-PEU-KOK | Populus × euramericana | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH | 11.4–50.7 | verified |  |
| RP12-QCA-KOK | Quercus canariensis | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH | 10–60 | verified |  |
| RP12-QFA-KOK | Quercus faginea | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH | 9.5–46.5 | verified |  |
| RP12-QIL-KOK | Quercus ilex | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH | 7.8–85.9 | verified |  |
| RP12-QPY-KOK | Quercus pyrenaica | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH | 5–38.2 | verified |  |
| RP12-QSU-KOK | Quercus suber | Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52 | DBH | 10.5–83 | verified |  |
| COR18-MT-d-KOK | Pinus pinea | Correia, Faias, Ruiz-Peinado vd. 2018, Forest Ecology and Management 429:425–436 | DBH | 6.3–72.6 | verified |  |
| COR18-MT-dh-KOK | Pinus pinea | Correia, Faias, Ruiz-Peinado vd. 2018, Forest Ecology and Management 429:425–436 | DBH, H | 6.3–72.6 | verified |  |
| ROH19-PSY | Pinus sylvestris | Röhling vd. 2019, iForest 12:166–172 (Almanya) | DBH | 7.2–53.2 | web-read |  |
| ROH19-QUE | Quercus robur, Q. petraea | Röhling vd. 2019, iForest 12:166–172 (Almanya) | DBH | 7.4–42 | web-read |  |
| ROH19-BPE | Betula pendula | Röhling vd. 2019, iForest 12:166–172 (Almanya) | DBH | 8.2–52.9 | web-read |  |
| MON05-PSY-KOK | Pinus sylvestris | Montero, Ruiz-Peinado & Muñoz 2005, Monografías INIA 13 (İspanya) | DBH | 6.2–76 | web-read |  |
| MON05-PNI-KOK | Pinus nigra | Montero, Ruiz-Peinado & Muñoz 2005, Monografías INIA 13 (İspanya) | DBH | 9.9–77.3 | web-read |  |
| MON05-PPI-KOK | Pinus pinea | Montero, Ruiz-Peinado & Muñoz 2005, Monografías INIA 13 (İspanya) | DBH | 7.5–63 | web-read |  |
| MON05-PHA-KOK | Pinus halepensis | Montero, Ruiz-Peinado & Muñoz 2005, Monografías INIA 13 (İspanya) | DBH | 8–44 | web-read |  |
| MON05-QRO-KOK | Quercus robur | Montero, Ruiz-Peinado & Muñoz 2005, Monografías INIA 13 (İspanya) | DBH | 9.6–67.5 | web-read |  |
| MON05-QPY-KOK | Quercus pyrenaica | Montero, Ruiz-Peinado & Muñoz 2005, Monografías INIA 13 (İspanya) | DBH | 2.1–65 | web-read |  |
