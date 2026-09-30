import { test } from "node:test";
import assert from "node:assert/strict";
import { getQuizFile, getRunningLists } from "../../src/lib/content";
import { getVote } from "../../src/lib/queries";

// The compass is where an inferred position does the most harm, so the rules
// are mechanical: every stance cites an https source and quotes it; a stance
// from a vote names a real vote in the Knesset record; every key is a running
// list; the statement set is balanced between the two sides of the aisle and
// alternates; and coverage is reported so thin questions can't hide.

const file = getQuizFile();
const registry = getRunningLists();
const qs = file.questions;

test("the compass is dated and has a balanced, alternating set of statements", () => {
  assert.match(file.lastReviewed, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(qs.length >= 8 && qs.length % 2 === 0, "an even number of statements, at least 8");
  const right = qs.filter((q) => q.lean === "right").length;
  assert.equal(right, qs.length / 2, "half the statements must lean right, half left");
  for (let i = 1; i < qs.length; i++) {
    assert.notEqual(qs[i].lean, qs[i - 1].lean, `statements ${i} and ${i + 1} have the same lean — they must alternate`);
  }
  const ids = qs.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate statement id");
});

test("every statement has its text, short label and plain-words explainer in all six languages", () => {
  for (const q of qs) {
    for (const field of ["text", "short", "explainer"] as const) {
      const v = q[field];
      assert.ok(v.he && v.en && v.ar && v.ru && v.es && v.fr, `${q.id}: ${field} is missing a language`);
    }
    // The explainer is background, not a verdict: it names both sides.
    assert.ok(q.explainer.he.length >= 80, `${q.id}: explainer too short to explain anything`);
    // What it states as fact is sourced — never to Wikipedia, which is an index.
    // Only an explainer that states no fact (just the two sides) goes without.
    assert.ok(q.explainerSources?.length || q.id === "palestinian-state", `${q.id}: cite the explainer's facts in explainerSources`);
    for (const s of q.explainerSources ?? []) {
      assert.ok(/^https:\/\//.test(s.url) && s.title, `${q.id}: explainer source needs an https URL and a title`);
      assert.ok(!/wikipedia\.org/.test(s.url), `${q.id}: Wikipedia is an index, not a source`);
    }
  }
});

test("every stance is keyed to a running list, sourced, quoted, and within -2..2", () => {
  for (const q of qs) {
    for (const [slug, s] of Object.entries(q.stances)) {
      assert.ok(registry.has(slug), `${q.id}: unknown list "${slug}"`);
      assert.ok(Number.isInteger(s.value) && s.value >= -2 && s.value <= 2, `${q.id}/${slug}: value ${s.value}`);
      assert.ok(/^https:\/\//.test(s.source.url), `${q.id}/${slug}: source not https`);
      assert.ok(s.source.title, `${q.id}/${slug}: source missing title`);
      for (const more of s.moreSources ?? []) {
        assert.ok(/^https:\/\//.test(more.url) && more.title, `${q.id}/${slug}: every further source needs an https URL and a title`);
        assert.ok(s.recordOf, `${q.id}/${slug}: further sources back the recordOf note, so the stance needs one`);
      }
      assert.ok(s.quote.he && s.quote.en, `${q.id}/${slug}: quote needs he+en`);
      if (s.basis === "vote") {
        assert.ok(s.voteId, `${q.id}/${slug}: a vote-based stance names its vote`);
        assert.ok(getVote(s.voteId!), `${q.id}/${slug}: vote ${s.voteId} is not in the Knesset record`);
        assert.ok(s.source.url.includes(`KNS_PlenumVote(${s.voteId})`), `${q.id}/${slug}: vote source must be the Knesset record of vote ${s.voteId}`);
      } else {
        assert.equal(s.voteId, undefined, `${q.id}/${slug}: only vote-based stances carry a voteId`);
      }
    }
  }
});

test("every statement is answered by a meaningful share of lists (no thin questions)", () => {
  // At least half the running lists must have a sourced stance; the page shows
  // the rest as "no documented stance" rather than guessing.
  const n = registry.size;
  for (const q of qs) {
    const k = Object.keys(q.stances).length;
    assert.ok(k >= Math.ceil(n * 0.5), `${q.id}: only ${k} of ${n} lists have a sourced stance`);
  }
});

test("no list is systematically absent — every list has a stance on at least one statement", () => {
  for (const slug of registry.keys()) {
    const k = qs.filter((q) => slug in q.stances).length;
    assert.ok(k >= 1, `${slug} has no sourced stance anywhere`);
  }
});
