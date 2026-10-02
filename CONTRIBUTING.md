# Contributing to Our Knesset

Thank you for helping. Our Knesset (הכנסת שלנו) is a free, non-partisan civic
site, and it only works if people can trust every line of it. That's why the rules
below are strict about sources, fairness and languages. Tests check most of them,
so CI will tell you when something is off.

You don't have to be a developer. Polls, compass stances, sources and translations
live in plain text files (YAML and JSON).

## Before you start

- Read the [Code of Conduct](CODE_OF_CONDUCT.md).
- Found a security problem? Don't open an issue; see [SECURITY.md](SECURITY.md).
- Found a wrong fact but have no time for a pull request? Open an issue with the
  "Report incorrect information" form, and include a source.
- To set up the project, follow [Getting started](README.md#getting-started) in the
  README.

## The house rules

### Every fact needs a primary source

- Link the place the fact comes from, not a page that repeats it: the Knesset's own
  record, the Central Elections Committee, the text of a law or a ruling, a
  ministry, a party's own platform or site, or the news outlet's own article.
- Wikipedia, poll trackers and other aggregators are good for *finding* a source.
  Cite the source they point to, not them. A claim in a member record needs at
  least one source beyond Wikipedia or Wikidata; a test enforces it.
- Every source is an `https` link with a title. The tests check this.
- Open every source yourself and check the exact figure or words, including when
  an AI tool found it for you.
- Never infer. If a list has no sourced position on something, it has *no stated
  position*. That is a valid answer, and the site shows it as one.
- **Polls** come only from the publishing outlet's own article: text or a graphic
  you can link to and read again. Not from an aggregator, and not from a frame of a
  TV broadcast.
- **Compass stances** come only from (1) the list's published platform, (2) the
  leader's own words reported by a major outlet (or a top-five candidate's,
  disclosed as such), or (3) a Knesset roll-call vote. A reporter's description of
  a party's view is not a stance.

### Be fair to people

This is the legal-safety rule. Getting it wrong can hurt a real person and expose
the project to a lawsuit.

- Never invent, guess or embellish facts about anyone.
- Every claim in a member record (`content/members/<personId>.yaml`) cites at least
  one reputable source. The schema rejects a claim without one.
- A legal matter that isn't final carries a `status`, and the presumption of
  innocence applies. The statuses are `ongoing`, `indicted`, `convicted`,
  `acquitted`, `overturned`, `settled` (a plea deal or settlement, nothing else),
  `closed` (a probe closed without charges, which is not an acquittal), `ruled` (a
  court's final ruling on the matter), `ethics` (a Knesset Ethics Committee
  decision), `nonparty` (a court's words about someone who was not a party to the
  case) and `unconfirmed` (a proceeding the body said to be running it has not
  confirmed). A political act, a party sanction or a public row is not a legal
  matter: it carries no status. A test flags a negative claim that reads like a
  legal proceeding but has no status.
- Use neutral wording: say what happened and when, and let the source carry the
  weight. No adjectives that judge.
- Items of kind `neutral` (a new role, a bill, a public stance) are dated news or
  roles.
- When in doubt, leave it out, and ask in the pull request.

### Hebrew first, in every site language

The site speaks Hebrew, English, Arabic, Russian and Spanish; French is paused
(its texts stay in the repo for its return). Hebrew is the source of truth; the
other languages follow it.

- **Interface text** (buttons, headings, labels) lives in `messages/he.json`,
  `en.json`, `ar.json`, `ru.json`, `es.json` and `fr.json`. All six files must have
  exactly the same keys, and every string keeps the same `{placeholders}` as the
  Hebrew. A test fails on a missing, extra or empty key.
- **No Hebrew characters in `src/`.** Put the words in `messages/` and use
  `t("key")`. If code must match Hebrew (say, a pattern over Knesset data), write it
  with `\u` escapes, like `/[֐-׿]/`. A test scans every `.ts` and `.tsx`
  file; the few files where Hebrew is data are listed in
  `tests/qa/no-hardcoded-hebrew.test.ts`.
