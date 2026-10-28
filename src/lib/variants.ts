// Controlled variants: the design stays pixel-identical, only an irrelevant presentation detail changes.
// This module holds the deterministic fallback; the Meta pipeline (SAM 3.1 + Muse Image + Muse Spark check)
// plugs in through the same VariantMaker signature.
import sharp from "sharp";

export interface Variant {
  data: Buffer;
  /** Human-readable description of the change, kept for the report and never shown to reviewers. */
  change: string;
}

export type VariantMaker = (original: Buffer, index: number) => Promise<Variant>;

const BACKGROUNDS = [
  { name: "warm grey", color: "#d9d4cc" },
  { name: "deep navy", color: "#1f2a44" },
  { name: "soft green", color: "#cfe3d4" },
];

/**
 * Places the untouched design on a different presentation background, the way a mockup or slide would.
 * The design's own pixels are copied unchanged, so any score difference comes from the context alone.
 */
export const backgroundVariant: VariantMaker = async (original, index) => {
  const bg = BACKGROUNDS[index % BACKGROUNDS.length];
  const meta = await sharp(original).metadata();
  const width = meta.width ?? 1200;
  const margin = Math.round(width * 0.08);
  const data = await sharp(original)
    .extend({ top: margin, bottom: margin, left: margin, right: margin, background: bg.color })
    .png()
    .toBuffer();
  return { data, change: `presentation background: ${bg.name}` };
};

/** Originals and repeats get a neutral frame of the same size, so variants don't stand out by framing alone. */
export async function neutralFrame(original: Buffer): Promise<Buffer> {
  const meta = await sharp(original).metadata();
  const margin = Math.round((meta.width ?? 1200) * 0.08);
  return sharp(original)
    .extend({ top: margin, bottom: margin, left: margin, right: margin, background: "#f4f4f2" })
    .png()
    .toBuffer();
}
