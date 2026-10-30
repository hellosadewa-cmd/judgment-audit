import { checkVote, saveVote } from "@/lib/panel";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { panelist?: string; pairId?: string; pick?: string };
  const error = checkVote(body);
  if (error) return Response.json({ error }, { status: 400 });
  try {
    await saveVote({ panelist: body.panelist!, pairId: body.pairId!, pick: body.pick! });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
