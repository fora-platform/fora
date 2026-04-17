# FORA GitHub + Zenodo Deploy Rehberi

Bu rehber, FORA'nın GitHub'a yüklenmesi ve Zenodo DOI alınması sürecini
adım adım anlatır. Tahmini süre: 30-45 dakika.

═══════════════════════════════════════════════════════════════
ÖN HAZIRLIK
═══════════════════════════════════════════════════════════════

## Gerekenler

1. **GitHub hesabı** — https://github.com (yoksa ücretsiz aç)
2. **Git yüklü** — https://git-scm.com (bilgisayarında yoksa indir)
3. **Node.js 18+** — https://nodejs.org (LTS sürüm önerilir)
4. **Zenodo hesabı** — https://zenodo.org (GitHub ile giriş yapılabilir)

## Klasörün hazırlanması

`FORA_github_v1.0.0` klasöründeki tüm dosyaları bilgisayarında bir
klasöre kopyala. Klasör yapısı şöyle olmalı:

```
FORA_github_v1.0.0/
├── src/
│   ├── App.jsx          (ana React bileşeni)
│   └── main.jsx         (entry point)
├── .github/
│   └── workflows/
│       └── deploy.yml   (GitHub Actions otomatik deploy)
├── .gitignore
├── ALLOMETRIC_MODELS.md
├── CHANGELOG.md
├── CITATION.cff         (Zenodo için)
├── LICENSE              (MIT)
├── README.md
├── index.html
├── package.json
└── vite.config.js
```

═══════════════════════════════════════════════════════════════
ADIM 1 — LOKAL TEST (önerilen, ~5 dk)
═══════════════════════════════════════════════════════════════

GitHub'a yüklemeden önce bilgisayarında test et:

```bash
cd FORA_github_v1.0.0
npm install
npm run dev
```

