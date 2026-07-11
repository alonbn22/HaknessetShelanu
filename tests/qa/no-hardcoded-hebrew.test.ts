import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Guards against untranslated UI: a Hebrew string literal in source almost always
// means hardcoded text that should go through t(). Hebrew *data* is rendered from
// variables (e.g. {l.nameHe}), so it never appears as a literal — only genuine
// leaks do. Scans BOTH .tsx components and .ts lib code (AGENTS.md: "No Hebrew
// literals in src/"); the allow-list covers files that legitimately embed Hebrew
// as *data* (translation maps, matchers against Hebrew API columns).
const SRC = path.join(process.cwd(), "src");
const HEBREW = /[֐-׿]/;

// Files allowed to contain Hebrew literals, with the reason each is exempt.
const ALLOW = new Set<string>([
  "components/LanguageSwitcher.tsx", // language endonyms ("עברית") shown in their own script
  "lib/gov-terms.ts", // curated Hebrew→en/ar/ru term map — the Hebrew IS the data
  "lib/votes-meta.ts", // classifies Hebrew vote-description text (voteKind matcher)
  "lib/queries.ts", // SQL LIKE patterns matching the Hebrew forDesc column
]);

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) sourceFiles(full, acc);
    else if (e.name.endsWith(".tsx") || e.name.endsWith(".ts")) acc.push(full);
  }
  return acc;
}

test("no hardcoded Hebrew literals in src (use t() / \\u escapes / messages)", () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const rel = path.relative(SRC, file);
    if (ALLOW.has(rel)) continue;
    const text = fs.readFileSync(file, "utf8");
    if (HEBREW.test(text)) {
      const line = text.split("\n").findIndex((l) => HEBREW.test(l)) + 1;
      offenders.push(`${rel}:${line}`);
    }
  }
  assert.equal(
    offenders.length,
    0,
    `Hebrew literals found (use t()/messages, \\u escapes for matchers, or allow-list data files): ${offenders.join(", ")}`,
  );
});
