import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getPolls, getRunningLists } from "../../src/lib/content";
import {
  AVERAGE_WINDOW_DAYS,
  daysBetween,
  pollOfPolls,
  seatTotal,
  trendSeries,
  THRESHOLD_SEATS,
  KNESSET_SEATS,
  BLACKOUT,
  pollBlackout,
} from "../../src/lib/polls";

// Seat polls are the election content where an unverified number does the most
// harm, so the rule is mechanical here: every poll cites the outlet's own
// article over https, is dated inside the file's scope, keys every list to the
// registry (content/election.yaml), and sums to 120. The average is pinned too:
// one poll per institute, inside the window, means bounded by the inputs.

const FILE = path.join(process.cwd(), "content", "polls.yaml");
const file = getPolls();
const registry = getRunningLists();
const slugs = [...registry.keys()];

// Elections (Propaganda Methods) Law s. 16e(h): the blackout notice shows from
// Friday 23 Oct 2026 00:00 (IDT) until the polls close at 22:00 (IST) on the
// 27th, and no poll dated after that Friday may enter the file.
test("the poll blackout runs from Friday 23 Oct 00:00 to the polls closing, Israel time", () => {
  assert.equal(pollBlackout(new Date("2026-10-22T23:59:59+03:00")), false);
  assert.equal(pollBlackout(new Date("2026-10-23T00:00:00+03:00")), true);
  assert.equal(pollBlackout(new Date("2026-10-25T12:00:00+02:00")), true);
  assert.equal(pollBlackout(new Date("2026-10-27T21:59:59+02:00")), true);
  assert.equal(pollBlackout(new Date("2026-10-27T22:00:00+02:00")), false);
});

test("polls.yaml parses when present (loader returns null otherwise)", () => {
  if (!fs.existsSync(FILE)) return;
  assert.ok(file, "content/polls.yaml exists but failed schema validation");
});

