export const LOCALES = ["en", "tr", "ru"] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = "en"
export const LOCALE_COOKIE = "perseonix_locale"

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  tr: "Türkçe",
  ru: "Русский",
}

// Short label shown in the compact switcher trigger.
export const LOCALE_SHORT: Record<Locale, string> = {
  en: "EN",
  tr: "TR",
  ru: "RU",
}

export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value)
}
