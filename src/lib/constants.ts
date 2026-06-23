export const CURRENT_KNESSET = 25;

// First sitting of the 25th Knesset — used to scope vote queries,
// since KNS_PlenumVote has no KnessetNum column.
export const CURRENT_KNESSET_START = "2022-11-15T00:00:00+02:00";

// KNS_Position ids.
export const POSITION_MK_MALE = 43; // חבר הכנסת
export const POSITION_MK_FEMALE = 61; // חברת הכנסת
export const POSITION_FACTION_MEMBER = 54; // חבר/ת סיעה

export const MK_POSITION_IDS = [POSITION_MK_MALE, POSITION_MK_FEMALE];

// Canonical vote result codes (ours; the API's raw codes vary by service).
export const VOTE_FOR = 1;
export const VOTE_AGAINST = 2;
export const VOTE_ABSTAIN = 3;
export const VOTE_DID_NOT_VOTE = 4;
export const VOTE_CANCELLED = 0;
