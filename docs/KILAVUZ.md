# FORA Kullanım Kılavuzu (v1.9)

FORA, İHA (drone) LiDAR nokta bulutlarından orman envanteri çıkaran, tarayıcıda çalışan ücretsiz bir araçtır.

- **Kurulum yok.** https://fora-platform.github.io/fora adresini açman yeterli.
- **Verin bilgisayarından çıkmaz.** Dosya hiçbir sunucuya gönderilmez; her şey senin tarayıcında hesaplanır.
- **LAS ve LAZ** dosyalarını açar (sürüm 1.2–1.4).

> English version: [MANUAL.md](MANUAL.md)

---

## Başlamadan önce: 3 kural

### Kural 1 — Sıra şöyle

```
Yükle  →  (gerekirse) Kes  →  Seg  →  Tür  →  Alan  →  Rapor
```

Her adım bir öncekinin sonucunu kullanır. Tür ve Alan'ın kendi aralarındaki sırası fark etmez; ikisi de Seg'den sonra gelir.

### Kural 2 — Geri dönersen, sonraki adımlar silinir

| Bunu yaparsan | Bunlar silinir | Ne yapmalısın |
|---|---|---|
| Yeni dosya yüklersen | Her şey | Baştan başla |
| Kesersen (Clip) ya da kesmeyi geri alırsan (↩) | Ağaçlar, Metrik tablosu, Alan sonuçları | Seg'i yeniden çalıştır |
| Seg'i yeniden çalıştırırsan | DBH₁, biyokütle, karbon, Alan sonuçları **ve elle girdiğin H₂ / CD₂ / DBH₂ ölçümleri** | Türü yeniden uygula, Alan'ı yeniden hesapla |

> Sahada ölçtüğün değerleri girmeden önce Seg ayarlarını kesinleştir.

### Kural 3 — Harici DTM kullanacaksan, LAS'tan ÖNCE seç

Zemin, dosya yüklenirken hesaplanır. DTM'i sonradan seçersen etkisi ancak dosyayı yeniden yüklediğinde görülür.

### Ve unutma: FORA hiçbir şey kaydetmez

Sayfayı kapatırsan ya da yenilersen bütün sonuçlar kaybolur. İşin bitince **CSV** ve **PDF** al.

---

## 5 dakikada ilk sonuç

1. **LAS / LAZ Dosyası Yükle** butonuna bas ve dosyanı seç.
2. **Seg** sekmesine geç, **Çalıştır**'a bas. FORA ağaçları bulur ve kendiliğinden **Metrik** sekmesini açar.
3. Metrik sekmesinin en üstünden **türü seç**, **Uygula**'ya bas. DBH₁ sütunu dolar.
4. **Alan** sekmesine geç, **Hesapla**'ya bas.
5. **Metrik** sekmesine dön, **📄 PDF**'e bas. Envanter raporun iner.

Aşağıda her adım aynı sırayla, ayrıntılı anlatılıyor.

---

## Ekranı tanı

**Üst çubukta:** bulunan ağaç sayısı, mesajlar, **2D / 3D** düğmesi, **renk modu** menüsü, tema (☀ / 🌙), **TR / EN**, **Yeni** (başka dosya açar) ve **↩** (kesmeyi geri alır; sadece kesince görünür).

**Yan paneldeki sekmeler:** **Araç · Clip · Seg · Metrik · Alan · İstat · Tür · T**

Sekmelerin sırası iş akışıyla birebir aynı değil. Bu kılavuzdaki sırayı izle.

---

## 1. Dosyayı yükle

