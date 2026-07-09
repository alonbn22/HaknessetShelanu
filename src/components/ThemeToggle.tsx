"use client";

import { useTranslations } from "next-intl";

// Flips html.dark and persists the choice. The pre-paint script in the layout
// applies the saved/OS theme before first paint; this only toggles it. The icon
// swaps via the `dark:` CSS variant (both icons are in the DOM, one hidden), so
// there is no server/client hydration mismatch.
export function ThemeToggle() {
  const t = useTranslations("theme");

  const toggle = () => {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {
      /* storage unavailable — the class still flips for this session */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("toggle")}
      title={t("toggle")}
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
