import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

// Per-request Content-Security-Policy (Next.js CSP guide). script-src is the real
// defense: 'strict-dynamic' + a per-request nonce blocks any injected <script>.
// Next auto-stamps the nonce onto its framework/bundle scripts AND onto the one
// hand-written inline script (the pre-paint theme snippet); the layout declares
// the same nonce on that script so React hydrates it without a mismatch warning.
// style-src keeps 'unsafe-inline' (Tailwind/next-font inline styles; style
// injection is a far smaller surface). Nonces force dynamic rendering, which this
// site already uses on virtually every page.
export default function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // Member photos / party emblems load straight from Wikimedia (unoptimized).
    "img-src 'self' blob: data: https://upload.wikimedia.org https://commons.wikimedia.org",
    "font-src 'self'",
    // Dev needs the HMR websocket.
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  // next-intl's middleware forwards the (modified) request headers into its
  // rewrite, so the render sees x-nonce + the CSP header; the response carries
  // the CSP for the browser. A QA test asserts the nonce actually lands on the
  // rendered scripts, so a regression here fails loudly.
  const response = intl(new NextRequest(request, { headers: requestHeaders }));
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Skip API routes, Next internals, and static files.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
