import { loadAudit } from "@/lib/store.ts";
import { buildReport } from "@/lib/stats.ts";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const audit = await loadAudit(id);
  if (!audit) return Response.json({ error: "Audit not found." }, { status: 404 });

  const token = new URL(request.url).searchParams.get("t");
  if (token !== audit.adminToken) {
    // Reviewers only learn what they need to start; nothing reveals which items are repeats or variants.
    return Response.json({ title: audit.title, question: audit.question, scale: audit.scale, count: audit.items.length });
  }

  return Response.json({
    title: audit.title,
    question: audit.question,
    scale: audit.scale,
    createdAt: audit.createdAt,
    works: audit.works,
    items: audit.items.map(({ id, kind, workId, change }) => ({ id, kind, workId, change })),
    sessions: audit.sessions.map((s) => ({
      label: s.label,
      finished: s.finishedAt !== null,
      rated: Object.keys(s.ratings).length,
    })),
    report: buildReport(audit),
  });
}
