// Runs the AI replication test on a niche's works and keeps every result in data-uji/niche/<niche>/<work>/.
// Usage: node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/replicate.ts <niche> <image>... [--limit N]
// Reads MODEL_API_KEY from .env.local and never prints it. Works already done are skipped.
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { metaClient, normalise, replicate } from "../src/lib/replicate.ts";

const args = process.argv.slice(2);
const limitAt = args.indexOf("--limit");
const limit = limitAt >= 0 ? Number(args[limitAt + 1]) : Infinity;
const [niche, ...images] = limitAt >= 0 ? args.filter((_, i) => i !== limitAt && i !== limitAt + 1) : args;
if (!niche || !images.length) throw new Error("Usage: replicate.ts <niche> <image>... [--limit N]");

const env = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).trim()]),
);
const client = metaClient(env.MODEL_API_KEY, env.MODEL_API_BASE_URL);
const exists = (file: string) => access(file).then(() => true, () => false);

let done = 0;
for (const image of images) {
  if (done >= limit) break;
  const work = path.basename(image).replace(/\.[a-z]+$/i, "");
  const dir = path.join("data-uji", "niche", niche, work);
  if (await exists(path.join(dir, "ai.png"))) continue;
  await mkdir(dir, { recursive: true });
  const original = await normalise(await readFile(image));
  await writeFile(path.join(dir, "original.jpg"), original);
  const replica = await replicate(client, original);
  await writeFile(path.join(dir, "brief.txt"), replica.brief + "\n");
  await writeFile(path.join(dir, "ai.png"), replica.image);
  await writeFile(
    path.join(dir, "run.json"),
    JSON.stringify({ work, at: new Date().toISOString(), seconds: replica.seconds, usage: replica.usage }, null, 2) + "\n",
  );
  console.log(`${work}: brief ${replica.brief.split(/\s+/).length} words, image made, ${replica.seconds.toFixed(0)} s`);
  done++;
}
