import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { routing } from "../../src/i18n/routing";

// The privacy decisions of 27 Sep 2026: no cookies (the language lives in the
// URL), compass answers stay in the tab, and nothing calls Google Translate —
// not the site, and since 3 Oct 2026 not the scripts either (data translations
// are checked batches imported with scripts/sync/translations.ts).
const SRC = path.join(process.cwd(), "src");
const SCRIPTS = path.join(process.cwd(), "scripts");

function sourceFiles(dir: string, acc: string[] = []): string[] {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) sourceFiles(full, acc);
    else if (/\.(ts|tsx|mjs)$/.test(e.name)) acc.push(full);
  }
  return acc;
}

test("next-intl sets no locale cookie and ignores Accept-Language", () => {
  assert.equal(routing.localeCookie, false);
  assert.equal(routing.localeDetection, false);
});

test("compass answers are never stored or sent", () => {
  const files = [
    path.join(SRC, "app", "[locale]", "quiz", "PartyQuiz.tsx"),
    ...sourceFiles(path.join(SRC, "app", "[locale]", "elections", "find")),
  ];
  const banned = [
    "localStorage",
    "sessionStorage",
    "indexedDB",
    "document.cookie",
    "fetch(",
    "useRouter",
    "useSearchParams",
    "navigator.sendBeacon",
  ];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const b of banned) {
      assert.ok(!text.includes(b), `${path.relative(SRC, file)} uses ${b}`);
    }
  }
});

test("nothing in src/ or scripts/ calls Google Translate", () => {
  for (const file of [...sourceFiles(SRC), ...sourceFiles(SCRIPTS)]) {
    const text = fs.readFileSync(file, "utf8");
    assert.ok(!/translate\.googleapis\.com|translate_a\/single/.test(text), `${path.relative(process.cwd(), file)} calls Google Translate`);
  }
});
