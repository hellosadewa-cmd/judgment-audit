"use client";

// The four niche criteria as a checklist, and the verdict they give together with the replication rate.
import { useState } from "react";
import { CRITERIA, REPLICATED_AT, STRONG_AT, VERDICTS, verdict, type CriterionId } from "@/lib/niche";

/** A studio's own answers, fixed in advance; the checklist then shows them read-only with the reason for each. */
export interface LockedAnswers {
  lockedAt: string;
  note: string;
  answers: Record<CriterionId, { met: boolean; reason: string }>;
}

export function Verdict({ rate, note, locked }: { rate: number | null; note?: string; locked?: LockedAnswers }) {
  const [met, setMet] = useState<Set<CriterionId>>(
    () => new Set(locked ? CRITERIA.filter((c) => locked.answers[c.id].met).map((c) => c.id) : []),
  );
  const toggle = (id: CriterionId) =>
    setMet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const result = rate === null ? null : VERDICTS[verdict(rate, met.size)];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-line bg-white p-6">
        <p className="font-medium">
          {locked ? `The studio's answers, locked on ${locked.lockedAt}` : "Does your niche meet these? Tick what applies."}
        </p>
        <ul className="mt-4 space-y-3">
          {CRITERIA.map((c) => (
            <li key={c.id}>
              <label className={`flex gap-3 ${locked ? "" : "cursor-pointer"}`}>
                <input
                  type="checkbox"
                  checked={met.has(c.id)}
                  disabled={Boolean(locked)}
                  onChange={() => toggle(c.id)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  <span className="font-medium">
                    {c.label}
                    {locked && <span className="text-muted">: {locked.answers[c.id].met ? "yes" : "no"}</span>}
                  </span>
                  <span className="block text-sm text-muted">{locked ? locked.answers[c.id].reason : c.detail}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted">
          {locked && `${locked.note} `}Criteria from &ldquo;Bertahan di Pasar Aset Digital&rdquo; (2026), Q15. Strong niche:{" "}
          {STRONG_AT} or more of 4.
        </p>
      </div>
      <div className="rounded-xl border-2 border-foreground bg-white p-6">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">Verdict</p>
        {result ? (
          <>
            <p className="mt-2 text-2xl font-semibold">{result.title}</p>
            <p className="mt-3 text-muted">{result.advice}</p>
          </>
        ) : (
          <p className="mt-2 text-muted">Waiting for curators. The verdict appears once at least one work has a majority.</p>
        )}
        <p className="mt-4 text-xs text-muted">
          Replicated by AI: {rate === null ? "not yet decided" : `${Math.round(rate * 100)}% of works`} (threshold{" "}
          {Math.round(REPLICATED_AT * 100)}%). Criteria met: {met.size} of 4. Rules fixed before any curator voted.
          {note && ` ${note}`}
        </p>
      </div>
    </div>
  );
}
