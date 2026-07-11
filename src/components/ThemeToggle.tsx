"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

// Subscribe to html.dark itself (via a MutationObserver) so aria-pressed always
// reflects the real theme — including the pre-paint script's result and any change
// from elsewhere — with no setState-in-effect. getServerSnapshot returns false on
// the server; React reconciles the real value on hydration without a mismatch.
function subscribeTheme(onChange: () => void) {
  const obs = new MutationObserver(onChange);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}
const isDarkNow = () => document.documentElement.classList.contains("dark");

// Flips html.dark and persists the choice. The pre-paint script in the layout
// applies the saved/OS theme before first paint; this only toggles it. The icon
// swaps via the `dark:` CSS variant (both icons are in the DOM, one hidden), so
// there is no server/client hydration mismatch.
export function ThemeToggle() {
  const t = useTranslations("theme");
  const isDark = useSyncExternalStore(subscribeTheme, isDarkNow, () => false);

  const toggle = () => {
    const next = document.documentElement.classList.toggle("dark");
    // The MutationObserver above re-renders with the new state.
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* storage unavailable — the class still flips for this session */
    }
  };

  const label = isDark ? t("switchToLight") : t("switchToDark");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      aria-label={label}
      title={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10"
    >
      {/* Moon in light mode (→ dark); sun in dark mode (→ light). */}
      <svg
        className="dark:hidden"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      <svg
        className="hidden dark:inline"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
