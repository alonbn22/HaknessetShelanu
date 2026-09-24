export const CURRENT_KNESSET = 25;

// First sitting of the 25th Knesset — used to scope vote queries,
// since KNS_PlenumVote has no KnessetNum column.
export const CURRENT_KNESSET_START = "2022-11-15T00:00:00+02:00";

// KNS_Position ids.
export const POSITION_MK_MALE = 43; // Knesset member (male)
export const POSITION_MK_FEMALE = 61; // Knesset member (female)
export const POSITION_FACTION_MEMBER = 54; // faction member

export const MK_POSITION_IDS = [POSITION_MK_MALE, POSITION_MK_FEMALE];

export const POSITION_COMMITTEE_CHAIR = 41; // committee chair
export const POSITION_FACTION_CHAIR = 48; // faction chair

export const POSITION_PRIME_MINISTER = 45;
export const POSITION_DEPUTY_PRIME_MINISTER = 50;
export const POSITION_MINISTER = 39;
export const POSITION_MINISTER_F = 57;
export const POSITION_DEPUTY_MINISTER = 40;
export const POSITION_COALITION_CHAIR = 30;
export const MINISTER_POSITION_IDS = [POSITION_MINISTER, POSITION_MINISTER_F, POSITION_DEPUTY_MINISTER];

// The offices a member can hold, ordered most→least prominent — the header
// badges on the member page and the seat card on the home hall: prime
// minister, deputy PM, Speaker, opposition leader, minister, deputy minister,
// coalition chair, committee chair, faction chair, deputy Speaker (70/71).
export const OFFICE_POSITION_IDS = [
  POSITION_PRIME_MINISTER,
  POSITION_DEPUTY_PRIME_MINISTER,
  122,
  131,
  POSITION_MINISTER,
  POSITION_MINISTER_F,
  POSITION_DEPUTY_MINISTER,
  POSITION_COALITION_CHAIR,
  POSITION_COMMITTEE_CHAIR,
  POSITION_FACTION_CHAIR,
  70,
  71,
];

// Parliamentary leadership only (no government offices) — kept for callers
// that must not mix the executive in.
export const LEADERSHIP_POSITION_IDS = [
  122,
  131,
  POSITION_COMMITTEE_CHAIR,
  POSITION_FACTION_CHAIR,
  70,
  71,
];

// Canonical vote result codes (ours; the API's raw codes vary by service).
export const VOTE_FOR = 1;
export const VOTE_AGAINST = 2;
export const VOTE_ABSTAIN = 3;
export const VOTE_DID_NOT_VOTE = 4;
export const VOTE_CANCELLED = 0;

// GitHub repo that receives feedback tickets and backs the /tickets page.
// Override per-deployment; NEXT_PUBLIC_ is inlined for client components too.
export const GITHUB_REPO =
  process.env.NEXT_PUBLIC_GITHUB_REPO || "alonbn22/HaKnessetSheli";
