// Data model for auditing an AI judge of design. The AI is the one being audited; deterministic code does
// the auditing and writes the report, so the judge never grades its own results.
import type { Interval } from "./types.ts";

/** Rubric from Contra Labs' Human Creativity Benchmark (motion realism dropped: still images only). */
export const CRITERIA = ["visual", "brief", "originality", "utility"] as const;
export type Criterion = (typeof CRITERIA)[number];
export const SCALE = { min: 1, max: 5 } as const;

export interface Design {
  /** Short id such as "d1". */
  id: string;
  /** Fictional brand name from the source dataset. */
  brand: string;
  /** Brief shown to the judge alongside the design. */
  brief: string;
  file: string;
}

/** A presentation context: only the surroundings change, the design's pixels stay identical. */
export interface Context {
  id: string;
  name: string;
}

/** Two different designs compared head to head; each pair is shown in both orders. */
export interface Pair {
  id: string;
  a: string;
  b: string;
}

/** One standalone request to the judge. Calls run in a shuffled order with no shared conversation. */
export type Call =
  | { id: string; kind: "score"; designId: string; repeat: number }
  | { id: string; kind: "context"; designId: string; contextId: string }
  | { id: string; kind: "choose"; pairId: string; first: string; second: string };

export interface Result {
  callId: string;
  valid: boolean;
  scores?: Record<Criterion, number>;
  pick?: "first" | "second";
  /** Raw reply, kept when it could not be parsed. */
  raw?: string;
}

/** One designer's choice on one pair. Panelists are anonymous labels such as "P1". */
export interface PanelVote {
  panelist: string;
  pairId: string;
  /** Design id the panelist preferred. */
  pick: string;
}

export interface JudgeAudit {
  id: string;
  createdAt: string;
  judge: { model: string; promptVersion: string };
  /** True for development data from a simulated judge. Simulated results are never presented as findings. */
  simulated: boolean;
  /** Where the designs come from, with the attribution its license requires. */
  source: string;
  designs: Design[];
  contexts: Context[];
  pairs: Pair[];
  calls: Call[];
  results: Record<string, Result>;
  panel: PanelVote[];
}

export interface JudgeReport {
  judge: string;
  simulated: boolean;
  designs: number;
  calls: number;
  validCalls: number;
  /** Fewer than 30 designs: every number is indicative and shown with its range. */
  indicative: boolean;
  /** Same design judged again: how often a criterion score changed, and the mean spread in scale points. */
  selfConsistency: { changeRate: number; meanRange: number; perCriterion: Record<Criterion, number>; n: number } | null;
  /** Score in a presentation context minus the design's average score on its own, averaged over criteria. */
  presentation: {
    mean: number;
    absMean: number;
    interval: Interval;
    perContext: { contextId: string; name: string; mean: number; n: number }[];
    n: number;
  } | null;
  /** Pairs judged in both orders: how often the chosen design changed when only the order changed. */
  position: { pairs: number; flipped: number; flipRate: number; firstShare: number } | null;
  /** Agreement with the designer panel's majority, as in Contra Labs' Design Crit. */
  accuracy: { agreement: number; n: number; panelists: number; humanAgreement: number | null; tiedPairs: number } | null;
}
