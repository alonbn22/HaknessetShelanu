import type { MetadataRoute } from "next";
import { locales } from "@/i18n/routing";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    // One sitemap file per locale (see src/app/sitemap.ts).
    sitemap: locales.map((_, id) => `${BASE}/sitemap/${id}.xml`),
  };
}
