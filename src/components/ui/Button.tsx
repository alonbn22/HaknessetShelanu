import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

// The six accent CTA treatments in the codebase, reduced to three explicit
// variants. Every entry is a full static class string — `bg-${variant}`
// compiles to nothing under Tailwind v4, and nothing would warn.
// (hover:bg-accent-deep rides the legacy alias until Stage D, where it becomes
// a proper --accent-hover token.)
const VARIANT = {
  primary: "bg-accent text-on-accent hover:bg-accent-deep",
  secondary: "border border-accent-line text-accent-ink hover:bg-accent-soft",
  ghost: "text-foreground hover:bg-surface-sunken",
} as const;

const SIZE = {
  sm: "px-3 py-1.5 text-sm font-medium",
  md: "px-4 py-2 font-semibold",
  lg: "px-5 py-2.5 font-semibold",
} as const;

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-control transition-colors disabled:pointer-events-none disabled:opacity-40";

export type ButtonVariant = keyof typeof VARIANT;
export type ButtonSize = keyof typeof SIZE;

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string): string {
  return cx(BASE, VARIANT[variant], SIZE[size], className);
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  children,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}
