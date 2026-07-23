// Pre-paint theme snippet: applies saved/OS dark mode before first paint (no
// light-flash). Inline script, so it needs the CSP nonce — the React tree must
// ALSO declare that nonce (from the x-nonce header) or hydration warns of a
// mismatch. The layout passes `nonce={...}` for that reason.
export const THEME_SCRIPT =
  "(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();";
