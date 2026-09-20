import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import {
  getPartyProfile,
  getElectionOutlook,
  getCoalitionConfig,
  getFactionStatus,
  getFactionMeta,
  getMajorityStatus,
} from "../../src/lib/content";

// Faction profiles are editorial content about live political actors — the
// same legal-safety rules as member records: every dated development cites a
// reputable https source, the 2026 election block resolves to a CEC-backed
// list, and the coalition/opposition label rests on a dated, sourced status.

const ids = (parse(fs.readFileSync(path.join(process.cwd(), "content", "party-profiles.yaml"), "utf8")) as { profiles: { id: number }[] }).profiles.map((p) => p.id);
const outlook = getElectionOutlook();
const today = new Date().toISOString().slice(0, 10);

test("profiles parse and carry a verification date once they have developments", () => {
  for (const id of ids) {
    const p = getPartyProfile(id);
    assert.ok(p, `profile ${id} failed to load`);
    if (p.updates && p.updates.length > 0) {
      assert.ok(p.verified, `${id}: updates without a verified date`);
      assert.ok(p.verified! <= today, `${id}: verified in the future`);
    }
  }
});

test("every development is dated, bilingual, and sourced (https)", () => {
  for (const id of ids) {
    const p = getPartyProfile(id)!;
    for (const u of p.updates ?? []) {
      assert.match(u.date, /^\d{4}-\d{2}-\d{2}$/, `${id}: bad date ${u.date}`);
      assert.ok(u.date <= today, `${id}: development dated in the future (${u.date})`);
      assert.ok(u.text.he.trim().length > 20 && (u.text.en ?? "").trim().length > 20, `${id} ${u.date}: he+en text required`);
      assert.ok(u.sources.length >= 1, `${id} ${u.date}: no sources`);
      for (const s of u.sources) {
        assert.match(s.url, /^https:\/\//, `${id} ${u.date}: source not https: ${s.url}`);
        assert.ok(s.title.trim().length > 0, `${id} ${u.date}: source without title`);
      }
    }
  }
});

test("the 2026 election block resolves to a CEC-backed list", () => {
  assert.ok(outlook, "election outlook required");
  const bySlug = new Map(outlook!.parties.map((p) => [p.slug, p]));
  const byNumber = new Map(outlook!.submittedLists!.lists.map((l) => [l.listNumber, l]));
  for (const id of ids) {
    const e = getPartyProfile(id)!.election2026;
    assert.ok(e, `${id}: no election2026 block`);
    if (e.runsAs === "none") continue;
    if (e.slug) {
      const party = bySlug.get(e.slug);
      assert.ok(party?.cec, `${id}: slug ${e.slug} has no CEC block in the registry`);
    } else {
      assert.ok(e.listNumber != null && byNumber.has(e.listNumber), `${id}: needs a registry slug or a submitted-list number`);
    }
    assert.ok((e.sources ?? []).length >= 1, `${id}: election2026 without a source`);
  }
});

test("every serving faction has a dated, sourced coalition status that matches the id list", () => {
  const cfg = getCoalitionConfig();
  for (const f of getFactionMeta().values()) {
    if (f.id === 1097 || f.id === 1098 || f.id === 1109) continue; // no longer serving
    const st = getFactionStatus(f.id);
    assert.ok(st, `faction ${f.id} (${f.he}) has no status entry in coalition.yaml`);
    assert.match(st.since, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(st.status === "coalition", cfg.coalitionFactionIds.includes(f.id), `${f.id}: status disagrees with coalitionFactionIds`);
    if (st.changedMidTerm) {
      assert.ok(st.note && st.sources && st.sources.length >= 1, `${f.id}: a mid-term change needs a note and a source`);
    }
  }
});

test("a coalition under 61 is shown as a minority government with the law as its source", () => {
  const cfg = getCoalitionConfig();
  const m = getMajorityStatus();
  assert.equal(m.needed, 61);
  const last = cfg.timeline.at(-1);
  assert.ok(last, "the coalition file needs a timeline");
  assert.equal(m.size, last.size);
  assert.equal(m.minority, last.size < 61);
  if (m.minority) {
    // The date is the first step of the trailing run under 61 — Maoz's announcement (UTJ's exit two days earlier left 61).
    assert.equal(m.since, "2025-07-16");
    assert.ok(m.sources.length >= 1, "a minority note needs the Basic Law as a source");
    assert.ok(m.sources.some((s) => s.url.includes("knesset.gov.il")), "the majority rule must cite the Knesset");
    for (const s of m.sources) assert.match(s.url, /^https:\/\//);
  }
});
