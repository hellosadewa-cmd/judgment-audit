// Curator votes for a niche test: would the AI version be acceptable to the same client? Curators are random
// ids kept in their own browser; no names are collected.
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Vote } from "./niche.ts";
import { db } from "./store-postgres.ts";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const hasDatabase = () => Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
const file = (niche: string) => path.join(process.cwd(), ".data", "curation", `${niche}.json`);

export function checkCuration(body: { curator?: unknown; workId?: unknown; acceptable?: unknown }, workIds: string[]): string | null {
  if (typeof body.curator !== "string" || !ID.test(body.curator)) return "Unknown curator.";
  if (typeof body.workId !== "string" || !workIds.includes(body.workId)) return "Unknown work.";
  if (typeof body.acceptable !== "boolean") return "Answer yes or no.";
  return null;
}

async function readFileVotes(niche: string): Promise<Vote[]> {
  try {
    return JSON.parse(await fs.readFile(file(niche), "utf8")) as Vote[];
  } catch {
    return [];
  }
}

let queue: Promise<unknown> = Promise.resolve();

/** Saves a vote; a curator voting again on the same work replaces the earlier vote. */
export async function saveCuration(niche: string, vote: Vote): Promise<void> {
  if (hasDatabase()) {
    const sql = await db();
    await sql`INSERT INTO curation_votes (niche, curator, work_id, acceptable) VALUES (${niche}, ${vote.curator}, ${vote.workId}, ${vote.acceptable})
      ON CONFLICT (niche, curator, work_id) DO UPDATE SET acceptable = EXCLUDED.acceptable, created_at = now()`;
    return;
  }
  if (process.env.VERCEL) throw new Error("No database configured. Connect a Postgres database to this project.");
  const run = queue.then(async () => {
    const votes = (await readFileVotes(niche)).filter((v) => !(v.curator === vote.curator && v.workId === vote.workId));
    votes.push(vote);
    await fs.mkdir(path.dirname(file(niche)), { recursive: true });
    await fs.writeFile(file(niche), JSON.stringify(votes, null, 2));
  });
  queue = run.catch(() => undefined);
  await run;
}

export async function listCuration(niche: string): Promise<Vote[]> {
  if (!hasDatabase()) return readFileVotes(niche);
  const sql = await db();
  const rows = await sql`SELECT curator, work_id, acceptable FROM curation_votes WHERE niche = ${niche} ORDER BY created_at`;
  return rows.map((r) => ({ curator: r.curator as string, workId: r.work_id as string, acceptable: r.acceptable as boolean }));
}
