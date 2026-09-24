import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

// Wraps a table so wide content scrolls sideways instead of being clipped:
// the budget and attendance tables used overflow-hidden and lost columns at
// narrow widths. The table itself stays the caller's (`w-full text-sm`).
export function TableFrame({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("overflow-x-auto rounded-card border border-line bg-surface", className)}>
      {children}
    </div>
  );
}
