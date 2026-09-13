"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// The Knesset hall, live. One seat per sitting member, laid out in concentric
// rows: opposition on the left of the aisle, coalition on the right — the
// orientation of every election-night broadcast, so it is NOT mirrored in RTL.
// Both blocs are the same blue; the aisle carries the split. Hovering or
// focusing a faction in the legend lights its seats in that faction's colour.
// Seats named in `hollow` render empty: the members who miss the most votes.

export type PlenumSeat = {
  id: number;
  name: string;
  nameRtl: boolean;
  factionId: number;
  href: string;
};

export type PlenumFaction = {
  id: number;
  name: string;
  nameRtl: boolean;
  color: string;
  seats: number;
  isCoalition: boolean;
};

type Point = { x: number; y: number };

const OUTER_R = 100;
const ROWS = 6; // six rows read closer to the hall's real depth than the brief's five
const STRIP_ROWS = 6; // the phone form: each wedge as a block, six seats tall
const INNER_RATIO = 0.42;
const AISLE = 9; // half-width of the aisle, in viewBox units

// Concentric semicircle rows, seats per row ∝ radius, ordered by angle so the
// blocs form contiguous wedges. Deterministic maths (no Math.hypot, values
// rounded) so the server and client agree and hydration is clean.
function layout(total: number): { points: Point[]; seatR: number } {
  const radii: number[] = [];
  for (let r = 0; r < ROWS; r++) radii.push(INNER_RATIO + (1 - INNER_RATIO) * (r / (ROWS - 1)));
  const weight = radii.reduce((a, b) => a + b, 0);
  const counts = radii.map((rad) => Math.max(1, Math.round((total * rad) / weight)));
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
  const raw: { x: number; y: number; angle: number; radius: number }[] = [];
  for (let r = 0; r < ROWS; r++) {
    const n = counts[r];
    const rad = radii[r] * OUTER_R;
    for (let s = 0; s < n; s++) {
      const angle = n === 1 ? Math.PI / 2 : Math.PI * (s / (n - 1));
      raw.push({ x: OUTER_R - rad * Math.cos(angle), y: OUTER_R - rad * Math.sin(angle), angle, radius: rad });
    }
  }
  raw.sort((a, b) => a.angle - b.angle || a.radius - b.radius);
  let minSq = Infinity;
  for (let i = 0; i < raw.length; i++) {
    for (let j = i + 1; j < raw.length; j++) {
      const dx = raw[i].x - raw[j].x;
      const dy = raw[i].y - raw[j].y;
      const sq = dx * dx + dy * dy;
      if (sq < minSq) minSq = sq;
    }
  }
  const round = (v: number) => Math.round(v * 100) / 100;
  return {
    points: raw.map(({ x, y }) => ({ x: round(x), y: round(y) })),
    seatR: round(Math.sqrt(minSq) * 0.4),
  };
}

