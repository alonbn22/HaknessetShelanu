import { useTranslations } from "next-intl";

// The loading.tsx fallback for the slowest routes: a heading, a line and a grid
// of empty cards while the page streams in. role="status" announces the hidden
// label; the shapes are decorative. The pulse stops under reduced motion and
// the accessibility menu's "stop animations" (globals.css).
export function PageSkeleton() {
  const t = useTranslations("a11y");
  return (
    <div role="status" className="animate-pulse space-y-6">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden="true" className="space-y-6">
        <div className="h-8 w-2/3 max-w-md rounded-control bg-surface-sunken" />
        <div className="h-4 w-full max-w-xl rounded-chip bg-surface-sunken" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 rounded-card border border-line bg-surface" />
          ))}
        </div>
      </div>
    </div>
  );
}
