"use client";

import { use, useEffect, useState } from "react";

type Stage = "intro" | "guess" | "rate" | "done";
interface Start {
  sessionId: string;
  count: number;
  question: string;
  scale: { min: number; max: number };
}

export default function Review({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState<Stage>("intro");
  const [session, setSession] = useState<Start | null>(null);
  const [guess, setGuess] = useState(15);
  const [position, setPosition] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/audits/${id}`).then(async (r) => setTitle(r.ok ? (await r.json()).title : ""));
  }, [id]);

  async function patch(body: object) {
    const response = await fetch(`/api/audits/${id}/sessions/${session!.sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
  }

  async function begin() {
    const response = await fetch(`/api/audits/${id}/sessions`, { method: "POST" });
    if (!response.ok) return setError("This audit link is not valid.");
    setSession(await response.json());
    setStage("guess");
  }

  async function submitGuess() {
    await patch({ guess });
    setStage("rate");
  }

  async function rate(score: number) {
    if (saving || !session) return;
    setSaving(true);
    setError(null);
    try {
      await patch({ position, score });
      if (position + 1 < session.count) setPosition(position + 1);
      else {
        await patch({ finish: true });
        setStage("done");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (stage === "intro")
    return (
      <Shell>
        <p className="text-sm uppercase tracking-wide text-muted">{title || "Judgment Audit"}</p>
        <h1 className="mt-3 text-3xl font-semibold">Score a set of work, on your own</h1>
        <ul className="mt-6 space-y-2 text-muted">
          <li>• About 10 minutes, one piece at a time.</li>
          <li>• Score each piece as you normally would. There are no right answers.</li>
          <li>• Don&apos;t discuss the pieces with others until everyone has finished.</li>
          <li>• Your scores are anonymous and only reported for the team as a whole.</li>
        </ul>
        {error && <p className="mt-4 text-red-700">{error}</p>}
        <button onClick={begin} className="mt-8 rounded-full bg-foreground px-6 py-3 font-medium text-background">
          Start
        </button>
      </Shell>
    );

  if (stage === "guess")
    return (
      <Shell>
        <h1 className="text-2xl font-semibold">One question first</h1>
        <p className="mt-3 text-muted">
          If two people on your team scored the same piece, how different do you think their scores would typically be?
        </p>
        <p className="mt-8 text-5xl font-semibold">{guess}%</p>
        <input
          type="range"
          min={0}
          max={60}
          value={guess}
          onChange={(e) => setGuess(Number(e.target.value))}
          className="mt-4 w-full"
        />
        <div className="flex justify-between text-sm text-muted">
          <span>identical</span>
          <span>very different</span>
        </div>
        <button onClick={submitGuess} className="mt-8 rounded-full bg-foreground px-6 py-3 font-medium text-background">
          Continue
        </button>
      </Shell>
    );

  if (stage === "rate" && session) {
    const { min, max } = session.scale;
    const scores = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-6">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            {position + 1} of {session.count}
          </span>
          <div className="mx-4 h-1 flex-1 rounded bg-line">
            <div className="h-1 rounded bg-foreground" style={{ width: `${(position / session.count) * 100}%` }} />
          </div>
        </div>
        <div className="mt-4 flex flex-1 items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={position}
            src={`/api/audits/${id}/sessions/${session.sessionId}/image/${position}`}
            alt={`Work ${position + 1}`}
            className="max-h-[62vh] w-auto rounded-md shadow-sm"
          />
        </div>
        <p className="mt-6 text-center font-medium">{session.question}</p>
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {scores.map((s) => (
            <button
              key={s}
              disabled={saving}
              onClick={() => rate(s)}
              className="rounded-lg border border-line bg-white py-3 text-lg font-medium hover:border-foreground disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted">
          <span>not ready</span>
          <span>send it now</span>
        </div>
        {error && <p className="mt-3 text-center text-red-700">{error}</p>}
      </main>
    );
  }

  return (
    <Shell>
      <h1 className="text-3xl font-semibold">Thank you</h1>
      <p className="mt-3 text-muted">
        Your scores are in. The team report appears once everyone has finished. Please don&apos;t discuss the pieces
        until then.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-xl px-6 py-20">{children}</main>;
}
