// Freezes the audit set: copies the 12 drawn Contra Labs designs into public/designs (resized) and writes
// src/data/audit-set.json with their briefs and the fixed pairs. The judge and the designer panel both read
// this file, so they see exactly the same designs and pairs.
// Run after scripts/import-contra.ts: node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/prepare-designs.ts
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { makePairs } from "../src/lib/judge-plan.ts";

const AUDIT_SEED = "HK-2026-001 judge-audit-1";
const WIDTH = 1080;

const selected = JSON.parse(await fs.readFile(path.join("data-uji", "contra", "selected.json"), "utf8")) as {
  seed: string;
  designs: { id: string; brand: string; file: string; brief: string }[];
};

await fs.mkdir(path.join("public", "designs"), { recursive: true });
const designs = [];
for (const d of selected.designs) {
  const file = `${d.file.replace(/\.[a-z]+$/, "")}.jpg`;
  await sharp(path.join("data-uji", "contra", "designs", d.file))
    .resize({ width: WIDTH, withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 90, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toFile(path.join("public", "designs", file));
  designs.push({ id: d.id, brand: d.brand, brief: d.brief, file: `/designs/${file}` });
}

const set = {
  seed: AUDIT_SEED,
  drawSeed: selected.seed,
  source:
    "Contra Labs, creative-ad-design-dataset (huggingface.co/datasets/contralabs/creative-ad-design-dataset), CC BY 4.0. Images resized to 1080 px.",
  designs,
  pairs: makePairs(designs.map((d) => d.id), AUDIT_SEED),
};
await fs.mkdir(path.join("src", "data"), { recursive: true });
await fs.writeFile(path.join("src", "data", "audit-set.json"), JSON.stringify(set, null, 2) + "\n");
console.log(`${designs.length} designs, ${set.pairs.length} pairs written.`);
