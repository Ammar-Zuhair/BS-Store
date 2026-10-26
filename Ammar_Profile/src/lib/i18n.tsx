import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { useMemo, type ReactNode } from "react";
import { dictionaries } from "../data/ui";
import type { Language } from "../data/profile";
export function LocaleProvider({
  lang,
  children,
}: {
  lang: Language;
  children: ReactNode;
}) {
  const instance = useMemo(() => {
    const i = createInstance();
    void i.init({
      lng: lang,
      fallbackLng: "en",
      initAsync: false,
      resources: {
        en: { translation: { ui: dictionaries.en } },
        ar: { translation: { ui: dictionaries.ar } },
      },
      interpolation: { escapeValue: false },
    });
    return i;
  }, [lang]);
  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
