// The niche verdict. Rules were fixed before any curator voted (decision K29), so the result cannot be tuned
// after the fact. Criteria come from "Bertahan di Pasar Aset Digital" (Q15): niches where AI is still weak.

export const CRITERIA = [
  { id: "recurring", label: "Buyers have a recurring budget", detail: "They pay again every month or project, not once." },
  { id: "consistency", label: "The work must stay consistent across many assets", detail: "A whole system, not one image. AI is still weak here." },
  { id: "standards", label: "There is a standard, regulation, or fixed format to follow", detail: "Accreditation, compliance, a curriculum, a brand book." },
  { id: "local", label: "It depends on local language or context", detail: "Context that is thin in the data AI models learn from." },
] as const;
export type CriterionId = (typeof CRITERIA)[number]["id"];

/** A work counts as replicated when more curators accept the AI version than reject it. */
export const REPLICATED_AT = 0.5;
/** A niche is strong when it meets at least this many of the four criteria. */
export const STRONG_AT = 2;

export interface Vote {
  curator: string;
  workId: string;
  acceptable: boolean;
}

export interface Replication {
  /** Works with a curator majority either way; ties are left out. */
  decided: number;
  replicated: number;
  /** Share of decided works whose AI version curators would send to the same client. */
  rate: number | null;
  curators: number;
  perWork: { workId: string; yes: number; no: number }[];
}

export function replication(workIds: string[], votes: Vote[]): Replication {
  const perWork = workIds.map((workId) => {
    const mine = votes.filter((v) => v.workId === workId);
    return { workId, yes: mine.filter((v) => v.acceptable).length, no: mine.filter((v) => !v.acceptable).length };
  });
  const decided = perWork.filter((w) => w.yes !== w.no);
  const replicated = decided.filter((w) => w.yes > w.no).length;
  return {
    decided: decided.length,
    replicated,
    rate: decided.length ? replicated / decided.length : null,
    curators: new Set(votes.map((v) => v.curator)).size,
    perWork,
  };
}

export type VerdictId = "move-up" | "leave" | "build" | "test-demand";

export const VERDICTS: Record<VerdictId, { title: string; advice: string }> = {
  "move-up": {
    title: "Move up to selling systems",
    advice: "AI can already make single pieces, but buyers still need consistency, standards, or local fit. Stop selling files; sell the system around them, curated by people.",
  },
  leave: {
    title: "Leave this niche as a main product",
    advice: "AI can already make this work from a brief, and nothing in the market protects it. If a client can get it in ten minutes, it will not pay a studio for long.",
  },
  build: {
    title: "Keep it and build on it, with AI as the tool",
    advice: "AI cannot yet make this work to a client's standard, and the niche has protection. Use AI to produce faster; keep people in charge of what ships.",
  },
  "test-demand": {
    title: "The edge is real; test the demand first",
    advice: "AI cannot make this yet, but the niche meets few of the criteria for lasting demand. Check that buyers will pay again before investing.",
  },
};

export function verdict(rate: number, criteriaMet: number): VerdictId {
  const replicable = rate >= REPLICATED_AT;
  const strong = criteriaMet >= STRONG_AT;
  if (replicable) return strong ? "move-up" : "leave";
  return strong ? "build" : "test-demand";
}
