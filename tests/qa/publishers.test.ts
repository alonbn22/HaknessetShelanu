import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { getPublisherNames } from "../../src/lib/content";

// A source credit is visible text: on a non-Hebrew page "Source: הכנסת" is
// untranslated. Every Hebrew `publisher:` anywhere in content/ must have its
// names in content/publishers.yaml, so a new one can't slip through.

const HEBREW = /[א-ת]/;
const CONTENT = path.join(process.cwd(), "content");

function yamlFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? yamlFiles(p) : e.name.endsWith(".yaml") ? [p] : [];
  });
}

function publishers(node: unknown, out: Set<string>): Set<string> {
  if (Array.isArray(node)) node.forEach((n) => publishers(n, out));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (k === "publisher" && typeof v === "string") out.add(v);
      else publishers(v, out);
    }
  }
  return out;
}

test("every Hebrew publisher in content/ has its names in publishers.yaml", () => {
  const known = getPublisherNames();
  const missing = new Set<string>();
  for (const file of yamlFiles(CONTENT)) {
    for (const p of publishers(parse(fs.readFileSync(file, "utf8")), new Set())) {
      if (HEBREW.test(p) && !known.has(p)) missing.add(`${path.relative(CONTENT, file)}: ${p}`);
    }
  }
  assert.deepEqual([...missing], []);
});

test("publisher names carry no Hebrew in any other language", () => {
  for (const [key, names] of getPublisherNames()) {
    for (const [locale, name] of Object.entries(names)) {
      assert.ok(name.trim() && !HEBREW.test(name), `${key} → ${locale}: "${name}"`);
    }
  }
});
