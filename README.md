# הכנסת שלי · My Knesset

[![Code license: AGPL-3.0](https://img.shields.io/badge/code-AGPL--3.0-blue.svg)](LICENSE)
[![Content: CC BY-SA 4.0](https://img.shields.io/badge/content-CC--BY--SA--4.0-lightgrey.svg)](LICENSING.md)

A multilingual, public-transparency website that helps people understand the
**Israeli Knesset** (parliament): its members, factions, the coalition/opposition
balance, full plenum voting records with per-member participation statistics,
curated and sourced "public record" notes per member, and party political
profiles. Hebrew-first, with English, Arabic, and Russian.

> **For AI agents / designers reading this:** this file is the canonical context
> for the project. It tells you what the site is, who it's for, how it's built,
> where data comes from, and how to extend it — so you can work on it without
> further explanation. Read [`AGENTS.md`](AGENTS.md) too (it warns that this
> Next.js version has breaking changes — consult `node_modules/next/dist/docs/`
> before writing Next-specific code).

## What this site is (purpose & audience)

- **Goal:** make the Knesset legible to ordinary citizens. Who are the members,
  which party are they in, who's in the coalition vs. opposition, how many seats
  each party holds, how every MK voted on every plenum vote, who shows up and who
  doesn't, and what each party actually stands for.
- **Audience:** the Israeli public (hence Hebrew default + Arabic/Russian for
  large minority communities, and English for international readers).
- **Stance:** neutral and factual. Data comes from official/open sources;
  editorial content is clearly labeled and **every claim about a person cites a
  source**. The site is explicitly *not* an official Knesset site (see the footer
  disclaimer) and must remain accessible under Israeli law.

## Feature map

| Area | Page(s) | Notes |
|---|---|---|
| Dashboard | `/` | Seats-by-faction bar, coalition vs. opposition totals, latest votes + **vote search**, participation leaderboards |
| Members | `/members`, `/members/[id]` | Filter by faction / bloc / **search by name or party** (any language). Profile: photo (+license), roles, faction history, **participation stats (present vs. absent)**, recent votes, **curated public record with sources** |
| Factions | `/parties`, `/parties/[id]` | Seats, coalition badge, avg participation; **political spectrum bar, summary, key positions, leader** (editorial) |
| Votes | `/votes`, `/votes/[id]` | Searchable list; detail shows **reading stage** (preliminary/1st/2nd/3rd), **"what a 'for' vote means"**, the official agenda subject, and **every MK's vote incl. absentees**, grouped by faction with turnout |
| Accessibility | `/accessibility` + floating widget | Israeli Standard IS 5568 / WCAG 2.0 AA |
| Elections + quiz | *planned* | 2026 election (date volatile), party-fit quiz |

## Tech stack

- **Next.js 16 (App Router) + TypeScript + React 19**, **Tailwind CSS v4**.
- **next-intl** for i18n. Locales: `he` (default, served at `/`), `en`, `ar`,
  `ru` (prefixed). `he`/`ar` render RTL. UI strings live in `messages/<locale>.json`.
  Routing/middleware: `src/i18n/`, `src/proxy.ts`.
- **SQLite via Drizzle ORM** (`better-sqlite3`). DB file: `data/knesset.db`
  (gitignored, read-only at request time). Schema: `src/db/schema.ts`.
- Data access lives in `src/lib/queries.ts`; editorial content loading + Zod
  validation in `src/lib/content.ts`.

## Getting started

```bash
npm install
npm run db:push          # create the SQLite schema (data/knesset.db)
npm run sync             # pull data from the Knesset API + Wikidata (takes a while)
npm run dev              # http://localhost:3000
```

Other scripts: `npm run build`, `npm run lint`.

## Data sources (all verified working)

- **Knesset OData V4** — `https://knesset.gov.il/OdataV4/ParliamentInfo/` (no auth,
  JSON, 100 rows/page). Members (`KNS_Person`), positions (`KNS_PersonToPosition`,
  `KNS_Position`), factions (`KNS_Faction`), plenum votes (`KNS_PlenumVote`),
  per-MK results (`KNS_PlenumVoteResult`), agenda items (`KNS_PlmSessionItem`).
- **Wikidata** (SPARQL) — multilingual names (he/en/ar/ru), photos via P18 (with
  per-file Commons license + attribution), Hebrew Wikipedia links. Joined to
  Knesset IDs via P9770, with a name-search fallback.
- **Editorial (curated) content** — anything the API doesn't provide. **Coalition
  membership, party political positions, and per-member good/bad records are NOT
  in any API** and are maintained by hand in `content/` (see below).

Current scope: **the 25th Knesset** (`CURRENT_KNESSET = 25` in
`src/lib/constants.ts`). Vote records exist from ~2004; physical attendance is not
published anywhere (we derive participation from votes).

## Updating the data (how data gets in)

**`npm run update` refreshes everything** — members, biographies, votes, bills,
parliamentary activity, the law book, budget, lobbyists, and recomputed stats —
in one command. Run it whenever you want fresh data. (`npm run sync` is the same
thing; `update` is just the friendly name.) It is idempotent (upserts) and
incremental on each table's `LastUpdatedDate` (cursor in `sync_state`); the large
`KNS_PlenumVoteResult` backfill (~480k rows) **checkpoints every 10k rows so it
resumes after interruption**, and the run ends by folding the WAL back into
`data/knesset.db` so the committed file is self-contained. Run it on a schedule
(the bundled GitHub Action does this every 6h) to keep data fresh.

Data text (vote/law/committee/budget names, bios) is **not** translated in the
sync — it translates lazily on first view via the unified cache, so new data
auto-localizes with no batch step.

```
npm run update              # everything (recommended)
npm run sync -- --members   # persons/factions/positions + Wikidata + biographies
npm run sync -- --bio       # just refresh Wikidata biographies
npm run sync -- --votes     # vote headers + results + subjects, then totals + stats
npm run sync -- --budget    # Ministry of Finance budget (data.gov.il)
npm run sync -- --stats     # recompute mk_vote_stats + vote totals only
```

Sync modules: `members.ts` (persons/factions/positions), `wikidata.ts`
(enrichment + QID capture), `biography.ts` (Wikidata bio: born/education/military/
career timeline), `votes.ts` (votes/results/subjects + `forDesc` reading stage),
`bills.ts`, `activity.ts` (queries/agendas/committees/law book), `budget.ts`,
`lobbyists.ts`, `stats.ts` (per-MK participation), `odata.ts` (paged fetch helper).

## Data model (key tables)

- `persons` — MK id (PK), Hebrew name, en/ar/ru names, photo + license +
  attribution, Wikipedia link, `wikidata_id`, `is_current`, `mk_site_code`.
- `person_bio` — Wikidata-sourced biography per member: date/place of birth,
  education, occupations, military service, and a dated career timeline
  (`career_json`). Rendered as the "Biography & background" section.
- `factions` — faction id (PK), Hebrew name, `knesset_num`, `is_current`.
- `person_positions` — person↔faction↔role per Knesset, with date ranges and
  `is_current` (drives "who's an MK now", ministers, committee roles).
- `votes` — vote id, datetime, Hebrew title, `item_name`/`item_type_desc`
  (agenda subject), `for_desc`/`against_desc` (procedural meaning + reading
  stage), totals, `is_accepted`.
- `vote_results` — (voteId, personId) → result code: 1 for, 2 against, 3 abstain,
  4 did-not-vote, 0 cancelled (see `src/lib/constants.ts`).
- `mk_vote_stats` — precomputed per-MK: votes held while serving, participated,
  for/against/abstain, missed, participation %.
- `sync_state` — incremental-sync cursors.

## Editorial content (where humans/AI add the non-API knowledge)

All in `content/`, validated by Zod at load time (`src/lib/content.ts`):

- `content/coalition.yaml` — coalition faction IDs for the current Knesset.
  **Must be reviewed after political changes** (resignations, new agreements).
- `content/factions.yaml` — short faction display names (4 langs) + chart colors.
- `content/party-profiles.yaml` — political spectrum, summary, key positions,
  leader, founded, links. Editorial; **review before publishing**.
- `content/members/<personId>.yaml` — a member's "public record": positive
  (awards, achievements) and negative (convictions, investigations) claims.
  **The schema requires every claim to cite ≥1 source**, with a localized title.
  Seeded examples: `965.yaml` (Netanyahu — trial), `2291.yaml` (Deri — convictions).

## Accessibility (legally required in Israel)

The site targets **Israeli Standard IS 5568 (≈ WCAG 2.0 AA)**:
- Floating **accessibility widget** (`src/components/AccessibilityMenu.tsx`):
  text size, high contrast, grayscale, highlight links, readable font, stop
  motion — persisted to `localStorage`, applied via `<html>` classes defined in
  `src/app/globals.css`.
- **Accessibility statement** at `/accessibility` (linked in the footer) with the
  required conformance level, features, limitations, **accessibility-coordinator
  contact (placeholder — fill in real name/email/phone before launch)**, and date.
- Skip-to-content link, visible focus outlines, `prefers-reduced-motion`, per-locale
  `lang`/`dir`, semantic landmarks, image alt text.
- **When adding pages:** keep one `<h1>`, label icon-only buttons with `aria-label`,
  ensure contrast, and on statically rendered pages call `setRequestLocale(locale)`
  (otherwise next-intl falls back to the default locale).

## Conventions for contributors (and AI agents)

- **Don't hardcode user-facing strings** — add keys to all four
  `messages/<locale>.json` files. Hebrew is the source of truth.
- **Hebrew-origin data** (vote titles, agenda subjects) is shown verbatim with
  `dir="rtl" lang="he"`, even inside other locales.
- **Never invent facts about people or legal interpretations.** Procedural meaning
  comes from official option text; the "public record" needs real sources.
- Keep API access in the sync job; pages read only from SQLite via `src/lib/queries.ts`.
- Run `npx tsc --noEmit` and `npm run lint` before finishing.

## Project status

Phases 1–3 done (foundation, members/factions, votes/stats, curated records,
party profiles, accessibility). Next: the 2026 elections section + party-fit quiz.
See `.claude/plans/wise-churning-wall.md` for the living plan.

## License & contributing

- **Code:** [AGPL-3.0-or-later](LICENSE) — run a modified hosted copy, share your
  source. **Editorial content:** CC BY-SA 4.0. Third-party data keeps its upstream
  license. Full details + attribution in [LICENSING.md](LICENSING.md).
- How to contribute: [CONTRIBUTING.md](CONTRIBUTING.md) ·
  Conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) ·
  Security: [SECURITY.md](SECURITY.md).
- This is not an official Knesset site; see `/sources` for data provenance.
