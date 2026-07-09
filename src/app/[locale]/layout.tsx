import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Heebo } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, rtlLocales } from "@/i18n/routing";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AccessibilityMenu } from "@/components/AccessibilityMenu";
import "../globals.css";

// Heebo — the brand face (covers Hebrew + Latin). ar/ru fall back via the
// font stack in globals.css.
const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700", "800", "900"],
  variable: "--font-heebo",
  display: "swap",
});

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
  const t = await getTranslations("a11y");
  const tWip = await getTranslations("wip");

  return (
    // suppressHydrationWarning: the pre-paint theme script (below) toggles the
    // `dark` class on <html> before React hydrates, so the class attribute
    // intentionally differs from the server render — scoped to this element only.
    <html
      lang={locale}
      dir={dir}
      className={`${heebo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Set the theme class before paint to avoid a light-mode flash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();",
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <NextIntlClientProvider>
          <a href="#main-content" className="skip-link">
            {t("skipToContent")}
          </a>
          <div
            role="note"
            className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-center text-xs leading-snug text-amber-900"
          >
            {tWip("notice")}
          </div>
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
