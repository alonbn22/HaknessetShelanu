import { getTranslations, getLocale } from "next-intl/server";
import { partyText, partyTextAttrs, partyTextClass, type ElectionOutlook } from "@/lib/content";

type KeyDate = NonNullable<ElectionOutlook["keyDates"]>[number];

// "Key dates ahead" timeline: date chips on a vertical spine with countdowns.
// The NEXT upcoming step gets the solid accent chip; election day is always
// prominent (outlined accent chip + bold label) even when it isn't next.
// `compact` (home banner) shows chip + label + countdown; `full` (elections
// page) adds status pills, details, and sources.
export async function KeyDatesTimeline({
  dates,
  variant = "full",
}: {
  dates: KeyDate[];
  variant?: "compact" | "full";
}) {
  const te = await getTranslations("election");
  const tc = await getTranslations("common");
  const locale = await getLocale();

  const chipText = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short" });

  // Whole days until each date (local midnight vs local midnight; 0 = today).
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const daysUntil = (iso: string) =>
    Math.round((new Date(`${iso}T00:00:00`).getTime() - todayStart) / 86_400_000);

  // The next upcoming step (first date that hasn't passed) carries the focus.
  const nextKey = dates.find((d) => d.date && daysUntil(d.date) >= 0)?.key;

  // The home banner shows what is still ahead — the next few steps and always
  // election day — not the whole calendar; the full timeline lives on /elections.
  const shown =
    variant === "compact"
      ? (() => {
          const ahead = dates.filter((d) => d.date && daysUntil(d.date) >= 0);
          const pick = ahead.slice(0, 4);
          const election = dates.find((d) => d.key === "kd-election");
          if (election && !pick.includes(election) && ahead.includes(election)) pick.push(election);
          return pick.length > 0 ? pick : dates.slice(-3);
        })()
      : dates;

  return (
    <ol className={variant === "compact" ? "space-y-2" : "space-y-4"}>
      {shown.map((d) => {
        const isElection = d.key === "kd-election";
        const isNext = d.key === nextKey;
        const days = d.date ? daysUntil(d.date) : null;
        const chipClass = isNext
          ? "bg-accent text-white"
          : isElection
            ? "border-2 border-accent bg-accent/10 text-accent"
            : "bg-black/5 text-muted";
        return (
          <li key={d.key} className="relative flex gap-3 ps-1">
            {/* Spine segment behind the chip column. */}
            <span
              aria-hidden
              className="absolute top-0 bottom-[-0.5rem] w-px bg-accent/20"
              style={{ insetInlineStart: "2.6rem" }}
            />
            {d.date && (
              <span
                className={`relative z-10 h-fit shrink-0 rounded-md px-2 py-1 text-center text-[11px] font-bold uppercase tabular-nums leading-none min-w-[5.25rem] ${chipClass}`}
              >
                {chipText(d.date)}
              </span>
            )}
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span
                  className={`${isElection ? "text-lg font-bold leading-tight" : "font-medium text-foreground/80"} ${partyTextClass(d.label, locale)}`}
                  {...partyTextAttrs(d.label, locale)}
                >
                  {partyText(d.label, locale)}
                </span>
                {days != null && days >= 0 && (
                  <span
                    className={`whitespace-nowrap text-xs ${
                      isNext ? "font-semibold text-accent" : "text-muted"
                    }`}
                  >
                    {te("inDays", { days })}
                  </span>
                )}
                {variant === "full" && d.status && d.status !== "confirmed" && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                    {te(d.status === "scheduled-by-law" ? "statusByLaw" : "statusReported")}
                  </span>
                )}
              </div>
              {variant === "full" && d.detail && (
                <p className={`text-sm leading-relaxed ${partyTextClass(d.detail, locale)}`} {...partyTextAttrs(d.detail, locale)}>{partyText(d.detail, locale)}</p>
              )}
              {variant === "full" && d.sources.length > 0 && (
                <span className="text-xs text-muted">
                  {tc("source")}:{" "}
                  {d.sources.map((s, i) => (
                    <span key={s.url}>
                      {i > 0 && " · "}
                      <a
                        className="underline hover:text-accent"
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {s.publisher ?? s.title}
                      </a>
                    </span>
                  ))}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
