import Link from "next/link";
import he from "../../messages/he.json";
import en from "../../messages/en.json";

// The 404 for URLs whose first segment is not a locale: in practice paths the
// proxy skips because they contain a dot (/foo.txt, /wp-login.php). They still
// match app/[locale], whose layout then calls notFound(); with the root layout
// itself failing, this app-root boundary renders instead of Next's built-in
// English page, outside every layout. So no next-intl, fonts or globals.css:
// the copy comes straight from the message files and the styles are inline.
// (global-not-found would not reach these: it serves URLs no route matches,
// and [locale] matches every first segment.)

const heading = { fontSize: "1.5rem", margin: "0 0 0.75rem" };
const body = { color: "#595959", lineHeight: 1.7, margin: "0 0 1.25rem" };
const button = {
  display: "inline-block",
  background: "#0038b8",
  color: "#fff",
  borderRadius: "0.5rem",
  padding: "0.6rem 1.1rem",
  fontWeight: 600,
  textDecoration: "none",
};

export default function RootNotFound() {
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
        <title>{`${he.notFound.title} \u00B7 ${en.notFound.title}`}</title>
        <main style={{ maxWidth: "34rem", padding: "2rem", textAlign: "center" }}>
          <p style={{ fontSize: "3.5rem", fontWeight: 800, color: "#0038b8", margin: "0 0 0.5rem" }}>404</p>
          <h1 style={heading}>{he.notFound.title}</h1>
          <p style={body}>{he.notFound.body}</p>
          <Link href="/" style={button}>
            {he.notFound.backHome}
          </Link>
          <div lang="en" dir="ltr" style={{ borderTop: "1px solid #e2dbcb", marginTop: "2rem", paddingTop: "2rem" }}>
            <h2 style={heading}>{en.notFound.title}</h2>
            <p style={body}>{en.notFound.body}</p>
            <Link href="/en" style={button}>
              {en.notFound.backHome}
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
