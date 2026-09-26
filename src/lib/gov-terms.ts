// Client-safe translations of official Knesset terms the API only gives in Hebrew:
// duties, ministries, main standing committees. Unknown values fall back to the
// Hebrew original, flagged rtl. No node:fs — safe to import from client components.

import { isHebrew } from "./text";

type Loc = "he" | "en" | "ar" | "ru" | "es" | "fr";
type T = { en: string; ar: string; ru: string };

// Spanish and French for every term below, keyed by the English wording so
// the three curated maps stay as they are. A missing key falls back to English.
const LATIN: Record<string, { es: string; fr: string }> = {
  "Prime Minister": { es: "Primer ministro", fr: "Premier ministre" },
  "Deputy Prime Minister": { es: "Viceprimer ministro", fr: "Vice-Premier ministre" },
  Minister: { es: "Ministro/a", fr: "Ministre" },
  "Deputy Minister": { es: "Viceministro/a", fr: "Vice-ministre" },
  "Member of Knesset": { es: "Miembro de la Knéset", fr: "Député(e) à la Knesset" },
  "Faction member": { es: "Miembro de la facción", fr: "Membre de la faction" },
  "Committee member": { es: "Miembro de la comisión", fr: "Membre de la commission" },
  "Committee chair": { es: "Presidente/a de la comisión", fr: "Président(e) de la commission" },
  "Faction chair": { es: "Presidente/a de la facción", fr: "Président(e) de la faction" },
  "Speaker of the Knesset": { es: "Presidente/a de la Knéset", fr: "Président(e) de la Knesset" },
  "Coalition chairperson": { es: "Presidente/a de la coalición", fr: "Président(e) de la coalition" },
  "Deputy Speaker of the Knesset": { es: "Vicepresidente/a de la Knéset", fr: "Vice-président(e) de la Knesset" },
  "Leader of the Opposition": { es: "Líder de la oposición", fr: "Chef de l’opposition" },
  "Alternate committee member": { es: "Miembro suplente de la comisión", fr: "Membre suppléant de la commission" },
  "Prime Minister's Office": { es: "Oficina del Primer Ministro", fr: "Cabinet du Premier ministre" },
  "Ministry of Finance": { es: "Ministerio de Finanzas", fr: "Ministère des Finances" },
  "Ministry of Defense": { es: "Ministerio de Defensa", fr: "Ministère de la Défense" },
  "Ministry of Foreign Affairs": { es: "Ministerio de Asuntos Exteriores", fr: "Ministère des Affaires étrangères" },
  "Ministry of Education": { es: "Ministerio de Educación", fr: "Ministère de l’Éducation" },
  "Ministry of Justice": { es: "Ministerio de Justicia", fr: "Ministère de la Justice" },
  "Ministry of Health": { es: "Ministerio de Salud", fr: "Ministère de la Santé" },
  "Ministry of National Security": { es: "Ministerio de Seguridad Nacional", fr: "Ministère de la Sécurité nationale" },
  "Ministry of Environmental Protection": { es: "Ministerio de Protección Ambiental", fr: "Ministère de la Protection de l’environnement" },
  "Ministry of Social Equality and the Advancement of Women": { es: "Ministerio de Igualdad Social y Promoción de la Mujer", fr: "Ministère de l’Égalité sociale et de la Promotion des femmes" },
  "Ministry of Religious Services": { es: "Ministerio de Servicios Religiosos", fr: "Ministère des Services religieux" },
  "Ministry of Regional Cooperation": { es: "Ministerio de Cooperación Regional", fr: "Ministère de la Coopération régionale" },
  "Ministry of Energy and Infrastructure": { es: "Ministerio de Energía e Infraestructuras", fr: "Ministère de l’Énergie et des Infrastructures" },
  "Ministry of Construction and Housing": { es: "Ministerio de Construcción y Vivienda", fr: "Ministère de la Construction et du Logement" },
  "Ministry of Settlements and National Missions": { es: "Ministerio de Asentamientos y Misiones Nacionales", fr: "Ministère des Implantations et des Missions nationales" },
  "Ministry of Innovation, Science and Technology": { es: "Ministerio de Innovación, Ciencia y Tecnología", fr: "Ministère de l’Innovation, de la Science et de la Technologie" },
  "Ministry of Agriculture and Food Security": { es: "Ministerio de Agricultura y Seguridad Alimentaria", fr: "Ministère de l’Agriculture et de la Sécurité alimentaire" },
  "Ministry of Economy and Industry": { es: "Ministerio de Economía e Industria", fr: "Ministère de l’Économie et de l’Industrie" },
  "Ministry of Heritage": { es: "Ministerio de Patrimonio", fr: "Ministère du Patrimoine" },
  "Ministry of the Negev, the Galilee and National Resilience": { es: "Ministerio del Néguev, Galilea y Resiliencia Nacional", fr: "Ministère du Néguev, de la Galilée et de la Résilience nationale" },
  "Ministry of Labor": { es: "Ministerio de Trabajo", fr: "Ministère du Travail" },
  "Ministry of Aliyah and Integration": { es: "Ministerio de Aliá e Integración", fr: "Ministère de l’Alyah et de l’Intégration" },
  "Ministry for Liaison between the Government and the Knesset": { es: "Ministerio de Enlace entre el Gobierno y la Knéset", fr: "Ministère de la Liaison entre le gouvernement et la Knesset" },
  "Ministry of Welfare and Social Affairs": { es: "Ministerio de Bienestar y Asuntos Sociales", fr: "Ministère des Affaires sociales" },
  "Ministry of Transport and Road Safety": { es: "Ministerio de Transporte y Seguridad Vial", fr: "Ministère des Transports et de la Sécurité routière" },
  "Ministry of Tourism": { es: "Ministerio de Turismo", fr: "Ministère du Tourisme" },
  "Ministry of Diaspora Affairs and Combating Antisemitism": { es: "Ministerio de Asuntos de la Diáspora y Lucha contra el Antisemitismo", fr: "Ministère des Affaires de la diaspora et de la Lutte contre l’antisémitisme" },
  "Ministry of Communications": { es: "Ministerio de Comunicaciones", fr: "Ministère des Communications" },
  "Ministry of Culture and Sport": { es: "Ministerio de Cultura y Deporte", fr: "Ministère de la Culture et des Sports" },
  "Ministry of Jerusalem and Jewish Tradition": { es: "Ministerio de Jerusalén y Tradición Judía", fr: "Ministère de Jérusalem et de la Tradition juive" },
  "House Committee": { es: "Comisión de la Cámara", fr: "Commission de la Knesset" },
  "Finance Committee": { es: "Comisión de Finanzas", fr: "Commission des Finances" },
  "Foreign Affairs and Defense Committee": { es: "Comisión de Asuntos Exteriores y Defensa", fr: "Commission des Affaires étrangères et de la Défense" },
  "Constitution, Law and Justice Committee": { es: "Comisión de Constitución, Ley y Justicia", fr: "Commission de la Constitution, du Droit et de la Justice" },
  "Economic Affairs Committee": { es: "Comisión de Economía", fr: "Commission de l’Économie" },
  "Education, Culture and Sport Committee": { es: "Comisión de Educación, Cultura y Deporte", fr: "Commission de l’Éducation, de la Culture et des Sports" },
  "Health Committee": { es: "Comisión de Salud", fr: "Commission de la Santé" },
  "Science and Technology Committee": { es: "Comisión de Ciencia y Tecnología", fr: "Commission de la Science et de la Technologie" },
  "Ethics Committee": { es: "Comisión de Ética", fr: "Commission d’éthique" },
  "Interior and Environment Committee": { es: "Comisión de Interior y Medio Ambiente", fr: "Commission de l’Intérieur et de l’Environnement" },
  "National Security Committee": { es: "Comisión de Seguridad Nacional", fr: "Commission de la Sécurité nationale" },
  "Committee on the Status of Women and Gender Equality": { es: "Comisión para el Estatus de la Mujer y la Igualdad de Género", fr: "Commission de la Condition de la femme et de l’Égalité des genres" },
  "State Control Committee": { es: "Comisión de Control del Estado", fr: "Commission du Contrôle de l’État" },
  "Arrangements Committee": { es: "Comisión Organizadora", fr: "Commission d’organisation" },
  "Special Committee for Public Petitions": { es: "Comisión Especial de Peticiones Públicas", fr: "Commission spéciale des pétitions publiques" },
  "Special Committee for the Rights of the Child": { es: "Comisión Especial de Derechos del Niño", fr: "Commission spéciale des droits de l’enfant" },
  "Special Committee on Drug and Alcohol Abuse": { es: "Comisión Especial contra el Abuso de Drogas y Alcohol", fr: "Commission spéciale de lutte contre les drogues et l’alcool" },
  "Special Committee for Foreign Workers": { es: "Comisión Especial de Trabajadores Extranjeros", fr: "Commission spéciale des travailleurs étrangers" },
  Bill: { es: "Proyecto de ley", fr: "Projet de loi" },
  "Agenda motion": { es: "Moción de orden del día", fr: "Motion à l’ordre du jour" },
  "Statutory action": { es: "Acción según la ley", fr: "Acte prévu par la loi" },
  "Plenum item": { es: "Punto del pleno", fr: "Point de la plénière" },
  "Ministry of Public Security": { es: "Ministerio de Seguridad Pública", fr: "Ministère de la Sécurité publique" },
  "Ministry of Transport, National Infrastructure and Road Safety": { es: "Ministerio de Transporte, Infraestructuras Nacionales y Seguridad Vial", fr: "Ministère des Transports, des Infrastructures nationales et de la Sécurité routière" },
  "Ministry of Home Front Defense": { es: "Ministerio de Defensa del Frente Interno", fr: "Ministère de la Défense du front intérieur" },
  "Ministry of the Interior": { es: "Ministerio del Interior", fr: "Ministère de l’Intérieur" },
  "Ministry of Public Diplomacy and Diaspora Affairs": { es: "Ministerio de Diplomacia Pública y Asuntos de la Diáspora", fr: "Ministère de la Diplomatie publique et des Affaires de la diaspora" },
  "Ministry of National Infrastructure": { es: "Ministerio de Infraestructuras Nacionales", fr: "Ministère des Infrastructures nationales" },
  "Ministry of Immigrant Absorption": { es: "Ministerio de Absorción de Inmigrantes", fr: "Ministère de l’Intégration des immigrants" },
  "Ministry of Agriculture and Rural Development": { es: "Ministerio de Agricultura y Desarrollo Rural", fr: "Ministère de l’Agriculture et du Développement rural" },
  "Ministry of Transport": { es: "Ministerio de Transporte", fr: "Ministère des Transports" },
  "Ministry of Religious Affairs": { es: "Ministerio de Asuntos Religiosos", fr: "Ministère des Affaires religieuses" },
  "Ministry of Education, Culture and Sport": { es: "Ministerio de Educación, Cultura y Deporte", fr: "Ministère de l’Éducation, de la Culture et des Sports" },
  "Ministry of Science": { es: "Ministerio de Ciencia", fr: "Ministère de la Science" },
  "Ministry of Strategic Affairs": { es: "Ministerio de Asuntos Estratégicos", fr: "Ministère des Affaires stratégiques" },
  "Ministry of Welfare and Social Services": { es: "Ministerio de Bienestar y Servicios Sociales", fr: "Ministère de la Protection sociale et des Services sociaux" },
  "Ministry for Social Equality": { es: "Ministerio de Igualdad Social", fr: "Ministère de l’Égalité sociale" },
  "Ministry of Science and Technology": { es: "Ministerio de Ciencia y Tecnología", fr: "Ministère de la Science et de la Technologie" },
  "Ministry of Economy": { es: "Ministerio de Economía", fr: "Ministère de l’Économie" },
  "Ministry of Labor, Social Affairs and Social Services": { es: "Ministerio de Trabajo, Asuntos Sociales y Servicios Sociales", fr: "Ministère du Travail, des Affaires sociales et des Services sociaux" },
  "Ministry for the Development of the Periphery, the Negev and the Galilee": { es: "Ministerio para el Desarrollo de la Periferia, el Néguev y Galilea", fr: "Ministère du Développement de la périphérie, du Néguev et de la Galilée" },
  "Ministry of Intelligence": { es: "Ministerio de Inteligencia", fr: "Ministère du Renseignement" },
  "Ministry of Jerusalem and Heritage": { es: "Ministerio de Jerusalén y Patrimonio", fr: "Ministère de Jérusalem et du Patrimoine" },
  "Ministry of Diaspora Affairs": { es: "Ministerio de Asuntos de la Diáspora", fr: "Ministère des Affaires de la diaspora" },
  "Ministry of Education and Culture": { es: "Ministerio de Educación y Cultura", fr: "Ministère de l’Éducation et de la Culture" },
  "Ministry of Higher and Complementary Education": { es: "Ministerio de Educación Superior y Complementaria", fr: "Ministère de l’Enseignement supérieur et complémentaire" },
  "National Digital Ministry": { es: "Ministerio Digital Nacional", fr: "Ministère national du Numérique" },
  "Ministry of Strategic Affairs and Public Diplomacy": { es: "Ministerio de Asuntos Estratégicos y Diplomacia Pública", fr: "Ministère des Affaires stratégiques et de la Diplomatie publique" },
  "Ministry of Energy": { es: "Ministerio de Energía", fr: "Ministère de l’Énergie" },
  "Alternate Prime Minister's Office": { es: "Oficina del Primer Ministro Alterno", fr: "Cabinet du Premier ministre suppléant" },
  "Ministry for Senior Citizens": { es: "Ministerio de Personas Mayores", fr: "Ministère des Personnes âgées" },
  "Ministry of Science, Technology and Space": { es: "Ministerio de Ciencia, Tecnología y Espacio", fr: "Ministère de la Science, de la Technologie et de l’Espace" },
  "Ministry of Community Empowerment and Advancement": { es: "Ministerio de Fortalecimiento y Promoción Comunitaria", fr: "Ministère du Renforcement et de la Promotion des communautés" },
  "Without portfolio": { es: "Sin cartera", fr: "Sans portefeuille" },
  "Ministry of Public Diplomacy": { es: "Ministerio de Diplomacia Pública", fr: "Ministère de la Diplomatie publique" },
  "Ministry for the Advancement of the Status of Women": { es: "Ministerio para la Promoción de la Condición de la Mujer", fr: "Ministère de la Promotion de la condition féminine" },
  "Alternate Prime Minister": { es: "Primer ministro alterno", fr: "Premier ministre suppléant" },
  "Vice Prime Minister": { es: "Vice primer ministro", fr: "Vice-Premier ministre" },
};

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
  "ראש הממשלה החילופי": { en: "Alternate Prime Minister", ar: "رئيس الوزراء البديل", ru: "Альтернативный премьер-министр" },
  "יושבת–ראש הקואליציה": { en: "Coalition chairperson", ar: "رئيسة الائتلاف", ru: "Председатель коалиции" },
  "משנה לראש הממשלה": { en: "Vice Prime Minister", ar: "نائب رئيس الوزراء", ru: "Вице-премьер-министр" },
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
  "המשרד לביטחון הפנים": { en: "Ministry of Public Security", ar: "وزارة الأمن الداخلي", ru: "Министерство внутренней безопасности" },
  "משרד התחבורה, התשתיות הלאומיות והבטיחות בדרכים": { en: "Ministry of Transport, National Infrastructure and Road Safety", ar: "وزارة المواصلات والبنى التحتية الوطنية والأمان على الطرق", ru: "Министерство транспорта, национальной инфраструктуры и безопасности дорожного движения" },
  "המשרד להגנת העורף": { en: "Ministry of Home Front Defense", ar: "وزارة حماية الجبهة الداخلية", ru: "Министерство защиты тыла" },
  "משרד הפנים": { en: "Ministry of the Interior", ar: "وزارة الداخلية", ru: "Министерство внутренних дел" },
  "משרד ההסברה והתפוצות": { en: "Ministry of Public Diplomacy and Diaspora Affairs", ar: "وزارة الإعلام وشؤون الشتات", ru: "Министерство информации и по делам диаспоры" },
  "משרד התשתיות הלאומיות": { en: "Ministry of National Infrastructure", ar: "وزارة البنى التحتية الوطنية", ru: "Министерство национальной инфраструктуры" },
  "המשרד לקליטת עלייה": { en: "Ministry of Immigrant Absorption", ar: "وزارة استيعاب الهجرة", ru: "Министерство абсорбции" },
  "משרד החקלאות ופיתוח הכפר": { en: "Ministry of Agriculture and Rural Development", ar: "وزارة الزراعة والتنمية الريفية", ru: "Министерство сельского хозяйства и развития села" },
  "משרד התחבורה": { en: "Ministry of Transport", ar: "وزارة المواصلات", ru: "Министерство транспорта" },
  "המשרד לענייני דתות": { en: "Ministry of Religious Affairs", ar: "وزارة الشؤون الدينية", ru: "Министерство по делам религий" },
  "משרד החינוך, התרבות והספורט": { en: "Ministry of Education, Culture and Sport", ar: "وزارة التربية والتعليم والثقافة والرياضة", ru: "Министерство образования, культуры и спорта" },
  "משרד המדע": { en: "Ministry of Science", ar: "وزارة العلوم", ru: "Министерство науки" },
  "המשרד לנושאים אסטרטגיים": { en: "Ministry of Strategic Affairs", ar: "وزارة الشؤون الاستراتيجية", ru: "Министерство по стратегическим вопросам" },
  "המשרד לעניינים אסטרטגיים": { en: "Ministry of Strategic Affairs", ar: "وزارة الشؤون الاستراتيجية", ru: "Министерство по стратегическим вопросам" },
  "משרד הרווחה והשירותים החברתיים": { en: "Ministry of Welfare and Social Services", ar: "وزارة الرفاه والخدمات الاجتماعية", ru: "Министерство социального обеспечения и социальных услуг" },
  "המשרד לשוויון חברתי": { en: "Ministry for Social Equality", ar: "وزارة المساواة الاجتماعية", ru: "Министерство социального равенства" },
  "משרד המדע והטכנולוגיה": { en: "Ministry of Science and Technology", ar: "وزارة العلوم والتكنولوجيا", ru: "Министерство науки и технологий" },
  "משרד הכלכלה": { en: "Ministry of Economy", ar: "وزارة الاقتصاد", ru: "Министерство экономики" },
  "משרד העבודה, הרווחה והשירותים החברתיים": { en: "Ministry of Labor, Social Affairs and Social Services", ar: "وزارة العمل والرفاه والخدمات الاجتماعية", ru: "Министерство труда, социального обеспечения и социальных услуг" },
  "המשרד לפיתוח הפריפריה, הנגב והגליל": { en: "Ministry for the Development of the Periphery, the Negev and the Galilee", ar: "وزارة تطوير الضواحي والنقب والجليل", ru: "Министерство развития периферии, Негева и Галилеи" },
  "משרד המודיעין": { en: "Ministry of Intelligence", ar: "وزارة الاستخبارات", ru: "Министерство разведки" },
  "משרד ירושלים ומורשת": { en: "Ministry of Jerusalem and Heritage", ar: "وزارة القدس والتراث", ru: "Министерство по делам Иерусалима и наследия" },
  "משרד התפוצות": { en: "Ministry of Diaspora Affairs", ar: "وزارة شؤون الشتات", ru: "Министерство по делам диаспоры" },
  "משרד החינוך והתרבות": { en: "Ministry of Education and Culture", ar: "وزارة التربية والتعليم والثقافة", ru: "Министерство образования и культуры" },
  "משרד ההשכלה הגבוהה והמשלימה": { en: "Ministry of Higher and Complementary Education", ar: "وزارة التعليم العالي والتكميلي", ru: "Министерство высшего и дополнительного образования" },
  "משרד הדיגיטל הלאומי": { en: "National Digital Ministry", ar: "وزارة الرقمنة الوطنية", ru: "Министерство национальной цифровизации" },
  "המשרד לנושאים אסטרטגיים והסברה": { en: "Ministry of Strategic Affairs and Public Diplomacy", ar: "وزارة الشؤون الاستراتيجية والإعلام", ru: "Министерство по стратегическим вопросам и информации" },
  "משרד האנרגיה": { en: "Ministry of Energy", ar: "وزارة الطاقة", ru: "Министерство энергетики" },
  "משרד ראש הממשלה החלופי": { en: "Alternate Prime Minister's Office", ar: "مكتب رئيس الوزراء البديل", ru: "Канцелярия альтернативного премьер-министра" },
  "המשרד לאזרחים ותיקים": { en: "Ministry for Senior Citizens", ar: "وزارة المواطنين المسنين", ru: "Министерство по делам пожилых граждан" },
  "משרד המדע, הטכנולוגיה והחלל": { en: "Ministry of Science, Technology and Space", ar: "وزارة العلوم والتكنولوجيا والفضاء", ru: "Министерство науки, технологий и космоса" },
  "המשרד לחיזוק ולקידום קהילתי": { en: "Ministry of Community Empowerment and Advancement", ar: "وزارة تمكين المجتمع والنهوض به", ru: "Министерство по укреплению и развитию общин" },
  "בלי תיק": { en: "Without portfolio", ar: "بلا حقيبة", ru: "Без портфеля" },
  "משרד ההסברה": { en: "Ministry of Public Diplomacy", ar: "وزارة الإعلام", ru: "Министерство информации" },
  "המשרד לקידום מעמד האישה": { en: "Ministry for the Advancement of the Status of Women", ar: "وزارة النهوض بمكانة المرأة", ru: "Министерство по улучшению положения женщин" },
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
  if (!t) return { text: he as string, rtl: isHebrew(he as string) };
  const text =
    locale === "es" || locale === "fr"
      ? (LATIN[t.en]?.[locale] ?? t.en)
      : (t[locale as Exclude<Loc, "he" | "es" | "fr">] ?? t.en);
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

