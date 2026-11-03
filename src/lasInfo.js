// lasInfo.js — derive a header summary from a parsed LAS object.
//
// Works with FORA's own parseLAS output. The parsed object (lasParser.js)
// carries: nOrig, x, y, z, r, g, b, intensity, classification, hasRGB, ox, oy.
// The typed arrays' length is the point count. Coordinates x/y are relative to
// a double-precision origin (ox, oy); this restores absolute corners.
//
// Usage in App.jsx, right after parseLAS:
//   import { getLasInfo, renderLasInfoHTML } from "./lasInfo.js";
//   const info = getLasInfo(parsedLas, { epsg: detectedEpsg });  // epsg optional

const EPSG_NAMES = {
  "3067": "ETRS89 / TM35FIN (Finland)",
  "3035": "ETRS89 / LAEA Europe",
  "25833": "ETRS89 / UTM 33N", "25835": "ETRS89 / UTM 35N",
  "32635": "WGS 84 / UTM 35N", "32636": "WGS 84 / UTM 36N", "32637": "WGS 84 / UTM 37N",
  "5253": "TUREF / TM33 (Türkiye)", "5254": "TUREF / TM36 (Türkiye)", "5255": "TUREF / TM39 (Türkiye)",
  "2154": "RGF93 / Lambert-93 (France)", "25830": "ETRS89 / UTM 30N",
};
const ASPRS = {
  0: "Never classified", 1: "Unclassified", 2: "Ground",
  3: "Low vegetation", 4: "Medium vegetation", 5: "High vegetation",
  6: "Building", 7: "Low point (noise)", 8: "Reserved", 9: "Water",
  10: "Rail", 11: "Road surface", 12: "Overlap", 13: "Wire guard", 14: "Wire conductor",
};

function extent(a, n) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < n; i++) { const v = a[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
  return [lo, hi];
}

export function getLasInfo(p, opts = {}) {
  const n = p.x.length;   // FORA's parseLAS: typed-array length is the point count
  const [xlo, xhi] = extent(p.x, n);
  const [ylo, yhi] = extent(p.y, n);
  const [zlo, zhi] = extent(p.z, n);
  const spanX = xhi - xlo, spanY = yhi - ylo;
  const bboxHa = (spanX * spanY) / 10000;

  const counts = {};
  if (p.classification) {
    for (let i = 0; i < n; i++) { const c = p.classification[i]; counts[c] = (counts[c] || 0) + 1; }
  }
  const classes = Object.keys(counts).map(Number).sort((a, b) => counts[b] - counts[a])
    .map((c) => ({ code: c, label: ASPRS[c] || `Class ${c}`, count: counts[c], pct: (100 * counts[c]) / n }));

  // density from the file's full point count, not the subsampled one
  // (parseLAS thins files above 5M points; using n would underestimate density)
  const nTotal = p.nOrig != null ? p.nOrig : n;
  const density = bboxHa > 0 ? nTotal / (bboxHa * 10000) : 0;
  const epsg = opts.epsg ? String(opts.epsg) : null;
  const ox = p.ox || 0, oy = p.oy || 0;

  return {
    pointCount: n,
    originalCount: p.nOrig != null ? p.nOrig : n,
    subsampled: p.nOrig != null && p.nOrig > n,
    hasRGB: !!p.hasRGB,
    minElev: zlo, maxElev: zhi, elevRange: zhi - zlo,
    minX: ox + xlo, maxX: ox + xhi, minY: oy + ylo, maxY: oy + yhi,
    widthM: spanX, heightM: spanY, areaHa: bboxHa, densityPerM2: density,
    epsg, epsgName: epsg ? (EPSG_NAMES[epsg] || null) : null,
    classes,
  };
}

export function renderLasInfoHTML(info) {
  const f0 = (x) => Number(x).toLocaleString("en-US", { maximumFractionDigits: 0 });
  const f2 = (x) => Number(x).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rows = [
    ["Points", info.subsampled ? `${f0(info.pointCount)} shown / ${f0(info.originalCount)} total` : f0(info.pointCount)],
    ["Extent", `${f0(info.widthM)} × ${f0(info.heightM)} m`],
    ["Area (bbox)", `${f2(info.areaHa)} ha`],
    ["Point density", `${f2(info.densityPerM2)} pts/m²`],
    ["Elevation", `${f2(info.minElev)} – ${f2(info.maxElev)} m  (Δ ${f2(info.elevRange)} m)`],
    ["Colour", info.hasRGB ? "RGB present" : "no RGB"],
    ["Projection", info.epsg ? `EPSG:${info.epsg}${info.epsgName ? "  ·  " + info.epsgName : ""}` : "not read"],
  ];
  const classRows = info.classes.map((c) =>
    `<tr><td>${c.code}</td><td>${c.label}</td><td style="text-align:right">${f0(c.count)}</td><td style="text-align:right">${c.pct.toFixed(1)}%</td></tr>`).join("");
  return `
<div class="las-info">
  <table class="las-info-main">${rows.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}</table>
  ${info.classes.length ? `<div class="las-info-classes-title">Point classes</div>
  <table class="las-info-classes"><thead><tr><th>Code</th><th>Class</th><th>Points</th><th>%</th></tr></thead><tbody>${classRows}</tbody></table>` : ""}
</div>`;
}
