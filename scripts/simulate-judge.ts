// Development only: fills an AI-judge audit with a simulated judge and panel so the report page can be built
// before any real model is called. Output goes to .data/judge/simulated.json (git-ignored) and is marked
// simulated, so it can never be shown as a finding.
// Run: node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/simulate-judge.ts
import { promises as fs } from "node:fs";
import path from "node:path";
import { CONTEXTS, makePairs, planCalls } from "../src/lib/judge-plan.ts";
import { PROMPT_VERSION } from "../src/lib/judge-prompt.ts";
import { CRITERIA, type Criterion, type Design, type JudgeAudit, type Result } from "../src/lib/judge-types.ts";
import { seeded, seedFrom } from "../src/lib/random.ts";

const rand = seeded(seedFrom("simulated-judge"));
const clamp = (x: number) => Math.min(5, Math.max(1, Math.round(x)));
const noise = () => (rand() - 0.5) * 1.6;

const designs: Design[] = Array.from({ length: 12 }, (_, i) => ({
  id: `d${i + 1}`,
  brand: `Simulated brand ${i + 1}`,
  brief: "Simulated brief.",
  file: `d${i + 1}.png`,
}));
const quality = new Map(designs.map((d) => [d.id, 2 + rand() * 2.5]));
const pairs = makePairs(designs.map((d) => d.id), "simulated");
const calls = planCalls(designs, CONTEXTS, pairs, "simulated");

const scores = (designId: string, lift: number) =>
  Object.fromEntries(CRITERIA.map((c) => [c, clamp(quality.get(designId)! + lift + noise())])) as Record<Criterion, number>;

const results: Record<string, Result> = {};
for (const call of calls) {
  if (rand() < 0.02) results[call.id] = { callId: call.id, valid: false, raw: "simulated unreadable reply" };
  else if (call.kind === "score") results[call.id] = { callId: call.id, valid: true, scores: scores(call.designId, 0) };
  else if (call.kind === "context") results[call.id] = { callId: call.id, valid: true, scores: scores(call.designId, 0.35) };
  else {
    const gap = quality.get(call.first)! - quality.get(call.second)!;
    const pFirst = 0.62 + gap * 0.1;
    results[call.id] = { callId: call.id, valid: true, pick: rand() < pFirst ? "first" : "second" };
  }
}

const panel = ["P1", "P2", "P3", "P4", "P5"].flatMap((panelist) =>
  pairs.map((p) => {
    const gap = quality.get(p.a)! - quality.get(p.b)!;
    return { panelist, pairId: p.id, pick: rand() < 0.5 + gap * 0.25 ? p.a : p.b };
  }),
);

const audit: JudgeAudit = {
  id: "simulated",
  createdAt: new Date().toISOString(),
  judge: { model: "Simulated judge", promptVersion: PROMPT_VERSION },
  simulated: true,
  source: "Simulated data for development. Not a result.",
  designs,
  contexts: CONTEXTS,
  pairs,
  calls,
  results,
  panel,
};

const out = path.join(process.cwd(), ".data", "judge", "simulated.json");
await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, JSON.stringify(audit, null, 2));
console.log(`Wrote ${out}: ${calls.length} calls, ${panel.length} panel votes (simulated).`);
