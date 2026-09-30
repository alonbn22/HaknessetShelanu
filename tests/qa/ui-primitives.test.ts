import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement as h, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Card } from "../../src/components/ui/Card";
import { SectionHeading } from "../../src/components/ui/SectionHeading";
import { Button, buttonClass } from "../../src/components/ui/Button";
import { Badge } from "../../src/components/ui/Badge";
import { ToggleGroup, ToggleButton } from "../../src/components/ui/ToggleGroup";
import { TextField, SelectField } from "../../src/components/ui/Field";
import { Meter } from "../../src/components/ui/Meter";
import { Stat, StatGrid } from "../../src/components/ui/Stat";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { TableFrame } from "../../src/components/ui/TableFrame";
import { PartyEmblem } from "../../src/components/PartyEmblem";

// Render smoke test for src/components/ui: each primitive renders, its variant
// maps produce the intended static classes, and the accessibility attributes
// that are the whole point of some of them are actually emitted. Children go
// in the props object so tsc checks each primitive's prop contract from here
// too. ButtonLink and ToggleLink wrap next-intl's Link, which needs the app
// router mounted, so they are not rendered; they reuse buttonClass /
// togglePillClass, whose output the button forms below assert.
const render = (el: ReactElement) => renderToStaticMarkup(el);

test("Card: hairline surface, padding variants, element choice, no shadow", () => {
  const md = render(h(Card, { children: "x" }));
  assert.equal(md, '<div class="rounded-card border border-line bg-surface p-6">x</div>');
  assert.match(render(h(Card, { padding: "sm", as: "section", children: "x" })), /^<section class="[^"]*\bp-4\b/);
  assert.doesNotMatch(render(h(Card, { padding: "none", children: "x" })), /\bp-\d/);
  assert.doesNotMatch(md, /shadow/);
});

test("SectionHeading: sizes, an eyebrow with no uppercase or tracking, aside slot", () => {
  assert.equal(render(h(SectionHeading, { children: "T" })), '<h2 class="text-xl font-semibold">T</h2>');
  const eb = render(h(SectionHeading, { variant: "eyebrow", as: "h3", children: "T" }));
  assert.match(eb, /^<h3 class="text-sm font-semibold text-muted">/);
  assert.doesNotMatch(eb, /uppercase|tracking/);
  const withAside = render(h(SectionHeading, { aside: h("a", { href: "/x" }, "all"), children: "T" }));
  assert.match(withAside, /justify-between/);
  assert.match(withAside, /<h2 class="text-xl font-semibold">T<\/h2><a href="\/x">all<\/a>/);
});

