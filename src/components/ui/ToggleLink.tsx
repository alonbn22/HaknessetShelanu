import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { togglePillClass } from "./ToggleGroup";

// URL-driven toggle (a filter that changes the query). aria-current, not
// aria-pressed: pressed is a button state, and the lobbyists sort links were
// using it on anchors.
export function ToggleLink({
  selected,
  className,
  children,
  ...rest
}: {
  selected: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, "className" | "children">) {
  return (
    <Link aria-current={selected ? "true" : undefined} className={togglePillClass(selected, className)} {...rest}>
      {children}
    </Link>
  );
}
