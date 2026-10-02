import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createElement as h, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { getElectionOutlook } from "../../src/lib/content";
import { ListRosters, ListsTable } from "../../src/components/election/SubmittedLists";

// /elections was the site's heaviest page, in good part because of the
// submitted lists' rosters; they moved to /elections/lists, and /elections
// keeps a compact table of the lists. Rendered here in Hebrew with the real
// messages and content; the data-text cache is the identity (Hebrew as Hebrew).
const ROOT = process.cwd();
const messages = JSON.parse(fs.readFileSync(path.join(ROOT, "messages", "he.json"), "utf8"));
const lists = getElectionOutlook()?.submittedLists?.lists ?? [];
const loc = (he: string | null | undefined) => ({ text: (he ?? "").trim(), translated: false, rtl: true });
const render = (el: ReactElement) =>
  renderToStaticMarkup(h(NextIntlClientProvider, { locale: "he", messages, timeZone: "Asia/Jerusalem", children: el }));
// renderToStaticMarkup's text escaping, to find a name in the markup.
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

test("/elections/lists renders every submitted list with its full roster, under a stable id", () => {
  assert.ok(lists.length >= 38, `expected the 38 submitted lists, got ${lists.length}`);
  const html = render(h(ListRosters, { lists, loc, names: new Map() }));
  const sections = html.split('<section id="list-').slice(1);
  assert.equal(sections.length, lists.length, "one section per list");
  let total = 0;
  lists.forEach((l, i) => {
    const s = sections[i];
    const roster = l.candidates ?? [];
    assert.ok(s.startsWith(`${l.listNumber}"`), `section ${i} should be list-${l.listNumber}`);
    assert.equal((s.match(/<li\b/g) ?? []).length, roster.length, `list ${l.listNumber}: ${roster.length} candidates in content/election.yaml`);
    for (const c of roster) assert.ok(s.includes(esc(c.he)), `list ${l.listNumber}: ${c.he} missing`);
    assert.ok(s.includes(esc(l.letters)), `list ${l.listNumber}: letters missing`);
    assert.ok(s.includes(`href="${l.url}"`), `list ${l.listNumber}: its CEC page (the source) missing`);
    total += roster.length;
  });
  assert.ok(total > 1000, `expected the full rosters, got ${total} names`);
  assert.equal((html.match(/<li\b/g) ?? []).length, total, "every name in content/election.yaml, once");
});

test("/elections shows the lists compactly (letters, name, head) and renders no roster", () => {
  const html = render(h(ListsTable, { lists, loc, names: new Map() }));
  assert.equal((html.match(/<tbody[\s\S]*<\/tbody>/)?.[0].match(/<tr\b/g) ?? []).length, lists.length, "one row per list");
  assert.doesNotMatch(html, /<(ol|ul|li|details)\b/, "no roster markup");
  for (const l of lists) {
    assert.ok(html.includes(esc(l.letters)) && html.includes(esc(l.name.he)), `list ${l.listNumber}: letters or name missing`);
    assert.ok(html.includes(`href="${l.url}"`), `list ${l.listNumber}: its CEC page (the source) missing`);
    // The head is candidate 1; nobody below them appears.
    for (const c of (l.candidates ?? []).slice(1)) assert.ok(!html.includes(esc(c.he)), `list ${l.listNumber}: ${c.he} shown on /elections`);
  }
  const page = fs.readFileSync(path.join(ROOT, "src/app/[locale]/elections/(overview)/page.tsx"), "utf8");
  assert.match(page, /<ListsTable\b/, "/elections renders the compact table");
  assert.doesNotMatch(page, /ListRosters|rosterCount/, "/elections must not render the rosters");
  assert.match(page, /id="all-lists"/, "the home banner links to /elections#all-lists");
  assert.match(page, /href="\/elections\/lists"/, "one link to every roster");
});
