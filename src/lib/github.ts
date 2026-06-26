// Reads the public ticket queue (GitHub Issues) for the on-site /tickets page.
// Server-only fetch (works on localhost); the create flow still opens a
// pre-filled issue on GitHub. No token needed — public repo issues are readable
// unauthenticated. Cached so we don't hit GitHub's rate limit on every request.

export const GITHUB_REPO =
  process.env.NEXT_PUBLIC_GITHUB_REPO || "alonbn22/HaKnessetSheli";

export type Ticket = {
  number: number;
  title: string;
  url: string;
  kind: "report" | "suggestion" | "other";
  createdAt: string;
  comments: number;
};

const stripPrefix = (s: string) => s.replace(/^\[(Report|Suggestion)\]\s*/i, "").trim();

// Returns open tickets, or null if GitHub can't be reached (the page then shows
// a graceful fallback + a link to GitHub).
export async function fetchOpenTickets(limit = 50): Promise<Ticket[] | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/issues?state=open&per_page=${limit}&sort=created&direction=desc`,
      {
        headers: { Accept: "application/vnd.github+json", "User-Agent": "HaKnessetSheli" },
        next: { revalidate: 300 }, // 5 min — stays well under the rate limit
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      number: number;
      title: string;
      html_url: string;
      created_at: string;
      comments: number;
      pull_request?: unknown;
      labels?: Array<string | { name?: string }>;
    }>;
    return data
      .filter((i) => !i.pull_request) // the issues endpoint also returns PRs
      .map((i) => {
        const labels = (i.labels ?? []).map((l) => (typeof l === "string" ? l : (l.name ?? "")));
        const kind = labels.includes("report")
          ? "report"
          : labels.includes("suggestion")
            ? "suggestion"
            : "other";
        return {
          number: i.number,
          title: stripPrefix(i.title) || i.title,
          url: i.html_url,
          kind: kind as Ticket["kind"],
          createdAt: i.created_at,
          comments: i.comments,
        };
      });
  } catch {
    return null;
  }
}
