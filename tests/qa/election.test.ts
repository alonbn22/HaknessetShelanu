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
}
