import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { tidy, isoBirthDate, toRows, type MkDetails } from "../../scripts/sync/knesset-bio";
import { MemberBio, bioField, knessetPageUrl } from "../../src/app/[locale]/members/[id]/MemberBio";
import type { KnessetBioRow } from "../../src/lib/queries";
import type { Localized } from "../../src/lib/i18n-data";

// The member page's background block comes from the Knesset's own member page.
// The sample is a real GetMkDetailsContent response (site code 90, he/en/ar/ru,
// fetched 30 Sep 2026 and checked against the live API on 2 Oct 2026): only what
// that page shows the public, with the long biography essay (`Content`, unused)
// emptied.
const sample = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "tests/qa/fixtures/knesset-mk-90.json"), "utf8"),
) as Record<string, MkDetails>;
const rows = toRows(90, sample, "2026-09-30T00:00:00.000Z") as KnessetBioRow[];
const row = (lang: string) => rows.find((r) => r.lang === lang)!;
const messages = (lang: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), `messages/${lang}.json`), "utf8"));

test("the saved response holds only the member page's public fields", () => {
  const PUBLIC = new Set([
    "ID", "DateOfBirth", "DeathDate", "PlaceOfBirth", "ImmigrationYear", "Residence", "Education",
    "MilitaryService", "NationalService", "profession", "Languages", "Content", "PlenumSeatNumber",
    "IsCurrentMk", "ProfessionsDetails",
  ]);
  for (const [lang, r] of Object.entries(sample)) {
    for (const key of Object.keys(r!)) assert.ok(PUBLIC.has(key), `${lang}: unexpected field ${key}`);
    assert.doesNotMatch(JSON.stringify(r), /@|\d{2,3}-\d{6,7}|https?:/, `${lang}: contact details or links`);
  }
});

test("tidy: decodes entities, one item per line, no list dashes or blanks", () => {
  assert.equal(tidy(sample.he!.Education), "תואר ראשון בארכיטקטורה\nתואר שני במינהל עסקים");
  assert.equal(tidy(" - BA, Ben-Gurion University\n -\tCertificate,  Bar-Ilan \n - "), "BA, Ben-Gurion University\nCertificate, Bar-Ilan");
  assert.equal(tidy("a &amp; b&#x0D;\n&#8211; c"), "a & b\nc");
  assert.equal(tidy("-"), null);
  assert.equal(tidy("  "), null);
  assert.equal(tidy(null), null);
});

test("isoBirthDate reads the Hebrew page's dd/mm/yyyy and nothing else", () => {
  assert.equal(isoBirthDate(sample.he!.DateOfBirth), "1949-10-21");
  assert.equal(isoBirthDate("1/2/1990"), "1990-02-01");
  assert.equal(isoBirthDate(sample.en!.DateOfBirth), null);
  assert.equal(isoBirthDate(" , "), null); // no date on the page
  assert.equal(isoBirthDate("31/02/1990"), null);
  assert.equal(isoBirthDate("01/13/1990"), null);
});

test("toRows: one row per language served, in the Knesset's own words", () => {
  assert.deepEqual(rows.map((r) => r.lang), ["he", "en", "ar", "ru"]);
  for (const r of rows) {
    assert.equal(r.personId, 90);
    assert.equal(r.dateOfBirth, "1949-10-21"); // every language, from the Hebrew page
  }
  assert.equal(row("he").militaryService?.split("\n").length, 2);
  assert.equal(row("he").professions, "ניהול");
  assert.equal(row("en").birthPlace, "Tel Aviv, Israel");
  assert.equal(row("en").education, "B.A. Architecture, M.Sc., Business Management, Massachusetts Institute of Technology");
  assert.equal(row("en").professions, "Administrator");
  assert.equal(row("ru").education?.split("\n").length, 2); // "&#x0D;\n" is one break
  assert.equal(row("ar").professions, "إدارة");
});

test("toRows: a language with nothing (null, as for the newest members) gets no row", () => {
  const got = toRows(1, { he: sample.he, en: null, ar: null, ru: null }, "now");
  assert.deepEqual(got.map((r) => r.lang), ["he"]);
  assert.deepEqual(toRows(1, { he: { DateOfBirth: " , ", Education: "-" }, en: null }, "now"), []);
});

