import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-wide text-muted">Judgment Audit</p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
        AI is starting to judge design. Who audits the judge?
      </h1>
      <p className="mt-6 text-lg text-muted">
        In Contra Labs&apos; Design Crit study, off-the-shelf AI judges agreed with a panel of designers on only 51–54%
        of choices between two designs. A coin flip gets 50%. Designers agreed with each other 74% of the time.
      </p>
      <p className="mt-4 text-lg text-muted">
        Judgment Audit tests an AI design judge before you trust it. The same design is judged again, shown in
        different settings with its pixels kept identical, and compared with another design in both orders. Code, not
        the judge, measures how often the verdict moves for reasons that should not matter, and how often it matches
        designers.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/judge" className="rounded-full bg-foreground px-6 py-3 font-medium text-background">
          See the audit of Muse Spark
        </Link>
      </div>
      <p className="mt-16 text-sm text-muted">
        Built with Meta SAM 3.1, Muse Image, and Muse Spark. Designs from Contra Labs&apos; creative-ad-design-dataset
        (CC BY 4.0).
      </p>
    </main>
  );
}
