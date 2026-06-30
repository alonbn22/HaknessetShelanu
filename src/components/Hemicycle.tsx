"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// One faction, pre-resolved server-side (color/name need content YAML that isn't
// available in the client, so the page passes plain serializable data — same
// pattern as VoteRollCall's voters).
export type HemiFaction = {
  id: number;
  name: string;
  nameRtl: boolean;
  color: string;
  seats: number;
  isCoalition: boolean;
};

type Seat = { x: number; y: number; factionId: number };

const OUTER_R = 100; // svg units
const SEAT_R = 3.1;
const ROWS = 8;
const INNER_RATIO = 0.62;
const PAD = SEAT_R + 2;

// Distribute `total` seats across concentric semicircle rows (seats per row ∝
// radius — the standard parliament-arch layout), then order every seat by angle
// so the factions assigned in sequence form contiguous wedges.
function layout(total: number): { seats: Omit<Seat, "factionId">[] } {
  const radii: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    radii.push(INNER_RATIO + (1 - INNER_RATIO) * (r / (ROWS - 1)));
  }
  const weight = radii.reduce((a, b) => a + b, 0);
  const counts = radii.map((rad) => Math.max(1, Math.round((total * rad) / weight)));
  // Correct rounding drift to hit `total` exactly: surplus to the roomy outer
  // rows, deficit from the inner rows.
  let diff = total - counts.reduce((a, b) => a + b, 0);
  while (diff > 0) {
    counts[counts.length - 1]++;
    diff--;
  }
  while (diff < 0) {
    const i = counts.findIndex((c) => c > 1);
    if (i === -1) break;
    counts[i]--;
    diff++;
  }

  const cx = OUTER_R + PAD;
  const baseY = OUTER_R + PAD;
  const raw: { x: number; y: number; angle: number; radius: number }[] = [];
  for (let r = 0; r < ROWS; r++) {
    const n = counts[r];
    const rad = radii[r] * OUTER_R;
    for (let s = 0; s < n; s++) {
      const angle = n === 1 ? Math.PI / 2 : Math.PI * (s / (n - 1));
      raw.push({
        x: cx - rad * Math.cos(angle), // angle 0 → left, π → right
        y: baseY - rad * Math.sin(angle),
        angle,
        radius: rad,
      });
    }
  }
  raw.sort((a, b) => a.angle - b.angle || a.radius - b.radius);
  // Round to 2 decimals: Math.cos/sin are implementation-defined in ECMAScript,
  // so the server (Node) and client (browser) can produce coordinates that differ
  // in the last float digit — rounding makes them identical and avoids a React
  // hydration mismatch. 0.01-unit precision is far finer than the ~200-unit chart.
  const round = (v: number) => Math.round(v * 100) / 100;
  return { seats: raw.map(({ x, y }) => ({ x: round(x), y: round(y) })) };
}

export function Hemicycle({ factions }: { factions: HemiFaction[] }) {
  const t = useTranslations();
  const [active, setActive] = useState<number | null>(null);

  const total = factions.reduce((s, f) => s + f.seats, 0);

  // Opposition fills the left of the arc, coalition the right, each ordered so
  // the largest bloc of each side sits nearest the centre aisle.
  const ordered = useMemo(() => {
    const opp = factions.filter((f) => !f.isCoalition).sort((a, b) => a.seats - b.seats);
    const coal = factions.filter((f) => f.isCoalition).sort((a, b) => b.seats - a.seats);
    return [...opp, ...coal];
  }, [factions]);

  const seats = useMemo(() => {
    const { seats: pts } = layout(total);
    const out: Seat[] = [];
    let i = 0;
    for (const f of ordered) {
      for (let s = 0; s < f.seats && i < pts.length; s++, i++) {
        out.push({ ...pts[i], factionId: f.id });
      }
    }
    return out;
  }, [ordered, total]);

  const colorById = useMemo(
    () => new Map(factions.map((f) => [f.id, f.color])),
    [factions],
  );
  const coalitionSeats = factions.filter((f) => f.isCoalition).reduce((s, f) => s + f.seats, 0);
  const oppositionSeats = total - coalitionSeats;
  const width = (OUTER_R + PAD) * 2;
  const height = OUTER_R + PAD * 2;

  // SVG coordinates are absolute, so the dome (coalition on the right — a fixed
  // seating convention) does not mirror under an RTL UI; no dir override needed.
  return (
    <div className="space-y-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={t("hemicycle.aria", { coalition: coalitionSeats, opposition: oppositionSeats })}
      >
        <text
          x={OUTER_R + PAD}
          y={OUTER_R + PAD - 4}
          textAnchor="middle"
          className="fill-black/70 text-[13px] font-bold"
        >
          {total}
        </text>
        {seats.map((seat, idx) => {
          const dim = active != null && seat.factionId !== active;
          return (
            <circle
              key={idx}
              cx={seat.x}
              cy={seat.y}
              r={SEAT_R}
              fill={colorById.get(seat.factionId)}
              opacity={dim ? 0.2 : 1}
              className="transition-opacity"
            />
          );
        })}
      </svg>

      {/* Coalition / opposition split */}
      <div className="flex justify-between text-sm font-medium border-t border-black/5 pt-2">
        <span className="text-coalition">
          {t("common.coalition")}: {coalitionSeats}
        </span>
        <span className="text-opposition">
          {t("common.opposition")}: {oppositionSeats}
        </span>
      </div>

      {/* Interactive legend — hover/focus highlights the faction's seats; click opens its page */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm" aria-label={t("hemicycle.legend")}>
        {ordered.map((f) => (
          <li key={f.id}>
            <Link
              href={`/parties/${f.id}`}
              className="flex items-center gap-1.5 rounded hover:underline"
              onMouseEnter={() => setActive(f.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(f.id)}
              onBlur={() => setActive(null)}
            >
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: f.color }}
              />
              <span dir={f.nameRtl ? "rtl" : undefined} lang={f.nameRtl ? "he" : undefined}>
                {f.name}
              </span>
              <span className="text-muted">{f.seats}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
