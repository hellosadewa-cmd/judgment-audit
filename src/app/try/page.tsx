"use client";

// Live test on one work: upload it, let Muse Spark write the brief and Muse Image remake it, then judge the result.
import { useState } from "react";
import { Verdict } from "../niche/verdict";

interface Result {
  brief: string;
  image: string;
  seconds: number;
}

export default function Try() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [acceptable, setAcceptable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  function choose(f: File | undefined) {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setAcceptable(null);
    setError(null);
  }

  async function run() {
    if (!file) return;
    setRunning(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("work", file);
      const response = await fetch("/api/try", { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The test failed.");
      setResult(body);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <p className="text-sm font-medium uppercase tracking-wide text-muted">Niche test · Your work</p>
      <h1 className="mt-3 text-3xl font-semibold">Can AI remake one of your works from a brief?</h1>
      <p className="mt-4 max-w-3xl text-muted">
        Upload a piece you sell. Muse Spark writes the brief a client would give, and Muse Image makes the design from that
        brief alone. It takes about half a minute. Your image is not stored.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-full border border-foreground px-5 py-2.5 font-medium">
          Choose an image
          <input type="file" accept="image/*" className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
        </label>
        <button
          onClick={run}
          disabled={!file || running}
          className="rounded-full bg-foreground px-6 py-3 font-medium text-background disabled:opacity-40"
        >
          {running ? "AI is remaking your work…" : "Run the test"}
        </button>
        {error && <p className="text-red-700">{error}</p>}
      </div>

      {preview && (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Your work" className="w-full rounded-md border border-line" />
            <figcaption className="mt-1 text-sm text-muted">Your work</figcaption>
          </figure>
          <figure>
            {result ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={result.image} alt="AI version" className="w-full rounded-md border border-line" />
                <figcaption className="mt-1 text-sm text-muted">Made by Muse Image from the brief in {result.seconds} s</figcaption>
              </>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-md border border-dashed border-line text-muted">
                {running ? "Writing the brief, then making the design…" : "The AI version appears here"}
              </div>
            )}
          </figure>
        </div>
      )}

      {result && (
        <>
          <details className="mt-4 text-sm text-muted">
            <summary className="cursor-pointer">Brief written by Muse Spark</summary>
            <p className="mt-2 whitespace-pre-line">{result.brief}</p>
          </details>
          <section className="mt-10">
            <p className="text-lg font-medium">Would the AI version be acceptable to the same client?</p>
            <div className="mt-3 flex gap-3">
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  onClick={() => setAcceptable(v)}
                  className={`rounded-lg border px-6 py-3 font-medium ${acceptable === v ? "border-foreground bg-foreground text-background" : "border-line bg-white"}`}
                >
                  {v ? "Yes, acceptable" : "No"}
                </button>
              ))}
            </div>
          </section>
          {acceptable !== null && (
            <section className="mt-10">
              <Verdict rate={acceptable ? 1 : 0} note="One work is a first signal, not a verdict. Test several works from the same niche." />
            </section>
          )}
        </>
      )}
    </main>
  );
}
