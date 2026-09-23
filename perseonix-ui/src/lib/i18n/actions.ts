"use server"

import { cookies } from "next/headers"
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/config"

/** Persists the visitor's language choice for a year. */
export async function setLocale(value: string): Promise<void> {
  if (!isLocale(value)) return
  ;(await cookies()).set(LOCALE_COOKIE, value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  })
}
