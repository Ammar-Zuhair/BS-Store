import { useTranslation } from "react-i18next";
import type { Dictionary } from "../data/ui";
import type { Language } from "../data/profile";
export function useLocale() {
  const { i18n } = useTranslation();
  return {
    lang: i18n.language as Language,
    text: i18n.getResource(i18n.language, "translation", "ui") as Dictionary,
  };
}
