import Image from "next/image";
import { canonicalCommonsUrl, commonsThumbUrl } from "@/lib/text";

// Stored photos are mostly Commons' 500px thumbnails. Avatars small enough for
// its standard 250px one to stay sharp on a 3x screen (up to 83px) ask for that
// instead; bigger ones (the member page header) keep the stored image.
const THUMB_WIDTH = 250;

// Client-safe (no DB/queries imports) so it can be used in client components too.
export function MemberAvatar({
  person,
  name,
  size = 56,
  alt,
}: {
  person: { photoUrl: string | null };
  // The name as the page shows it (personName in the page's locale): the photo's
  // alt text and, with no photo, the initials — never the Hebrew fields, so a
  // non-Hebrew page shows no Hebrew letters and announces none (WCAG 3.1.2).
  name: string;
  size?: number;
  // Override, e.g. "" when the name is printed right beside the photo.
  alt?: string;
}) {
  const photoUrl =
    size * 3 <= THUMB_WIDTH
      ? commonsThumbUrl(person.photoUrl, THUMB_WIDTH)
      : canonicalCommonsUrl(person.photoUrl);
  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={alt ?? name}
        width={size}
        height={size}
        // Load Commons images directly, not via the Next optimizer (Wikimedia rate-limits server-side fetches).
        unoptimized
        className="rounded-full object-cover shrink-0 bg-accent/10"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    // Decorative: name is shown adjacent, so hide the initials from assistive tech.
    <div
      aria-hidden="true"
      className="rounded-full bg-accent/15 text-accent flex items-center justify-center font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size / 2.8 }}
    >
      {initials(name)}
    </div>
  );
}

// First letters of the first and last words: "Oz Haim" -> "OH".
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.charAt(0) ?? "";
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}
