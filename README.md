# הכנסת שלנו · Our Knesset

[![CI](https://github.com/alonbn22/HaknessetShelanu/actions/workflows/ci.yml/badge.svg)](https://github.com/alonbn22/HaknessetShelanu/actions/workflows/ci.yml)
[![Code: AGPL-3.0](https://img.shields.io/badge/code-AGPL--3.0-blue.svg)](LICENSE)
[![Text: CC BY-SA 4.0](https://img.shields.io/badge/text-CC%20BY--SA%204.0-lightgrey.svg)](#license)

<div dir="rtl" lang="he">

**הכנסת שלנו** הוא אתר אזרחי חינמי, לא מסחרי ולא מפלגתי, שמנגיש את הכנסת לכל אחד ואחת: מי חברי הכנסת, איך כל אחד מהם הצביע, מה קורה בוועדות, ומי מתמודד בבחירות לכנסת ה-26 (27 באוקטובר 2026). לכל עובדה באתר יש מקור. האתר בעברית, וגם באנגלית, בערבית, ברוסית, בספרדית ובצרפתית.

הקוד פתוח, ומתנדבים מוזמנים לעזור: לתקן טעויות, לתרגם, להוסיף מקורות ולכתוב קוד. איך מתחילים: [CONTRIBUTING.md](CONTRIBUTING.md). זה אינו אתר רשמי של הכנסת, של הממשלה או של ועדת הבחירות המרכזית.

</div>

## What it is

Our Knesset is a free, non-commercial, non-partisan website that explains Israel's
parliament to anyone: who the members are, how each of them voted on every plenum
vote, who shows up, what the committees are working on, and, for the election to
the 26th Knesset on 27 October 2026, who is running and what each list says it
stands for.

It is Hebrew-first, with English, Arabic, Russian, Spanish and French. It is **not**
an official site of the Knesset, the government or the Central Elections Committee;
where our data and theirs differ, theirs prevails.

## Principles

- **Neutral.** The site describes; it never tells anyone how to vote. Wording is
  neutral, and the election compass is balanced between statements the right and
  the left agree with (a test enforces it).
- **Every fact has a source.** Every figure, claim, stance and poll links to where
  it came from, ideally the primary source: the Knesset's own record, the Central
  Elections Committee, a party's own platform, the outlet's own article. What we
  can't source, we don't show. "No stated position" is a valid answer.
- **Fair to people.** Nothing is invented about anyone. Every claim in a member's
  record cites at least one reputable source (the schema rejects a claim without
  one). Legal matters that aren't final are marked with their status, and the
  presumption of innocence applies. Neutral wording only; when in doubt, leave it
  out.
- **Simple for the average voter.** Plain words before terms, one idea per chart,
  details one click away. Built for a phone, right-to-left aware, and aiming to
  meet Israeli Standard 5568 for accessibility.

## Feature map

| Area | Pages | What you get |
|---|---|---|
| Home | `/` | Seats by faction, coalition and opposition, this week in the Knesset, the latest votes, the election countdown |
| Members | `/members`, `/members/[id]`, `/compare` | A profile per member: credited photo, roles, faction history, biography, participation in votes, party discipline and the votes where they broke ranks, questions to ministers and whether they were answered, bills, and a sourced public record. Side-by-side comparison with a voting-agreement rate |
| Factions and government | `/parties`, `/parties/[id]`, `/ministers` | Seats, coalition or opposition (dated and sourced), leaders and chairs, the sitting government |
| Votes and laws | `/votes`, `/laws`, `/lawbook`, `/legislators` | Every plenum vote with every member's vote, each bill's journey, the law book, the most active legislators |
| Committees | `/committees`, `/committees/[id]` | Chairs, members, and every sitting's agenda and documents |
| Budget and lobbying | `/budget`, `/lobbyists` | The state budget by ministry and budget line, the lobbyist registry |
| Attendance | `/attendance` | Participation in votes (the Knesset doesn't publish physical attendance) |
| 2026 election | `/elections`, `/elections/[slug]`, `/elections/lists`, `/elections/positions`, `/elections/history`, `/quiz` | Key dates; a page per running list (candidates, ballot letters, promises); every submitted list's full roster; seat polls from each outlet's own article and a poll-of-polls average; the lists' positions side by side; past elections; the election compass |
| Reference | `/glossary`, `/search`, `/sources`, `/tickets`, `/accessibility` | A plain-language political dictionary, search across the site, the data sources, reporting an error, the accessibility statement |

Every page is in all six languages. Data text from the Knesset (vote titles, bill
and committee names) is machine-translated and labelled as such; Hebrew that isn't
translated yet is shown right-to-left.

## Stack

- Next.js 16 (App Router), React 19, TypeScript. This Next.js version has breaking
  changes: read the guides in `node_modules/next/dist/docs/` before writing
  Next-specific code.
- next-intl with six locales. Hebrew is the default and lives at `/`; the others
  are prefixed (`/en`, `/ar`, `/ru`, `/es`, `/fr`). Hebrew and Arabic are
  right-to-left.
- Tailwind CSS v4 (design tokens in `src/app/globals.css`, no config file).
- SQLite through better-sqlite3 and Drizzle ORM. Schema: `src/db/schema.ts`.
- Editorial content in `content/*.yaml`, validated with Zod when it loads
  (`src/lib/content.ts`).
- Tests on Node's built-in test runner, run through tsx.
- A strict per-request Content-Security-Policy (`src/proxy.ts`). See
  [SECURITY.md](SECURITY.md).

## Getting started

You need Node.js 24 (the version CI uses) and git.

```bash
git clone --filter=blob:none https://github.com/alonbn22/HaknessetShelanu.git
cd HaknessetShelanu
npm ci
npm run db:pull
npm run dev
```

Open <http://localhost:3000> for Hebrew, or <http://localhost:3000/en> (also `/ar`,
`/ru`, `/es`, `/fr`).

Older history holds copies of the database, which makes a full clone large.
`--filter=blob:none` downloads only the files you check out; a plain `git clone`
works too.

### The database

The site reads one SQLite file, `data/knesset.db` (about 81 MB, 20 MB to
download). It isn't in git: it lives in the repository's
[`data-latest` release](https://github.com/alonbn22/HaknessetShelanu/releases/tag/data-latest),
which the daily sync updates. `npm run db:pull` downloads it (and checks its
checksum); run it again whenever you want fresher data, with the dev server
stopped. You don't need to run the data sync to work on the site.

The site opens the database read-only and never writes to it while it runs.

### Environment variables

Both are optional for local work.

| Variable | What it does |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | The public origin, no trailing slash. Used for the sitemap, robots.txt and share links. Set it in production. |
| `NEXT_PUBLIC_GITHUB_REPO` | `owner/repo` for the ticket links. Defaults to `alonbn22/HaknessetShelanu`; set it on a fork. |

Deploying: see [DEPLOY.md](DEPLOY.md).

## Tests

```bash
npm test            # all tests: content rules, translations, queries, security
npx tsc --noEmit    # type check
npm run lint        # ESLint
npm run build       # production build
```

CI runs all four on every pull request and every push to `master`
(`.github/workflows/ci.yml`). `npm run test:qa` and `npm run test:security` run
one suite each. Some tests read `data/knesset.db` (the compass test, for example,
checks that every cited vote exists in the Knesset record), so the database must be
in place.

Among other things, the tests check: identical keys in all six message files; no
Hebrew literals in `src/`; a source on every member-record claim and a status on
every legal one; polls that add up to 120 seats and cite the outlet's own article;
a balanced compass; and the security headers and CSP.

## Project layout

```
src/app/[locale]/    pages, one folder per route
src/components/      UI components (shared primitives in src/components/ui/)
src/lib/             queries.ts (database reads), content.ts (YAML loading and schemas),
                     i18n-data.ts and text.ts (translation and right-to-left helpers)
src/db/schema.ts     the database schema
src/i18n/            locales and routing
src/proxy.ts         middleware: locale routing and the per-request CSP
messages/            interface strings, one JSON file per language
content/             editorial content: elections, polls, compass, parties, glossary, member records
scripts/sync/        the data sync (Knesset API, Wikidata, data.gov.il)
tests/qa/            content, translation and logic tests
tests/security/      security tests
data/knesset.db      the database
```

## Updating the data (maintainers)

`npm run update` (or `npm run sync`) refreshes everything from the Knesset API,
Wikidata and data.gov.il. It is incremental: each table resumes from a cursor
stored in the database, so only the very first run is a full backfill. The
scheduled workflow `.github/workflows/sync-data.yml` runs it once a day, then
publishes the database to the `data-latest` release and triggers a deploy.

```bash
npm run update              # everything
npm run sync -- --members   # members, factions, roles, Wikidata, biographies
npm run sync -- --votes     # votes and results, then totals and statistics
npm run sync -- --activity  # committees, sittings, questions, agendas, the law book
npm run sync -- --budget    # the state budget
npm run sync -- --stats     # recompute statistics only
npm run warm                # pre-translate data text into the other languages
npm run db:clean            # check integrity, switch to a rollback journal, compact (nothing may have the DB open)
npm run db:publish          # upload data/knesset.db to the data-latest release (maintainers)
```

Every new table or index is declared in `src/db/schema.ts` first. See
[AGENTS.md](AGENTS.md).

## Data sources and licenses

| Source | What it provides | Terms |
|---|---|---|
| [Knesset open data](https://knesset.gov.il/OdataV4/ParliamentInfo/) | Members, factions, roles, plenum votes and each member's vote, bills, committees and their sittings, parliamentary questions, agenda motions, the law book, the lobbyist registry | The Knesset's open-data terms |
| [Central Elections Committee](https://www.bechirot.gov.il/home/) | Running lists, candidates, ballot letters, election dates | The committee's terms |
| [The Knesset website](https://main.knesset.gov.il) | Members' background (birth, education, occupation, military service) from each member's page, and their names in other languages from its member directory | The Knesset's terms |
| [Wikidata](https://www.wikidata.org) | Names in other languages, links | CC0 (public domain) |
| [Wikimedia Commons](https://commons.wikimedia.org) | Members' photos and some party logos | Each file under its own license, mostly Creative Commons; member profiles show each photo's author and license |
| [data.gov.il](https://data.gov.il) (Ministry of Finance) | The state budget | data.gov.il's open-data terms |
| The parties' own sites | Platforms, promises, logos | The parties' own; credited and linked on the site |
| News outlets | Seat polls (from each outlet's own article) and leaders' statements | The outlets' own; credited and linked on the site |
| Translation of data text | Earlier machine translation (Google Translate's unofficial endpoint, no longer used at run time) and batches translated with AI assistance and spot-checked; labelled "automatic translation" | New text is translated in reviewed batches |

The site's own `/sources` page lists its sources too, and each fact links to its
source on the page where it appears.

## License

- **Code:** [AGPL-3.0-or-later](LICENSE). If you run a changed copy of the site
  publicly, you must publish your changes under the same license, so copies of
  the site stay open.
- **The site's own text:** the editorial writing in `content/` and the interface
  strings in `messages/`, under
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). Credit
  "Our Knesset (הכנסת שלנו)", link back and share alike: some of it builds on
  Wikipedia, whose license requires that. Details: [LICENSING.md](LICENSING.md).
- **Everything from others keeps its own terms:** the data in `data/knesset.db`,
  photos, party logos (including `public/assets/logos/`), quotations and poll
  figures (see the table above). The AGPL and CC BY-SA licenses don't cover them.

## Contributing

Volunteers are welcome: fix a mistake, add a source, enter a poll, improve a
translation, write code. Start with [CONTRIBUTING.md](CONTRIBUTING.md), and please
follow the [Code of Conduct](CODE_OF_CONDUCT.md).

- Wrong information on the site? Use the report links on the site (they open a
  ticket on GitHub), open an issue with a source, or email
  [haknessetshelanu@gmail.com](mailto:haknessetshelanu@gmail.com).
- A security problem? Report it privately, never in a public issue. See
  [SECURITY.md](SECURITY.md).
- Launch status: [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md). Plans:
  [ROADMAP.md](ROADMAP.md). Deploying: [DEPLOY.md](DEPLOY.md).
