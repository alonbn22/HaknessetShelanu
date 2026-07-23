// Client-safe translations of official Knesset terms the API only gives in Hebrew:
// duties, ministries, main standing committees. Unknown values fall back to the
// Hebrew original, flagged rtl. No node:fs — safe to import from client components.

import { isHebrew } from "./text";

type Loc = "he" | "en" | "ar" | "ru";
type T = { en: string; ar: string; ru: string };

export type GovTerm = { text: string; rtl: boolean };

// ---------- duties / roles (KNS position descriptions) ----------
const DUTIES: Record<string, T> = {
  "ראש הממשלה": { en: "Prime Minister", ar: "رئيس الوزراء", ru: "Премьер-министр" },
  "סגן ראש הממשלה": {
    en: "Deputy Prime Minister",
    ar: "نائب رئيس الوزراء",
    ru: "Заместитель премьер-министра",
  },
  שר: { en: "Minister", ar: "وزير", ru: "Министр" },
  שרה: { en: "Minister", ar: "وزيرة", ru: "Министр" },
  "סגן שר": { en: "Deputy Minister", ar: "نائب وزير", ru: "Заместитель министра" },
  "סגנית שר": { en: "Deputy Minister", ar: "نائبة وزير", ru: "Заместитель министра" },
  "חבר הכנסת": { en: "Member of Knesset", ar: "عضو الكنيست", ru: "Депутат Кнессета" },
  "חברת הכנסת": { en: "Member of Knesset", ar: "عضو الكنيست", ru: "Депутат Кнессета" },
  "חבר/ת סיעה": { en: "Faction member", ar: "عضو كتلة", ru: "Член фракции" },
  "חבר ועדה": { en: "Committee member", ar: "عضو لجنة", ru: "Член комитета" },
  "חברת ועדה": { en: "Committee member", ar: "عضو لجنة", ru: "Член комитета" },
  'יו"ר ועדה': { en: "Committee chair", ar: "رئيس لجنة", ru: "Председатель комитета" },
  'יו"ר סיעה': { en: "Faction chair", ar: "رئيس كتلة", ru: "Председатель фракции" },
  "יושב–ראש הכנסת": {
    en: "Speaker of the Knesset",
    ar: "رئيس الكنيست",
    ru: "Спикер Кнессета",
  },
  "יושב–ראש הקואליציה": {
    en: "Coalition chairperson",
    ar: "رئيس الائتلاف",
    ru: "Председатель коалиции",
  },
  "סגן יושב-ראש הכנסת": {
    en: "Deputy Speaker of the Knesset",
    ar: "نائب رئيس الكنيست",
    ru: "Заместитель спикера Кнессета",
  },
  "סגנית יושב-ראש הכנסת": {
    en: "Deputy Speaker of the Knesset",
    ar: "نائبة رئيس الكنيست",
    ru: "Заместитель спикера Кнессета",
  },
  "ראש האופוזיציה": {
    en: "Leader of the Opposition",
    ar: "رئيس المعارضة",
    ru: "Лидер оппозиции",
  },
  'מ"מ חבר ועדה': {
    en: "Alternate committee member",
    ar: "عضو لجنة بديل",
    ru: "Заместитель члена комитета",
  },
};

