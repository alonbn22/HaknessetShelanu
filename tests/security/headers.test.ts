import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Locks in the security-header posture so a refactor can't silently drop it:
// static headers live in next.config.ts, the nonce-based CSP in src/proxy.ts,
// and the nonce must actually reach the one hand-written inline script.

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("next.config declares the static security headers (incl. HSTS)", () => {
  const cfg = read("next.config.ts");
  for (const h of [
    "X-Content-Type-Options",
    "Referrer-Policy",
    "X-Frame-Options",
    "Permissions-Policy",
    "Strict-Transport-Security",
  ]) {
    assert.ok(cfg.includes(h), `next.config.ts missing header: ${h}`);
  }
});

test("middleware sets a nonce-based CSP with strict-dynamic", () => {
  const proxy = read("src/proxy.ts");
  assert.ok(proxy.includes("Content-Security-Policy"), "proxy must set the CSP header");
  assert.match(proxy, /'nonce-\$\{nonce\}'/, "CSP must carry the per-request nonce (Next inline scripts)");
  assert.ok(proxy.includes("'strict-dynamic'"), "script-src must use strict-dynamic");
  assert.ok(proxy.includes("object-src 'none'"), "object-src must be locked down");
  assert.ok(proxy.includes("frame-ancestors"), "frame-ancestors must be set");
  assert.ok(proxy.includes('requestHeaders.set("x-nonce"'), "nonce must be forwarded to the render");
  // 'unsafe-eval' must be dev-gated (React debug stacks), never unconditional.
  assert.ok(proxy.includes('isDev ? " \'unsafe-eval\'"'), "unsafe-eval must be dev-gated");
});

test("the layout stamps the request nonce onto the theme script and forces dynamic", () => {
  const layout = read("src/app/[locale]/layout.tsx");
  assert.ok(layout.includes("THEME_SCRIPT"), "layout must render the shared theme script constant");
  assert.ok(layout.includes("await headers()"), "layout must read headers() to force dynamic rendering");
  assert.match(layout, /get\("x-nonce"\)/, "layout must read the per-request nonce from x-nonce");
  assert.match(layout, /<script\s+nonce=\{nonce\}/, "the theme script must carry the request nonce");
});

test('every target="_blank" link carries rel="noopener"', () => {
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith(".tsx")) {
        const src = fs.readFileSync(full, "utf8");
        // Each <a ...> opening tag with target="_blank" must include rel=...noopener.
        // [^>]* already crosses newlines — no dotall flag needed (keeps the
        // test compatible with the repo's tsc target).
        for (const m of src.matchAll(/<a\s[^>]*target="_blank"[^>]*>/g)) {
          if (!/rel="[^"]*noopener[^"]*"/.test(m[0])) {
            offenders.push(path.relative(process.cwd(), full));
          }
        }
      }
    }
  };
  walk(path.join(process.cwd(), "src"));
  assert.deepEqual(offenders, [], `target="_blank" without rel=noopener in: ${offenders.join(", ")}`);
});
