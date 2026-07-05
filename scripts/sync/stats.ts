import { sql } from "drizzle-orm";
import { getDb } from "../../src/db";
import {
  CURRENT_KNESSET,
  POSITION_MK_MALE,
  POSITION_MK_FEMALE,
  VOTE_FOR,
  VOTE_AGAINST,
  VOTE_ABSTAIN,
} from "../../src/lib/constants";

// Per-MK voting stats. "Votes held" counts plenum votes that took place
// during the member's MK tenure (positions 43/61), so members who joined
// or left mid-term aren't penalized for votes they couldn't attend.
export function computeMkStats() {
  const db = getDb();
  console.log("Computing per-MK vote statistics…");

  db.run(sql`DELETE FROM mk_vote_stats WHERE knesset_num = ${CURRENT_KNESSET}`);

  db.run(sql`
    INSERT INTO mk_vote_stats
      (person_id, knesset_num, votes_held, participated, voted_for, voted_against, abstained, missed, participation_pct)
    SELECT
      mk.person_id,
      ${CURRENT_KNESSET},
      held.cnt,
      COALESCE(res.participated, 0),
      COALESCE(res.voted_for, 0),
      COALESCE(res.voted_against, 0),
      COALESCE(res.abstained, 0),
      MAX(held.cnt - COALESCE(res.participated, 0), 0),
      CASE WHEN held.cnt > 0
        THEN ROUND(100.0 * COALESCE(res.participated, 0) / held.cnt, 1)
        ELSE 0 END
    FROM
      (SELECT DISTINCT person_id FROM person_positions
        WHERE knesset_num = ${CURRENT_KNESSET}
          AND position_id IN (${POSITION_MK_MALE}, ${POSITION_MK_FEMALE})) mk
    JOIN
      (SELECT pp.person_id, COUNT(DISTINCT v.id) AS cnt
        FROM person_positions pp
        JOIN votes v
          ON v.date_time >= pp.start_date
         AND (pp.finish_date IS NULL OR v.date_time <= pp.finish_date)
        WHERE pp.knesset_num = ${CURRENT_KNESSET}
          AND pp.position_id IN (${POSITION_MK_MALE}, ${POSITION_MK_FEMALE})
          AND v.knesset_num = ${CURRENT_KNESSET}
        GROUP BY pp.person_id) held
      ON held.person_id = mk.person_id
    LEFT JOIN
      (SELECT vr.person_id,
              SUM(CASE WHEN vr.result_code IN (${VOTE_FOR}, ${VOTE_AGAINST}, ${VOTE_ABSTAIN}) THEN 1 ELSE 0 END) AS participated,
              SUM(CASE WHEN vr.result_code = ${VOTE_FOR} THEN 1 ELSE 0 END) AS voted_for,
              SUM(CASE WHEN vr.result_code = ${VOTE_AGAINST} THEN 1 ELSE 0 END) AS voted_against,
              SUM(CASE WHEN vr.result_code = ${VOTE_ABSTAIN} THEN 1 ELSE 0 END) AS abstained
        FROM vote_results vr
        JOIN votes v ON v.id = vr.vote_id AND v.knesset_num = ${CURRENT_KNESSET}
        GROUP BY vr.person_id) res
      ON res.person_id = mk.person_id
  `);

  const row = getDb().get<{ n: number }>(
    sql`SELECT COUNT(*) AS n FROM mk_vote_stats WHERE knesset_num = ${CURRENT_KNESSET}`,
  );
  console.log(`  stats for ${row?.n} members`);
}

// Pairwise voting agreement between every two MKs in mk_vote_stats (~9.4k
// pairs, stored in both directions so reads are PK-prefix scans). One
// set-based self-join over real votes (for/against/abstain); measured ~30s —
// fine inside the 6-hourly sync. Powers the "voted most/least similarly"
// lists on member pages.
export function computeMkAgreement() {
  const db = getDb();
  console.log("Computing pairwise MK voting agreement…");

  // Self-sufficient DDL: matches schema.ts exactly so db:push sees it in-sync.
  db.run(sql`
    CREATE TABLE IF NOT EXISTS mk_agreement (
      person_a integer NOT NULL,
      person_b integer NOT NULL,
      both_voted integer NOT NULL,
      agreed integer NOT NULL,
      pct real NOT NULL,
      PRIMARY KEY (person_a, person_b)
    )
  `);
  db.run(sql`DELETE FROM mk_agreement`);

  db.run(sql`
    INSERT INTO mk_agreement (person_a, person_b, both_voted, agreed, pct)
    SELECT
      a.person_id,
      b.person_id,
      COUNT(*),
      SUM(CASE WHEN a.result_code = b.result_code THEN 1 ELSE 0 END),
      ROUND(100.0 * SUM(CASE WHEN a.result_code = b.result_code THEN 1 ELSE 0 END) / COUNT(*), 1)
    FROM vote_results a
    JOIN vote_results b
      ON b.vote_id = a.vote_id AND b.person_id > a.person_id
    WHERE a.result_code IN (${VOTE_FOR}, ${VOTE_AGAINST}, ${VOTE_ABSTAIN})
      AND b.result_code IN (${VOTE_FOR}, ${VOTE_AGAINST}, ${VOTE_ABSTAIN})
      AND a.person_id IN (SELECT person_id FROM mk_vote_stats WHERE knesset_num = ${CURRENT_KNESSET})
      AND b.person_id IN (SELECT person_id FROM mk_vote_stats WHERE knesset_num = ${CURRENT_KNESSET})
    GROUP BY a.person_id, b.person_id
  `);
  // Mirror direction so any member's rows are one PK-prefix scan.
  db.run(sql`
    INSERT INTO mk_agreement (person_a, person_b, both_voted, agreed, pct)
    SELECT person_b, person_a, both_voted, agreed, pct FROM mk_agreement
  `);

  const row = db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM mk_agreement`);
  console.log(`  ${row?.n} agreement pairs (both directions)`);
}