export function Plenum({
  seats,
  factions,
  hollow = [],
}: {
  seats: PlenumSeat[];
  factions: PlenumFaction[];
  hollow?: number[];
}) {
  const t = useTranslations();
  const [active, setActive] = useState<number | null>(null);
  const hollowSet = useMemo(() => new Set(hollow), [hollow]);

  // Opposition first (smallest faction at the far edge, largest at the aisle),
  // then coalition (largest at the aisle). Members follow their faction's wedge.
  const ordered = useMemo(() => {
    const opp = factions.filter((f) => !f.isCoalition).sort((a, b) => a.seats - b.seats);
    const coal = factions.filter((f) => f.isCoalition).sort((a, b) => b.seats - a.seats);
    return [...opp, ...coal];
  }, [factions]);

  const placed = useMemo(() => {
    const byFaction = new Map<number, PlenumSeat[]>();
    for (const s of seats) byFaction.set(s.factionId, [...(byFaction.get(s.factionId) ?? []), s]);
    const sequence: PlenumSeat[] = [];
    for (const f of ordered) sequence.push(...(byFaction.get(f.id) ?? []));
    const { points, seatR } = layout(sequence.length);
    const coalitionIds = new Set(factions.filter((f) => f.isCoalition).map((f) => f.id));
    return {
      seatR,
      items: sequence.map((seat, i) => {
        const coalition = coalitionIds.has(seat.factionId);
        // The aisle: each bloc steps away from the centre line.
        const x = points[i].x + (coalition ? AISLE : -AISLE);
        return { seat, coalition, x, y: points[i].y };
      }),
    };
  }, [seats, ordered, factions]);

  // The phone form: the same seats as two blocks facing across the aisle,
  // opposition filling leftward from it, coalition rightward — so the largest
  // faction of each bloc still sits nearest the centre, as in the arc.
  const strip = useMemo(() => {
    const opp = placed.items.filter((i) => !i.coalition);
    const coal = placed.items.filter((i) => i.coalition);
    const cols = (n: number) => Math.ceil(n / STRIP_ROWS);
    const oppCols = cols(opp.length);
    const coalCols = cols(coal.length);
    const cell = 10; // viewBox units per seat cell
    const gap = 3 * cell; // the aisle
    const at = (i: number, fromX: number, dir: 1 | -1) => ({
      x: fromX + dir * (Math.floor(i / STRIP_ROWS) * cell + cell / 2),
      y: (i % STRIP_ROWS) * cell + cell / 2,
    });
    // Opposition cells are laid out from the aisle leftward so the last (largest)
    // faction in sequence ends beside it; reversing keeps the sequence order.
    const oppAisleX = oppCols * cell;
    const coalStartX = oppAisleX + gap;
    const items = [
      ...opp.map((it, i) => ({ ...it, ...at(opp.length - 1 - i, oppAisleX, -1) })),
      ...coal.map((it, i) => ({ ...it, ...at(i, coalStartX, 1) })),
    ];
    return { items, width: (oppCols + coalCols) * cell + gap, height: STRIP_ROWS * cell, cell, oppAisleX, coalStartX, gap };
  }, [placed.items]);

  const colorById = useMemo(() => new Map(factions.map((f) => [f.id, f.color])), [factions]);
  const coalitionSeats = placed.items.filter((i) => i.coalition).length;
  const oppositionSeats = placed.items.length - coalitionSeats;
  const pad = placed.seatR + 2;

  // Pointer targets, not tab stops: 120 links would bury the page for keyboard
  // users, who reach members through the legend and the lists beneath.
  const renderSeat = (seat: PlenumSeat, x: number, y: number, r: number, hollowStroke: number) => {
    const lit = active === seat.factionId;
    const dimmed = active != null && !lit;
    const empty = hollowSet.has(seat.id);
    return (
      <a key={seat.id} href={seat.href} tabIndex={-1} className="plenum-seat">
        <title>{seat.name}</title>
        <circle
          cx={x}
          cy={y}
          r={r}
          fill={empty ? "none" : lit ? colorById.get(seat.factionId) : "var(--coalition)"}
          stroke={lit ? colorById.get(seat.factionId) : "var(--coalition)"}
          strokeWidth={empty ? hollowStroke : 0}
          opacity={dimmed ? 0.28 : 1}
          className="transition-[fill,opacity] duration-300 ease-out"
        />
      </a>
    );
  };
  const width = OUTER_R * 2 + AISLE * 2 + pad * 2;

  return (
    <div className="space-y-5">
      <div className="relative">
        {/* The arc, from sm up. */}
        <svg
          viewBox={`${-pad - AISLE} ${-pad} ${width} ${OUTER_R + pad * 2}`}
          className="mx-auto hidden w-full max-w-3xl sm:block"
          style={{ direction: "ltr" }}
          role="img"
          aria-label={t("hemicycle.aria", { coalition: coalitionSeats, opposition: oppositionSeats })}
        >
          {placed.items.map(({ seat, x, y }) => renderSeat(seat, x, y, placed.seatR, 1.4))}
          {/* The split, set in the display face at the aisle. */}
          <text
            x={OUTER_R - AISLE - 3}
            y={OUTER_R - 7}
            textAnchor="end"
            className="font-display fill-foreground font-bold tabular-nums"
            style={{ fontSize: 14 }}
          >
            {oppositionSeats}
          </text>
          <text
            x={OUTER_R + AISLE + 3}
            y={OUTER_R - 7}
            textAnchor="start"
            className="font-display fill-foreground font-bold tabular-nums"
            style={{ fontSize: 14 }}
          >
            {coalitionSeats}
          </text>
          <text x={OUTER_R - AISLE - 3} y={OUTER_R} textAnchor="end" className="fill-muted" style={{ fontSize: 4.5 }}>
            {t("common.opposition")}
          </text>
          <text x={OUTER_R + AISLE + 3} y={OUTER_R} textAnchor="start" className="fill-muted" style={{ fontSize: 4.5 }}>
            {t("common.coalition")}
          </text>
        </svg>

        {/* The same hall on a phone: two blocks across the aisle. */}
        <svg
          viewBox={`-2 -18 ${strip.width + 4} ${strip.height + 20}`}
          className="mx-auto block w-full sm:hidden"
          style={{ direction: "ltr" }}
          role="img"
          aria-label={t("hemicycle.aria", { coalition: coalitionSeats, opposition: oppositionSeats })}
        >
          {strip.items.map(({ seat, x, y }) => renderSeat(seat, x, y, strip.cell * 0.36, 1.2))}
          <text
            x={strip.oppAisleX - 2}
            y={-6}
            textAnchor="end"
            className="font-display fill-foreground font-bold tabular-nums"
            style={{ fontSize: 13 }}
          >
            {oppositionSeats}
          </text>
          <text
            x={strip.coalStartX + 2}
            y={-6}
            textAnchor="start"
            className="font-display fill-foreground font-bold tabular-nums"
            style={{ fontSize: 13 }}
          >
            {coalitionSeats}
          </text>
        </svg>
      </div>

      {/* The legend is the semantic layer: every faction is a real link, and
          hovering or focusing one lights its seats. */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm" aria-label={t("hemicycle.legend")}>
        {ordered.map((f) => (
          <li key={f.id}>
            <Link
              href={`/parties/${f.id}`}
              className="flex items-center gap-1.5 rounded-chip hover:underline"
              onMouseEnter={() => setActive(f.id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(f.id)}
              onBlur={() => setActive(null)}
            >
              <span className="inline-block h-3 w-3 rounded-[2px]" style={{ backgroundColor: f.color }} />
              <span dir={f.nameRtl ? "rtl" : undefined} lang={f.nameRtl ? "he" : undefined}>
                {f.name}
              </span>
              <span className="tabular-nums text-muted">{f.seats}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
