import { rtlAttrs } from "@/lib/text";

export type SourceRef = { url: string; title: string; publisher?: string };

// "Source: publisher · publisher" — the always-visible credit line under a
// fact. Publisher names are data (often Hebrew), so each link carries its own
// direction; the title goes in the tooltip.
export function SourceLinks({
  sources,
  label,
  className = "text-xs text-muted",
}: {
  sources: SourceRef[];
  label: string;
  className?: string;
}) {
  if (sources.length === 0) return null;
  return (
    <span className={className}>
      {label}:{" "}
      {sources.map((s, i) => {
        const text = s.publisher ?? s.title;
        return (
          <span key={`${s.url}-${i}`}>
            {i > 0 && " · "}
            <a
              className="underline hover:text-accent"
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              title={s.title}
              {...rtlAttrs(text)}
            >
              {text}
            </a>
          </span>
        );
      })}
    </span>
  );
}
