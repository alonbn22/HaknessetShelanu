import type { MetadataRoute } from "next";
import { navItems } from "@/components/nav-items";
import { getSitemapEntityIds } from "@/lib/queries";

// Set NEXT_PUBLIC_SITE_URL to the production origin (no trailing slash) once a
// domain exists; until then the sitemap self-references localhost, which is
// harmless and keeps local verification honest.
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// he is served unprefixed (localePrefix "as-needed"); the rest are prefixed.
const LOCALES = ["he", "en", "ar", "ru"] as const;
const localeUrl = (locale: string, path: string) =>
  `${BASE}${locale === "he" ? "" : `/${locale}`}${path}`;

// ~36k URLs (9k pages × 4 locales) — one file, under the 50k sitemap limit.
export default function sitemap(): MetadataRoute.Sitemap {
  const { members, parties, committees, bills, votes } = getSitemapEntityIds();

  const paths: { path: string; priority: number }[] = [
    ...navItems.map((n) => ({ path: n.href === "/" ? "" : n.href, priority: 0.8 })),
    { path: "/search", priority: 0.5 },
    { path: "/sources", priority: 0.5 },
    { path: "/accessibility", priority: 0.3 },
    { path: "/legislators", priority: 0.6 },
    ...members.map((id) => ({ path: `/members/${id}`, priority: 0.7 })),
    ...parties.map((id) => ({ path: `/parties/${id}`, priority: 0.7 })),
    ...committees.map((id) => ({ path: `/committees/${id}`, priority: 0.5 })),
    ...bills.map((id) => ({ path: `/laws/${id}`, priority: 0.5 })),
    ...votes.map((id) => ({ path: `/votes/${id}`, priority: 0.4 })),
  ];

  return LOCALES.flatMap((locale) =>
    paths.map(({ path, priority }) => ({
      url: localeUrl(locale, path),
      changeFrequency: "daily" as const,
      priority,
    })),
  );
}