// ---------- government ministries ----------
const MINISTRIES: Record<string, T> = {
  "משרד ראש הממשלה": {
    en: "Prime Minister's Office",
    ar: "مكتب رئيس الوزراء",
    ru: "Канцелярия премьер-министра",
  },
  "משרד האוצר": { en: "Ministry of Finance", ar: "وزارة المالية", ru: "Министерство финансов" },
  "משרד הביטחון": { en: "Ministry of Defense", ar: "وزارة الأمن", ru: "Министерство обороны" },
  "משרד החוץ": {
    en: "Ministry of Foreign Affairs",
    ar: "وزارة الخارجية",
    ru: "Министерство иностранных дел",
  },
  "משרד החינוך": {
    en: "Ministry of Education",
    ar: "وزارة التربية والتعليم",
    ru: "Министерство образования",
  },
  "משרד המשפטים": {
    en: "Ministry of Justice",
    ar: "وزارة العدل",
    ru: "Министерство юстиции",
  },
  "משרד הבריאות": {
    en: "Ministry of Health",
    ar: "وزارة الصحة",
    ru: "Министерство здравоохранения",
  },
  "המשרד לביטחון לאומי": {
    en: "Ministry of National Security",
    ar: "وزارة الأمن القومي",
    ru: "Министерство национальной безопасности",
  },
  "המשרד להגנת הסביבה": {
    en: "Ministry of Environmental Protection",
    ar: "وزارة حماية البيئة",
    ru: "Министерство охраны окружающей среды",
  },
  "המשרד לשוויון חברתי וקידום מעמד האישה": {
    en: "Ministry of Social Equality and the Advancement of Women",
    ar: "وزارة المساواة الاجتماعية والنهوض بمكانة المرأة",
    ru: "Министерство социального равенства и улучшения положения женщин",
  },
  "המשרד לשירותי דת": {
    en: "Ministry of Religious Services",
    ar: "وزارة الخدمات الدينية",
    ru: "Министерство по делам религий",
  },
  "המשרד לשיתוף פעולה אזורי": {
    en: "Ministry of Regional Cooperation",
    ar: "وزارة التعاون الإقليمي",
    ru: "Министерство регионального сотрудничества",
  },
  "משרד האנרגיה והתשתיות": {
    en: "Ministry of Energy and Infrastructure",
    ar: "وزارة الطاقة والبنى التحتية",
    ru: "Министерство энергетики и инфраструктуры",
  },
  "משרד הבינוי והשיכון": {
    en: "Ministry of Construction and Housing",
    ar: "وزارة البناء والإسكان",
    ru: "Министерство строительства и жилья",
  },
  "משרד ההתיישבות והמשימות הלאומיות": {
    en: "Ministry of Settlements and National Missions",
    ar: "وزارة الاستيطان والمهام الوطنية",
    ru: "Министерство по делам поселений и национальных задач",
  },
  "משרד החדשנות, המדע והטכנולוגיה": {
    en: "Ministry of Innovation, Science and Technology",
    ar: "وزارة الابتكار والعلوم والتكنولوجيا",
    ru: "Министерство инноваций, науки и технологий",
  },
  "משרד החקלאות וביטחון המזון": {
    en: "Ministry of Agriculture and Food Security",
    ar: "وزارة الزراعة والأمن الغذائي",
    ru: "Министерство сельского хозяйства и продовольственной безопасности",
  },
  "משרד הכלכלה והתעשייה": {
    en: "Ministry of Economy and Industry",
    ar: "وزارة الاقتصاد والصناعة",
    ru: "Министерство экономики и промышленности",
  },
  "משרד המורשת": { en: "Ministry of Heritage", ar: "وزارة التراث", ru: "Министерство наследия" },
  "משרד הנגב, הגליל והחוסן הלאומי": {
    en: "Ministry of the Negev, the Galilee and National Resilience",
    ar: "وزارة النقب والجليل والمناعة الوطنية",
    ru: "Министерство Негева, Галилеи и национальной устойчивости",
  },
  "משרד העבודה": { en: "Ministry of Labor", ar: "وزارة العمل", ru: "Министерство труда" },
  "משרד העלייה והקליטה": {
    en: "Ministry of Aliyah and Integration",
    ar: "وزارة الهجرة والاستيعاب",
    ru: "Министерство алии и интеграции",
  },
  "משרד הקשר בין הממשלה לכנסת": {
    en: "Ministry for Liaison between the Government and the Knesset",
    ar: "وزارة التنسيق بين الحكومة والكنيست",
    ru: "Министерство по связям между правительством и Кнессетом",
  },
  "משרד הרווחה והביטחון החברתי": {
    en: "Ministry of Welfare and Social Affairs",
    ar: "وزارة الرفاه والأمن الاجتماعي",
    ru: "Министерство социального обеспечения",
  },
  "משרד התחבורה והבטיחות בדרכים": {
    en: "Ministry of Transport and Road Safety",
    ar: "وزارة المواصلات وأمان الطرق",
    ru: "Министерство транспорта и безопасности дорожного движения",
  },
  "משרד התיירות": { en: "Ministry of Tourism", ar: "وزارة السياحة", ru: "Министерство туризма" },
  "משרד התפוצות והמאבק באנטישמיות": {
    en: "Ministry of Diaspora Affairs and Combating Antisemitism",
    ar: "وزارة شؤون الشتات ومكافحة معاداة السامية",
    ru: "Министерство по делам диаспоры и борьбе с антисемитизмом",
  },
  "משרד התקשורת": {
    en: "Ministry of Communications",
    ar: "وزارة الاتصالات",
    ru: "Министерство связи",
  },
  "משרד התרבות והספורט": {
    en: "Ministry of Culture and Sport",
    ar: "وزارة الثقافة والرياضة",
    ru: "Министерство культуры и спорта",
  },
  "משרד ירושלים ומסורת ישראל": {
    en: "Ministry of Jerusalem and Jewish Tradition",
    ar: "وزارة القدس وتراث إسرائيل",
    ru: "Министерство Иерусалима и еврейских традиций",
  },
};

