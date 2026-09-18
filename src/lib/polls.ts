import type { Poll } from "./content";

// The arithmetic behind the polls section, kept pure so tests/qa/polls.test.ts
// can pin it: which polls feed the average, how houses are deduped, and how a
// list with no seats in a poll is counted.

export const KNESSET_SEATS = 120;
export const MAJORITY = 61;
// 3.25% of valid votes is ≈3.9 of 120 seats: the smallest delegation a list
// can hold is 4, so that is where the threshold line is drawn on seat charts.
export const THRESHOLD_SEATS = 4;
// How far back from the newest poll an institute's latest poll still counts.
export const AVERAGE_WINDOW_DAYS = 14;

export type ListAverage = {
  slug: string;
  mean: number; // equal weight per institute; 0 when a poll lists the party below threshold
  min: number;
  max: number;
  /** In how many of the inputs the list is at or above the threshold. */
  above: number;
};

export type PollAverage = {
  /** The polls that feed the average — one per institute, newest first. */
  inputs: Poll[];
  institutes: number;
  from: string; // earliest input's published date
  to: string; // latest input's published date
  lists: ListAverage[]; // registry order, filtered to lists that appear in ≥1 input
};

const DAY = 24 * 60 * 60 * 1000;

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY);
}

// Latest poll per institute within the window, in registry order of lists.
// A list a poll reports below the threshold counts as 0 in that poll — the
// range (min–max) and `above` make that visible instead of hiding it.
export function pollOfPolls(
  polls: Poll[],
  slugs: string[],
  windowDays: number = AVERAGE_WINDOW_DAYS,
): PollAverage | null {
  if (polls.length === 0) return null;
  const sorted = [...polls].sort(
    (a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id),
  );
  const newest = sorted[0].published;
  const byInstitute = new Map<string, Poll>();
  for (const p of sorted) {
    if (daysBetween(p.published, newest) > windowDays) continue;
    if (!byInstitute.has(p.instituteId)) byInstitute.set(p.instituteId, p);
  }
  const inputs = [...byInstitute.values()];
  const lists: ListAverage[] = [];
  for (const slug of slugs) {
    const values = inputs.map((p) => p.seats[slug] ?? 0);
    if (!inputs.some((p) => slug in p.seats || p.belowThreshold.includes(slug))) continue;
    const sum = values.reduce((s, v) => s + v, 0);
    lists.push({
      slug,
      mean: sum / inputs.length,
      min: Math.min(...values),
      max: Math.max(...values),
      above: values.filter((v) => v >= THRESHOLD_SEATS).length,
    });
  }
  const dates = inputs.map((p) => p.published).sort();
  return { inputs, institutes: inputs.length, from: dates[0], to: dates[dates.length - 1], lists };
}

export type TrendPoint = { date: string; seats: number; pollId: string };
export type TrendSeries = { slug: string; points: TrendPoint[] };

// One series per list, oldest first, one point per poll (0 when reported below
// the threshold, absent when the poll did not mention the list at all).
export function trendSeries(polls: Poll[], slugs: string[]): TrendSeries[] {
  const asc = [...polls].sort((a, b) => a.published.localeCompare(b.published) || a.id.localeCompare(b.id));
  return slugs
    .map((slug) => ({
      slug,
      points: asc
        .filter((p) => slug in p.seats || p.belowThreshold.includes(slug))
        .map((p) => ({ date: p.published, seats: p.seats[slug] ?? 0, pollId: p.id })),
    }))
    .filter((s) => s.points.length > 0);
}

// Seats sum check used by the QA test and the page's own caption.
export function seatTotal(poll: Poll): number {
  return Object.values(poll.seats).reduce((s, v) => s + v, 0);
}
