const BCP47: Record<string, string> = {
  he: "he-IL",
  en: "en-GB",
  ar: "ar",
  ru: "ru",
  es: "es-ES",
  fr: "fr-FR",
};

// Every date and time shows in Israel time, whatever the server's zone (Vercel
// runs in UTC): stored times carry their offset, date-only values parse as UTC
// midnight, and both land on the right Israeli day and hour.
const TZ = "Asia/Jerusalem";

export function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(BCP47[locale] ?? locale, {
    dateStyle: "medium",
    timeZone: TZ,
  }).format(new Date(iso));
}

// "Tuesday, 27 October 2026" — for the one date everyone needs to remember.
export function formatDateFull(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(BCP47[locale] ?? locale, {
    dateStyle: "full",
    timeZone: TZ,
  }).format(new Date(`${iso}T12:00:00+03:00`));
}

export function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(BCP47[locale] ?? locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TZ,
  }).format(new Date(iso));
}

// A number in the reader's digits and decimal mark ("22,3" in es/fr/ru,
// "22.3" in he/en) — so a figure interpolated into a sentence matches the
// figures the content files write by hand.
export function formatNumber(n: number, locale: string, digits = 1): string {
  return n.toLocaleString(BCP47[locale] ?? locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
