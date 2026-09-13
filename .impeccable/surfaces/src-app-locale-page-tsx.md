---
version: 1
slug: "src-app-locale-page-tsx"
primary_target: "src/app/[locale]/page.tsx"
related_targets: ["src/app/globals.css","src/components/Header.tsx","src/components/Hemicycle.tsx"]
---

# Surface brief — home (`src/app/[locale]/page.tsx`)

Scope: the home page, first surface of a replacement visual world for the whole
site. Mode: **Operate** — the visitor is a citizen checking one thing, on a
phone, and must be able to find an MK or a vote and trust what they see.

Audience/job: arrive from search or a shared link; see the state of the Knesset
now; reach one member or one vote. Proof: 120 real MKs, 7,448 real votes, every
figure with a source and a date. Constraints: IS 5568 / WCAG AA; four locales,
two RTL; strict CSP (self-hosted assets only); no playful or campaign register;
national symbols (flag blue, the flag, the building) are the identity of
neutrality — for everyone, not one party.

## Direction contract

THESIS: The home page *is* the Knesset hall, live — every one of the 120 seats
a real member — in the colours of the flag. It refuses the category's
arrangement: a photograph of the building with statistics laid over it,
followed by cards.

OWN-WORLD: Flag blue (#0038b8) and white are the identity; Jerusalem stone, the
building's cladding, is the warm ground; ink for text. The flag's two stripes
become the structural rule of the chrome. The seat is the atomic component: a
filled seat is a sitting member, an outlined seat is absent, a turned seat
voted against its faction; coalition and opposition are the same blue, split
by the aisle. Frank Ruhl Libre for display (the face of the state's documents),
Heebo for UI and data. Every figure carries its source and date in a keyed
margin. Time-ranked lists are ruled tables, never card grids. Elevation only
for things that float.

STORY: The visitor sees who sits, who is missing and how the house splits,
believes it because each number sits beside where it came from and when, and
taps a seat — or types a name — to reach one member's record.

FIRST VIEWPORT (1440): a flag-blue bar with the wordmark, seven sections and
search. Below, on stone: the arc of 120 seats in six rows (six read closer to the hall's real depth than five), coalition on the
start side, opposition on the end side, "61" and "59" in display type at the
aisle, the search field on the dais at the arc's base. Beside the arc, the
"now" column: days to the election, this week's sittings, last sync. Beneath,
findings as ruled rows: most missed votes rendered as empty seats, most active
members, latest votes as a table. No photograph. At 390px the same 120 seats
render as two blocks facing across the aisle — same blue, same empty seats,
59·61 in the display face — then the same rows.

FORM: The Plenum — candidate 6 of 7 on the resonance-ordered list, seed key
260fa93b; hall materials translated to the brand pin (seat leather → flag blue,
hall plaster → Jerusalem stone), topology and states kept intact. Raises kept
from the hand: keyed source margin (apparatus), ruled time tables (board),
locked palette (pc98), state in form not hue (emission), timestamps on every
figure (dive), stepwise collapse with a semantic table beneath (miura).

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance.

Unresolved: whether the wordmark keeps flag-filled lettering or becomes a flat
blue wordmark beside a small flag; decided at build against the blue bar.
