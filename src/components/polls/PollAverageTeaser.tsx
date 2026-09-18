import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { rtlLocales } from "@/i18n/routing";
import { getFactionMeta, getPolls, getRunningLists, partyText, partyTextAttrs } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { pollOfPolls } from "@/lib/polls";
import { SectionHeading } from "@/components/ui/SectionHeading";

// The home page's "now" column: the poll of polls, with its count and method,
// linking to the full section. Never a single poll, never a headline number
// without the method beside it (the user's choice: the average, with count
// and method).
export async function PollAverageTeaser({ top = 6 }: { top?: number }) {
  const file = getPolls();
  if (!file) return null;
  const registry = getRunningLists();
  const slugs = [...registry.keys()];
  const avg = pollOfPolls(file.polls, slugs);
  if (!avg) return null;
  const t = await getTranslations("polls");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const arrow = rtlLocales.has(locale) ? "←" : "→";
  const factionColor = new Map([...getFactionMeta().values()].map((f) => [f.id, f.color]));

  const rows = [...avg.lists]
    .filter((l) => l.max > 0)
    .sort((a, b) => b.mean - a.mean || slugs.indexOf(a.slug) - slugs.indexOf(b.slug));
  const shown = rows.slice(0, top);
  const barMax = Math.max(30, ...rows.map((l) => l.max));
  const num = (n: number) => n.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const outlets = [...new Set(avg.inputs.map((p) => partyText(p.outlet, locale)))];

  return (
    <div className="space-y-2">
      <SectionHeading
        variant="md"
        aside={
          <Link href="/elections#polls" className="text-sm text-accent-ink underline">
            {t("homeCta")} {arrow}
          </Link>
        }
      >
        {t("homeTitle")}
      </SectionHeading>
      <p className="text-xs text-muted">
        {t("homeMethod", { n: avg.institutes, from: formatDate(avg.from, locale), to: formatDate(avg.to, locale) })}
      </p>
      <ol className="space-y-1.5 text-sm">
        {shown.map((l) => {
          const list = registry.get(l.slug);
          const color = (list?.factionId != null && factionColor.get(list.factionId)) || list?.color || "var(--neutral)";
          return (
            <li key={l.slug} className="grid grid-cols-[minmax(6rem,9rem)_2.5rem_minmax(4rem,1fr)] items-center gap-x-2">
              <span className="truncate" {...partyTextAttrs(list?.name, locale)}>
                {partyText(list?.name, locale) || l.slug}
              </span>
              <span className="text-end font-semibold tabular-nums">{num(l.mean)}</span>
              <span className="block h-2 overflow-hidden rounded-full bg-surface-sunken">
                <span className="block h-full rounded-full" style={{ width: `${Math.min(100, (l.mean / barMax) * 100)}%`, backgroundColor: color }} />
              </span>
            </li>
          );
        })}
      </ol>
      {rows.length > shown.length && (
        <p className="text-xs text-muted">
          <Link href="/elections#polls" className="underline">
            {t("more", { n: rows.length - shown.length })}
          </Link>
        </p>
      )}
      <p className="text-xs text-muted">
        {tc("source")}: {outlets.join(" · ")}
      </p>
    </div>
  );
}
