import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { routing } from "../../src/i18n/routing";

// Every editorial string is written in Hebrew and translated into every site
// language. A missing language used to fall back to English silently, so an
// Arabic or Russian reader met English mid-page; this makes the gap a failure.

test("every localized content string exists in every site language", () => {
  const dir = path.join(process.cwd(), "content");
  const gaps: string[] = [];
  let blocks = 0;
  const walk = (node: unknown, at: string) => {
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    if (typeof o.he === "string" && typeof o.en === "string") {
      blocks++;
      const missing = routing.locales.filter((l) => typeof o[l] !== "string" || !(o[l] as string).trim());
      if (missing.length) gaps.push(`${at}: ${missing.join(", ")}`);
      return;
    }
    for (const [k, v] of Object.entries(o)) walk(v, `${at}.${k}`);
  };
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".yaml"))) walk(YAML.parse(fs.readFileSync(path.join(dir, f), "utf8")), f);
  assert.ok(blocks > 1000, `expected the content files to hold over 1000 localized strings, found ${blocks}`);
  assert.deepEqual(gaps.slice(0, 10), [], `${gaps.length} localized strings lack a language`);
});
