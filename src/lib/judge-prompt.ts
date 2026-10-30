// Prompts sent to the judge and strict parsing of its replies. A reply that does not parse is recorded as
// invalid, never guessed at.
import { CRITERIA, SCALE, type Criterion } from "./judge-types.ts";

/** Bump whenever a prompt changes, so results from different prompts are never mixed. */
export const PROMPT_VERSION = "2026-10-30.1";

export function scorePrompt(brief: string): string {
  return [
    "You are judging an advertising design against its brief.",
    `Rate the design on four criteria, each a whole number from ${SCALE.min} (poor) to ${SCALE.max} (excellent):`,
    "- visual: visual quality and aesthetics",
    "- brief: fidelity to the brief",
    "- originality: originality and creativity",
    "- utility: ready for real-world use",
    "Judge only the design itself. Ignore anything around it, such as a frame, a device, or a wall.",
    'Reply with JSON only, for example {"visual":3,"brief":4,"originality":2,"utility":3}.',
    "",
    "Brief:",
    brief,
  ].join("\n");
}

export const CHOOSE_PROMPT = [
  "Two advertising designs follow: the first image, then the second image.",
  "Which design has the stronger visual quality and aesthetics?",
  'Reply with JSON only: {"pick":"first"} or {"pick":"second"}.',
].join("\n");

function firstJsonObject(raw: string): unknown {
  const match = raw.match(/\{[^{}]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export function parseScores(raw: string): Record<Criterion, number> | null {
  const value = firstJsonObject(raw) as Record<string, unknown> | null;
  if (!value) return null;
  const scores = {} as Record<Criterion, number>;
  for (const c of CRITERIA) {
    const n = value[c];
    if (typeof n !== "number" || !Number.isInteger(n) || n < SCALE.min || n > SCALE.max) return null;
    scores[c] = n;
  }
  return scores;
}

export function parsePick(raw: string): "first" | "second" | null {
  const value = firstJsonObject(raw) as Record<string, unknown> | null;
  const pick = value?.pick;
  return pick === "first" || pick === "second" ? pick : null;
}
