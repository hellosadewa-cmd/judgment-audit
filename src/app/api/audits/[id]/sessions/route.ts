import { startSession } from "@/lib/audits.ts";
import { loadAudit } from "@/lib/store.ts";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const audit = await loadAudit(id);
  if (!audit) return Response.json({ error: "Audit not found." }, { status: 404 });
  const session = await startSession(id);
  return Response.json({
    sessionId: session.id,
    label: session.label,
    count: session.order.length,
    question: audit.question,
    scale: audit.scale,
  });
}
