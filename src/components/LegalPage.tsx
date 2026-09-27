import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CONTACT_EMAIL } from "@/lib/constants";

// Shared pieces of the plain-words trust pages: /privacy, /terms, /credits and
// the accessibility statement.

const LINK = "text-accent-ink underline";

// Rich-text tags for t.rich(): a link within the site, and one that leaves it.
export function siteLink(href: string) {
  return function SiteLink(chunks: ReactNode) {
    return (
      <Link href={href} className={LINK}>
        {chunks}
      </Link>
    );
  };
}
export function outLink(href: string) {
  return function OutLink(chunks: ReactNode) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
        {chunks}
      </a>
    );
  };
}

export function LegalSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-2 leading-relaxed">
      <SectionHeading>{title}</SectionHeading>
      {children}
    </section>
  );
}

// How to reach the site: the owner's address when the deployment sets one,
// else the public tickets page.
export async function LegalContact({ title, lead, children }: { title: string; lead: string; children?: ReactNode }) {
  const t = await getTranslations("tickets");
  return (
    <Card as="section" className="space-y-2 leading-relaxed">
      <SectionHeading>{title}</SectionHeading>
      <p>
        {lead}{" "}
        {CONTACT_EMAIL ? (
          <a href={`mailto:${CONTACT_EMAIL}`} className={LINK} dir="ltr">
            {CONTACT_EMAIL}
          </a>
        ) : (
          <Link href="/tickets" className={LINK}>
            {t("contactLink")}
          </Link>
        )}
      </p>
      {!CONTACT_EMAIL && <p className="text-sm text-muted">{t("contactNote")}</p>}
      {children}
    </Card>
  );
}
