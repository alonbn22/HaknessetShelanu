import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getMemberRecord } from "../../src/lib/content";

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

for (const id of ids) {
  test(`member ${id}: every claim is sourced and well-formed`, () => {
    const rec = getMemberRecord(id);
    assert.ok(rec, `record ${id} should parse`);
    for (const c of rec!.claims) {
      assert.ok(c.sources.length >= 1, `${id}: a claim has no source`);
      for (const s of c.sources) {
        assert.ok(/^https:\/\//.test(s.url), `${id}: source not https: ${s.url}`);
        assert.ok(s.title, `${id}: source missing title`);
      }
      assert.ok(c.title.he, `${id}: claim missing Hebrew title`);
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
