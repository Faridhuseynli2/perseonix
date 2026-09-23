import "server-only"
import { cookies } from "next/headers"
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config"
import { getDictionary, type Dict } from "@/lib/i18n/dictionaries"

/** Current UI locale from the cookie, defaulting to English. */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value
  return isLocale(value) ? value : DEFAULT_LOCALE
}

/** Locale + its dictionary, for server components rendering the landing. */
export async function getContent(): Promise<{ locale: Locale; t: Dict }> {
  const locale = await getLocale()
  return { locale, t: getDictionary(locale) }
}
