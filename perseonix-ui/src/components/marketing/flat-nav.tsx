"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, Menu, X } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { LanguageSwitcher } from "@/components/marketing/language-switcher"
import type { Locale } from "@/lib/i18n/config"
import type { Dict } from "@/lib/i18n/dictionaries"

// Editorial marketing header — a top brief bar + a centered floating pill nav
// with the crest at its centre. Near-black, spacious, mono micro-labels.
export function FlatNav({
  t,
  locale,
  announcement,
}: {
  t: Dict["nav"]
  locale: Locale
  announcement: Dict["announcement"]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLElement>(null)

  const left = [
    { href: "/#platform", label: t.platform },
    { href: "/#modules", label: t.modules },
  ]
  const right = [
    { href: "/#research", label: t.research },
    { href: "/#about", label: t.company },
  ]
  const all = [...left, ...right]

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onDown)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onDown)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <header ref={ref} className="sticky top-0 z-40 bg-[var(--mkt-bg)]">
      {/* Brief bar */}
      <div className="border-b border-[var(--mkt-line)]">
        <div className="mx-auto flex h-10 max-w-[1280px] items-center justify-between gap-4 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="mkt-mono shrink-0 text-[10px] font-semibold tracking-[0.2em] text-[var(--mkt-accent)] uppercase">
              {announcement.eyebrow}
            </span>
            <span className="truncate text-[12px] text-[var(--mkt-muted)]">{announcement.text}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <LanguageSwitcher locale={locale} label={t.language} />
            <Link
              href="/login"
              className="mkt-mono hidden text-[11px] tracking-[0.12em] text-[var(--mkt-muted)] uppercase transition-colors hover:text-[var(--mkt-text)] sm:inline"
            >
              {t.login}
            </Link>
          </div>
        </div>
      </div>

      {/* Floating pill nav */}
      <div className="flex justify-center px-4 py-3">
        <nav
          aria-label="Primary"
          className="flex items-center gap-1 rounded-full border border-[var(--mkt-line-strong)] bg-[var(--mkt-surface)] px-2 py-1.5"
        >
          {left.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hidden rounded-full px-3.5 py-1.5 text-[13px] text-[var(--mkt-muted)] transition-colors hover:text-[var(--mkt-text)] lg:inline-block"
            >
              {l.label}
            </Link>
          ))}

          <Link href="/" aria-label="Perseonix" onClick={close} className="flex items-center gap-2 px-2.5">
            <Logo animated tone="ember" className="size-7" />
            <span className="mkt-mono text-[12px] font-semibold tracking-[0.18em] text-[var(--mkt-text)] uppercase">
              Perseonix
            </span>
          </Link>

          {right.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hidden rounded-full px-3.5 py-1.5 text-[13px] text-[var(--mkt-muted)] transition-colors hover:text-[var(--mkt-text)] lg:inline-block"
            >
              {l.label}
            </Link>
          ))}

          <Link
            href="/login"
            className="mkt-mono ml-1 hidden items-center gap-1.5 rounded-full bg-[var(--mkt-accent)] px-4 py-1.5 text-[11px] font-semibold tracking-[0.1em] text-white uppercase transition-opacity hover:opacity-90 lg:inline-flex"
          >
            {t.getStarted} <ArrowRight className="size-3.5" />
          </Link>

          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="ml-1 inline-flex size-8 items-center justify-center rounded-full text-[var(--mkt-text)] lg:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </nav>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-[var(--mkt-line)] bg-[var(--mkt-bg)] lg:hidden">
          <nav aria-label="Mobile" className="mx-auto flex max-w-[1280px] flex-col gap-1 px-6 py-4">
            {all.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={close}
                className="rounded-[4px] px-3 py-2.5 text-[15px] text-[var(--mkt-muted)] transition-colors hover:text-[var(--mkt-text)]"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2.5">
              <Link
                href="/login"
                onClick={close}
                className="flex-1 rounded-full border border-[var(--mkt-line-strong)] px-4 py-2.5 text-center text-[14px] font-medium text-[var(--mkt-text)]"
              >
                {t.login}
              </Link>
              <Link
                href="/login"
                onClick={close}
                className="flex-1 rounded-full bg-[var(--mkt-accent)] px-4 py-2.5 text-center text-[14px] font-semibold text-white"
              >
                {t.getStarted}
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
