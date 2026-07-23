import Image from "next/image";

// Client-safe (no DB/queries imports) so it can be used in client components too.
export function MemberAvatar({
  person,
  size = 56,
  alt,
}: {
  person: { firstNameHe: string; lastNameHe: string; photoUrl: string | null };
  size?: number;
  // Localized alt text (falls back to Hebrew) so screen readers don't announce
  // Hebrew under a non-he <html lang> (WCAG 3.1.2).
  alt?: string;
}) {
  if (person.photoUrl) {
    return (
      <Image
        src={person.photoUrl}
        alt={alt ?? `${person.firstNameHe} ${person.lastNameHe}`}
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
      {person.firstNameHe.charAt(0)}
      {person.lastNameHe.charAt(0)}
    </div>
  );
}
