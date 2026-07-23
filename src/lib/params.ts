// Parse the ?page= search param to a positive integer (1-based; defaults to 1).
// Clamping an over-range page to the last real page happens in the query layer
// (paginate() in queries.ts), which knows the total row count.
export function pageParam(raw: string | undefined): number {
  return Math.max(1, parseInt(raw ?? "1", 10) || 1);
}
