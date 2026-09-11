import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "@/lib/cx";

// The pill toggle, re-implemented five times in the codebase, in two explicit
// forms: ToggleButton (client state, aria-pressed) and ToggleLink (URL state,
// aria-current — in its own file). Neither holds state; the parent owns it
// either way, so a server component can render a link group with no client
// boundary.
const PILL = "rounded-full px-3 py-1 text-sm font-medium transition-colors";
const ON = "bg-accent text-on-accent";
const OFF = "bg-surface-sunken text-foreground hover:bg-surface-hover";

export function togglePillClass(selected: boolean, className?: string): string {
  return cx(PILL, selected ? ON : OFF, className);
}

export function ToggleGroup({
  label,
  className,
  children,
}: {
  /** Accessible name for the group — what the toggles choose between. */
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="group" aria-label={label} className={cx("flex flex-wrap items-center gap-2", className)}>
      {children}
    </div>
  );
}

export function ToggleButton({
  selected,
  className,
  children,
  ...rest
}: {
  selected: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "type">) {
  return (
    <button type="button" aria-pressed={selected} className={togglePillClass(selected, className)} {...rest}>
      {children}
    </button>
  );
}
