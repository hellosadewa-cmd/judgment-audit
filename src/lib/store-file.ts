// File-based storage for local development. One JSON file per audit plus its images.
// The read-modify-write queue only holds within one process, which is why deployments use store-postgres.ts.
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Audit } from "./types.ts";

const ROOT = path.join(process.cwd(), ".data", "audits");

function auditDir(id: string): string {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error("Invalid audit id");
  return path.join(ROOT, id);
}

export async function saveAudit(audit: Audit): Promise<void> {
  const dir = auditDir(audit.id);
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(dir, `audit.${process.pid}.${Date.now()}.tmp`);
  await fs.writeFile(tmp, JSON.stringify(audit, null, 2));
  await fs.rename(tmp, path.join(dir, "audit.json"));
}

export async function loadAudit(id: string): Promise<Audit | null> {
  try {
    return JSON.parse(await fs.readFile(path.join(auditDir(id), "audit.json"), "utf8")) as Audit;
  } catch {
    return null;
  }
}

// Serialises read-modify-write per audit so concurrent reviewers don't overwrite each other's ratings.
const queues = new Map<string, Promise<unknown>>();
export function updateAudit<T>(id: string, change: (audit: Audit) => T | Promise<T>): Promise<T> {
  const run = (queues.get(id) ?? Promise.resolve()).then(async () => {
    const audit = await loadAudit(id);
    if (!audit) throw new Error("Audit not found");
    const result = await change(audit);
    await saveAudit(audit);
    return result;
  });
  queues.set(id, run.catch(() => undefined));
  return run;
}

export async function saveImage(auditId: string, file: string, data: Buffer): Promise<void> {
  const dir = path.join(auditDir(auditId), "images");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, path.basename(file)), data);
}

export async function loadImage(auditId: string, file: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(path.join(auditDir(auditId), "images", path.basename(file)));
  } catch {
    return null;
  }
}
