import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CLIENT_NAMESPACES } from "../../src/i18n/client-namespaces";

// The layout hands client components only CLIENT_NAMESPACES; the whole
// catalogue used to ride in every page's RSC payload. A namespace a client
// component reads but the list lacks would render as "ns.key", so walk every
// "use client" module and everything it imports, and collect the namespaces
// it translates with.
const SRC = path.join(process.cwd(), "src");
const he = JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages/he.json"), "utf8"));

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (/\.tsx?$/.test(e.name)) acc.push(full);
  }
  return acc;
}
const source = new Map(walk(SRC).map((f) => [f, fs.readFileSync(f, "utf8")]));

function resolve(from: string, spec: string): string | undefined {
  const base = spec.startsWith("@/") ? path.join(SRC, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null;
  if (!base) return undefined;
  return ["", ".ts", ".tsx", "/index.ts", "/index.tsx"].map((ext) => base + ext).find((f) => source.has(f));
}

function clientNamespaces(): Set<string> {
  const queue = [...source.keys()].filter((f) => /^["']use client["']/.test(source.get(f)!));
  const seen = new Set<string>();
  while (queue.length) {
    const f = queue.pop()!;
    if (seen.has(f)) continue;
    seen.add(f);
    for (const m of source.get(f)!.matchAll(/^import\s+(?!type\b)[^;]*?from\s+["']([^"']+)["']/gm)) {
      const dep = resolve(f, m[1]);
      if (dep) queue.push(dep);
    }
  }
  const used = new Set<string>();
  for (const f of seen) {
    const text = source.get(f)!;
    for (const m of text.matchAll(/useTranslations\(\s*["'`]([^"'`.]+)/g)) used.add(m[1]);
    // A root translator (useTranslations()) names the namespace in each key.
    if (/useTranslations\(\s*\)/.test(text))
      for (const m of text.matchAll(/["'`]([a-zA-Z0-9]+)\.[\w.]+["'`]/g)) if (m[1] in he) used.add(m[1]);
  }
  return used;
}

test("client components get every message namespace they read", () => {
  const listed = new Set<string>(CLIENT_NAMESPACES);
  const missing = [...clientNamespaces()].filter((ns) => !listed.has(ns));
  assert.deepEqual(missing, [], `add to src/i18n/client-namespaces.ts: ${missing.join(", ")}`);
});

test("every client namespace exists in the catalogue", () => {
  const unknown = CLIENT_NAMESPACES.filter((ns) => !(ns in he));
  assert.deepEqual(unknown, []);
});
