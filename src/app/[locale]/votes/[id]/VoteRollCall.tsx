"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MemberAvatar } from "@/components/MemberAvatar";
import { VoteResultBadge } from "@/components/VoteResultBadge";
import {
  VOTE_FOR,
  VOTE_AGAINST,
  VOTE_ABSTAIN,
  VOTE_DID_NOT_VOTE,
} from "@/lib/constants";

export type Voter = {
  id: number;
  name: string;
  nameRtl: boolean;
  firstNameHe: string;
  lastNameHe: string;
  photoUrl: string | null;
  resultCode: number;
  factionId: number | null;
  factionLabel: string;
  factionLabelRtl: boolean;
  factionColor: string;
};

const TILES = [
  { code: VOTE_FOR, key: "for", cls: "text-green-700", active: "ring-green-600 bg-green-50" },
  { code: VOTE_AGAINST, key: "against", cls: "text-red-700", active: "ring-red-600 bg-red-50" },
  { code: VOTE_ABSTAIN, key: "abstain", cls: "text-yellow-700", active: "ring-yellow-600 bg-yellow-50" },
  { code: VOTE_DID_NOT_VOTE, key: "didNotVote", cls: "text-muted", active: "ring-gray-500 bg-black/5" },
] as const;

// `official` is the authoritative plenum tally — it counts every recorded voter
// (incl. former members absent from the per-party breakdown), so the tiles always
// match the Knesset record even when a few voters can't be listed individually.
export function VoteRollCall({
  voters,
  official,
}: {
  voters: Voter[];
  official?: Record<number, number>;
}) {
  const t = useTranslations("votes");
  const [filter, setFilter] = useState<number | null>(null);

  const counts = useMemo(() => {
    const c: Record<number, number> = {
      [VOTE_FOR]: 0,
      [VOTE_AGAINST]: 0,
      [VOTE_ABSTAIN]: 0,
      [VOTE_DID_NOT_VOTE]: 0,
    };
    for (const v of voters) if (v.resultCode in c) c[v.resultCode]++;
    return c;
  }, [voters]);

  // Tile number = the authoritative tally when we have it (For/Against/Abstain);
  // "did not vote" has no header equivalent, so it stays roster-based.
  const tally = (code: number) =>
    code !== VOTE_DID_NOT_VOTE && official?.[code] != null ? official[code] : counts[code];

  // How many recorded voters can't be listed individually (former members).
  const notListed = official
    ? [VOTE_FOR, VOTE_AGAINST, VOTE_ABSTAIN].reduce(
        (sum, code) => sum + Math.max(0, (official[code] ?? 0) - counts[code]),
        0,
      )
    : 0;

  // Filter, then group by faction (faction order by group size).
  const groups = useMemo(() => {
    const shown = filter == null ? voters : voters.filter((v) => v.resultCode === filter);
    const map = new Map<string, { key: string; label: string; rtl: boolean; color: string; rows: Voter[] }>();
    for (const v of shown) {
      const key = String(v.factionId ?? v.factionLabel ?? "?");
      if (!map.has(key))
        map.set(key, {
          key,
          label: v.factionLabel,
          rtl: v.factionLabelRtl,
          color: v.factionColor,
          rows: [],
        });
      map.get(key)!.rows.push(v);
    }
    return [...map.values()].sort((a, b) => b.rows.length - a.rows.length);
  }, [voters, filter]);

  return (
    <div className="space-y-4">
      {/* Clickable count tiles — click to filter the roll-call */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="group" aria-label={t("breakdown")}>
        {TILES.map((tile) => {
          const selected = filter === tile.code;
          return (
            <button
              key={tile.key}
              type="button"
              aria-pressed={selected}
              onClick={() => setFilter(selected ? null : tile.code)}
              className={`rounded-xl bg-white p-3 text-center shadow-sm ring-2 transition-colors hover:bg-black/[.02] ${
                selected ? tile.active : "ring-transparent"
              }`}
            >
              <div className={`text-3xl font-bold ${tile.cls}`}>{tally(tile.code)}</div>
              <div className="text-sm text-muted">{t(tile.key)}</div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted">
        {filter == null ? t("tapToFilter") : t("showingWho", { result: t(TILES.find((x) => x.code === filter)!.key) })}
      </p>
      {notListed > 0 && (
        <p className="text-xs text-muted">{t("notInRollCall", { n: notListed })}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <div
            key={g.key}
            className="rounded-xl bg-white p-4 shadow-sm border-s-4"
            style={{ borderInlineStartColor: g.color }}
          >
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3
                className="font-semibold"
                dir={g.rtl ? "rtl" : undefined}
                lang={g.rtl ? "he" : undefined}
              >
                {g.label}
              </h3>
              <span className="text-xs text-muted">{g.rows.length}</span>
            </div>
            <ul className="space-y-1">
              {g.rows
                .slice()
                .sort((a, b) => a.resultCode - b.resultCode)
                .map((v) => (
                  <li key={v.id} className="flex items-center gap-2 text-sm">
                    <MemberAvatar person={v} name={v.name} size={28} />
                    <Link
                      href={`/members/${v.id}`}
                      className="flex-1 truncate hover:underline"
                      dir={v.nameRtl ? "rtl" : undefined}
                      lang={v.nameRtl ? "he" : undefined}
                    >
                      {v.name}
                    </Link>
                    <VoteResultBadge code={v.resultCode} />
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
