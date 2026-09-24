import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

// Seeded from src/lib/badge.ts (deleted in C2). Thirteen raw Tailwind hues
// collapse to six tones; every ink clears AA on its own soft in all three
// themes (tests/qa/design-tokens.test.ts). Full static strings on purpose —
// `bg-${tone}-soft` compiles to nothing under Tailwind v4, silently.
const TONE = {
  pass: "bg-pass-soft text-pass-ink",
  fail: "bg-fail-soft text-fail-ink",
  warn: "bg-warn-soft text-warn-ink",
  info: "bg-info-soft text-info-ink",
  neutral: "bg-neutral-soft text-neutral-ink",
  accent: "bg-accent-soft text-accent-ink",
} as const;

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof TONE;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cx("inline-block rounded-full px-2 py-0.5 text-xs font-medium", TONE[tone], className)}>
      {children}
    </span>
  );
}