Tarayıcıda otomatik açılacak (http://localhost:5173). Bir .las dosyası
yükle ve test et. Her şey çalışıyorsa, devam et.

Build testi:
```bash
npm run build
npm run preview
```

═══════════════════════════════════════════════════════════════
ADIM 2 — GITHUB REPOSITORY OLUŞTUR (~5 dk)
═══════════════════════════════════════════════════════════════

## A) Browser'da repo oluştur

1. https://github.com/new adresine git
2. **Owner**: kullanıcı adın (veya 'fora-platform' adında organization açabilirsin)
3. **Repository name**: `fora`
4. **Description**: "FORA — Browser-based UAV-LiDAR platform for forest inventory"
5. **Public** seç
6. **README eklemeYİN** (zaten bizde var)
7. **Create repository** butonuna bas

## B) Lokal Git repo'yu GitHub'a bağla

Terminal / Komut isteminde:

```bash
cd FORA_github_v1.0.0

# Git repo olarak başlat
git init
git add .
git commit -m "Initial release v1.0.0"

# GitHub remote ekle (kendi kullanıcı adınla değiştir)
git branch -M main
git remote add origin https://github.com/KULLANICI_ADIN/fora.git

# Push et
git push -u origin main
```

GitHub kullanıcı adı + **Personal Access Token** (şifre değil) sorarsa:
- https://github.com/settings/tokens → "Generate new token (classic)"
- Scope: `repo` (tam izin) işaretle
- Token'ı kopyala, şifre yerine yapıştır

═══════════════════════════════════════════════════════════════
ADIM 3 — GITHUB PAGES AÇ (~3 dk)
═══════════════════════════════════════════════════════════════

1. GitHub'da repo sayfanda **Settings** sekmesine git
2. Sol menüden **Pages** seç
3. **Source**: "GitHub Actions" seç (Deploy from a branch DEĞİL)
4. Kaydet

Artık her push'ta otomatik deploy olur.

İlk deploy süreci için:
1. **Actions** sekmesine git
2. "Deploy to GitHub Pages" workflow'u çalışıyor olmalı
3. ~1-2 dakikada yeşil tik gelir

Site URL:
```
https://KULLANICI_ADIN.github.io/fora/
```

═══════════════════════════════════════════════════════════════
ADIM 4 — İLK RELEASE OLUŞTUR (~5 dk)
═══════════════════════════════════════════════════════════════

Zenodo'nun DOI üretmesi için release gerekli.

1. GitHub'da repo sayfanda sağ kenardaki **Releases** → **Create a new release**
2. **Tag**: `v1.0.0` yaz, "Create new tag" seç
3. **Release title**: "FORA v1.0.0 — Initial Release"
4. **Description** (kopyala-yapıştır):

```markdown
## FORA v1.0.0 — Initial Public Release

First stable release of FORA (FORest Analysis), a browser-based platform
for processing UAV-LiDAR point clouds in forest structures.

### Features
- LAS file parsing (v1.2–1.4)
- Interactive 3D/2D visualization with Three.js
- CHM-based individual tree detection
- Area-based approach (ABA) metrics
- 8 allometric DBH models for Turkish tree species
- Biomass estimation for Pinus brutia
- Bilingual UI (TR/EN), MIT licensed

### Validation
- 8 UAV LiDAR datasets, 4,878 matched trees
- Pooled R² = 0.901 vs lidR algorithms
- ITC mean height R² = 0.948 vs PANGAEA reference

See `CHANGELOG.md` for details.

### Live demo
https://fora-platform.github.io/fora

### Citation
```bibtex
@software{gencal2026fora,
  author  = {Gencal, Burhan},
  title   = {FORA: A browser-based platform for processing UAV-LiDAR point clouds in forest structures},
  version = {1.0.0},
  year    = {2026},
  url     = {https://github.com/fora-platform/fora}
}
```
```

5. **Publish release** butonuna bas

═══════════════════════════════════════════════════════════════
ADIM 5 — ZENODO ENTEGRASYONU (~10 dk)
═══════════════════════════════════════════════════════════════

## A) Zenodo hesabı aç

1. https://zenodo.org/ → **Sign up**
2. **"Sign up with GitHub"** seç (en kolayı)
3. Yetki iste: Access your public repositories

## B) GitHub repo'yu Zenodo ile eşle

1. Zenodo → sağ üst profil ikonuna tıkla → **GitHub**
2. https://zenodo.org/account/settings/github/
3. Repository listende `fora` reposunu bul
4. **Toggle "ON"** yap (yeşil olmalı)
5. Bu andan itibaren her yeni release otomatik DOI alır

## C) Mevcut release için DOI al

Toggle'ı ON yaptıktan sonra yeni bir release oluşturman gerekiyor.
İki seçenek:

### Seçenek 1: v1.0.1 release'i
```bash
# Küçük bir değişiklik yap (örn. README'ye satır ekle)
git add .
git commit -m "Trigger Zenodo DOI"
git push

# Yeni release oluştur (GitHub UI'da)
# Tag: v1.0.1
```

### Seçenek 2: v1.0.0'ı sil, yeniden oluştur
GitHub → Releases → v1.0.0 → silmeye gerek yok, yeni v1.0.1 oluştur

## D) DOI'yi al

1. Zenodo → **Upload** → yeni entry görünür (otomatik)
2. "Published" olarak işaretliyse DOI hazır
3. DOI şöyle görünür: `10.5281/zenodo.XXXXXXX`

## E) DOI'yi README ve CITATION.cff'ye ekle

README.md'de:
```markdown
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.XXXXXXX.svg)](https://doi.org/10.5281/zenodo.XXXXXXX)
```

CITATION.cff'ye ekle:
```yaml
doi: "10.5281/zenodo.XXXXXXX"
```

Push et:
```bash
git add README.md CITATION.cff
git commit -m "Add Zenodo DOI"
git push
```

═══════════════════════════════════════════════════════════════
ADIM 6 — MAKALELERE DOI EKLE
═══════════════════════════════════════════════════════════════

## SoftwareX makalesi (SoftwareX_paper.md)

Referans [31] güncelle:
```
[31] Gencal B. FORA v1.0.0 [software]. GitHub; 2026. 
     https://github.com/fora-platform/fora. 
     https://doi.org/10.5281/zenodo.XXXXXXX
```

Metadata tablosunda C2'yi güncelle:
```
C2  Permanent link to code/repository  https://github.com/fora-platform/fora
```

## IECF 2026 abstract

Son paragrafa DOI ekle:
```
FORA is freely available at https://fora-platform.github.io/fora 
(DOI: 10.5281/zenodo.XXXXXXX) under the MIT license.
```

═══════════════════════════════════════════════════════════════
ADIM 7 — SON KONTROL
═══════════════════════════════════════════════════════════════

Her şey tamam mı kontrol et:

✓ GitHub repo public ve erişilebilir
✓ GitHub Pages site açılıyor (https://.../fora)
✓ .las dosyası yükleyince çalışıyor
✓ Release v1.0.0 (veya v1.0.1) görünüyor
✓ Zenodo DOI alındı
✓ README'de DOI badge var
✓ CITATION.cff doğru
✓ LICENSE dosyası var

═══════════════════════════════════════════════════════════════
OLASI SORUNLAR
═══════════════════════════════════════════════════════════════

## "404 Page Not Found" GitHub Pages'te

vite.config.js'te `base: '/fora/'` olduğundan emin ol. Repo adı
değiştiyse base'i de değiştir. Push et.

## GitHub Actions kırmızı (failed)

Actions sekmesi → log'a bak. Yaygın sebepler:
- `package.json` eksik dependency
- Node.js version uyumsuzluğu (workflow'da 20 yazdık)

## LAS yüklemede hata

Test amacıyla küçük bir .las dosyası dene (< 1M nokta). Browser
console'a bak (F12).

## Zenodo DOI almıyor

Toggle ON'dan SONRA release oluşturman şart. Önceki release'ler
otomatik DOI almaz.

═══════════════════════════════════════════════════════════════
SONRAKİ ADIMLAR (deploy bittikten sonra)
═══════════════════════════════════════════════════════════════

1. IECF 2026 abstract'ı submit et (deadline: 17 Mayıs 2026)
   - https://sciforum.net/user/submission/create/1544

2. SoftwareX makalesini Turan hocaya gösterimle/onay
   - DOI eklenmiş halde

3. SoftwareX'e submit
   - https://www.editorialmanager.com/softx/

4. Sosyal medya duyuru (istersen):
   - Twitter/X: "#FORA #LiDAR #forestry open-source"
   - LinkedIn: akademik profil güncelle

Kolay gelsin! 🌲
