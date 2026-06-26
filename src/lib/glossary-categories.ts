// Client-safe constants (no node:fs) — shared by the content loader and the
// client-side glossary browser.
export const GLOSSARY_CATEGORIES = [
  "spectrum",
  "ideology",
  "economy",
  "government",
  "electoral",
  "rights",
  "international",
  "israel",
] as const;
export type GlossaryCategory = (typeof GLOSSARY_CATEGORIES)[number];