- **LAS** ya da **LAZ** seçebilirsin. LAZ, sıkıştırılmış LAS'tır ve FORA onu kendisi açar. Ekranda "LAZ açılıyor..." yazar; büyük dosyalarda birkaç saniye sürebilir.
- Yükleyince FORA zemini bulur ve her noktanın **zeminden yüksekliğini** hesaplar. Buna normalizasyon denir.
- **5 milyondan fazla nokta varsa** FORA dosyayı düzenli aralıklarla seyreltir (her k'ıncı noktayı alır) ve **bütün hesapları bu seyreltilmiş bulutla yapar**. Araç → LAS Dosyası panelinde "gösterilen / toplam" olarak görürsün. Tam yoğunlukta çalışmak istiyorsan dosyayı önceden küçük parçalara böl (örneğin LAStools ya da PDAL ile).

**Araç → LAS Dosyası** paneli dosyanın künyesini gösterir:
- sürüm (LAS ya da LAZ)
- nokta sayısı ve nokta yoğunluğu
- kapsam ve alan
- yükseklik aralığı
- RGB var mı yok mu
- sınıf dağılımı

**EPSG** (koordinat sistemi) bu sürümde okunmuyor; panel bunu "okunmuyor" diye açıkça yazar.

**LAZ açılmazsa** açılış ekranında LAS'a dönüştürme yolları çıkar: CloudCompare, R, LAStools, PDAL.

---

## 2. Zemin modeli (isteğe bağlı): LAS'tan ÖNCE

- **Otomatik (grid min-Z):** Varsayılan budur. Her hücredeki en alçak nokta zemin sayılır.
- **Harici DTM:** Alt tabakası yoğun alanlarda zemini daha iyi verir. Desteklenen biçimler: GeoTIFF (.tif), ESRI ASCII (.asc / .txt), XYZ / CSV.

Yapılışı:
1. Açılış ekranında **Harici DTM yükle**'yi seç.
2. DTM dosyanı seç.
3. **Sonra** LAS'ı yükle.

DTM'in yüksekliği LAS'la 50 m'den fazla uyuşmazsa FORA DTM'i kullanmaz, otomatik moda geçer ve seni uyarır.

---

## 3. Bak: 2D, 3D ve renkler

- **2D** üstten haritadır (açılışta bu görünür). Izgara yazıları dosyanın gerçek doğu/kuzey koordinatlarıdır; fareyi gezdirince alt ortada imlecin koordinatı görünür.
- **3D** üç boyutlu görünümdür:
  - **Sol tık + sürükle:** döndürür.
  - **Sağ tık, orta tuş (tekerlek basılı) veya Shift + sürükle:** görünümü kaydırır.
  - **Tekerlek:** imlecin olduğu yere yakınlaşır.
  - **Dokunmatik ekran:** tek parmak döndürür, iki parmak kaydırır ve yakınlaştırır.
  - Sağ üstteki düğmeler: **⟲ Sıfırla** (başlangıç görünümü), **⊤ Üstten** (yukarıdan, kuzey yukarıda), **✋ Kaydır** (açıkken sol tık da kaydırır; orta tuşu olmayan dokunmatik yüzeyler için), **# Eksenler** (koordinat ızgarası, doğu/kuzey ve yükseklik ekseni, kuzey oku) ve **⇕** (dikey eksen).
- **Dikey eksen** (3D ve 2D yan görünüm; ayrıca Araç → Görüntü): **Zeminden yükseklik** varsayılandır; arazi düzleştirilir, ağaç boyları eksenden okunur. **Rakım** dosyadaki gerçek yüksekliği gösterir. Zemin yüksekliği bilinmeyen noktalar (harici DTM'in dışında kalanlar) zeminden yükseklik görünümünde gösterilmez.
- **Renk modları:**
  - Yükseklik
  - Normalize (zeminden yükseklik)
  - RGB (dosyada varsa)
  - Yoğunluk (intensity, yansıma şiddeti)
  - Sınıf (ASPRS)
  - **Vejetasyon katmanı**
  - Segment (Seg'den sonra görünür)

**Vejetasyon katmanı** noktaları zeminden yüksekliğe göre 4 gruba ayırır:

| Katman | Varsayılan aralık |
|---|---|
| Zemin / diğer | 0.5 m altı |
| Düşük | 0.5 – 2 m |
| Orta | 2 – 5 m |
| Yüksek | 5 m üstü |

Bu modu seçince Araç sekmesinde eşik kutuları ve her katmanın yüzdesi çıkar. Eşikleri alanına göre değiştirebilirsin. Bu mod dosyadaki sınıf alanını kullanmaz, sadece yüksekliğe bakar.

**Araç → Görüntü** bölümünde iki ayar var:
- **Boyut:** noktaların ekrandaki büyüklüğü.
- **Örnekleme:** ekranda kaç noktanın çizileceği. **Sadece görüntüyü hızlandırır, hesapları etkilemez.**

---

## 4. Kes (Clip): alan büyükse

Kesmek hem işlemi hızlandırır hem de sadece ilgilendiğin meşcereye odaklanmanı sağlar. Kestikten sonraki bütün hesaplar kesilen alanda yapılır.

1. **2D** görünümde ol. 3D'de kesilmez.
2. **Clip** sekmesinde daire (⊚) ya da kare (◻) seç.
3. **R (m)** değerini gir. Dairede yarıçaptır; karede kenarın yarısıdır (R = 15 → 30 × 30 m kare).
4. Haritada merkeze tıkla.
5. **✂ Kes**'e bas.

Geri almak için üst çubuktaki **↩**'ya bas. Kural 2'yi unutma: kesmek de geri almak da ağaçları, Metrik tablosunu ve Alan sonuçlarını siler.

Kestiğin dairenin ya da karenin gerçek alanı, Alan sekmesindeki ağaç yoğunluğu (N/ha) hesabında kullanılır.

---

## 5. Ağaçları bul (Seg)

| Ayar | Varsayılan | Ne işe yarar |
|---|---|---|
| **Hücre** | 0.5 m | Tepe modelinin (CHM) çözünürlüğü. Küçüldükçe ayrıntı artar ama işlem yavaşlar. |
| **Min H** | 2 m | Bu boydan kısa tepeler ağaç sayılmaz. |
| **Search R** | 3 m | Tepe ararken kullanılan pencerenin yarıçapı (Sabit modda). |
| **Pencere Modu** | Sabit | **Sabit:** her yerde aynı yarıçap. **VWS:** pencere ağaç boyuyla büyür (Popescu & Wynne 2004). |
| **Taç Projeksiyon** | Sınır kutusu | Taç çapının nasıl ölçüleceği: Sınır kutusu (eski sürümlerle uyumlu), Dışbükey zarf, İçbükey zarf. CSV'de hepsi listelenir. |

VWS'nin hazır ayarları: **Pine** (iğne yapraklı), **Deciduous** (geniş yapraklı), **Combined** (karışık), **Linear** (boreal) ve **Özel**. Özel seçeneğinde kendi katsayılarını doğrusal ya da karesel olarak girersin.

**Çalıştır**'a bas. Metrik sekmesi açılır, üst çubukta "ölçülen ağaç / bulunan segment" sayısı görünür. Bir segmentin ağaç olarak ölçülebilmesi için en az 5 noktası olmalıdır.

> **Hangi pencere modu?** Boyları birbirine yakın, düzgün meşcerelerde **Sabit** iyi çalışır. Boyları çok farklıysa **VWS** dene.

---

## 6. Ağaç tablosu (Metrik)

| Sütun | Ne demek | Kim doldurur |
|---|---|---|
| **#** | Ağaç numarası | FORA |
| **H** | Boy (m) | FORA |
| **CD** | Taç çapı (m) | FORA |
| **X, Y** | Taç merkezinin koordinatları (dosyanın koordinat sistemi) | FORA |
| **DBH₁** | Modelden çap tahmini (cm). Tür uygulanınca dolar. | FORA |
| **DBH₂** | Sahada ölçtüğün çap (cm) | **Sen** (isteğe bağlı) |
| **H₂** | Sahada ölçtüğün boy (m) | **Sen** (isteğe bağlı) |
| **CD₂** | Sahada ölçtüğün taç çapı (m) | **Sen** (isteğe bağlı) |
| **N** | Ağacın nokta sayısı | FORA |

Özetle: **H, CD, DBH₁ = FORA'nın tahmini. H₂, CD₂, DBH₂ = senin ölçümün.** Ölçüm girmek zorunlu değil; sadece doğrulama yapmak istiyorsan girersin (bkz. bölüm 10).

- Başlıkların üzerine fareyle gelirsen açıklama çıkar.
- Bir satıra tıklarsan o ağaç haritada vurgulanır.
- Tablo **ilk 200 ağacı** gösterir. CSV'de hepsi vardır.
- DBH₁ hücresinde **"–"** görürsen o ağacın boyu, seçilen türün modelinin geçerli aralığının dışındadır (örneğin Kızılçam-Sahil'de yaklaşık 23.8 m üstü). Tablonun üstündeki turuncu not kaç ağacın böyle olduğunu söyler.

---

## 7. Tür → çap (DBH) ve biyokütle

Türü iki yerden seçebilirsin: Metrik sekmesinin üstünden ya da **Tür** sekmesinden. İkisi aynı ayardır.

1. Türü seç.
2. **Uygula**'ya bas.

| Tür | DBH₁ hangi bilgiden | Biyokütle |
|---|---|---|
| Sarıçam (P. sylvestris) | boy + taç çapı | yok |
| Göknar (A. bornmuelleriana) | boy + taç çapı | yok |
| Kızılçam — Sahil / İç / Göl (P. brutia) | boy | **var** (Sönmez et al. 2016) |
| Karaçam (P. nigra) | boy | yok |
| Kayın (F. orientalis) | boy | yok |
| Fıstıkçamı (P. pinea) | boy | yok |
| Meşe (Q. cerris) **[BETA]** | boy | yok |

- Her modelin kaynağı Tür sekmesinde yazar.
- **BETA:** Meşe katsayıları Türkiye için henüz doğrulanmadı. Sonuçları dikkatli kullan.
- Tablonun üstündeki **"Uygulanan tür"** satırı, değerlerin hangi türden geldiğini söyler. Listeden başka tür seçip Uygula'ya basmazsan "seçim değişti" uyarısı çıkar.
- **Seg'i yeniden çalıştırırsan türü yeniden uygula.**

---

## 8. Karbon (sadece Kızılçam)

Kızılçam türlerinden birini uyguladıktan sonra **Tür** sekmesinde **"Karbon tahmini (IPCC)"** paneli çıkar. Panelde şunlar var:

- biyokütlesi olan ağaç sayısı (X / Y)
- yer üstü biyokütle (AGB) ve yer altı biyokütle (BGB)
- karbon stoku ve CO₂ eşdeğeri
- Alan hesaplandıysa hektar başına değerler

**Yöntem:**

```
Yer altı (BGB) = Yer üstü (AGB) × R
Karbon (C)     = (AGB + BGB) × CF
CO₂e           = C × 44/12
```

- Varsayılanlar **R = 0.29** ve **CF = 0.47**'dir (IPCC 2006, Cilt 4). İkisini de paneldeki kutulardan değiştirebilirsin.
- IPCC'de R, meşcerenin hektar başına yer üstü biyokütlesine göre değişir. Panelde gördüğün AGB/ha değerine bakıp alanına uygun R'yi gir.
- Modelin boy aralığı dışındaki ağaçların biyokütlesi yoktur ve toplama girmez. Bu yüzden gerçek stok gösterilenden yüksek olabilir. Panel kaç ağacın dışarıda kaldığını söyler.

> **Önemli:** Bu değerler **tahmindir (IPCC yöntemi) ve saha ölçümüyle doğrulanmamıştır.** Karbon kredisi gibi resmi kullanımlar için saha örneklemesi gerekir.

---

## 9. Alan metrikleri

**Alan** sekmesinde **Hesapla**'ya bas. Sonuçlar iki gruba ayrılır:

**Noktalardan gelenler (ağaçlardan bağımsız):**
- yükseklik persentilleri (H5–H99)
- ortalama ve maksimum boy, standart sapma, CV, çarpıklık, basıklık, IQR
- yoğunluk oranları (D1–D9)
- kapalılık (CC₁.₃)

**ITC (ağaç sayısı, en büyük / en küçük / ortalama boy, N/ha):** Bunlar Seg ister. Seg yapılmadıysa bu bölümde "Segmentasyon yapılmadı" yazar.

Seg'i yeniden çalıştırınca Alan sonuçları silinir; tekrar **Hesapla**'ya bas.

Alan değeri şöyle belirlenir: Kestiysen kesilen dairenin ya da karenin gerçek alanı kullanılır. Kesmediysen dosyanın sınır kutusu (bbox) kullanılır.

---

## 10. İstat: doğrulama (isteğe bağlı)

FORA'nın tahminlerinin ne kadar doğru olduğunu kendi saha ölçümlerinle karşılaştırırsın.

1. Metrik tablosunda, sahada ölçtüğün ağaçların satırlarına **H₂, CD₂, DBH₂** değerlerini gir. **En az 3 ağaç** gerekir.
2. **İstat** sekmesine geç. H, CD ve DBH için ayrı ayrı şunları görürsün: **RMSE, Bias, R², eşli t-testi (t, p).**

- DBH karşılaştırması için önce türün uygulanmış olması gerekir.
- **Dikkat:** Seg'i yeniden çalıştırırsan girdiğin ölçümler silinir ve ağaç numaraları değişebilir. Saha ağaçlarını FORA ağaçlarıyla eşleştirirken numaraya değil **X, Y koordinatlarına** bak.

---

## 11. Kesit (T)

1. **2D** görünümde ol.
2. **T** sekmesinde **Çiz**'e bas.
3. Haritada iki noktaya tıkla.

Bu çizgi boyunca dikey bir kesit altta çizilir; 1.3 m referans çizgisi de dahildir. Silmek için **Temizle**'ye bas.

---

## 12. Dışa aktar

| Ne | Nereden | İçinde |
|---|---|---|
| **Ağaç CSV** | Metrik → 📥 CSV | Bütün ağaçlar: boy, taç ölçüleri (3 yöntem), koordinatlar, DBH, senin ölçümlerin, tür, biyokütle. En sonda karbon sütunları. Altta, hesapladıysan alan metrikleri ve karbon yöntemi bölümü. |
| **Alan CSV** | Alan → 📥 Alan CSV | Alan metrikleri |
| **PDF rapor** | Metrik → 📄 PDF | Özet, istatistikler, boy histogramı, kullanılan parametreler. Alan hesaplandıysa alan ve yoğunluk; Kızılçam uygulandıysa karbon sayfası. |
| **Görüntü** | Araç → Görüntü Kaydet | 2D'deysen harita (fora_map.png), 3D'deysen 3D görüntü (fora_3d.png) |

PDF rapor İngilizcedir. Türkçe harfler rapora sade halleriyle yazılır: ı → i, ş → s, ğ → g.

---

## Sık sorulanlar

**DBH₁ boş.**
Tür uygulanmamıştır. Metrik sekmesinin üstünden türü seçip Uygula'ya bas.

**DBH₁'de "–" var.**
O ağacın boyu, seçilen türün modelinin geçerli aralığının dışında. Bu bir hata değil; model o boy için tanımlı değil.

**Karbon paneli görünmüyor.**
Karbon sadece Kızılçam türlerinde hesaplanır. Bir Kızılçam türü uygula. Panel yine çıkmıyorsa bütün ağaçlar modelin aralığı dışında kalmış olabilir.

**İstat boş.**
En az 3 ağaca saha ölçümü girmen gerekiyor. DBH için ayrıca türün uygulanmış olması gerekir.

**Alan sekmesinde ITC kısmında "Segmentasyon yapılmadı" yazıyor.**
Önce Seg'i çalıştır, sonra Alan'da yeniden Hesapla'ya bas.

**LAS panelinde nokta sayısı "X / Y" görünüyor.**
Dosyan 5 milyon noktadan büyük, bu yüzden FORA onu seyreltti (bkz. bölüm 1).

**LAZ açılmıyor.**
Sayfayı yenileyip tekrar dene; ilk LAZ açılışında küçük bir bileşen indirilir ve bunun için internet gerekir. Yine olmazsa açılış ekranındaki yollardan biriyle dosyayı LAS'a dönüştür.

**CSV'yi Excel'de açınca sayılar bozuk görünüyor.**
Türkçe Excel ondalık ayırıcı olarak virgül bekler, FORA ise nokta kullanır. Dosyayı çift tıklayarak açma. Excel'de **Veri → Metinden/CSV'den** ile içe aktar ve ondalık ayırıcı olarak **nokta** seç.

**Verilerim nereye gidiyor?**
Hiçbir yere. Her şey senin tarayıcında hesaplanır.

**FORA'nın sonuçları doğrulanmış mı?**
FORA'nın tahminleri yayımlanmış modellere dayanır, ama senin alanın için doğrulanmış değildir. Kendi saha ölçümlerinle İstat sekmesinde kontrol edebilirsin. Karbon ve biyokütle tahminleri saha ölçümüyle doğrulanmamıştır.

---

## Atıf

FORA'yı bir çalışmada kullanırsan lütfen atıf ver:

- **Makale:** SoftwareX — https://doi.org/10.1016/j.softx.2026.102927
- **Yazılım (her zaman en son sürüm):** Zenodo — https://doi.org/10.5281/zenodo.19546162

Uygulamanın açılış ekranındaki **Atıf** butonu BibTeX metnini verir.

FORA açık kaynaktır (MIT lisansı): https://github.com/fora-platform/fora
