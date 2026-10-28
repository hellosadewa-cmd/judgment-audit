// Deterministic statistics for the team report. The language model never computes these numbers.
import type { Audit, Interval, Report, Session } from "./types.ts";
import { seeded, seedFrom } from "./random.ts";

export function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** |a − b| relative to their average, as in the insurance noise audit. */
export function relativeDifference(a: number, b: number): number {
  const avg = (a + b) / 2;
  return avg === 0 ? 0 : Math.abs(a - b) / avg;
}

/** Percentile bootstrap interval for the mean. */
export function bootstrapMean(xs: number[], seed: string, resamples = 2000, level = 0.95): Interval {
  const rand = seeded(seedFrom(seed));
  const means: number[] = [];
  for (let r = 0; r < resamples; r++) {
    let sum = 0;
    for (let i = 0; i < xs.length; i++) sum += xs[Math.floor(rand() * xs.length)];
    means.push(sum / xs.length);
  }
  means.sort((a, b) => a - b);
  const tail = (1 - level) / 2;
  return { low: means[Math.floor(tail * resamples)], high: means[Math.ceil((1 - tail) * resamples) - 1] };
}

/**
 * ICC(2,1): two-way random effects, absolute agreement, single rater (Shrout & Fleiss, 1979).
 * `matrix[target][rater]`; needs at least 2 targets and 2 raters with complete data.
 */
export function icc21(matrix: number[][]): number | null {
  const n = matrix.length;
  const k = n ? matrix[0].length : 0;
  if (n < 2 || k < 2) return null;
  const grand = mean(matrix.flat());
  const rowMeans = matrix.map(mean);
  const colMeans = Array.from({ length: k }, (_, j) => mean(matrix.map((row) => row[j])));
  const ssRows = k * rowMeans.reduce((s, m) => s + (m - grand) ** 2, 0);
  const ssCols = n * colMeans.reduce((s, m) => s + (m - grand) ** 2, 0);
  const ssTotal = matrix.flat().reduce((s, x) => s + (x - grand) ** 2, 0);
  const msr = ssRows / (n - 1);
  const msc = ssCols / (k - 1);
  const mse = (ssTotal - ssRows - ssCols) / ((n - 1) * (k - 1));
  const denominator = msr + (k - 1) * mse + (k * (msc - mse)) / n;
  return denominator === 0 ? null : (msr - mse) / denominator;
}

function isComplete(audit: Audit, s: Session): boolean {
  return s.finishedAt !== null && audit.items.every((item) => typeof s.ratings[item.id] === "number");
}

export function buildReport(audit: Audit): Report {
  const complete = audit.sessions.filter((s) => isComplete(audit, s));
  const byKind = (kind: string, workId: string) => audit.items.find((i) => i.kind === kind && i.workId === workId);

  // Noise between reviewers on originals.
  const pairDiffs: number[] = [];
  for (const work of audit.works) {
    const item = byKind("original", work.id)!;
    const scores = complete.map((s) => s.ratings[item.id]);
    for (let i = 0; i < scores.length; i++)
      for (let j = i + 1; j < scores.length; j++) pairDiffs.push(relativeDifference(scores[i], scores[j]));
  }

  // Each reviewer against themselves on exact repeats.
  const selfGaps: number[] = [];
  let changed = 0;
  let repeatPairs = 0;
  const reviewerMeans: number[] = [];
  for (const s of complete) {
    const gaps: number[] = [];
    for (const item of audit.items.filter((i) => i.kind === "repeat")) {
      const gap = Math.abs(s.ratings[byKind("original", item.workId)!.id] - s.ratings[item.id]);
      gaps.push(gap);
      repeatPairs++;
      if (gap > 0) changed++;
    }
    if (gaps.length) reviewerMeans.push(mean(gaps));
    selfGaps.push(...gaps);
  }

  // Shift caused by an irrelevant change.
  const shifts: number[] = [];
  for (const s of complete)
    for (const item of audit.items.filter((i) => i.kind === "variant"))
      shifts.push(s.ratings[item.id] - s.ratings[byKind("original", item.workId)!.id]);

  const matrix = audit.works.map((w) => complete.map((s) => s.ratings[byKind("original", w.id)!.id]));
  const guesses = complete.map((s) => s.guess).filter((g): g is number => typeof g === "number");

  return {
    reviewers: audit.sessions.length,
    completeReviewers: complete.length,
    indicative: complete.length < 5,
    noiseIndex: pairDiffs.length ? median(pairDiffs) : null,
    guessedNoise: guesses.length ? median(guesses) / 100 : null,
    selfInconsistency: reviewerMeans.length ? mean(reviewerMeans) : null,
    selfChangeRate: repeatPairs ? changed / repeatPairs : null,
    irrelevantShift: shifts.length
      ? { mean: mean(shifts), absMean: mean(shifts.map(Math.abs)), interval: bootstrapMean(shifts, audit.id) }
      : null,
    icc: complete.length >= 2 ? icc21(matrix) : null,
    perWork: audit.works.map((w) => {
      const scores = complete.map((s) => s.ratings[byKind("original", w.id)!.id]);
      return scores.length
        ? { workId: w.id, mean: mean(scores), min: Math.min(...scores), max: Math.max(...scores), n: scores.length }
        : { workId: w.id, mean: 0, min: 0, max: 0, n: 0 };
    }),
  };
}
