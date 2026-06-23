import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Guards against untranslated UI: a Hebrew string literal in a component almost
// always means hardcoded text that should go through t(). Hebrew *data* is
// rendered from variables (e.g. {l.nameHe}), so it never appears as a literal in
// source — only genuine leaks do. Allow-list covers intentional exceptions.
const SRC = path.join(process.cwd(), "src");
const HEBREW = /[֐-׿]/;

// Files allowed to contain Hebrew literals, with the reason.
const ALLOW = new Set<string>([
  "components/LanguageSwitcher.tsx", // language endonyms ("עברית") shown in their own script
]);

function tsxFiles(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) tsxFiles(full, acc);
    else if (e.name.endsWith(".tsx")) acc.push(full);
  }
  return acc;
}

test("no hardcoded Hebrew literals in components (use t() instead)", () => {
  const offenders: string[] = [];
  for (const file of tsxFiles(SRC)) {
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
    `Hebrew literals found (move to messages/*.json and use t()): ${offenders.join(", ")}`,
  );
});
