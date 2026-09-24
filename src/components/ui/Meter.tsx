import { cx } from "@/lib/cx";

// A proportion with its track. Six bars in the codebase set an inline width and
// nothing else; this one carries the ARIA the others lack. (The "no filled
// tracks" rule from the marketing-page skills was declined: the track is what
// makes the proportion readable.)
const FILL = {
  accent: "bg-accent",
  pass: "bg-pass",
  fail: "bg-fail",
  warn: "bg-warn",
  neutral: "bg-neutral",
  coalition: "bg-coalition",
  opposition: "bg-opposition",
} as const;

export function Meter({
  value,
  max = 100,
  label,
  tone = "accent",
  className,
}: {
  value: number;
  max?: number;
  /** Accessible name — what this proportion measures. */
  label: string;
  tone?: keyof typeof FILL;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cx("h-2 w-full overflow-hidden rounded-full bg-surface-sunken", className)}
    >
      <div className={cx("h-full rounded-full", FILL[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}
