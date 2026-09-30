import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";

// Tone tokens, not raw hues: "did not vote" was gray-600 on a gray-100 that
// the dark retrofit repainted, 1.68:1 in dark mode.
const tones: Record<number, "pass" | "fail" | "warn" | "neutral"> = { 1: "pass", 2: "fail", 3: "warn", 4: "neutral" };

export function VoteResultBadge({ code }: { code: number }) {
  const t = useTranslations("voteResult");
  return (
    <Badge tone={tones[code] ?? "neutral"} className={tones[code] ? undefined : "line-through"}>
      {t(`r${code}` as "r0" | "r1" | "r2" | "r3" | "r4")}
    </Badge>
  );
}
