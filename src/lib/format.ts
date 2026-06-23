const BCP47: Record<string, string> = {
  he: "he-IL",
  en: "en-GB",
  ar: "ar",
  ru: "ru",
};

export function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(BCP47[locale] ?? locale, {
    dateStyle: "medium",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(BCP47[locale] ?? locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}
