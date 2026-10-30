// Report of the AI-judge audit. Shows the real audit once it has run (data/judge/audit.json); in development,
// ?simulated=1 previews the layout with simulated data under an unmissable banner.
import { promises as fs } from "node:fs";
import path from "node:path";
import { buildJudgeReport } from "@/lib/judge-stats";
import { findings } from "@/lib/judge-findings";
import { listVotes } from "@/lib/panel";
import { CRITERIA, type JudgeAudit, type JudgeReport } from "@/lib/judge-types";

export const dynamic = "force-dynamic";

async function readAudit(file: string): Promise<JudgeAudit | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as JudgeAudit;
  } catch {
    return null;
  }
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const signed = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(2)}`;

export default async function JudgeReportPage({ searchParams }: { searchParams: Promise<{ simulated?: string }> }) {
  const { simulated } = await searchParams;
  const preview = process.env.NODE_ENV !== "production" && simulated === "1";
  const audit = preview
    ? await readAudit(path.join(process.cwd(), ".data", "judge", "simulated.json"))
    : await readAudit(path.join(process.cwd(), "data", "judge", "audit.json"));

  if (!audit)
    return (
      <main className="mx-auto max-w-3xl px-6 py-20">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">Judgment Audit</p>
        <h1 className="mt-4 text-3xl font-semibold">The audit of Muse Spark has not been run yet.</h1>
        <p className="mt-4 text-muted">Results will appear here, exactly as measured, once the audit runs.</p>
      </main>
    );

  // The real audit takes the designer panel's live votes; simulated data carries its own simulated panel.
  if (!audit.simulated) audit.panel = await listVotes();
  const report = buildJudgeReport(audit);
  const f = findings(report);

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      {audit.simulated && (
        <div className="mb-8 rounded-lg border-2 border-red-600 bg-red-50 px-4 py-3 font-medium text-red-800">
          Simulated data for building this page. These are not results.
        </div>
      )}
      <p className="text-sm font-medium uppercase tracking-wide text-muted">Audit of an AI design judge</p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">{f.headline}</h1>
      <p className="mt-4 text-muted">
        {report.judge} judged {report.designs} designs in {report.calls} separate requests.
        {report.indicative && " With this many designs, every number is indicative and shown with its range."}
      </p>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        <Measure title="Order" value={report.position ? pct(report.position.flipRate) : "—"} note="of pairs changed winner when the order was swapped" />
        <Measure
          title="Setting"
          value={report.presentation ? signed(report.presentation.mean) : "—"}
          note={report.presentation ? `points from setting alone (95%: ${signed(report.presentation.interval.low)} to ${signed(report.presentation.interval.high)})` : "no data"}
        />
        <Measure title="Repeats" value={report.selfConsistency ? pct(report.selfConsistency.changeRate) : "—"} note="of scores changed when the same design was judged again" />
        <Measure
          title="Designers"
          value={report.accuracy ? pct(report.accuracy.agreement) : "—"}
          note={report.accuracy ? `agreement with the designer panel's majority (${report.accuracy.panelists} designers)` : "no designer panel in this audit"}
        />
      </section>

      <Section title="What the audit found">
        <ul className="space-y-3">
          {f.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Section>

      {f.advice.length > 0 && (
        <Section title="Before you trust this judge">
          <ol className="list-decimal space-y-2 pl-5">
            {f.advice.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </Section>
      )}

      <Details report={report} />

      <Section title="How it works">
        <p className="text-muted">
          The judge is audited; it does not audit itself. Every number and every sentence above comes from code and
          fixed templates written before the audit ran. Each design is judged three times on its own, once in each of
          three settings with its pixels checked to be identical, and in pairs shown in both orders. Rubric from Contra
          Labs&apos; Human Creativity Benchmark; reference figures from Contra Labs&apos; Design Crit (June 2026).
        </p>
        <p className="mt-3 text-sm text-muted">Designs: {audit.source}</p>
      </Section>
    </main>
  );
}

function Measure({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <p className="text-sm font-medium text-muted">{title}</p>
      <p className="mt-1 text-4xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-muted">{note}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Details({ report }: { report: JudgeReport }) {
  const s = report.selfConsistency;
  const p = report.presentation;
  return (
    <Section title="Details">
      <div className="grid gap-6 sm:grid-cols-2">
        {s && (
          <table className="w-full text-sm">
            <caption className="mb-2 text-left font-medium">Spread on repeats, by criterion (points)</caption>
            <tbody>
              {CRITERIA.map((c) => (
                <tr key={c} className="border-t border-line">
                  <td className="py-2 capitalize">{c}</td>
                  <td className="py-2 text-right font-mono">{s.perCriterion[c].toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {p && (
          <table className="w-full text-sm">
            <caption className="mb-2 text-left font-medium">Score shift by setting (points)</caption>
            <tbody>
              {p.perContext.map((c) => (
                <tr key={c.contextId} className="border-t border-line">
                  <td className="py-2">{c.name}</td>
                  <td className="py-2 text-right font-mono">{signed(c.mean)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-4 text-sm text-muted">
        {report.validCalls} of {report.calls} replies were readable.
        {report.position && ` The judge picked the first design shown ${pct(report.position.firstShare)} of the time.`}
        {report.accuracy?.humanAgreement != null && ` Designers agreed with the rest of the panel ${pct(report.accuracy.humanAgreement)} of the time.`}
      </p>
    </Section>
  );
}
