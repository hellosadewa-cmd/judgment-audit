// Run with: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { icc21, median, relativeDifference, bootstrapMean, buildReport } from "../src/lib/stats.ts";
import { planTestSet, originalItems, repeatItems, sessionOrder, MIN_GAP } from "../src/lib/testset.ts";
import type { Audit, TestItem } from "../src/lib/types.ts";

test("relative difference matches the insurance-audit definition", () => {
  assert.equal(relativeDifference(8, 4), 4 / 6);
  assert.equal(relativeDifference(5, 5), 0);
});

test("ICC(2,1) reproduces Shrout & Fleiss (1979) table 2: 0.29", () => {
  const data = [
    [9, 2, 5, 8],
    [6, 1, 3, 2],
    [8, 4, 6, 8],
    [7, 1, 2, 6],
    [10, 5, 6, 9],
    [6, 2, 4, 7],
  ];
  assert.equal(Math.round(icc21(data)! * 100) / 100, 0.29);
});

test("bootstrap interval contains the mean and is reproducible", () => {
  const xs = [1, 2, 0, -1, 3, 2, 1];
  const a = bootstrapMean(xs, "seed");
  assert.ok(a.low <= 8 / 7 && a.high >= 8 / 7);
  assert.deepEqual(a, bootstrapMean(xs, "seed"));
});

test("test set keeps repeats and variants apart and spaced from originals", () => {
  const works = Array.from({ length: 8 }, (_, i) => ({ id: `w${i}`, file: `${i}.png` }));
  const plan = planTestSet(works, "audit-1");
  assert.equal(plan.repeats.length, 3);
  assert.equal(plan.variants.filter((v) => plan.repeats.includes(v)).length, 0);
  const variants: TestItem[] = plan.variants.map((id) => ({ id: `v-${id}`, kind: "variant", workId: id, file: "v.png" }));
  const items = [...originalItems(works), ...repeatItems(works, plan), ...variants];
  const order = sessionOrder(items, "session-1");
  assert.equal(order.length, 14);
  for (const item of items.filter((i) => i.kind !== "original")) {
    const gap = Math.abs(order.indexOf(item.id) - order.indexOf(`o-${item.workId}`));
    assert.ok(gap >= MIN_GAP, `${item.id} only ${gap} from its original`);
  }
});

test("report measures noise, self-inconsistency, and irrelevant shift", () => {
  const works = [0, 1, 2, 3].map((i) => ({ id: `w${i}`, file: `${i}.png` }));
  const items: TestItem[] = [
    ...originalItems(works),
    { id: "r-w0", kind: "repeat", workId: "w0", file: "0.png" },
    { id: "v-w1", kind: "variant", workId: "w1", file: "v.png" },
  ];
  const session = (label: string, scores: number[], guess: number) => ({
    id: label, label, guess, order: [], startedAt: "", finishedAt: "x",
    ratings: Object.fromEntries(items.map((it, i) => [it.id, scores[i]])),
  });
  const audit: Audit = {
    id: "a", createdAt: "", title: "", question: "", scale: { min: 1, max: 10 }, adminToken: "",
    works, items,
    // order of scores: o-w0 o-w1 o-w2 o-w3 r-w0 v-w1
    sessions: [session("R1", [8, 6, 4, 7, 6, 7], 10), session("R2", [4, 6, 4, 7, 4, 8], 20)],
  };
  const r = buildReport(audit);
  assert.equal(r.completeReviewers, 2);
  assert.equal(r.indicative, true);
  assert.equal(r.selfInconsistency, 1); // R1 changed 8 → 6, R2 stayed at 4
  assert.equal(r.selfChangeRate, 0.5);
  assert.equal(r.irrelevantShift!.mean, 1.5); // +1 and +2
  assert.equal(median([4 / 6, 0, 0, 0]), 0);
  assert.equal(r.guessedNoise, 0.15);
});
