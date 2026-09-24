import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

// Six pages currently render nothing at all when a list is empty; ten more
// render a bare paragraph. This is the one shape both become.
export function EmptyState({
  title,
  action,
  className,
  children,
}: {
  title: ReactNode;
  /** An optional way out — a link to widen the filter, a search, a home link. */
  action?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cx("rounded-card border border-dashed border-line px-6 py-10 text-center", className)}>
      <p className="font-medium">{title}</p>
      {children && <p className="mt-1 text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
