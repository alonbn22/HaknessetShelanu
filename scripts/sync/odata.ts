// Minimal OData V4 client for the Knesset open-data API.
// The server hard-caps pages at 100 rows; we follow @odata.nextLink.

export const ODATA_BASE = "https://knesset.gov.il/OdataV4/ParliamentInfo";

const PAGE_DELAY_MS = 150; // be gentle — the service has no SLA
const MAX_RETRIES = 5;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchJson(url: string): Promise<Record<string, unknown>> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return (await res.json()) as Record<string, unknown>;
    } catch (err) {
      if (attempt >= MAX_RETRIES) throw err;
      const backoff = 2_000 * 2 ** attempt;
      console.warn(`  retry ${attempt + 1}/${MAX_RETRIES} in ${backoff}ms: ${err}`);
      await sleep(backoff);
    }
  }
}

// Fetch with retry + exponential backoff, returning the raw Response. For
// callers outside the OData service (Wikidata SPARQL, Commons, data.gov.il CKAN)
// that parse the body themselves but still want fetchJson's resilience policy.
export async function fetchRetry(
  url: string,
  init: RequestInit = {},
  opts: { retries?: number; timeoutMs?: number } = {},
): Promise<Response> {
  const { retries = MAX_RETRIES, timeoutMs = 60_000 } = opts;
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res;
    } catch (err) {
      if (attempt >= retries) throw err;
      const backoff = 2_000 * 2 ** attempt;
      console.warn(`  retry ${attempt + 1}/${retries} in ${backoff}ms: ${err}`);
      await sleep(backoff);
    }
  }
}

export function entityUrl(entity: string, query: Record<string, string> = {}): string {
  const params = new URLSearchParams(query);
  const qs = params.toString();
  return `${ODATA_BASE}/${entity}${qs ? `?${qs}` : ""}`;
}

// Iterate all rows of a query, following server pagination.
export async function* fetchAllRows<T = Record<string, unknown>>(
  startUrl: string,
  onProgress?: (fetched: number) => void,
): AsyncGenerator<T> {
  let url: string | undefined = startUrl;
  let fetched = 0;
  while (url) {
    const data = await fetchJson(url);
    const rows = (data.value ?? []) as T[];
    for (const row of rows) yield row;
    fetched += rows.length;
    onProgress?.(fetched);
    url = data["@odata.nextLink"] as string | undefined;
    if (url) await sleep(PAGE_DELAY_MS);
  }
}

// Collect all rows of a query into an array (follows pagination).
export async function fetchAll<T = Record<string, unknown>>(
  startUrl: string,
): Promise<T[]> {
  const out: T[] = [];
  for await (const row of fetchAllRows<T>(startUrl)) out.push(row);
  return out;
}

// Row count for an entity+filter (the /$count endpoint returns a plain number).
export async function fetchCount(
  entity: string,
  filter: string,
): Promise<number> {
  const url = `${ODATA_BASE}/${entity}/$count?$filter=${encodeURIComponent(filter)}`;
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return parseInt((await res.text()).trim(), 10) || 0;
    } catch (err) {
      if (attempt >= 4) throw err;
      await sleep(2000 * 2 ** attempt);
    }
  }
}

// Run async tasks with a concurrency limit, in order of completion.
export async function pool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, run),
  );
  return results;
}

// Generate [from, to) ISO date windows of `days` length covering [start, end].
export function dateWindows(
  startIso: string,
  endIso: string,
  days: number,
): Array<{ from: string; to: string }> {
  const windows: Array<{ from: string; to: string }> = [];
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const step = days * 24 * 60 * 60 * 1000;
  for (let t = start; t < end; t += step) {
    windows.push({
      from: new Date(t).toISOString(),
      to: new Date(Math.min(t + step, end)).toISOString(),
    });
  }
  return windows;
}
