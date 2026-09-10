import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { Heebo, Noto_Sans_Arabic, Noto_Sans } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, rtlLocales } from "@/i18n/routing";
import { THEME_SCRIPT } from "@/lib/theme-script";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import "../globals.css";

// Heebo — the brand face (covers Hebrew + Latin). Loaded as a VARIABLE font:
// the previous static list omitted 600 while loading an unused 300, and 600
// (font-semibold) is the site's most-used weight — so the browser was
// synthesizing it. A weight axis covers every step and cannot drift out of
// sync with the utilities the components actually use.
const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

// globals.css named "Noto Sans Arabic" and "Noto Sans" in its :lang(ar)/:lang(ru)
// stacks but nothing ever loaded them, so those locales rendered in whatever the
// OS happened to have. Both are attached per-locale below; preload is off because
// they serve one locale each and would otherwise be fetched for every visitor.
const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  display: "swap",
  preload: false,
});

const notoSans = Noto_Sans({
  subsets: ["cyrillic", "latin"],
  variable: "--font-noto-sans",
  display: "swap",
  preload: false,
});

// Colours the mobile browser chrome. These must track --background in globals.css.
// The site's theme toggle is class-based, so a manual override can't be expressed
// here; prefers-color-scheme is the closest the platform allows.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#14181e" },
  ],
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  return {
    // Resolves relative OG/canonical URLs; set NEXT_PUBLIC_SITE_URL in prod.
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: t("name"), template: `%s · ${t("name")}` },
    description: t("tagline"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const dir = rtlLocales.has(locale) ? "rtl" : "ltr";
  // Attach only the face this locale needs — Hebrew/English ship Heebo alone,
  // and ar/ru add their script's Noto on top of it as the CSS stacks expect.
  const fontVars = [
    heebo.variable,
    locale === "ar" ? notoArabic.variable : "",
    locale === "ru" ? notoSans.variable : "",
  ]
    .filter(Boolean)
    .join(" ");
  const t = await getTranslations("a11y");
  const tWip = await getTranslations("wip");
  // Reading a header forces dynamic rendering, which nonce-CSP requires: Next
  // stamps the nonce onto its inline scripts at render time (static pages get
  // none and 'strict-dynamic' blocks them). We reuse the nonce on the theme
  // script below so hydration doesn't warn.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    // suppressHydrationWarning: the pre-paint theme script toggles the `dark`
    // class on <html> before hydration, so its class attribute differs from SSR.
    <html
      lang={locale}
      dir={dir}
      className={`${fontVars} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Set the theme class before paint to avoid a light-mode flash. Next
            stamps the CSP nonce here server-side; React strips nonces from the
            client payload, so the attribute differs server vs client —
            suppressHydrationWarning silences that expected mismatch. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <NextIntlClientProvider>
          <a href="#main-content" className="skip-link">
            {t("skipToContent")}
          </a>
          {/* <aside> (complementary landmark), not role="note" — a note is not a
              landmark, so this banner was the one bit of content on every page
              that sat outside every region. */}
          <aside className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-center text-xs leading-snug text-amber-900">
            {tWip("notice")}
          </aside>
          <Header />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 w-full max-w-6xl mx-auto px-4 py-8"
          >
            {children}
          </main>
          <Footer />
          <AccessibilityMenu />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
