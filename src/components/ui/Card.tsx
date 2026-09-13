import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

// A card is separated from the page by the --line hairline, not by a shadow:
// deepening the canvas moved separation only 1.07:1 → 1.10:1, so the border is
// the thing that actually works. Elevation is reserved for things that float.
const PADDING = {
  md: "p-6",
  sm: "p-4",
  xs: "p-3",
  none: "",
} as const;

// For elements that are cards but not <Card> — a Link that is the whole card,
// as VoteCard and MemberCard are — mirroring buttonClass / ButtonLink.
export function cardClass(padding: keyof typeof PADDING = "md", className?: string): string {
  return cx("rounded-card border border-line bg-surface", PADDING[padding], className);
}

// A whole-card link: the hover lifts the surface and firms the hairline instead
// of growing a shadow.
export function interactiveCardClass(padding: keyof typeof PADDING = "md", className?: string): string {
  return cardClass(padding, cx("transition-colors hover:border-line-strong hover:bg-surface-hover", className));
}

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
    <Tag className={cardClass(padding, className)} {...rest}>
      {children}
    </Tag>
  );
}
