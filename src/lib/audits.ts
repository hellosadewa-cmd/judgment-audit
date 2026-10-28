// Creating audits and reviewer sessions.
import { randomBytes, randomUUID } from "node:crypto";
import type { Audit, Session, TestItem, Work } from "./types.ts";
import { originalItems, planTestSet, repeatItems, sessionOrder } from "./testset.ts";
import { backgroundVariant, neutralFrame, type VariantMaker } from "./variants.ts";
import { saveAudit, saveImage, updateAudit } from "./store.ts";

export const DEFAULT_QUESTION = "How ready is this work to send to the client?";

export async function createAudit(
  title: string,
  images: { name: string; data: Buffer }[],
  makeVariant: VariantMaker = backgroundVariant,
): Promise<Audit> {
  const id = randomUUID().slice(0, 8);
  const works: Work[] = [];
  for (const [i, image] of images.entries()) {
    const workId = `w${i + 1}`;
    const file = `${workId}.jpg`;
    await saveImage(id, file, await neutralFrame(image.data));
    works.push({ id: workId, file });
  }
  const plan = planTestSet(works, id);
  const variants: TestItem[] = [];
  for (const [i, workId] of plan.variants.entries()) {
    const source = images[works.findIndex((w) => w.id === workId)].data;
    const variant = await makeVariant(source, i);
    const file = `${workId}-variant.jpg`;
    await saveImage(id, file, variant.data);
    variants.push({ id: `v-${workId}`, kind: "variant", workId, file, change: variant.change });
  }
  const audit: Audit = {
    id,
    createdAt: new Date().toISOString(),
    title: title.trim() || "Untitled audit",
    question: DEFAULT_QUESTION,
    scale: { min: 1, max: 10 },
    works,
    items: [...originalItems(works), ...repeatItems(works, plan), ...variants],
    sessions: [],
    adminToken: randomBytes(16).toString("hex"),
  };
  await saveAudit(audit);
  return audit;
}

export function startSession(auditId: string): Promise<Session> {
  return updateAudit(auditId, (audit) => {
    const id = randomUUID();
    const session: Session = {
      id,
      label: `R${audit.sessions.length + 1}`,
      guess: null,
      order: sessionOrder(audit.items, id),
      ratings: {},
      startedAt: new Date().toISOString(),
      finishedAt: null,
    };
    audit.sessions.push(session);
    return session;
  });
}
