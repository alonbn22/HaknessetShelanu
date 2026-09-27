// Parse ?page= to a positive int (1-based, default 1). Over-range clamping is
// done later by paginate() in queries.ts, which knows the row count.
export function pageParam(raw: string | undefined): number {
  return Math.max(1, parseInt(raw ?? "1", 10) || 1);
}

// Parse ?q= to a trimmed search string of at most 200 characters: a search has
// no business being longer, and the cap bounds every LIKE scan. A repeated
// ?q=a&q=b arrives as an array; String() keeps that from throwing.
export function queryParam(raw: string | string[] | undefined): string {
  return String(raw ?? "").trim().slice(0, 200);
}
