// Shared nav definition used by the desktop nav (NavLinks), its "More"
// disclosure (NavMore) and the mobile menu (MobileNav). Keys resolve against
// the `nav` message namespace. `primary` items sit inline on desktop — seven,
// so the bar never wraps; the wordmark covers Home. The rest live behind
// "More" on desktop and inline in the mobile menu.
export const navItems = [
  { href: "/", key: "home", group: "mobile" },
  { href: "/members", key: "members", group: "primary" },
  { href: "/votes", key: "votes", group: "primary" },
  { href: "/laws", key: "laws", group: "primary" },
  { href: "/committees", key: "committees", group: "primary" },
  { href: "/parties", key: "parties", group: "primary" },
  { href: "/budget", key: "budget", group: "primary" },
  // "2026 Elections" — the page carries the upcoming-election section on top of
  // the full elections history.
  { href: "/elections", key: "elections", group: "primary" },
  { href: "/attendance", key: "attendance", group: "more" },
  { href: "/compare", key: "compare", group: "more" },
  { href: "/ministers", key: "ministers", group: "more" },
  { href: "/lawbook", key: "lawbook", group: "more" },
  { href: "/lobbyists", key: "lobbyists", group: "more" },
  { href: "/quiz", key: "quiz", group: "more" },
  { href: "/glossary", key: "glossary", group: "more" },
  { href: "/tickets", key: "tickets", group: "more" },
] as const;

export type NavItem = (typeof navItems)[number];

export const primaryNav = navItems.filter((i) => i.group === "primary");
export const moreNav = navItems.filter((i) => i.group === "more");

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
