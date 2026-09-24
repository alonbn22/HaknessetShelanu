# Roadmap

The living plan for **הכנסת שלנו · Our Knesset**. Shipped features are summarized in
the [README feature map](README.md#feature-map); this file tracks what's next and
what data we could still surface.

## Next up (build queue)

Ordered roughly by value/effort. Grounded in tables that already exist unless noted.

- [ ] **⏰ Sept 2026 — official candidate lists → database** (lists were submitted
  to the CEC on **2026-09-07/08**; **all 38 rosters — 1,379 candidates — now live
  in `content/election.yaml` `submittedLists[].candidates`**, captured from the
  CEC list pages on 20 Sep 2026 through the Browser pane (gov.il answers 403 to
  curl and Cloudflare-blocks CDP Chrome; `scratchpad/review/cec-capture.mjs` and
  the batch files document the capture), rendered per list on `/elections#all-lists`
  (first 20, the rest linked); the CEC's approved lists are reported for
  2026-09-27 — re-capture after the notices (Blue and White's page changed on
  16 Sep, the Joint List's on 18 Sep).
  Individual candidates don't exist as official data before submission, so today
  the site shows the sourced editorial layer (`content/election.yaml`: expected
  parties + leaders linked to their member pages via `leaderPersonId`). Once the
  CEC publishes the submitted lists: (1) new `election_candidates` table —
  declared in `src/db/schema.ts` AND `CREATE IF NOT EXISTS` in the sync with
  matching DDL per house rules; columns ≈ list name/letter, position, name_he,
  person_id (nullable link into `persons` for current/former MKs — Wikidata
  enrichment then gives photos+bios "like Knesset members" for the rest);
  (2) ingestion script from the CEC's published lists (verify the format when
  live — likely bechirot.gov.il/gov.il pages or PDFs, NOT the Knesset OData API);
  (3) full-roster rendering in the `/elections` upcoming section (the
  `kd-lists` timeline entry + `finalListsNote` UI already promise it); (4) after
  results (Nov 4): mark elected candidates and wire the K26 transition (see the
  `KNS_KnessetDates` item below — `CURRENT_KNESSET` must flip to 26).

- [x] **Question accountability — SHIPPED end to end**: member pages show the
  answered rate + average ministry response time with per-question
  Answered/Unanswered badges and the addressee-ministry chip; `/ministers`
  carries the per-ministry response table (received / answered % / avg days,
  ≥10 questions), powered by the new `gov_ministries` lookup
  (`KNS_GovMinistry`, 922 rows, `--ministries` flag, DDL-parity-tested).
- [x] **Rebellion drill-down — SHIPPED**: the party-discipline callout on member
  pages expands to the actual votes the MK cast against their faction majority
  (title, date, their vote vs. the faction's, linked to the vote page), computed
  with the same CTEs as the % so the list always reconciles (test-enforced).
- [x] **Agenda-motion subjects on member pages — SHIPPED**: recent motions render
  in the activity section (localized lazily, RTL fallback, empty subjects
  filtered at the query).
- [ ] **Plenum sitting calendar** — the other half of the session layer
  (`KNS_PlenumSession` + order paper + Divrei HaKnesset transcripts).
- [ ] **`KNS_KnessetDates` term metadata** — replace the hardcoded
  `CURRENT_KNESSET = 25` (`src/lib/constants.ts`, used across 7 files incl. 4 sync
  scripts) with a synced term table + dynamic current-term flag, so Knesset 26
  doesn't require a manual edit of every query and sync.
- [ ] **Sitemap alternates** — per-URL `alternates.languages` (hreflang) once a
  production domain exists; the sitemap currently lists each locale URL separately.
- [ ] **Backfill checkpointing** — the `KNS_PlenumVoteResult` backfill writes its
  cursor only after all concurrent windows finish, so an interrupted *from-scratch*
  rebuild restarts from zero. Dormant (the K25 cursor is set); persist per-window
  completion if a from-scratch rebuild ever bites.

### Quality / infra follow-ups (from the review pass)

- [ ] **Workflow binary-rebase handling** — the DB-commit runbook says to
  `git reset --hard origin/master` and redo when the sync bot lands first (never
  rebase a binary). Encode that as a documented step/helper so a DB push that
  races the bot recovers deterministically.
- [ ] **Batch-translation API upgrade** (needs a maintainer OK) — swap the
  unofficial per-string `gtx` calls for the official batched Cloud Translation
  API behind the lazy data-translation cache: fewer round-trips, a supported
  endpoint. Needs a billing account, hence the sign-off.

## Untapped API data — what more we could build

From a survey of the Knesset OData V4 `ParliamentInfo` service (48 entity sets,
sampled live for the 25th Knesset) against what we already sync. The biggest gaps
are the **committee/plenum *session* layer** and the **query *reply* layer** —
both join cleanly to data we already have. Each item names the exact entity set.

**P0 — Committee meetings.** `KNS_CommitteeSession` (every meeting: date, location,
open/closed, broadcast URL — includes *future scheduled* sittings) +
`KNS_CmtSessionItem` (agenda items per meeting) + `KNS_DocumentCommitteeSession`
(the protocol/minutes `.doc` links). → A per-committee **meeting calendar &
history** (incl. upcoming meetings), each meeting's agenda, and a "read the
transcript" link. Frequency-of-meeting becomes a committee-activity metric. Joins
by `CommitteeID`.

**P0 — Plenum sittings.** `KNS_PlenumSession` (every sitting: dates, special-meeting
flag) + `KNS_PlmSessionItem` (the order paper — we touch this in `votes.ts` but
don't expose the agenda) + `KNS_DocumentPlenumSession` (Divrei HaKnesset / Hansard
transcript links). → A **plenum calendar** ("how many days did the Knesset sit"),
"what was on the floor today," and links to the official verbatim record.

**P1 — Question accountability.** Correction after auditing the DB: the `queries`
table only holds `submit_date` and `reply_date` — **not** `ReplyDatePlanned` or
`StatusID`. Those two still suffice for **"answered vs. unanswered questions +
response time" per MK with zero new sync** (1,079 of 1,587 answered, `type_desc`
distinguishes urgent 205 / regular 1,382). The per-*ministry* breakdown is the
only blocked part: `gov_ministry_id` has 36 distinct values and no name table, so
it needs a tiny `KNS_GovMinistry` lookup sync. See "Next up" above. (`KNS_DocumentQuerie`
for reply docs is still untried — verify it returns rows with a `KnessetNum` filter.)

**P1 — Roles (largely shipped).** The ministers directory (`/ministers`) ships,
and committee detail renders each member's `roleHe` (chair text included). Still to
surface distinctly: chair badges (`position_id` 41), faction chairs (48), deputy
speakers (70/71) — see "Chair-vs-member roles" in the queue. No new sync needed.

**P1 — Term metadata.** `KNS_KnessetDates` (term name, assembly, plenum start/finish,
`IsCurrent`). → A **Knesset-term timeline** and a dynamic current-term flag instead
of hardcoding `CURRENT_KNESSET`.

**P2 — Bill lifecycle.** `KNS_BillName` (title as it changed per reading),
`KNS_BillHistoryInitiator` (sponsors who joined/dropped + reason — explains the
former-MK initiators), `KNS_BillSplit`/`KNS_BillUnion` (bill lineage when
legislation is split/merged). Feeds the **bill-journey** view above.

**P2 — Polish / infra.** `KNS_Status` + `KNS_ItemType` lookup tables to decode the
raw status/type integers shown on many pages; `KNS_MkSiteCode`/`KNS_CmtSiteCode`
to deep-link to official knesset.gov.il profiles (good for "always cite sources");
`KNS_Person.Email` for an official, citable "contact this MK". (Note: the API has
no birth/education — Wikidata stays the bio source.)

**Non-Knesset open data (reputable).** Central Elections Committee per-city results
via **data.gov.il** (same CKAN API as the budget; search `בחירות לכנסת`) → a "how
your city voted" view. State Comptroller **party-funding / campaign-finance**
reports (mevaker.gov.il — PDFs, so a *cited link-out*, not a sync). CBS
socio-economic indices by municipality (data.gov.il) for context.

> Note: the standalone `Knesset_Lobbyists` and `Votes` OData services are now
> behind bot-protection (JS challenge, not JSON); everything we need is mirrored
> in `ParliamentInfo` (`V_Lobbyists`, `KNS_PlenumVote*`), so no loss.

## Needs a human before launch

- **Disqualifications (from 23 Sep 2026)**: the CEC voted to bar Ra'am, the
  Joint List, Abu Shehadeh and Cassif, and on 24 Sep rejected the requests
  against Otzma Yehudit, Religious Zionism–Zehut and the Democrats (all on the
  site since `dab94e9`, with the AG's positions and the responses). Follow the
  Supreme Court: appeals by 29 Sep, rulings by 4 Oct (`kd-court`) — update the
  seven faction pages concerned, the two election cards and the key dates with
  each ruling, from the court's or the outlet's own text.
- **Spanish/French data text**: `npm run warm -- es fr` now works (es/fr
  added, stops itself when gtx throttles). 24 Sep: 1,712 es strings cached
  before gtx answered 429 — the uncommitted `data/knesset.db` holds them.
  Re-run when gtx recovers, `npm run db:clean`, then commit the DB alone.
- **Approved ballot letters** once the CEC publishes its approval notices
  (27 Sep 2026): flip `lettersStatus: requested` → `approved` on each
  `cec:` block in `content/election.yaml` and on `submittedLists`, and drop
  any list the committee refused. Letters shown today are the *requested*
  ones from the CEC index (updated 18 Sep 2026), labelled as such.
- **Re-run the Knesset sync closer to launch** — the DB is from 19 Sep 2026
  (members, positions, biographies); votes were last synced 23 Jul and the
  plenum is in election recess, so nothing is missing yet.
- **Open faction questions the sources could not settle** (19 Sep 2026):
  New Hope's Knesset faction merger into Likud was never completed and
  Sharren Haskel's High Court petition on it is undecided; UTJ has had no
  faction chair since 17 Jul 2025 (the page shows none — leave it); the
  Likud/Otzma/Democrats disqualification petitions to the CEC are pending.
  Re-check after 27 Sep.
- Weekly re-review of `content/polls.yaml` and `content/quiz.yaml` until
  27 Oct 2026 (bump `lastReviewed`; add new polls from the outlets' own
  articles; the Channel 16 polls stay out unless a written publication appears).
- Accessibility-coordinator name / email / phone (`a11y.statement.*` placeholders, now in six languages).
- Corrections email placeholder.
- `NEXT_PUBLIC_SITE_URL` once a production domain exists (sitemap/OG URLs).
- Editorial sign-off on curated member records, coalition.yaml (per-faction
  statuses added 19 Sep 2026), party-profiles (88 dated developments added
  19 Sep 2026 from the faction verification pass), and the elections/quiz
  figures.

- **es/fr data text fills lazily**: the gtx endpoint was rate-limited on
  19–20 Sep, so vote titles and the per-poll "below threshold" notes
  (`belowThresholdNote`, the outlet's own Hebrew wording) still render as
  Hebrew with `dir="rtl" lang="he"` on es/fr pages until the cache fills —
  confirm before launch (same mechanism as ar/ru).

## Done (recent)

- **Every glossary term sourced (24 Sep 2026)**: all 113 terms cite a trusted
  page (Knesset lexicon and laws, gov.il, CEC, CBS, IDI, UN, IMF, ICRC,
  Britannica, SEP) — no Wikipedia; `sourceUrl` is now required and a test bars
  Wikipedia. Six definitions corrected against their sources (coalition,
  biennial budget, the religion-and-state status quo, ceasefire/armistice, GDP
  "final" goods, a dissolved Knesset serving until the new one meets).
- **Arabic and Russian everywhere (22 Sep 2026, `79c1a3c`…`d79668e`)**: every
  editorial string in `content/` — 1,082 of them — is now in all six
  languages; `tests/qa/content-languages.test.ts` fails on any gap, so a new
  entry can't fall back to English again. Translated from Hebrew this pass:
  the election page, the compass (all quotes and notes), coalition, polls,
  the party pages (positions, 2026 notes, all 99 dated developments), the
  glossary, the election history, the controversial laws, budget and aid.
  Fixed on the way: Arabic and Russian pages named several running lists
  wrongly (the Democrats as "Labor", the Joint List as "Hadash–Ta'al"…) —
  every registry list now has its own ar/ru name.
- **Compass gaps (22 Sep 2026, `5737d92`)**: seven more documented stances
  (Yashar ×3, the Democrats, Ra'am, the Joint List, Amkha), every source
  re-opened before entry; stances can cite `moreSources` for what their note
  says. Three Yashar cells that rested on a candidate's votes in another
  party stay "no stated position".
- **Glossary: the judges' selection committee** now includes the March 2025
  amendment that applies from the 26th Knesset (JPost source) (`48beaa1`).

- **Compass v2 (20 Sep 2026, `201d369`)**: the "Netanyahu-led government"
  statement is out; 16 statements (8/8, alternating) about what the lists
  want — seven new ones sourced by research agents (economy ×2, the
  grandchild clause, same-sex partnerships, Gaza emigration, climate law,
  Kan), each with ≥ 8 of 15 lists; plain-words explainers under every
  statement; results with a per-list agree/partly/differ/no-stance line and
  a closing "Why this result?" box. Research files: session scratchpad
  `review/compass/*.yaml`. Housing/price intervention left out (5 of 15).

- **Review pass (20 Sep 2026)**: three fresh-context reviews of the
  19–20 Sep material acted on — fairness/accuracy (36 items: the coalition
  line corrected to 68 → 61 → 60 on 14/16 Jul 2025, Likud's nine reserved
  slots, one-card-only claims and rival characterisations removed,
  petitions on the petitioners' cards too), Spanish (70 items) and French
  (83 items, incl. a non-breaking-space pass and es/fr on all 110 compass
  quotes). Reports in the session scratchpad `review/`.
- **"60 against 60 — you need 61" (20 Sep 2026)**: the count is a minority
  government since 16 Jul 2025; the home hemicycle and the parties timeline
  now say so in two sentences with Basic Law: The Government (ss. 3, 13(d),
  28(b)) as the source (`coalition.yaml` `majority`, `MinorityNote`).
- **2026 budget**: marked approved (Knesset, 30 Mar 2026, 62–55; ToI) in
  `content/budget-outlook.yaml`.

- **Spanish and French (19 Sep 2026)**: six locales. UI catalogues complete
  (parity-tested), faction and official-term names in es/fr, lazy data
  translations widened (es/fr columns), hreflang for every page, sitemap
  split per locale, and the editorial YAML translated (election, compass,
  profiles, coalition notes, laws, glossary, history, polls, budget, aid).
- **The election first on the home page (19 Sep 2026)**: countdown banner
  with the next milestone and four doors, the nav item as a pill, and a
  note on how the coalition/opposition count is made.
- **Factions verified like the members (19 Sep 2026)**: coalition/opposition
  is a dated, sourced status per faction (`content/coalition.yaml`
  `statuses`; UTJ outside since 14 Jul 2025, Noam since 16 Jul 2025 —
  Noam had been mislabelled coalition); faction pages carry a "2026
  election" block from the CEC list pages (requested letters, list name,
  head, submitting parties), sourced recent developments and a last-checked
  date; deputy ministers are labelled as such; the election page lists all
  38 submitted lists with requested letters; the Knesset portal link points
  at the current MK page URL; Commons thumbnails canonicalised to
  `upload.wikimedia.org` (the CSP host) in the sync and at render time;
  dark mode survives language switches. Members sync of 19 Sep 2026
  (`cbdb8ee`) with entry records for the four new MKs.
- **The 2026 election, fairly (18–19 Sep 2026)**: `content/polls.yaml` — 18
  seat polls since the lists closed, each verified against the outlet's own
  article (`/elections#polls`: poll of polls with one poll per institute, a
  one-list-at-a-time chart, every poll and every outlet's bloc map, HaMadad's
  average credited, plain "how to read"); the compass rebuilt on sourced
  stances only (Knesset roll-calls cited to the OData record, platforms,
  leader statements; "no stated position" otherwise) with `/elections/positions`
  showing every cell and its source; the CEC calendar, how-to-vote, voter-roll
  figures and surplus agreements from the Central Elections Committee; and
  the home hemicycle now explains its empty seats and shows who sits where on
  hover/focus/tap. Standing rule recorded in memory: every datum verified, from
  a trusted source, with credit — and simple enough for anyone.
- **Member records, neutral items**: `kind: neutral` (news / role) beside
  for/against; 10 research agents re-verified `content/members/*.yaml`.

- **Committee agendas full backfill**: 13,119 agenda items / 26,620 documents —
  ~96% of the term's 10,792 sittings (was a rolling 120-day window). The 7
  batches the API persistently 500s on are skipped non-fatally and retried by
  each scheduled sync.
- **2026-election deepening**: key-dates timeline with live countdowns on home +
  `/elections` (next step highlighted, election day always prominent); party
  cards preview spectrum/ballot-letters/positions; every leader linked (member
  page, else Wikipedia) with sourced backgrounds; "new list" labels for
  not-yet-seated slates.
- **Refactor pass (adversarially reviewed, zero regressions)**: shared
  `SearchInput` across the 6 filter components, `localizePage()` + `pageParam()`
  helpers across the pages, the sync layer split per entity, the member page
  split into presentational components, and 29 verified-orphaned message keys
  pruned.
- **Voting-days stat** (home): "the plenum held votes on N days this Knesset —
  M of them this year", from distinct `date(votes.date_time)`.
- **`safeHttpUrl` scheme guard** on every DB-sourced href (committee docs,
  broadcast/agenda links, bill PDFs, Wikipedia links, search results): only
  http(s) renders; anything else is dropped. Unit-tested; defense-in-depth over
  React's own `javascript:` sanitization.
- **Chairs everywhere they belong**: member pages carry leadership header badges
  (Speaker, opposition leader, committee/faction chair, deputy Speaker);
  `/committees` names each committee's chair; `/parties/[id]` shows the faction's
  Knesset chair (linked, hidden when it's the party leader).
- **Committee documents in global search**: `/search` now spans the
  `committee_session_docs` corpus (position papers, bill drafts, decisions), each
  result linking straight to the document file.
- **Party leaders link to their member page** on `/parties/[id]` (verified
  `leaderPersonId` + name match), and election party cards preview the party's
  spectrum, ballot letters, and top positions.
- **Nonce-based CSP + hardened headers**: a real Content-Security-Policy set per
  request in the middleware (`script-src 'strict-dynamic'` + a fresh nonce, so only
  first-party scripts run), plus HSTS and a `tests/security/headers.test.ts` that
  locks the posture in. Every route renders dynamically to carry the nonce.
- **Full review + hardening pass** (51-agent adversarial review, verified findings):
  - *Sync correctness:* incremental vote-header fetch now gates on `VoteDateTime`
    so a retro-edited pre-K25 vote can't be mislabeled current-Knesset;
    LastUpdatedDate overlap so offset paging can't skip mid-pagination rows;
    Wikidata enrichment uses COALESCE semantics (a dropped Commons batch no longer
    nulls committed photos) + shared retry/backoff; section flags run only their
    section (was silently a full sync); budget/bio non-fatal in a full run;
    `db:clean` + standalone runners checkpoint the WAL before removing sidecars;
    CI pins actions to SHAs and drops the `npm ci || npm install` lockfile bypass.
  - *Query/page:* timezone-safe committee upcoming/recent split (`datetime()`
    instants, not offset strings); out-of-range `?page=` clamps to the last page;
    user search escapes LIKE `%`/`_` wildcards; budget `?year=` NaN guard;
    roll-call faction grouping keyed by id not label.
  - *i18n/a11y:* Hebrew-fallback member names (Regev, Smotrich, +3 with no
    localized name) render `dir="rtl" lang="he"` everywhere via `rtlAttrs`;
    theme toggle exposes `aria-pressed` + a state-aware label; committee doc links
    get distinct accessible names; `meetingCount`/`agendaCount` are real ICU
    plurals in all four locales.
  - *Tests (+34, now 241):* DDL-parity (sync `CREATE TABLE` vs `schema.ts`, guarding
    the documented `push --force` data-loss incident); committee-sessions timezone
    split; dark-mode script parses+runs; Norwegian-Law serving/former + record
    localizer; the three new feature queries. Extracted `isServingMember` +
    `localizeMemberRecord` out of the 600-line member page to make them testable.
  - *Safety:* token-bucket + LRU on the search-query translator (anti-proxy-abuse);
    party-profile URLs use the `httpUrl` scheme guard; baseline security headers.
- **This week in the Knesset** (home): committee sittings in the next 7 days.
- **Committee activity ranking** (`/committees`): meetings-held per committee,
  sorted most-active first.
- **Close-votes filter** (`/votes?close=1`): votes decided by ≤5 — where a few
  absent MKs swing the result.
- **Committee agendas + transcripts** (`/committees/[id]`): each meeting expands
  to its agenda items (`KNS_CmtSessionItem`) and documents
  (`KNS_DocumentCommitteeSession`) — protocol/transcript, background material,
  decisions — as direct links, protocol first. Fully backfilled across the term
  (see above); the scheduled sync maintains a rolling ~120-day window on top;
  localizes lazily and degrades to a plain row when a meeting has no docs yet.
- **Dark mode**: a header toggle (persists to `localStorage`, respects the OS
  preference, no light-flash via a pre-paint script) layered over the existing
  CSS-variable tokens — the semantic tokens are remapped and the hardcoded light
  utilities (surfaces, overlays, status-badge tints) overridden, so no component
  markup changed and high-contrast a11y mode still wins.
- **Committee meeting calendar** (`/committees/[id]`): all 10,753 current-Knesset
  committee sittings (past + upcoming) with date, open/closed type, location, and
  official agenda/broadcast links, from `KNS_CommitteeSession`.
- **Full review pass**: search resilience (raw-query fallback + length caps),
  remap ambiguity guard, `votes(item_id)` index, CI integrity check before the
  bot commits, per-page metadata + OG on all five detail pages, sitemap +
  robots, search bills group + "showing top N" hints, glossary deep links,
  localized pagination numbers, persisted seats toggle, shared RTL-attr
  helpers, +10 regression tests (203 total).
- **Bill status decode** (`KNS_Status`): bills carry a real status text instead
  of a hidden numeric code.
- **"Voted most/least similarly"** lists on member pages, precomputed per sync
  into `mk_agreement`.
- **Party-discipline metric**: how often each MK voted with their faction
  majority — a callout on the member page and a row on `/compare`.
- **Bill-journey view** (`/laws/[id]`): a bill's votes grouped into milestone
  reading stages, linked from vote pages and MKs' sponsored bills.
- Durable MkId→PersonID vote remap (vote breakdowns were showing empty).
- Global search across all entities; hemicycle seating chart (bar/hemicycle
  toggle, bar default); side-by-side **member comparison** with a voting-agreement
  rate; site-wide work-in-progress notice; ballot letters; `/sources` page.
- Accessibility rebuild to IS 5568 / WCAG 2.0 AA; AGPL-3.0 + CC-BY-SA-4.0 licensing.
