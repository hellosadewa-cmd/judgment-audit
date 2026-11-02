// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { replication, verdict } from "../src/lib/niche.ts";
import { checkCuration } from "../src/lib/curation.ts";

const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
const c = "33333333-3333-4333-8333-333333333333";

test("replication counts a work when more curators accept the AI version than reject it, and leaves ties out", () => {
  const r = replication(["w1", "w2", "w3", "w4"], [
    { curator: a, workId: "w1", acceptable: true },
    { curator: b, workId: "w1", acceptable: true },
    { curator: c, workId: "w1", acceptable: false },
    { curator: a, workId: "w2", acceptable: false },
    { curator: b, workId: "w2", acceptable: false },
    { curator: a, workId: "w3", acceptable: true },
    { curator: b, workId: "w3", acceptable: false },
  ]);
  assert.equal(r.decided, 2); // w3 is a tie, w4 has no votes
  assert.equal(r.replicated, 1);
  assert.equal(r.rate, 0.5);
  assert.equal(r.curators, 3);
  assert.equal(replication(["w1"], []).rate, null);
});

test("the verdict follows the rules fixed before curation", () => {
  assert.equal(verdict(0.5, 2), "move-up");
  assert.equal(verdict(0.8, 1), "leave");
  assert.equal(verdict(0.4, 3), "build");
  assert.equal(verdict(0.1, 0), "test-demand");
});

test("curation votes are checked", () => {
  const works = ["w1"];
  assert.equal(checkCuration({ curator: a, workId: "w1", acceptable: true }, works), null);
  assert.match(checkCuration({ curator: "Budi", workId: "w1", acceptable: true }, works)!, /curator/);
  assert.match(checkCuration({ curator: a, workId: "w9", acceptable: true }, works)!, /work/);
  assert.match(checkCuration({ curator: a, workId: "w1", acceptable: "yes" }, works)!, /yes or no/);
});
