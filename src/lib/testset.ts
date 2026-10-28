// Builds the audit's test set and each reviewer's presentation order.
import type { TestItem, Work } from "./types.ts";
import { seeded, seedFrom, shuffle } from "./random.ts";

/** A repeat or variant must be at least this many positions away from its original. */
export const MIN_GAP = 4;

export interface Plan {
  repeats: string[];
  variants: string[];
}

/**
 * Chooses which works get an exact repeat and which get a controlled variant.
 * The two groups never overlap, so self-consistency and irrelevant-detail effects stay separate.
 */
export function planTestSet(works: Work[], seed: string): Plan {
  if (works.length < 4) throw new Error("An audit needs at least 4 works.");
  const count = Math.min(3, Math.floor(works.length / 2));
  const picked = shuffle(works.map((w) => w.id), seeded(seedFrom(seed)));
  return { repeats: picked.slice(0, count), variants: picked.slice(count, count * 2) };
}

export function originalItems(works: Work[]): TestItem[] {
  return works.map((w) => ({ id: `o-${w.id}`, kind: "original", workId: w.id, file: w.file }));
}

export function repeatItems(works: Work[], plan: Plan): TestItem[] {
  return works
    .filter((w) => plan.repeats.includes(w.id))
    .map((w) => ({ id: `r-${w.id}`, kind: "repeat", workId: w.id, file: w.file }));
}

function worstGap(order: TestItem[]): number {
  const position = new Map<string, number>();
  order.forEach((item, i) => {
    if (item.kind === "original") position.set(item.workId, i);
  });
  let worst = Infinity;
  order.forEach((item, i) => {
    if (item.kind !== "original") worst = Math.min(worst, Math.abs(i - (position.get(item.workId) ?? i)));
  });
  return worst;
}

/**
 * Random order for one reviewer, keeping every repeat and variant at least MIN_GAP items from its
 * original so reviewers are less likely to notice the duplicate. Falls back to the best order found.
 */
export function sessionOrder(items: TestItem[], sessionId: string, attempts = 2000): string[] {
  const rand = seeded(seedFrom(sessionId));
  let best = items;
  let bestGap = -1;
  for (let i = 0; i < attempts; i++) {
    const candidate = shuffle(items, rand);
    const gap = worstGap(candidate);
    if (gap > bestGap) {
      best = candidate;
      bestGap = gap;
    }
    if (gap >= MIN_GAP) break;
  }
  return best.map((item) => item.id);
}
