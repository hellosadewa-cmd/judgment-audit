"use client";

// Designer panel: the human reference for the AI-judge audit. Each designer sees the same 12 pairs as the
// judge, in their own random order and with random sides, and picks the stronger design.
import { useEffect, useMemo, useState } from "react";
import auditSet from "@/data/audit-set.json";
import { seeded, seedFrom, shuffle } from "@/lib/random";

const QUESTION = "Which design has the stronger visual quality and aesthetics?";
const KEY_ID = "judgment-audit:panelist";
const KEY_DONE = "judgment-audit:panel-done";

type Stage = "intro" | "choose" | "done";
const byId = new Map(auditSet.designs.map((d) => [d.id, d]));

function remember(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return value ?? null;
  }
}

export default function Panel() {
  const [stage, setStage] = useState<Stage>("intro");
  const [panelist, setPanelist] = useState<string | null>(null);
  const [position, setPosition] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = remember(KEY_ID);
    if (id) setPanelist(id);
    const done = Number(remember(KEY_DONE) ?? 0);
    if (done >= auditSet.pairs.length) setStage("done");
    else setPosition(done);
  }, []);

  const order = useMemo(() => {
    if (!panelist) return [];
    const rand = seeded(seedFrom(panelist));
    return shuffle(auditSet.pairs, rand).map((p) => (rand() < 0.5 ? { id: p.id, left: p.a, right: p.b } : { id: p.id, left: p.b, right: p.a }));
  }, [panelist]);

  function start() {
    const id = panelist ?? remember(KEY_ID, crypto.randomUUID())!;
    setPanelist(id);
    setStage("choose");
  }

  async function pick(designId: string) {
    if (saving || !panelist) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/panel/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ panelist, pairId: order[position].id, pick: designId }),
      });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not save your choice.");
      const next = position + 1;
      remember(KEY_DONE, String(next));
      if (next < order.length) setPosition(next);
      else setStage("done");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (stage === "intro")
    return (
      <main className="mx-auto max-w-xl px-6 py-20">
        <p className="text-sm uppercase tracking-wide text-muted">Judgment Audit · Designer panel</p>
        <h1 className="mt-3 text-3xl font-semibold">Pick the stronger design, twelve times</h1>
        <ul className="mt-6 space-y-2 text-muted">
          <li>• {auditSet.pairs.length} pairs of ad designs, about 10 minutes.</li>
          <li>• For each pair: {QUESTION.toLowerCase()}</li>
          <li>• Go with your professional judgement. There are no right answers.</li>
          <li>• No names are collected. Your choices only count toward the panel&apos;s majority.</li>
        </ul>
        <p className="mt-6 text-sm text-muted">
          The AI judge being audited sees the same pairs. Your panel&apos;s majority is the reference it is compared with.
        </p>
        <button onClick={start} className="mt-8 rounded-full bg-foreground px-6 py-3 font-medium text-background">
          {position > 0 ? "Continue" : "Start"}
        </button>
      </main>
    );

  if (stage === "choose" && order.length) {
    const pair = order[position];
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            {position + 1} of {order.length}
          </span>
          <div className="mx-4 h-1 flex-1 rounded bg-line">
            <div className="h-1 rounded bg-foreground" style={{ width: `${(position / order.length) * 100}%` }} />
          </div>
        </div>
        <p className="mt-6 text-center text-lg font-medium">{QUESTION}</p>
        <div className="mt-4 grid flex-1 gap-4 sm:grid-cols-2">
          {[pair.left, pair.right].map((id, side) => (
            <button
              key={`${pair.id}-${id}`}
              disabled={saving}
              onClick={() => pick(id)}
              className="flex flex-col items-center rounded-xl border border-line bg-white p-3 hover:border-foreground disabled:opacity-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={byId.get(id)!.file} alt={`Design ${side === 0 ? "A" : "B"}`} className="max-h-[60vh] w-auto rounded-md" />
              <span className="mt-3 font-medium">{side === 0 ? "This one (A)" : "This one (B)"}</span>
            </button>
          ))}
        </div>
        {error && <p className="mt-3 text-center text-red-700">{error}</p>}
        <p className="mt-6 text-center text-xs text-muted">Designs: Contra Labs, creative-ad-design-dataset, CC BY 4.0.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-3xl font-semibold">Thank you</h1>
      <p className="mt-3 text-muted">All {auditSet.pairs.length} choices are saved. You can close this page.</p>
    </main>
  );
}
