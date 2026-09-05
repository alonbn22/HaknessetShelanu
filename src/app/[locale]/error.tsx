"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

// Error boundaries must be Client Components. Without this file an uncaught
// render error replaced the whole page with Next's default error screen.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    // The digest is the only handle on the server-side stack, which Next
    // withholds from the client in production.
    console.error("Route error", error.digest ?? "", error);
  }, [error]);

  return (
    <section className="mx-auto max-w-2xl space-y-4 py-16 text-center">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-muted leading-relaxed">{t("body")}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent-deep"
      >
        {t("retry")}
      </button>
    </section>
  );
}
