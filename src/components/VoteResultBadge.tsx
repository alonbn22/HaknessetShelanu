import { useTranslations } from "next-intl";
import { BADGE_BASE, BADGE_PASS, BADGE_FAIL } from "@/lib/badge";

const styles: Record<number, string> = {
  1: BADGE_PASS,
  2: BADGE_FAIL,
  3: "bg-yellow-100 text-yellow-800",
  4: "bg-gray-100 text-gray-600",
  0: "bg-gray-100 text-gray-400 line-through",
};

export function VoteResultBadge({ code }: { code: number }) {
  const t = useTranslations("voteResult");
  return (
    <span className={`${BADGE_BASE} ${styles[code] ?? styles[0]}`}>
      {t(`r${code}` as "r0" | "r1" | "r2" | "r3" | "r4")}
    </span>
  );
}
