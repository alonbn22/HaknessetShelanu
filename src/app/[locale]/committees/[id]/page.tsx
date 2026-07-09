import { notFound } from "next/navigation";
import { after } from "next/server";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MemberAvatar } from "@/components/MemberCard";
import {
  getCommittee,
  getCommitteeMembers,
  getCommitteeSessions,
  personName,
  type CommitteeSession,
} from "@/lib/queries";
import { govDuty } from "@/lib/gov-terms";
import {
  localizeData,
  committeeLabel,
  queueDataTranslations,
  resolveLocalized,
} from "@/lib/i18n-data";
import { localizedAttrs } from "@/lib/text";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

// Page title/description/OG for search results and social shares (getCommittee
// is cache()-wrapped; the name resolves via the shared committee-label helper).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const committeeId = parseInt(id, 10);
  const committee = Number.isNaN(committeeId) ? undefined : getCommittee(committeeId);
  if (!committee) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const name = committeeLabel(committee.nameHe, locale, localizeData([committee.nameHe], locale)).text;
  const description = t("committee", { name });
  return { title: name, description, openGraph: { title: name, description } };
}

export default async function CommitteePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const committeeId = parseInt(id, 10);
  const committee = Number.isNaN(committeeId) ? undefined : getCommittee(committeeId);
  if (!committee) notFound();

  const t = await getTranslations();
  const locale = await getLocale();
  const members = getCommitteeMembers(committeeId);
  const sessions = getCommitteeSessions(committeeId, new Date().toISOString());

  // Localize the committee name + every session's Hebrew location/type on the fly.
  const heStrings = [
    committee.nameHe,
    ...[...sessions.upcoming, ...sessions.recent].flatMap((s) => [s.location, s.typeDesc]),
  ];
  const cache = localizeData(heStrings, locale);
  if (locale !== "he") after(() => queueDataTranslations(heStrings, locale));
  const loc = (he: string | null) => resolveLocalized(cache, he);

  const sessionList = (list: CommitteeSession[]) => (
    <ul className="divide-y divide-black/5 rounded-xl bg-white shadow-sm">
      {list.map((s) => {
        const type = loc(s.typeDesc);
        const place = loc(s.location);
        return (
          <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
            <span className="whitespace-nowrap font-medium tabular-nums">
              {formatDateTime(s.startDate!, locale)}
            </span>
            {type.text && (
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs text-muted" {...localizedAttrs(type)}>
                {type.text}
              </span>
            )}
            {place.text && (
              <span className="min-w-0 flex-1 truncate text-muted" {...localizedAttrs(place)}>
                {place.text}
              </span>
            )}
            <span className="ms-auto flex gap-3">
              {s.broadcastUrl && (
                <a
                  href={s.broadcastUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-nowrap text-accent hover:underline"
                >
                  {t("committees.broadcast")}
                </a>
              )}
              {s.sessionUrl && (
                <a
                  href={s.sessionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-nowrap text-accent hover:underline"
                >
                  {t("committees.agenda")}
                </a>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-6 shadow-sm space-y-1">
        {(() => {
          const name = committeeLabel(committee.nameHe, locale, cache);
          return (
            <h1
              className="text-3xl font-bold"
              dir={name.rtl ? "rtl" : undefined}
              lang={name.rtl ? "he" : undefined}
            >
              {name.text}
            </h1>
          );
        })()}
        {committee.email && (
          <a className="text-sm text-accent hover:underline" href={`mailto:${committee.email}`}>
            {committee.email}
          </a>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t("committees.members")}</h2>
        {members.length === 0 ? (
          <p className="text-muted">{t("committees.noMembers")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map(({ person, roleHe }) => (
              <Link
                key={person.id}
                href={`/members/${person.id}`}
                className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <MemberAvatar person={person} />
                <div className="min-w-0">
                  <div className="font-semibold truncate">{personName(person, locale)}</div>
                  {roleHe &&
                    (() => {
                      const r = govDuty(roleHe, locale);
                      return (
                        <div
                          className="text-sm text-muted truncate"
                          dir={r.rtl ? "rtl" : undefined}
                          lang={r.rtl ? "he" : undefined}
                        >
                          {r.text}
                        </div>
                      );
                    })()}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {(sessions.upcoming.length > 0 || sessions.recent.length > 0) && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            {t("committees.meetings")}
            {sessions.total > 0 && (
              <span className="ms-2 text-sm font-normal text-muted">
                {t("committees.meetingCount", { count: sessions.total })}
              </span>
            )}
          </h2>
          {sessions.upcoming.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted">{t("committees.upcoming")}</h3>
              {sessionList(sessions.upcoming)}
            </div>
          )}
          {sessions.recent.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted">{t("committees.recent")}</h3>
              {sessionList(sessions.recent)}
            </div>
          )}
          <p className="text-xs text-muted">{t("committees.meetingsNote")}</p>
        </section>
      )}
    </div>
  );
}
