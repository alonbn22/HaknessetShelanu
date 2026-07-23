import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MemberCard } from "@/components/MemberCard";
import { SpectrumBar } from "@/components/SpectrumBar";
import { FeedbackActions } from "@/components/FeedbackActions";
import { PartyEmblem } from "@/components/PartyEmblem";
import {
  isCoalitionFaction,
  getPartyProfile,
  getElectionOutlook,
  partyText,
  partyList,
} from "@/lib/content";
import {
  getFaction,
  getCurrentMembers,
  getFactionAvgParticipation,
  factionName,
  factionColor,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

// getFaction is cache()-wrapped, so metadata + page body share one lookup.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const factionId = parseInt(id, 10);
  const faction = Number.isNaN(factionId) ? undefined : getFaction(factionId);
  if (!faction) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const name = factionName(faction.id, faction.nameHe, locale);
  const description = t("party", { name });
  return { title: name, description, openGraph: { title: name, description } };
}

export default async function PartyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const factionId = parseInt(id, 10);
  const faction = Number.isNaN(factionId) ? undefined : getFaction(factionId);
  if (!faction) notFound();

  const t = await getTranslations();
  const locale = await getLocale();
  const members = getCurrentMembers({ factionId });
  const avgParticipation = getFactionAvgParticipation(factionId);
  const isCoalition = isCoalitionFaction(factionId);
  const profile = getPartyProfile(factionId);
  const positions = partyList(profile?.positions, locale);
  // Link the leader to their member page, but only when the election outlook holds
  // a *verified* leaderPersonId for this faction whose Hebrew name matches the
  // profile's — so a leadership change never points us at the wrong person.
  const electionParty = getElectionOutlook()?.parties.find((p) => p.factionId === factionId);
  const leaderPersonId =
    electionParty?.leaderPersonId != null &&
    electionParty.leader?.he?.trim() === profile?.leaderHe?.trim()
      ? electionParty.leaderPersonId
      : null;

  return (
    <div className="space-y-6">
      <section
        className="rounded-xl bg-white p-6 shadow-sm border-s-4 space-y-2"
        style={{ borderInlineStartColor: factionColor(factionId) }}
      >
        <div className="flex flex-wrap items-center gap-4">
          <PartyEmblem
            factionId={factionId}
            nameHe={faction.nameHe}
            color={factionColor(factionId)}
            size={72}
            alt={factionName(factionId, faction.nameHe, locale)}
          />
          <h1 className="text-3xl font-bold">
            {factionName(factionId, faction.nameHe, locale)}
          </h1>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium text-white ${
              isCoalition ? "bg-coalition" : "bg-opposition"
            }`}
          >
            {isCoalition ? t("common.coalition") : t("common.opposition")}
          </span>
        </div>
        {locale !== "he" && (
          <div className="text-muted" dir="rtl" lang="he">
            {faction.nameHe}
          </div>
        )}
        {profile?.ballotLetters && (
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <span className="text-sm font-medium text-muted">{t("party.ballot")}:</span>
            <span
              className="inline-flex items-center justify-center rounded-md border-2 border-foreground bg-white px-3 py-1 text-2xl font-black tracking-widest text-foreground"
              dir="rtl"
              lang="he"
              aria-label={`${t("party.ballot")}: ${profile.ballotLetters}`}
            >
              {profile.ballotLetters}
            </span>
            <span className="text-xs text-muted">
              {partyText(profile.ballotNote, locale)
                ? `${partyText(profile.ballotNote, locale)} `
                : ""}
              {t("party.ballotEra")}
            </span>
          </div>
        )}
        <div className="flex flex-wrap gap-6 pt-2">
          <div>
            <div className="text-2xl font-bold text-accent">{members.length}</div>
            <div className="text-sm text-muted">{t("parties.seats")}</div>
          </div>
          {avgParticipation != null && (
            <div>
              <div className="text-2xl font-bold text-accent">{avgParticipation}%</div>
              <div className="text-sm text-muted">{t("party.avgParticipation")}</div>
            </div>
          )}
          {profile?.leaderHe && (
            <div>
              <div className="text-2xl font-bold text-accent">
                {leaderPersonId != null ? (
                  <Link href={`/members/${leaderPersonId}`} className="hover:underline">
                    {locale === "he" ? profile.leaderHe : profile.leaderEn ?? profile.leaderHe}
                  </Link>
                ) : locale === "he" ? (
                  profile.leaderHe
                ) : (
                  profile.leaderEn ?? profile.leaderHe
                )}
              </div>
              <div className="text-sm text-muted">{t("party.leader")}</div>
            </div>
          )}
          {profile?.founded && (
            <div>
              <div className="text-2xl font-bold text-accent">{profile.founded}</div>
              <div className="text-sm text-muted">{t("party.founded")}</div>
            </div>
          )}
        </div>
      </section>

      {profile && (
        <section className="rounded-xl bg-white p-6 shadow-sm space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{t("party.about")}</h2>
              <span className="text-sm text-muted">{t("party.spectrum")}</span>
            </div>
            <SpectrumBar spectrum={profile.spectrum} />
            <p className="leading-relaxed">{partyText(profile.summary, locale)}</p>
            {profile.tags && profile.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {profile.tags.map((tag) => {
                  // Tags are data-driven, so the key is dynamic — guard with
                  // t.has and fall back to the raw tag.
                  const key = `partyTags.${tag}` as Parameters<typeof t>[0];
                  return (
                    <span
                      key={tag}
                      className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent"
                    >
                      {t.has(key) ? t(key) : tag}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {positions.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">{t("party.positions")}</h3>
              <ul className="list-disc space-y-1 ps-5 text-sm leading-relaxed">
                {positions.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {/* The spectrum, tags and positions are editorial; cite what they draw on. */}
          {(profile.wikipediaEn || profile.website) && (
            <p className="text-xs text-muted">
              {t("party.basedOn")}{" "}
              {profile.wikipediaEn && (
                <a
                  className="underline hover:text-accent"
                  href={profile.wikipediaEn}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("member.wikipedia")}
                </a>
              )}
              {profile.wikipediaEn && profile.website && " · "}
              {profile.website && (
                <a
                  className="underline hover:text-accent"
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("party.officialSite")}
                </a>
              )}
            </p>
          )}

          <div className="flex flex-wrap gap-4 text-sm pt-1">
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {t("party.officialSite")}
              </a>
            )}
            {profile.wikipediaEn && (
              <a
                href={profile.wikipediaEn}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {t("member.wikipedia")}
              </a>
            )}
          </div>
          <p className="text-xs text-muted">{t("party.editorialNote")}</p>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">{t("party.membersTitle")}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <MemberCard key={m.id} member={m} locale={locale} />
          ))}
        </div>
      </section>

      <div className="pt-2">
        <FeedbackActions
          context={factionName(factionId, faction.nameHe, locale)}
          subject="party"
        />
      </div>
    </div>
  );
}
