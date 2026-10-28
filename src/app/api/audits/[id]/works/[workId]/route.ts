import { loadAudit, loadImage } from "@/lib/store.ts";

export const runtime = "nodejs";

// Admin-only thumbnails for the report. `?variant=1` returns the controlled variant of the work.
export async function GET(request: Request, { params }: { params: Promise<{ id: string; workId: string }> }) {
  const { id, workId } = await params;
  const url = new URL(request.url);
  const audit = await loadAudit(id);
  if (!audit || url.searchParams.get("t") !== audit.adminToken) return new Response("Not found", { status: 404 });
  const kind = url.searchParams.get("variant") ? "variant" : "original";
  const item = audit.items.find((i) => i.workId === workId && i.kind === kind);
  const data = item ? await loadImage(id, item.file) : null;
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" } });
}
