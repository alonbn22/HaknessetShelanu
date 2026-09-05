import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// A RATCHET, not a ban. Dark mode is currently a retrofit: components hardcode
// light-mode utilities (bg-white, black/white overlays, raw Tailwind palette hues)
// and globals.css re-colors those *class names* under html.dark. That leaks by
// construction — a tint added in TSX without the matching CSS line silently breaks
// in dark mode, which is how ~20 real defects got in.
//
// The migration replaces them with semantic tokens (bg-surface, text-muted,
// bg-pass-soft…). Until it finishes, both systems coexist, so a hard ban would fail
// on day one. Instead every file carries a budget seeded from its count on the day
// the ratchet landed: a count may only ever go DOWN. Backsliding fails the build,
// and so does forgetting to lower the budget after a migration — which keeps the
// budget honest and makes the remaining work self-documenting.
//
// When Stage D removes the override block, this becomes a hard ban (empty budget).
const SRC = path.join(process.cwd(), "src");
const BUDGET_FILE = path.join(process.cwd(), "tests/qa/legacy-utilities.budget.json");

const PALETTE =
  "gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|" +
  "cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

// Keep in sync with the budget file; the failure message reprints it when it drifts.
const LEGACY = new RegExp(
  [
    String.raw`bg-white(?:\/\[?[.\d]+\]?)?\b`,
    String.raw`(?:bg|border|fill|text|divide|ring)-(?:black|white)\/\[?[.\d]+\]?`,
    `(?:bg|text|border|ring|fill|divide)-(?:${PALETTE})-\\d{2,3}`,
    String.raw`text-\[11px\]`,
  ].join("|"),
  "g",
);

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (e.name.endsWith(".tsx")) acc.push(full);
  }
  return acc;
}

test("legacy light-mode utilities only ever decrease (dark-mode retrofit ratchet)", () => {
  const budget: Record<string, number> = JSON.parse(fs.readFileSync(BUDGET_FILE, "utf8"));
  const actual: Record<string, number> = {};
  for (const file of walk(SRC).sort()) {
    const rel = path.relative(SRC, file).split(path.sep).join("/");
    const n = (fs.readFileSync(file, "utf8").match(LEGACY) ?? []).length;
    if (n > 0) actual[rel] = n;
  }

  const regressions: string[] = [];
  const improvements: string[] = [];
  for (const [rel, n] of Object.entries(actual)) {
    const allowed = budget[rel];
    if (allowed === undefined) {
      regressions.push(`${rel}: ${n} new (this file had none — use semantic tokens)`);
    } else if (n > allowed) {
      regressions.push(`${rel}: ${n} > ${allowed} allowed`);
    }
  }
  for (const [rel, allowed] of Object.entries(budget)) {
    const n = actual[rel] ?? 0;
    if (n < allowed) improvements.push(`${rel}: ${allowed} → ${n}`);
  }

  const messages: string[] = [];
  if (regressions.length) {
    messages.push(
      `Legacy utilities increased in ${regressions.length} file(s). Use semantic tokens ` +
        `(bg-surface, bg-surface-sunken, border-line, text-muted, bg-pass-soft…):\n  ` +
        regressions.join("\n  "),
    );
  }
  if (improvements.length) {
    messages.push(
      `Migration progress in ${improvements.length} file(s) — lower the ratchet so it ` +
        `can't creep back. Replace tests/qa/legacy-utilities.budget.json with:\n` +
        JSON.stringify(actual, null, 2) +
        `\n  (${improvements.length} improved: ${improvements.join(", ")})`,
    );
  }
  assert.equal(messages.length, 0, messages.join("\n\n"));
});
