import { Link } from "@/i18n/navigation";
import { factionColor, factionName, type FactionWithSeats } from "@/lib/queries";

// Horizontal 120-seat bar, coalition first, proportional widths.
export function SeatsBar({
  factions,
  locale,
}: {
  factions: FactionWithSeats[];
  locale: string;
}) {
  const ordered = [
    ...factions.filter((f) => f.isCoalition),
    ...factions.filter((f) => !f.isCoalition),
  ];
  const total = ordered.reduce((sum, f) => sum + f.seats, 0) || 1;

  return (
    <div>
      <div className="flex h-10 w-full overflow-hidden rounded-lg" dir="ltr">
        {ordered.map((f) => (
          <div
            key={f.id}
            title={`${factionName(f.id, f.nameHe, locale)} — ${f.seats}`}
            style={{
              width: `${(f.seats / total) * 100}%`,
              backgroundColor: factionColor(f.id),
            }}
            className="h-full border-e border-white/60 last:border-0"
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {ordered.map((f) => (
          <Link
            key={f.id}
            href={`/parties/${f.id}`}
            className="flex items-center gap-1.5 hover:underline"
          >
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: factionColor(f.id) }}
            />
            {factionName(f.id, f.nameHe, locale)}
            <span className="text-muted">{f.seats}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
