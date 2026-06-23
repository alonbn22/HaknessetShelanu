import { useTranslations } from "next-intl";
import type { MemberRecord, MemberClaim } from "@/lib/content";
import { formatDate } from "@/lib/format";

function localized(
  text: { he: string; en?: string; ar?: string; ru?: string },
  locale: string,
): string {
  return (text[locale as keyof typeof text] as string | undefined) ?? text.he;
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
  tone: "positive" | "negative";
}) {
  const t = useTranslations("member");
  if (claims.length === 0) return null;
  return (
    <div className="space-y-3">
      <h3
        className={`font-semibold ${tone === "positive" ? "text-green-800" : "text-red-800"}`}
      >
        {title}
      </h3>
      <ul className="space-y-3">
        {claims.map((c, i) => (
          <li
            key={i}
            className={`rounded-lg border p-3 text-sm ${
              tone === "positive"
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{localized(c.title, locale)}</span>
              {c.status && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    c.status === "convicted"
                      ? "bg-red-200 text-red-900"
                      : c.status === "acquitted" || c.status === "overturned"
                        ? "bg-green-200 text-green-900"
                        : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {t(`recordStatus.${c.status}`)}
                </span>
              )}
            </div>
            {c.description && (
              <p className="mt-1 text-black/70">{localized(c.description, locale)}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              {c.date && <span>{formatDate(c.date, locale)}</span>}
              {c.sources.map((s, j) => (
                <a
                  key={j}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-accent"
                >
                  {s.title}
                  {s.publisher ? ` (${s.publisher})` : ""}
                </a>
              ))}
            </div>
          </li>
        ))}
      </ul>
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

  return (
    <section className="rounded-xl bg-white p-6 shadow-sm space-y-4">
      <h2 className="text-xl font-semibold">{t("record")}</h2>
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
      {/* Legal / editorial safeguard shown with every public record. */}
      <p className="rounded-lg bg-black/5 p-3 text-xs leading-relaxed text-muted">
        {t("recordDisclaimer")}
      </p>
    </section>
  );
}
