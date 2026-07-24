export const CURRENT_KNESSET = 25;

// First sitting of the 25th Knesset — used to scope vote queries,
// since KNS_PlenumVote has no KnessetNum column.
export const CURRENT_KNESSET_START = "2022-11-15T00:00:00+02:00";

// KNS_Position ids.
export const POSITION_MK_MALE = 43; // Knesset member (male)
export const POSITION_MK_FEMALE = 61; // Knesset member (female)
export const POSITION_FACTION_MEMBER = 54; // faction member

export const MK_POSITION_IDS = [POSITION_MK_MALE, POSITION_MK_FEMALE];

// Leadership positions, ordered most→least prominent — surfaced as header badges
// on the member page: Speaker, Opposition Leader, committee chair, faction chair,
// deputy Speaker (70/71).
export const LEADERSHIP_POSITION_IDS = [122, 131, 41, 48, 70, 71];

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
