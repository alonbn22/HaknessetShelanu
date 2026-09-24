import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

// A headline figure with its label. tabular-nums so a row of these doesn't
// jitter; the accent tone is for the one figure a block leads with.
const TONE = {
  default: "text-foreground",
  accent: "text-accent-ink",
} as const;

export function Stat({
  value,
  label,
  tone = "default",
  className,
}: {
  value: ReactNode;
  label: ReactNode;
  tone?: keyof typeof TONE;
  className?: string;
}) {
  return (
    <div className={cx("text-center", className)}>
      <div className={cx("text-3xl font-bold tabular-nums", TONE[tone])}>{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}

const COLUMNS = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-5",
} as const;

export function StatGrid({
  columns = 4,
  className,
  children,
}: {
  columns?: keyof typeof COLUMNS;
  className?: string;
  children: ReactNode;
}) {
  return <div className={cx("grid gap-4", COLUMNS[columns], className)}>{children}</div>;
}
