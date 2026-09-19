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
    for (const group of [outlook.facts, outlook.rules, outlook.stats, outlook.howToVote]) {
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

if (outlook) {
  test("every running list has a unique kebab-case slug, and factionIds are live factions", async () => {
    // The slug is the identity polls and compass stances key on; a duplicate
    // would merge two lists' data, a bad factionId would link a card to a
    // defunct faction (Religious Zionism once pointed at the 2022 joint list).
    const seen = new Set<string>();
    for (const p of outlook.parties) {
      assert.match(p.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${p.name.he}: slug "${p.slug}" is not kebab-case`);
      assert.ok(!seen.has(p.slug), `duplicate slug ${p.slug}`);
      seen.add(p.slug);
    }
    const { getDb } = await import("../../src/db");
    const { sql } = await import("drizzle-orm");
    const db = getDb();
    for (const p of outlook.parties) {
      if (p.factionId == null) continue;
      const row = db.get<{ cur: number; name: string }>(
        sql`SELECT is_current AS cur, name_he AS name FROM factions WHERE id = ${p.factionId}`,
      );
      assert.ok(row, `${p.name.he}: factionId ${p.factionId} not in factions`);
      assert.equal(row!.cur, 1, `${p.name.he}: factionId ${p.factionId} ("${row!.name}") is not a current faction`);
    }
  });
}

if (outlook) {
  test("surplus-vote agreements pair two running lists, each list at most once, and cite sources", () => {
    const slugs = new Set(outlook.parties.map((p) => p.slug));
    const used = new Map<string, string>();
    for (const a of outlook.surplusAgreements) {
      const [x, y] = a.between;
      assert.notEqual(x, y, "an agreement needs two different lists");
      for (const s of [x, y]) {
        assert.ok(slugs.has(s), `surplus agreement names unknown list "${s}"`);
        assert.ok(!used.has(s), `${s} appears in two surplus agreements (${used.get(s)} and ${x}-${y})`);
        used.set(s, `${x}-${y}`);
      }
      assert.match(a.date, /^\d{4}-\d{2}-\d{2}$/);
      for (const src of a.sources) assert.ok(/^https:\/\//.test(src.url), `${x}-${y}: source not https`);
    }
  });

  test("every running list carries its CEC page: official name, requested letters, submitting parties", () => {
    for (const p of outlook.parties) {
      assert.ok(p.cec, `${p.slug}: no cec block — the CEC list page is the primary source for letters and names`);
      assert.match(p.cec.url, /^https:\/\/www\.gov\.il\//, `${p.slug}: cec.url must be the gov.il page`);
      assert.ok(p.cec.listName.he.length > 0 && p.cec.letters.length > 0, `${p.slug}: cec name/letters missing`);
      assert.ok(p.cec.submittedBy.length >= 1, `${p.slug}: submittedBy empty`);
      assert.ok(p.cec.published <= outlook.lastReviewed, `${p.slug}: cec.published after lastReviewed`);
    }
  });

  test("the submitted-lists table is complete, unique, and points back at the registry", () => {
    const table = outlook.submittedLists;
    assert.ok(table, "submittedLists missing");
    const numbers = new Set<number>();
    const urls = new Set<string>();
    const slugs = new Set(outlook.parties.map((p) => p.slug));
    for (const l of table.lists) {
      assert.ok(!numbers.has(l.listNumber), `list number ${l.listNumber} repeated`);
      numbers.add(l.listNumber);
      assert.ok(!urls.has(l.url), `list url repeated: ${l.url}`);
      urls.add(l.url);
      assert.match(l.url, /^https:\/\/www\.gov\.il\//, `${l.listNumber}: url must be the CEC page`);
      if (l.slug) assert.ok(slugs.has(l.slug), `${l.listNumber}: slug ${l.slug} not in the registry`);
    }
    // Every registry list appears in the table exactly once, with the same letters and page.
    for (const p of outlook.parties) {
      const rows: typeof table.lists = table.lists.filter((l) => l.slug === p.slug);
      assert.equal(rows.length, 1, `${p.slug}: expected one table row, got ${rows.length}`);
      assert.equal(rows[0].letters, p.cec?.letters, `${p.slug}: letters differ between card and table`);
      assert.equal(rows[0].url, p.cec?.url, `${p.slug}: CEC page differs between card and table`);
    }
    // The CEC numbered 38 lists on 18 Sep 2026; a shorter table means a row was lost.
    assert.ok(table.lists.length >= 38, `expected all 38 submitted lists, got ${table.lists.length}`);
  });
}
