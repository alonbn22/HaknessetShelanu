import Image from "next/image";

// Original brand-color wordmark emblems (NOT the trademarked party logos).
// Files live in public/assets/party/<factionId>.png.
const EMBLEM_IDS = new Set([
  1095, 1096, 1099, 1100, 1101, 1102, 1103, 1104, 1105, 1106, 1107, 1110,
]);

export function PartyEmblem({
  factionId,
  nameHe,
  color,
  size = 64,
  alt,
}: {
  factionId: number;
  nameHe: string;
  color: string;
  size?: number;
  // Localized accessible name; falls back to the Hebrew name. The visible tile
  // text stays Hebrew (it is a brand-style wordmark), but the announced name
  // should match the page language where available (WCAG 3.1.2).
  alt?: string;
}) {
  const label = alt ?? nameHe;
  if (EMBLEM_IDS.has(factionId)) {
    return (
      <Image
        src={`/assets/party/${factionId}.png`}
        alt={label}
        width={size}
        height={size}
        unoptimized
        className="rounded-lg object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  // Fallback: a colored tile with the faction name, for factions without an emblem.
  return (
    <div
      className="rounded-lg flex items-center justify-center text-white font-bold text-center px-1.5 shrink-0"
      style={{
        width: size,
        height: size,
        background: color,
        fontSize: Math.max(10, size / 7),
        lineHeight: 1.1,
      }}
      dir="rtl"
      lang="he"
      aria-label={label}
    >
      {nameHe}
    </div>
  );
}
