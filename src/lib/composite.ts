// Presentation contexts with a pixel guarantee. A generated scene (Muse Image) supplies the surroundings; the
// box where the design sits comes from SAM 3.1. The design's own pixels are pasted back into that box, and
// code then checks them, so the judge sees an identical design in every setting.
import sharp from "sharp";

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The design exactly as it appears inside the box: resized once, the same way for every check. */
export function fitted(design: Buffer, box: Box): Promise<Buffer> {
  return sharp(design).resize(box.width, box.height, { fit: "fill" }).removeAlpha().raw().toBuffer();
}

/** Pastes the design into the scene's box and returns a lossless PNG. */
export async function compositeDesign(scene: Buffer, design: Buffer, box: Box): Promise<Buffer> {
  const meta = await sharp(scene).metadata();
  if (!meta.width || !meta.height) throw new Error("Scene has no size.");
  if (box.left < 0 || box.top < 0 || box.left + box.width > meta.width || box.top + box.height > meta.height)
    throw new Error("Design box falls outside the scene.");
  const pixels = await fitted(design, box);
  const patch = await sharp(pixels, { raw: { width: box.width, height: box.height, channels: 3 } }).png().toBuffer();
  return sharp(scene).removeAlpha().composite([{ input: patch, left: box.left, top: box.top }]).png().toBuffer();
}

/** Compares the box in a composite with the fitted design, channel by channel. */
export async function designIntact(composite: Buffer, design: Buffer, box: Box): Promise<{ intact: boolean; changedShare: number }> {
  const expected = await fitted(design, box);
  const actual = await sharp(composite).removeAlpha().extract(box).raw().toBuffer();
  if (actual.length !== expected.length) return { intact: false, changedShare: 1 };
  let changed = 0;
  for (let i = 0; i < expected.length; i++) if (actual[i] !== expected[i]) changed++;
  return { intact: changed === 0, changedShare: changed / expected.length };
}
