"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- the home links reload the
   page on purpose: after the root layout failed, a client-side navigation would
   reuse the state that broke it (and to the same URL would not clear it). */

// Replaces the root layout when it is the thing that failed, so it cannot rely
// on next-intl, the header, or globals.css having loaded. Everything here is
// self-contained: Hebrew (the default locale, as \u escapes per AGENTS.md) and
// English, with inline styles rather than utility classes.
const heading = { fontSize: "1.5rem", margin: "0 0 0.75rem" };
const body = { color: "#595959", lineHeight: 1.7, margin: "0 0 1.25rem" };
const button = {
  background: "#0038b8",
  color: "#fff",
  border: 0,
  borderRadius: "0.5rem",
  padding: "0.6rem 1.1rem",
  font: "inherit",
  fontWeight: 600,
  cursor: "pointer",
};
const link = { color: "#0038b8", fontWeight: 600, marginInlineStart: "1rem" };

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="he" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f4efe4",
          color: "#1a1a1a",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
        }}
      >
        <title>{"\u05DE\u05E9\u05D4\u05D5 \u05D4\u05E9\u05EA\u05D1\u05E9 \u00B7 Something went wrong"}</title>
        <main style={{ maxWidth: "34rem", padding: "2rem", textAlign: "center" }}>
          <h1 style={heading}>{"\u05DE\u05E9\u05D4\u05D5 \u05D4\u05E9\u05EA\u05D1\u05E9"}</h1>
          <p style={body}>
            {"\u05D0\u05D9\u05E8\u05E2\u05D4 \u05EA\u05E7\u05DC\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D4\u05D3\u05E3. \u05D0\u05E4\u05E9\u05E8 \u05DC\u05E0\u05E1\u05D5\u05EA \u05E9\u05D5\u05D1, \u05D0\u05D5 \u05DC\u05D7\u05D6\u05D5\u05E8 \u05DC\u05E2\u05DE\u05D5\u05D3 \u05D4\u05D1\u05D9\u05EA."}
          </p>
          <button type="button" onClick={reset} style={button}>
            {"\u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1"}
          </button>
          <a href="/" style={link}>
            {"\u05DC\u05E2\u05DE\u05D5\u05D3 \u05D4\u05D1\u05D9\u05EA"}
          </a>
          <div lang="en" dir="ltr" style={{ borderTop: "1px solid #e2dbcb", marginTop: "2rem", paddingTop: "2rem" }}>
            <h2 style={heading}>Something went wrong</h2>
            <p style={body}>This page failed to load. You can try again, or go back to the home page.</p>
            <button type="button" onClick={reset} style={button}>
              Try again
            </button>
            <a href="/en" style={link}>
              Go to the home page
            </a>
          </div>
          {error.digest && (
            <p style={{ color: "#595959", fontSize: "0.75rem", marginTop: "1.5rem" }}>{error.digest}</p>
          )}
        </main>
      </body>
    </html>
  );
}
