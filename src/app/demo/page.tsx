// The demo video for the hackathon submission.
export default function Demo() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <p className="text-sm font-medium uppercase tracking-wide text-muted">Niche Test · Demo</p>
      <h1 className="mt-3 text-3xl font-semibold">Can AI already make what you sell?</h1>
      <video src="/video/niche-test.mp4" controls playsInline preload="metadata" className="mt-8 w-full rounded-xl border border-line bg-black" />
      <p className="mt-4 text-sm text-muted">
        2 minutes 44 seconds. Korsa&apos;s verdict in the video comes from one curator and is marked as an early signal; the{" "}
        <a href="/niche/korsa" className="underline">live report</a> updates as more designers vote.
      </p>
    </main>
  );
}
