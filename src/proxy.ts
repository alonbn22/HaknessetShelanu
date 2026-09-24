import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

// Per-request CSP. script-src 'strict-dynamic' + a per-request nonce blocks any
// injected <script>. Next stamps the nonce onto its own scripts and the inline
// theme snippet; the layout declares the same nonce so hydration doesn't warn.
// style-src keeps 'unsafe-inline' (Tailwind/next-font). Nonces force dynamic
// rendering, already the norm here.
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
  // The locale layout builds hreflang alternates for the page being rendered;
  // a layout cannot read its own URL, so the proxy hands over the path.
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  // next-intl forwards the modified request headers into its rewrite, so the
  // render sees x-nonce + CSP; set CSP on the response too for the browser.
  // A test asserts the nonce lands on rendered scripts.
  const response = intl(new NextRequest(request, { headers: requestHeaders }));
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Skip API routes, Next internals, and static files.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
