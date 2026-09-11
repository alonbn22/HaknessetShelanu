import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Structural guard for the semantic token layer in globals.css. Three things
// the type-checker cannot see and that each produced real defects here:
//   1. a token defined under :root but not under html.dark or
//      html.a11y-contrast silently keeps its LIGHT value in that theme;
//   2. a text/surface pair that drifts under WCAG AA — IS 5568 makes AA a
//      legal requirement for this site, not a preference;
//   3. a class like bg-surfase resolves to nothing — Tailwind emits no CSS
//      for an unknown token and nothing else complains.
const ROOT = process.cwd();
// Comments are stripped first: a brace inside one would otherwise end a block early.
const CSS = fs
  .readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");
const SRC = path.join(ROOT, "src");

// `--name: value;` pairs from the block whose selector sits at line start
// (so the same words inside a comment or a nested selector don't match).
function block(selector: string): Record<string, string> {
  const re = new RegExp(`^${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`, "m");
  const m = re.exec(CSS);
  assert.ok(m, `globals.css: no "${selector} {" block`);
  const open = m.index + m[0].length;
  const body = CSS.slice(open, CSS.indexOf("}", open));
  const out: Record<string, string> = {};
  for (const d of body.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[d[1]] = d[2].trim();
  return out;
}

const ROOTS = {
  light: block(":root"),
  dark: block("html.dark"),
  "high-contrast": block("html.a11y-contrast"),
};
const theme = block("@theme inline");
const colorTokens = Object.entries(theme).filter(([k]) => k.startsWith("color-"));

function luminance(hex: string): number {
  const h = hex.slice(1);
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(full.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const isHex = (v: string) => /^#(?:[0-9a-f]{3}){1,2}$/i.test(v);

test("every colour token is defined under all three theme roots", () => {
  const missing: string[] = [];
  for (const [key, value] of colorTokens) {
    const ref = value.match(/^var\(--([\w-]+)\)$/)?.[1];
    assert.ok(ref, `--${key} must be var(--token), got "${value}"`);
    for (const [root, vars] of Object.entries(ROOTS)) {
      if (!(ref in vars)) missing.push(`--${ref} (backing --${key}) is not set under ${root}`);
    }
  }
  assert.equal(
    missing.length,
    0,
    `Tokens missing from a theme root — the utility keeps its light value there:\n  ${missing.join("\n  ")}`,
  );
});

const TEXT = 4.5;
const UI = 3;
const TONES = ["pass", "fail", "warn", "info", "neutral"];
const PAIRS: [fg: string, bg: string, min: number][] = [
  ["foreground", "background", TEXT],
  ["foreground", "surface", TEXT],
  ["foreground", "surface-sunken", TEXT],
  ["muted", "background", TEXT],
  ["muted", "surface", TEXT],
  ["muted", "surface-sunken", TEXT],
  ["accent-ink", "background", TEXT],
  ["accent-ink", "surface", TEXT],
  ["accent-ink", "accent-soft", TEXT],
  ["on-accent", "accent", TEXT],
  ["on-chrome", "chrome", TEXT],
  ["coalition-ink", "background", TEXT],
  ["coalition-ink", "surface", TEXT],
  ["opposition-ink", "background", TEXT],
  ["opposition-ink", "surface", TEXT],
  ...TONES.flatMap((t): [string, string, number][] => [
    [`${t}-ink`, `${t}-soft`, TEXT],
    [`${t}-ink`, "surface", TEXT],
  ]),
  // Non-text (1.4.11): the accent as a component against its surroundings,
  // and the outer focus ring against whatever it is drawn over.
  ["accent", "background", UI],
  ["accent", "surface", UI],
  ["focus-ring", "background", UI],
  ["focus-ring", "surface", UI],
];

test("token pairs meet WCAG AA in every theme (4.5:1 text, 3:1 components)", () => {
  const failures: string[] = [];
  for (const [root, vars] of Object.entries(ROOTS)) {
    for (const [fg, bg, min] of PAIRS) {
      const f = vars[fg];
      const b = vars[bg];
      assert.ok(f && b, `${root}: --${fg} and --${bg} must both exist`);
      if (!isHex(f) || !isHex(b)) continue; // translucent tokens are never a text/surface pair
      const r = contrast(f, b);
      if (r < min) failures.push(`${root}: --${fg} ${f} on --${bg} ${b} = ${r.toFixed(2)}:1, needs ${min}:1`);
    }
  }
  assert.equal(failures.length, 0, `Contrast regressions:\n  ${failures.join("\n  ")}`);
});

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (e.name.endsWith(".tsx")) acc.push(full);
  }
  return acc;
}

function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

test("every semantic colour class in src resolves to a declared token", () => {
  const declared = new Set(colorTokens.map(([k]) => k.slice("color-".length)));
  // Anything that starts like one of our families, or is a near-miss of a
  // declared name, is judged as ours. Tailwind's own names are exempt.
  const stems = ["surface", "chrome", "on-", "line", "accent", "coalition", "opposition",
    ...TONES, "focus", "muted", "foreground", "background"];
  const builtin =
    /^(?:white|black|transparent|current|inherit|none|[a-z]+-\d{2,3}|xs|sm|base|lg|start|end|center|left|right|justify|wrap|nowrap|balance|pretty|clip|ellipsis|micro|cover|contain|fixed|local|scroll|solid|dashed|dotted|double|hidden|inset)$/;
  const cls =
    /(?:^|[\s"'`{}:!])(?:bg|text|border|ring|divide|fill|stroke|outline|decoration|from|via|to)-([a-z][a-z-]*[a-z])(?:\/\d+)?(?=[\s"'`}]|$)/gm;
  const offenders: string[] = [];
  for (const file of walk(SRC)) {
    const text = fs.readFileSync(file, "utf8");
    for (const m of text.matchAll(cls)) {
      const name = m[1];
      if (declared.has(name) || builtin.test(name)) continue;
      const ours =
        stems.some((s) => name.startsWith(s)) || [...declared].some((d) => editDistance(name, d) <= 2);
      if (ours) offenders.push(`${path.relative(ROOT, file)}: ${m[0].trim()}`);
    }
  }
  assert.equal(
    offenders.length,
    0,
    `Classes that look like semantic tokens but match none — Tailwind emits nothing for them:\n  ${offenders.join("\n  ")}`,
  );
});
