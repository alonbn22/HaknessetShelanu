import { test } from "node:test";
import assert from "node:assert/strict";
import { translateQueryToHebrew } from "../../src/lib/translate-query";

// Helper: stub global fetch to return a Google-translate-shaped payload.
function stubFetch(hebrew: string) {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify([[[hebrew, "x", null, null]]]), {
      status: 200,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;
}

test("Hebrew UI returns the query unchanged (no network call)", async () => {
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return new Response("[]");
  }) as typeof fetch;
  const out = await translateQueryToHebrew("anything", "he");
  assert.equal(out, "anything");
  assert.equal(called, false);
});

test("already-Hebrew query is not re-translated", async () => {
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return new Response("[]");
  }) as typeof fetch;
  const out = await translateQueryToHebrew("נשים", "en");
  assert.equal(out, "נשים");
  assert.equal(called, false);
});

test("strips nikud from the translated result", async () => {
  stubFetch("נָשִׁים"); // vocalized Hebrew with nikud
  const out = await translateQueryToHebrew("women-nikud-test", "en");
  assert.equal(out, "נשים"); // nikud removed so it matches unvocalized titles
});

test("falls back to the original query when the endpoint fails", async () => {
  globalThis.fetch = (async () => {
    throw new Error("network down");
  }) as typeof fetch;
  const out = await translateQueryToHebrew("budget-fallback-test", "en");
  assert.equal(out, "budget-fallback-test");
});

test("empty query returns empty", async () => {
  const out = await translateQueryToHebrew("   ", "en");
  assert.equal(out, "");
});
