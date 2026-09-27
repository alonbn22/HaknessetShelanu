import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { locales } from "../../src/i18n/routing";

// Guards i18n completeness so adding a page or a language can't silently drift:
// every locale must define exactly the same key set, and no value may be blank.
const MESSAGES_DIR = path.join(process.cwd(), "messages");
const SOURCE = "he"; // default locale = source of truth
// Every locale the router serves must have a complete catalogue.
const LOCALES = [...locales];

type Obj = Record<string, unknown>;
function flatten(obj: Obj, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? flatten(v as Obj, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}
const load = (loc: string): Obj =>
  JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${loc}.json`), "utf8"));

// Flattened key→value map for blank detection.
function flatMap(obj: Obj, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object" && !Array.isArray(v)) flatMap(v as Obj, `${prefix}${k}.`, out);
    else if (typeof v === "string") out[`${prefix}${k}`] = v;
  }
  return out;
}

const source = load(SOURCE);
const sourceKeys = new Set(flatten(source));
const sourceVals = flatMap(source);

for (const loc of LOCALES) {
  test(`locale "${loc}" has exactly the source key set`, () => {
    const keys = new Set(flatten(load(loc)));
    const missing = [...sourceKeys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !sourceKeys.has(k));
    assert.equal(missing.length, 0, `${loc} missing keys: ${missing.slice(0, 20).join(", ")}`);
    assert.equal(extra.length, 0, `${loc} has extra keys: ${extra.slice(0, 20).join(", ")}`);
  });

  test(`locale "${loc}": every key with source content is non-blank`, () => {
    const vals = flatMap(load(loc));
    // Blank is allowed only where the source is also intentionally blank.
    const gaps = Object.entries(vals)
      .filter(([k, v]) => v.trim() === "" && (sourceVals[k] ?? "").trim() !== "")
      .map(([k]) => k);
    assert.equal(gaps.length, 0, `${loc} untranslated (blank) keys: ${gaps.slice(0, 20).join(", ")}`);
  });

  test(`locale "${loc}": ICU placeholders and rich-text tags match the source`, () => {
    // A translation must keep the same {placeholders} as the source, else
    // interpolation breaks (e.g. a translator dropped {count}) — and the same
    // <tags> for t.rich(), else a link silently vanishes.
    const placeholders = (s: string) =>
      [...s.matchAll(/\{(\w+)\}|<(\w+)>/g)].map((m) => m[1] ?? `<${m[2]}>`).sort().join(",");
    const vals = flatMap(load(loc));
    const mismatches = Object.entries(sourceVals)
      .filter(([k, sv]) => vals[k] != null && placeholders(sv) !== placeholders(vals[k]))
      .map(([k]) => k);
    assert.equal(
      mismatches.length,
      0,
      `${loc} placeholder mismatches: ${mismatches.slice(0, 20).join(", ")}`,
    );
  });
}
