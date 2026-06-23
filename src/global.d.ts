// Compile-time safety for translation keys: t("…") keys and namespaces are
// checked against the default locale's message shape. A typo or a key missing
// from messages/he.json becomes a TypeScript error — so new pages/keys can't
// silently ship untranslated. (next-intl TypeScript augmentation.)
import type messages from "../messages/he.json";

declare module "next-intl" {
  interface AppConfig {
    Messages: typeof messages;
  }
}
