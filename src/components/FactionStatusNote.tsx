import { getLocale, getTranslations } from "next-intl/server";
import { getFactionStatus, partyText, partyTextAttrs } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { SourceLinks } from "@/components/SourceLinks";

// The sourced story behind a faction's coalition/opposition label: "outside
// the coalition since 14 July 2025", the one-line why, and the reports it
// rests on. Renders nothing for factions whose side never changed and that
// carry no note — the bare label says it all there.
export async function FactionStatusNote({ factionId }: { factionId: number }) {
  const st = getFactionStatus(factionId);
  if (!st) return null;
  if (!st.changedMidTerm && !st.note) return null;
  const t = await getTranslations("common");
  const locale = await getLocale();
  const note = partyText(st.note, locale);
  return (
    <div className="space-y-0.5 text-sm">
      {st.changedMidTerm && (
        <div className="font-medium">
          {t(st.status === "coalition" ? "coalitionSince" : "oppositionSince", {
            date: formatDate(st.since, locale),
          })}
        </div>
      )}
      {note && (
        <p className="text-muted leading-relaxed" {...partyTextAttrs(st.note, locale)}>
          {note}
        </p>
      )}
      {st.sources && st.sources.length > 0 && (
        <div>
          <SourceLinks sources={st.sources} label={t("source")} />
        </div>
      )}
    </div>
  );
}
