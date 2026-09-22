import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { routing } from "../../src/i18n/routing";

// Every editorial string is written in Hebrew and translated into every site
// language. A missing language used to fall back to English silently, so an
// Arabic or Russian reader met English mid-page; this makes the gap a failure.

const dir = path.join(process.cwd(), "content");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".yaml"));

type Gap = { file: string; at: string; missing: string[] };

function gaps(file: string): { blocks: number; found: Gap[] } {
  const doc = YAML.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  const found: Gap[] = [];
  let blocks = 0;
  const walk = (node: unknown, at: string) => {
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    if (typeof o.he === "string" && typeof o.en === "string") {
      blocks++;
      const missing = routing.locales.filter((l) => typeof o[l] !== "string" || !(o[l] as string).trim());
      if (missing.length) found.push({ file, at, missing });
      return;
    }
    for (const [k, v] of Object.entries(o)) walk(v, at ? `${at}.${k}` : k);
  };
  walk(doc, "");
  return { blocks, found };
}

test("every localized content string exists in every site language", () => {
  let blocks = 0;
  const all: Gap[] = [];
  for (const f of files) {
    const r = gaps(f);
    blocks += r.blocks;
    all.push(...r.found);
  }
  assert.ok(blocks > 1000, `expected the content files to hold over 1000 localized strings, found ${blocks}`);
  assert.deepEqual(
    all.slice(0, 10).map((g) => `${g.file} ${g.at}: ${g.missing.join(", ")}`),
    [],
    `${all.length} localized strings lack a language`,
  );
});
