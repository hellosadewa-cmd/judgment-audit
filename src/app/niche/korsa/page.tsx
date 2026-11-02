// Report of Korsa's niche test: every original next to the version AI made from a brief, the curators' votes,
// and the verdict.
import niche from "@/data/niche-korsa.json";
import { listCuration } from "@/lib/curation";
import { replication } from "@/lib/niche";
import { Verdict } from "../verdict";

export const dynamic = "force-dynamic";

export default async function KorsaNiche() {
  const r = replication(niche.works.map((w) => w.id), await listCuration(niche.id));
  const tally = new Map(r.perWork.map((w) => [w.workId, w]));
  const avg = Math.round(niche.works.reduce((s, w) => s + w.seconds, 0) / niche.works.length);

  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <p className="text-sm font-medium uppercase tracking-wide text-muted">Niche test · {niche.studio}</p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
        Can AI already make Korsa&apos;s {niche.name.toLowerCase()}?
      </h1>
      <p className="mt-4 max-w-3xl text-muted">
        For each of {niche.works.length} published Korsa works, Muse Spark wrote the brief a client would give, and Muse
        Image made the design from that brief alone, in {avg} seconds on average. Curators then judged each AI version:
        would it be acceptable to the same client?
      </p>

      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <Stat value={r.rate === null ? "—" : `${Math.round(r.rate * 100)}%`} note="of works AI replicated to a client's standard" />
        <Stat value={`${r.curators}`} note="curators so far" />
        <Stat value={`${avg} s`} note="average time from original to AI version" />
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Verdict</h2>
        <div className="mt-4">
          <Verdict rate={r.rate} note={r.curators < 3 ? "Fewer than 3 curators: an early signal only." : undefined} />
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold">Every work, side by side</h2>
        <div className="mt-6 space-y-10">
          {niche.works.map((w) => {
            const t = tally.get(w.id)!;
            return (
              <article key={w.id} className="rounded-xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{w.title}</p>
                  <p className="text-sm text-muted">
                    Curators: {t.yes} acceptable · {t.no} not acceptable
                  </p>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Figure src={w.original} caption="Original by Korsa" />
                  <Figure src={w.ai} caption={`Made by Muse Image from the brief in ${w.seconds} s`} />
                </div>
                <details className="mt-3 text-sm text-muted">
                  <summary className="cursor-pointer">Brief written by Muse Spark</summary>
                  <p className="mt-2 whitespace-pre-line">{w.brief}</p>
                </details>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Stat({ value, note }: { value: string; note: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <p className="text-4xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-muted">{note}</p>
    </div>
  );
}

function Figure({ src, caption }: { src: string; caption: string }) {
  return (
    <figure>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={caption} className="w-full rounded-md border border-line" />
      <figcaption className="mt-1 text-xs text-muted">{caption}</figcaption>
    </figure>
  );
}
