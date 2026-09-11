import type { InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes } from "react";

// Label above the control and always visible — a placeholder is not a label.
// `ref` is a plain prop (React 19); no forwardRef.
const CONTROL =
  "w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted";

function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
      {children}
    </label>
  );
}

function Hint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1 text-xs text-muted">
      {children}
    </p>
  );
}

export function TextField({
  id,
  label,
  hint,
  className,
  ref,
  ...rest
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
  ref?: Ref<HTMLInputElement>;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className">) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <input id={id} ref={ref} aria-describedby={hintId} className={CONTROL} {...rest} />
      {hint && <Hint id={hintId!}>{hint}</Hint>}
    </div>
  );
}

export function SelectField({
  id,
  label,
  hint,
  className,
  ref,
  children,
  ...rest
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
  ref?: Ref<HTMLSelectElement>;
  /** The <option> elements. */
  children: ReactNode;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "className" | "children">) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <select id={id} ref={ref} aria-describedby={hintId} className={CONTROL} {...rest}>
        {children}
      </select>
      {hint && <Hint id={hintId!}>{hint}</Hint>}
    </div>
  );
}
