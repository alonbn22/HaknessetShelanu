"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

// Repo that receives the tickets. Override per-deployment with
// NEXT_PUBLIC_GITHUB_REPO (inlined at build time for this client component).
const REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || "alonbn22/HaKnessetSheli";

function issueUrl(
  template: string,
  title: string,
  fields: Record<string, string | undefined>,
): string {
  const u = new URL(`https://github.com/${REPO}/issues/new`);
  u.searchParams.set("template", template);
  if (title) u.searchParams.set("title", title);
  // Field ids must match the issue-form template so GitHub pre-fills them.
  for (const [k, v] of Object.entries(fields)) if (v) u.searchParams.set(k, v);
  return u.toString();
}

type Mode = "report" | "suggest";

// "Report incorrect information" / "Suggest new information". Each opens an
// in-page modal (a popup) that collects the details and then opens a PRE-FILLED
// GitHub issue (a ticket reviewed before anything is published). No backend.
export function FeedbackActions({
  context = "",
  subject = "",
}: {
  context?: string;
  subject?: string;
}) {
  const t = useTranslations("feedback");
  const [mode, setMode] = useState<Mode | null>(null);
  const label = context || t("theSite");

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMode("report")}
          aria-label={t("reportAria", { context: label })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm text-black/70 hover:bg-black/5"
        >
          <span aria-hidden>⚠️</span>
          {t("reportButton")}
        </button>
        <button
          type="button"
          onClick={() => setMode("suggest")}
          aria-label={t("suggestAria", { context: label })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm text-black/70 hover:bg-black/5"
        >
          <span aria-hidden>➕</span>
          {t("suggestButton")}
        </button>
        <span className="text-xs text-muted">{t("ticketHint")}</span>
      </div>
      {mode && (
        <FeedbackModal
          mode={mode}
          context={context}
          subject={subject}
          onClose={() => setMode(null)}
        />
      )}
    </>
  );
}

function FeedbackModal({
  mode,
  context,
  subject,
  onClose,
}: {
  mode: Mode;
  context: string;
  subject: string;
  onClose: () => void;
}) {
  const t = useTranslations("feedback");
  const [main, setMain] = useState("");
  const [correct, setCorrect] = useState("");
  const [source, setSource] = useState("");
  const firstRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => firstRef.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const page = typeof window !== "undefined" ? window.location.href : "";
    const template =
      mode === "report" ? "report-incorrect-information.yml" : "suggest-new-information.yml";
    const prefix = mode === "report" ? "[Report]" : "[Suggestion]";
    const title = context ? `${prefix} ${context}` : prefix;
    const fields =
      mode === "report"
        ? { page, subject: context || subject, incorrect: main, correct, source }
        : { page, subject: context || subject, info: main, source };
    window.open(issueUrl(template, title, fields), "_blank", "noopener,noreferrer");
    onClose();
  }

  const label = context || t("theSite");
  const title = mode === "report" ? t("modalReportTitle") : t("modalSuggestTitle");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fb-title"
        className="relative z-10 w-full max-w-md space-y-3 rounded-xl bg-white p-5 text-start shadow-xl"
      >
        <h2 id="fb-title" className="text-lg font-semibold">
          {title} — {label}
        </h2>
        <p className="text-xs text-muted">{t("modalNote")}</p>
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">
              {mode === "report" ? t("fieldIncorrect") : t("fieldInfo")}
            </span>
            <textarea
              ref={firstRef}
              value={main}
              onChange={(e) => setMain(e.target.value)}
              required
              rows={3}
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
            />
          </label>
          {mode === "report" && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium">{t("fieldCorrect")}</span>
              <textarea
                value={correct}
                onChange={(e) => setCorrect(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
              />
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{t("fieldSource")}</span>
            <input
              type="url"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              required
              placeholder="https://…"
              className="w-full rounded-lg border border-black/15 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm hover:bg-black/5"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              {t("submit")}
            </button>
          </div>
        </form>
        <p className="text-[11px] text-muted">{t("needGithub")}</p>
      </div>
    </div>
  );
}