// A stand-in for the translation cache: what it has, else Hebrew (marked).
const cacheOf = (entries: Record<string, Localized>) => (he: string): Localized =>
  entries[he] ?? { text: he, translated: false, rtl: true };

test("bioField: the reader's language, else translated Hebrew, else the Knesset's English", () => {
  const none = cacheOf({});
  assert.deepEqual(bioField(rows, "professions", "en", none), [{ text: "Administrator", translated: false, rtl: false }]);
  assert.deepEqual(bioField(rows, "professions", "he", none).map((l) => l.text), ["ניהול"]);
  // es/fr: every Hebrew line translated → the translation; otherwise the Knesset's English, marked.
  const es = cacheOf({ "ניהול": { text: "Administración", translated: true, rtl: false } });
  assert.deepEqual(bioField(rows, "professions", "es", es), [{ text: "Administración", translated: true, rtl: false }]);
  assert.deepEqual(bioField(rows, "education", "es", es), [
    { text: row("en").education!, translated: false, rtl: false, lang: "en" },
  ]);
  // No English either (the newest members): the Hebrew, as the cache has it.
  const heOnly = rows.filter((r) => r.lang === "he");
  assert.deepEqual(bioField(heOnly, "professions", "fr", none), [{ text: "ניהול", translated: false, rtl: true }]);
  // Hebrew readers never get a fallback.
  assert.deepEqual(bioField(rows.filter((r) => r.lang !== "he"), "education", "he", none), []);
});

test("knessetPageUrl: the member's Knesset page in the reader's language where it exists", () => {
  const base = "https://main.knesset.gov.il/";
  assert.equal(knessetPageUrl(rows, 90, "he"), `${base}mk/apps/mk/mk-personal-details/90`);
  assert.equal(knessetPageUrl(rows, 90, "ar"), `${base}ar/mk/apps/mk/mk-personal-details/90`);
  assert.equal(knessetPageUrl(rows, 90, "fr"), `${base}en/mk/apps/mk/mk-personal-details/90`);
  assert.equal(knessetPageUrl(rows.filter((r) => r.lang === "he"), 90, "ru"), `${base}mk/apps/mk/mk-personal-details/90`);
});

const render = (locale: string, localOf = cacheOf({})) =>
  renderToStaticMarkup(
    h(NextIntlClientProvider, {
      locale,
      messages: messages(locale),
      timeZone: "Asia/Jerusalem",
      children: h(MemberBio, { rows, siteCode: 90, locale, localOf }),
    }),
  );

test("the member page's background block names the Knesset as its source, linked", () => {
  const en = render("en");
  assert.match(
    en,
    /Source: <a class="[^"]*" href="https:\/\/main\.knesset\.gov\.il\/en\/mk\/apps\/mk\/mk-personal-details\/90" target="_blank" rel="noopener noreferrer">the Knesset \(member page\)<\/a>/,
  );
  assert.match(en, /Captain in elite unit/);
  assert.doesNotMatch(en, /wikidata/i);
  const he = render("he");
  assert.match(he, /href="https:\/\/main\.knesset\.gov\.il\/mk\/apps\/mk\/mk-personal-details\/90"/);
  const [heBefore, heAfter] = messages("he").member.bioSource.split(/<link>.*<\/link>/);
  assert.ok(he.includes(heBefore), "Hebrew source line");
  // The Knesset says members (or their staff) supply these details: the line says so.
  assert.ok(heAfter.trim() && he.includes(heAfter), "who supplied the details");
  // Spanish: no Spanish from the Knesset, so its English, marked as English.
  assert.match(render("es"), /<li dir="ltr" lang="en">Captain in elite unit<\/li>/);
  // Every language: the source line's linked words, and no Wikidata.
  for (const locale of ["he", "en", "ar", "ru", "es", "fr"]) {
    const html = render(locale);
    const linked = /<link>(.*)<\/link>/.exec(messages(locale).member.bioSource)![1];
    assert.match(html, new RegExp(`mk-personal-details/90" target="_blank" rel="noopener noreferrer">${linked.replace(/[()]/g, "\\$&")}</a>`), locale);
    assert.doesNotMatch(html, /wikidata/i, locale);
  }
});
