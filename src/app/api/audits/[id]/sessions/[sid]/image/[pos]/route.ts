import { loadAudit, loadImage } from "@/lib/store.ts";

export const runtime = "nodejs";

// Serves images by position in the reviewer's order, so file names never reveal repeats or variants.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; sid: string; pos: string }> }) {
  const { id, sid, pos } = await params;
  const audit = await loadAudit(id);
  const session = audit?.sessions.find((s) => s.id === sid);
  const item = audit?.items.find((i) => i.id === session?.order[Number(pos)]);
  const data = item ? await loadImage(id, item.file) : null;
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" },
  });
}
