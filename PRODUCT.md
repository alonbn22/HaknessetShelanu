# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: an Israeli citizen checking one thing. They heard about a vote or a
member of Knesset, arrive from a search result or a shared link, usually on a
phone, and want one answer they can trust in under a minute. (Confirmed.)

Secondary, unranked (inferred from the feature set, not confirmed): journalists
and researchers pulling records and comparisons; activists and NGOs tracking
accountability over time; students using the dictionary and election compass.

Hebrew-first. Arabic and Russian serve large minority communities; English
serves international readers. Two of the four locales are right-to-left.

## Product Purpose

Make the Knesset legible to ordinary citizens: who the members are, which
faction they sit in, the coalition/opposition balance, how every MK voted on
every plenum vote, who shows up and who doesn't, and what each party stands
for. Success (confirmed, all four): trusted at a glance; shared around the
election; cited by journalists; visited weekly for what changed.

## Positioning

Explicitly not the official Knesset site — the footer says so, and where data
conflicts the Knesset site prevails. What a neighbouring site cannot truthfully
copy: per-member party-discipline percentages with a drill-down to the exact
votes where the MK broke with their faction; a leaderboard of missed votes
beside the leaderboard of attendance; parliamentary questions with
answered/unanswered status and response time; a voting-agreement rate between
any two MKs; and a "voting days" count for the whole plenum. Every one of these
is computed from the official open-data API and shown with its source.

## Operating Context

Read-only public site backed by a committed SQLite database (~57MB) that a
GitHub Action re-syncs every ~6 hours from the Knesset OData API, Wikidata
and data.gov.il. Data text (vote titles, bill names) is Hebrew at source and is
machine-translated lazily for the other locales, so translated text is marked
"automatic translation" and untranslated Hebrew renders inside RTL/lang
attributes in any locale. No visitor accounts, no cookies, no personal data.

## Capabilities and Constraints

- Routes: home, members (+profile, compare, ministers, most active),
  factions (+profile), votes (+record), laws, law book, committees, budget,
  lobbyists, attendance, 2026 elections, election compass (quiz), dictionary,
  sources, accessibility statement, tickets.
- Next.js 16 App Router, React 19, Tailwind v4 (no config file; tokens live in
  `src/app/globals.css` under three roots: light, dark, high-contrast), next-intl
  with typed routes. No styling dependencies; CI pinned by SHA.
- A strict per-request nonce CSP: `img-src` is self plus two Wikimedia hosts
  only; no third-party scripts or fonts at runtime (fonts via next/font).
- Semantic token layer and a primitives layer (`src/components/ui/`) landed on
  branch `design/overhaul`; the class-name dark-mode retrofit still coexists
  and is being ratcheted out.
- Undecided (open): whether one multi-script face (e.g. Rubik) replaces the
  current three; whether the home page opens on a photograph at all.

## Brand Commitments

Name: הכנסת שלנו / Our Knesset. Content, data, sources, the legal wording and
functionality are not open to change.

**Israeli patriotism as the signal of neutrality** (confirmed, binding). The
site shows the reality of the Knesset for everyone, not for one party, and it
says so through the national symbols rather than any faction's: the blue of
the flag, the flag itself, and the Knesset building. These three are pinned
as the identity's materials. What they are *not*: campaign iconography. The
register **must not feel playful or campaign-like** (confirmed). A design
consequence the user's reasoning implies: coalition and opposition are both
Israel — the split between them is structural (the aisle), never blue-versus-
red. Party colours from `content/factions.yaml` remain data, shown only where
a faction is the subject.

An earlier answer ("nothing visual is sacred") is superseded by this one for
colour, flag and building; it still holds for layout, type, the photograph
*as a hero*, and the current wordmark's implementation.

## Evidence on Hand

Real data for every claim: 120 sitting MKs with Wikimedia photographs and
licences, 13 factions with real brand colours (`content/factions.yaml`), 7,448
plenum votes with per-member roll calls, committee agendas at ~96% coverage,
curated member records where every item cites a source
(`content/members/*`), election key dates with sources
(`content/election.yaml`). Assets: `public/assets/knesset-holyland.jpg` (CC
BY-SA 4.0, credited), `public/assets/flag-fill.png`, per-party emblems under
`public/assets/party/`. No testimonials, press, or usage figures exist; do not
invent any.

## Product Principles

1. The number and its source travel together; nothing is shown that cannot
   be traced.
2. A finding outranks a fact: what an MK *did* is more prominent than what
   they *are*.
3. Neutral in wording, never in legibility — make the record clear, never the
   verdict.
4. Four scripts, one identity: nothing may look finished in Hebrew and broken
   in Arabic, or vice versa.
5. Freshness is visible: a visitor can tell when the data last moved.

## Accessibility & Inclusion

Israeli Standard 5568 (WCAG 2.0 AA) is a legal requirement, not a target.
The site ships an accessibility menu (contrast, grayscale, link highlighting,
heading highlighting, keyboard mode, readable font, no motion, text scaling)
and a skip link; the redesign must not regress any of them. AccessLint
currently reports zero automated violations on the five key pages.
