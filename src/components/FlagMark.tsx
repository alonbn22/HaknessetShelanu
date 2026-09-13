// The flag of Israel as a small inline mark: white field, two blue stripes,
// the Star of David as two triangles. Plain geometry, so it is crisp at any
// size and needs no asset. Decorative next to the wordmark (the link carries
// the name), hence aria-hidden.
export function FlagMark({ height = 18, className }: { height?: number; className?: string }) {
  const width = Math.round(height * (11 / 8));
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 110 80"
      className={className}
      aria-hidden
      focusable="false"
    >
      <rect width="110" height="80" fill="#ffffff" />
      <rect y="9" width="110" height="10" fill="#0038b8" />
      <rect y="61" width="110" height="10" fill="#0038b8" />
      <g fill="none" stroke="#0038b8" strokeWidth="4.5" strokeLinejoin="round">
        <path d="M55 22 L74 55 L36 55 Z" />
        <path d="M55 58 L36 25 L74 25 Z" />
      </g>
    </svg>
  );
}
