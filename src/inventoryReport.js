// inventoryReport.js — build a Digital Forest Inventory PDF in the browser.
//
// Depends only on jsPDF (one client-side script; no server, in keeping with
// FORA). Input is FORA's `met` tree array (the same one used for the CSV and
// the on-screen table), so no new computation is needed — the report formats
// what exists. Carbon figures are included only if you pass a carbon summary
// (from standCarbon in carbon.js).
//
// Field names match App.jsx's met records:
//   h (height m), cd (crown diameter m), cpa (crown proj. area m²),
//   dbhModel (modelled DBH cm), bm_total (total biomass kg), cx/cy (coords).
//
// Usage:
//   import { jsPDF } from "jspdf";
//   import { buildInventoryPDF } from "./inventoryReport.js";
//   import { standCarbon } from "./carbon.js";
//   const carbon = standCarbon(met, { areaHa: standArea });   // optional
//   const doc = buildInventoryPDF(met, {
//     projectName: fileName, areaHa: standArea, epsg: detectedEpsg, carbon
//   }, jsPDF);
//   doc.save("forest_inventory.pdf");

const GREEN = [44, 95, 45];
const INK = [31, 42, 36];
const GREY = [120, 130, 128];
const MOSS = [151, 188, 98];
const LIGHT = [238, 242, 235];

// jsPDF's built-in Helvetica only covers WinAnsi (Latin-1 + a few symbols), so
// Turkish ı ş ğ İ Ş Ğ printed as garbage ("Kızılçam" -> "K1z1lçam"). Fold any
// character outside that set to its base letter; unknown ones become "?".
const WINANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
export function pdfText(s) {
  return String(s ?? "").replace(/ı/g, "i").replace(/İ/g, "I").split("").map((ch) => {
    if (ch.charCodeAt(0) < 256 || WINANSI_EXTRA.includes(ch)) return ch;
    const base = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return base.length === 1 && base.charCodeAt(0) < 256 ? base : "?";
  }).join("");
}

