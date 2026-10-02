import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getMemberRecord } from "../../src/lib/content";
import { getMember } from "../../src/lib/queries";

// Legal safeguard: every per-member claim — especially negative ones — must cite
// at least one verifiable (https) source, and any non-final legal matter must
// carry a status so guilt is never implied. Enforced for every record file.
const DIR = path.join(process.cwd(), "content", "members");

// Words that signal an actual legal proceeding (not a political controversy), in
// English and Hebrew. A negative claim matching these must carry a legal status.
// (This test lives outside src/, so Hebrew literals are allowed here.)
const LEGAL_PROCEEDING =
  /indict|convict|acquit|\btrial\b|prosecut|\bcourt\b|criminal charge|\bfraud\b|bribery|breach of trust|\binvestigat|חקירה|כתב אישום|הרשע|משפט פלילי|שוחד|מרמה|הפרת אמונים|כתב תביעה/i;
const ids = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith(".yaml"))
  .map((f) => parseInt(f.replace(".yaml", ""), 10));

test("there are curated member records", () => {
  assert.ok(ids.length >= 2, "expected several member records");
});

// Wikipedia and Wikidata are indexes, not sources: a claim about a person
// needs at least one source beyond them. No exceptions: the last two were
// re-sourced or cut on 2 Oct 2026.
const WIKI = /^https:\/\/([a-z]+\.)?(m\.)?(wikipedia|wikidata)\.org\//;

test("no member claim rests on Wikipedia alone", () => {
  const found: string[] = [];
  for (const id of ids) {
    for (const c of getMemberRecord(id)!.claims) {
      if (c.sources.every((s) => WIKI.test(s.url))) found.push(`${id}:${c.title.en ?? c.title.he}`);
    }
  }
  assert.deepEqual(found, [], "cite a source beyond Wikipedia");
});

for (const id of ids) {
  test(`member ${id}: every claim is sourced and well-formed`, () => {
    const rec = getMemberRecord(id);
    assert.ok(rec, `record ${id} should parse`);
    for (const c of rec!.claims) {
      assert.ok(c.sources.length >= 1, `${id}: a claim has no source`);
      for (const s of c.sources) {
        assert.ok(/^https:\/\//.test(s.url), `${id}: source not https: ${s.url}`);
        assert.ok(s.title, `${id}: source missing title`);
        // The Knesset site numbers members by its own id, not the OData
        // PersonID: a PersonID here opens an empty page or another member's.
        // (Same for the member's other pages: roles, public activity.)
        const mk = s.url.match(/\/mk\/apps\/mk\/mk-[a-z-]+\/(\d+)/);
        if (mk) {
          const site = getMember(id)?.mkSiteCode;
          assert.equal(Number(mk[1]), site, `${id}: Knesset member link must use site id ${site}, not ${mk[1]}`);
        }
      }
      assert.ok(c.title.he, `${id}: claim missing Hebrew title`);
      // Neutral items are dated news or roles — never an undated verdict-free
      // way to park an accusation.
      if (c.kind === "neutral") {
        assert.ok(c.category === "news" || c.category === "role", `${id}: neutral claim must be news or role`);
        assert.ok(c.date, `${id}: neutral claim "${c.title.he}" needs a date`);
      } else {
        assert.ok(c.category !== "news" && c.category !== "role", `${id}: news/role items must be kind neutral`);
      }
      // Negative claims in a court category must declare a status.
      if (c.kind === "negative" && (c.category === "conviction" || c.category === "investigation")) {
        assert.ok(c.status, `${id}: legal claim "${c.title.en ?? c.title.he}" must set a status`);
      }
      // Presumption of innocence: a negative claim whose text reads like a legal
      // PROCEEDING must carry a status even if it's filed under another category
      // (e.g. "controversy") — so a court matter can't dodge the requirement.
      // Non-legal controversies (political remarks, withdrawn bills) don't match.
      if (c.kind === "negative" && !c.status) {
        const text = `${c.title.he ?? ""} ${c.title.en ?? ""}`;
        assert.ok(
          !LEGAL_PROCEEDING.test(text),
          `${id}: negative claim "${c.title.en ?? c.title.he}" reads as a legal proceeding but has no status`,
        );
      }
    }
  });
}
