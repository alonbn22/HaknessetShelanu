// Shared nav definition used by the desktop nav (NavLinks) and the mobile
// hamburger menu (MobileNav). Keys resolve against the `nav` message namespace.
export const navItems = [
  { href: "/", key: "home" },
  { href: "/members", key: "members" },
  { href: "/ministers", key: "ministers" },
  { href: "/parties", key: "parties" },
  { href: "/votes", key: "votes" },
  { href: "/laws", key: "laws" },
  { href: "/committees", key: "committees" },
  { href: "/lawbook", key: "lawbook" },
  { href: "/budget", key: "budget" },
  { href: "/lobbyists", key: "lobbyists" },
  { href: "/attendance", key: "attendance" },
  { href: "/elections", key: "electionsHistory" },
  { href: "/quiz", key: "quiz" },
  { href: "/glossary", key: "glossary" },
  { href: "/tickets", key: "tickets" },
] as const;

export type NavItem = (typeof navItems)[number];
