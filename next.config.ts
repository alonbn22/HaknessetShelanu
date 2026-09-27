import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Images are served as-is: member photos and emblems load straight from
  // Wikimedia (CSP img-src in src/proxy.ts), so no optimizer and no
  // remotePatterns — /_next/image never fetches for anyone.
  images: { unoptimized: true },
  // Static security headers. The Content-Security-Policy is NOT here — it needs
  // a per-request nonce, so it's set by the middleware (src/proxy.ts).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // 2 years, preload-eligible; a no-op over plain http (dev).
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
