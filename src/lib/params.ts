// Parse ?page= to a positive int (1-based, default 1). Over-range clamping is
// done later by paginate() in queries.ts, which knows the row count.
export function pageParam(raw: string | undefined): number {
  return Math.max(1, parseInt(raw ?? "1", 10) || 1);
}
