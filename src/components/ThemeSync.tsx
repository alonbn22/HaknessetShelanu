"use client";

import { useLayoutEffect } from "react";
import { applyStoredTheme } from "@/lib/theme-script";

// The `[locale]` layout owns <html>. Switching language remounts that layout,
// and React re-creates the <html> singleton's attributes from props — which
// drops the `dark` class the pre-paint script (or the toggle) had put there,
// so dark mode silently turned light on every language change. This mounts
// with the layout and re-applies the saved theme before the next paint.
export function ThemeSync() {
  useLayoutEffect(() => {
    applyStoredTheme();
  }, []);
  return null;
}
