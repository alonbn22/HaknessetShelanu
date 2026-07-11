// Shared client for the unofficial Google Translate ("gtx") endpoint used across
// the app (lazy data translation in i18n-data.ts; search-query translation in
// translate-query.ts). Keeping the endpoint URL, the nested-array response
// parser, and the nikud-strip rule in ONE place means a change to the (unofficial)
// API shape or the strip rule is a one-line edit. Server-only (network fetch).

// Nikud = Hebrew vowel points / cantillation marks (U+0591–U+05C7). The
// endpoint sometimes returns vocalized Hebrew, but stored/compared text is
// unvocalized, so strip these before matching. Escaped per the no-hardcoded-
// Hebrew rule (same style as the HEBREW regex in src/lib/text.ts).
export const NIKUD = /[\u0591-\u05c7]/g;

export function stripNikud(s: string): string {
  return s.replace(NIKUD, "");
}

// Translate `text` from `sl` to `tl`. Returns the translated string (nikud
// stripped) or null on any failure — each caller decides its own fallback.
export async function gtxTranslate(
  text: string,
  opts: { sl: string; tl: string; timeoutMs?: number },
): Promise<string | null> {
  const params = new URLSearchParams({
    client: "gtx",
    sl: opts.sl,
    tl: opts.tl,
    dt: "t",
    q: text,
  });
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?${params}`, {
      signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
    const out = stripNikud(
      (data[0] as unknown[]).map((s) => (Array.isArray(s) ? String(s[0] ?? "") : "")).join(""),
    ).trim();
    return out || null;
  } catch {
    return null;
  }
}
