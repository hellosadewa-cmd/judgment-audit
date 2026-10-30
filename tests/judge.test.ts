// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { CONTEXTS, makePairs, planCalls } from "../src/lib/judge-plan.ts";
import { parsePick, parseScores } from "../src/lib/judge-prompt.ts";
import { buildJudgeReport } from "../src/lib/judge-stats.ts";
import { findings } from "../src/lib/judge-findings.ts";
import type { Criterion, Design, JudgeAudit, Result } from "../src/lib/judge-types.ts";

const design = (i: number): Design => ({ id: `d${i}`, brand: `Brand ${i}`, brief: "brief", file: `d${i}.jpg` });

test("a 12-design plan has 96 calls with unique ids, and every design sits in two pairs", () => {
  const designs = Array.from({ length: 12 }, (_, i) => design(i + 1));
  const pairs = makePairs(designs.map((d) => d.id), "audit");
  const calls = planCalls(designs, CONTEXTS, pairs, "audit");
  assert.equal(calls.length, 96);
  assert.equal(new Set(calls.map((c) => c.id)).size, 96);
  for (const d of designs) assert.equal(pairs.filter((p) => p.a === d.id || p.b === d.id).length, 2);
  assert.ok(pairs.every((p) => p.a !== p.b));
  assert.deepEqual(calls, planCalls(designs, CONTEXTS, pairs, "audit"));
});

test("replies are parsed strictly", () => {
  assert.deepEqual(parseScores('```json\n{"visual":3,"brief":4,"originality":2,"utility":5}\n```'), {
    visual: 3, brief: 4, originality: 2, utility: 5,
  });
  assert.equal(parseScores('{"visual":6,"brief":4,"originality":2,"utility":5}'), null);
  assert.equal(parseScores('{"visual":3,"brief":4,"originality":2}'), null);
  assert.equal(parseScores('{"visual":3.5,"brief":4,"originality":2,"utility":5}'), null);
  assert.equal(parsePick('Answer: {"pick":"second"}'), "second");
  assert.equal(parsePick('{"pick":"left"}'), null);
  assert.equal(parsePick("first"), null);
});

const all = (n: number): Record<Criterion, number> => ({ visual: n, brief: n, originality: n, utility: n });

function sampleAudit(): JudgeAudit {
  const designs = [1, 2, 3, 4].map(design);
  const contexts = [CONTEXTS[0]];
  const pairs = [
    { id: "p1", a: "d1", b: "d2" },
    { id: "p2", a: "d3", b: "d4" },
  ];
  const calls = planCalls(designs, contexts, pairs, "t");
  const results: Record<string, Result> = {};
  const set = (callId: string, r: Omit<Result, "callId" | "valid">) => (results[callId] = { callId, valid: true, ...r });
  for (const d of ["d1", "d2", "d3", "d4"]) {
    const base = d === "d1" || d === "d2" ? 3 : 2;
    for (const repeat of [0, 1, 2]) set(`s-${d}-${repeat}`, { scores: all(base) });
    set(`c-${d}-frame`, { scores: all(base + 1) });
  }
  set("s-d2-1", { scores: { ...all(3), visual: 4 } }); // the only change on a repeat
  set("k-p1-ab", { pick: "first" }); // d1
  set("k-p1-ba", { pick: "first" }); // d2: same position, different design → flipped
  set("k-p2-ab", { pick: "first" }); // d3
  set("k-p2-ba", { pick: "second" }); // d3 again → stable
  return {
    id: "t", createdAt: "", judge: { model: "Judge", promptVersion: "test" }, simulated: true, source: "test",
    designs, contexts, pairs, calls, results,
    panel: [
      { panelist: "P1", pairId: "p1", pick: "d1" },
      { panelist: "P2", pairId: "p1", pick: "d1" },
      { panelist: "P3", pairId: "p1", pick: "d2" },
      { panelist: "P1", pairId: "p2", pick: "d3" },
      { panelist: "P2", pairId: "p2", pick: "d4" },
      { panelist: "P3", pairId: "p2", pick: "d4" },
    ],
  };
}

