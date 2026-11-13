// Regenerates the tables in BIOMASS_MODELS.md from src/biomassLibrary.js and
// src/modelChoice.js. The prose around the tables is kept as written.
// Usage (from the repository root): node tools/build_biomass_docs.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { MODELS } from "../src/biomassLibrary.js";
import { SPECIES_BIOMASS } from "../src/modelChoice.js";

const FILE = new URL("../BIOMASS_MODELS.md", import.meta.url);
const SCOPE_EN = { tr: "Türkiye", eu: "Europe–Mediterranean", world: "World" };
const STATUS = {
  "Doğrulandı": "verified",
  "Doğrulandı — dikkat": "verified (see note)",
  "Web okuması": "web-read",
  "Web okuması — dikkat": "web-read (see note)",
  "İkincil kaynak": "secondary source",
  "Site kaydı": "database record",
};
const SPECIES_ROWS = [
  ["ps", "Scots pine (*Pinus sylvestris*)"],
  ["ab", "Uludağ fir (*Abies bornmuelleriana*)"],
  ["pb", "Calabrian pine, three regions (*Pinus brutia*)"],
  ["pn", "Black pine (*Pinus nigra*)"],
  ["fo", "Oriental beech (*Fagus orientalis*)"],
  ["pp", "Stone pine (*Pinus pinea*)"],
  ["qc", "Turkey oak (*Quercus cerris*)"],
];

// Species column: the scientific (or English group) name in parentheses — the
// first parenthesis without Turkish letters, otherwise the first one.
// "Sarıçam (Pinus sylvestris), genç" → "Pinus sylvestris"; "Huş (iki tür) (Betula …)" → "Betula …".
const sciName = (s) => {
  const p = [...String(s || "").matchAll(/\(([^()]*)\)/g)].map((x) => x[1]);
  return p.find((x) => /^[\x20-\x7e]+$/.test(x)) || p[0] || String(s || "");
};
const inputs = (m) => m.inputs.map((k) => ({ d: "DBH", h: "H", cd: "CD" })[k]).join(", ");
const range = (r) => (Array.isArray(r) ? `${r[0]}–${r[1]}` : "—");
const cell = (s) => String(s ?? "").replace(/\|/g, "\\|");

function speciesTable() {
  const head = "| Species | Europe–Mediterranean (default) | Türkiye | World | Root model |\n|---|---|---|---|---|";
  const rows = SPECIES_ROWS.map(([key, label]) => {
    const e = SPECIES_BIOMASS[key];
    const list = (s) => (e.agb[s].length ? e.agb[s].map((c, i) => (i ? c : `**${c}**`)).join(", ") : "—");
    return `| ${label} | ${list("eu")} | ${list("tr")} | ${list("world")} | ${e.root.length ? e.root.join(", ") : "IPCC ratio"} |`;
  });
  return `${head}\n${rows.join("\n")}`;
}

function modelTables(kind) {
  const out = [];
  for (const s of ["tr", "eu", "world"]) {
    const ms = MODELS.filter((m) => m.kind === kind && m.scope === s);
    if (!ms.length) continue;
    out.push(`### ${SCOPE_EN[s]} (${ms.length})`, "", "| Code | Species | Source | Inputs | DBH range (cm) | Status | cf |", "|---|---|---|---|---|---|---|");
    for (const m of ms) {
      out.push(`| ${m.code} | ${cell(sciName(m.species))} | ${cell(m.source)} | ${inputs(m)} | ${range(m.d)} | ${STATUS[m.status] || m.status} | ${m.cf ?? ""} |`);
    }
    out.push("");
  }
  return out.join("\n");
}

let doc = readFileSync(FILE, "utf8");
const nAgb = MODELS.filter((m) => m.kind === "agb").length;
const nRoot = MODELS.filter((m) => m.kind === "root").length;
doc = doc.replace(/library of \d+ above-ground and \d+ root models/, `library of ${nAgb} above-ground and ${nRoot} root models`);
doc = doc.replace(/\| Species \| Europe–Mediterranean \(default\)[^\n]*\n\|---[^\n]*\n(?:\|[^\n]*\n)+/, `${speciesTable()}\n`);
const cut = doc.indexOf("## Above-ground models");
if (cut < 0) throw new Error("heading '## Above-ground models' not found");
doc = `${doc.slice(0, cut)}## Above-ground models\n\n${modelTables("agb")}\n## Root models\n\n${modelTables("root")}`.replace(/\n{3,}/g, "\n\n").replace(/\n*$/, "\n");
writeFileSync(FILE, doc);
console.log(`BIOMASS_MODELS.md: ${nAgb} above-ground, ${nRoot} root models`);