- **Editorial content** in `content/*.yaml` gives every piece of text in all six
  languages (`he`, `en`, `ar`, `ru`, `es`, `fr`), and a test checks it. Candidates'
  names are the one exception: they carry `he`, `en`, `ar` and `ru`.
- **Data from the Knesset** (vote titles, bill and committee names, agenda items)
  arrives in Hebrew. It is never translated in code, and never stored in extra
  columns like `title_en`. It goes through one shared translation cache, the
  `translations` table: a page calls `localizePage(heList, locale)` from
  `src/lib/i18n-data.ts`, which returns what is cached and queues the rest for
  machine translation.
- Hebrew that isn't translated yet must still display correctly inside, say, an
  English page: spread `rtlAttrs(text)` or `localizedAttrs(value)` from
  `src/lib/text.ts` onto the element. They add `dir="rtl" lang="he"`.

### The database isn't in git

`data/knesset.db` lives in the repository's `data-latest` release, not in git:
`npm run db:pull` downloads it, and the daily sync publishes a new one. The site
only reads it.

- Stop the dev server before `npm run db:pull`, and never delete
  `data/knesset.db-wal` or `data/knesset.db-shm` by hand while anything has the
  database open. Both can corrupt it.
- Need a data change (a new table, a fixed data translation, a backfill)? Say so
  in an issue or in your pull request, and a maintainer will apply it and publish
  a new database. New tables and indexes must be declared in `src/db/schema.ts`
  and also created `IF NOT EXISTS` by the sync; `AGENTS.md` has the details.

### Keep it simple for the average voter

- Plain words before terms; explain a term the first time it appears.
- One idea per chart. Long detail goes under a "details" toggle, not on the page.
- Calm and neutral, never campaign-like.

### Writing code

- This Next.js version has breaking changes. Read the guide for what you're
  touching in `node_modules/next/dist/docs/` before writing Next-specific code.
- Knesset data comes in through the sync (`scripts/sync/`). Pages read it from
  SQLite through `src/lib/queries.ts`.
- Accessibility basics: one `<h1>` per page, an `aria-label` on every icon-only
  button, enough contrast, and keyboard access to everything.
- Statically rendered pages call `setRequestLocale(locale)`, or next-intl falls
  back to Hebrew.

## Guides

### Add a poll (`content/polls.yaml`)

1. Find the poll in the publishing outlet's own article. Aggregators help you
   discover polls, but only the outlet's article counts. If the poll was only
   broadcast (no text or graphic you can link to), add it under `notEntered` with a
   reason instead.
2. Check the dates. The poll must be published on or after the file's `cutoff`.
   Polls published up to Friday 23 October 2026 may go in. Don't add or change
   polls after that Friday ends until voting ends on 27 October (22:00): that is
   the legal blackout on polls, Elections (Propaganda Methods) Law §16ה(ח) (see
   [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)).
3. Copy the newest entry under `polls:` and edit each field:
   - `id`: `<published>-<outlet>-<institute>`, lowercase with dashes, starting with
     the published date. Example: `2026-09-25-maariv-lazar`.
   - `published`, and `fieldwork: { from, to }`, as `YYYY-MM-DD`. Fieldwork ends on
     or before publication and starts at most a week before it.
   - `outlet` and `institute`: the names in all six languages.
   - `instituteId`: reuse the existing id (and the same English name) when the
     polling company already appears. The average counts only each institute's
     latest poll.
   - `sample`, and `marginOfError` when the outlet reports one.
   - `seats`: one line per list, keyed by the list's slug from
     `content/election.yaml`. A list that gets seats gets at least 4, and the seats
     add up to exactly 120.
   - `belowThreshold`: the slugs the outlet reports under the threshold.
     `belowThresholdNote`: the outlet's own words about them.
   - `blocs`: only if the outlet grouped the lists itself, exactly as it did, with
     labels in six languages. The site never assigns a list to a bloc.
   - `verification`: one line on how you checked the figures, plus the method as
     the outlet states it: dates, population, how many were asked and how many
     answered, margin of error, who conducted and who commissioned the poll.
   - `sources`: the outlet's article, with `url` (https), `title` (the headline)
     and `publisher`.
