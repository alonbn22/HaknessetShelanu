import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavLinks } from "./NavLinks";

export function Header() {
  const t = useTranslations();

  return (
    <header className="bg-accent text-white shadow-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link
          href="/"
          className="flex items-center whitespace-nowrap"
          aria-label={t("site.name")}
        >
          <span
            className="logo-flag text-2xl font-extrabold leading-none"
            style={{ paddingBottom: "2px" }}
          >
            {t("site.name")}
          </span>
        </Link>
        <NavLinks />
        <div className="ms-auto">
          {/* useSearchParams inside → needs a Suspense boundary for static prerender */}
          <Suspense fallback={null}>
            <LanguageSwitcher />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
