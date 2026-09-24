// Pre-paint theme snippet: applies saved/OS dark mode before first paint (no
// light-flash). Inline script, so it needs the CSP nonce — the React tree must
// ALSO declare that nonce (from the x-nonce header) or hydration warns of a
// mismatch. The layout passes `nonce={...}` for that reason.
//
// The same rule lives in applyStoredTheme() below for client-side re-application
// (see ThemeSync). Keep the two in step.
export const THEME_SCRIPT =
  "(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();";

// Same decision as THEME_SCRIPT, callable after hydration: saved choice first,
// then the OS preference.
export function applyStoredTheme() {
  try {
    const t = localStorage.getItem("theme");
    const dark = t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  } catch {
    /* storage unavailable — leave whatever class is there */
  }
}
