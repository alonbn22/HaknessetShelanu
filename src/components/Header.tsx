import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavLinks } from "./NavLinks";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import { SearchIcon } from "./icons/SearchIcon";

export function Header() {
  const t = useTranslations();

  return (
    <header className="bg-chrome text-on-chrome shadow-md sticky top-0 z-40">
      {/* relative: anchors the mobile dropdown panel (absolute top-full inset-x-0) */}
      <div className="relative max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
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
        <div className="ms-auto flex items-center gap-1">
          <Link
            href="/search"
            aria-label={t("search.title")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white/10"
          >
            <SearchIcon size={20} />
          </Link>
          <ThemeToggle />
          <MobileNav />
          {/* useSearchParams inside → needs a Suspense boundary for static prerender */}
          <Suspense fallback={null}>
            <LanguageSwitcher />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
