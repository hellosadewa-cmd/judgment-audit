"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Report, Work } from "@/lib/types.ts";

interface AdminView {
  title: string;
  question: string;
  works: Work[];
  items: { id: string; kind: string; workId: string; change?: string }[];
  sessions: { label: string; finished: boolean; rated: number }[];
  report: Report;
}

const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`);
const pts = (x: number | null) => (x === null ? "—" : x.toFixed(1));

export default function AuditAdmin({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const token = useSearchParams().get("t") ?? "";
  const [view, setView] = useState<AdminView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/audits/${id}?t=${token}`);
    const body = await response.json();
    if (!response.ok || !body.report) setError("This admin link is not valid.");
    else setView(body);
  }, [id, token]);

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
  }, [load]);

  if (error) return <main className="mx-auto max-w-3xl px-6 py-20 text-red-700">{error}</main>;
  if (!view) return <main className="mx-auto max-w-3xl px-6 py-20 text-muted">Loading…</main>;

  const r = view.report;
  const reviewLink = `${origin}/r/${id}`;
  const variants = view.items.filter((i) => i.kind === "variant");
  const finished = view.sessions.filter((s) => s.finished).length;

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <p className="text-sm uppercase tracking-wide text-muted">Judgment Audit</p>
      <h1 className="mt-2 text-3xl font-semibold">{view.title}</h1>

      <section className="mt-8 rounded-xl border border-line bg-white p-6">
        <h2 className="font-semibold">Invite reviewers</h2>
        <p className="mt-1 text-sm text-muted">
          Send this link to each reviewer. Ask them to score on their own, without discussing, until everyone is done.
        </p>
        <div className="mt-3 flex gap-2">
          <input readOnly value={reviewLink} className="flex-1 rounded-lg border border-line px-3 py-2 font-mono text-sm" />
          <button onClick={() => navigator.clipboard.writeText(reviewLink)} className="rounded-lg border border-line px-4 text-sm">
            Copy
          </button>
        </div>
        <p className="mt-4 text-sm">
          {finished} of {view.sessions.length} reviewers finished
          <button onClick={load} className="ml-3 text-accent underline">
            Refresh
          </button>
        </p>
      </section>

      {r.completeReviewers < 2 ? (
        <p className="mt-10 text-muted">The report appears once at least two reviewers have finished.</p>
      ) : (
        <>
          <section className="mt-10">
            {r.indicative && (
              <p className="mb-4 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-900">
                Indicative: based on {r.completeReviewers} reviewers. Five or more give steadier numbers.
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Stat label="Your team expected two reviewers to differ by" value={pct(r.guessedNoise)} />
              <Stat label="Two reviewers actually differ by (median)" value={pct(r.noiseIndex)} strong />
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-3">
            <Stat
              label="Same piece, same person, second time"
              value={`${pts(r.selfInconsistency)} pts`}
              note={`Scores changed on ${pct(r.selfChangeRate)} of exact repeats`}
            />
            <Stat
              label="Effect of changing only the background"
              value={r.irrelevantShift ? `${r.irrelevantShift.mean >= 0 ? "+" : ""}${pts(r.irrelevantShift.mean)} pts` : "—"}
              note={
                r.irrelevantShift
                  ? `95% interval ${pts(r.irrelevantShift.interval.low)} to ${pts(r.irrelevantShift.interval.high)}; average size ${pts(r.irrelevantShift.absMean)} pts`
                  : undefined
              }
            />
            <Stat label="Agreement between reviewers (ICC 2,1)" value={r.icc === null ? "—" : r.icc.toFixed(2)} note="1 = perfect agreement, 0 = none" />
          </section>

          <section className="mt-10">
            <h2 className="font-semibold">Score range per piece</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {r.perWork.map((w) => (
                <div key={w.workId} className="flex items-center gap-4 rounded-xl border border-line bg-white p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/audits/${id}/works/${w.workId}?t=${token}`} alt="" className="h-16 w-16 rounded object-cover" />
                  <div className="flex-1">
                    <Range min={w.min} max={w.max} mean={w.mean} scale={10} />
                    <p className="mt-1 text-xs text-muted">
                      lowest {w.min}, highest {w.max}, average {w.mean.toFixed(1)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {variants.length > 0 && (
            <section className="mt-10">
              <h2 className="font-semibold">What changed in the controlled versions</h2>
              <ul className="mt-2 text-sm text-muted">
                {variants.map((v) => (
                  <li key={v.id}>• Piece {v.workId.slice(1)}: {v.change}. The work itself is pixel-identical.</li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function Stat({ label, value, note, strong }: { label: string; value: string; note?: string; strong?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${strong ? "border-foreground bg-foreground text-background" : "border-line bg-white"}`}>
      <p className={`text-sm ${strong ? "opacity-80" : "text-muted"}`}>{label}</p>
      <p className="mt-2 text-4xl font-semibold">{value}</p>
      {note && <p className={`mt-2 text-xs ${strong ? "opacity-80" : "text-muted"}`}>{note}</p>}
    </div>
  );
}

function Range({ min, max, mean, scale }: { min: number; max: number; mean: number; scale: number }) {
  const at = (x: number) => `${((x - 1) / (scale - 1)) * 100}%`;
  return (
    <div className="relative h-2 rounded bg-line">
      <div className="absolute h-2 rounded bg-foreground/40" style={{ left: at(min), width: `calc(${at(max)} - ${at(min)})` }} />
      <div className="absolute -top-1 h-4 w-0.5 bg-foreground" style={{ left: at(mean) }} />
    </div>
  );
}
