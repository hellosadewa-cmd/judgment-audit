import { updateAudit } from "@/lib/store.ts";

export const runtime = "nodejs";

interface Body {
  guess?: number;
  /** Position in this reviewer's order (0-based). Item ids are never sent to reviewers. */
  position?: number;
  score?: number;
  finish?: boolean;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; sid: string }> }) {
  const { id, sid } = await params;
  const body = (await request.json()) as Body;
  try {
    const result = await updateAudit(id, (audit) => {
      const session = audit.sessions.find((s) => s.id === sid);
      if (!session) throw new Error("Session not found.");
      if (session.finishedAt) throw new Error("This session is already finished.");

      if (typeof body.guess === "number") {
        if (body.guess < 0 || body.guess > 100) throw new Error("Guess must be 0–100.");
        session.guess = body.guess;
      }
      if (typeof body.position === "number") {
        const itemId = session.order[body.position];
        const { min, max } = audit.scale;
        if (!itemId) throw new Error("Unknown position.");
        if (!Number.isInteger(body.score) || body.score! < min || body.score! > max)
          throw new Error(`Score must be a whole number from ${min} to ${max}.`);
        session.ratings[itemId] = body.score!;
      }
      const rated = Object.keys(session.ratings).length;
      if (body.finish) {
        if (rated < session.order.length) throw new Error("Rate every item before finishing.");
        session.finishedAt = new Date().toISOString();
      }
      return { rated, done: session.finishedAt !== null };
    });
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 });
  }
}
