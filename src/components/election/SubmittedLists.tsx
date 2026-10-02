import { useLocale, useTranslations } from "next-intl";
import { TableFrame } from "@/components/ui/TableFrame";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { candidateName, type SubmittedList } from "@/lib/content";
import { formatDate } from "@/lib/format";
import type { Localized } from "@/lib/i18n-data";
import { localizedAttrs, rtlAttrs } from "@/lib/text";

// Every list that submitted for the election, from the Central Elections
// Committee's pages: compactly on /elections (ListsTable), and in full with
// each roster on /elections/lists (ListRosters). The page passes the data-text
// cache (`loc`: list and party names) and the site's transliterations of
// people's names (`names`), so these stay free of the DB.
type Props = {
  lists: SubmittedList[];
  loc: (he: string | null | undefined) => Localized;
  names: Map<string, { text: string }>;
};

// The head is candidate 1: an official spelling or the site's transliteration
// when there is one, else the name as the list's CEC page gives it.
function headOf(l: SubmittedList, locale: string, names: Props["names"]): string {
  const first = l.candidates?.[0];
  const shown = first ? candidateName(first, locale, names) : undefined;
  return shown && shown !== first!.he ? shown : (l.head?.he ?? "");
}

// Letters, name and head, in the committee's order; each row's source is the
// list's CEC page. A list with a card on /elections links to it.
export function ListsTable({ lists, loc, names }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <TableFrame>
      <table className="w-full text-sm">
        <thead className="bg-surface-sunken text-xs text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 text-start font-medium">{t("election.colLetters")}</th>
            <th scope="col" className="px-3 py-2 text-start font-medium">{t("election.colList")}</th>
            <th scope="col" className="px-3 py-2 text-start font-medium">{t("election.colHead")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {lists.map((l) => {
            const name = loc(l.name.he);
            const head = headOf(l, locale, names);
            return (
              <tr key={l.listNumber} className="align-top">
                <td className="whitespace-nowrap px-3 py-1.5 font-bold" dir="rtl" lang="he">
                  {l.letters}
                </td>
                <td className="px-3 py-1.5">
                  {l.slug ? (
                    <a href={`#list-${l.slug}`} className="underline hover:text-accent-ink" {...localizedAttrs(name)}>
                      {name.text}
                    </a>
                  ) : (
                    <span {...localizedAttrs(name)}>{name.text}</span>
                  )}{" "}
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted underline"
                    title={t("party.cecPage")}
                    aria-label={t("party.cecPage")}
                  >
                    ↗
                  </a>
                </td>
                <td className="px-3 py-1.5">
                  <span {...rtlAttrs(head)}>{head}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableFrame>
  );
}

// One section per list, id "list-<the committee's number>" so a link to a list
// stays stable: its letters and name, head, submitting parties, the full roster
// as the committee prints it (surname first; on a joint list, each candidate's
// party), and the list's own CEC page with the date the committee updated it.
export function ListRosters({ lists, loc, names }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <div className="divide-y divide-line rounded-card border border-line bg-surface">
      {lists.map((l) => {
        const name = loc(l.name.he);
        const head = headOf(l, locale, names);
        const roster = l.candidates ?? [];
        return (
          <section key={l.listNumber} id={`list-${l.listNumber}`} className="scroll-mt-24 space-y-2 p-4 sm:p-5">
            <SectionHeading as="h2" variant="md">
              <span dir="rtl" lang="he" className="me-2 inline-block rounded-chip bg-surface-sunken px-1.5 font-bold">
                {l.letters}
              </span>
              <span {...localizedAttrs(name)}>{name.text}</span>
            </SectionHeading>
            <div className="space-y-0.5 text-sm">
              {head && (
                <p>
                  <span className="text-muted">{t("election.colHead")}: </span>
                  <span {...rtlAttrs(head)}>{head}</span>
                </p>
              )}
              {l.submittedBy && l.submittedBy.length > 0 && (
                <p>
                  <span className="text-muted">{t("election.colSubmittedBy")}: </span>
                  {l.submittedBy.map((b, k) => (
                    <span key={b}>
                      {k > 0 && " · "}
                      <span {...localizedAttrs(loc(b))}>{loc(b).text}</span>
                    </span>
                  ))}
                </p>
              )}
            </div>
            {roster.length > 0 && (
              <details open={roster.length <= 8}>
                <summary className="w-fit cursor-pointer py-1 text-sm font-medium text-accent-ink">
                  {t("election.rosterCount", { n: roster.length })}
                </summary>
                <ol className="mt-1 list-decimal gap-x-10 ps-8 text-sm leading-6 sm:columns-2 lg:columns-3 [&>li]:break-inside-avoid">
                  {roster.map((c, i) => {
                    const shown = candidateName(c, locale, names);
                    return (
                      <li key={i}>
                        <span {...rtlAttrs(shown)}>{shown}</span>
                        {c.party && (
                          <span className="text-muted">
                            {" · "}
                            <span {...localizedAttrs(loc(c.party))}>{loc(c.party).text}</span>
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </details>
            )}
            <p className="text-xs text-muted">
              {t("common.source")}:{" "}
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-accent-ink">
                {t("party.cecPage")}
              </a>
              {l.updated && (
                <>
                  {" · "}
                  {t("election.pageUpdated", { date: formatDate(l.updated, locale) })}
                </>
              )}
            </p>
          </section>
        );
      })}
    </div>
  );
}