test("Button: explicit variants and sizes, safe default type, static classes", () => {
  const primary = render(h(Button, { children: "Go" }));
  assert.match(primary, /^<button type="button" class="/);
  assert.match(primary, /bg-accent text-on-accent hover:bg-accent-deep/);
  assert.match(primary, /px-4 py-2 font-semibold/);
  assert.match(
    render(h(Button, { variant: "secondary", size: "sm", children: "x" })),
    /border border-accent-line text-accent-ink hover:bg-accent-soft px-3 py-1\.5 text-sm font-medium/,
  );
  assert.match(
    render(h(Button, { variant: "ghost", size: "lg", children: "x" })),
    /text-foreground hover:bg-surface-sunken px-5 py-2\.5/,
  );
  assert.match(render(h(Button, { type: "submit", disabled: true, children: "x" })), /type="submit"[^>]*disabled=""/);
  assert.ok(buttonClass("secondary", "sm", "w-full").endsWith(" w-full"));
});

test("Badge: every tone maps to its soft fill and ink", () => {
  for (const tone of ["pass", "fail", "warn", "info", "neutral", "accent"] as const) {
    assert.match(render(h(Badge, { tone, children: "x" })), new RegExp(`bg-${tone}-soft text-${tone}-ink`));
  }
  assert.match(render(h(Badge, { children: "x" })), /bg-neutral-soft/);
});

test("PartyEmblem fallback tile writes in whichever ink reads on the party colour", () => {
  const tile = (color: string) => render(h(PartyEmblem, { factionId: 0, nameHe: "x", color, alt: "x" }));
  assert.match(tile("#0f9bd7"), /color:#000/); // light blue: white measured 3.13:1
  assert.match(tile("#1a1a2e"), /color:#fff/);
});

test("ToggleGroup: labelled group; ToggleButton emits aria-pressed and the selected fill", () => {
  const out = render(
    h(ToggleGroup, {
      label: "Sort",
      children: [
        h(ToggleButton, { key: "a", selected: true, children: "A" }),
        h(ToggleButton, { key: "b", selected: false, children: "B" }),
      ],
    }),
  );
  assert.match(out, /^<div role="group" aria-label="Sort"/);
  assert.match(out, /<button type="button" aria-pressed="true" class="[^"]*bg-accent text-on-accent[^"]*">A<\/button>/);
  assert.match(out, /aria-pressed="false" class="[^"]*bg-surface-sunken[^"]*">B<\/button>/);
});

test("TextField / SelectField: visible label bound to the control, hint described-by", () => {
  const tf = render(h(TextField, { id: "q", label: "Search", hint: "Any language", placeholder: "…" }));
  assert.match(tf, /<label for="q"[^>]*>Search<\/label>/);
  assert.match(tf, /<input id="q" aria-describedby="q-hint"/);
  assert.match(tf, /<p id="q-hint"/);
  assert.doesNotMatch(render(h(TextField, { id: "n", label: "N" })), /aria-describedby/);
  const sf = render(h(SelectField, { id: "s", label: "Sort", children: h("option", { value: "a" }, "A") }));
  assert.match(sf, /<label for="s"/);
  assert.match(sf, /<select id="s"[^>]*><option value="a">A<\/option><\/select>/);
});

test("Meter: role, value range, clamped width, tone fill", () => {
  const m = render(h(Meter, { value: 30, max: 120, label: "Seats" }));
  assert.match(m, /role="meter" aria-label="Seats" aria-valuenow="30" aria-valuemin="0" aria-valuemax="120"/);
  assert.match(m, /style="width:25%"/);
  assert.match(render(h(Meter, { value: 500, label: "x" })), /width:100%/);
  assert.match(render(h(Meter, { value: 1, tone: "opposition", label: "x" })), /bg-opposition/);
});

test("Stat / StatGrid: tabular figures, accent tone, static column maps", () => {
  assert.match(
    render(h(Stat, { value: "7,448", label: "Votes", tone: "accent" })),
    /text-3xl font-bold tabular-nums text-accent-ink">7,448</,
  );
  assert.match(render(h(StatGrid, { columns: 3, children: "x" })), /grid gap-4 grid-cols-2 sm:grid-cols-3/);
  assert.match(render(h(StatGrid, { children: "x" })), /sm:grid-cols-4/);
});

test("EmptyState and TableFrame", () => {
  const e = render(h(EmptyState, { title: "Nothing here", action: h("a", { href: "/" }, "Home"), children: "Try widening" }));
  assert.match(e, /border-dashed/);
  assert.match(e, /Nothing here.*Try widening.*<a href="\/">Home<\/a>/);
  assert.match(
    render(h(TableFrame, { children: h("table", null) })),
    /^<div class="overflow-x-auto rounded-card border border-line bg-surface"><table>/,
  );
});

test("no variant lookup ever produces a broken class string", () => {
  const all = [
    render(h(Card, { padding: "none", children: "x" })),
    render(h(Button, { variant: "ghost", size: "sm", children: "x" })),
    render(h(Badge, { tone: "warn", children: "x" })),
    render(h(StatGrid, { columns: 5, children: "x" })),
    render(h(Meter, { value: 1, tone: "neutral", label: "x" })),
  ].join("\n");
  assert.doesNotMatch(all, /class="[^"]*(?:undefined|null|\[object)/);
});
