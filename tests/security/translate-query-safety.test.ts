import { test } from "node:test";
import assert from "node:assert/strict";
import { translateQueryToHebrew } from "../../src/lib/translate-query";

// Capture the outbound request the translator builds.
function captureFetch() {
  const calls: { url: string; hasTimeout: boolean }[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(input),
      hasTimeout: !!init?.signal,
    });
    return new Response(JSON.stringify([[["תוצאה", "x", null, null]]]), { status: 200 });
  }) as typeof fetch;
  return calls;
}

test("query is sent over HTTPS and URL-encoded (no request-splitting)", async () => {
  const calls = captureFetch();
  await translateQueryToHebrew('woman & "child"\n OR 1=1', "en");
  assert.equal(calls.length, 1);
  const url = calls[0].url;
  assert.ok(url.startsWith("https://"), "must use HTTPS");
  // Raw control/markup characters must not appear unencoded in the URL.
  assert.ok(!url.includes("\n"), "newline must be encoded");
  assert.ok(!url.includes('"'), "quote must be encoded");
  assert.ok(url.includes("q="), "query carried as an encoded parameter");
});

test("outbound request sets an abort timeout (no hanging requests)", async () => {
  const calls = captureFetch();
  await translateQueryToHebrew("timeout probe", "en");
  assert.equal(calls[0].hasTimeout, true, "fetch must pass an AbortSignal timeout");
});

test("malicious payload is returned verbatim on failure (no code execution)", async () => {
  globalThis.fetch = (async () => {
    throw new Error("down");
  }) as typeof fetch;
  const payload = "<script>alert(1)</script>";
  const out = await translateQueryToHebrew(payload, "en");
  assert.equal(out, payload, "value passes through untouched; React escapes at render");
});
