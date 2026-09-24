import { test } from "node:test";
import assert from "node:assert/strict";
import { getElectionsHistory, getGlossary } from "../../src/lib/content";

test("elections history covers all 25 Knessets", () => {
  const e = getElectionsHistory();
  assert.equal(e.length, 25);
  const nums = new Set(e.map((x) => x.knesset));
  for (let k = 1; k <= 25; k++) assert.ok(nums.has(k), `missing Knesset ${k}`);
});

test("every Knesset term has summary, events and 'ended'", () => {
  for (const e of getElectionsHistory()) {
    assert.ok(e.summary, `K${e.knesset} missing summary`);
    assert.ok(e.events && e.events.length > 0, `K${e.knesset} missing events`);
    assert.ok(e.ended, `K${e.knesset} missing ended`);
    for (const ev of e.events!) {
      assert.ok(["good", "bad", "neutral"].includes(ev.kind), "valid event kind");
      assert.ok(ev.text.he, "event has Hebrew text");
    }
  }
});

test("glossary includes the Norwegian Law term", () => {
  const terms = getGlossary();
  const found = terms.some(
    (t) => t.term.he.includes("נורווגי") || (t.term.en ?? "").includes("Norwegian"),
  );
  assert.ok(found, "Norwegian Law term should exist in the glossary");
});

test("every glossary term cites a source that is not Wikipedia", () => {
  for (const t of getGlossary()) assert.ok(!/wikipedia\.org/.test(t.sourceUrl), `${t.term.en}: Wikipedia is an index, not a source`);
});

// Editorial text that falls back to another language: `dir` is set only when
// the fallback's direction differs from the page's. English on a Russian,
// Spanish or French page is a language change, not a direction change — a
// `dir` there used to trigger text-end and right-align whole paragraphs.
test("partyTextAttrs marks the fallback language, and direction only when it differs", async () => {
  const { partyTextAttrs, partyTextClass } = await import("../../src/lib/content");
  const heEn = { he: "שלום", en: "Hello" };
  assert.deepEqual(partyTextAttrs(heEn, "he"), {});
  assert.deepEqual(partyTextAttrs(heEn, "en"), {});
  assert.deepEqual(partyTextAttrs(heEn, "es"), { lang: "en" });
  assert.deepEqual(partyTextAttrs(heEn, "ru"), { lang: "en" });
  assert.deepEqual(partyTextAttrs(heEn, "ar"), { dir: "ltr", lang: "en" });
  assert.deepEqual(partyTextAttrs({ he: "שלום" }, "fr"), { dir: "rtl", lang: "he" });
  assert.equal(partyTextClass(heEn, "es"), "");
  assert.equal(partyTextClass(heEn, "ar"), "text-end");
});
