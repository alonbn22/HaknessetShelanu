"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { GITHUB_REPO } from "@/lib/constants";

function issueUrl(
  template: string,
  title: string,
  fields: Record<string, string | undefined>,
): string {
  const u = new URL(`https://github.com/${GITHUB_REPO}/issues/new`);
  u.searchParams.set("template", template);
  if (title) u.searchParams.set("title", title);
  // Field ids must match the issue-form template so GitHub pre-fills them.
  for (const [k, v] of Object.entries(fields)) if (v) u.searchParams.set(k, v);
  return u.toString();
}

type Mode = "report" | "suggest";

// Two buttons; each opens a modal that then opens a pre-filled GitHub issue
// (reviewed before anything is published). No backend.
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
  // The button that opened the modal, so we can return focus to it on close.
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const open = (e: React.MouseEvent<HTMLButtonElement>, m: Mode) => {
    openerRef.current = e.currentTarget;
    setMode(m);
  };
  const close = () => {
    setMode(null);
    openerRef.current?.focus();
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={(e) => open(e, "report")}
          aria-label={t("reportAria", { context: label })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-black/15 bg-white px-3 py-1.5 text-sm text-black/70 hover:bg-black/5"
        >
          <span aria-hidden>⚠️</span>
          {t("reportButton")}
        </button>
        <button
          type="button"
          onClick={(e) => open(e, "suggest")}
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
          onClose={close}
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
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus the first field on open (focus returns to the opener in the parent).
  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  // Escape closes; Tab/Shift+Tab is trapped within the dialog (aria-modal).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const f = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
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
        ref={dialogRef}
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
