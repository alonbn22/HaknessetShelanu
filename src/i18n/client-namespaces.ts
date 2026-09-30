// The message namespaces client components read. The layout passes only these
// to NextIntlClientProvider: by default it serialises the whole catalogue
// (privacy policy, terms, every page's copy) into every page's HTML.
// tests/qa/client-messages.test.ts fails when a client component reads a
// namespace missing here.
export const CLIENT_NAMESPACES: readonly string[] = [
  "a11y",
  "attendance",
  "budget",
  "common",
  "compare",
  "error",
  "feedback",
  "finder",
  "footer",
  "glossary",
  "hemicycle",
  "home",
  "lawbook",
  "lobbyists",
  "members",
  "nav",
  "parties",
  "quiz",
  "search",
  "spectrum",
  "theme",
  "voteResult",
  "votes",
];
