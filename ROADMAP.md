# Roadmap

The living plan for **הכנסת שלנו · Our Knesset**. Shipped features are summarized in
the [README feature map](README.md#feature-map); this file tracks what's next and
what data we could still surface.

## Next up (build queue)

Ordered roughly by value/effort. Grounded in tables that already exist unless noted.

- [ ] **⏰ Sept 2026 — official candidate lists → database** (time-critical: lists
  are submitted to the CEC around **2026-09-09/10** and become final then).
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
- [ ] **Voting-days-per-period stat** — derive "how many days did the Knesset
  vote this month/year" from `votes.session_id` (346 distinct sessions) +
  `date_time` (415 distinct voting days) today — a home-dashboard accountability
  number and a bridge to the plenum calendar below.
- [ ] **Committee documents in global search** — `committee_session_docs` has
  2,867 named protocols/materials with direct links, but search doesn't span
  them. Let a citizen find "who discussed X in committee" and land on the meeting.
- [ ] **Committee agendas backfill** — the agenda/transcript sync covers a rolling
  ~120-day window (recent + upcoming) for the ~6h budget. A one-off full backfill
  of older meetings is available via `syncCommitteeSessionDetails(null)`
  (materialized: 1,396 items / 2,867 docs against 10,756 sittings).
- [ ] **Plenum sitting calendar** — the other half of the session layer
  (`KNS_PlenumSession` + order paper + Divrei HaKnesset transcripts).
- [ ] **`KNS_KnessetDates` term metadata** — replace the hardcoded
  `CURRENT_KNESSET = 25` (`src/lib/constants.ts`, used across 7 files incl. 4 sync
  scripts) with a synced term table + dynamic current-term flag, so Knesset 26
  doesn't require a manual edit of every query and sync.
- [ ] **Chair-vs-member roles** — the ministers directory + committee rosters
  ship; still to surface: chair badges (position_id 41, 143 rows), faction chairs
  (position_id 48, 26 rows), deputy speakers (positions 70/71, 22 rows).
- [ ] **Sitemap alternates** — per-URL `alternates.languages` (hreflang) once a
  production domain exists; the sitemap currently lists each locale URL separately.
- [ ] **Backfill checkpointing** — the `KNS_PlenumVoteResult` backfill writes its
  cursor only after all concurrent windows finish, so an interrupted *from-scratch*
  rebuild restarts from zero. Dormant (the K25 cursor is set); persist per-window
  completion if a from-scratch rebuild ever bites.

### Quality / infra follow-ups (from the review pass)

- [ ] **Shared search + localize helpers** — extract a `SearchInput` client
  component (the debounced input is copy-pasted across 6 filter components and has
  drifted on width classes; the RTL-direction drift is already fixed) and a
  server `localizePage(heStrings, locale)` helper (the `localizeData` +
  `after(queueDataTranslations)` pair + three ad-hoc `titleOf` closures repeat
  across ~13 pages). Pure maintainability; deferred to avoid churn mid-review.
- [ ] **Orphaned message keys** — ~27 keys look unreferenced after excluding the
  dynamic `t(\`ns.${x}\`)` families; prune carefully (a wrongly-removed dynamic key
  fails silently at runtime, so verify each before deleting).
- [ ] **`safeHttpUrl` for DB-sourced hrefs (defense-in-depth)** — committee/bill
  document links render OData URLs into `href` without the `httpUrl` scheme guard
  that editorial YAML gets. **Not a live vuln** — React 19 sanitizes `javascript:`
  hrefs unconditionally — so this is optional consistency + upgrading the one
  remaining `http:` broadcast URL to https at sync time.
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

- Accessibility-coordinator name / email / phone (`a11y.statement.*` placeholders).
- Corrections email placeholder.
- `NEXT_PUBLIC_SITE_URL` once a production domain exists (sitemap/OG URLs).
- Editorial sign-off on curated member records, coalition.yaml, party-profiles,
  and the elections/quiz figures.

## Done (recent)

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
  decisions — as direct links, protocol first. Synced over a rolling ~120-day
  window (recent + upcoming) to fit the sync budget; localizes lazily and
  degrades to a plain row when a meeting has no agenda/docs yet.
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
