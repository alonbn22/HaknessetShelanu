import { test } from "node:test";
import assert from "node:assert/strict";
import {
  govDuty,
  govMinistry,
  govCommittee,
  govVoteItemType,
} from "../../src/lib/gov-terms";

test("govMinistry translates known ministries", () => {
  assert.equal(govMinistry("משרד האוצר", "en").text, "Ministry of Finance");
  assert.equal(govMinistry("משרד האוצר", "ru").text, "Министерство финансов");
  assert.equal(govMinistry("משרד האוצר", "ar").text, "وزارة المالية");
});

test("govMinistry returns Hebrew (he locale) and flags rtl", () => {
  const r = govMinistry("משרד האוצר", "he");
  assert.equal(r.text, "משרד האוצר");
  assert.equal(r.rtl, true);
});

test("govDuty translates duties; unknown falls back to Hebrew rtl", () => {
  assert.equal(govDuty("ראש הממשלה", "en").text, "Prime Minister");
  const unknown = govDuty("תפקיד שלא קיים במפה", "en");
  assert.equal(unknown.text, "תפקיד שלא קיים במפה");
  assert.equal(unknown.rtl, true); // Hebrew fallback must be flagged rtl
});

test("English translations are not flagged rtl", () => {
  assert.equal(govDuty("שר", "en").rtl, false);
});

test("govVoteItemType translates the bill tag", () => {
  assert.equal(govVoteItemType("הצעת חוק", "en").text, "Bill");
  assert.equal(govVoteItemType("הצעת חוק", "ru").text, "Законопроект");
});

test("govCommittee translates standing committees, falls back otherwise", () => {
  assert.equal(govCommittee("ועדת הכספים", "en").text, "Finance Committee");
  const adhoc = govCommittee("הוועדה המיוחדת לדיון בהצעת חוק כלשהי", "en");
  assert.equal(adhoc.rtl, true); // unmapped → Hebrew
});


// Every ministry and duty the Knesset record holds is curated in all five
// languages — an unmapped one would show Hebrew on every non-Hebrew page.
test("every ministry and duty in the record is translated in every language", async () => {
  const { getDb, schema } = await import("../../src/db");
  const rows = getDb()
    .selectDistinct({ ministry: schema.personPositions.govMinistryNameHe, duty: schema.personPositions.positionDescHe })
    .from(schema.personPositions)
    .all();
  const missing = new Set<string>();
  for (const { ministry, duty } of rows) {
    for (const locale of ["en", "ar", "ru", "es", "fr"]) {
      if (ministry && govMinistry(ministry, locale).rtl) missing.add(`ministry ${locale}: ${ministry}`);
      if (duty && govDuty(duty, locale).rtl) missing.add(`duty ${locale}: ${duty}`);
    }
  }
  assert.deepEqual([...missing], []);
});
