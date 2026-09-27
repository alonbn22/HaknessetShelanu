import { getTranslations } from "next-intl/server";
import { pollBlackout } from "@/lib/polls";

// The legal notice for the poll blackout (see BLACKOUT in src/lib/polls.ts):
// prominent, on every surface that shows poll figures, only while it lasts.
export async function PollBlackoutNotice() {
  if (!pollBlackout()) return null;
  const t = await getTranslations("polls");
  return (
    <div role="note" className="space-y-1 rounded-lg border border-warn-line border-s-4 bg-warn-soft p-4 text-sm text-warn-ink">
      <p className="font-semibold">{t("blackoutTitle")}</p>
      <p className="leading-relaxed">{t("blackoutText")}</p>
    </div>
  );
}
