import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

// Collapses the six h2 treatments in the codebase to two sizes and an eyebrow.
// The eyebrow gets its prominence from size, weight and --muted — not from
// uppercase or letter-spacing: uppercase is a no-op in Hebrew and Arabic, and
// letter-spacing breaks Arabic cursive joining.
const VARIANT = {
  lg: "text-xl font-semibold",
  md: "text-lg font-semibold",
  eyebrow: "text-sm font-semibold text-muted",
} as const;

export function SectionHeading({
  as: Tag = "h2",
  variant = "lg",
  aside,
  className,
  children,
}: {
  as?: "h1" | "h2" | "h3";
  variant?: keyof typeof VARIANT;
  /** Trailing slot on the same line — a "view all" link, a count, a control. */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const heading = <Tag className={cx(VARIANT[variant], !aside && className)}>{children}</Tag>;
  if (!aside) return heading;
  return (
    <div className={cx("flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1", className)}>
      {heading}
      {aside}
    </div>
  );
}
