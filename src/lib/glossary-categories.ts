// Client-safe constants (no node:fs) — shared by the content loader and the
// client-side glossary browser.
export const GLOSSARY_CATEGORIES = [
  "spectrum",
  "ideology",
  "economy",
  "government",
  "electoral",
  "israel",
] as const;
export type GlossaryCategory = (typeof GLOSSARY_CATEGORIES)[number];
