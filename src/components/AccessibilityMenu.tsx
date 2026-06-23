"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

type Settings = {
  font: number; // 0-4
  keyboard: boolean;
  noMotion: boolean;
  contrast: boolean;
  grayscale: boolean;
  readable: boolean;
  headings: boolean;
  links: boolean;
};

const DEFAULTS: Settings = {
  font: 0,
  keyboard: false,
  noMotion: false,
  contrast: false,
  grayscale: false,
  readable: false,
  headings: false,
  links: false,
};

const STORAGE_KEY = "a11y-settings";

// A single switch row: label + icon + ARIA switch. Module-scope so it isn't
// re-created on every render of the menu.
function SwitchRow({
  label,
  icon,
  checked,
  onToggle,
}: {
  label: string;
  icon: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-start hover:bg-black/5 focus-visible:bg-black/5"
    >
      <span
        aria-hidden
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-black/25"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5 rtl:-translate-x-0.5"
          }`}
        />
      </span>
      <span className="flex-1">{label}</span>
      <span aria-hidden className="text-lg text-muted">
        {icon}
      </span>
    </button>
  );
}

function apply(s: Settings) {
  const el = document.documentElement;
  // Unlimited text scaling: each step is +10%, floored at 70%. The inline
  // font-size on <html> scales the whole rem-based layout.
  el.style.fontSize = s.font ? `${100 + s.font * 10}%` : "";
  el.classList.toggle("a11y-keyboard", s.keyboard);
  el.classList.toggle("a11y-no-motion", s.noMotion);
  el.classList.toggle("a11y-contrast", s.contrast);
  el.classList.toggle("a11y-grayscale", s.grayscale);
  el.classList.toggle("a11y-readable", s.readable);
  el.classList.toggle("a11y-headings", s.headings);
  el.classList.toggle("a11y-links", s.links);
}

export function AccessibilityMenu() {
  const t = useTranslations("a11y");
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Load persisted settings on mount (client-only, after hydration).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = { ...DEFAULTS, ...JSON.parse(raw) } as Settings;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSettings(parsed);
        apply(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      apply(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Text size: step by ±1 from the latest value (functional update, so rapid
  // or held clicks accumulate). No upper limit; floored at -3 (70%).
  const bumpFont = useCallback((delta: number) => {
    setSettings((prev) => {
      const next = { ...prev, font: Math.max(-3, prev.font + delta) };
      apply(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULTS);
    apply(DEFAULTS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  function close() {
    setOpen(false);
    triggerRef.current?.focus(); // return focus to the trigger
  }

  // When open: focus the first control, trap Tab within the dialog, Escape closes.
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const focusables = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button, a[href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
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
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="a11y-dialog"
        aria-label={t("openMenu")}
        className="fixed bottom-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg hover:scale-105 transition-transform focus-visible:outline-offset-4"
        style={{ insetInlineStart: "1rem" }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="3.6" r="1.9" />
          <path d="M12 6.2c-3.1 0-5.6.6-6.2.8a1 1 0 0 0 .5 1.9c.1 0 2-.5 4-.7v2.3l-2 6.5a1.05 1.05 0 0 0 2 .6l1.7-5.4 1.7 5.4a1.05 1.05 0 0 0 2-.6l-2-6.5V8.2c2 .2 3.9.7 4 .7a1 1 0 0 0 .5-1.9c-.6-.2-3.1-.8-6.2-.8Z" />
        </svg>
      </button>

      {open && (
        <div
          ref={dialogRef}
          id="a11y-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="a11y-dialog-title"
          className="fixed bottom-20 z-50 w-80 overflow-hidden rounded-xl bg-white shadow-2xl border border-black/10"
          style={{ insetInlineStart: "1rem" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-accent px-4 py-3 text-white">
            <button
              type="button"
              onClick={close}
              aria-label={t("close")}
              className="flex h-9 w-9 items-center justify-center rounded text-2xl leading-none hover:bg-white/15"
            >
              ×
            </button>
            <h2 id="a11y-dialog-title" className="text-lg font-bold">
              {t("title")}
            </h2>
          </div>

          {/* Toggle rows */}
          <div className="divide-y divide-black/5 max-h-[60vh] overflow-y-auto">
            <SwitchRow
              label={t("keyboardNav")}
              icon="⌨"
              checked={settings.keyboard}
              onToggle={() => update({ keyboard: !settings.keyboard })}
            />
            <SwitchRow
              label={t("stopMotion")}
              icon="🚫"
              checked={settings.noMotion}
              onToggle={() => update({ noMotion: !settings.noMotion })}
            />
            <SwitchRow
              label={t("contrast")}
              icon="◐"
              checked={settings.contrast}
              onToggle={() => update({ contrast: !settings.contrast })}
            />
            {/* Text size: +/− stepper, no upper limit (floor at -3 = 70%). */}
            <div className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex-1">{t("textSize")}</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  aria-label={t("decreaseText")}
                  onClick={() => bumpFont(-1)}
                  className="h-8 w-8 rounded-lg border border-black/15 text-lg font-bold hover:bg-black/5"
                >
                  −
                </button>
                <span
                  className="w-12 text-center text-sm tabular-nums text-muted"
                  aria-live="polite"
                >
                  {100 + settings.font * 10}%
                </span>
                <button
                  type="button"
                  aria-label={t("increaseText")}
                  onClick={() => bumpFont(1)}
                  className="h-8 w-8 rounded-lg border border-black/15 text-lg font-bold hover:bg-black/5"
                >
                  +
                </button>
              </div>
              <span aria-hidden className="text-lg text-muted">
                Aa
              </span>
            </div>
            <SwitchRow
              label={t("readableFont")}
              icon="Aa"
              checked={settings.readable}
              onToggle={() => update({ readable: !settings.readable })}
            />
            <SwitchRow
              label={t("highlightHeadings")}
              icon="T"
              checked={settings.headings}
              onToggle={() => update({ headings: !settings.headings })}
            />
            <SwitchRow
              label={t("highlightLinksButtons")}
              icon="🔗"
              checked={settings.links}
              onToggle={() => update({ links: !settings.links })}
            />
            <SwitchRow
              label={t("grayscale")}
              icon="▦"
              checked={settings.grayscale}
              onToggle={() => update({ grayscale: !settings.grayscale })}
            />
          </div>

          {/* Footer */}
          <div className="space-y-2 border-t border-black/10 p-3">
            <button
              type="button"
              onClick={reset}
              className="w-full rounded-lg bg-black/5 px-3 py-2 text-sm hover:bg-black/10"
            >
              {t("reset")}
            </button>
            <Link
              href="/accessibility"
              onClick={close}
              className="block text-center text-sm text-accent hover:underline"
            >
              {t("statementLink")}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
