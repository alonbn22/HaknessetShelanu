"use client";

import { useTranslations } from "next-intl";

// Opens a prefilled email to the corrections address, auto-including the exact
// page URL. No backend required; the user reviews and sends from their client.
export function ReportButton({
  context = "",
  variant = "button",
}: {
  context?: string;
  variant?: "button" | "link";
}) {
  const t = useTranslations("report");

  function report() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const subject = t("subject", { context: context || url });
    const body = t("body", { url });
    window.location.href = `mailto:${t("email")}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  }

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={report}
        aria-label={t("aria")}
        className="text-accent hover:underline"
      >
        {t("button")}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={report}
      aria-label={t("aria")}
      className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm text-black/70 hover:bg-black/5"
    >
      <span aria-hidden>⚠️</span>
      {t("button")}
    </button>
  );
}
