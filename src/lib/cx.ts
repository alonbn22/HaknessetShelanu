// Joins class names, dropping falsy entries. Deliberately tiny: the repo has no
// styling dependencies (no clsx / cva / tailwind-merge) and pins CI by SHA.
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
