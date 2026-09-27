import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name.startsWith("."))
      continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

const sourceFiles = [
  ...walk(path.join(ROOT, "src")),
  ...walk(path.join(ROOT, "scripts")),
];

test("no hardcoded secrets in source", () => {
  const patterns: [string, RegExp][] = [
    ["AWS access key", /AKIA[0-9A-Z]{16}/],
    ["private key block", /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/],
    ["Anthropic key", /sk-ant-[A-Za-z0-9-]{20,}/],
    ["generic OpenAI-style key", /sk-[A-Za-z0-9]{32,}/],
    ["Google API key", /AIza[0-9A-Za-z_-]{35}/],
    ["bearer token literal", /Bearer\s+[A-Za-z0-9._-]{20,}/],
  ];
  for (const file of sourceFiles) {
    const text = fs.readFileSync(file, "utf8");
    for (const [label, re] of patterns) {
      assert.ok(!re.test(text), `${label} found in ${path.relative(ROOT, file)}`);
    }
  }
});

test("external requests use HTTPS (no plaintext http to remote hosts)", () => {
  for (const file of sourceFiles) {
    const text = fs.readFileSync(file, "utf8");
    const matches = text.match(/http:\/\/[^\s"'`)]+/g) ?? [];
    for (const m of matches) {
      assert.ok(
        /http:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)/.test(m),
        `non-HTTPS remote URL ${m} in ${path.relative(ROOT, file)}`,
      );
    }
  }
});

test(".env files are git-ignored", () => {
  const gitignore = fs.readFileSync(path.join(ROOT, ".gitignore"), "utf8");
  assert.ok(/\.env/.test(gitignore), ".env must be ignored to avoid leaking secrets");
});

test("dangerouslySetInnerHTML is only ever fed static string literals", () => {
  // Blanket-banning it is too blunt: the layout needs a pre-paint theme script
  // (a hardcoded string, no user input) to avoid a light-mode flash. Instead of
  // an allowlist, enforce the property that actually matters — the injected
  // HTML must be a plain string literal with no `${…}` interpolation, so no
  // dynamic/user value can ever reach it.
  const re = /dangerouslySetInnerHTML\s*=\s*\{\{[^}]*__html:\s*([\s\S]*?)\}\}/g;
  for (const file of sourceFiles) {
    const text = fs.readFileSync(file, "utf8");
    for (const m of text.matchAll(re)) {
      const rel = path.relative(ROOT, file);
      assert.ok(
        !m[1].includes("${"),
        `dangerouslySetInnerHTML in ${rel} interpolates a value — XSS risk`,
      );
    }
  }
});

test("safeHttpUrl only passes http(s) URLs", async () => {
  const { safeHttpUrl } = await import("../../src/lib/text");
  assert.equal(safeHttpUrl("https://fs.knesset.gov.il/doc.pdf"), "https://fs.knesset.gov.il/doc.pdf");
  assert.equal(safeHttpUrl("http://example.com/x"), "http://example.com/x");
  assert.equal(safeHttpUrl("  https://a.b/c  "), "https://a.b/c"); // trimmed
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("\tjavascript:alert(1)"), null); // browsers tolerate the tab
  assert.equal(safeHttpUrl("data:text/html,x"), null);
  assert.equal(safeHttpUrl("//protocol-relative.example"), null);
  assert.equal(safeHttpUrl("relative/path.pdf"), null);
  assert.equal(safeHttpUrl(""), null);
  assert.equal(safeHttpUrl(null), null);
  assert.equal(safeHttpUrl(undefined), null);
});

test("commonsThumbUrl narrows Commons thumbnails and stays on the CSP-allowed host", async () => {
  const { commonsThumbUrl } = await import("../../src/lib/text");
  const base = "https://upload.wikimedia.org/wikipedia/commons";
  assert.equal(
    commonsThumbUrl(`https://thumb.wikimedia.org/wikipedia/commons/thumb/0/06/A_%28b%29.jpg/500px-A_%28b%29.jpg?utm_source=x`, 250),
    `${base}/thumb/0/06/A_%28b%29.jpg/250px-A_%28b%29.jpg`,
  );
  // Never widens (Commons won't upscale), and an original file stays as is.
  assert.equal(commonsThumbUrl(`${base}/thumb/0/06/A.jpg/120px-A.jpg`, 250), `${base}/thumb/0/06/A.jpg/120px-A.jpg`);
  assert.equal(commonsThumbUrl(`${base}/2/2c/A.jpg?utm_content=thumbnail_unscaled`, 250), `${base}/2/2c/A.jpg`);
  assert.equal(commonsThumbUrl("https://example.org/thumb/x/500px-x.jpg", 250), "https://example.org/thumb/x/500px-x.jpg");
  assert.equal(commonsThumbUrl(null, 250), null);
});

// Tailwind's font-weight utilities are just numbers; nothing checks that the
// number is a weight the font actually ships. It once wasn't: the Heebo config
// listed 300/400/500/700/800/900 while `font-semibold` (600) was the site's
// most-used weight, so every one of those 99 usages was synthesized by the
// browser. A variable font makes all weights real; a static list must cover
// every weight the components use.
test("every font-weight utility used in src is actually loaded", () => {
  const WEIGHTS: Record<string, string> = {
    thin: "100",
    extralight: "200",
    light: "300",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
    black: "900",
  };
  const layout = fs.readFileSync(
    path.join(ROOT, "src/app/[locale]/layout.tsx"),
    "utf8",
  );

  // A next/font call with no `weight` key loads the variable font (all weights).
  const heebo = layout.match(/const heebo = Heebo\(\{[\s\S]*?\n\}\);/)?.[0];
  assert.ok(heebo, "could not find the Heebo font config in layout.tsx");
  const declared = heebo.match(/weight:\s*\[([^\]]*)\]/);

  if (!declared) return; // variable axis — every weight is available.

  const loaded = new Set(declared[1].match(/\d{3}/g) ?? []);
  const used = new Map<string, string>();
  for (const file of sourceFiles) {
    if (!file.endsWith(".tsx")) continue;
    for (const m of fs.readFileSync(file, "utf8").matchAll(/font-([a-z]+)\b/g)) {
      const w = WEIGHTS[m[1]];
      if (w && !used.has(w)) used.set(w, path.relative(ROOT, file));
    }
  }
  const missing = [...used]
    .filter(([w]) => !loaded.has(w))
    .map(([w, file]) => `${w} (font-${Object.keys(WEIGHTS).find((k) => WEIGHTS[k] === w)}, e.g. ${file})`);
  assert.equal(
    missing.length,
    0,
    `Weights used in src but not loaded in layout.tsx — the browser will fake them. ` +
      `Add them to the weight array, or drop the array to load the variable font: ${missing.join(", ")}`,
  );
});