function stats(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const n = v.length, sum = v.reduce((a, b) => a + b, 0);
  const q = (p) => {
    const i = (n - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
    return v[lo] + (v[hi] - v[lo]) * (i - lo);
  };
  return { n, min: v[0], max: v[n - 1], mean: sum / n, median: q(0.5), q25: q(0.25), q75: q(0.75) };
}

function histogram(values, edges) {
  const bins = new Array(edges.length - 1).fill(0);
  for (const x of values) {
    if (!Number.isFinite(x)) continue;
    for (let b = 0; b < bins.length; b++) {
      if (x >= edges[b] && (x < edges[b + 1] || b === bins.length - 1)) { bins[b]++; break; }
    }
  }
  return bins;
}

export function buildInventoryPDF(trees, meta = {}, jsPDFCtor) {
  const jsPDF = jsPDFCtor || (typeof window !== "undefined" && window.jspdf && window.jspdf.jsPDF);
  if (!jsPDF) throw new Error("jsPDF not available — import it or expose window.jspdf.jsPDF");

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, M = 18;
  let y = 0;

  // read FORA's met field names (h, cd, cpa, dbhModel)
  const heights = trees.map((t) => Number(t.h)).filter(Number.isFinite);
  const cds = trees.map((t) => Number(t.cd)).filter(Number.isFinite);
  const cpas = trees.map((t) => Number(t.cpa)).filter(Number.isFinite);
  const dbhs = trees.map((t) => Number(t.dbhModel)).filter((x) => Number.isFinite(x) && x > 0);

  const hS = stats(heights), cdS = stats(cds), cpaS = stats(cpas), dbhS = stats(dbhs);

  // ---------- header band ----------
  doc.setFillColor(...GREEN); doc.rect(0, 0, W, 30, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
  doc.text("Digital Forest Inventory", M, 15);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...MOSS);
  doc.text("Generated with FORA — fora-platform.github.io/fora", M, 22);
  y = 40;

  // ---------- project meta ----------
  doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text(pdfText(meta.projectName || "Untitled project"), M, y); y += 7;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...GREY);
  const metaLines = [
    meta.fileName ? `Source file: ${meta.fileName}` : null,
    `Date: ${meta.date || new Date().toISOString().slice(0, 10)}`,
    meta.areaHa ? `Area: ${meta.areaHa.toFixed(2)} ha${meta.areaSource ? ` (${meta.areaSource})` : ""}` : null,
    meta.epsg ? `Projection: EPSG:${meta.epsg}` : null,
    meta.species ? `DBH model: ${meta.species}` : null,
    ...(meta.methodLines || []),
  ].filter(Boolean);
  // method lines can be long (segmentation parameters) — wrap them
  metaLines.forEach((l) => {
    const lines = doc.splitTextToSize(pdfText(l), W - 2 * M);
    doc.text(lines, M, y); y += 5 * lines.length;
  });
  y += 4;

  // ---------- key figures ----------
  const cards = [
    ["Trees detected", trees.length.toLocaleString("en-US")],
    ["Mean height", hS ? `${hS.mean.toFixed(1)} m` : "—"],
    ["Max height", hS ? `${hS.max.toFixed(1)} m` : "—"],
    ["Mean crown Ø", cdS ? `${cdS.mean.toFixed(1)} m` : "—"],
  ];
  if (meta.areaHa) cards.push(["Stem density", `${Math.round(trees.length / meta.areaHa)} /ha`]);

  const cw = (W - 2 * M - (cards.length - 1) * 4) / cards.length;
  cards.forEach((c, i) => {
    const x = M + i * (cw + 4);
    doc.setFillColor(...LIGHT); doc.roundedRect(x, y, cw, 20, 2, 2, "F");
    doc.setTextColor(...GREEN); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text(String(c[1]), x + cw / 2, y + 9, { align: "center" });
    doc.setTextColor(...GREY); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.text(String(c[0]), x + cw / 2, y + 15, { align: "center" });
  });
  y += 28;

  // ---------- summary statistics ----------
  doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text("Summary statistics", M, y); y += 6;

  const table = [["Metric", "n", "Min", "Mean", "Median", "Max"]];
  const addRow = (name, s, unit) => {
    if (!s) return;
    table.push([name, String(s.n), `${s.min.toFixed(1)}${unit}`,
      `${s.mean.toFixed(1)}${unit}`, `${s.median.toFixed(1)}${unit}`, `${s.max.toFixed(1)}${unit}`]);
  };
  addRow("Tree height", hS, " m");
  addRow("Crown diameter", cdS, " m");
  addRow("Crown proj. area", cpaS, " m2");
  if (dbhS) addRow("DBH (modelled)", dbhS, " cm");

  const colX = [M, M + 46, M + 62, M + 90, M + 118, M + 150];
  doc.setFontSize(8.5);
  table.forEach((row, r) => {
    if (r === 0) { doc.setFont("helvetica", "bold"); doc.setTextColor(...GREEN); }
    else { doc.setFont("helvetica", "normal"); doc.setTextColor(...INK); }
    row.forEach((cell, c) => { doc.text(String(cell), colX[c], y); });
    if (r === 0) { doc.setDrawColor(...MOSS); doc.setLineWidth(0.3); doc.line(M, y + 1.5, W - M, y + 1.5); }
    y += 6;
  });
  y += 6;

  // ---------- height histogram ----------
  if (hS) {
    doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text("Height distribution", M, y); y += 4;
    const edges = [0, 5, 10, 15, 20, 25, 30, 40];
    const bins = histogram(heights, edges);
    const maxBin = Math.max(...bins, 1);
    const chartX = M, chartY = y, chartW = W - 2 * M, chartH = 42, barGap = 3;
    const bw = (chartW - barGap * (bins.length - 1)) / bins.length;
    bins.forEach((count, i) => {
      const bh = (count / maxBin) * chartH;
      const bx = chartX + i * (bw + barGap), by = chartY + chartH - bh;
      doc.setFillColor(...GREEN); doc.rect(bx, by, bw, bh, "F");
      doc.setTextColor(...GREY); doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      if (count > 0) doc.text(String(count), bx + bw / 2, by - 1.5, { align: "center" });
      doc.text(i === bins.length - 1 ? `${edges[i]}+` : `${edges[i]}-${edges[i + 1]}`, bx + bw / 2, chartY + chartH + 4, { align: "center" });
    });
    doc.setDrawColor(...GREY); doc.setLineWidth(0.2); doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH);
    doc.setTextColor(...GREY); doc.setFontSize(7.5);
    doc.text("height class (m)", chartX + chartW / 2, chartY + chartH + 9, { align: "center" });
    y = chartY + chartH + 14;
  }

  // ---------- optional carbon page ----------
  if (meta.carbon) {
    doc.addPage();
    doc.setFillColor(...GREEN); doc.rect(0, 0, W, 24, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    doc.text("Carbon Estimation Summary", M, 15);
    let cy = 36;
    const c = meta.carbon;
    const crows = [
      ["Trees with biomass", `${c.treesWithBiomass.toLocaleString("en-US")} of ${trees.length.toLocaleString("en-US")}`],
      ["Above-ground biomass", `${c.agb_t.toFixed(2)} t`],
      ["Below-ground biomass", `${c.bgb_t.toFixed(2)} t`],
      ["Total biomass", `${c.totalBiomass_t.toFixed(2)} t`],
      ["Carbon stock", `${c.carbon_tC.toFixed(2)} t C`],
      ["CO2 equivalent", `${c.co2eq_tCO2.toFixed(2)} t CO2eq`],
    ];
    if (c.carbonPerHa_tC != null) {
      if (meta.areaHa) crows.push(["Above-ground biomass per hectare", `${(c.agb_t / meta.areaHa).toFixed(1)} t/ha`]);
      crows.push(["Carbon per hectare", `${c.carbonPerHa_tC.toFixed(2)} t C/ha`]);
      crows.push(["CO2eq per hectare", `${c.co2PerHa_tCO2.toFixed(2)} t CO2eq/ha`]);
    }
    doc.setFontSize(10);
    crows.forEach(([k, v]) => {
      doc.setTextColor(...INK); doc.setFont("helvetica", "normal"); doc.text(k, M, cy);
      doc.setTextColor(...GREEN); doc.setFont("helvetica", "bold"); doc.text(String(v), W - M, cy, { align: "right" });
      doc.setDrawColor(...LIGHT); doc.setLineWidth(0.3); doc.line(M, cy + 2, W - M, cy + 2);
      cy += 9;
    });
    cy += 6;
    doc.setTextColor(...GREY); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    const method = c.method || {};
    const mtext =
      `Method: below-ground biomass = AGB x ${method.rootToShoot ?? 0.29} (root-to-shoot). ` +
      `Carbon = (AGB + BGB) x ${method.carbonFraction ?? 0.47} (carbon fraction). ` +
      `CO2 equivalent = carbon x 44/12. ${method.source || "IPCC 2006 Guidelines, Vol. 4"}. ` +
      `Above-ground biomass from the Sönmez et al. (2016) Pinus brutia equations. ` +
      (c.treesWithBiomass < trees.length
        ? `${trees.length - c.treesWithBiomass} trees fall outside the DBH model's height range and have no biomass; they are not included in the totals, so the true stock may be higher. `
        : "") +
      `These figures are estimated (IPCC methodology) and have not been validated with field measurements; for formal carbon-credit use they should be validated with field samples.`;
    doc.text(doc.splitTextToSize(mtext, W - 2 * M), M, cy);
  }

  // ---------- footer ----------
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setTextColor(...GREY); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    doc.text("FORA — browser-based UAV-LiDAR forest analysis", M, 289);
    doc.text(`${p} / ${pages}`, W - M, 289, { align: "right" });
  }

  return doc;
}
