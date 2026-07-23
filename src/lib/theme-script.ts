// The pre-paint theme snippet: applies the saved/OS dark preference before the
// first paint (no light-flash). It's a hand-written inline script, so it needs a
// CSP nonce to run. Next.js auto-stamps the per-request nonce onto inline scripts
// it emits, but our React tree must ALSO declare that nonce (read from the x-nonce
// header) or the client hydration reconstructs the tag without it and warns about
// a mismatch. The layout passes `nonce={...}` for exactly that reason.
export const THEME_SCRIPT =
  "(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();";
