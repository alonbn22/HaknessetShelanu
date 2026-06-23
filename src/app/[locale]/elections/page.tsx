import { getTranslations, getLocale } from "next-intl/server";
import { getElectionsHistory, partyText } from "@/lib/content";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ElectionsHistoryPage() {
  const t = await getTranslations("electionsHistory");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const elections = getElectionsHistory();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </div>

      <ol className="space-y-3">
        {elections.map((e) => (
          <li
            key={e.knesset}
            className="rounded-xl bg-white p-5 shadow-sm border-s-4 border-accent"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold">
                {tc("knessetNum", { num: e.knesset })}
              </h2>
              <span className="text-sm text-muted">{formatDate(e.date, locale)}</span>
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              <div>
                <div className="text-muted">{t("winner")}</div>
                <div className="font-semibold">{partyText(e.winner, locale)}</div>
              </div>
              {e.winnerSeats != null && (
                <div>
                  <div className="text-muted">{t("seats")}</div>
                  <div className="font-semibold text-accent">{e.winnerSeats}</div>
                </div>
              )}
              {e.turnout != null && (
                <div>
                  <div className="text-muted">{t("turnout")}</div>
                  <div className="font-semibold">{e.turnout}%</div>
                </div>
              )}
              {e.pm && (
                <div>
                  <div className="text-muted">{t("pm")}</div>
                  <div className="font-semibold">{partyText(e.pm, locale)}</div>
                </div>
              )}
            </div>
            {e.note && (
              <p className="mt-2 text-sm text-foreground/80">{partyText(e.note, locale)}</p>
            )}

            {(e.summary || (e.events && e.events.length > 0) || e.ended) && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-accent hover:underline">
                  {t("readMore")}
                </summary>
                <div className="mt-3 space-y-4 text-sm">
                  {e.summary && (
                    <p className="text-foreground/80 leading-relaxed">
                      {partyText(e.summary, locale)}
                    </p>
                  )}
                  {e.events && e.events.length > 0 && (
                    <div className="space-y-2">
                      <div className="font-semibold">{t("keyEvents")}</div>
                      <ul className="space-y-1.5">
                        {[...e.events]
                          .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
                          .map((ev, i) => (
                          <li key={i} className="flex gap-2">
                            <span
                              aria-hidden
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                ev.kind === "good"
                                  ? "bg-green-600"
                                  : ev.kind === "bad"
                                    ? "bg-red-600"
                                    : "bg-black/40"
                              }`}
                            />
                            <span className="text-foreground/80">
                              {ev.date && (
                                <span className="text-muted">
                                  {formatDate(ev.date, locale)} —{" "}
                                </span>
                              )}
                              {partyText(ev.text, locale)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {e.ended && (
                    <div className="rounded-lg bg-black/5 p-3">
                      <span className="font-medium">{t("howEnded")}: </span>
                      <span className="text-foreground/80">{partyText(e.ended, locale)}</span>
                    </div>
                  )}
                </div>
              </details>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
