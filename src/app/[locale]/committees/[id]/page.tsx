import { notFound } from "next/navigation";
import { after } from "next/server";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MemberAvatar } from "@/components/MemberCard";
import { getCommittee, getCommitteeMembers, personName } from "@/lib/queries";
import { govDuty } from "@/lib/gov-terms";
import { localizeData, committeeLabel, queueDataTranslations } from "@/lib/i18n-data";

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
  const cache = localizeData([committee.nameHe], locale);
  if (locale !== "he") after(() => queueDataTranslations([committee.nameHe], locale));

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
    </div>
  );
}
