import type { MetadataRoute } from "next";
import { navItems } from "@/components/nav-items";
import { locales } from "@/i18n/routing";
import { getSitemapEntityIds } from "@/lib/queries";
import { getRunningLists } from "@/lib/content";

// Set NEXT_PUBLIC_SITE_URL to the production origin (no trailing slash) once a
// domain exists; until then the sitemap self-references localhost, which is
// harmless and keeps local verification honest.
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// he is served unprefixed (localePrefix "as-needed"); the rest are prefixed.
const LOCALES = locales;
const localeUrl = (locale: string, path: string) =>
  `${BASE}${locale === "he" ? "" : `/${locale}`}${path}`;

// ~9k pages × 6 locales is above the 50k-URL limit of one sitemap file, so
// each locale gets its own file: /sitemap/0.xml … /sitemap/5.xml, in the order
// of routing.locales. robots.ts lists all of them.
export async function generateSitemaps() {
  return LOCALES.map((_, id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const locale = LOCALES[Number(await props.id)] ?? LOCALES[0];
  const { members, parties, committees, bills, votes } = getSitemapEntityIds();

  const paths: { path: string; priority: number }[] = [
    ...navItems.map((n) => ({ path: n.href === "/" ? "" : n.href, priority: 0.8 })),
    { path: "/search", priority: 0.5 },
    { path: "/sources", priority: 0.5 },
    { path: "/accessibility", priority: 0.3 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
    { path: "/credits", priority: 0.3 },
    { path: "/legislators", priority: 0.6 },
    { path: "/elections/history", priority: 0.5 },
    { path: "/elections/positions", priority: 0.6 },
    { path: "/elections/find", priority: 0.6 },
    { path: "/elections/lists", priority: 0.6 },
    // Lists that continue a faction live on the faction's page (listed above).
    ...[...getRunningLists().values()].filter((l) => l.factionId == null).map((l) => ({ path: `/elections/${l.slug}`, priority: 0.7 })),
    ...members.map((id) => ({ path: `/members/${id}`, priority: 0.7 })),
    ...parties.map((id) => ({ path: `/parties/${id}`, priority: 0.7 })),
    ...committees.map((id) => ({ path: `/committees/${id}`, priority: 0.5 })),
    ...bills.map((id) => ({ path: `/laws/${id}`, priority: 0.5 })),
    ...votes.map((id) => ({ path: `/votes/${id}`, priority: 0.4 })),
  ];

  return paths.map(({ path, priority }) => ({
    url: localeUrl(locale, path),
    changeFrequency: "daily" as const,
    priority,
  }));
}
