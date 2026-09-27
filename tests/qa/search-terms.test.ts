import { test } from "node:test";
import assert from "node:assert/strict";
import { getLawBookPage, getVotesPage, hebrewSearchTerms } from "../../src/lib/queries";
import { queryParam } from "../../src/lib/params";

// Non-Hebrew search runs on the site's own translation cache — no Google, no
// network: a query in the page's language finds the Hebrew rows whose cached
// translation contains it.

test("an English query finds Hebrew-only rows through the translation cache", () => {
  const he = hebrewSearchTerms("budget", "en");
  assert.ok(he.length > 0, "the cache holds translations containing 'budget'");
  // Law-book names are Hebrew-only: the raw English finds nothing, the cache does.
  assert.equal(getLawBookPage({ search: "budget" }).total, 0);
  assert.ok(getLawBookPage({ search: "budget", searchHe: he }).total > 0);
});

test("a page language falls back to the English translation", () => {
  // Every English match also counts on a French page (fr is sparsely filled).
  assert.ok(hebrewSearchTerms("committee", "fr").length >= hebrewSearchTerms("committee", "en").length);
  assert.ok(hebrewSearchTerms("committee", "en").length > 0);
});

test("the Hebrew UI, Hebrew queries, bare numbers and empty queries need no lookup", () => {
  assert.deepEqual(hebrewSearchTerms("budget", "he"), []);
  assert.deepEqual(hebrewSearchTerms("תקציב", "en"), []);
  assert.deepEqual(hebrewSearchTerms("2025", "en"), []);
  assert.deepEqual(hebrewSearchTerms("", "en"), []);
});

test("a Hebrew query searches exactly as the raw query alone", () => {
  const withTerms = getVotesPage(1, "תקציב", hebrewSearchTerms("תקציב", "en"));
  const raw = getVotesPage(1, "תקציב");
  assert.ok(raw.total > 0);
  assert.equal(withTerms.total, raw.total);
});

test("LIKE wildcards in the query are literal", () => {
  // Unescaped, "x%" would be "contains x" and match thousands of cache rows.
  assert.deepEqual(hebrewSearchTerms("x%", "en"), []);
});

test("?q= is trimmed and capped at 200 characters", () => {
  assert.equal(queryParam("  budget  "), "budget");
  assert.equal(queryParam("x".repeat(500)).length, 200);
  assert.equal(queryParam(undefined), "");
  assert.equal(queryParam(["a", "b"]), "a,b"); // a repeated ?q= does not throw
});
