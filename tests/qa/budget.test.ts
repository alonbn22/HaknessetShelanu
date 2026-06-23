import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getBudgetMeta,
  getBudgetSections,
  getBudgetLines,
  getBudgetDetailedYears,
  getBudgetTimeline,
  getCurrentKnessetBudget,
} from "../../src/lib/queries";
import { localizeData } from "../../src/lib/i18n-data";
import { getBudgetOutlook } from "../../src/lib/content";

test("multiple detailed years are available (≈ past 10)", () => {
  const years = getBudgetDetailedYears();
  assert.ok(years.length >= 8, `expected several detailed years, got ${years.length}`);
  // sorted newest-first
  for (let i = 1; i < years.length; i++) assert.ok(years[i - 1] > years[i]);
});

test("the newest year has named lines and a positive total", () => {
  const m = getBudgetMeta(); // newest (recent, program-level)
  assert.ok(m.year && m.year >= 2009);
  assert.ok(m.lineCount > 100, `expected many lines, got ${m.lineCount}`);
  assert.ok(m.totalThousands > 0);
});

test("an older detailed year is itemized to thousands of lines", () => {
  const m = getBudgetMeta(2018);
  assert.equal(m.year, 2018);
  assert.ok(m.lineCount > 1000, `expected thousands of lines, got ${m.lineCount}`);
});

test("getBudgetMeta respects the requested year", () => {
  const years = getBudgetDetailedYears();
  const oldest = years[years.length - 1];
  const m = getBudgetMeta(oldest);
  assert.equal(m.year, oldest);
});

test("section breakdown reconciles to that year's total", () => {
  const m = getBudgetMeta();
  const sections = getBudgetSections(m.year ?? undefined);
  const sum = sections.reduce((s, x) => s + x.totalThousands, 0);
  assert.equal(sum, m.totalThousands);
});

test("timeline spans detailed + recent years and current-Knesset total sums its years", () => {
  const tl = getBudgetTimeline();
  assert.ok(tl.length >= 10, "expected a multi-year timeline");
  const ck = getCurrentKnessetBudget();
  const sum = ck.years.reduce((s, y) => s + y.totalThousands, 0);
  assert.equal(sum, ck.totalThousands);
  if (ck.years.length > 0) assert.ok(ck.totalThousands > 0);
});

test("line search filters and paginates within a year", () => {
  const all = getBudgetLines({ year: 2018 });
  assert.ok(all.total > 1000 && all.items.length <= 50);
  const narrowed = getBudgetLines({ year: 2018, search: "ביטחון" });
  assert.ok(narrowed.total > 0 && narrowed.total < all.total);
});

test("recent years are searchable too (named via the code dictionary)", () => {
  const recent = getBudgetLines({ year: 2025 });
  assert.ok(recent.total > 100, `2025 should have program lines, got ${recent.total}`);
  const narrowed = getBudgetLines({ year: 2025, search: "ביטחון" });
  assert.ok(narrowed.total > 0 && narrowed.total < recent.total);
});

test("budget outlook covers an upcoming year with status and links", () => {
  const o = getBudgetOutlook();
  assert.ok(o.length > 0, "expected at least one outlook entry");
  const y2026 = o.find((e) => e.year === 2026);
  assert.ok(y2026, "expected a 2026 outlook entry");
  assert.ok(["pending", "proposed", "in-knesset", "approved"].includes(y2026!.status));
  assert.ok(y2026!.headline.he && y2026!.headline.en);
  assert.ok((y2026!.links?.length ?? 0) > 0, "expected official links");
});

test("unified cache localizes ministry names for non-Hebrew locales", () => {
  const sections = getBudgetSections().map((s) => s.nameHe).filter(Boolean) as string[];
  const map = localizeData(sections, "en");
  // at least some ministries should be translated (sections were migrated/cached)
  const translated = sections.filter((n) => map.get(n)?.translated);
  assert.ok(translated.length > 0, "expected some translated ministry names");
  // Hebrew locale: identity, never flagged translated
  const he = localizeData(sections, "he");
  assert.ok([...he.values()].every((v) => !v.translated && v.rtl));
});

test("section filter only returns lines from that section", () => {
  const section = getBudgetSections()[0];
  const res = getBudgetLines({ section: section.code as number });
  assert.ok(res.total > 0);
  for (const l of res.items) assert.equal(l.sectionCode, section.code);
});
