// The AI replication test for one work: Muse Spark writes the brief a client would give, then Muse Image makes the
// design from that brief alone, without ever seeing the original.
import OpenAI from "openai";
import sharp from "sharp";
import { BRIEF_PROMPT, imagePrompt } from "./niche-prompts.ts";

export function metaClient(apiKey: string | undefined, baseURL?: string): OpenAI {
  if (!apiKey) throw new Error("MODEL_API_KEY is not set.");
  return new OpenAI({ baseURL: baseURL || "https://api.meta.ai/v1", apiKey });
}

/** The original as sent to the model: at most 1600 px wide, flattened JPEG. */
export function normalise(image: Buffer): Promise<Buffer> {
  return sharp(image).rotate().resize({ width: 1600, withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 88 }).toBuffer();
}

export interface Replica {
  brief: string;
  image: Buffer;
  seconds: number;
  usage: { brief: unknown; image: unknown };
}

export async function replicate(client: OpenAI, original: Buffer): Promise<Replica> {
  const started = Date.now();
  const read = await client.responses.create({
    model: "muse-spark-1.3",
    input: [
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: BRIEF_PROMPT },
          { type: "input_image", image_url: `data:image/jpeg;base64,${original.toString("base64")}` },
        ],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any,
  });
  const brief = read.output_text.trim();
  if (!brief) throw new Error("Muse Spark returned no brief.");
  const made = await client.responses.create({ model: "muse-image-1.0", input: imagePrompt(brief) });
  const call = made.output.find((item) => item.type === "image_generation_call") as { result?: string } | undefined;
  if (!call?.result) throw new Error("Muse Image returned no image.");
  return {
    brief,
    image: Buffer.from(call.result, "base64"),
    seconds: (Date.now() - started) / 1000,
    usage: { brief: read.usage, image: made.usage },
  };
}
