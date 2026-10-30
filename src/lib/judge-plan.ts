// Builds the call plan for auditing an AI judge: repeats, presentation contexts, and pairs in both orders.
import type { Call, Context, Design, Pair } from "./judge-types.ts";
import { seeded, seedFrom, shuffle } from "./random.ts";

/** Each design on its own is judged this many times. */
export const REPEATS = 3;

export const CONTEXTS: Context[] = [
  { id: "frame", name: "framed print on a wall" },
  { id: "screen", name: "laptop screen" },
  { id: "billboard", name: "street billboard" },
];

/**
 * Pairs every design with two others in a seeded cycle, so each design appears in exactly two pairs and
 * no pair repeats. Needs at least 4 designs.
 */
export function makePairs(designIds: string[], seed: string): Pair[] {
  if (designIds.length < 4) throw new Error("Pairing needs at least 4 designs.");
  const ring = shuffle(designIds, seeded(seedFrom(`${seed}:pairs`)));
  return ring.map((a, i) => ({ id: `p${i + 1}`, a, b: ring[(i + 1) % ring.length] }));
}

export function planCalls(designs: Design[], contexts: Context[], pairs: Pair[], seed: string): Call[] {
  const calls: Call[] = [];
  for (const d of designs) {
    for (let repeat = 0; repeat < REPEATS; repeat++) calls.push({ id: `s-${d.id}-${repeat}`, kind: "score", designId: d.id, repeat });
    for (const c of contexts) calls.push({ id: `c-${d.id}-${c.id}`, kind: "context", designId: d.id, contextId: c.id });
  }
  for (const p of pairs) {
    calls.push({ id: `k-${p.id}-ab`, kind: "choose", pairId: p.id, first: p.a, second: p.b });
    calls.push({ id: `k-${p.id}-ba`, kind: "choose", pairId: p.id, first: p.b, second: p.a });
  }
  // A shuffled order keeps repeats of the same design apart and spreads any drift in the judge over all kinds.
  return shuffle(calls, seeded(seedFrom(`${seed}:calls`)));
}