if (file) {
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const today = new Date().toISOString().slice(0, 10);

  test("the file is dated and scoped", () => {
    assert.match(file.lastReviewed, ISO);
    assert.match(file.cutoff, ISO);
    assert.ok(file.lastReviewed <= today, "lastReviewed is in the future");
    assert.ok(file.cutoff <= file.lastReviewed, "cutoff after lastReviewed");
    assert.ok(file.threshold > 0 && file.threshold < 10, "threshold is a percentage of valid votes");
    assert.ok(file.polls.length >= 1, "no polls entered");
  });

  test("no poll is dated after the last day before the blackout", () => {
    for (const p of file.polls) {
      assert.ok(p.published <= BLACKOUT.lastPollDate, `${p.id}: published during the blackout`);
    }
  });

  test("ids are unique and carry the published date", () => {
    const ids = new Set<string>();
    for (const p of file.polls) {
      assert.ok(!ids.has(p.id), `duplicate poll id ${p.id}`);
      ids.add(p.id);
      assert.ok(p.id.startsWith(p.published), `${p.id}: id must start with its published date`);
    }
  });

  test("every poll is inside the scope window and its fieldwork precedes publication", () => {
    for (const p of file.polls) {
      assert.ok(p.published >= file.cutoff, `${p.id}: published before the cutoff`);
      assert.ok(p.published <= file.lastReviewed, `${p.id}: published after lastReviewed`);
      if (p.fieldwork) {
        assert.ok(p.fieldwork.from <= p.fieldwork.to, `${p.id}: fieldwork from > to`);
        assert.ok(p.fieldwork.to <= p.published, `${p.id}: fieldwork ends after publication`);
        assert.ok(daysBetween(p.fieldwork.from, p.published) <= 7, `${p.id}: fieldwork more than a week before publication`);
      }
    }
  });

  test("every seat key and below-threshold entry is a registry slug, never both", () => {
    for (const p of file.polls) {
      for (const slug of Object.keys(p.seats)) {
        assert.ok(registry.has(slug), `${p.id}: unknown list "${slug}" in seats`);
        assert.ok(p.seats[slug] >= THRESHOLD_SEATS, `${p.id}: ${slug} has ${p.seats[slug]} seats, below the smallest possible delegation`);
      }
      for (const slug of p.belowThreshold) {
        assert.ok(registry.has(slug), `${p.id}: unknown list "${slug}" in belowThreshold`);
        assert.ok(!(slug in p.seats), `${p.id}: ${slug} is both seated and below the threshold`);
      }
    }
  });

  test("seats sum to 120 and blocs never exceed the house", () => {
    for (const p of file.polls) {
      assert.equal(seatTotal(p), KNESSET_SEATS, `${p.id}: seats sum to ${seatTotal(p)}`);
      const blocTotal = p.blocs.reduce((s, b) => s + b.seats, 0);
      assert.ok(blocTotal <= KNESSET_SEATS, `${p.id}: blocs sum to ${blocTotal}`);
      for (const b of p.blocs) {
        assert.ok(b.label.he && b.label.en, `${p.id}: bloc label needs he+en`);
      }
    }
  });

  test("every poll names its outlet and institute (he+en), a sample, and the outlet's own https article", () => {
    const instituteNames = new Map<string, string>();
    for (const p of file.polls) {
      assert.ok(p.outlet.he && p.outlet.en, `${p.id}: outlet needs he+en`);
      assert.ok(p.institute.he && p.institute.en, `${p.id}: institute needs he+en`);
      assert.ok(p.sample > 0, `${p.id}: sample must be positive`);
      if (p.marginOfError != null) assert.ok(p.marginOfError < 10, `${p.id}: implausible margin of error`);
      assert.ok(p.sources.length >= 1, `${p.id}: no sources`);
      for (const s of p.sources) {
        assert.ok(/^https:\/\//.test(s.url), `${p.id}: source not https: ${s.url}`);
        assert.ok(s.title, `${p.id}: source missing title`);
      }
      assert.ok(p.verification, `${p.id}: record how the figures were verified`);
      // One display name per institute key — the dedupe key must mean one house.
      const seen = instituteNames.get(p.instituteId);
      if (seen) assert.equal(p.institute.en, seen, `${p.id}: instituteId ${p.instituteId} used with two names`);
      else instituteNames.set(p.instituteId, p.institute.en ?? "");
    }
  });

  // The pollster's filing with the Central Elections Committee is a second,
  // official source beside the article: it must link the committee's own PDF
  // on gov.il, carry its reference, and add up.
  test("every CEC filing links gov.il over https, has a ref, and answered ≤ asked", () => {
    if (file.filingsCheckedAt) assert.ok(file.filingsCheckedAt <= today, "filingsCheckedAt is in the future");
    for (const p of file.polls) {
      const f = p.filing;
      if (!f) continue;
      for (const r of [f, ...(f.refiled ?? [])]) {
        assert.ok(r.ref.trim(), `${p.id}: filing without a ref`);
        const { protocol, hostname } = new URL(r.url);
        assert.equal(protocol, "https:", `${p.id}: filing ${r.ref} not https`);
        assert.ok(hostname === "gov.il" || hostname.endsWith(".gov.il"), `${p.id}: filing ${r.ref} not on gov.il: ${hostname}`);
      }
      if (f.asked != null && f.answered != null) {
        assert.ok(f.answered <= f.asked, `${p.id}: ${f.answered} answered of ${f.asked} asked`);
      }
      if (f.question) assert.ok(f.question.he.split(/\s+/).length <= 40, `${p.id}: the vote question runs over 40 words`);
    }
  });

  test("polls not entered are listed with a reason and a link", () => {
    for (const n of file.notEntered) {
      assert.match(n.published, ISO);
      assert.ok(n.reason.he && n.reason.en, "notEntered reason needs he+en");
      assert.ok(/^https:\/\//.test(n.url));
    }
  });

  test("the poll of polls takes one poll per institute inside the window, in registry order", () => {
    const avg = pollOfPolls(file.polls, slugs);
    assert.ok(avg);
    const institutes = avg.inputs.map((p) => p.instituteId);
    assert.equal(new Set(institutes).size, institutes.length, "an institute counts twice");
    assert.equal(avg.institutes, avg.inputs.length);
    for (const p of avg.inputs) {
      assert.ok(daysBetween(p.published, avg.to) <= AVERAGE_WINDOW_DAYS, `${p.id}: outside the window`);
      // The newest poll of its institute — nothing newer from the same house.
      const newer: boolean = file.polls.some((q) => q.instituteId === p.instituteId && q.published > p.published);
      assert.equal(newer, false, `${p.id}: a newer poll from ${p.instituteId} exists`);
    }
    const order = avg.lists.map((l) => slugs.indexOf(l.slug));
    assert.deepEqual(order, [...order].sort((a, b) => a - b), "lists must follow registry order");
    let total = 0;
    for (const l of avg.lists) {
      assert.ok(l.min <= l.mean && l.mean <= l.max, `${l.slug}: mean outside its range`);
      assert.ok(l.above <= avg.institutes);
      total += l.mean;
    }
    assert.ok(Math.abs(total - KNESSET_SEATS) < 1e-6, `averages sum to ${total}, not 120`);
  });

  test("trend series run oldest-first with one point per poll", () => {
    for (const s of trendSeries(file.polls, slugs)) {
      const dates = s.points.map((p) => p.date);
      assert.deepEqual(dates, [...dates].sort(), `${s.slug}: not chronological`);
      assert.equal(new Set(s.points.map((p) => p.pollId)).size, s.points.length, `${s.slug}: a poll counted twice`);
    }
  });
}
