// Core data model for a judgment audit.

/** original = the work as submitted; repeat = an exact second showing; variant = only an irrelevant detail changed. */
export type ItemKind = "original" | "repeat" | "variant";

export interface Work {
  id: string;
  /** File name of the original image inside the audit's storage folder. */
  file: string;
}

export interface TestItem {
  id: string;
  kind: ItemKind;
  workId: string;
  file: string;
  /** For variants: what was changed, e.g. "background: warm grey". Never shown to reviewers. */
  change?: string;
}

export interface Session {
  id: string;
  /** Anonymous label such as "R1". Reviewer names are never stored. */
  label: string;
  /** Reviewer's guess, before rating, of the typical % difference between two reviewers. */
  guess: number | null;
  order: string[];
  ratings: Record<string, number>;
  startedAt: string;
  finishedAt: string | null;
}

export interface Audit {
  id: string;
  createdAt: string;
  title: string;
  question: string;
  scale: { min: number; max: number };
  works: Work[];
  items: TestItem[];
  sessions: Session[];
  /** Secret that unlocks the team report. */
  adminToken: string;
}

export interface Interval {
  low: number;
  high: number;
}

export interface Report {
  reviewers: number;
  completeReviewers: number;
  /** True when there are fewer than five complete reviewers: numbers are indicative only. */
  indicative: boolean;
  /** Median relative difference between two reviewers on the same original, 0–1 (the insurance-audit measure). */
  noiseIndex: number | null;
  /** Median of reviewers' guesses, 0–1. */
  guessedNoise: number | null;
  /** Mean |first score − repeat score| per reviewer, averaged over the team, in scale points. */
  selfInconsistency: number | null;
  /** Share of repeat pairs where the score changed at all, 0–1. */
  selfChangeRate: number | null;
  /** Mean (variant score − original score), in scale points, with a bootstrap 95% interval. */
  irrelevantShift: { mean: number; absMean: number; interval: Interval } | null;
  /** ICC(2,1) on originals (Shrout & Fleiss), or null if it cannot be computed. */
  icc: number | null;
  perWork: { workId: string; mean: number; min: number; max: number; n: number }[];
}
