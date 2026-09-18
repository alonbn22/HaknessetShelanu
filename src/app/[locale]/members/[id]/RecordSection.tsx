import { useTranslations } from "next-intl";
import type { MemberRecord, MemberClaim } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { isHebrew } from "@/lib/text";

// Locale -> Hebrew fallback (no en intermediate): legal record text is authored
// per locale; the page fills missing ar/ru from the cache.
function localized(
  text: { he: string; en?: string; ar?: string; ru?: string },
  locale: string,
): string {
  return (text[locale as keyof typeof text] as string | undefined) ?? text.he;
}

// Mark untranslated Hebrew so it renders RTL under a non-Hebrew document language.
const rtlProps = (s: string) =>
  isHebrew(s) ? ({ dir: "rtl", lang: "he" } as const) : {};

// Newest first; undated claims sink to the end (stable for equal keys).
function byDateDesc(a: MemberClaim, b: MemberClaim): number {
  return (b.date ?? "").localeCompare(a.date ?? "");
}

function ClaimList({
  claims,
  locale,
  title,
  tone,
}: {
  claims: MemberClaim[];
  locale: string;
  title: string;
  tone: "positive" | "negative" | "neutral";
}) {
  const t = useTranslations("member");
  return (
    <div className="space-y-3">
      <h3
        className={`font-semibold ${tone === "positive" ? "text-green-800" : tone === "negative" ? "text-red-800" : "text-foreground"}`}
      >
        {title}
        <span className="ms-2 align-middle text-xs font-normal text-muted">
          {claims.length > 0 ? claims.length : ""}
        </span>
      </h3>
      {claims.length === 0 ? (
        // Honest empty state: nothing in OUR database (not a clean bill of health).
        <p className="rounded-lg border border-dashed border-black/10 p-3 text-sm text-muted">
          {t("recordNone")}
        </p>
      ) : (
        <ul className="space-y-3">
          {claims
            .slice()
            .sort(byDateDesc)
            .map((c, i) => (
              <li
                key={i}
                className={`rounded-lg border p-3 text-sm ${
                  tone === "positive"
                    ? "border-green-200 bg-green-50"
                    : tone === "negative"
                      ? "border-red-200 bg-red-50"
                      : "border-line bg-surface"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium" {...rtlProps(localized(c.title, locale))}>
                    {localized(c.title, locale)}
                  </span>
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-muted">
                    {t(`recordCategory.${c.category}`)}
                  </span>
                  {c.status && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        c.status === "convicted"
                          ? "bg-red-200 text-red-900"
                          : c.status === "acquitted" || c.status === "overturned" || c.status === "closed"
                            ? "bg-green-200 text-green-900"
                            : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {t(`recordStatus.${c.status}`)}
                    </span>
                  )}
                  {c.date && (
                    <span className="ms-auto text-xs text-muted">
                      {formatDate(c.date, locale)}
                    </span>
                  )}
                </div>
                {c.description && (
                  <p className="mt-1 text-black/70" {...rtlProps(localized(c.description, locale))}>
                    {localized(c.description, locale)}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-black/5 pt-2 text-xs text-muted">
                  <span className="font-medium">{t("recordSources")}:</span>
                  {c.sources.map((s, j) => (
                    <a
                      key={j}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-accent"
                      {...rtlProps(s.title)}
                    >
                      {s.title}
                      {s.publisher ? ` (${s.publisher})` : ""}
                    </a>
                  ))}
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

export function RecordSection({
  record,
  locale,
}: {
  record: MemberRecord;
  locale: string;
}) {
  const t = useTranslations("member");
  const positive = record.claims.filter((c) => c.kind === "positive");
  const negative = record.claims.filter((c) => c.kind === "negative");
  const neutral = record.claims.filter((c) => c.kind === "neutral");

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">{t("record")}</h2>
        {record.lastReviewed && (
          <span className="text-xs text-muted">
            {t("recordReviewed", { date: formatDate(record.lastReviewed, locale) })}
          </span>
        )}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <ClaimList
          claims={positive}
          locale={locale}
          title={t("positiveRecord")}
          tone="positive"
        />
        <ClaimList
          claims={negative}
          locale={locale}
          title={t("negativeRecord")}
          tone="negative"
        />
      </div>
      {neutral.length > 0 && (
        <ClaimList claims={neutral} locale={locale} title={t("neutralRecord")} tone="neutral" />
      )}
      {/* Legal / editorial safeguard shown with every public record. */}
      <p className="rounded-lg bg-black/5 p-3 text-xs leading-relaxed text-muted">
        {t("recordDisclaimer")}
      </p>
    </section>
  );
}
