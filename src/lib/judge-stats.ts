// Deterministic statistics for the AI-judge audit. The judge being audited never computes or explains these.
import { CRITERIA, type Criterion, type JudgeAudit, type JudgeReport, type Result } from "./judge-types.ts";
import { bootstrapMean, mean } from "./stats.ts";

const validScores = (r: Result | undefined) => (r?.valid && r.scores ? r.scores : null);

/** Strict majority of picks, or null on a tie. */
function majority(picks: string[]): string | null {
  const counts = new Map<string, number>();
  for (const p of picks) counts.set(p, (counts.get(p) ?? 0) + 1);
  for (const [pick, n] of counts) if (n * 2 > picks.length) return pick;
  return null;
}

export function buildJudgeReport(audit: JudgeAudit): JudgeReport {
  const result = (id: string) => audit.results[id];
  const validCalls = audit.calls.filter((c) => result(c.id)?.valid).length;

  // Self-consistency: the same design, judged again on its own.
  const ranges: number[] = [];
  const perCriterion = Object.fromEntries(CRITERIA.map((c) => [c, [] as number[]])) as Record<Criterion, number[]>;
  const baseline = new Map<string, Record<Criterion, number>>();
  for (const d of audit.designs) {
    const runs = audit.calls
      .filter((c) => c.kind === "score" && c.designId === d.id)
      .map((c) => validScores(result(c.id)))
      .filter((s): s is Record<Criterion, number> => s !== null);
    if (!runs.length) continue;
    baseline.set(d.id, Object.fromEntries(CRITERIA.map((c) => [c, mean(runs.map((r) => r[c]))])) as Record<Criterion, number>);
    if (runs.length < 2) continue;
    for (const c of CRITERIA) {
      const values = runs.map((r) => r[c]);
      const range = Math.max(...values) - Math.min(...values);
      ranges.push(range);
      perCriterion[c].push(range);
    }
  }

  // Presentation: the same pixels in a different setting, against the design's own average.
  const shifts: number[] = [];
  const byContext = new Map<string, number[]>();
  for (const call of audit.calls) {
    if (call.kind !== "context") continue;
    const scores = validScores(result(call.id));
    const base = baseline.get(call.designId);
    if (!scores || !base) continue;
    const shift = mean(CRITERIA.map((c) => scores[c] - base[c]));
    shifts.push(shift);
    byContext.set(call.contextId, [...(byContext.get(call.contextId) ?? []), shift]);
  }

  // Position: each pair in both orders. Picking the same position both times means the chosen design flipped.
  let pairs = 0;
  let flipped = 0;
  let firstPicks = 0;
  let validChoices = 0;
  const judgePicks: { pairId: string; design: string }[] = [];
  for (const pair of audit.pairs) {
    const designs: string[] = [];
    for (const call of audit.calls) {
      if (call.kind !== "choose" || call.pairId !== pair.id) continue;
      const r = result(call.id);
      if (!r?.valid || !r.pick) continue;
      validChoices++;
      if (r.pick === "first") firstPicks++;
      const design = r.pick === "first" ? call.first : call.second;
      designs.push(design);
      judgePicks.push({ pairId: pair.id, design });
    }
    if (designs.length === 2) {
      pairs++;
      if (designs[0] !== designs[1]) flipped++;
    }
  }

  // Accuracy against the designer panel's majority; humans scored the same way against the other panelists.
  let accuracy: JudgeReport["accuracy"] = null;
  if (audit.panel.length) {
    let agree = 0;
    let n = 0;
    let tiedPairs = 0;
    const human: number[] = [];
    for (const pair of audit.pairs) {
      const votes = audit.panel.filter((v) => v.pairId === pair.id);
      if (!votes.length) continue;
      const verdict = majority(votes.map((v) => v.pick));
      if (verdict === null) tiedPairs++;
      else
        for (const p of judgePicks.filter((j) => j.pairId === pair.id)) {
          n++;
          if (p.design === verdict) agree++;
        }
      votes.forEach((vote, i) => {
        const others = majority(votes.filter((_, j) => j !== i).map((v) => v.pick));
        if (others !== null) human.push(vote.pick === others ? 1 : 0);
      });
    }
    accuracy = {
      agreement: n ? agree / n : 0,
      n,
      panelists: new Set(audit.panel.map((v) => v.panelist)).size,
      humanAgreement: human.length ? mean(human) : null,
      tiedPairs,
    };
    if (!n) accuracy = null;
  }

  return {
    judge: audit.judge.model,
    simulated: audit.simulated,
    designs: audit.designs.length,
    calls: audit.calls.length,
    validCalls,
    indicative: audit.designs.length < 30,
    selfConsistency: ranges.length
      ? {
          changeRate: ranges.filter((r) => r > 0).length / ranges.length,
          meanRange: mean(ranges),
          perCriterion: Object.fromEntries(CRITERIA.map((c) => [c, perCriterion[c].length ? mean(perCriterion[c]) : 0])) as Record<Criterion, number>,
          n: ranges.length,
        }
      : null,
    presentation: shifts.length
      ? {
          mean: mean(shifts),
          absMean: mean(shifts.map(Math.abs)),
          interval: bootstrapMean(shifts, audit.id),
          perContext: audit.contexts
            .filter((c) => byContext.has(c.id))
            .map((c) => ({ contextId: c.id, name: c.name, mean: mean(byContext.get(c.id)!), n: byContext.get(c.id)!.length })),
          n: shifts.length,
        }
      : null,
    position: pairs ? { pairs, flipped, flipRate: flipped / pairs, firstShare: firstPicks / validChoices } : null,
    accuracy,
  };
}
