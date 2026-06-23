"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MemberAvatar } from "@/components/MemberAvatar";
import type { Person } from "@/lib/queries";

export type AttendanceListRow = {
  id: number;
  name: string;
  faction: string;
  participationPct: number;
  missed: number;
  votesHeld: number;
  person: Person;
};

export function AttendanceList({
  rows,
  locale,
}: {
  rows: AttendanceListRow[];
  locale: string;
}) {
  const t = useTranslations();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.faction.toLowerCase().includes(query),
    );
  }, [q, rows]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("attendance.searchPlaceholder")}
          aria-label={t("attendance.searchPlaceholder")}
          className="w-full max-w-sm rounded-lg border border-black/15 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-accent"
        />
        <p className="text-sm text-muted">
          {t("attendance.count", { count: filtered.length })}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted">{t("votes.noResults")}</p>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-start text-muted">
                <th className="w-10 px-3 py-2 text-center">#</th>
                <th className="px-3 py-2 text-start">{t("members.title")}</th>
                <th className="px-3 py-2 text-start hidden sm:table-cell">
                  {t("parties.title")}
                </th>
                <th className="px-3 py-2 text-end">{t("home.participation")}</th>
                <th className="px-3 py-2 text-end whitespace-nowrap">
                  {t("attendance.totalVotesCol")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id} className="border-b border-black/5 last:border-0">
                  <td className="px-3 py-2 text-center text-muted tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/members/${r.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <MemberAvatar person={r.person} size={28} />
                      <span className="truncate">{r.name}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2 hidden sm:table-cell text-muted truncate">
                    {r.faction}
                  </td>
                  <td className="px-3 py-2 text-end font-semibold text-accent">
                    {r.participationPct}%
                  </td>
                  <td className="px-3 py-2 text-end text-muted whitespace-nowrap tabular-nums">
                    {t("attendance.missedOfTotal", {
                      missed: r.missed.toLocaleString(locale),
                      total: r.votesHeld.toLocaleString(locale),
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
