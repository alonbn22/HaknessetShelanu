import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Guards the site's RTL correctness, which `tsc` and ESLint cannot see: Hebrew and
// Arabic are RTL, so a physical direction (left/right) silently mirrors the layout
// wrongly in two of the four locales. Everything must use logical properties —
// ms-/me-/ps-/pe-, border-s/-e, rounded-s/-e, text-start/-end, start-/end-,
// inset-inline-*, margin-inline-*. The codebase is already clean; this keeps it so.
const SRC = path.join(process.cwd(), "src");

// Files allowed to use physical directions, with the reason each is exempt.
const ALLOW = new Set<string>([
  // Political left↔right is a fixed semantic axis, not text flow. The component
  // sets dir="ltr" on its own root so the scale reads identically in every locale.
  "components/SpectrumBar.tsx",
]);

// Each rule is [label, regex]. Class-name rules anchor on a token boundary
// (start, whitespace, quote, backtick or brace) so they can't match mid-word —
// e.g. `border-l` must not fire on `border-line`, nor `rounded-l` on `rounded-lg`.
const B = String.raw`(?:^|[\s"'\`{}])`;
const RULES: [string, RegExp][] = [
  ["margin/padding (use ms-/me-/ps-/pe-)", new RegExp(`${B}-?(?:ml|mr|pl|pr)-[a-z0-9.[(]`)],
  ["border side (use border-s-/border-e-)", new RegExp(`${B}border-[lr](?![a-z])`)],
  ["corner radius (use rounded-s*/rounded-e*)", new RegExp(`${B}rounded-[lr](?![a-z])`)],
  ["text alignment (use text-start/text-end)", new RegExp(`${B}text-(?:left|right)(?![a-z-])`)],
  ["absolute offset (use start-/end-)", new RegExp(`${B}-?(?:left|right)-[a-z0-9.[(]`)],
  ["float (use float-start/float-end)", new RegExp(`${B}float-(?:left|right)(?![a-z-])`)],
  ["JS style prop (use marginInlineStart etc.)", /\b(?:margin|padding|border)(?:Left|Right)\b/],
  ["JS textAlign (use \"start\"/\"end\")", /textAlign\s*:\s*["'`](?:left|right)["'`]/],
  ["CSS/JS offset (use inset-inline-start/end)", /(?:^|[^-\w])(?:left|right)\s*:\s*[^;,)]/m],
  ["CSS physical box side (use *-inline-start/end)", /\b(?:margin|padding|border)-(?:left|right)\b/],
  ["CSS text-align (use start/end)", /text-align\s*:\s*(?:left|right)\b/],
];

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) sourceFiles(full, acc);
    else if (/\.(tsx?|css)$/.test(e.name)) acc.push(full);
  }
  return acc;
}

test("no physical direction utilities in src (RTL locales mirror them wrongly)", () => {
  const offenders: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const rel = path.relative(SRC, file);
    if (ALLOW.has(rel)) continue;
    const lines = fs.readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      // Comments explain direction handling constantly; only code is checked.
      const code = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
      for (const [label, re] of RULES) {
        if (re.test(code)) offenders.push(`${rel}:${i + 1} — ${label}`);
      }
    });
  }
  assert.equal(
    offenders.length,
    0,
    `Physical direction used in ${offenders.length} place(s). Use the logical equivalent, ` +
      `or allow-list the file with a reason if the direction is genuinely semantic ` +
      `(as SpectrumBar's political axis is):\n  ${offenders.join("\n  ")}`,
  );
});
