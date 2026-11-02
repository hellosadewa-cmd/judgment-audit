// Publishes a finished replication test: copies originals and AI versions into public/niche/<slug>/ and writes
// src/data/niche-<slug>.json, which the curation and report pages read.
// Usage: node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/prepare-niche.ts korsa-landing korsa
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { PROMPT_VERSION } from "../src/lib/niche-prompts.ts";

const [niche, slug] = process.argv.slice(2);
if (!niche || !slug) throw new Error("Usage: prepare-niche.ts <niche> <slug>");

// Titles and links of the Korsa works, from the curated test set.
const manifest = new Map(
  (await fs.readFile(path.join("data-uji", "manifest.csv"), "utf8"))
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(","))
    .map((cols) => [cols[2], { title: cols[3], url: cols[5] }]),
);

const root = path.join("data-uji", "niche", niche);
const out = path.join("public", "niche", slug);
await fs.mkdir(out, { recursive: true });
const jpeg = (file: string, to: string) =>
  sharp(file).resize({ width: 1200, withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 85, mozjpeg: true }).toFile(to);

const works = [];
for (const dir of (await fs.readdir(root)).sort()) {
  const id = dir.split("-")[1];
  const run = JSON.parse(await fs.readFile(path.join(root, dir, "run.json"), "utf8"));
  await jpeg(path.join(root, dir, "original.jpg"), path.join(out, `${id}-original.jpg`));
  await jpeg(path.join(root, dir, "ai.png"), path.join(out, `${id}-ai.jpg`));
  works.push({
    id,
    title: manifest.get(id)?.title ?? dir,
    url: manifest.get(id)?.url ?? "",
    original: `/niche/${slug}/${id}-original.jpg`,
    ai: `/niche/${slug}/${id}-ai.jpg`,
    brief: (await fs.readFile(path.join(root, dir, "brief.txt"), "utf8")).trim(),
    seconds: Math.round(run.seconds),
  });
}

const data = {
  id: niche,
  studio: "Korsa Agency",
  name: "Landing page portfolio shots",
  promptVersion: PROMPT_VERSION,
  models: { brief: "muse-spark-1.3", image: "muse-image-1.0" },
  works,
};
await fs.mkdir(path.join("src", "data"), { recursive: true });
await fs.writeFile(path.join("src", "data", `niche-${slug}.json`), JSON.stringify(data, null, 2) + "\n");
console.log(`${works.length} works published to ${out}`);
