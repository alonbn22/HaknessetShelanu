// Shared text helpers.

// Hebrew Unicode block. Detects Hebrew text so we can set dir="rtl"/lang="he" on
// untranslated data (member/faction names, vote titles, …) that may still be
// Hebrew regardless of the UI locale. Defined once here (escaped, so it carries
// no literal Hebrew) and reused everywhere instead of re-declaring the regex.
const HEBREW = /[\u0590-\u05FF]/;

export function isHebrew(s: string | null | undefined): boolean {
  return s != null && HEBREW.test(s);
}
