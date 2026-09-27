import { test } from "node:test";
import assert from "node:assert/strict";
import { getRunningLists, getSelfDescriptions, SELF_DESCRIPTION_VALUES } from "../../src/lib/content";
import { locales } from "../../src/i18n/routing";

// What a list calls itself is shown only in its own words, so the checkable
// rules are checked: every tag is keyed to a running list, its value belongs
// to its dimension (once per list), it quotes at most 25 Hebrew words in all
// six languages, and it cites an https source and its publisher.

const file = getSelfDescriptions();
const registry = getRunningLists();
const tags = Object.entries(file.lists).flatMap(([slug, ts]) => ts.map((x) => ({ slug, x, at: `${slug}/${x.dimension}/${x.value}` })));

test("the file is dated and keyed to running lists only", () => {
  assert.match(file.lastReviewed, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(tags.length > 0);
  for (const slug of Object.keys(file.lists)) assert.ok(registry.has(slug), `unknown list "${slug}"`);
});

test("every value belongs to its dimension, once per list", () => {
  const seen = new Set<string>();
  for (const { x, at } of tags) {
    assert.ok((SELF_DESCRIPTION_VALUES[x.dimension] as readonly string[]).includes(x.value), `${at}: not a ${x.dimension} value`);
    assert.ok(!seen.has(at), `${at}: tagged twice`);
    seen.add(at);
  }
});

test("every tag quotes 25 Hebrew words or fewer, in every language, with an https source", () => {
  for (const { x, at } of tags) {
    const words = x.quote.he.split(/\s+/).filter((w) => /[֐-׿0-9]/.test(w));
    assert.ok(words.length > 0 && words.length <= 25, `${at}: ${words.length} Hebrew words`);
    for (const l of locales) {
      assert.ok(x.quote[l].trim(), `${at}: quote lacks ${l}`);
      if (x.note) assert.ok(x.note[l].trim(), `${at}: note lacks ${l}`);
    }
    assert.match(x.source.url, /^https:\/\//, `${at}: source not https`);
    assert.ok(x.source.title && x.source.publisher, `${at}: source needs a title and a publisher`);
  }
});
