"use client";

// Curators judge each AI version against the original: would it be acceptable to the same client?
import { useEffect, useState } from "react";
import niche from "@/data/niche-korsa.json";

const KEY_ID = "niche-test:curator";
const KEY_DONE = `niche-test:${niche.id}:done`;
type Stage = "intro" | "judge" | "done";

function remember(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return value ?? null;
  }
}

export default function Curate() {
  const [stage, setStage] = useState<Stage>("intro");
  const [curator, setCurator] = useState<string | null>(null);
  const [position, setPosition] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const works = niche.works;

  useEffect(() => {
    setCurator(remember(KEY_ID));
    const done = Number(remember(KEY_DONE) ?? 0);
    if (done >= works.length) setStage("done");
    else setPosition(done);
  }, [works.length]);

  function start() {
    setCurator(curator ?? remember(KEY_ID, crypto.randomUUID()));
    setStage("judge");
  }

  async function answer(acceptable: boolean) {
    if (saving || !curator) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/curate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curator, workId: works[position].id, acceptable }),
      });
      if (!response.ok) throw new Error((await response.json()).error ?? "Could not save your answer.");
      const next = position + 1;
      remember(KEY_DONE, String(next));
      if (next < works.length) setPosition(next);
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
        <p className="text-sm uppercase tracking-wide text-muted">Niche test · Curator</p>
        <h1 className="mt-3 text-3xl font-semibold">Would a client accept the AI version?</h1>
        <ul className="mt-6 space-y-2 text-muted">
          <li>• {works.length} published Korsa works, each next to the version AI made from a brief.</li>
          <li>• For each, decide as you would for a real client: would the AI version be acceptable?</li>
          <li>• About 5 minutes. No names are collected.</li>
        </ul>
        <button onClick={start} className="mt-8 rounded-full bg-foreground px-6 py-3 font-medium text-background">
          {position > 0 ? "Continue" : "Start"}
        </button>
      </main>
    );

  if (stage === "judge") {
    const w = works[position];
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6">
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            {position + 1} of {works.length}
          </span>
          <div className="mx-4 h-1 flex-1 rounded bg-line">
            <div className="h-1 rounded bg-foreground" style={{ width: `${(position / works.length) * 100}%` }} />
          </div>
        </div>
        <div className="mt-4 grid flex-1 gap-4 md:grid-cols-2">
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={w.original} alt="Original" className="w-full rounded-md border border-line" />
            <figcaption className="mt-1 text-sm text-muted">Original by Korsa</figcaption>
          </figure>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={w.ai} alt="AI version" className="w-full rounded-md border border-line" />
            <figcaption className="mt-1 text-sm text-muted">AI version, made from a brief in {w.seconds} s</figcaption>
          </figure>
        </div>
        <p className="mt-6 text-center text-lg font-medium">Would the AI version be acceptable to the same client?</p>
        <div className="mx-auto mt-3 grid w-full max-w-md grid-cols-2 gap-3">
          <button disabled={saving} onClick={() => answer(true)} className="rounded-lg border border-line bg-white py-3 font-medium hover:border-foreground disabled:opacity-40">
            Yes, acceptable
          </button>
          <button disabled={saving} onClick={() => answer(false)} className="rounded-lg border border-line bg-white py-3 font-medium hover:border-foreground disabled:opacity-40">
            No
          </button>
        </div>
        {error && <p className="mt-3 text-center text-red-700">{error}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-20">
      <h1 className="text-3xl font-semibold">Thank you</h1>
      <p className="mt-3 text-muted">All {works.length} answers are saved.</p>
      <a href="/niche/korsa" className="mt-8 inline-block rounded-full bg-foreground px-6 py-3 font-medium text-background">
        See the verdict
      </a>
    </main>
  );
}
