import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getElectionOutlook } from "../../src/lib/content";

// The upcoming-election section is editorial content about a live political
// process — the site's legal-safety rules apply in full: every fact, rule,
// statistic, and party entry must cite at least one https source; certainty is
// declared (confirmed / scheduled-by-law / reported); and the section carries an
// editorial lastReviewed date. The loader returns null when the file is absent,
// so these tests only run once content/election.yaml exists.

const FILE = path.join(process.cwd(), "content", "election.yaml");
const outlook = getElectionOutlook();

test("election.yaml parses when present (loader returns null otherwise)", () => {
  if (!fs.existsSync(FILE)) return; // pre-editorial state: nothing to check
  assert.ok(outlook, "content/election.yaml exists but failed schema validation");
});

if (outlook) {
  test("election outlook targets the next Knesset and is dated", () => {
    assert.ok(outlook.knesset >= 26, "must describe an upcoming Knesset");
    assert.match(outlook.lastReviewed, /^\d{4}-\d{2}-\d{2}$/, "lastReviewed must be YYYY-MM-DD");
    if (outlook.expectedDate) {
      assert.match(outlook.expectedDate, /^\d{4}-\d{2}-\d{2}$/, "expectedDate must be ISO");
    }
  });

  test("every fact, rule, and stat cites at least one https source", () => {
    for (const group of [outlook.facts, outlook.rules, outlook.stats]) {
      for (const f of group) {
        assert.ok(f.sources.length >= 1, `${f.key}: no sources`);
        for (const s of f.sources) {
          assert.ok(/^https:\/\//.test(s.url), `${f.key}: source not https: ${s.url}`);
          assert.ok(s.title, `${f.key}: source missing title`);
        }
      }
    }
  });

  test("every party entry cites at least one https source and has he+en text", () => {
    for (const p of outlook.parties) {
      assert.ok(p.sources.length >= 1, `${p.name.he}: no sources`);
      for (const s of p.sources) {
        assert.ok(/^https:\/\//.test(s.url), `${p.name.he}: source not https: ${s.url}`);
      }
      assert.ok(p.name.he && p.name.en, `party missing he/en name`);
    }
  });

  test("editorial text is authored in both Hebrew and English", () => {
    // ar/ru fall back to en (partyText); he+en must exist so no locale sees a gap.
    for (const t of [outlook.headline, outlook.intro]) {
      assert.ok(t.he && t.en, "headline/intro must carry he and en");
    }
    for (const f of [...outlook.facts, ...outlook.rules, ...outlook.stats]) {
      assert.ok(f.label.he && f.label.en, `${f.key}: label must carry he and en`);
    }
  });

  test("official links are https and labeled", () => {
    assert.ok(outlook.links.length >= 1, "at least one official link");
    for (const l of outlook.links) {
      assert.ok(/^https:\/\//.test(l.url), `link not https: ${l.url}`);
      assert.ok(l.label.he, "link label missing Hebrew");
    }
  });

  test("key dates are ISO-dated, sourced, and in chronological order", () => {
    const kd = outlook.keyDates ?? [];
    assert.ok(kd.length >= 2, "expected a key-dates timeline");
    let prev = "";
    for (const d of kd) {
      assert.match(d.date ?? "", /^\d{4}-\d{2}-\d{2}$/, `${d.key}: keyDates entry must carry an ISO date`);
      assert.ok(d.sources.length >= 1, `${d.key}: no sources`);
      assert.ok(d.date! >= prev, `${d.key}: keyDates out of order`);
      prev = d.date!;
    }
    assert.ok(kd.some((d) => d.key === "kd-lists"), "must include the lists-final milestone");
  });

  test("every leaderPersonId resolves to the RIGHT person in the DB", async () => {
    // Legal safety: a mistyped id would link a party card to the wrong person's
    // record. Cross-check the id AND that the stored name matches the leader.
    const { getDb } = await import("../../src/db");
    const { sql } = await import("drizzle-orm");
    const db = getDb();
    for (const p of outlook.parties) {
      if (p.leaderPersonId == null) continue;
      const row = db.get<{ n: string; en: string | null }>(
        sql`SELECT first_name_he || ' ' || last_name_he AS n, name_en AS en
            FROM persons WHERE id = ${p.leaderPersonId}`,
      );
      assert.ok(row, `${p.name.he}: leaderPersonId ${p.leaderPersonId} not in persons`);
      const norm = (s: string) => s.replace(/['׳]/g, "");
      const leaderHe = p.leader?.he ?? "";
      const lastNameHe = norm(leaderHe.split(" ").slice(-1)[0]);
      const rowLastHe = norm(row!.n.split(" ").slice(-1)[0]);
      // Containment either way tolerates minor spelling variants between the
      // editorial name and the registry name (e.g. גולדקנופ / גולדקנופף).
      assert.ok(
        lastNameHe.includes(rowLastHe) || rowLastHe.includes(lastNameHe),
        `${p.name.he}: person ${p.leaderPersonId} is "${row!.n}" — does not match leader "${leaderHe}"`,
      );
    }
  });
}

if (outlook) {
  test("every candidate personId resolves to the SAME name in the registry", async () => {
    // Legal safety, as for leaders: a candidate link must never open the wrong
    // person's record. Candidates are linked only on an exact Hebrew full-name
    // match, so the check is equality, not containment.
    const { getDb } = await import("../../src/db");
    const { sql } = await import("drizzle-orm");
    const db = getDb();
    const norm = (s: string) => s.replace(/['׳]/g, "").replace(/\s+/g, " ").trim();
    let linked = 0;
    for (const p of outlook.parties) {
      for (const c of p.candidates ?? []) {
        if (c.personId == null) continue;
        linked++;
        const row = db.get<{ n: string }>(
          sql`SELECT first_name_he || ' ' || last_name_he AS n FROM persons WHERE id = ${c.personId}`,
        );
        assert.ok(row, `${p.name.he}: candidate ${c.he} → personId ${c.personId} not in persons`);
        assert.equal(norm(row!.n), norm(c.he), `${p.name.he}: personId ${c.personId} is "${row!.n}", not "${c.he}"`);
      }
    }
    assert.ok(linked > 0, "expected at least one linked candidate");
  });

  test("candidate rosters are in ballot order with the leader first", () => {
    for (const p of outlook.parties) {
      if (!p.candidates?.length || !p.leader) continue;
      // Surname only, apostrophes stripped: editorial names carry titles and
      // spelling variants (ד"ר יוסף ג'בארין vs the roster's יוסף גבארין).
      const last = (s: string) => s.replace(/['׳]/g, "").trim().split(" ").slice(-1)[0];
      assert.equal(last(p.candidates[0].he), last(p.leader.he), `${p.name.he}: first candidate must be the leader`);
    }
  });
}
