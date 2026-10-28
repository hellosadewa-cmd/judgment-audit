import { createAudit } from "@/lib/audits.ts";

export const runtime = "nodejs";

const MIN_WORKS = 4;
const MAX_WORKS = 12;
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const form = await request.formData();
  const files = form.getAll("works").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length < MIN_WORKS || files.length > MAX_WORKS)
    return Response.json({ error: `Upload between ${MIN_WORKS} and ${MAX_WORKS} images.` }, { status: 400 });
  if (files.some((f) => !f.type.startsWith("image/") || f.size > MAX_BYTES))
    return Response.json({ error: "Images only, up to 8 MB each." }, { status: 400 });

  const images = await Promise.all(files.map(async (f) => ({ name: f.name, data: Buffer.from(await f.arrayBuffer()) })));
  const audit = await createAudit(String(form.get("title") ?? ""), images);
  return Response.json({ id: audit.id, adminToken: audit.adminToken });
}
