"use client";

import { useTranslations } from "next-intl";

// Repo that receives the tickets. Override per-deployment with
// NEXT_PUBLIC_GITHUB_REPO (inlined at build time for this client component).
const REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || "alonbn22/HaKnessetSheli";

function issueUrl(template: string, title: string, fields: Record<string, string>): string {
  const u = new URL(`https://github.com/${REPO}/issues/new`);
  u.searchParams.set("template", template);
  if (title) u.searchParams.set("title", title);
  // Field ids must match the issue-form template so GitHub pre-fills them.
  for (const [k, v] of Object.entries(fields)) if (v) u.searchParams.set(k, v);
  return u.toString();
}

// Two actions — "report incorrect information" and "suggest new information" —
// that open a PRE-FILLED GitHub issue (a ticket). Nothing is written to the site
// or DB: every submission is reviewed before anything is published. No backend
// required, so this works on read-only / serverless hosting.
export function FeedbackActions({
  context = "",
  subject = "",
}: {
  context?: string; // human label (person / party / vote / blank for the whole site)
  subject?: string; // machine tag prefilled into the ticket when there is no context
}) {
  const t = useTranslations("feedback");

  function open(template: string, titlePrefix: string) {
    const page = typeof window !== "undefined" ? window.location.href : "";
    const title = context ? `${titlePrefix} ${context}` : titlePrefix;
    const url = issueUrl(template, title, { page, subject: context || subject });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const label = context || t("theSite");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => open("report-incorrect-information.yml", "[Report]")}
        aria-label={t("reportAria", { context: label })}
        className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm text-black/70 hover:bg-black/5"
      >
        <span aria-hidden>⚠️</span>
        {t("reportButton")}
      </button>
      <button
        type="button"
        onClick={() => open("suggest-new-information.yml", "[Suggestion]")}
        aria-label={t("suggestAria", { context: label })}
        className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm text-black/70 hover:bg-black/5"
      >
        <span aria-hidden>➕</span>
        {t("suggestButton")}
      </button>
      <span className="text-xs text-muted">{t("ticketHint")}</span>
    </div>
  );
}
