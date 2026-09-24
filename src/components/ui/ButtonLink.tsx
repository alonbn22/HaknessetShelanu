import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./Button";

// A link dressed as a button. Its own component rather than an `asLink` prop
// on Button, so each renders exactly one element type. next-intl's Link has
// typed routes, so `href` is taken from it rather than widened to string.
export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, "className" | "children">) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
