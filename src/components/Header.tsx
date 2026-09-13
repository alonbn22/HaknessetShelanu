import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NavLinks } from "./NavLinks";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import { FlagMark } from "./FlagMark";
import { SearchIcon } from "./icons/SearchIcon";

// The chrome is the flag's blue field; the flag mark sits beside a white
// wordmark in the display face, and the flag's stripes rule the bar's bottom
// edge. Elevation belongs to things that float, so the bar carries a rule,
// not a shadow.
export function Header() {
  const t = useTranslations();

  return (
    <header className="stripe-rule sticky top-0 z-40 bg-chrome text-on-chrome">
      {/* relative: anchors the mobile dropdown panel (absolute top-full inset-x-0) */}
      <div className="relative mx-auto flex max-w-6xl items-center gap-x-6 px-4 py-3">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 whitespace-nowrap"
          aria-label={t("site.name")}
        >
          <FlagMark height={18} className="rounded-[2px]" />
          <span className="font-display text-2xl font-bold leading-none">{t("site.name")}</span>
        </Link>
        <NavLinks />
        <div className="ms-auto flex items-center gap-1">
          <Link
            href="/search"
            aria-label={t("search.title")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-control hover:bg-chrome-hover"
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
