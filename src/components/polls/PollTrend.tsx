"use client";

import { useState } from "react";
import { ToggleButton, ToggleGroup } from "@/components/ui/ToggleGroup";
import { THRESHOLD_SEATS } from "@/lib/polls";

// One list at a time — the reader picks a party and sees every poll that
// scored it, as dots, with each institute's polls joined by a thin line so a
// steady gap between institutes reads as what it is (a difference of method,
// not a swing). Two guide lines: the list's poll-of-polls average and the
// minimum to enter the Knesset. Nothing else is drawn: every mark is a poll
// somebody published, and its tooltip names the outlet, the institute and the
// date. Drawn LTR even on RTL pages — a time axis reads left-to-right in every
// locale, like the hemicycle's arc.
export type TrendLine = {
  slug: string;
  name: string;
  color: string;
  /** Poll-of-polls mean for this list, when it is in the average. */
  mean?: number;
  /** Pre-formatted on the server (functions cannot cross into a client component). */
  summary: string;
  averageLabel?: string;
  points: {
    date: string;
    seats: number;
    instituteId: string;
    institute: string;
    label: string;
    /** Sideways nudge in px for several polls on one day — the tooltip carries the truth. */
    dx: number;
  }[];
};

const W = 720;
const H = 300;
const PAD = { top: 16, right: 16, bottom: 30, left: 30 };

export function PollTrend({
  lines,
  initial,
  from,
  to,
  locale,
  labels,
}: {
  lines: TrendLine[];
  /** Optional list to open on; by default nothing is lifted until the reader chooses. */
  initial?: string;
  from: string; // ISO — the axis starts here (the cut-off)
  to: string; // ISO — the newest poll
  locale: string;
  labels: { aria: string; choose: string; threshold: string; houseNote: string };
}) {
  const [selected, setSelected] = useState<string | null>(initial ?? null);
  const line = lines.find((l) => l.slug === selected) ?? null;
  const shown = line ? [line] : lines; // nothing chosen: every poll's dots, faint

  const t0 = Date.parse(from);
  const t1 = Math.max(Date.parse(to), t0 + 86_400_000);
  const maxSeats = Math.max(20, ...shown.flatMap((l) => l.points.map((p) => p.seats)));
  const yMax = Math.ceil((maxSeats + 2) / 5) * 5;
  const x = (iso: string) => PAD.left + ((Date.parse(iso) - t0) / (t1 - t0)) * (W - PAD.left - PAD.right);
  const y = (seats: number) => PAD.top + (1 - seats / yMax) * (H - PAD.top - PAD.bottom);

  const dates = [...new Set(shown.flatMap((l) => l.points.map((p) => p.date)))].sort();
  const dayFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "numeric" });
  const yTicks = Array.from({ length: yMax / 5 + 1 }, (_, i) => i * 5);

  // Guide-line labels sit in the widest gap between poll days, clear of the dots.
  let gapX = (PAD.left + W - PAD.right) / 2;
  let gap = 0;
  for (let i = 1; i < dates.length; i++) {
    const g = x(dates[i]) - x(dates[i - 1]);
    if (g > gap) {
      gap = g;
      gapX = (x(dates[i]) + x(dates[i - 1])) / 2;
    }
  }

  const houses = line ? [...new Set(line.points.map((p) => p.instituteId))] : [];

  return (
    <div className="space-y-3">
      <ToggleGroup label={labels.choose}>
        <span className="text-sm text-muted">{labels.choose}</span>
        {lines.map((l) => (
          <ToggleButton key={l.slug} selected={l.slug === line?.slug} onClick={() => setSelected((cur) => (cur === l.slug ? null : l.slug))}>
            <span aria-hidden className="me-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: l.color }} />
            {l.name}
          </ToggleButton>
        ))}
      </ToggleGroup>

      {line && (
        <p className="text-sm font-medium" aria-live="polite">
          {line.summary}
        </p>
      )}

      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={line ? `${labels.aria}: ${line.name}` : labels.aria} className="h-auto w-full" style={{ direction: "ltr" }}>
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
              {v}
            </text>
          </g>
        ))}
        {/* The minimum to enter the Knesset: a list's smallest possible delegation. */}
        <line x1={PAD.left} x2={W - PAD.right} y1={y(THRESHOLD_SEATS)} y2={y(THRESHOLD_SEATS)} stroke="var(--fail)" strokeDasharray="4 4" strokeWidth={1.25} />
        <text x={gapX} y={y(THRESHOLD_SEATS) - 5} textAnchor="middle" fontSize={11} fill="var(--fail-ink)">
          {labels.threshold}
        </text>
        {/* The list's poll-of-polls average. */}
        {line && line.mean != null && (
          <>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(line.mean)} y2={y(line.mean)} stroke={line.color} strokeDasharray="2 3" strokeWidth={1.25} />
            <text x={gapX} y={y(line.mean) - 5} textAnchor="middle" fontSize={11} fill="var(--foreground)">
              {line.averageLabel}
            </text>
          </>
        )}
        {dates.map((d) => (
          <text key={d} x={x(d)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">
            {dayFmt.format(new Date(d))}
          </text>
        ))}
        {/* One thin line per institute, through its own polls. */}
        {line &&
          houses.map((h) => (
          <path
            key={h}
            d={line.points
              .filter((p) => p.instituteId === h)
              .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date) + p.dx},${y(p.seats)}`)
              .join(" ")}
            fill="none"
            stroke={line.color}
            strokeOpacity={0.45}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        ))}
        {shown.map((l) =>
          l.points.map((p) =>
            line ? (
              <circle key={p.label} cx={x(p.date) + p.dx} cy={y(p.seats)} r={5} fill={l.color} stroke="var(--surface)" strokeWidth={1.5}>
                <title>{p.label}</title>
              </circle>
            ) : (
              // Nothing chosen yet: a faint, purely decorative cloud of every poll's dots.
              <circle key={p.label} aria-hidden cx={x(p.date) + p.dx} cy={y(p.seats)} r={2.5} fill={l.color} opacity={0.45} />
            ),
          ),
        )}
      </svg>
      <p className="text-xs text-muted">{labels.houseNote}</p>
    </div>
  );
}
