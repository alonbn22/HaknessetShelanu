import { test } from "node:test";
import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { getDb } from "../../src/db";

const db = getDb();

// Guards the MkId-remap regression permanently: the Knesset vote feed records
// voters under MkIds that differ from PersonIDs; if the remap ever stops
// running, recent votes show every MK as "did not vote" while the header
// totals say otherwise. This asserts that never happens again.
test("every current-Knesset vote with recorded totals has resolvable voters", () => {
  const row = db.get<{ c: number }>(
    sql`SELECT COUNT(*) AS c FROM votes v
        WHERE v.knesset_num = 25
          AND (v.total_for + v.total_against + v.total_abstain) > 0
          AND NOT EXISTS (
            SELECT 1 FROM vote_results vr
            JOIN persons p ON p.id = vr.person_id
            WHERE vr.vote_id = v.id
          )`,
  );
  assert.equal(row?.c, 0, `${row?.c} votes have totals but zero resolvable voters`);
});

// Guards the db:push-drop regression: mk_id_map must be declared in schema.ts
// (drizzle-kit push --force drops undeclared tables) and populated by the sync.
test("mk_id_map exists and is populated", () => {
  const row = db.get<{ c: number }>(sql`SELECT COUNT(*) AS c FROM mk_id_map`);
  assert.ok((row?.c ?? 0) > 0, "mk_id_map is empty or missing");
});
