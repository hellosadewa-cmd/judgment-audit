// Storage entry point. Postgres when a database URL is configured (Vercel with Neon), local files otherwise.
import type { Audit } from "./types.ts";
import * as files from "./store-file.ts";
import * as postgres from "./store-postgres.ts";

function backend() {
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) return postgres;
  // Vercel's file system is read-only and not shared between instances, so files would silently lose data.
  if (process.env.VERCEL) throw new Error("No database configured. Connect a Postgres database to this project.");
  return files;
}

export const saveAudit = (audit: Audit) => backend().saveAudit(audit);
export const loadAudit = (id: string) => backend().loadAudit(id);
export const updateAudit = <T>(id: string, change: (audit: Audit) => T | Promise<T>) => backend().updateAudit(id, change);
export const saveImage = (auditId: string, file: string, data: Buffer) => backend().saveImage(auditId, file, data);
export const loadImage = (auditId: string, file: string) => backend().loadImage(auditId, file);

/** Images are stored as JPEG; older local audits may still hold PNG files. */
export const imageType = (file: string) => (file.endsWith(".png") ? "image/png" : "image/jpeg");