// The header/seat-card label for one office: the duty, and for a minister or
// deputy minister the ministry ("Minister · Ministry of Finance"). Null for a
// PMO "minister" row of the prime minister — that is the premiership itself.
export function officeLabel(
  row: { positionId: number; positionDescHe: string | null; govMinistryNameHe: string | null; committeeNameHe?: string | null },
  locale: string,
  opts: { isPrimeMinister?: boolean } = {},
): GovTerm | null {
  const duty = govDuty(row.positionDescHe, locale);
  if (!duty.text) return null;
  const ministerial = [39, 57, 40].includes(row.positionId);
  if (ministerial && row.govMinistryNameHe) {
    if (opts.isPrimeMinister && /ראש הממשלה/.test(row.govMinistryNameHe)) return null;
    const ministry = govMinistry(row.govMinistryNameHe, locale);
    const text = `${duty.text} · ${ministry.text}`;
    return { text, rtl: duty.rtl || ministry.rtl };
  }
  // A committee chair is named with the committee ("Committee chair · Finance Committee").
  if (row.positionId === 41 && row.committeeNameHe) {
    const committee = govCommittee(row.committeeNameHe, locale);
    return { text: `${duty.text} · ${committee.text}`, rtl: duty.rtl || committee.rtl };
  }
  return duty;
}
