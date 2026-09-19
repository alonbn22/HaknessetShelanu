const BCP47: Record<string, string> = {
  he: "he-IL",
  en: "en-GB",
  ar: "ar",
  ru: "ru",
  es: "es-ES",
  fr: "fr-FR",
};

export function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(BCP47[locale] ?? locale, {
    dateStyle: "medium",
  }).format(new Date(iso));
}

// "Tuesday, 27 October 2026" — for the one date everyone needs to remember.
export function formatDateFull(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(BCP47[locale] ?? locale, {
    dateStyle: "full",
    timeZone: "Asia/Jerusalem",
  }).format(new Date(`${iso}T12:00:00+03:00`));
}

export function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(BCP47[locale] ?? locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
