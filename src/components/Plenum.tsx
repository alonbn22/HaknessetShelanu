"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MemberAvatar } from "@/components/MemberAvatar";

// The Knesset hall, live. One seat per sitting member, laid out in concentric
// rows: opposition on the left of the aisle, coalition on the right — the
// orientation of every election-night broadcast, so it is NOT mirrored in RTL.
// Both blocs are the same blue; the aisle carries the split. Hovering or
// focusing a faction in the legend lights its seats in that faction's colour.
// Every seat is a link and a pointer target — nothing in the hall is drawn that
// cannot be pressed.
//
// Hovering, focusing or tapping a seat opens a small card: photo, name,
// faction, current role, vote participation, and where the figures come from.
// Keyboard: one seat is in the tab order; the arrow keys walk the hall and
// Enter follows the link (120 tab stops would bury the page). Touch: a first
// tap opens the card, a second tap on the same seat follows the link.

export type PlenumSeat = {
  id: number;
  name: string;
  nameRtl: boolean;
  factionId: number;
  href: string;
  photoUrl: string | null;
  firstNameHe: string;
  lastNameHe: string;
  /** Localized current roles ("Minister · Ministry of Finance"), most prominent first. */
  roles: string[];
  participationPct: number | null;
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
  asOf,
}: {
  seats: PlenumSeat[];
  factions: PlenumFaction[];
  /** Localized "as of" date/time of the figures, for the card's source line. */
  asOf?: string | null;
}) {
  const t = useTranslations();
  const [active, setActive] = useState<number | null>(null);
  const popoverId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  // The open card: which seat, and where to draw it (px, relative to the container).
  const [card, setCard] = useState<{ seatId: number; x: number; y: number; below: boolean; boxWidth: number; rtl: boolean } | null>(null);
  // The one seat in the tab order (roving tabindex), by index into the sequence.
  const [focusIdx, setFocusIdx] = useState(0);
  const touched = useRef<number | null>(null); // last seat opened by a tap

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

  const sequence = placed.items.map((i) => i.seat);
  const seatById = useMemo(() => new Map(seats.map((s) => [s.id, s])), [seats]);
  const factionById = useMemo(() => new Map(factions.map((f) => [f.id, f])), [factions]);

  // Open the card for a seat, placed just above its circle (below it when the
  // seat sits near the top edge), clamped inside the hall's box.
  const openCard = useCallback((seatId: number, el: Element) => {
    const box = containerRef.current?.getBoundingClientRect();
    const dot = el.getBoundingClientRect();
    if (!box) return;
    const x = dot.left + dot.width / 2 - box.left;
    const y = dot.top - box.top;
    const rtl = containerRef.current ? getComputedStyle(containerRef.current).direction === "rtl" : false;
    setCard({ seatId, x, y, below: y < 120, boxWidth: box.width, rtl });
  }, []);
  const closeCard = useCallback(() => setCard(null), []);
  useEffect(() => {
    if (!card) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setCard(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card]);

  // Arrow keys walk the seats in hall order; Home/End jump to the ends.
  const onSeatKeyDown = (e: KeyboardEvent<Element>, idx: number) => {
    const n = sequence.length;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (idx + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (idx - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next == null) return;
    e.preventDefault();
    setFocusIdx(next);
    const target = containerRef.current?.querySelector<SVGAElement>(`[data-seat-index="${next}"]`);
    target?.focus();
  };
  // Touch: the first tap opens the card instead of navigating.
  const onSeatClick = (e: MouseEvent<Element>, seatId: number) => {
    const coarse = typeof window !== "undefined" && window.matchMedia?.("(hover: none)").matches;
    if (!coarse) return;
    if (touched.current !== seatId) {
      e.preventDefault();
      touched.current = seatId;
      openCard(seatId, e.currentTarget);
    }
  };

  const renderSeat = (seat: PlenumSeat, x: number, y: number, r: number, ringStroke: number, idx: number) => {
    const lit = active === seat.factionId;
    const dimmed = active != null && !lit;
    const open = card?.seatId === seat.id;
    return (
      <a
        key={seat.id}
        href={seat.href}
        tabIndex={idx === focusIdx ? 0 : -1}
        data-seat-index={idx}
        className="plenum-seat focus:outline-none"
        aria-label={seat.name}
        aria-describedby={open ? popoverId : undefined}
        onMouseEnter={(e) => openCard(seat.id, e.currentTarget)}
        onMouseLeave={closeCard}
        onFocus={(e) => {
          setFocusIdx(idx);
          openCard(seat.id, e.currentTarget);
        }}
        onBlur={closeCard}
        onKeyDown={(e) => onSeatKeyDown(e, idx)}
        onClick={(e) => onSeatClick(e, seat.id)}
      >
        <circle
          cx={x}
          cy={y}
          r={open ? r * 1.35 : r}
          fill={lit || open ? colorById.get(seat.factionId) : "var(--coalition)"}
          stroke={open ? "var(--foreground)" : lit ? colorById.get(seat.factionId) : "var(--coalition)"}
          strokeWidth={open ? ringStroke : 0}
          opacity={dimmed && !open ? 0.28 : 1}
          className="transition-[fill,opacity] duration-300 ease-out"
        />
      </a>
    );
  };

  const cardSeat = card ? seatById.get(card.seatId) : undefined;
  const cardFaction = cardSeat ? factionById.get(cardSeat.factionId) : undefined;
  const cardWidth = 272;
  const cardLeft = card ? Math.max(8, Math.min(card.boxWidth - cardWidth - 8, card.x - cardWidth / 2)) : 0;
  // `x` was measured from the left edge; inset-inline-start counts from the right on RTL pages.
  const cardStart = card ? (card.rtl ? card.boxWidth - cardLeft - cardWidth : cardLeft) : 0;
  const width = OUTER_R * 2 + AISLE * 2 + pad * 2;

  return (
    <div className="space-y-5">
      <div className="relative" ref={containerRef}>
        {/* The arc, from sm up. The group carries the name; the seats inside are links. */}
        <div role="group" aria-label={t("hemicycle.aria", { coalition: coalitionSeats, opposition: oppositionSeats })} className="hidden sm:block">
        <svg
          viewBox={`${-pad - AISLE} ${-pad} ${width} ${OUTER_R + pad * 2}`}
          className="mx-auto w-full max-w-3xl"
          style={{ direction: "ltr" }}
        >
          {placed.items.map(({ seat, x, y }, i) => renderSeat(seat, x, y, placed.seatR, 1.4, i))}
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
        </div>

        {/* The same hall on a phone: two blocks across the aisle. */}
        <div role="group" aria-label={t("hemicycle.aria", { coalition: coalitionSeats, opposition: oppositionSeats })} className="sm:hidden">
        <svg
          viewBox={`-2 -18 ${strip.width + 4} ${strip.height + 30}`}
          className="mx-auto block w-full"
          style={{ direction: "ltr" }}
        >
          {strip.items.map(({ seat, x, y }) => renderSeat(seat, x, y, strip.cell * 0.36, 1.2, sequence.indexOf(seat)))}
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
          <text x={strip.oppAisleX - 2} y={strip.height + 8} textAnchor="end" className="fill-muted" style={{ fontSize: 5 }}>
            {t("common.opposition")}
          </text>
          <text x={strip.coalStartX + 2} y={strip.height + 8} textAnchor="start" className="fill-muted" style={{ fontSize: 5 }}>
            {t("common.coalition")}
          </text>
        </svg>
        </div>

        {/* The seat card. role="tooltip": it describes the focused seat link. */}
        {card && cardSeat && (
          <div
            id={popoverId}
            role="tooltip"
            className="pointer-events-none absolute z-20 rounded-card border border-line bg-surface p-3 text-sm shadow-lg"
            // The hall is drawn LTR (a time-axis-like fixed orientation), so the
            // card is placed in that same frame; the text inside keeps the page's direction.
            style={{
              width: cardWidth,
              insetInlineStart: cardStart,
              top: card.below ? card.y + 14 : undefined,
              bottom: card.below ? undefined : `calc(100% - ${Math.max(0, card.y - 10)}px)`,
            }}
          >
            <div className="flex items-center gap-3">
              <MemberAvatar person={cardSeat} name={cardSeat.name} size={44} alt="" />
              <div className="min-w-0">
                <div className="truncate font-semibold" dir={cardSeat.nameRtl ? "rtl" : undefined} lang={cardSeat.nameRtl ? "he" : undefined}>
                  {cardSeat.name}
                </div>
                {cardFaction && (
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <span aria-hidden className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: cardFaction.color }} />
                    <span className="truncate" dir={cardFaction.nameRtl ? "rtl" : undefined} lang={cardFaction.nameRtl ? "he" : undefined}>
                      {cardFaction.name}
                    </span>
                    <span>· {t(cardFaction.isCoalition ? "common.coalition" : "common.opposition")}</span>
                  </div>
                )}
              </div>
            </div>
            {cardSeat.roles.length > 0 && (
              <p className="mt-2 text-xs leading-snug">{cardSeat.roles.join(" · ")}</p>
            )}
            <p className="mt-2 text-xs">
              {cardSeat.participationPct != null ? (
                <>
                  <span className="font-display text-lg font-bold tabular-nums">{cardSeat.participationPct}%</span>{" "}
                  <span className="text-muted">{t("hemicycle.cardParticipation")}</span>
                </>
              ) : (
                <span className="text-muted">{t("hemicycle.cardNoStats")}</span>
              )}
            </p>
            <p className="mt-2 border-t border-line pt-2 text-xs text-muted">
              {asOf ? t("hemicycle.cardSource", { date: asOf }) : t("footer.dataSource")} · {t("hemicycle.cardOpen")}
            </p>
          </div>
        )}
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
      <p className="text-xs text-muted">{t("hemicycle.hint")}</p>
    </div>
  );
}
