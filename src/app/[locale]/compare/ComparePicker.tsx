"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

export type CompareOption = { id: number; name: string; faction: string };

// Two member selectors; changing either navigates to /compare?a=&b=. The server
// component re-renders the comparison from the URL.
export function ComparePicker({
  members,
  a,
  b,
}: {
  members: CompareOption[];
  a: number | null;
  b: number | null;
}) {
  const t = useTranslations("compare");
  const router = useRouter();

  const go = (na: number | null, nb: number | null) => {
    const sp = new URLSearchParams();
    if (na) sp.set("a", String(na));
    if (nb) sp.set("b", String(nb));
    const qs = sp.toString();
    router.push(qs ? `/compare?${qs}` : "/compare");
  };

  const renderSelect = (
    value: number | null,
    onPick: (v: number | null) => void,
    exclude: number | null,
    label: string,
  ) => (
    <select
      aria-label={label}
      value={value ?? ""}
      onChange={(e) => onPick(e.target.value ? Number(e.target.value) : null)}
      className="min-w-0 flex-1 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm shadow-sm"
    >
      <option value="">{t("selectMember")}</option>
      {members
        .filter((m) => m.id !== exclude)
        .map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
            {m.faction ? ` · ${m.faction}` : ""}
          </option>
        ))}
    </select>
  );

  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
      {renderSelect(a, (v) => go(v, b), b, t("memberA"))}
      <span className="self-center text-sm font-bold text-muted">{t("vs")}</span>
      {renderSelect(b, (v) => go(a, v), a, t("memberB"))}
    </div>
  );
}
