"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { LockKeyhole, Menu, X } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { LanguageSwitcher } from "@/components/marketing/language-switcher"
import type { Locale } from "@/lib/i18n/config"
import type { Dict } from "@/lib/i18n/dictionaries"

export function SiteNavbar({ t, locale }: { t: Dict["nav"]; locale: Locale }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)

  const links = [
    { href: "/#platform", label: t.platform },
    { href: "/#modules", label: t.modules },
    { href: "/#research", label: t.research },
    { href: "/#about", label: t.company },
  ]

  useEffect(() => {
    if (!mobileOpen) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false)
    }
    function onPointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) setMobileOpen(false)
    }

    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("pointerdown", onPointerDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("pointerdown", onPointerDown)
    }
  }, [mobileOpen])

  const close = () => setMobileOpen(false)

  return (
    <header
      ref={headerRef}
      className="warm-glass sticky top-0 z-40 border-b border-white/[0.06]"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-6">
        <LanguageSwitcher locale={locale} label={t.language} />

        <Link href="/" aria-label="Perseonix home" onClick={close} className="ml-1">
          <Logo animated tone="ember" />
        </Link>

        <nav aria-label="Primary" className="ml-2 hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-md px-3.5 py-2 text-sm text-warm-300 transition-colors hover:bg-white/[0.05] hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <Link
            href="/login"
            className="hidden items-center gap-2 rounded-md border border-white/12 px-4 py-2 text-sm font-medium text-warm-100 transition-colors hover:border-white/25 hover:bg-white/[0.05] sm:inline-flex"
          >
            <LockKeyhole className="size-4" />
            {t.login}
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-md bg-ember px-4 text-sm font-semibold text-white shadow-ember transition-colors hover:bg-ember-bright"
          >
            {t.getStarted}
          </Link>
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen((open) => !open)}
            className="grid size-10 place-items-center rounded-md text-warm-300 hover:bg-white/[0.05] hover:text-white lg:hidden"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        hidden={!mobileOpen}
        className="border-t border-white/[0.06] bg-coal-900 lg:hidden"
      >
        <nav aria-label="Mobile" className="px-6 py-6">
          <ul className="grid gap-1 text-base">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={close}
                  className="block rounded-md px-3 py-3 text-warm-300 hover:bg-white/[0.04] hover:text-white"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="mt-2">
              <Link
                href="/login"
                onClick={close}
                className="block rounded-md border border-white/12 px-3 py-3 text-center text-warm-100 hover:bg-white/[0.05]"
              >
                {t.login}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
