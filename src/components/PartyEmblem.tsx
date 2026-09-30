import Image from "next/image";
import { isHebrew, rtlAttrs } from "@/lib/text";

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
  // The name in the page's language (falls back to Hebrew): the tile's text and
  // its accessible name, so a non-Hebrew page shows no Hebrew (WCAG 3.1.2).
  alt?: string;
}) {
  const label = alt ?? nameHe;
  // The drawn emblems spell the name in Hebrew: Hebrew pages only.
  if (EMBLEM_IDS.has(factionId) && isHebrew(label)) {
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
      className="rounded-lg flex items-center justify-center font-bold text-center px-1.5 shrink-0"
      style={{
        width: size,
        height: size,
        background: color,
        color: inkOn(color),
        fontSize: Math.max(10, size / 7),
        lineHeight: 1.1,
      }}
      {...rtlAttrs(label)}
      role="img"
      aria-label={label}
    >
      <span aria-hidden>{label}</span>
    </div>
  );
}

// White or black, whichever reads better on the party colour: white on a light
// brand colour measured 3.13:1 (Yesh Atid). One of the two always clears 4.5:1.
function inkOn(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#fff";
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(m[1].slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.05 ? "#fff" : "#000";
}
