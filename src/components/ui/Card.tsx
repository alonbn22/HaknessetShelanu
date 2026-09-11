import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

// A card is separated from the page by the --line hairline, not by a shadow:
// deepening the canvas moved separation only 1.07:1 → 1.10:1, so the border is
// the thing that actually works. Elevation is reserved for things that float.
const PADDING = {
  md: "p-6",
  sm: "p-4",
  none: "",
} as const;

export function Card({
  as: Tag = "div",
  padding = "md",
  className,
  children,
  ...rest
}: {
  as?: "div" | "section" | "article" | "li";
  padding?: keyof typeof PADDING;
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">) {
  return (
    <Tag className={cx("rounded-card border border-line bg-surface", PADDING[padding], className)} {...rest}>
      {children}
    </Tag>
  );
}
