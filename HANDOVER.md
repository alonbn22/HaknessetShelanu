# Handover — read this first

Written 21 Oct 2026 for whoever (person or AI agent) picks up this project next.
It says where things stand, what is urgent, and how the recurring work is done.
The house rules in [AGENTS.md](AGENTS.md) still apply and win over anything here.

## 1. Where things stand (21 Oct 2026)

- **The last work session ended on 3 Oct 2026.** Nothing has been committed or
  published since. The database release `data-latest` is from 3 Oct 2026
  (sha256 `08266c2b573e…`).
- **So the election content is 18 days behind:**

  | Content | Last checked |
  |---|---|
  | `content/polls.yaml` | 2 Oct (`lastReviewed`, `filingsCheckedAt`) |
  | Compass (`content/quiz.yaml`) | 3 Oct |
  | Candidate rosters | 2 Oct (Joint List), 30 Sep (the others) |
  | Party notes and faction updates | 3 Oct |
  | Member records with open proceedings | 3 Oct |

- **The daily data sync is switched off on purpose.**
  - The `Sync Knesset data` workflow is `disabled_manually` on GitHub.
  - It stays off until the owner says otherwise.
  - Knesset data (votes, bills, committees) is therefore also from 3 Oct.
- **The site may not be live yet.** [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)
  still lists the Vercel project as an open owner task. Ask the owner before
  assuming there is a deployment.
- **Code health on 3 Oct:** all gates green — 344 tests, `tsc`, lint, build.
  The repo is public: `alonbn22/HaknessetShelanu`.

## 2. Urgent, in date order

The election is on **Tuesday 27 Oct 2026**.

1. **Before the end of Friday 23 Oct: catch up on polls.** The legal poll
   blackout (§16ה(ח) of the Elections (Propaganda Methods) Law) starts at
   **24 Oct 00:00 Israel time** and ends when the polls close,
   **27 Oct 22:00**.
   - **What to do:**
     - Enter every seat poll published 3–23 Oct, using the method in §4.1.
     - Refresh the HaMadad average.
     - Re-check the elections committee's poll filings.
     - Bump `lastReviewed` and `filingsCheckedAt`.
   - **During the blackout:**
     - Enter no polls at all.
     - The site already handles the blackout by itself (`BLACKOUT` in
       [src/lib/polls.ts](src/lib/polls.ts)): it shows the "not current"
       notice and freezes the average at the blackout start.
     - Don't change that code.
2. **Catch up on what happened 3–21 Oct.** Check each with primary sources
   (§4.2):
   - **Vote-sharing (surplus) agreements.** The deadline was 16 Oct. Take the
     signed pairs from the elections committee's published list, or from a
     report of an actual signing. Update `surplusAgreements` in
     `content/election.yaml`. The site has three pairs: Together–Yisrael
     Beiteinu, Yashar!–Democrats, Joint List–Ra'am. Likud–Religious Zionism
     and Shas–UTJ were *unconfirmed* as of 3 Oct; add them only if their
     signing is confirmed.
   - **Likud's petition against the "Fly&Vote" initiative.** The elections
     committee chair held a hearing on 6 Oct. Add the ruling if there is one.
   - **List changes:** withdrawals, mergers, disqualifications. Re-read every
     list page on the committee's site (§4.3) and update the rosters in
     `content/election.yaml`.
   - **Faction "recent developments"** in `content/party-profiles.yaml`.
     Format: a dated item, text in he/en/ar/ru/es (plus fr), and sources.
   - **The weekly compass review** is overdue (§4.4).
   - **Open proceedings in member records** (§4.5). Netanyahu's trial had
     former Attorney General Mandelblit summoned as a defence witness on
     11–12 and 18–22 Oct.
3. **Election night, 27 Oct, and after:**
   - The blackout lifts by itself at 22:00.
   - Results go on the site only from the elections committee's official
     results. The site has no results page yet.
   - Add a 26th-Knesset entry to `content/elections-history.yaml` only after
     the official results. A content test pins 25 entries; update it in the
     same change.
