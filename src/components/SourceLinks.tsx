import { useLocale } from "next-intl";
import { publisherName } from "@/lib/content";
import { rtlAttrs } from "@/lib/text";

export type SourceRef = { url: string; title: string; publisher?: string };

// "Source: publisher · publisher" — the always-visible credit line under a
// fact, the publisher named in the page's language (content/publishers.yaml);
// the source's own title goes in the tooltip. Server-only (reads content/).
export function SourceLinks({
  sources,
  label,
  className = "text-xs text-muted",
}: {
  sources: SourceRef[];
  label: string;
  className?: string;
}) {
  const locale = useLocale();
  if (sources.length === 0) return null;
  const name = (s?: SourceRef) => s && (publisherName(s.publisher, locale) ?? s.title);
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
              aria-label={run ? `${name(s)} ${pos + 1}` : undefined}
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
