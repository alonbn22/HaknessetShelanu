// Shared pill/badge styling so pass/fail (accepted/rejected) coloring is defined
// once. Used by VoteResultBadge (per-MK result) and VoteCard (vote outcome) so a
// palette change does not have to be repeated and cannot drift between them.
export const BADGE_BASE = "inline-block rounded-full px-2 py-0.5 text-xs font-medium";
export const BADGE_PASS = "bg-green-100 text-green-800";
export const BADGE_FAIL = "bg-red-100 text-red-800";