4. **Launch day:**
   - Remove the work-in-progress banner.
   - Add HSTS `preload` once the domain is final.
   - Both are listed in the checklist.

## 3. The owner's standing rules (do not break)

- **Every datum is verified from a trusted primary source**, with a visible
  source that credits whoever produced it:
  - an official body (Knesset, elections committee, courts, gov.il);
  - the party's own site or platform;
  - or a reputable outlet's own article.

  Wikipedia and aggregators are an index only, never a source. Polls come from
  the outlet's own article. Broadcast-only polls come from the pollster's
  filing with the elections committee.
- **People:** never invent facts. Neutral wording only. Ongoing proceedings
  are marked, and the presumption of innocence applies. Re-read the court or
  committee document itself before changing anything about a person.
- **Fairness:** what you add for one list you add for all comparable lists.
  The site never assigns a list to a bloc. Polls are ordered by date, never by
  result. The compass has no "default" positions.
- **Language for the average voter:** plain words, one idea per chart.
- **Privacy:**
  - Never send the owner's personal email address anywhere — not in a
    User-Agent, URL, form or search. Every agent brief must say so.
  - For HTTP requests use this User-Agent:
    `HaknessetShelanu/1.0 (https://github.com/alonbn22/HaknessetShelanu; civic transparency site)`.
  - The public contact address is `haknessetshelanu@gmail.com`.
