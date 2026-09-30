import { canonicalCommonsUrl, commonsThumbUrl } from "@/lib/text";

// Stored photos are mostly Commons' 500px thumbnails; Commons also pre-renders
// 120px and 250px ones (and refuses other widths). Each avatar lists, for 1x,
// 2x and 3x screens, the smallest of those that stays sharp, and the stored
// image beyond 250px; the browser takes the one its screen needs. A 56px card
// on a 2x phone loads the 120px file, not the 250px one.
const THUMB_WIDTHS = [120, 250];
const photoAt = (url: string | null, px: number) => {
  const w = THUMB_WIDTHS.find((t) => px <= t);
  return w ? commonsThumbUrl(url, w) : canonicalCommonsUrl(url);
};

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
  const src = photoAt(person.photoUrl, size);
  if (src) {
    // Each URL once, at the highest density it covers: "…/120px-… 2x, …/250px-… 3x".
    const densities = new Map([1, 2, 3].map((d) => [photoAt(person.photoUrl, size * d)!, d]));
    return (
      // A plain <img>: next/image drops srcSet when unoptimized, and these load
      // straight from Commons, not via the optimizer (Wikimedia rate-limits
      // server-side fetches).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        srcSet={[...densities].map(([url, d]) => `${url} ${d}x`).join(", ")}
        alt={alt ?? name}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        // No credentials: Commons sets a third-party cookie (WMF-Uniq) on
        // every image; a CORS request neither sends nor stores it.
        crossOrigin="anonymous"
        className="rounded-full object-cover shrink-0 bg-accent/10"
        style={{ width: size, height: size, color: "transparent" }}
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
