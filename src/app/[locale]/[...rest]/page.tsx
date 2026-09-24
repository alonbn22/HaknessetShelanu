import { notFound } from "next/navigation";

// Unmatched paths would otherwise fall out of the [locale] segment entirely and
// render Next's built-in 404 — unstyled, English and LTR. Catching them here
// resolves them inside the locale layout, so notFound() hits the localized
// not-found.tsx boundary next to this file with the right header, footer and
// text direction.
export default function CatchAllNotFound() {
  notFound();
}
