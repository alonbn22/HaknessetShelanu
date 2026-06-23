import { getTranslations, setRequestLocale } from "next-intl/server";
import { FeedbackActions } from "@/components/FeedbackActions";
import { fetchOpenTickets, GITHUB_REPO } from "@/lib/github";
import { formatDate } from "@/lib/format";

// On-site ticket page: shows the open tickets (read from the public GitHub Issues
// queue) and lets anyone open a new one. Submissions create a ticket reviewed
// before anything is published; nothing is written to the site/DB directly.
export const revalidate = 300;

export default async function TicketsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("tickets");
  const tickets = await fetchOpenTickets();
  const issuesUrl = `https://github.com/${GITHUB_REPO}/issues`;

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="leading-relaxed text-lg text-black/70">{t("intro")}</p>

      <section className="space-y-3 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold">{t("openNew")}</h2>
        <FeedbackActions subject="site" />
        <p className="leading-relaxed text-sm text-muted">{t("note")}</p>
        <p className="text-sm text-muted">{t("needGithub")}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("openTickets")}</h2>
        {tickets === null ? (
          <p className="text-muted">
            {t("unavailable")}{" "}
            <a
              className="text-accent hover:underline"
              href={issuesUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("viewOnGithub")}
            </a>
          </p>
        ) : tickets.length === 0 ? (
          <p className="text-muted">{t("empty")}</p>
        ) : (
          <ul className="space-y-2">
            {tickets.map((tk) => (
              <li
                key={tk.number}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-white p-3 shadow-sm"
              >
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    tk.kind === "report"
                      ? "bg-amber-100 text-amber-900"
                      : tk.kind === "suggestion"
                        ? "bg-green-100 text-green-900"
                        : "bg-black/10 text-black/70"
                  }`}
                >
                  {t(`kind.${tk.kind}`)}
                </span>
                <a
                  href={tk.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate font-medium hover:underline"
                >
                  {tk.title}
                </a>
                <span className="text-xs text-muted">
                  #{tk.number} · {formatDate(tk.createdAt, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted">
          <a
            className="text-accent hover:underline"
            href={issuesUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("viewAllOnGithub")}
          </a>
        </p>
      </section>
    </article>
  );
}
