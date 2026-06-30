# Roadmap

The living plan for **הכנסת שלי · My Knesset**. Shipped features are summarized in
the [README feature map](README.md#feature-map); this file tracks what's next and
what data we could still surface.

## Next up (build queue)

- [ ] **Bill journey** — a per-bill view of its path through the readings
  (preliminary → committee → 1st → 2nd/3rd → published), built from the bill's
  votes and documents we already sync.
- [ ] **Party-discipline metrics** — how often each MK votes with their faction
  majority (a "rebellion rate"), reusing the vote-results self-join behind the
  member-comparison agreement rate.
- [ ] **Dark mode** — theme toggle over the existing CSS-variable token layer.

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

**P1 — Question accountability.** `KNS_Query` already carries `SubmitDate`,
`ReplyMinisterDate`, `ReplyDatePlanned`, `StatusID` (we sync but under-use them) +
`KNS_GovMinistry` (ministry registry → resolve the bare `GovMinistryID` we show
today). → **"Answered vs. unanswered parliamentary questions" and response-time**
per ministry/MK — a strong accountability metric with *zero new sync*. Add
`KNS_DocumentQuerie` for the reply document (verify it returns rows with a
`KnessetNum` filter — its default page came back empty).

**P1 — Roles we already pull but don't surface.** `KNS_PersonToPosition` rows carry
`DutyDesc`, `GovMinistryName`, `GovernmentNum`, `CommitteeName`, `FactionName`. →
**Ministers directory, committee chairs/members roster, faction chairs** — no new
sync, just expose the fields (label chairs vs. members by `PositionID`/`DutyDesc`).

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
- Editorial sign-off on curated member records, coalition.yaml, party-profiles,
  and the elections/quiz figures.

## Done (recent)

- Durable MkId→PersonID vote remap (vote breakdowns were showing empty).
- Global search across all entities; hemicycle seating chart (bar/hemicycle
  toggle, bar default); side-by-side **member comparison** with a voting-agreement
  rate; site-wide work-in-progress notice; ballot letters; `/sources` page.
- Accessibility rebuild to IS 5568 / WCAG 2.1 AA; AGPL-3.0 + CC-BY-SA-4.0 licensing.