test("report measures self-consistency, presentation shift, position flips, and panel agreement", () => {
  const r = buildJudgeReport(sampleAudit());
  assert.equal(r.validCalls, r.calls);
  assert.equal(r.selfConsistency!.n, 16);
  assert.equal(r.selfConsistency!.changeRate, 1 / 16);
  assert.equal(r.selfConsistency!.perCriterion.visual, 1 / 4);
  // d2's own average on visual is 10/3, so its frame shift is (2/3 + 1 + 1 + 1) / 4; the others shift by 1.
  assert.ok(Math.abs(r.presentation!.mean - (3 + 11 / 12) / 4) < 1e-9);
  assert.ok(r.presentation!.interval.low > 0);
  assert.deepEqual(r.position, { pairs: 2, flipped: 1, flipRate: 0.5, firstShare: 0.75 });
  // Majorities: p1 → d1, p2 → d4. The judge matched once (d1 on p1) out of four picks.
  assert.equal(r.accuracy!.agreement, 0.25);
  assert.equal(r.accuracy!.panelists, 3);
  assert.equal(r.accuracy!.humanAgreement, 0); // only two leave-one-out comparisons are not ties, both disagree
});

test("findings come from fixed templates and lead with the order effect", () => {
  const f = findings(buildJudgeReport(sampleAudit()));
  assert.match(f.headline, /Swap the order/);
  assert.equal(f.advice.length, 3);
  assert.match(f.advice[0], /both orders/);
  assert.equal(f.lines.length, 4);
});

test("unreadable replies are counted and left out", () => {
  const audit = sampleAudit();
  audit.results["k-p2-ba"] = { callId: "k-p2-ba", valid: false, raw: "I prefer the left one." };
  const r = buildJudgeReport(audit);
  assert.equal(r.validCalls, r.calls - 1);
  assert.deepEqual(r.position, { pairs: 1, flipped: 1, flipRate: 1, firstShare: 1 });
  assert.match(findings(r).lines.at(-1)!, /could not be read/);
});

test("a composite keeps the design's pixels exactly, and a touched design fails the check", async () => {
  const { default: sharp } = await import("sharp");
  const { compositeDesign, designIntact } = await import("../src/lib/composite.ts");
  const scene = await sharp({ create: { width: 400, height: 300, channels: 3, background: "#203040" } }).png().toBuffer();
  const raw = Buffer.alloc(120 * 80 * 3);
  for (let i = 0; i < raw.length; i++) raw[i] = (i * 37) % 251;
  const design = await sharp(raw, { raw: { width: 120, height: 80, channels: 3 } }).png().toBuffer();
  const box = { left: 100, top: 60, width: 180, height: 120 };
  const composite = await compositeDesign(scene, design, box);
  assert.deepEqual(await designIntact(composite, design, box), { intact: true, changedShare: 0 });
  const touched = await sharp(composite).composite([{ input: Buffer.from([255, 0, 0]), raw: { width: 1, height: 1, channels: 3 }, left: 150, top: 100 }]).png().toBuffer();
  assert.equal((await designIntact(touched, design, box)).intact, false);
  await assert.rejects(compositeDesign(scene, design, { ...box, left: 300 }));
});

test("panel votes are checked against the frozen pairs and relabelled anonymously", async () => {
  const { promises: fs } = await import("node:fs");
  const path = await import("node:path");
  const os = await import("node:os");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "panel-"));
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;
    const { auditSet, checkVote, saveVote, listVotes } = await import("../src/lib/panel.ts");
    const pair = auditSet.pairs[0];
    const a = "11111111-1111-4111-8111-111111111111";
    const b = "22222222-2222-4222-8222-222222222222";
    assert.equal(checkVote({ panelist: a, pairId: pair.id, pick: pair.a }), null);
    assert.match(checkVote({ panelist: "Budi", pairId: pair.id, pick: pair.a })!, /panelist/);
    assert.match(checkVote({ panelist: a, pairId: "p99", pick: pair.a })!, /pair/);
    assert.match(checkVote({ panelist: a, pairId: pair.id, pick: "d99" })!, /Pick one/);
    await saveVote({ panelist: b, pairId: pair.id, pick: pair.b });
    await saveVote({ panelist: a, pairId: pair.id, pick: pair.b });
    await saveVote({ panelist: a, pairId: pair.id, pick: pair.a }); // replaces the previous vote
    assert.deepEqual(await listVotes(), [
      { panelist: "P1", pairId: pair.id, pick: pair.b },
      { panelist: "P2", pairId: pair.id, pick: pair.a },
    ]);
  } finally {
    process.chdir(cwd);
    await fs.rm(dir, { recursive: true, force: true });
  }
});
