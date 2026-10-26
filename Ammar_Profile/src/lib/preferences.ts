import type { Language } from "../data/profile";
export function resolveLanguage(
  path: string,
  saved: string | null,
  primary: string | undefined,
): Language {
  const explicit = path.match(/^\/(ar|en)(?:\/|$)/)?.[1];
  if (explicit) return explicit as Language;
  if (saved === "ar" || saved === "en") return saved;
  return primary?.toLowerCase().startsWith("ar") ? "ar" : "en";
}
export function storePreference(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Storage can be disabled. */
  }
}
