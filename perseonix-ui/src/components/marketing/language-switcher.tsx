"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown, Globe } from "lucide-react"
import { LOCALES, LOCALE_NAMES, LOCALE_SHORT, type Locale } from "@/lib/i18n/config"
import { setLocale } from "@/lib/i18n/actions"

export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  function choose(next: Locale) {
    setOpen(false)
    if (next === locale) return
    startTransition(async () => {
      await setLocale(next)
      router.refresh()
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/12 bg-white/[0.03] px-2.5 text-sm font-medium text-warm-200 transition-colors hover:border-white/25 hover:bg-white/[0.06] disabled:opacity-60"
      >
        <Globe className="size-4 text-ember-soft" />
        <span className="font-mono text-xs tracking-wide">{LOCALE_SHORT[locale]}</span>
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-40 overflow-hidden rounded-lg border border-white/[0.1] bg-coal-850 p-1 shadow-ember-lg"
        >
          {LOCALES.map((code) => (
            <button
              key={code}
              type="button"
              role="menuitemradio"
              aria-checked={code === locale}
              onClick={() => choose(code)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-warm-200 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {LOCALE_NAMES[code]}
              {code === locale && <Check className="size-4 text-ember-soft" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
