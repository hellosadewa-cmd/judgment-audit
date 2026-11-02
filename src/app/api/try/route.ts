// Live replication test on one uploaded work. Each run spends model credits, so runs are capped per day.
import { randomUUID } from "node:crypto";
import { metaClient, normalise, replicate } from "@/lib/replicate";
import { db } from "@/lib/store-postgres";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAILY_LIMIT = 40;
const MAX_BYTES = 4 * 1024 * 1024;

async function takeSlot(): Promise<boolean> {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) return true; // local development
  const sql = await db();
  const [{ n }] = await sql`SELECT count(*)::int AS n FROM live_tests WHERE created_at > now() - interval '1 day'`;
  if ((n as number) >= DAILY_LIMIT) return false;
  await sql`INSERT INTO live_tests (id) VALUES (${randomUUID()})`;
  return true;
}

/** Whether live tests can run here; the page offers a recorded run when they cannot. */
export function GET() {
  return Response.json({ live: Boolean(process.env.MODEL_API_KEY) });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("work");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > MAX_BYTES)
    return Response.json({ error: "Upload one image, up to 4 MB." }, { status: 400 });
  if (!process.env.MODEL_API_KEY)
    return Response.json({ error: "Live tests are paused right now.", unavailable: true }, { status: 503 });
  try {
    if (!(await takeSlot()))
      return Response.json({ error: "Today's live tests are used up. Please try again tomorrow." }, { status: 429 });
    const original = await normalise(Buffer.from(await file.arrayBuffer()));
    const replica = await replicate(metaClient(process.env.MODEL_API_KEY, process.env.MODEL_API_BASE_URL), original);
    return Response.json({
      brief: replica.brief,
      image: `data:image/png;base64,${replica.image.toString("base64")}`,
      seconds: Math.round(replica.seconds),
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
