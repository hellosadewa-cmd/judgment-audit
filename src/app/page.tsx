import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-wide text-muted">Judgment Audit</p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
        We audit AI for bias. Who audits the people reviewing the work?
      </h1>
      <p className="mt-6 text-lg text-muted">
        In a well-known insurance audit, executives expected two underwriters to differ by about 10%. The typical
        difference was 55%. Creative reviews carry the same hidden noise, because every piece is judged only once.
      </p>
      <p className="mt-4 text-lg text-muted">
        Upload 8–12 pieces of your team&apos;s work. Each reviewer scores them independently in about ten minutes,
        including a few exact repeats and versions where only the background changes. You get a team report on
        how much you disagree, how often people disagree with themselves, and how much irrelevant details move the
        verdict.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/new" className="rounded-full bg-foreground px-6 py-3 font-medium text-background">
          Start an audit
        </Link>
      </div>
      <p className="mt-16 text-sm text-muted">
        Results are reported for the team only, never per person. Built with Meta SAM 3.1, Muse Image, and Muse Spark.
      </p>
    </main>
  );
}