4. Set `lastReviewed` at the top of the file to today's date.
5. Run `npm test`. `tests/qa/polls.test.ts` checks the id, the dates, the slugs,
   the total of 120, the sources and the average.
6. Open a pull request with the article link in the description.

### Add or change a compass stance (`content/quiz.yaml`)

1. Read the comment at the top of `content/quiz.yaml` first. It is the rulebook:
   which sources count, the value scale, how votes become values, when to add
   `recordOf`, and how the statements stay balanced. The steps below summarize it;
   if they ever disagree, the header wins.
2. Find a qualifying source (see
   [Every fact needs a primary source](#every-fact-needs-a-primary-source)).
3. Under the statement's `stances:`, add or edit the entry for the list, keyed by
   its slug from `content/election.yaml`:
   - `value`: from `2` (strongly agree) to `-2` (strongly disagree), on the same
     scale as the reader's answers. For a vote, follow the thresholds in the header.
   - `basis`: `platform`, `statement` or `vote`.
   - For a vote: `voteId`, and a `source.url` of exactly
     `https://knesset.gov.il/OdataV4/ParliamentInfo/KNS_PlenumVote(<voteId>)`. The
     test checks that the vote exists in the database. Only vote stances have a
     `voteId`.
   - `source`: `url` (https), `title` and `publisher`.
   - `quote`: the words, or a summary of the vote, in all six languages.
   - `recordOf` (six languages) when a predecessor faction cast the vote, or the
     words are a candidate's rather than the leader's. `moreSources` for anything
     that note says beyond the quote.
4. No qualifying source? Leave the list out. Don't write `0`: zero is a stance
   ("neither", or an evenly split vote), not a blank.
5. Adding a new statement? It needs `text`, `short` and `explainer` in six
   languages, `explainerSources` for every fact the explainer states (a law, a
   ruling, a vote, official figures), a `lean`, and sourced stances from at
   least half of the running lists. The statements stay half right-leaning and
   half left-leaning, and they alternate. The tests check all of this.
6. Update `lastReviewed`, run `npm test`, and link every new source in the pull
   request.

### Fix a translation

First find where the text lives. There are three kinds:

1. **Interface text** (menus, buttons, headings, explanations) is in
   `messages/<language>.json`. Search for the wrong wording, for example
   `grep -rn "the wrong words" messages/`, and fix the value in that language's
   file. Keep the key and any `{placeholders}` exactly as they are. If the Hebrew
   itself is wrong, fix `he.json` and check that the other five still match it.
2. **Editorial content** (parties, the glossary, the compass, polls, the election
   pages) is in the language field next to the Hebrew in `content/*.yaml`. Search
   `content/` the same way.
3. **Data from the Knesset** (vote titles, bill, committee and agenda names) is
   machine-translated and stored in the database, so it can't be fixed in a code
   pull request. Open a "Report incorrect information" issue with the page link,
   the language, the wrong text and your correction, and a maintainer will fix it
   in a database-only commit. The exception is the official names of roles,
   ministries and standing committees: they come from `src/lib/gov-terms.ts`, and
   you can fix them there.

Then run `npm test`.

## Run the gates

Run all four before you open a pull request. CI runs the same ones.

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

## Pull requests

1. **Fork** the repository on GitHub and clone your fork:
   `git clone --filter=blob:none https://github.com/<you>/HaknessetShelanu.git`
2. **Branch** from `master`, for example `git switch -c add-maariv-poll`.
3. **Change one thing** per pull request. Small ones get reviewed faster.
4. **Check**: run the gates.
5. **Commit** with a short subject in the imperative ("Add the Maariv poll of 25
   September") and a body that says why.
6. **Open a pull request** against `master` and fill in the checklist. Link every
   new source in the description.
7. **CI** must be green: tests, types, lint and build.
8. **Review**: a maintainer checks the facts and the sources by hand before
   merging. Expect questions about sources. That's the job, not distrust.

## License of contributions

By contributing, you agree that your code is released under the
[AGPL-3.0-or-later](LICENSE) and the text you write in `content/` and `messages/` under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), as the
[README](README.md#license) describes. Only contribute what you have the right to
share: quote briefly and link to the source instead of copying.
