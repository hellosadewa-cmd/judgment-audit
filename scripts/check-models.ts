// Gate G0: confirms the three Meta models on the core path answer with this project's key.
// Usage: node scripts/check-models.ts <output-dir>. Reads MODEL_API_KEY from .env.local and never prints it.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import sharp from "sharp";
import { parseImageStream, recordsOfKind, decodeMaskToRaster, type ResponsesEvent } from "@meta-sam/parser";

const out = process.argv[2] ?? ".data/check-models";
await mkdir(out, { recursive: true });

const env = Object.fromEntries(
  (await readFile(".env.local", "utf8"))
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).trim()]),
);
const client = new OpenAI({ baseURL: env.MODEL_API_BASE_URL || "https://api.meta.ai/v1", apiKey: env.MODEL_API_KEY });

// A stand-in for a piece of design work: a poster on a plain wall.
const poster = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800">
  <rect width="1200" height="800" fill="#d9d4cc"/>
  <rect x="350" y="120" width="500" height="560" fill="#e4572e"/>
  <circle cx="600" cy="330" r="130" fill="#f3d34a"/>
  <text x="600" y="590" font-family="Helvetica" font-size="72" font-weight="700" text-anchor="middle" fill="#1f2a44">KORSA</text>
</svg>`);
const image = await sharp(poster).jpeg({ quality: 90 }).toBuffer();
await writeFile(path.join(out, "input.jpg"), image);
const dataUrl = `data:image/jpeg;base64,${image.toString("base64")}`;
const userInput = (text: string) => [
  { type: "message", role: "user", content: [{ type: "input_text", text }, { type: "input_image", image_url: dataUrl }] },
];

async function timed<T>(label: string, run: () => Promise<T>): Promise<T | null> {
  const start = Date.now();
  try {
    const result = await run();
    console.log(`OK   ${label} (${((Date.now() - start) / 1000).toFixed(1)} s)`);
    return result;
  } catch (error) {
    const e = error as { status?: number; message?: string };
    console.log(`FAIL ${label} (${((Date.now() - start) / 1000).toFixed(1)} s): ${e.status ?? ""} ${e.message ?? error}`);
    return null;
  }
}

// 1. Muse Spark, vision: the quality checker and report writer.
const spark = await timed("muse-spark-1.3 vision", async () => {
  const response = await client.responses.create({
    model: "muse-spark-1.3",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    input: userInput("In one sentence, describe this image.") as any,
  });
  return response.output_text;
});
if (spark) console.log(`     → ${spark.trim()}`);

// 2. SAM 3.1: the mask that protects the design's pixels.
// The parser needs exactly one output_text.done per text lane. Depending on the API version it arrives on its
// own or only as content_part.done, so pass the first one through and synthesise it when missing (Meta's cookbook).
async function* normalized(stream: AsyncIterable<unknown>): AsyncIterable<ResponsesEvent> {
  const done = new Set<string>();
  for await (const raw of stream) {
    const event = raw as { type?: string; part?: { type?: string; text?: string } } & Record<string, unknown>;
    const lane = `${event.item_id}:${event.output_index}:${event.content_index}`;
    if (event.type === "response.output_text.done") {
      if (!done.has(lane)) {
        done.add(lane);
        yield event as unknown as ResponsesEvent;
      }
      continue;
    }
    yield event as unknown as ResponsesEvent;
    if (event.type === "response.content_part.done" && event.part?.type === "output_text" && !done.has(lane)) {
      done.add(lane);
      yield { ...event, type: "response.output_text.done", text: event.part.text } as unknown as ResponsesEvent;
    }
  }
}
// Expected boxes in the test image: poster 350,120 → 850,680; circle 470,200 → 730,460.
for (const concept of ["poster", "yellow circle", "orange rectangle"]) {
  const sam = await timed(`sam-3.1 segment "${concept}"`, async () => {
    const stream = await client.responses.create({
      model: "sam-3.1",
      stream: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: userInput(concept) as any,
    });
    return parseImageStream(normalized(stream as AsyncIterable<unknown>)).finalResult;
  });
  if (!sam) continue;
  const boxes = recordsOfKind(sam.records, "box");
  const masks = recordsOfKind(sam.records, "mask");
  console.log(`     → outcome ${sam.outcome.status}, ${boxes.length} box(es), ${masks.length} mask(s)`);
  for (const box of boxes) console.log(`       box ${box.left},${box.top} → ${box.right},${box.bottom}`);
  for (const mask of masks) {
    const pixels = decodeMaskToRaster(mask.mask).reduce((sum, v) => sum + v, 0);
    console.log(`       mask ${mask.mask.width}×${mask.mask.height}, ${pixels} foreground pixels`);
  }
}

// 3. Muse Image: the controlled edit of an irrelevant detail.
const edit = await timed("muse-image-1.0 edit background", async () => {
  const response = await client.responses.create({
    model: "muse-image-1.0",
    input: userInput(
      "Change only the wall behind the poster to a deep navy colour. Keep the poster itself exactly as it is, same size and position.",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any,
  });
  const call = response.output.find((item) => item.type === "image_generation_call") as { result?: string } | undefined;
  if (!call?.result) throw new Error("No image in the response");
  const data = Buffer.from(call.result, "base64");
  const meta = await sharp(data).metadata();
  await writeFile(path.join(out, `edited.${meta.format}`), data);
  return { size: `${meta.width}×${meta.height} ${meta.format}`, usage: response.usage };
});
if (edit) console.log(`     → ${edit.size}, tokens ${edit.usage?.input_tokens} in / ${edit.usage?.output_tokens} out`);
