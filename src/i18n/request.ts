import { getRequestConfig } from "next-intl/server";
import { hasLocale, IntlErrorCode } from "next-intl";
import { routing } from "./routing";

// Deep-merge translation message trees (fallback values, then overrides win).
type Messages = { [k: string]: string | Messages };
function merge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [k, v] of Object.entries(override)) {
    const b = out[k];
    out[k] =
      v && typeof v === "object" && b && typeof b === "object"
        ? merge(b as Messages, v as Messages)
        : v;
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages = (await import(`../../messages/${locale}.json`)).default as Messages;
  // Belt-and-suspenders: fall back to the default locale for any key that is ever
  // missing (the parity test should prevent this, but production stays resilient).
  const merged =
    locale === routing.defaultLocale
      ? messages
      : merge(
          (await import(`../../messages/${routing.defaultLocale}.json`)).default as Messages,
          messages,
        );

  return {
    locale,
    messages: merged,
    // Don't crash on a missing message; surface it for monitoring instead.
    onError(error) {
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        if (process.env.NODE_ENV !== "production") console.warn(error.message);
      } else {
        console.error(error);
      }
    },
    // Last-resort display if a key is missing in every locale: the key path.
    getMessageFallback({ namespace, key }) {
      return [namespace, key].filter(Boolean).join(".");
    },
  };
});
