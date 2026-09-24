"use client";

// Replaces the root layout when it is the thing that failed, so it cannot rely
// on next-intl, the header, or globals.css having loaded. Everything here is
// self-contained: Hebrew (the default locale) as \u escapes per AGENTS.md, and
// inline styles rather than utility classes.
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
          background: "#f8f7f4",
          color: "#1a1a1a",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
        }}
      >
        <main style={{ maxWidth: "34rem", padding: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.75rem" }}>
            {"\u05DE\u05E9\u05D4\u05D5 \u05D4\u05E9\u05EA\u05D1\u05E9"}
          </h1>
          <p style={{ color: "#595959", lineHeight: 1.7, margin: "0 0 1.5rem" }}>
            {"\u05D0\u05D9\u05E8\u05E2\u05D4 \u05EA\u05E7\u05DC\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D4\u05D3\u05E3. \u05D0\u05E4\u05E9\u05E8 \u05DC\u05E0\u05E1\u05D5\u05EA \u05E9\u05D5\u05D1, \u05D0\u05D5 \u05DC\u05D7\u05D6\u05D5\u05E8 \u05DC\u05E2\u05DE\u05D5\u05D3 \u05D4\u05D1\u05D9\u05EA."}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#0b3d91",
              color: "#fff",
              border: 0,
              borderRadius: "0.5rem",
              padding: "0.6rem 1.1rem",
              font: "inherit",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {"\u05E0\u05E1\u05D5 \u05E9\u05D5\u05D1"}
          </button>
          {error.digest && (
            <p style={{ color: "#595959", fontSize: "0.75rem", marginTop: "1.5rem" }}>
              {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  );
}
