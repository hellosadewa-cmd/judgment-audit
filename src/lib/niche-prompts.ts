// Prompts for the AI replication test. Muse Spark plays a client describing the work; Muse Image makes it from
// that description alone. Bump PROMPT_VERSION when either changes, so results from different prompts are not mixed.
export const PROMPT_VERSION = "2026-11-02.1";

export const BRIEF_PROMPT = [
  "You are a client who wants a design exactly like the one in this image.",
  "Write the brief you would give an AI image generator so that it produces this design:",
  "what kind of page or asset it is, the industry and product, the layout and sections from top to bottom,",
  "the visual style, the colour palette with hex codes, the typography, the imagery, and the headline text.",
  "Do not mention any studio, designer, or website where the image came from. At most 150 words.",
  "Reply with the brief only.",
].join(" ");

export function imagePrompt(brief: string): string {
  return `Create a polished, high-fidelity design presentation shot, landscape 4:3, as it would appear in a design studio's portfolio. Follow this brief:\n\n${brief}`;
}