- **Translation:**
  - No machine-translation service of any kind. Google's endpoint was removed;
    LibreTranslate was tested twice and failed.
  - Data text is translated in checked batches (§4.6).
  - **French is paused** (owner's decision, 3 Oct) until its ~22,000 data
    strings are translated. Spanish stays. How to bring French back is in the
    comment in [src/i18n/routing.ts](src/i18n/routing.ts).
- **Never commit** `data/knesset.db`, `private/` (gitignored) or the old backup
  bundle (it contains a personal address).
- **Commits:** the author is `alonbn22 <maintainer@haknesset-sheli.invalid>`
  (already set in this repo's git config). Committing and pushing to `master`
  has been the agreed workflow; run the gates first.
- **Never bypass** a CAPTCHA, Cloudflare check or paywall. If a site blocks
  scripts, read it in a real browser.
- **Don't open raw PDF links in the browser** — it triggers a download dialog
  for the owner. Download with `curl` instead, or ask the owner.

## 4. How the recurring work is done

### 4.1 Polls

- **Finding new polls:**
  - HaMadad's index is at `https://themadad.com/polls26`. The page embeds JSON
    entries with `pollNumber`, publisher, pollster and date. Use it as an
    index, plus a cross-check of the numbers.
  - The HaMadad average is the `madadAverage` rows in the page's
    `summaryTableNew` table. Its key names map to our list slugs:

    | HaMadad key | Our slug |
    |---|---|
    | `eisenkot` | yashar |
    | `bennett` | together |
    | `avoda` | democrats |
    | `smotrich` | rz-zehut |
    | `unifiedArabList` | joint-list |
    | `winter` | amkha |
    | `miluimnikim` | reservists |
    | `bw` | blue-white |
- **Entering a poll:** read the outlet's own article and copy into
  `content/polls.yaml` every seat figure, the bloc figures exactly as the
  outlet counted them, sample, margin of error, fieldwork dates and the
  below-threshold note. Then add a `verification` line describing what you
  matched and where. Seats must sum to 120.
- **Reading each outlet:**
  - **Maariv:** the full text is in the page's JSON-LD `articleBody`; the
    visible text drops the method paragraph.
  - **Channel 13 (13tv.co.il):** blocks curl; read it in a browser.
  - **Zman Yisrael:** behind Cloudflare; read it through a fetch tool and
    cross-check with HaMadad.
  - **ynet, Walla, Channel 14 (c14.co.il), i24:** fetch fine with the
    User-Agent above.
- **Elections committee filings:**
  - Get the list by POSTing to `https://www.gov.il/he/api/DynamicCollector`
    from a browser tab on gov.il. Body: `{DynamicTemplateID:
    "b043127d-d79d-472e-ac10-5567bc9e8d3d", QueryFilters: {skip: {Query: 0}},
    From: 0}`. Each result has `reference_number`, `UrlName`, the survey date,
    `survey_editor` and `survey_publisher`.
  - The PDF of each filing downloads with curl:
    `https://www.gov.il/BlobFolder/dynamiccollectorresultitem/<UrlName>/he/Survey_<n>.pdf`.
- **Broadcast-only polls** go in only from their filing; otherwise list them
  under `notEntered` with the reason.

### 4.2 News and developments

- **Outlets:** ynet, JPost, Maariv, Walla and Kikar HaShabbat fetch with curl.
  Times of Israel, The Seventh Eye, Kan, Israel Hayom, Makor Rishon and
  Haaretz often need a real browser; Haaretz is paywalled.
- **Court decisions:** the Supreme Court's own PDFs download with curl from
  `supremedecisions.court.gov.il/Home/Download?...`. Knesset Ethics Committee
  decisions are at
  `main.knesset.gov.il/Activity/committees/Ethics/Decisions25/Decisions25-NN.pdf`.
- **Reading PDFs on macOS without poppler:** use JXA PDFKit
  (`osascript -l JavaScript`, `PDFDocument.string`). If the Hebrew text layer
  comes out unreadable, render the page to PNG
  (`thumbnailOfSizeForBox`) and read the image.
- **Publisher names:** every new Hebrew publisher name needs an entry in
  `content/publishers.yaml` (a test enforces it).

### 4.3 Rosters (the elections committee's list pages)

- **Where they are:** each list has a page at
  `https://www.gov.il/he/pages/<slug>_list<N>`; the URL is in each list's
  `cec.url` in `content/election.yaml`.
- **How to read them:** the pages load through a session API, so read them in
  a browser tab. Candidates are numbered `N. surname first-name`; a
  one-candidate list has no number. A note at the bottom records resignations
  and withdrawals.
- **What to compare:** check against `submittedLists[].candidates` and update
  the `updated` dates.

### 4.4 The compass (`content/quiz.yaml`)

- **The rules are binding.** Read the header comment of the file first.
- **Allowed evidence:**
  - a Knesset roll-call by the list's faction;
  - the list's published platform;
  - the list leader's (or the list's own) words in a major outlet, including
    the outlets' "where the parties stand" questionnaires;
  - a top-five candidate's words, but only with a `recordOf` disclosure.

  A rival's or reporter's characterisation is never a stance. Mixed records
  score 0. A list with no source has no key ("no stated position").
- **After each review:** add a dated note to the header and bump
  `lastReviewed`.

### 4.5 Member records (`content/members/<personId>.yaml`)

- **Highest legal risk on the site.** Every claim needs at least one reputable
  source (schema-enforced).
- **Statuses:** ongoing, indicted, convicted, acquitted, closed, ruled, ethics,
  nonparty, unconfirmed.
- **What "indicted" means here:** only when an indictment was actually filed.
  On 3 Oct a record wrongly said "Indicted" where the Attorney General had only
  *decided* to indict and the Knesset's immunity blocked filing.
- **Netanyahu's label** (`ongoing` or `indicted`) is the owner's pending
  decision; don't change it.

### 4.6 Translations

- **Find the gaps:** `npm run translations:export -- out.json [en ar ru es]`
  lists the Hebrew data strings missing those languages.
- **Import a checked batch:** `npm run translations:import -- batch.json`, or
  with `--overwrite` to correct existing entries. It fills only empty cells
  unless told to overwrite, refuses any "translation" that still holds Hebrew,
  and adds the French no-break spaces.
- **Then:** run `npm run db:clean`, check the pages, and run
  `npm run db:publish`.
- **Reviewing an agent's batch:**
  - Every `old` value must equal the current database value.
  - No `new` value may contain Hebrew.
  - Sample the sensitive categories first: people's names, "settlements" vs
    communities, hostages, legal terms.
- **Where the gaps are (3 Oct):**
  - **Biography lines:** the remaining English, Arabic and Russian gaps there
    don't show on any page; the Knesset serves those languages itself.
  - **Ministry and role names:** curated in `src/lib/gov-terms.ts`.
  - **Weak Spanish:** about 4,800 committee agenda items.
  - **Raw names:** about 370 lobbyist client names in English and Spanish.

### 4.7 The database

- **Get it:** `npm run db:pull` (stop any dev server first).
- **What writes to it:** scripts that write set `DB_WRITE=1` (already in the
  npm scripts).
- **Before writing:** check nothing has it open — `lsof data/knesset.db`.
- **After writing:** run `npm run db:clean` (integrity check, rollback journal,
  VACUUM). Then `npm run db:publish`; it refuses a file in WAL mode.
- **New tables or indexes:** follow AGENTS.md exactly. Declare them in
  `src/db/schema.ts` and create them `IF NOT EXISTS` in the sync script.

### 4.8 Gates and preview

- **Gates:** `npm test`, `npx tsc --noEmit`, `npm run lint`, and `rm -rf .next`
  followed by `npm run build`.
- **Preview:** the dev server is configured in `.claude/launch.json` (name
  `dev`). Running it can modify `AGENTS.md`; undo that with
  `git checkout -- AGENTS.md` unless you meant to change it.

### 4.9 Using research agents

- **What has worked:** report-only agents with a written brief. The brief
  says:
  - no repo edits;
  - read-only database;
  - the User-Agent above;
  - never send the owner's personal email;
  - a primary source and a verbatim quote for every finding;
  - "needs a browser check" for blocked pages.
- **Before applying anything:** verify every finding yourself against its
  source.
- **Background:** agents hit the shared usage limit more than once. Resume
  them with a message rather than starting over.

## 5. Waiting on the owner

- **Decisions:**
  - Should the site track the elections committee chair's rulings under the
    propaganda law (against Shas, Religious Zionism and Ben Gvir so far)?
    It's all or none, for fairness.
  - Netanyahu's record label: `ongoing` or `indicted`.
  - Whether to run a third translation round (the Spanish committee items and
    the lobbyist names).
  - When to turn the daily sync back on.
  - Visible labels on the search boxes.
- **Owner-only tasks** (see the ⬜ rows in [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md)):
  - the Vercel project, `NEXT_PUBLIC_SITE_URL` and the deploy hook secret;
  - Vercel log retention;
  - 2FA on GitHub and Vercel;
  - a VoiceOver test;
  - branch protection on `master`;
  - the old private repo and backup bundle;
  - the lawyer questions (kept in `private/FLAGS.md`, which is gitignored and
    must never be committed).

## 6. Smaller known gaps

- **Wikipedia-only sources:** two member claims still list Wikipedia beside
  paywalled Haaretz sources: David Bitan's trial record and Yaakov Tessler's
  investigation record. Some positive claims also list it.
- **Possibly wrong names:** the `persons` table may hold wrong localized names
  at the source: ru "Ревиталь Готлиб", ar "يحيئيل موشيه تروبر", en
  "Moshe Turpaz". Check them against the Knesset's own directory before
  changing anything.
- **Polls section:** the one on `/elections` is long. A design call for the
  owner; nothing is planned.

## 7. Where to look

- **The house rules:** [AGENTS.md](AGENTS.md).
- **Launch status and proof per item:**
  [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md).
- **Backlog and "needs a human" items:** [ROADMAP.md](ROADMAP.md).
- **Deploying:** [DEPLOY.md](DEPLOY.md).
- **Contributor rules, including how to add a poll or compass stance:**
  [CONTRIBUTING.md](CONTRIBUTING.md).
- **Content:**
  - `content/election.yaml`: lists, rosters, notes, key dates, surplus
    agreements.
  - `content/polls.yaml`: polls.
  - `content/quiz.yaml`: the compass.
  - `content/party-profiles.yaml`: faction pages.
  - `content/coalition.yaml`: coalition and opposition statuses.
  - `content/members/`: member records.
- **On the owner's machine only:**
  - The plan file: `~/.claude/plans/go-over-the-code-dynamic-flame.md`.
  - The project memory, loaded into every Claude Code session automatically:
    `~/.claude/projects/-Users-alonbennun-Desktop-projects-HaKnessetSheli/memory/`.
