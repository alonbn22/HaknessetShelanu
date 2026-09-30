import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Rendered inside the locale layout, so the header, footer and text direction
// are already correct. Without this file a 404 fell through to Next's built-in
// page: unstyled, English and LTR, on a Hebrew-first RTL site.
export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <section className="mx-auto max-w-2xl space-y-4 py-16 text-center">
      {/* Decorative (the heading says it); 60% ink clears 3:1 for large text in both themes, 25% did not. */}
      <p aria-hidden className="text-6xl font-extrabold tabular-nums text-accent-ink/60">404</p>
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted leading-relaxed">{t("body")}</p>
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Link
          href="/"
          className="rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent-deep"
        >
          {t("backHome")}
        </Link>
        <Link
          href="/search"
          className="rounded-lg border border-accent/30 px-4 py-2 font-semibold text-accent hover:bg-accent/5"
        >
          {t("toSearch")}
        </Link>
      </div>
    </section>
  );
}