// ---------- main standing committees ----------
const COMMITTEES: Record<string, T> = {
  "ועדת הכנסת": { en: "House Committee", ar: "لجنة الكنيست", ru: "Комитет Кнессета" },
  "ועדת הכספים": { en: "Finance Committee", ar: "لجنة المالية", ru: "Финансовая комиссия" },
  "ועדת החוץ והביטחון": {
    en: "Foreign Affairs and Defense Committee",
    ar: "لجنة الخارجية والأمن",
    ru: "Комиссия по иностранным делам и обороне",
  },
  "ועדת החוקה, חוק ומשפט": {
    en: "Constitution, Law and Justice Committee",
    ar: "لجنة الدستور والقانون والقضاء",
    ru: "Комиссия по конституции, законодательству и юстиции",
  },
  "ועדת הכלכלה": {
    en: "Economic Affairs Committee",
    ar: "لجنة الاقتصاد",
    ru: "Экономическая комиссия",
  },
  "ועדת החינוך התרבות והספורט": {
    en: "Education, Culture and Sport Committee",
    ar: "لجنة التربية والثقافة والرياضة",
    ru: "Комиссия по образованию, культуре и спорту",
  },
  "ועדת החינוך, התרבות והספורט": {
    en: "Education, Culture and Sport Committee",
    ar: "لجنة التربية والثقافة والرياضة",
    ru: "Комиссия по образованию, культуре и спорту",
  },
  "ועדת הבריאות": { en: "Health Committee", ar: "لجنة الصحة", ru: "Комиссия по здравоохранению" },
  "ועדת המדע והטכנולוגיה": {
    en: "Science and Technology Committee",
    ar: "لجنة العلوم والتكنولوجيا",
    ru: "Комиссия по науке и технологиям",
  },
  "ועדת האתיקה": { en: "Ethics Committee", ar: "لجنة الأخلاقيات", ru: "Комиссия по этике" },
  "ועדת הפנים והגנת הסביבה": {
    en: "Interior and Environment Committee",
    ar: "لجنة الداخلية وحماية البيئة",
    ru: "Комиссия по внутренним делам и охране окружающей среды",
  },
  "הוועדה לביטחון לאומי": {
    en: "National Security Committee",
    ar: "لجنة الأمن القومي",
    ru: "Комиссия по национальной безопасности",
  },
  "הוועדה לקידום מעמד האישה ולשוויון מגדרי": {
    en: "Committee on the Status of Women and Gender Equality",
    ar: "لجنة النهوض بمكانة المرأة والمساواة الجندرية",
    ru: "Комиссия по положению женщин и гендерному равенству",
  },
  "הוועדה לענייני ביקורת המדינה": {
    en: "State Control Committee",
    ar: "لجنة مراقبة الدولة",
    ru: "Комиссия по государственному контролю",
  },
  "הוועדה המסדרת": {
    en: "Arrangements Committee",
    ar: "اللجنة المنظِّمة",
    ru: "Организационная комиссия",
  },
  "הוועדה המיוחדת לפניות הציבור": {
    en: "Special Committee for Public Petitions",
    ar: "اللجنة الخاصة لشكاوى الجمهور",
    ru: "Специальная комиссия по обращениям граждан",
  },
  "הוועדה המיוחדת לזכויות הילד": {
    en: "Special Committee for the Rights of the Child",
    ar: "اللجنة الخاصة لحقوق الطفل",
    ru: "Специальная комиссия по правам ребёнка",
  },
  "הוועדה המיוחדת למאבק בשימוש בסמים ובאלכוהול": {
    en: "Special Committee on Drug and Alcohol Abuse",
    ar: "اللجنة الخاصة لمكافحة تعاطي المخدرات والكحول",
    ru: "Специальная комиссия по борьбе с наркоманией и алкоголизмом",
  },
  "הוועדה המיוחדת לעובדים זרים": {
    en: "Special Committee for Foreign Workers",
    ar: "اللجنة الخاصة للعمال الأجانب",
    ru: "Специальная комиссия по иностранным работникам",
  },
};

// ---------- vote item types (KNS vote item_type_desc) ----------
const VOTE_ITEM_TYPES: Record<string, T> = {
  "הצעת חוק": { en: "Bill", ar: "مشروع قانون", ru: "Законопроект" },
  "הצעה לסדר היום": {
    en: "Agenda motion",
    ar: "اقتراح لجدول الأعمال",
    ru: "Предложение к повестке дня",
  },
  "פעולה על פי חוק": {
    en: "Statutory action",
    ar: "إجراء بموجب القانون",
    ru: "Действие согласно закону",
  },
  "פריטי מליאה": { en: "Plenum item", ar: "بند الهيئة العامة", ru: "Пункт пленума" },
};

function localize(map: Record<string, T>, he: string | null | undefined, locale: string): GovTerm {
  const key = (he ?? "").trim();
  if (!key) return { text: "", rtl: false };
  if (locale === "he") return { text: he as string, rtl: true };
  const t = map[key];
  const text = t ? t[locale as Exclude<Loc, "he">] ?? (he as string) : (he as string);
  return { text, rtl: isHebrew(text) };
}

export const govDuty = (he: string | null | undefined, locale: string): GovTerm =>
  localize(DUTIES, he, locale);
export const govMinistry = (he: string | null | undefined, locale: string): GovTerm =>
  localize(MINISTRIES, he, locale);
export const govCommittee = (he: string | null | undefined, locale: string): GovTerm =>
  localize(COMMITTEES, he, locale);
export const govVoteItemType = (he: string | null | undefined, locale: string): GovTerm =>
  localize(VOTE_ITEM_TYPES, he, locale);

// Free-text data names are localized via the unified cache in i18n-data.ts, which
// layers these curated govCommittee() translations on top for standing committees.
