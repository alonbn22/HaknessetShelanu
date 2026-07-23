# הכנסת שלנו · Our Knesset

[![Code license: AGPL-3.0](https://img.shields.io/badge/code-AGPL--3.0-blue.svg)](LICENSE)
[![Content: CC BY-SA 4.0](https://img.shields.io/badge/content-CC--BY--SA--4.0-lightgrey.svg)](LICENSING.md)

A multilingual, public-transparency website that helps people understand the
**Israeli Knesset** (parliament): its members, factions, the coalition/opposition
balance, full plenum voting records with per-member participation statistics,
side-by-side member comparison, bills and the law book, committees, the state
budget, the lobbyist registry, a political dictionary, curated and sourced
"public record" notes per member, and party political profiles. Hebrew-first,
with English, Arabic, and Russian.

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
| Dashboard | `/` | **Seats-by-faction with a bar/hemicycle toggle** (bar default), coalition vs. opposition totals, latest votes + search, participation leaderboards, most-active legislators, a controversial-laws section |
| Global search | `/search` | One box across members, factions, votes, laws, committees, lobbyists, and the dictionary; cross-language (query is translated to Hebrew to match the data) |
| Members | `/members`, `/members/[id]` | Filter by faction / bloc / **search by name or party** (any language). Profile: photo (+license), roles, **full multi-Knesset faction history**, biography (Wikidata), **participation stats**, **party-discipline % with a rebellion drill-down** (the exact votes where the MK broke with their faction), parliamentary questions **with answered/unanswered + response-time accountability**, sponsored bills, committees, recent votes, **curated public record with sources** |
| Compare | `/compare` | Pick two MKs → side-by-side stats **plus a voting-agreement rate** (how often they voted the same way) |
| Factions | `/parties`, `/parties/[id]` | Seats, coalition badge, avg participation; **political spectrum bar, summary, key positions, leader, ballot letters** (editorial) |
| Ministers | `/ministers` | The sitting government; explains the "Norwegian Law" (ministers who vacated their seat) |
| Votes | `/votes`, `/votes/[id]` | Searchable list; detail shows **reading stage**, "what a 'for' vote means", the agenda subject, and **every MK's vote incl. absentees** grouped by faction, with the authoritative tally + a reconciliation note when a voter is a former member |
| Bills & laws | `/laws`, `/laws/[id]`, `/lawbook` | Bills that reached plenum votes (with documents + sponsors) and a per-bill **legislative journey**; `/lawbook` is the separate consolidated Israel law book |
| Legislators | `/legislators` | Most-active legislators, ranked by bills sponsored |
| Committees | `/committees`, `/committees/[id]` | Standing/special committees + memberships |
| Budget | `/budget` | Ministry of Finance budget by ministry/area/line, with history + search |
| Lobbyists | `/lobbyists` | The official lobbyist registry (firms, clients), sortable; foreign-funding context |
| Attendance | `/attendance` | Serving-members participation leaderboard |
| Elections + quiz | `/elections`, `/quiz` | Knesset election history; an election-compass party-fit quiz (editorial) |
| Dictionary | `/glossary` | Plain-language political terms, grouped by topic, each sourced |
| Transparency | `/sources`, `/tickets` | Every data source listed; report-wrong / suggest-new flows open GitHub tickets. A site-wide work-in-progress notice sits at the top of every page |
| Accessibility | `/accessibility` + floating widget | Israeli Standard IS 5568 / WCAG 2.0 AA |

## Tech stack

- **Next.js 16 (App Router) + TypeScript + React 19**, **Tailwind CSS v4**.
- **next-intl** for i18n. Locales: `he` (default, served at `/`), `en`, `ar`,
  `ru` (prefixed). `he`/`ar` render RTL. UI strings live in `messages/<locale>.json`.
  Routing/middleware: `src/i18n/`, `src/proxy.ts`.
- **SQLite via Drizzle ORM** (`better-sqlite3`). DB file: `data/knesset.db` —
  **committed to the repo** (that's how deploys and the scheduled sync stay
  incremental); only the transient `*.db-wal/-shm/-journal` sidecars are
  gitignored. Read-only at request time except the lazy-translation cache.
  Schema: `src/db/schema.ts`.
- Data access lives in `src/lib/queries.ts`; editorial content loading + Zod
  validation in `src/lib/content.ts`.

## Getting started

```bash
npm install
npm run db:push          # create the SQLite schema (data/knesset.db)
npm run sync             # pull data from the Knesset API + Wikidata (takes a while)
npm run dev              # http://localhost:3000
```

Other scripts: `npm run build`, `npm run lint`, `npm test`,
`npm run db:clean` (drop stale WAL sidecars + integrity-check the DB).

Env: set `NEXT_PUBLIC_SITE_URL` to the production origin (no trailing slash) so
the sitemap, robots.txt, and OpenGraph URLs resolve to the real domain.

## Data sources (all verified working)

- **Knesset OData V4** — `https://knesset.gov.il/OdataV4/ParliamentInfo/` (no auth,
  JSON, 100 rows/page). Members (`KNS_Person`), positions (`KNS_PersonToPosition`,
  `KNS_Position`), factions (`KNS_Faction`), plenum votes (`KNS_PlenumVote`),
  per-MK results (`KNS_PlenumVoteResult`), agenda items (`KNS_PlmSessionItem`),
  bills + documents + initiators (`KNS_Bill`, `KNS_DocumentBill`, `KNS_BillInitiator`),
  committees (`KNS_Committee`), parliamentary questions (`KNS_Query`), agenda
  motions (`KNS_Agenda`), the Israel law book (`KNS_IsraelLaw`), and the lobbyist
  registry (`V_Lobbyist*`).
- **Ministry of Finance via data.gov.il** — the detailed state budget (by ministry,
  area, program, and budget line) and execution reports. Powers `/budget`.
- **Wikidata** (SPARQL) — multilingual names (he/en/ar/ru), photos via P18 (with
  per-file Commons license + attribution), Hebrew Wikipedia links, and biographies
  (born/education/occupations/military/career). Joined to Knesset IDs via P9770,
  with a name-search fallback.
- **Google Translate (unofficial `gtx` endpoint)** — lazy on-the-fly translation
  of Hebrew data text (vote/law/committee/budget names), cached in a unified
  `translations` table. Labeled "automatic translation" in the UI.
- **Editorial (curated) content** — anything the API doesn't provide. **Coalition
  membership, party political positions + ballot letters, and per-member good/bad
  records are NOT in any API** and are maintained by hand in `content/` (see below).

Current scope: **the 25th Knesset** (`CURRENT_KNESSET = 25` in
`src/lib/constants.ts`). Vote records exist from ~2004; physical attendance is not
published anywhere (we derive participation from votes).

## Updating the data (how data gets in)

**`npm run update` refreshes everything** — members, biographies, votes, bills,
parliamentary activity, the law book, budget, lobbyists, and recomputed stats —
in one command. Run it whenever you want fresh data. (`npm run sync` is the same
thing; `update` is just the friendly name.) It is idempotent (upserts) and
incremental on each table's `LastUpdatedDate` (cursor in `sync_state`). The
initial `KNS_PlenumVoteResult` backfill (~480k rows) fetches the term in
parallel date windows; if it's interrupted it restarts on the next run (only
the first-ever sync is a backfill — after that everything is incremental). The
run ends by folding the WAL back into `data/knesset.db` so the committed file
is self-contained. Run it on a schedule (the bundled GitHub Action does this
every 6h, verifies DB integrity, and commits the refreshed file) to keep data
fresh.

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
- `mk_id_map` — maps `KNS_PlenumVoteResult.MkId` to the real `KNS_Person.Id` for
  MKs whose vote id-space differs (rebuilt every vote sync; declared in the schema
  so `db:push` keeps it — see `remapVoteResultMkIds` in `votes.ts`).
- `mk_vote_stats` — precomputed per-MK: votes held while serving, participated,
  for/against/abstain, missed, participation %.
- `bills` / `bill_initiators`, `committees`, `queries`, `agendas`, `israel_laws`,
  `lobbyists`, `budget_lines` — bills + sponsors, committees, parliamentary
  questions, agenda motions, the law book, the lobbyist registry, and the budget.
- `translations` — unified lazy-translation cache (`source_he` PK → en/ar/ru).
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

## Security posture

The app is read-only with no visitor accounts, so the surface is small; it's still
locked down defensively:

- **Strict Content-Security-Policy** set per request in `src/proxy.ts`:
  `script-src` uses `'strict-dynamic'` + a fresh per-request **nonce**, so only
  first-party scripts Next.js emits (and the one nonce-stamped inline theme
  snippet) run — an injected `<script>` is refused. `object-src 'none'`,
  `base-uri`/`form-action`/`frame-ancestors 'self'`; `'unsafe-eval'` is dev-only.
- **Static hardening headers** in `next.config.ts`: HSTS (2-year, preload),
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options`, and a
  camera/mic/geolocation-denying `Permissions-Policy`.
- SQL goes through parameterized Drizzle queries with `LIKE` wildcards escaped;
  outbound sync requests are HTTPS-only; `target="_blank"` links carry
  `rel="noopener"`.
- `tests/security/` locks this in (SQL-injection, HTTPS-only, no hardcoded
  secrets, XSS surface, translation-proxy limits, and the header/CSP posture).

Full details and how to report a vulnerability: [SECURITY.md](SECURITY.md).

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

Live and broad: members/factions, votes + per-MK stats, member comparison with
a voting-agreement rate, party-discipline metrics with a rebellion drill-down,
question-response accountability, bill journeys + the law book, committees, the
budget, lobbyists, the dictionary, elections history + the party-fit quiz,
global search, per-page metadata + a full sitemap, curated member records, party
profiles, a hardened CSP/security-header posture, accessibility, and the
transparency pages. The
remaining roadmap (dark mode, committee calendars, status-code decoding) and
**ideas for data we could still surface from the APIs** are tracked in
[`ROADMAP.md`](ROADMAP.md).

## License & contributing

- **Code:** [AGPL-3.0-or-later](LICENSE) — run a modified hosted copy, share your
  source. **Editorial content:** CC BY-SA 4.0. Third-party data keeps its upstream
  license. Full details + attribution in [LICENSING.md](LICENSING.md).
- How to contribute: [CONTRIBUTING.md](CONTRIBUTING.md) ·
  Conduct: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) ·
  Security: [SECURITY.md](SECURITY.md).
- This is not an official Knesset site; see `/sources` for data provenance.
