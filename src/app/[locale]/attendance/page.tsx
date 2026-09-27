import { getTranslations, getLocale } from "next-intl/server";
import { AttendanceList, type AttendanceListRow } from "./AttendanceList";
import { getAttendanceTable, personName, factionName } from "@/lib/queries";
import { isHebrew } from "@/lib/text";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const rows = getAttendanceTable();

  const listRows: AttendanceListRow[] = rows.map((r) => ({
    id: r.personId,
    name: personName(r.person, locale),
    nameRtl: isHebrew(personName(r.person, locale)),
    faction:
      r.factionId != null ? factionName(r.factionId, r.factionNameHe ?? "", locale) : "",
    participationPct: r.participationPct,
    missed: r.missed,
    votesHeld: r.votesHeld,
    person: r.person,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("home.participation")}</h1>
      <p className="text-sm text-muted">{t("attendance.note")}</p>
      {/* This list is serving members only; a former member's own page still shows their figures. */}
      <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm leading-relaxed">
        {t("attendance.servingOnlyNote")}
      </div>

      <AttendanceList rows={listRows} locale={locale} />
    </div>
  );
}
