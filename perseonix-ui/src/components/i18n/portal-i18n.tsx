"use client"

import { createContext, useContext } from "react"
import type { Locale } from "@/lib/i18n/config"
import type { PortalDict } from "@/lib/i18n/portal"

type PortalI18n = { locale: Locale; t: PortalDict }

const PortalI18nContext = createContext<PortalI18n | null>(null)

export function PortalI18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale
  dict: PortalDict
  children: React.ReactNode
}) {
  return <PortalI18nContext.Provider value={{ locale, t: dict }}>{children}</PortalI18nContext.Provider>
}

/** Translations + current locale for client components inside the /app shell. */
export function usePortalT(): PortalI18n {
  const ctx = useContext(PortalI18nContext)
  if (!ctx) {
    // Defensive fallback so a stray consumer never crashes the app.
    throw new Error("usePortalT must be used inside <PortalI18nProvider>")
  }
  return ctx
}
