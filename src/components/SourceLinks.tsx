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
  const name = (s?: SourceRef) => s && (s.publisher ?? s.title);
  return (
    <span className={className}>
      {label}:{" "}
      {sources.map((s, i) => {
        // Several pages from one publisher in a row read "publisher 1 · 2 · 3",
        // not the same name three times; each page's title is its tooltip.
        let pos = 0;
        while (i - pos > 0 && name(sources[i - pos - 1]) === name(s)) pos++;
        const run = pos > 0 || name(sources[i + 1]) === name(s);
        const text = pos > 0 ? String(pos + 1) : run ? `${name(s)} 1` : name(s)!;
        return (
          <span key={`${s.url}-${i}`}>
            {i > 0 && " · "}
            <a
              className="underline hover:text-accent"
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              title={s.title}
              aria-label={run ? `${name(s)}: ${s.title}` : undefined}
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
