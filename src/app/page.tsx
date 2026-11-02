import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="text-sm font-medium uppercase tracking-wide text-muted">Niche Test</p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
        If AI can remake your work in a minute, so can your client.
      </h1>
      <p className="mt-6 text-lg text-muted">
        Creative studios, agencies, and freelancers are losing work to AI, and most of them find out only when the briefs
        stop coming. Before you spend another year on a niche, test whether AI already owns it.
      </p>
      <ol className="mt-8 space-y-4 text-lg">
        <li>
          <span className="font-semibold">1. AI tries to replicate your work.</span>{" "}
          <span className="text-muted">Muse Spark reads a piece you sell and writes the brief a client would give. Muse Image makes the design from that brief alone.</span>
        </li>
        <li>
          <span className="font-semibold">2. People curate.</span>{" "}
          <span className="text-muted">Curators decide, piece by piece, whether the AI version would be acceptable to the same client.</span>
        </li>
        <li>
          <span className="font-semibold">3. You get a verdict.</span>{" "}
          <span className="text-muted">How much AI can replicate, combined with four signs of a niche AI cannot easily take: leave it, keep it, or move up to selling systems.</span>
        </li>
      </ol>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/niche/korsa" className="rounded-full bg-foreground px-6 py-3 font-medium text-background">
          See Korsa&apos;s test
        </Link>
        <Link href="/try" className="rounded-full border border-foreground px-6 py-3 font-medium">
          Test one of your works
        </Link>
      </div>
      <p className="mt-16 text-sm text-muted">
        Built by Korsa Agency with Meta Muse Spark and Muse Image. AI builds; people curate.
      </p>
    </main>
  );
}
