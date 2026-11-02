import { checkCuration, saveCuration } from "@/lib/curation";
import niche from "@/data/niche-korsa.json";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { curator?: string; workId?: string; acceptable?: boolean };
  const error = checkCuration(body, niche.works.map((w) => w.id));
  if (error) return Response.json({ error }, { status: 400 });
  try {
    await saveCuration(niche.id, { curator: body.curator!, workId: body.workId!, acceptable: body.acceptable! });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
