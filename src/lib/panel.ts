// The designer panel: each designer picks the stronger design in every pair of the audit set. Their majority
// is the reference the AI judge is compared with. Panelists are random ids kept in their own browser; no
// names are collected.
import { promises as fs } from "node:fs";
import path from "node:path";
import auditSet from "../data/audit-set.json" with { type: "json" };
import type { PanelVote } from "./judge-types.ts";
import { db } from "./store-postgres.ts";

export { auditSet };

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Checks a vote against the frozen audit set. Returns an error message, or null when the vote is valid. */
export function checkVote(vote: { panelist?: unknown; pairId?: unknown; pick?: unknown }): string | null {
  if (typeof vote.panelist !== "string" || !ID.test(vote.panelist)) return "Unknown panelist.";
  const pair = auditSet.pairs.find((p) => p.id === vote.pairId);
  if (!pair) return "Unknown pair.";
  if (vote.pick !== pair.a && vote.pick !== pair.b) return "Pick one of the two designs in this pair.";
  return null;
}

const hasDatabase = () => Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
const FILE = path.join(process.cwd(), ".data", "panel", "votes.json");

async function readFileVotes(): Promise<PanelVote[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as PanelVote[];
  } catch {
    return [];
  }
}

let queue: Promise<unknown> = Promise.resolve();

/** Saves a vote; a second vote by the same panelist on the same pair replaces the first. */
export async function saveVote(vote: PanelVote): Promise<void> {
  if (hasDatabase()) {
    const sql = await db();
    await sql`INSERT INTO panel_votes (panelist, pair_id, pick) VALUES (${vote.panelist}, ${vote.pairId}, ${vote.pick})
      ON CONFLICT (panelist, pair_id) DO UPDATE SET pick = EXCLUDED.pick, created_at = now()`;
    return;
  }
  if (process.env.VERCEL) throw new Error("No database configured. Connect a Postgres database to this project.");
  const run = queue.then(async () => {
    const votes = (await readFileVotes()).filter((v) => !(v.panelist === vote.panelist && v.pairId === vote.pairId));
    votes.push(vote);
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(votes, null, 2));
  });
  queue = run.catch(() => undefined);
  await run;
}

/** All votes, with panelists relabelled P1, P2, … in order of their first vote. */
export async function listVotes(): Promise<PanelVote[]> {
  let votes: PanelVote[];
  if (hasDatabase()) {
    const sql = await db();
    const rows = await sql`SELECT panelist, pair_id, pick FROM panel_votes ORDER BY created_at`;
    votes = rows.map((r) => ({ panelist: r.panelist as string, pairId: r.pair_id as string, pick: r.pick as string }));
  } else votes = await readFileVotes();
  const labels = new Map<string, string>();
  for (const v of votes) if (!labels.has(v.panelist)) labels.set(v.panelist, `P${labels.size + 1}`);
  return votes.map((v) => ({ ...v, panelist: labels.get(v.panelist)! }));
}
