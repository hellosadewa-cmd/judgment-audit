// Postgres storage for deployments (Neon over HTTP). Audits are JSON documents with a version number;
// images live in the same database so there is one service to set up.
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { Audit } from "./types.ts";

type Sql = NeonQueryFunction<false, false>;

let sql: Sql | null = null;
let ready: Promise<void> | null = null;

export async function db(): Promise<Sql> {
  sql ??= neon(process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "");
  ready ??= migrate(sql).catch((error) => {
    ready = null;
    throw error;
  });
  await ready;
  return sql;
}

async function migrate(sql: Sql): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS audits (
    id text PRIMARY KEY,
    data jsonb NOT NULL,
    version integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE TABLE IF NOT EXISTS images (
    audit_id text NOT NULL,
    file text NOT NULL,
    data bytea NOT NULL,
    PRIMARY KEY (audit_id, file)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS panel_votes (
    panelist text NOT NULL,
    pair_id text NOT NULL,
    pick text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (panelist, pair_id)
  )`;
}

export async function saveAudit(audit: Audit): Promise<void> {
  const sql = await db();
  await sql`INSERT INTO audits (id, data) VALUES (${audit.id}, ${JSON.stringify(audit)}::jsonb)
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, version = audits.version + 1`;
}

export async function loadAudit(id: string): Promise<Audit | null> {
  const sql = await db();
  const rows = await sql`SELECT data FROM audits WHERE id = ${id}`;
  return rows.length ? (rows[0].data as Audit) : null;
}

const MAX_ATTEMPTS = 10;

// Optimistic concurrency: the write only lands if nobody else wrote since we read, otherwise read again.
// Serverless instances share nothing in memory, so this replaces the per-process queue of the file store.
export async function updateAudit<T>(id: string, change: (audit: Audit) => T | Promise<T>): Promise<T> {
  const sql = await db();
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const rows = await sql`SELECT data, version FROM audits WHERE id = ${id}`;
    if (!rows.length) throw new Error("Audit not found");
    const audit = rows[0].data as Audit;
    const result = await change(audit);
    const written = await sql`UPDATE audits SET data = ${JSON.stringify(audit)}::jsonb, version = version + 1
      WHERE id = ${id} AND version = ${rows[0].version} RETURNING id`;
    if (written.length) return result;
    await new Promise((resolve) => setTimeout(resolve, attempt * 15 + Math.random() * 30));
  }
  throw new Error("Too many reviewers saving at once. Please try again.");
}

export async function saveImage(auditId: string, file: string, data: Buffer): Promise<void> {
  const sql = await db();
  await sql`INSERT INTO images (audit_id, file, data) VALUES (${auditId}, ${file}, decode(${data.toString("base64")}, 'base64'))
    ON CONFLICT (audit_id, file) DO UPDATE SET data = EXCLUDED.data`;
}

export async function loadImage(auditId: string, file: string): Promise<Buffer | null> {
  const sql = await db();
  const rows = await sql`SELECT encode(data, 'base64') AS data FROM images WHERE audit_id = ${auditId} AND file = ${file}`;
  return rows.length ? Buffer.from(rows[0].data as string, "base64") : null;
}
