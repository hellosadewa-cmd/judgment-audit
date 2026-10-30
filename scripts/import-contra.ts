// Imports Contra Labs' creative-ad-design-dataset (CC BY 4.0) and draws the audit's designs.
// Input:  data-uji/contra/raw/data.parquet (downloaded from huggingface.co/datasets/contralabs/creative-ad-design-dataset)
// Output: data-uji/contra/designs/*.{png,jpg}, catalog.json (all brands), selected.json (the drawn designs)
// Run:    node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/import-contra.ts
import { promises as fs } from "node:fs";
import path from "node:path";
import { asyncBufferFromFile, parquetReadObjects } from "hyparquet";
import { seeded, seedFrom, shuffle } from "../src/lib/random.ts";

/** Fixed before the images were looked at, so the draw cannot favour any design. */
const DRAW_SEED = "HK-2026-001 contra-12 2026-10-30";
const DRAW_SIZE = 12;

const root = path.join(process.cwd(), "data-uji", "contra");
const rows = (await parquetReadObjects({
  file: await asyncBufferFromFile(path.join(root, "raw", "data.parquet")),
  columns: ["brand", "ad_creative", "product", "personality", "archetype", "modifiers", "category_audience", "color_palette", "typography", "notes"],
  // Image bytes have no string type; without this they would be decoded as UTF-8 text and corrupted.
  utf8: false,
})) as Record<string, unknown>[];

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function extension(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return "png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return "webp";
  throw new Error("Unknown image format");
}

await fs.mkdir(path.join(root, "designs"), { recursive: true });
const catalog = [];
for (const row of rows) {
  const brand = text(row.brand);
  const image = (row.ad_creative as { bytes?: Uint8Array } | null)?.bytes;
  if (!brand || !image?.length) continue;
  const file = `${slug(brand)}.${extension(image)}`;
  await fs.writeFile(path.join(root, "designs", file), image);
  const brief = [
    ["Product", row.product],
    ["Brand personality", row.personality],
    ["Ad archetype", row.archetype],
    ["Modifiers", row.modifiers],
    ["Category and audience", row.category_audience],
    ["Colour palette", row.color_palette],
    ["Typography", row.typography],
    ["Notes", row.notes],
  ]
    .filter(([, v]) => text(v))
    .map(([k, v]) => `${k}: ${text(v)}`)
    .join("\n");
  catalog.push({ brand, file, brief });
}
catalog.sort((a, b) => a.brand.localeCompare(b.brand));

const drawn = shuffle(catalog, seeded(seedFrom(DRAW_SEED))).slice(0, DRAW_SIZE);
const selected = drawn.map((d, i) => ({ id: `d${i + 1}`, ...d }));

await fs.writeFile(path.join(root, "catalog.json"), JSON.stringify(catalog, null, 2));
await fs.writeFile(
  path.join(root, "selected.json"),
  JSON.stringify({ seed: DRAW_SEED, source: "Contra Labs, creative-ad-design-dataset (CC BY 4.0)", designs: selected }, null, 2),
);
console.log(`${rows.length} rows, ${catalog.length} designs written; drew ${selected.length}:`);
for (const d of selected) console.log(`  ${d.id}  ${d.brand}  (${d.file})`);
