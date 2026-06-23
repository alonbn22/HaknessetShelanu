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

test("dangerouslySetInnerHTML is not used (XSS surface)", () => {
  for (const file of sourceFiles) {
    const text = fs.readFileSync(file, "utf8");
    assert.ok(
      !text.includes("dangerouslySetInnerHTML"),
      `dangerouslySetInnerHTML in ${path.relative(ROOT, file)} — review for XSS`,
    );
  }
});
